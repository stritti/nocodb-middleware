import 'reflect-metadata';
import { PageDto } from './page.dto';
import { PageMetaDto } from './page-meta.dto';
import { PageOptionsDto } from './page-options.dto';

describe('PageDto', () => {
  it('should store data and meta correctly', () => {
    const pageOptionsDto = Object.assign(new PageOptionsDto(), {
      page: 1,
      take: 10,
    });
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: 3 });
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const pageDto = new PageDto(data, meta);

    expect(pageDto.data).toEqual(data);
    expect(pageDto.meta).toBe(meta);
    expect(pageDto.meta.itemCount).toBe(3);
  });

  it('should work with empty data', () => {
    const pageOptionsDto = Object.assign(new PageOptionsDto(), {
      page: 1,
      take: 10,
    });
    const meta = new PageMetaDto({ pageOptionsDto, itemCount: 0 });
    const pageDto = new PageDto([], meta);

    expect(pageDto.data).toEqual([]);
    expect(pageDto.meta.itemCount).toBe(0);
  });
});
