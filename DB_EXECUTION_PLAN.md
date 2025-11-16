# Execution Plan — RDS + S3 + Pinecone + Redis Integration

This document is an actionable execution plan for adding production-ready persistence and semantic search to the Job-Application-Platform project. It is written so two developers can split work and move in parallel with minimal blocking.

Goals
- Persist uploaded PDFs and generated artifacts (resumes, tailored resumes, cover letters).
- Keep binaries in S3, metadata & parsed JSON in Postgres (RDS/Aurora).
- Add a vector pipeline (Pinecone) for semantic retrieval and recommendations.
- Keep the Gemini API key server-side and add a clean upload → parse → embed → search workflow.

Phases (high level)
- Phase A (Immediate): Upload flow
  - Implement `POST /api/upload-resume` using `multer`.
  - Upload file to S3 (private) and insert metadata row in `resumes` table (s3_url, filename, size, content_type).
  - Return `resumeId` to client. Keep `user_id` nullable until auth is added.

- Phase B (Parse & persist)
  - Extract text from uploaded PDF (server-side: `pdf-parse` or `pdfjs-dist`).
  - Call Gemini to generate parsed JSON + model_text; save to `resumes.parsed_json` and `resumes.model_text`.
  - Optionally mark resume parsing status (queued/complete/error) to provide UX feedback.

- Phase C (Embeddings → Pinecone)
  - Chunk parsed resume text into passages (200–800 tokens) with overlap.
  - Generate embeddings via chosen model (Gemini or other) and batch-upsert vectors to Pinecone with metadata (resume_id, user_id (hashed), chunk_index, text_preview).
  - Save vector ids/metadata into `embeddings` table for traceability.

- Phase D (Tailoring, chat & search)
  - Implement retrieval helper using Pinecone to fetch top-k passages for a resume or user.
  - Use retrieved passages as context for `tailor-resume`, `getChatResponse`, and `generate-cover-letter` calls.

- Phase E (Auth & multi-user hardening)
  - Add JWT-based auth or Supabase Auth; attach `user_id` to saved artifacts.
  - Restrict Pinecone queries and S3 access to user-owned objects (namespaces or metadata filters + presigned URLs).


Environment variables (minimum)
- DATABASE_URL — Postgres connection string (RDS/Aurora)
- GEMINI_API_KEY — Google GenAI API key
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
- S3_BUCKET_NAME
- PINECONE_API_KEY, PINECONE_ENV, PINECONE_INDEX
- REDIS_URL (optional for caching/sessions)
- JWT_SECRET (if you add JWT auth)


Detailed Phase A tasks (Upload flow)
- Backend
  1. Add `multer` to dependencies and configure an upload middleware in `server/index.js`.
  2. Add route `POST /api/upload-resume` that accepts `multipart/form-data` with field `file` (PDF) and optional `userId`.
  3. Validate file type (must be `application/pdf`) and file size (start with 10MB limit configurable via env).
  4. Upload to S3 using AWS SDK v3: key `resumes/{resumeId}/{timestamp}-{filename}`.
  5. Call `saveResume({ userId, rawText: null, parsedJson: null, modelText: null, uploadSource: 'web', s3_url, filename, size, content_type })`.
  6. Return `201 { resumeId, s3Url, filename, size }`.

- Frontend
  1. Add a small file upload UI or use existing Resume upload flow.
  2. Use `FormData` to POST file to `/api/upload-resume` and handle response.
  3. After upload, show parsing/processing state in UI (resume queued).


Phase B tasks (Parse & persist)
- Backend
  1. After upload completes (synchronously or via background worker), extract text from PDF using `pdf-parse` or `pdfjs-dist`.
  2. Option A: Parse immediately and persist parsed JSON synchronously. Option B: push job to a queue (Redis + BullMQ) for async processing — recommended for large files.
  3. Call Gemini server-side with the extracted text to get structured `parsed_json` (use `services/geminiService.ts` server-side or new server method).
  4. Update `resumes` row with `parsed_json`, `model_text` and set `parsed_at` timestamp and `status`.

- Frontend
  1. Poll resume status or receive real-time updates (websocket / server-sent events) to show when parsing is finished.


Phase C tasks (Embeddings & Pinecone)
- Backend
  1. Chunk parsed text: split into paragraphs/segments, create overlapping chunks.
  2. Generate embeddings using chosen model; batch requests for efficiency.
  3. Upsert to Pinecone: include metadata { resume_id, user_id (hashed or null), chunk_index, text_preview }.
  4. Persist minimal vector metadata to `embeddings` table (id, resume_id, chunk_index, pinecone_id, metadata).

- Design notes
  - Choose dimension = embedding model dimension (e.g., 1536). Keep consistent across the index.
  - Decide between namespaces (per-user) or metadata filters. For privacy, namespaces provide stronger isolation.


Phase D tasks (Retrieval + Tailor)
- Backend
  1. Implement `services/retrieval.js` helper that: given a query or job description, creates an embedding and asks Pinecone for top-k matching chunks (optionally filtered by `resume_id` or `user_id`).
  2. Update `tailor-resume` endpoint to call the retrieval helper and include top-k chunks into the prompt for Gemini.


Phase E tasks (Auth & security)
- Backend
  1. Implement JWT auth middleware or integrate Supabase Auth.
  2. Protect endpoints; set `user_id` on saves.
  3. Implement delete flow that removes S3 object, DB rows, and Pinecone vectors.


Team split — suggested roles & estimates
We assume two developers (Dev A and Dev B). Estimates are rough (hours) and depend on familiarity.

- Dev A (Focus: Backend upload, S3, DB wiring) — ~1.5–2 days
  - Add multer + POST `/api/upload-resume` (3–5 hrs)
  - Integrate AWS S3 upload + error handling (3–6 hrs)
  - Extend `saveResume` to store s3_url, filename, size, content_type (1–2 hrs)
  - Add basic tests (curl verification) and README updates (2 hrs)

- Dev B (Focus: Parsing, Gemini, embeddings pipeline) — ~2–3 days
  - Add PDF parsing (pdf-parse) and implement parse worker (3–6 hrs)
  - Wire Gemini parse step server-side and persist parsed JSON (3–6 hrs)
  - Chunking + embedding generation + Pinecone upsert (4–8 hrs)

- Shared / cross-cutting tasks (rotate or pair):
  - Retrieval helper + tailor-resume integration (4–8 hrs)
  - Auth integration and attaching user_id (4–8 hrs)
  - Add Redis queue or BullMQ if async processing required (4–8 hrs)

How to split work practically (day 1)
- Dev A: implement upload endpoint + S3 + DB metadata + add README and sample curl.
- Dev B: implement PDF parsing code path that can be run locally and a small script that reads an S3 object and outputs extracted text; then integrate Gemini parsing logic.

Code ownership & PR strategy
- Create two feature branches:
  - `feature/upload-and-store` (Dev A) — PR includes server changes, tests, README snippet
  - `feature/parse-and-embed` (Dev B) — PR depends on DB columns; work against `feature/upload-and-store` or rebase after it's merged
- Perform code review and merge in this order: upload → parse → embed → retrieval → auth


Testing & verification
- Local dev: set `.env` with DATABASE_URL, AWS credentials (dev S3 or localstack), GEMINI_API_KEY.
- Sanity checks:
  - `curl -X POST -F 'file=@./example.pdf' http://localhost:4000/api/upload-resume` returns 201 + resumeId.
  - After parse, GET resume endpoint returns parsed JSON.
  - Embedding pipeline upsert returns a success and `embeddings` rows appear in DB.


Security checklist (pre-production)
- Keep all secrets in env or Secrets Manager; do not commit `.env`.
- Enforce TLS on RDS connections and S3 access.
- Use IAM roles/policies with least privilege for S3.
- Validate and sanitize user inputs; do not log raw PII.
- Implement deletion endpoint and data retention policy.


Next step (I will implement)
- If you confirm, I will implement Phase A now: add `multer`, S3 upload route, call `saveResume` with s3 metadata, and add README curl example. I will create the PR or push directly to `nga_dev` depending on your preference.

---
If you want modifications to the plan or a deeper breakdown of any phase into sub-tasks, tell me which phase and I will expand it into a ticket-like checklist.
