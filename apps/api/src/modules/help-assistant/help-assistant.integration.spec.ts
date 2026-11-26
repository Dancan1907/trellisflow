import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

describe('Help Assistant pgvector retrieval integration', () => {
  const prisma = new PrismaClient();
  const source = 'integration-' + randomUUID() + '.md';
  const dimensions = 768;
  const closeVector = Array.from({ length: dimensions }, (_, index) => index === 0 ? 1 : 0);
  const distantVector = Array.from({ length: dimensions }, (_, index) => index === 1 ? 1 : 0);
  const vectorLiteral = (values: number[]) => '[' + values.join(',') + ']';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "document_chunks" ("source", "title", "heading", "route", "chunk_index", "content", "content_hash", "embedding") VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)',
      source, 'Accounts guide', 'Create an account', '/personal', 0,
      'Create an account from the Personal section.', 'a'.repeat(64), vectorLiteral(closeVector),
    );
    await prisma.$executeRawUnsafe(
      'INSERT INTO "document_chunks" ("source", "title", "heading", "route", "chunk_index", "content", "content_hash", "embedding") VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)',
      source, 'Investments guide', 'Holdings', '/investments', 1,
      'Review your investment holdings.', 'b'.repeat(64), vectorLiteral(distantVector),
    );
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "document_chunks" WHERE "source" = $1', source);
    await prisma.$disconnect();
  });

  it('uses cosine distance to rank the semantically closest indexed document first', async () => {
    const results = await prisma.$queryRawUnsafe<Array<{ title: string; distance: number }>>(
      'SELECT "title", ("embedding" <=> $1::vector)::float8 AS "distance" FROM "document_chunks" WHERE "source" = $2 ORDER BY "embedding" <=> $1::vector LIMIT 2',
      vectorLiteral(closeVector),
      source,
    );
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Accounts guide');
    expect(results[0].distance).toBeCloseTo(0, 6);
    expect(results[1].title).toBe('Investments guide');
    expect(results[1].distance).toBeGreaterThan(results[0].distance);
  });

  it('has the pgvector extension installed by the migration', async () => {
    const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(extensions.map((extension) => extension.extname)).toContain('vector');
  });
});
