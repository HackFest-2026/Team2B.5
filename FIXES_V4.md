# Aura-Farmer v4 changes

- Ask Your Documents is now a conversational chat: it displays the message history and sends recent turns with follow-up questions.
- Q&A retrieval no longer stops at a keyword threshold. It ranks matching passages and adds representative excerpts from ready documents for broad questions.
- Responses remain grounded in uploaded passages and citations are created by the backend.
- If Ollama fails, the Q&A screen shows source excerpts as a fallback rather than inventing an answer.
- Ollama defaults to `gemma4:e2b`, matching `.env.example`.
- Existing specialist assistant IDs and their role-specific prompts are retained.

## Local run

1. Copy `.env.example` to `.env` in the project root if `.env` does not exist. Keep your own secret values private.
2. Install Python dependencies with `pip install -r requirements.txt` from the project root.
3. Start the backend from `backend/` with `python -m uvicorn main:app --host 127.0.0.1 --port 8000`.
4. Ensure Ollama is running and `ollama list` shows `gemma4:e2b`.
5. In another terminal at the project root, run `npm install` and `npm run dev`.
6. Open `http://localhost:3000`, upload the documents, and test Ask Your Documents and each specialist assistant.
