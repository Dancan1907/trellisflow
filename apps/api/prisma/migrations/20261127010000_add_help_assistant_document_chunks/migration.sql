CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "document_chunks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "heading" VARCHAR(500),
  "route" VARCHAR(255),
  "chunk_index" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "embedding" vector(768) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_chunks_source_chunk_index_key" UNIQUE ("source", "chunk_index")
);
CREATE INDEX "document_chunks_source_idx" ON "document_chunks" ("source");
CREATE INDEX "document_chunks_embedding_hnsw_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);
