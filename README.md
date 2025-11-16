### Application diagram 
<img width="2069" height="1138" alt="image" src="https://github.com/user-attachments/assets/e05ecf04-be9c-4365-9f00-8259d07da3f3" />



## Architecture Flow (Mermaid)


```mermaid
flowchart TD

%% ============= PRESENTATION LAYER =============
subgraph UI["Frontend – Next.js / React"]
direction TB
   UI_Auth@{icon:"fa:user",form:"rounded",label:"Auth Page\nSupabase Auth UI",h:64}
   UI_ResumeMentor@{icon:"fa:file-pdf",form:"rounded",label:"Resume Mentor\nUpload PDF\nParse Resume\nPaste Job Details",h:64}
   UI_AppAssistant@{icon:"fa:pen-to-square",form:"rounded",label:"Application Assistant\nTailored Resume\nCover Letter",h:64}
   UI_CareerTracking@{icon:"fa:calendar-check",form:"rounded",label:"Career Tracking\nCheckpoints\nGuidance",h:64}
   UI_SkillGap@{icon:"fa:chart-bar",form:"rounded",label:"Skill Gap Analysis\nInput Job Details\nShow Missing Skills",h:64}
end

%% For even horizontal alignment
UI_Auth ~~~ UI_ResumeMentor ~~~ UI_AppAssistant ~~~ UI_CareerTracking ~~~ UI_SkillGap

%% ============= BACKEND SERVICE LAYER =============
subgraph API["Backend API (Server Functions)"]
direction TB
   API_Auth@{icon:"fa:user-lock",form:"rounded",label:"Auth Middleware\nToken Validation",h:54}
   API_PDF@{icon:"fa:file-pdf",form:"rounded",label:"PDF Parsing Service\nExtract + Structure Resume",h:54}
   API_SaveResume@{icon:"fa:floppy-disk",form:"rounded",label:"Resume Persistence\nWrite Parsed Data",h:54}
   API_AIEngine@{icon:"fa:lightbulb",form:"rounded",label:"AI Prompt Engine\nGemini Flash 2.5",h:54}
   API_TailorResume@{icon:"fa:file-lines",form:"rounded",label:"Tailored Resume Generator",h:54}
   API_CoverLetter@{icon:"fa:file-lines",form:"rounded",label:"Cover Letter Generator",h:54}
   API_SkillGap@{icon:"fa:chart-bar",form:"rounded",label:"Skill Gap Engine\nMatch\nMissing Skills\nResources",h:54}
end
%% Force horizontal alignment of API nodes
API_Auth ~~~ API_PDF ~~~ API_SaveResume ~~~ API_AIEngine ~~~ API_TailorResume ~~~ API_CoverLetter ~~~ API_SkillGap

%% ============= AUTH + DATA LAYER (SUPABASE) =============
subgraph SUPA["Supabase Platform"]
direction TB
   SUPA_Auth@{icon:"fa:user-check",form:"circle",label:"Supabase Auth",h:54}
   SUPA_DB@{icon:"fa:database",form:"circle",label:"PostgreSQL Database\nParsed Resumes\nUser Profiles\nCareer Data",h:54}
   SUPA_Storage@{icon:"fa:folder",form:"circle",label:"File Storage\nUploaded PDF Resumes",h:54}
end

SUPA_Auth ~~~ SUPA_DB ~~~ SUPA_Storage

%% ============= FLOW CONNECTIONS =============

%% ---- AUTH FLOW ----
UI_Auth ---> API_Auth
API_Auth ---> SUPA_Auth
API_Auth -.response.-> UI_Auth

%% ---- RESUME MENTOR WORKFLOW ----
UI_ResumeMentor ---> API_PDF
API_PDF ---> API_AIEngine
API_PDF ---> SUPA_Storage
API_AIEngine ---> API_SaveResume
API_SaveResume ---> SUPA_DB
API_SaveResume -.confirmation.-> UI_ResumeMentor

%% ---- APPLICATION ASSISTANT ----
UI_AppAssistant ---> API_TailorResume
UI_AppAssistant ---> API_CoverLetter
API_TailorResume ---> API_AIEngine
API_CoverLetter ---> API_AIEngine
API_AIEngine ---> UI_AppAssistant

%% ---- CAREER TRACKING ----
UI_CareerTracking ---> SUPA_DB
SUPA_DB -.records.-> UI_CareerTracking

%% ---- SKILL GAP ANALYSIS ----
UI_SkillGap ---> API_SkillGap
API_SkillGap ---> API_AIEngine
API_SkillGap ---> SUPA_DB
API_AIEngine ---> UI_SkillGap

%% ---- DB INTERACTIONS ----
API_PDF ---> SUPA_DB
SUPA_DB ---> API_TailorResume
SUPA_DB ---> API_SkillGap

%% =========== EXPLICIT LAYER SPACING ===========
UI_Auth ~~~ API_Auth
UI_ResumeMentor ~~~ API_PDF
UI_AppAssistant ~~~ API_TailorResume
UI_CareerTracking ~~~ SUPA_DB
UI_SkillGap ~~~ API_SkillGap
API_TailorResume ~~~ SUPA_DB
API_CoverLetter ~~~ SUPA_DB

```

## Technologies

- **Languages:** TypeScript, JavaScript (Node.js)
- **Frontend:** React, Vite
- **Backend:** Node.js, Express (see `server/index.js`)
- **AI / LLM:** Google Gemini (Gemini Flash; usage in `services/geminiService.ts`)
- **Database & Auth:** Supabase (Postgres, Auth, Storage)
- **Vector DB / Embeddings:** Pinecone (optional)
- **Storage:** AWS S3 (uploads) and Supabase Storage
- **Cache / Sessions:** Redis (optional)
- **Tooling & Build:** npm, Vite, TypeScript, tsconfig.json
- **Dev server:** small Express proxy server (`npm run server`)

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1XVS_K0-c53h_7qdAi4L-6TVh9A5hFb8v

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

Optional: Run the local server to keep the API key on the server (recommended for security):

1. Install dependencies (if not already): `npm install`
2. Create a `.env` file in the project root with:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Start the small Express server that proxies AI requests:

```
npm run server
```

4. In a separate terminal start the front-end dev server:

```
npm run dev
```

The front-end will call the server endpoint at `http://localhost:4000/api/extract-resume` when running on localhost.

Database & vector store (Postgres + Pinecone) setup
1. Set the `DATABASE_URL` environment variable (Postgres connection string). Example:

```
DATABASE_URL=postgres://username:password@hostname:5432/dbname
```

2. (Optional) Set Pinecone env variables if you plan to store embeddings there:

```
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENV=your_pinecone_env
PINECONE_INDEX=your_index_name
```

3. (Optional) Set Redis URL for caching/sessions:

```
REDIS_URL=redis://:<password>@host:port
```

4. When you run `npm run server`, the server will attempt to initialize minimal tables in Postgres (if `DATABASE_URL` is set). This creates tables for `users`, `resumes`, `tailored_resumes`, `chat_conversations`, `chat_messages`, and `embeddings`.

Notes:
- The current server saves records with `user_id` = null until you enable authentication. Adding auth (JWT or Supabase) will let you associate records with users.
- For production, use a managed Postgres (Supabase) and Pinecone for high-performance vector search.

Upload resumes 
------------------------

This project implements a minimal upload pipeline that stores PDF resumes in S3 and records metadata in Postgres.

Required environment variables for S3 uploads (add to your `.env` used by `npm run server`):

```
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-private-bucket-name
UPLOAD_MAX_BYTES=10485760  # optional, default 10MB
```

Endpoint
- POST /api/upload-resume

Form field: `file` (multipart/form-data). Only `application/pdf` is accepted.

Response (201):

```
{ "resumeId": "...", "s3Url": "s3://bucket/key", "presignedUrl": "https://...", "filename": "...", "size": 12345 }
```

Example curl (replace values):

```
curl -X POST http://localhost:4000/api/upload-resume \
   -F "file=@/path/to/resume.pdf"
```

Frontend example (fetch):

```
const f = new FormData();
f.append('file', fileInput.files[0]);
const res = await fetch('/api/upload-resume', { method: 'POST', body: f });
const json = await res.json();
console.log(json);
```

<img width="1001" height="638" alt="Screenshot 2025-11-16 at 12 24 43 PM" src="https://github.com/user-attachments/assets/7663f4eb-57c8-4ae2-91e3-42a82c014687" />

<img width="1005" height="646" alt="Screenshot 2025-11-16 at 12 26 01 PM" src="https://github.com/user-attachments/assets/dc07c364-43eb-454f-8b06-a28194fa9244" />
<img width="971" height="647" alt="Screenshot 2025-11-16 at 12 26 21 PM" src="https://github.com/user-attachments/assets/9e42c6e7-7541-40dc-acfb-9bf5020d8b0e" />
<img width="796" height="631" alt="Screenshot 2025-11-16 at 12 26 35 PM" src="https://github.com/user-attachments/assets/0b45d610-6b14-4c10-9adc-4533497c8805" />
