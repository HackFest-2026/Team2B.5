# Problem Statement

Legal documents often contain complex clauses, obligations, deadlines, and potential risks that are difficult to identify quickly. Manually reviewing lengthy agreements can be time-consuming, and sending confidential documents to cloud-based AI services can introduce privacy concerns.

VeriMerge aims to simplify legal document triage by helping users understand document contents, identify potentially important or conflicting information, and find supporting passages using a locally running AI model.

# VeriMerge — Private Legal Document Triage Agent

**VeriMerge** is an AI-assisted legal document analysis application designed to help users review legal documents more efficiently while prioritizing local processing and document privacy.

The project combines a web interface, a Python backend, document processing, evidence retrieval, and local language-model integration to support document understanding and preliminary risk review.

> **Important:** VeriMerge is an assistance tool, not a substitute for a qualified lawyer. Its outputs should be reviewed by a human before being used to make legal decisions.

## Problem Statement and Motivation

Legal agreements, contracts, policies, and other formal documents can be lengthy and difficult to understand. Important obligations, deadlines, unusual clauses, and inconsistencies may be overlooked during manual review.

Traditional manual review takes time, while cloud-based AI tools may require users to share confidential material with external services.

VeriMerge addresses these challenges by aiming to provide:

- Easier access to information contained in legal documents.
- Plain-language assistance for understanding document content.
- Retrieval of relevant passages to support answers.
- Identification of potentially important details and inconsistencies.
- A privacy-conscious workflow using a locally running language model.

## Key Features

### 1. Document Upload and Processing

- Upload supported documents through the web interface.
- Extract document text for analysis.
- Organize documents within a project.
- Retrieve relevant text passages to support document questions.

The current implementation's supported file types and size limits depend on the backend configuration.

### 2. Ask Questions About Documents

Users can ask questions about uploaded documents in natural language.

The system is designed to retrieve relevant passages and use the available language model to help formulate answers grounded in document content.

### 3. Evidence-Based Responses

VeriMerge aims to connect responses to relevant document passages so that users can inspect the underlying evidence rather than relying only on generated text.

Users should verify important statements against the original document, especially when a response concerns a legal obligation, deadline, or potential risk.

### 4. Legal Document Triage

The application is intended to assist with preliminary review by helping users examine:

- Important clauses and obligations.
- Dates, deadlines, and numerical details.
- Potentially conflicting information.
- Sensitive or significant document content.
- Findings that may require additional human review.

Automated findings are preliminary indicators, not definitive legal conclusions.

### 5. Local AI Integration

VeriMerge supports local language-model integration through Ollama. The development configuration uses **Gemma 4 E2B (`gemma4:e2b`)**.

Running the model locally can reduce the need to send document content to an external AI inference provider. However, complete privacy depends on the entire application workflow, configuration, and any external services used.

### 6. Web-Based Interface

The application provides a web interface for interacting with the backend, managing document-related workflows, and asking questions about document content.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Python, FastAPI |
| Local AI runtime | Ollama |
| Language model | Gemma 4 E2B (`gemma4:e2b`) |
| Document processing | PyMuPDF and Python document-processing libraries |
| API communication | HTTP and REST endpoints |
| Version control | Git and GitHub |

The exact dependencies and versions are defined in `package.json` and `requirements.txt`.

## System Architecture

The application follows a frontend–backend architecture with local AI integration.

```text
                 USER
                   |
                   v
          Next.js Web Interface
                   |
                   v
             FastAPI Backend
                   |
          +--------+---------+
          |                  |
          v                  v
   Document Processing   Evidence Retrieval
          |                  |
          +--------+---------+
                   |
                   v
            Local Ollama API
                   |
                   v
            Gemma 4 E2B
                   |
                   v
       Answer / Analysis Response
                   |
                   v
          Next.js Web Interface
```

The diagram represents the intended high-level workflow. The actual sequence of processing depends on the endpoint and feature being used.

## Project Structure

The repository contains the frontend, backend, and dependency files needed for development.

```text
verimerge/
├── app/                  # Next.js application pages and styles
├── backend/              # Python backend and API endpoints
├── package.json          # Frontend dependencies and scripts
├── requirements.txt      # Python dependencies
├── README.md             # Project documentation
├── LICENSE               # Open-source license
└── .gitignore            # Files excluded from Git
```

Other configuration files and directories may also be present in the repository.

## Prerequisites

Install the following software before running the application:

- Git
- Node.js and npm
- Python 3.11 or another version compatible with the project's dependencies
- Ollama for local model inference

You should also have enough available disk space and memory to run the selected language model.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/ZERODAY-2026/Aura-Farmer.git
cd Aura-Farmer
```

### 2. Download the local language model

Install Ollama from [ollama.com](https://ollama.com/).

Open a terminal and run:

```bash
ollama pull gemma4:e2b
```

Start the model to verify that it can run:

```bash
ollama run gemma4:e2b
```

You can exit the interactive model session after confirming that it responds.

### 3. Configure the environment

Create a `.env` file in the project root if the backend configuration requires one.

For the local Ollama setup, the relevant values are:

```dotenv
LLM_PROVIDER=ollama
OLLAMA_MODEL=gemma4:e2b
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Set any other required environment variables according to the backend configuration and `.env.example`, if present.

**Security:** Never commit `.env`, authentication secrets, access tokens, or private document contents to GitHub.

### 4. Set up the Python backend

From the repository root, create a virtual environment:

**Windows PowerShell**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the Python dependencies:

```powershell
pip install -r requirements.txt
```

Start the backend:

```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Keep this terminal open while using the application.

### 5. Start the frontend

Open a second terminal and navigate to the repository root:

```powershell
cd C:\path\to\Aura-Farmer
```

Replace the example path with the actual location where you cloned the repository.

Install the frontend dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open the local address printed by Next.js, typically:

`http://localhost:3000`

### 6. Verify the backend

With the backend running, open:

`http://127.0.0.1:8000/ping`

The current backend provides a ping endpoint that can be used as a basic connectivity check.

The model status endpoint can also be checked at:

`http://127.0.0.1:8000/model-status`

A successful status response indicates whether the configured local model is available according to the backend.

## How to Use VeriMerge

1. Start Ollama and ensure the configured model is available.
2. Start the FastAPI backend.
3. Start the Next.js frontend.
4. Open the web application in your browser.
5. Sign in or create a project if prompted.
6. Upload a supported document that you are permitted to process.
7. Ask a question about information contained in the document.
8. Review the response and its supporting passages, where available.
9. Verify important findings against the original document.

Begin with a non-sensitive test document while validating a new installation.

## Privacy and Security

Privacy is an important design consideration for VeriMerge.

The local Ollama configuration allows language-model inference to run on the user's machine rather than requiring a hosted model API for every request.

However, **local model inference alone does not guarantee end-to-end privacy**. Backend routes, document storage, authentication, logging, networking, and other integrations must also be reviewed.

Recommended precautions:

- Keep `.env` and other secret files out of version control.
- Do not upload real confidential legal documents to public repositories.
- Use synthetic or non-sensitive documents for demonstrations.
- Restrict access to the application and its stored documents.
- Review application logs and external network requests before processing sensitive material.
- Use a strong secret key and appropriate authentication settings.
- Verify that all document-analysis paths use the intended local model configuration.

The project's privacy properties should be validated through code review and testing before production use.

## Limitations

VeriMerge is an evolving prototype. Users should be aware that:

- AI-generated answers can be inaccurate or incomplete.
- Retrieved passages may not contain all information needed to answer a question.
- Automated conflict detection may produce false positives or miss subtle inconsistencies.
- Text extraction may not work correctly for every PDF, scanned page, or complex document layout.
- A generated summary or risk flag is not a legal opinion.
- Production use requires additional testing of authentication, authorization, storage, and privacy controls.

Always inspect the source document and consult a qualified legal professional for consequential legal questions.

## Testing and Verification

Before using the application for a demonstration, verify the following:

- The frontend starts successfully.
- The backend health endpoint responds.
- Ollama can run the configured Gemma model.
- The backend reports the expected model status.
- A supported test document can be uploaded.
- Document questions return useful answers.
- Retrieved evidence corresponds to the source document.
- Missing evidence and model failures are handled clearly.
- Secrets and private files are excluded from the repository.

These are recommended verification steps; listing them does not imply that every test has already passed.

## Future Improvements

Potential areas for further development include:

- More reliable clause and obligation extraction.
- Improved detection of inconsistencies across multiple documents.
- Stronger evidence attribution and citation validation.
- Better handling of scanned PDFs and OCR.
- Explicit uncertainty indicators for unsupported conclusions.
- Enhanced document access controls and privacy auditing.
- Automated tests for retrieval, model responses, and API endpoints.
- Clearer guidance on when users should seek professional legal advice.

## Contributing

Contributions and feedback are welcome.

1. Fork the repository or create a branch if you have collaborator access.
2. Make a focused change.
3. Test the affected functionality.
4. Submit a pull request describing the change and its verification.

Do not include confidential documents, credentials, or private user data in issues, commits, or pull requests.

## License

This project is distributed under the terms of the MIT License. See the [`LICENSE`](LICENSE) file for the full license text.

## Disclaimer

VeriMerge is intended to support preliminary document review and information retrieval. It does not provide legal advice, establish legal validity, or replace a lawyer. AI-generated outputs may contain errors and must be independently checked before being relied upon.

## Repository

**GitHub:** https://github.com/ZERODAY-2026/Aura-Farmer
