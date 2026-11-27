import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DOCS_ROOT = resolve(process.cwd(), '../../docs/help-center');
const DIMENSIONS = 768;

interface ParsedDocument {
  source: string;
  title: string;
  route: string | null;
  content: string;
}
interface Chunk {
  heading: string;
  content: string;
  index: number;
}
interface IndexedChunk {
  chunk: Chunk;
  vector: number[];
  hash: string;
}
interface IndexedDocument {
  document: ParsedDocument;
  chunks: IndexedChunk[];
}

function parseDocument(source: string, raw: string): ParsedDocument {
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const metadata = frontmatter?.[1] ?? '';
  const title = metadata.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? source;
  const route = metadata.match(/^route:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const content = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
  return { source, title, route, content };
}

function chunkDocument(content: string): Chunk[] {
  const sections: Array<{ heading: string; body: string[] }> = [];
  let current = { heading: 'Overview', body: [] as string[] };
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      if (current.body.join('\n').trim()) sections.push(current);
      current = { heading: heading[1]?.trim() || 'Untitled section', body: [] };
    } else current.body.push(line);
  }
  if (current.body.join('\n').trim()) sections.push(current);

  const chunks: Chunk[] = [];
  for (const section of sections) {
    const paragraphs = section.body.join('\n').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    let buffer = '';
    for (const paragraph of paragraphs) {
      if (paragraph.length > 2200) {
        if (buffer) {
          chunks.push({ heading: section.heading, content: buffer, index: chunks.length });
          buffer = '';
        }
        for (let offset = 0; offset < paragraph.length; offset += 2000) {
          chunks.push({ heading: section.heading, content: paragraph.slice(offset, offset + 2000), index: chunks.length });
        }
      } else if (buffer && buffer.length + paragraph.length + 2 > 1800) {
        chunks.push({ heading: section.heading, content: buffer, index: chunks.length });
        buffer = paragraph;
      } else buffer = buffer ? buffer + '\n\n' + paragraph : paragraph;
    }
    if (buffer) chunks.push({ heading: section.heading, content: buffer, index: chunks.length });
  }
  return chunks;
}

async function embedDocument(value: string, title: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set in the API environment.');
  const model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':embedContent',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: 'models/' + model,
        content: { parts: [{ text: value }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        title,
        outputDimensionality: DIMENSIONS,
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  const payload = await response.json().catch(() => ({})) as {
    embedding?: { values?: number[] };
    error?: { message?: string };
  };
  if (!response.ok || !Array.isArray(payload.embedding?.values) || payload.embedding.values.length !== DIMENSIONS) {
    throw new Error('Gemini embedding failed for "' + title + '": ' + (payload.error?.message ?? response.statusText));
  }
  return payload.embedding.values;
}

async function listMarkdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listMarkdown(path));
    else if (entry.isFile() && entry.name.endsWith('.md') && basename(path).toLowerCase() !== 'readme.md') files.push(path);
  }
  return files.sort();
}

async function main() {
  const files = await listMarkdown(DOCS_ROOT);
  if (!files.length) throw new Error('No Markdown help documents found in ' + DOCS_ROOT);

  const indexed: IndexedDocument[] = [];
  let totalChunks = 0;
  for (const file of files) {
    const source = relative(DOCS_ROOT, file).replace(/\\/g, '/');
    const document = parseDocument(source, await readFile(file, 'utf8'));
    const chunks = chunkDocument(document.content);
    if (!chunks.length) continue;

    const embedded: IndexedChunk[] = [];
    for (const chunk of chunks) {
      const text = 'Document: ' + document.title + '\nSection: ' + chunk.heading + '\n\n' + chunk.content;
      embedded.push({
        chunk,
        vector: await embedDocument(text, document.title),
        hash: createHash('sha256').update(text).digest('hex'),
      });
    }
    indexed.push({ document, chunks: embedded });
    totalChunks += embedded.length;
    process.stdout.write('Prepared ' + source + ': ' + embedded.length + ' chunks\n');
  }

  // Build one parameterized INSERT before opening the transaction. This avoids
  // dozens of sequential round trips inside a short-lived pooled transaction.
  const rows = indexed.flatMap((item) =>
    item.chunks.map((entry) => [
      item.document.source,
      item.document.title,
      entry.chunk.heading,
      item.document.route,
      entry.chunk.index,
      entry.chunk.content,
      entry.hash,
      '[' + entry.vector.join(',') + ']',
    ] as const),
  );
  const columns = 8;
  const parameters = rows.flat();
  const valuesSql = rows
    .map((_, rowIndex) => {
      const placeholders = Array.from(
        { length: columns },
        (_unused, columnIndex) => '
  process.stdout.write('Help documentation ingestion complete: ' + files.length + ' files, ' + totalChunks + ' chunks.\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Help documentation ingestion failed: ' + (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
 + (rowIndex * columns + columnIndex + 1) + (columnIndex === 7 ? '::vector' : ''),
      );
      return '(' + placeholders.join(', ') + ')';
    })
    .join(', ');
  const insertSql = rows.length
    ? 'INSERT INTO "document_chunks" ("source", "title", "heading", "route", "chunk_index", "content", "content_hash", "embedding") VALUES ' + valuesSql
    : null;

  // Replace the complete index atomically only after every embedding succeeds.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DELETE FROM "document_chunks"');
    if (insertSql) await tx.$executeRawUnsafe(insertSql, ...parameters);
  }, { maxWait: 10_000, timeout: 60_000 });
  process.stdout.write('Help documentation ingestion complete: ' + files.length + ' files, ' + totalChunks + ' chunks.\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Help documentation ingestion failed: ' + (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
