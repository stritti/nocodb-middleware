import 'reflect-metadata';
import { PageOptionsDto, Order } from './page-options.dto';

describe('PageOptionsDto', () => {
  it('should have default values', () => {
    const dto = new PageOptionsDto();
    expect(dto.order).toBe(Order.ASC);
    expect(dto.page).toBe(1);
    expect(dto.take).toBe(10);
  });

  it('should calculate skip correctly', () => {
    const dto = new PageOptionsDto();
    // page 1: skip = 0
    expect(dto.skip).toBe(0);
  });

  it('should calculate skip for page 2', () => {
    const dto = Object.assign(new PageOptionsDto(), { page: 2, take: 10 });
    expect(dto.skip).toBe(10);
  });

  it('should calculate skip for page 3 with take 25', () => {
    const dto = Object.assign(new PageOptionsDto(), { page: 3, take: 25 });
    expect(dto.skip).toBe(50);
  });

  it('should handle undefined page and take gracefully in skip', () => {
    const dto = Object.assign(new PageOptionsDto(), {
      page: undefined,
      take: undefined,
    });
    expect(dto.skip).toBe(0);
  });
});
