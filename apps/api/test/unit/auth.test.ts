import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../../src/modules/auth/auth.service.js';

describe('Argon2id password hashing', () => {
  it('hashes password with argon2id and verifies correctly', async () => {
    const plain = 'SuperSecret123!';
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, plain)).toBe(true);
    expect(await verifyPassword(hash, 'WrongPassword123!')).toBe(false);
  });

  it('returns false for malformed hash instead of throwing', async () => {
    expect(await verifyPassword('not-a-valid-hash', 'Password123!')).toBe(false);
  });
});
