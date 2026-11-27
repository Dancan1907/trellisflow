# TrellisFlow Help Assistant — RAG architecture

## Scope

The Help Assistant is an authenticated, documentation-only product guide. It does not query financial tables, access another user's data, or execute application actions. Money Copilot remains a separate financial assistant.

## Runtime flow

1. The authenticated client sends a question to `POST /api/help-assistant/chat`.
2. The API reserves the user's independent `HELP_ASSISTANT` daily allowance.
3. The API embeds the question using the configured Gemini embedding model.
4. PostgreSQL/pgvector retrieves the six closest documentation chunks using cosine distance.
5. Chunks outside the relevance threshold are discarded. If none remain, the API returns a no-answer response without calling the generation model.
6. The existing server-side AI provider generates a JSON answer and numeric source references.
7. The API validates source references against the retrieved result set, resolves explicit page-navigation requests against a canonical destination map (rather than trusting a document's default route), and only returns routes from a fixed allowlist.
8. Token usage metadata is recorded without storing the question, chat history or retrieved content.

## Document ingestion

Run `pnpm --filter @trellisflow/api exec prisma migrate deploy` first, then `pnpm --filter @trellisflow/api ingest:help-docs`.

The ingestion command:
- Reads approved Markdown guides from `docs/help-center`.
- Excludes the knowledge-base README.
- Splits content at headings and paragraph boundaries into bounded chunks.
- Creates Gemini `RETRIEVAL_DOCUMENT` embeddings with 768 dimensions.
- Computes a SHA-256 content hash for each chunk.
- Replaces the complete vector index in one database transaction after all embeddings succeed. Failed embedding runs leave the previous index intact.

Re-run ingestion after documentation changes. Keep `GEMINI_EMBEDDING_MODEL` consistent between ingestion and runtime query embedding; changing models requires rebuilding the index.

## Storage

The migration creates the PostgreSQL `vector` extension and `document_chunks` table. The embedding column is `vector(768)` with an HNSW cosine index. The table contains only product documentation and source metadata; it has no user ID because this knowledge base is shared product content.

The vector table is managed with parameterized raw SQL because the Prisma schema does not model the pgvector column.

## Security controls

- JWT authentication on the chat endpoint.
- Per-user daily quota and endpoint throttling.
- Product documentation only; no financial-data service dependency.
- Retrieved documents and user messages are explicitly untrusted in the system prompt.
- No tool calling or write-capable actions.
- Source indexes are validated against retrieved chunks.
- Explicit navigation requests resolve to canonical page routes; per-document frontmatter routes are not treated as the requested destination.
- Section-level source links use the section's destination where it is known, not an unrelated parent or sibling page.
- Navigation routes are allowlisted server-side.
- Provider and embedding keys remain in the backend environment.
- Usage records contain provider/model/token metadata only, never prompt content.

## Validation

Unit tests cover the endpoint service, relevance threshold, citation allowlisting, disabled feature behavior, prompt-injection boundaries and privacy-safe usage accounting.

The integration test runs against the pgvector-enabled PostgreSQL service and verifies cosine-distance ordering and extension availability.
