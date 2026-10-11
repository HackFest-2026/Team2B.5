# VeriMerge — Evidence Intelligence Prototype

VeriMerge is a local demonstration prototype for document ingestion, evidence-grounded question answering, document review, and report generation.

## What is included

- Next.js dashboard with account creation/sign-in, workspace creation, document upload, evidence-grounded Q&A, document assistants, and report export.
- FastAPI backend with SQLite persistence, bearer-token authentication, file text extraction, SHA-256 fingerprints, chunk storage, and workspace-scoped project/document operations.
- Supported upload formats: `.pdf`, `.docx`, `.txt`, `.csv`, `.xlsx`, `.xls` (maximum 15 MB by default).

## Run locally (Windows PowerShell)

### 1. Start the backend

From the `verimerge` project root:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SECRET_KEY = "replace-with-a-long-random-local-secret"
uvicorn backend.main:app --reload --port 8000
```

Check that `http://127.0.0.1:8000/ping` returns `{"ping":"pong"}`.

### 2. Start the frontend in a second terminal

```powershell
npm install
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000"
npm run dev
```

Open `http://localhost:3000`. Keep the Ollama app running in the background; VeriMerge uses the local `llama3.2` model by default and does not require a cloud API key.

## Suggested live demo flow

1. Register with a new email and a password of at least eight characters.
2. Create a workspace named `Demo Evidence Review`.
3. Upload two source documents (the included `test_files` directory contains examples).
4. Ask a question about the uploaded sources and inspect the evidence references.
5. Run the document assistants to review entities, conflicts, and sensitive-information indicators.
6. Generate a report and export it for review.

## Important limitations — be transparent during judging

- This is a demonstrable prototype, not a production security-reviewed service. Configure a strong secret, HTTPS, strict origins, rate limits, and a managed database before deployment.
- QA retrieves relevant source passages and uses the locally installed Ollama `llama3.2` model by default. Model answers are grounded in retrieved passages and citations are assembled server-side from the retrieved chunks. Without a configured provider, the app transparently falls back to excerpts.
- The current conflict detector is heuristic and can flag repeated numeric values; treat these as review candidates, not proven contradictions.
- Scanned/image-only PDFs may need OCR, which is not currently included.
- Access classification and redaction are not yet implemented as a complete security gate. Do not upload classified, highly sensitive, or unauthorized data to this prototype.
- Registration requires a unique email. Existing demo accounts with legacy SHA-256 password hashes remain verifiable; new passwords use PBKDF2.

## Configuration

- `NEXT_PUBLIC_API_URL`: frontend API base URL (defaults to `http://127.0.0.1:8000`).
- `SECRET_KEY`: JWT signing secret. Set a strong random value outside local demos.
- `DATABASE_URL`: SQLAlchemy URL (defaults to local SQLite `sqlite:///./verimerge.db`).
- `FRONTEND_ORIGIN`: primary frontend origin allowed by CORS (defaults to `http://localhost:3000`).
- `UPLOAD_DIR`: upload storage directory (defaults to `./uploaded_files`).
- `MAX_UPLOAD_BYTES`: upload cap in bytes (defaults to 15 MiB).
- `LLM_PROVIDER`: defaults to `ollama`; set to `cloud` only if you deliberately want to use a configured cloud model.
- `OLLAMA_BASE_URL`: local Ollama address (defaults to `http://127.0.0.1:11434`).
- `OLLAMA_MODEL`: local model name (defaults to `llama3.2`).

## Coordinated agent pipeline (prototype)

After signing in and uploading at least one `READY` document, select **Review all documents** in the Document assistants section. The backend endpoint is `POST /projects/{project_id}/pipeline`.

The pipeline currently runs these review stages:

1. **Ingestion & Provenance** — reports processed documents, missing extracted text, and exact duplicate SHA-256 fingerprints.
2. **Evidence & Entity** — groups repeated exact-value patterns (emails, dates, amounts, and capitalized phrases) with source document and context references.
3. **Conflict Detection** — flags possible differences where a shared nearby label has different values across documents. These are candidates for human review, not confirmed contradictions.
5. **Security Screening** — flags patterns such as email addresses, phone-number candidates, government-ID keywords, and credential keywords for review. It does not yet enforce role-based access control or redact files.
6. **Report Composer** — returns a structured result summary and a list of source documents with fingerprints.

The pipeline is a functional prototype, not six independent autonomous LLMs. Pattern-based stages are deterministic heuristics; the QA endpoint can use an OpenAI-compatible LLM when configured. OCR for scanned PDFs, robust semantic entity resolution, stronger semantic contradiction detection, production-grade DLP/access control, and comprehensive integration/browser testing remain future work. Treat results as review assistance and validate them against original sources.


## Live language-model responses (local or cloud)

VeriMerge does not hard-code fake chatbot answers. To generate open-ended answers and agent explanations, it needs an actual language model. You can use a local model without an API key:

1. Install Ollama from https://ollama.com/ and start it.
2. In PowerShell, run `ollama pull llama3.2`. The first download may take a while.
3. Keep the Ollama app/service running and restart the VeriMerge backend. The default configuration checks `http://127.0.0.1:11434` automatically.
4. Run a document question or the agent pipeline again. The agent cards identify whether their explanations were model-generated or rule-based.

Alternatively, configure `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` in the backend environment for a compatible cloud provider. Never put private keys in frontend variables or commit a real `.env` file.

If neither local Ollama nor a cloud model is available, VeriMerge still shows transparent rule-based checks, but it cannot truthfully claim to be generating general chatbot responses. Conflict detection and security screening remain heuristic review aids.
