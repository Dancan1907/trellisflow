import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
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
      current = { heading: heading[1].trim(), body: [] };
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
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files.sort();
}

async function main() {
  const files = await listMarkdown(DOCS_ROOT);
  if (!files.length) throw new Error('No Markdown help documents found in ' + DOCS_ROOT);
  let totalChunks = 0;
  for (const file of files) {
    const source = relative(DOCS_ROOT, file).replace(/\\/g, '/');
    const document = parseDocument(source, await readFile(file, 'utf8'));
    const chunks = chunkDocument(document.content);
    if (!chunks.length) continue;

    const embedded: Array<{ chunk: Chunk; vector: number[]; hash: string }> = [];
    for (const chunk of chunks) {
      const text = 'Document: ' + document.title + '\nSection: ' + chunk.heading + '\n\n' + chunk.content;
      embedded.push({
        chunk,
        vector: await embedDocument(text, document.title),
        hash: createHash('sha256').update(text).digest('hex'),
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('DELETE FROM "document_chunks" WHERE "source" = $1', source);
      for (const item of embedded) {
        const vectorLiteral = '[' + item.vector.join(',') + ']';
        await tx.$executeRawUnsafe(
          'INSERT INTO "document_chunks" ("source", "title", "heading", "route", "chunk_index", "content", "content_hash", "embedding") VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)',
          source, document.title, item.chunk.heading, document.route, item.chunk.index,
          item.chunk.content, item.hash, vectorLiteral,
        );
      }
    });
    totalChunks += embedded.length;
    process.stdout.write('Indexed ' + source + ': ' + embedded.length + ' chunks\n');
  }
  process.stdout.write('Help documentation ingestion complete: ' + files.length + ' files, ' + totalChunks + ' chunks.\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write('Help documentation ingestion failed: ' + (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
