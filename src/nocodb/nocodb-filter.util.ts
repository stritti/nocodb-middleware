import { BadRequestException } from '@nestjs/common';

/**
 * Builders for NocoDB v3 `where` expressions.
 *
 * Values are never interpolated raw: strings are wrapped in double quotes
 * (NocoDB treats `,`, `(`, `)` and `~` inside quotes as literal text),
 * numbers are validated, and booleans map to the checkbox operators, because
 * `(field,eq,true)` silently matches nothing in NocoDB v3.
 */

type FilterValue = string | number | boolean;

/** Plain field titles only; NocoDB v3 does not support `link.field` paths. */
const FILTER_FIELD_PATTERN = /^[A-Za-z0-9_-]+$/;

/** One comparison, quoted values may contain any character except `"`. */
const FILTER_EXPRESSION_PATTERN =
  /^\([A-Za-z0-9_-]+,(?:(?:eq|in),(?:"[^"]*"|-?\d+(?:\.\d+)?)(?:,(?:"[^"]*"|-?\d+(?:\.\d+)?))*|checked|notchecked)\)$/;

/** NocoDB's primary key field is titled `Id`. */
const PRIMARY_KEY_FIELD = 'Id';

export function filterEq(field: string, value: FilterValue): string {
  if (typeof value === 'boolean') {
    return value ? filterChecked(field) : filterNotChecked(field);
  }

  return `(${sanitizeFilterField(field)},eq,${formatFilterValue(value)})`;
}

export function filterIn(field: string, values: FilterValue[]): string {
  if (values.length === 0) {
    throw new BadRequestException('Filter values must not be empty');
  }

  return `(${sanitizeFilterField(field)},in,${values
    .map((value) => formatFilterValue(value))
    .join(',')})`;
}

/** Matches records whose checkbox field is ticked. */
export function filterChecked(field: string): string {
  return `(${sanitizeFilterField(field)},checked)`;
}

/** Matches records whose checkbox field is not ticked (or empty). */
export function filterNotChecked(field: string): string {
  return `(${sanitizeFilterField(field)},notchecked)`;
}

export function andFilters(...filters: string[]): string {
  for (const filter of filters) {
    if (!FILTER_EXPRESSION_PATTERN.test(filter)) {
      throw new BadRequestException('Invalid filter expression');
    }
  }

  return filters.join('~and');
}

function sanitizeFilterField(field: string): string {
  if (!FILTER_FIELD_PATTERN.test(field)) {
    throw new BadRequestException('Invalid filter field');
  }

  return field === 'id' ? PRIMARY_KEY_FIELD : field;
}

function formatFilterValue(value: FilterValue): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Invalid numeric filter value');
    }

    return String(value);
  }

  if (typeof value === 'boolean') {
    throw new BadRequestException(
      'Boolean filter values are only supported with filterEq',
    );
  }

  const normalized = value.trim();

  if (
    !normalized ||
    normalized.includes('"') ||
    hasControlCharacter(normalized)
  ) {
    throw new BadRequestException('Invalid filter value');
  }

  return `"${normalized}"`;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}
