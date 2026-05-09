import { BadRequestException } from '@nestjs/common';

type FilterValue = string | number | boolean;

const FILTER_FIELD_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const UNSAFE_FILTER_VALUE_PATTERN = /[(),~]/;
const FILTER_EXPRESSION_PATTERN = /^\([a-zA-Z0-9_.-]+,(?:eq|in),[^()~]+\)$/;

export function filterEq(field: string, value: FilterValue): string {
  return `(${sanitizeFilterField(field)},eq,${sanitizeFilterValue(value)})`;
}

export function filterIn(field: string, values: FilterValue[]): string {
  if (values.length === 0) {
    throw new BadRequestException('Filter values must not be empty');
  }

  return `(${sanitizeFilterField(field)},in,${values
    .map((value) => sanitizeFilterValue(value))
    .join(',')})`;
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

  return field;
}

function sanitizeFilterValue(value: FilterValue): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Invalid numeric filter value');
    }

    return String(value);
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  const normalized = value.trim();

  if (
    !normalized ||
    UNSAFE_FILTER_VALUE_PATTERN.test(normalized) ||
    hasControlCharacter(normalized)
  ) {
    throw new BadRequestException('Invalid filter value');
  }

  return normalized;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}
