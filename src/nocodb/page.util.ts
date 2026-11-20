import { FilterOptions } from './nocodb.service';
import { NocoPageInfo } from './nocodb.types';
import { PageDto } from './dto/page.dto';
import { PageMetaDto } from './dto/page-meta.dto';
import { PageOptionsDto } from './dto/page-options.dto';

/** Limit/offset/count options derived from the page options of a request. */
export function pagedOptions(
  pageOptionsDto?: PageOptionsDto,
): Pick<FilterOptions, 'limit' | 'offset' | 'withCount'> {
  return {
    limit: pageOptionsDto?.take ?? 10,
    offset: pageOptionsDto?.skip ?? 0,
    withCount: true,
  };
}

/**
 * Page metadata for a list response. With page options, the total row count
 * from the API is used; without them the length of the returned data is the
 * only available number.
 */
export function pageMeta(
  pageOptionsDto: PageOptionsDto | undefined,
  pageInfo: NocoPageInfo | undefined,
  dataLength: number,
): PageMetaDto {
  const totalRows = pageInfo?.totalRows ?? dataLength;
  return new PageMetaDto({
    pageOptionsDto: pageOptionsDto || new PageOptionsDto(),
    itemCount: pageOptionsDto ? totalRows : dataLength,
  });
}

/** Empty page, e.g. when the requested table does not exist. */
export function emptyPage<T>(pageOptionsDto?: PageOptionsDto): PageDto<T> {
  return new PageDto<T>(
    [],
    new PageMetaDto({
      pageOptionsDto: pageOptionsDto || new PageOptionsDto(),
      itemCount: 0,
    }),
  );
}
