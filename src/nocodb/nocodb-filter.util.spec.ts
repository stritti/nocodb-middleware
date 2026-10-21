import { BadRequestException } from '@nestjs/common';
import {
  andFilters,
  filterChecked,
  filterEq,
  filterIn,
  filterNotChecked,
} from './nocodb-filter.util';

describe('nocodb-filter.util', () => {
  describe('filterEq', () => {
    it('quotes string values', () => {
      expect(filterEq('email', 'admin@example.com')).toBe(
        '(email,eq,"admin@example.com")',
      );
    });

    it('keeps delimiters inside quoted values harmless', () => {
      expect(filterEq('name', "o'b, (x)~or(id")).toBe(
        '(name,eq,"o\'b, (x)~or(id")',
      );
    });

    it('leaves numbers unquoted', () => {
      expect(filterEq('role_id', 42)).toBe('(role_id,eq,42)');
    });

    it('maps booleans to NocoDB checkbox operators', () => {
      expect(filterEq('is_active', true)).toBe('(is_active,checked)');
      expect(filterEq('is_active', false)).toBe('(is_active,notchecked)');
    });

    it('maps the record id field to the NocoDB primary key', () => {
      expect(filterEq('id', 7)).toBe('(Id,eq,7)');
    });
  });

  describe('filterIn', () => {
    it('builds in filters with quoted strings and plain numbers', () => {
      expect(filterIn('id', [1, 2, 3])).toBe('(Id,in,1,2,3)');
      expect(filterIn('name', ['a', 'b'])).toBe('(name,in,"a","b")');
    });

    it('rejects an empty list', () => {
      expect(() => filterIn('id', [])).toThrow(BadRequestException);
    });
  });

  it('builds checkbox filters', () => {
    expect(filterChecked('can_read')).toBe('(can_read,checked)');
    expect(filterNotChecked('can_read')).toBe('(can_read,notchecked)');
  });

  it('composes filters with and', () => {
    expect(
      andFilters(
        filterEq('role_id', 1),
        filterEq('table_name', 'roles'),
        filterChecked('can_read'),
      ),
    ).toBe('(role_id,eq,1)~and(table_name,eq,"roles")~and(can_read,checked)');
  });

  it('rejects values that cannot be quoted safely', () => {
    expect(() => filterEq('name', 'say "hi"')).toThrow(BadRequestException);
    expect(() => filterEq('name', 'line\nbreak')).toThrow(BadRequestException);
    expect(() => filterEq('name', '   ')).toThrow(BadRequestException);
    expect(() => filterEq('age', Number.NaN)).toThrow(BadRequestException);
  });

  it('rejects invalid fields and arbitrary expressions', () => {
    expect(() => filterEq('email)~or(id', 'value')).toThrow(
      BadRequestException,
    );
    expect(() => filterEq('role.id', 1)).toThrow(BadRequestException);
    expect(() => andFilters('(unsafe)')).toThrow(BadRequestException);
    expect(() => andFilters('(a,eq,1)~or(b,eq,2)')).toThrow(
      BadRequestException,
    );
  });
});
