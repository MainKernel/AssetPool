import { describe, expect, it } from 'vitest';

import { escapeCsvCell } from '../../src/modules/history/history.service.js';

describe('escapeCsvCell', () => {
  it('wraps regular text and escapes double quotes', () => {
    expect(escapeCsvCell('Ноутбук "ThinkPad"')).toBe('"Ноутбук ""ThinkPad"""');
  });

  it('neutralizes CSV injection prefixes (=, +, -, @, tab, cr)', () => {
    expect(escapeCsvCell('=CMD()')).toBe('"\'=CMD()"');
    expect(escapeCsvCell('+1+2')).toBe('"\'+1+2"');
    expect(escapeCsvCell('-2+3')).toBe('"\'-2+3"');
    expect(escapeCsvCell('@SUM(1,2)')).toBe('"\'@SUM(1,2)"');
    expect(escapeCsvCell('\tcell')).toBe('"\'\tcell"');
  });

  it('handles null and undefined as empty quoted string', () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });
});
