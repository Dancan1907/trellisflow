import * as dotenv from 'dotenv';
import * as path from 'path';
import { createHash } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// ---------------------------------------------------------------------------
// Argon2 mock — prevents SIGSEGV on GitHub runners where native Argon2
// binaries crash on the Node 20 / Ubuntu image. Fast, deterministic, and
// uses SHA-256 to emulate the hash/verify round-trip.
// ---------------------------------------------------------------------------
jest.mock('argon2', () => {
  const hash = async (password: string): Promise<string> => {
    return `mock_${createHash('sha256').update(password).digest('hex')}`;
  };
  const verify = async (hashed: string, password: string): Promise<boolean> => {
    const expected = `mock_${createHash('sha256').update(password).digest('hex')}`;
    return hashed === expected;
  };
  return { hash, verify };
});
