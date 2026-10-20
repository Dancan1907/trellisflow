// This file runs before Jest starts.
// It forces Prisma to use the test database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
