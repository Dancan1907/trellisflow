# TrellisFlow Help Centre knowledge base

This directory contains the approved product documentation indexed by the Help Assistant.

## Update workflow

1. Update the relevant Markdown guide in the same pull request as a product change.
2. Keep route metadata aligned with the real application route.
3. Apply the database migration before ingestion.
4. Run the ingestion command from the API package:

   `pnpm --filter @trellisflow/api ingest:help-docs`

The command reads Markdown files recursively, chunks by headings and paragraphs, generates Gemini retrieval-document embeddings, and replaces the indexed chunks for each source. It is safe to rerun after documentation changes.

## Trust and visibility

These files are source material for the authenticated Help Assistant. The assistant endpoint is authenticated; the docs are not exposed through a public file-serving endpoint. Do not put secrets, private operational runbooks, user data, credentials or internal-only infrastructure details here.

All retrieved text is treated as untrusted reference content by the answer-generation prompt. Product documentation should describe verified user-facing behavior only.
