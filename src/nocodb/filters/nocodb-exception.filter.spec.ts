import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { NocoDBExceptionFilter } from './nocodb-exception.filter';
import { NocoDBException } from '../exceptions/nocodb.exception';

function makeHost(url: string) {
  const responseMock = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const requestMock = { url };
  return {
    switchToHttp: () => ({
      getResponse: () => responseMock,
      getRequest: () => requestMock,
    }),
    responseMock,
  };
}

describe('NocoDBExceptionFilter', () => {
  let filter: NocoDBExceptionFilter;

  beforeEach(() => {
    filter = new NocoDBExceptionFilter();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle a generic HttpException', () => {
    const { switchToHttp, responseMock } = makeHost('/api/test') as any;
    const host = { switchToHttp } as any;
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        path: '/api/test',
      }),
    );
  });

  it('should handle a NocoDBException and call warn', () => {
    const { switchToHttp, responseMock } = makeHost('/api/resource') as any;
    const host = { switchToHttp } as any;
    const exception = NocoDBException.tableNotFound('users');

    filter.catch(exception, host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(Logger.prototype.warn).toHaveBeenCalled();
  });

  it('should skip logging for 404 static asset requests', () => {
    const { switchToHttp, responseMock } = makeHost('/favicon.ico') as any;
    const host = { switchToHttp } as any;
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(responseMock.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(Logger.prototype.warn).not.toHaveBeenCalled();
    expect(Logger.prototype.error).not.toHaveBeenCalled();
  });

  it('should skip logging for .png static asset 404', () => {
    const { switchToHttp } = makeHost('/logo.png') as any;
    const host = { switchToHttp } as any;
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(Logger.prototype.warn).not.toHaveBeenCalled();
    expect(Logger.prototype.error).not.toHaveBeenCalled();
  });

  it('should log error for non-NocoDB 500 exceptions', () => {
    const { switchToHttp } = makeHost('/api/route') as any;
    const host = { switchToHttp } as any;
    const exception = new HttpException(
      'Internal error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    filter.catch(exception, host);

    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('should include message from exception response object', () => {
    const { switchToHttp, responseMock } = makeHost('/api/test') as any;
    const host = { switchToHttp } as any;
    const exception = new HttpException(
      { message: 'Detailed error', error: 'Custom Error' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(responseMock.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Detailed error',
        error: 'Custom Error',
      }),
    );
  });
});
