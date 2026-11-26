# TrellisFlow Help Centre knowledge base

This directory contains approved, user-facing product documentation indexed by the authenticated Help Assistant.

## Update workflow

1. Update the relevant Markdown guide in the same pull request as a product change.
2. Keep route metadata aligned with the real application route.
3. Apply the database migration before ingestion.
4. Run the ingestion command from the API package:

   `pnpm --filter @trellisflow/api ingest:help-docs`

The command reads product-guide Markdown files recursively (excluding this README), chunks content by headings and paragraphs, generates Gemini retrieval-document embeddings, and atomically replaces the complete vector index only after every embedding succeeds. It is safe to rerun after documentation changes.

## Trust and visibility

These files are source material for the authenticated Help Assistant. They are not served as public static files by the Help Assistant API. The existing in-app Help page remains behind the authenticated application layout. Do not put secrets, private operational runbooks, user data, credentials or internal-only infrastructure details here.

All retrieved text is treated as untrusted reference content by the answer-generation prompt. Product documentation should describe verified user-facing behavior only.

## Embeddings

The ingestion command and runtime query embedder use the server-side Gemini API key and the same configured `GEMINI_EMBEDDING_MODEL` (default `gemini-embedding-001`) with 768 dimensions. Keep the model and dimensionality aligned with the pgvector migration.
