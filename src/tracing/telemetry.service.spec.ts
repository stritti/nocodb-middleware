import { Test, TestingModule } from '@nestjs/testing';
import { Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let tracer: Tracer;

  // Minimal span stub that records method calls for assertion
  const endSpy = jest.fn();
  const setStatusSpy = jest.fn();
  const recordExceptionSpy = jest.fn();

  const spanStub = {
    end: endSpy,
    setStatus: setStatusSpy,
    recordException: recordExceptionSpy,
  } as unknown as Span;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TelemetryService],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
    tracer = service.getTracer();

    // Replace the internal tracer startSpan with a stub
    jest.spyOn(tracer, 'startSpan').mockReturnValue(spanStub);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getTracer() returns the internal tracer instance', () => {
    expect(service.getTracer()).toBeDefined();
  });

  describe('withSpan()', () => {
    it('should return the value resolved by fn', async () => {
      const result = await service.withSpan('test.op', () =>
        Promise.resolve(42),
      );
      expect(result).toBe(42);
    });

    it('should end the span after fn resolves', async () => {
      await service.withSpan('test.op', () => Promise.resolve('ok'));
      expect(endSpy).toHaveBeenCalledTimes(1);
    });

    it('should set span status to OK on success', async () => {
      await service.withSpan('test.op', () => Promise.resolve('ok'));
      expect(setStatusSpy).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    });

    it('should set span status to ERROR and record exception when fn rejects', async () => {
      const err = new Error('boom');
      await expect(
        service.withSpan('test.op', () => Promise.reject<string>(err)),
      ).rejects.toThrow('boom');

      expect(setStatusSpy).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'boom',
      });
      expect(recordExceptionSpy).toHaveBeenCalledWith(err);
    });

    it('should end the span even when fn rejects', async () => {
      await expect(
        service.withSpan('test.op', () =>
          Promise.reject<string>(new Error('fail')),
        ),
      ).rejects.toThrow();

      expect(endSpy).toHaveBeenCalledTimes(1);
    });

    it('should wrap non-Error rejections in an Error before recording', async () => {
      const rejection = new Error('string error');
      await expect(
        service.withSpan('test.op', () => Promise.reject<string>(rejection)),
      ).rejects.toThrow('string error');

      expect(recordExceptionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'string error' }),
      );
    });

    it('should forward span attributes to startSpan', async () => {
      const attrs = { 'db.table_id': 'my_table', 'db.operation': 'read' };
      const startSpanSpy = jest.spyOn(tracer, 'startSpan');
      await service.withSpan('test.op', () => Promise.resolve(null), attrs);

      expect(startSpanSpy).toHaveBeenCalledWith(
        'test.op',
        expect.objectContaining({ attributes: attrs }),
      );
    });
  });
});
