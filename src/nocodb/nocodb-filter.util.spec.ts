import { BadRequestException } from '@nestjs/common';
import { andFilters, filterEq, filterIn } from './nocodb-filter.util';

describe('nocodb-filter.util', () => {
  it('should build equality filters for safe values', () => {
    expect(filterEq('email', 'admin@example.com')).toBe(
      '(email,eq,admin@example.com)',
    );
    expect(filterEq('user.id', 42)).toBe('(user.id,eq,42)');
  });

  it('should build in filters for safe values', () => {
    expect(filterIn('id', [1, 2, 3])).toBe('(id,in,1,2,3)');
  });

  it('should compose filters with and', () => {
    expect(andFilters(filterEq('role.id', 1), filterEq('table_name', 'roles')))
      .toBe('(role.id,eq,1)~and(table_name,eq,roles)');
  });

  it('should reject unsafe delimiters in values', () => {
    expect(() => filterEq('email', 'a@example.com)~or(id,gt,0')).toThrow(
      BadRequestException,
    );
    expect(() => filterEq('email', 'a,b@example.com')).toThrow(
      BadRequestException,
    );
  });

  it('should reject invalid fields and arbitrary expressions', () => {
    expect(() => filterEq('email)~or(id', 'value')).toThrow(
      BadRequestException,
    );
    expect(() => andFilters('(unsafe)')).toThrow(BadRequestException);
  });
});
