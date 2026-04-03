import 'reflect-metadata';
import { PageMetaDto } from './page-meta.dto';
import { PageOptionsDto } from './page-options.dto';

describe('PageMetaDto', () => {
  it('should calculate correct pagination metadata', () => {
    const pageOptionsDto = Object.assign(new PageOptionsDto(), {
      page: 1,
      take: 10,
    });
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: 25 });

    expect(meta.page).toBe(1);
    expect(meta.take).toBe(10);
    expect(meta.itemCount).toBe(25);
    expect(meta.pageCount).toBe(3);
    expect(meta.hasPreviousPage).toBe(false);
    expect(meta.hasNextPage).toBe(true);
  });

  it('should indicate no next page on last page', () => {
    const pageOptionsDto = Object.assign(new PageOptionsDto(), {
      page: 3,
      take: 10,
    });
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: 25 });

    expect(meta.hasPreviousPage).toBe(true);
    expect(meta.hasNextPage).toBe(false);
  });

  it('should handle defaults when page and take are undefined', () => {
    const pageOptionsDto = Object.assign(new PageOptionsDto(), {
      page: undefined,
      take: undefined,
    });
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: 5 });

    expect(meta.page).toBe(1);
    expect(meta.take).toBe(10);
    expect(meta.pageCount).toBe(1);
    expect(meta.hasPreviousPage).toBe(false);
    expect(meta.hasNextPage).toBe(false);
  });

  it('should handle 0 items', () => {
    const pageOptionsDto = Object.assign(new PageOptionsDto(), {
      page: 1,
      take: 10,
    });
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: 0 });

    expect(meta.pageCount).toBe(0);
    expect(meta.hasPreviousPage).toBe(false);
    expect(meta.hasNextPage).toBe(false);
  });
});
