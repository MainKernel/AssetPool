import { describe, expect, it } from 'vitest';

import { toPage } from '../../src/shared/utils/pagination.js';

describe('toPage pagination helper', () => {
  it('returns nextCursor equal to the last returned item id when rows.length > limit', () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const page = toPage(rows, 3);

    expect(page.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(page.nextCursor).toBe(3);
  });

  it('returns nextCursor = null when rows.length <= limit', () => {
    const rows = [{ id: 10 }, { id: 11 }];
    const page = toPage(rows, 2);

    expect(page.data).toEqual([{ id: 10 }, { id: 11 }]);
    expect(page.nextCursor).toBeNull();
  });

  it('handles empty array', () => {
    const page = toPage([], 20);
    expect(page).toEqual({ data: [], nextCursor: null });
  });
});
