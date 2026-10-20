// apps/api/test/setup.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

// 1. Load the .env file from the api root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2. Override DATABASE_URL with the test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// 3. Make sure we don't accidentally hit production
if (!process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set in .env. Cannot run integration tests.');
}
