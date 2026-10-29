import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// ---------------------------------------------------------------------------
// Argon2 mock — prevents SIGSEGV on GitHub runners where native Argon2
// binaries crash on the Node 20 / Ubuntu image. Fast, deterministic, and
// uses SHA-256 with a random salt to emulate the hash/verify round-trip.
// ---------------------------------------------------------------------------
jest.mock('argon2', () => {
  const hash = async (password: string): Promise<string> => {
    // Real Argon2 uses a random salt — emulate that with random bytes.
    const salt = crypto.randomBytes(16).toString('hex');
    const digest = crypto
      .createHash('sha256')
      .update(salt + password)
      .digest('hex');
    return `mock$${salt}$${digest}`;
  };

  const verify = async (hashed: string, password: string): Promise<boolean> => {
    if (typeof hashed !== 'string' || !hashed.startsWith('mock$')) return false;
    const parts = hashed.split('$');
    if (parts.length !== 3) return false;
    const [, salt, expectedDigest] = parts;
    const actualDigest = crypto
      .createHash('sha256')
      .update(salt + password)
      .digest('hex');
    return actualDigest === expectedDigest;
  };

  return { hash, verify };
});
