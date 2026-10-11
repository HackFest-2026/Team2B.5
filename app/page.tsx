
"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

type Project = {
  id: string;
  name: string;
  created_at?: string;
};

type Doc = {
  id: string;
  filename: string;
  status: string;
  sha256: string;
  created_at?: string;
  content?: {
    metadata?: Record<string, unknown>;
    text?: string;
  };
};

type Citation = {
  document_id: string;
  chunk_id?: string;
  filename?: string;
  snippet: string;
  index?: string;
  page_number?: string | number | null;
};

type AgentResult = Record<string, any> & {
  user_summary?: string;
  analysis_mode?: string;
  status?: string;
};

type AgentPipeline = {
  pipeline_status: string;
  agents: {
    id: string;
    name: string;
    result: AgentResult;
  }[];
  report?: Record<string, unknown>;
  model_status?: {
    available: boolean;
    provider?: string | null;
    model?: string;
    message: string;
  };
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: {
    filename: string;
    page_number?: string | number | null;
    excerpt: string;
  }[];
};

const ASSISTANT_NAMES: Record<string, string> = {
  ingestion: "Document overview",
  evidence_entities: "People and key details",
  conflict: "Conflicting information",
  security: "Sensitive information",
  report_composer: "Report assistant",
};

export default function Home() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">(
    "register"
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("Research workspace");
  const [documents, setDocuments] = useState<Doc[]>([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerMode, setAnswerMode] = useState<
    "llm_grounded" | "retrieval_fallback" | "insufficient_evidence" | ""
  >("");
  const [citations, setCitations] = useState<Citation[]>([]);

  const [report, setReport] = useState<Record<string, unknown> | null>(
    null
  );
  const [pipeline, setPipeline] = useState<AgentPipeline | null>(null);
  const [htmlReport, setHtmlReport] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [backend, setBackend] = useState<
    "checking" | "online" | "offline"
  >("checking");

  const [agentChats, setAgentChats] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [agentInputs, setAgentInputs] = useState<
    Record<string, string>
  >({});
  const [chatBusy, setChatBusy] = useState<Record<string, boolean>>({});

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  useEffect(() => {
    fetch(`${API}/ping`)
      .then((response) => {
        if (!response.ok) throw new Error("Backend unavailable");
        return response.json();
      })
      .then(() => setBackend("online"))
      .catch(() => setBackend("offline"));
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("verimerge_token");
    if (saved) setToken(saved);
  }, []);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem("verimerge_token", token);
      loadProjects(token);
    } else {
      window.localStorage.removeItem("verimerge_token");
      setProjects([]);
      setProject(null);
      setDocuments([]);
    }
    // Token changes trigger workspace loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function request(
    path: string,
    init: RequestInit = {},
    auth = token
  ) {
    const requestHeaders = new Headers(init.headers);

    if (auth) {
      requestHeaders.set("Authorization", `Bearer ${auth}`);
    }

    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: requestHeaders,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function loadProjects(auth = token) {
    try {
      const rows: Project[] = await request("/projects", {}, auth);

      setProjects(rows);

      if (rows.length > 0 && !project) {
        await selectProject(rows[0], auth);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load workspaces."
      );
    }
  }

  async function selectProject(p: Project, auth = token) {
    setProject(p);
    setDocuments([]);
    setAnswer("");
    setAnswerMode("");
    setCitations([]);
    setReport(null);
    setHtmlReport(null);
    setPipeline(null);
    setAgentChats({});
    setAgentInputs({});

    try {
      const rows: Doc[] = await request(
        `/projects/${p.id}/documents`,
        {},
        auth
      );

      setDocuments(rows);
    } catch {
      // An older backend may not implement document listing.
    }
  }

  async function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      let data;

      if (authMode === "register") {
        data = await request(
          "/auth/register",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          },
          ""
        );
      } else {
        const form = new URLSearchParams({
          username: email,
          password,
        });

        data = await request(
          "/auth/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form,
          },
          ""
        );
      }

      setToken(data.access_token);
      setNotice(
        authMode === "register"
          ? "Account created. You are signed in."
          : "Welcome back."
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function createProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!projectName.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const p: Project = await request("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });

      setProjects((previous) => [p, ...previous]);
      await selectProject(p);
      setNotice("Workspace created.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create workspace."
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    // Allow the same file to be selected again after an upload.
    e.target.value = "";

    if (!file || !project) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const form = new FormData();
      form.append("file", file);

      const doc: Doc = await request(
        `/projects/${project.id}/documents`,
        {
          method: "POST",
          body: form,
        }
      );

      setDocuments((previous) => [doc, ...previous]);
      setNotice(`Processed ${file.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  // DELETE A DOCUMENT
  async function deleteDocument(d: Doc) {
    if (!project) return;

    const confirmed = window.confirm(
      `Delete "${d.filename}" and remove its indexed evidence? This cannot be undone.`
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await request(
        `/projects/${project.id}/documents/${d.id}`,
        { method: "DELETE" }
      );

      // Remove the document from the visible list.
      setDocuments((previous) =>
        previous.filter((item) => item.id !== d.id)
      );

      // Clear results that may refer to the deleted document.
      setAnswer("");
      setAnswerMode("");
      setCitations([]);
      setPipeline(null);
      setReport(null);
      setHtmlReport(null);
      setAgentChats({});
      setAgentInputs({});

      setNotice(
        `Deleted "${d.filename}" and removed its indexed evidence.`
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not delete the document."
      );
    } finally {
      setBusy(false);
    }
  }

  async function askQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!project || !question.trim()) return;

    setBusy(true);
    setError("");
    setAnswer("");
    setAnswerMode("");
    setCitations([]);

    try {
      const data = await request(
        `/projects/${project.id}/qa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: question.trim() }),
        }
      );

      setAnswer(data.answer || "No answer returned.");
      setAnswerMode(data.mode || "retrieval_fallback");
      setCitations(data.citations || []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Question answering failed."
      );
    } finally {
      setBusy(false);
    }
  }

  async function runPipeline() {
    if (!project) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data: AgentPipeline = await request(
        `/projects/${project.id}/pipeline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      setPipeline(data);
      setNotice(
        "Document review finished. Check the findings and source documents."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Document review could not finish."
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendAgentMessage(
    agentId: string,
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!project || !agentInputs[agentId]?.trim()) return;

    const message = agentInputs[agentId].trim();
    const previous = agentChats[agentId] || [];

    setChatBusy((prev) => ({ ...prev, [agentId]: true }));
    setError("");

    setAgentChats((prev) => ({
      ...prev,
      [agentId]: [
        ...(prev[agentId] || []),
        { role: "user", content: message },
      ],
    }));

    setAgentInputs((prev) => ({ ...prev, [agentId]: "" }));

    try {
      const data = await request(
        `/projects/${project.id}/agent-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent: agentId,
            message,
            history: previous.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      setAgentChats((prev) => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] || []),
          {
            role: "assistant",
            content:
              data.answer ||
              "I couldn't answer from the available documents.",
            sources: data.sources || [],
          },
        ],
      }));
    } catch (e) {
      const messageText =
        e instanceof Error
          ? e.message
          : "The assistant could not respond. Make sure Ollama is running.";

      setAgentChats((prev) => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] || []),
          { role: "assistant", content: messageText },
        ],
      }));
    } finally {
      setChatBusy((prev) => ({ ...prev, [agentId]: false }));
    }
  }

  async function runReport() {
    if (!project) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await request(
        `/orchestrator/${project.id}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      setReport(response);

      if (typeof response.html_report === "string") {
        setHtmlReport(response.html_report);
      } else {
        setHtmlReport(null);
      }

      setNotice("Report generation finished.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Report generation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function exportHtmlReport() {
    if (!htmlReport) return;

    const blob = new Blob([htmlReport], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${project?.name || "verimerge"}-report.html`;
    link.click();

    URL.revokeObjectURL(url);
  }

  
  function exportPdfReport() {
    if (!htmlReport) return;

    const win = window.open("", "_blank");

    if (!win) {
      setError("Allow pop-ups in your browser to print the report.");
      return;
    }

    win.onload = () => {
      win.focus();
      win.print();
    };

    win.document.open();
    win.document.write(htmlReport);
    win.document.close();
  }


  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="sidebar" aria-label="Workspace sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">V</div>
          <div>
            <strong>VeriMerge</strong>
            <small>Evidence intelligence</small>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        {token ? (
          <>
            <form onSubmit={createProject} className="new-project">
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                aria-label="New workspace name"
                placeholder="Workspace name"
              />
              <button disabled={busy}>+ Create</button>
            </form>

            <nav className="project-list" aria-label="Workspaces">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`project-link ${
                    project?.id === p.id ? "active" : ""
                  }`}
                  aria-current={project?.id === p.id ? "true" : undefined}
                  onClick={() => selectProject(p)}
                >
                  <span className="project-dot" aria-hidden="true" />
                  {p.name}
                </button>
              ))}
            </nav>

            <button
              className="logout"
              type="button"
              onClick={() => {
                setToken("");
                setNotice("Signed out.");
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <p className="sidebar-hint">
            Sign in to create a private evidence workspace.
          </p>
        )}

        <div className="sidebar-bottom">
          <span
            className={`status-dot ${
              backend === "online"
                ? "good"
                : backend === "offline"
                  ? "bad"
                  : ""
            }`}
          />
          <span>
            {backend === "checking"
              ? "Connecting…"
              : backend === "online"
                ? "Workspace ready"
                : "Service unavailable"}
          </span>
        </div>
      </aside>

      <section className="main-panel" id="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">YOUR DOCUMENT WORKSPACE</div>
            <h1>{project?.name || "Evidence workspace"}</h1>
          </div>

          <div className="topbar-right">
            <span
              className={`pill ${
                backend === "online" ? "pill-good" : "pill-warn"
              }`}
            >
              {backend === "online"
                ? "● Ready to review"
                : backend === "offline"
                  ? "● Temporarily unavailable"
                  : "● Connecting"}
            </span>

            {token && (
              <div className="avatar">
                {email ? email[0].toUpperCase() : "U"}
              </div>
            )}
          </div>
        </header>

        {(error || notice) && (
          <div
            className={`toast ${
              error ? "toast-error" : "toast-success"
            }`}
            role={error ? "alert" : "status"}
          >
            {error || notice}
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
              }}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {!token ? (
          <div className="auth-layout">
            <div className="hero-copy">
              <div className="hero-badge">
                ✦ Evidence-first intelligence
              </div>

              <h2>
                Turn scattered documents into{" "}
                <em>verifiable knowledge.</em>
              </h2>

              <p>
                Upload source files, ask evidence-grounded questions, and
                review findings in one workspace.
              </p>

              <div className="feature-row">
                <span>✓ Source-linked results</span>
                <span>✓ Source references</span>
                <span>✓ Clear findings</span>
              </div>
            </div>

            <form className="auth-card" onSubmit={authenticate}>
              <div aria-hidden="true" className="card-icon">↗</div>

              <h2>
                {authMode === "register"
                  ? "Create your workspace"
                  : "Welcome back"}
              </h2>

              <p>
                {authMode === "register"
                  ? "Get started with your evidence review."
                  : "Sign in to continue your review."}
              </p>

              <label>
                Email address
                <input type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@organisation.com"
                  autoComplete="email"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  autoComplete={
                    authMode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                />
              </label>

              <button
                className="primary-btn full"
                disabled={busy || backend === "offline"}
              >
                {busy
                  ? "Please wait…"
                  : authMode === "register"
                    ? "Create account →"
                    : "Sign in →"}
              </button>

              <div className="auth-switch">
                {authMode === "register"
                  ? "Already have an account?"
                  : "New to VeriMerge?"}{" "}
                <button
                  type="button"
                  onClick={() =>
                    setAuthMode(
                      authMode === "register" ? "login" : "register"
                    )
                  }
                >
                  {authMode === "register" ? "Sign in" : "Create account"}
                </button>
              </div>

              <small className="secure-note">
                Your workspace is tied to your signed-in account.
              </small>
            </form>
          </div>
        ) : (
          <>
            <div className="dash-intro">
              <h2>Turn documents into verified intelligence.</h2>
              <p>
                Search your knowledge, trace every answer to its source, and
                uncover discrepancies with evidence-driven AI reviews.
              </p>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <span aria-hidden="true" className="metric-icon">▤</span>
                <div>
                  <small>Documents uploaded</small>
                  <strong>{documents.length}</strong>
                  <span>In this workspace</span>
                </div>
              </div>

              <div className="metric-card">
                <span aria-hidden="true" className="metric-icon amber">⎘</span>
                <div>
                  <small>Report</small>
                  <strong>{report ? "Ready" : "Not run"}</strong>
                  <span>Workspace analysis</span>
                </div>
              </div>
            </div>

            {!project ? (
              <div className="empty-state">
                <div aria-hidden="true" className="empty-icon">▤</div>
                <h2>Create your first workspace</h2>
                <p>
                  Use the left panel to create a workspace, then upload
                  documents to begin.
                </p>
              </div>
            ) : (
              <>
              <ol className="workflow" aria-label="Review workflow">
                <li>
                  <a href="#documents">
                    <span className="workflow-num" aria-hidden="true">1</span>
                    <span>
                      <strong>Ingest documents</strong>
                      <small>Source documents</small>
                    </span>
                  </a>
                </li>
                <li>
                  <a href="#ask">
                    <span className="workflow-num" aria-hidden="true">2</span>
                    <span>
                      <strong>Verify evidence</strong>
                      <small>Ask your documents</small>
                    </span>
                  </a>
                </li>
                <li>
                  <a href="#review">
                    <span className="workflow-num" aria-hidden="true">3</span>
                    <span>
                      <strong>Review findings</strong>
                      <small>Document assistants</small>
                    </span>
                  </a>
                </li>
                <li>
                  <a href="#report">
                    <span className="workflow-num" aria-hidden="true">4</span>
                    <span>
                      <strong>Audit report</strong>
                      <small>Report for you</small>
                    </span>
                  </a>
                </li>
              </ol>
              <div className="content-grid">
                <section className="panel upload-panel" id="documents">
                  <div className="panel-heading">
                    <div>
                      <h2>Source documents</h2>
                      <p>
                        Upload documents to review their contents and
                        compare information.
                      </p>
                    </div>

                    <span className="count-badge">
                      {documents.length} files
                    </span>
                  </div>

                  <label className="dropzone" aria-busy={busy}>
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx,.csv,.xlsx,.xls"
                      onChange={uploadFile}
                      disabled={busy}
                    />

                    <span aria-hidden="true" className="upload-icon">↑</span>
                    <strong>
                      {busy
                        ? "Processing…"
                        : "Click to upload a document"}
                    </strong>
                    <span>
                      PDF, DOCX, TXT, CSV, XLSX · Max size depends on
                      server limits
                    </span>
                  </label>

                  <div className="document-list">
                    {documents.length > 0 ? (
                      documents.map((d) => (
                        <div className="document-item" key={d.id}>
                          <div className="file-icon">
                            {d.filename
                              .split(".")
                              .pop()
                              ?.toUpperCase()
                              .slice(0, 4)}
                          </div>

                          <div className="document-meta">
                            <strong title={d.filename}>
                              {d.filename}
                            </strong>
                            <small>
                              {d.status === "READY"
                                ? "Ready to review"
                                : d.status === "FAILED"
                                  ? "Processing failed"
                                  : "Processing document"}
                              {d.created_at
                                ? ` · Added ${String(d.created_at).slice(0, 10)}`
                                : ""}
                            </small>
                          </div>

                          <span className="ready-tag" data-status={d.status}>
                            {d.status === "READY" ? "Ready" : d.status}
                          </span>

                          {/* This is the × delete button. */}
                          <button
                            type="button"
                            className="delete-document-btn"
                            onClick={() => deleteDocument(d)}
                            disabled={busy}
                            aria-label={`Delete ${d.filename}`}
                            title="Delete document"
                          >
                            <span aria-hidden="true">×</span>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="muted-empty">
                        No documents yet. Upload a source file to begin.
                      </div>
                    )}
                  </div>
                </section>

                <section className="panel" id="ask">
                  <div className="panel-heading">
                    <div>
                      <h2>Ask your documents</h2>
                      <p>Get an answer with evidence references.</p>
                    </div>
                    <span aria-hidden="true" className="panel-symbol">✳</span>
                  </div>

                  <form className="stack-form" onSubmit={askQuestion}>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What does the source say about…?"
                      rows={3}
                      required
                    />

                    <button
                      className="primary-btn"
                      aria-busy={busy}
                      disabled={busy || documents.length === 0}
                    >
                      {busy ? "Working…" : "Answer from evidence →"}
                    </button>
                  </form>

                  {answer && (
                    <div className="answer-box">
                      <div className="answer-heading">
                        <strong>Response</strong>
                        <span
                          className={`answer-mode ${
                            answerMode === "llm_grounded"
                              ? "mode-ai"
                              : "mode-fallback"
                          }`}
                        >
                          {answerMode === "llm_grounded"
                            ? "✦ AI · evidence-grounded"
                            : answerMode === "insufficient_evidence"
                              ? "Evidence not found"
                              : "Evidence retrieval fallback"}
                        </span>
                      </div>

                      <p>{answer}</p>

                      {citations.length > 0 && (
                        <div className="citation-list">
                          <strong>Evidence references</strong>

                          {citations.map((c, i) => (
                            <div
                              key={`${c.document_id}-${c.chunk_id || i}`}
                              className="citation"
                            >
                              <span>[{i + 1}]</span>
                              <p>
                                <strong>
                                  {c.filename ||
                                    `Document ${c.document_id.slice(0, 8)}`}
                                </strong>
                                {c.page_number != null
                                  ? ` · page ${c.page_number}`
                                  : ""}
                                {": "}
                                {c.snippet}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <small>
                        Review the cited excerpts before relying on the
                        answer.
                      </small>
                    </div>
                  )}
                </section>

                <section className="panel agent-panel" id="review">
                  <div className="panel-heading">
                    <div>
                      <h2>Document assistants</h2>
                      <p>
                        Ask a specialist about your uploaded documents.
                      </p>
                    </div>
                    <span aria-hidden="true" className="panel-symbol">✦</span>
                  </div>

                  <button
                    className="primary-btn"
                    type="button"
                    onClick={runPipeline}
                    aria-busy={busy}
                    disabled={
                      busy ||
                      !documents.some((d) => d.status === "READY")
                    }
                  >
                    {busy
                      ? "Reviewing documents…"
                      : "Review all documents →"}
                  </button>

                  {pipeline && (
                    <>
                      <div className="pipeline-status">
                        <strong>Document review results</strong>
                        <span>
                          Status: {pipeline.pipeline_status || "Returned"}
                        </span>
                        <span>
                          Ask a follow-up question in any assistant below.
                        </span>
                      </div>

                      <div className="agent-results">
                        {(pipeline.agents || [])
                          .filter((agent) => agent.id !== "claim_verification")
                          .map((agent) => {
                            const r = agent.result || {};
                            const facts: string[] = [];

                            if (agent.id === "ingestion") {
                              facts.push(
                                `${r.documents_processed ?? 0} document(s) reviewed`,
                                `${r.documents_without_text?.length ?? 0} document(s) with no readable text`
                              );
                            } else if (agent.id === "evidence_entities") {
                              if (r.entity_groups != null) {
                                facts.push(
                                  `${r.entity_groups} repeated names or values may be relevant`
                                );
                              }
                            } else if (agent.id === "conflict") {
                              facts.push(
                                `${r.count ?? 0} possible disagreement(s) to review`
                              );
                            } else if (agent.id === "security") {
                              facts.push(
                                `${(r.findings || []).length} possible sensitive-information item(s) to review`
                              );
                            } else if (agent.id === "report_composer") {
                              facts.push(
                                `${r.document_count ?? 0} document(s) included in the review`
                              );
                            }

                            return (
                              <article
                                className="agent-result"
                                key={agent.id}
                              >
                                <div className="agent-result-heading">
                                  <strong>
                                    {ASSISTANT_NAMES[agent.id] ||
                                      agent.name ||
                                      "Document assistant"}
                                  </strong>

                                  <span
                                    className={
                                      r.analysis_mode === "language_model"
                                        ? "agent-ai-label"
                                        : "agent-rule-label"
                                    }
                                  >
                                    {String(
                                      r.status || r.analysis_mode || "Reviewed"
                                    ).replaceAll("_", " ")}
                                  </span>
                                </div>

                                <div className="agent-result-body">
                                  <p className="agent-summary">
                                    {r.user_summary ||
                                      "This stage returned no explanation."}
                                  </p>

                                  {facts.length > 0 && (
                                    <ul>
                                      {facts.map((fact, index) => (
                                        <li key={index}>{fact}</li>
                                      ))}
                                    </ul>
                                  )}

                                  {agent.id === "evidence_entities" &&
                                    Array.isArray(r.recurring_entities) &&
                                    r.recurring_entities.length > 0 && (
                                      <div className="agent-samples">
                                        <strong>Examples found</strong>

                                        {r.recurring_entities
                                          .slice(0, 3)
                                          .map(
                                            (
                                              entity: any,
                                              index: number
                                            ) => (
                                              <p key={index}>
                                                <b>
                                                  {entity.canonical_value}
                                                </b>{" "}
                                                — mentioned{" "}
                                                {entity.mention_count} times
                                              </p>
                                            )
                                          )}
                                      </div>
                                    )}

                                  {agent.id === "conflict" &&
                                    Array.isArray(r.potential_conflicts) &&
                                    r.potential_conflicts.length > 0 && (
                                      <div className="agent-samples">
                                        <strong>Items to review</strong>

                                        {r.potential_conflicts
                                          .slice(0, 3)
                                          .map(
                                            (
                                              item: any,
                                              index: number
                                            ) => (
                                              <p key={index}>
                                                <b>
                                                  {item.field_or_entity}
                                                </b>
                                                :{" "}
                                                {(item.values || [])
                                                  .map(
                                                    (v: any) =>
                                                      `${v.value} (${v.filename})`
                                                  )
                                                  .join("; ")}
                                              </p>
                                            )
                                          )}
                                      </div>
                                    )}

                                  {agent.id === "security" &&
                                    Array.isArray(r.findings) &&
                                    r.findings.length > 0 && (
                                      <div className="agent-samples">
                                        <strong>Items to review</strong>

                                        {r.findings
                                          .slice(0, 4)
                                          .map(
                                            (
                                              item: any,
                                              index: number
                                            ) => (
                                              <p key={index}>
                                                {String(
                                                  item.category ||
                                                    "Sensitive information"
                                                ).replaceAll("_", " ")}{" "}
                                                in {item.filename}
                                              </p>
                                            )
                                          )}
                                      </div>
                                    )}

                                  <div className="assistant-chat">
                                    <div className="assistant-chat-title">
                                      Ask this assistant
                                    </div>

                                    <div
                                      className="assistant-chat-messages"
                                      role="log"
                                      aria-live="polite"
                                    >
                                      {(agentChats[agent.id] || []).map(
                                        (m, index) => (
                                          <div
                                            className={`assistant-message ${m.role}`}
                                            key={`${agent.id}-${index}`}
                                          >
                                            <span>
                                              {m.role === "user"
                                                ? "You"
                                                : "Assistant"}
                                            </span>

                                            <p>{m.content}</p>

                                            {m.sources &&
                                              m.sources.length > 0 && (
                                                <details>
                                                  <summary>Sources</summary>

                                                  {m.sources
                                                    .slice(0, 4)
                                                    .map(
                                                      (
                                                        source,
                                                        sourceIndex
                                                      ) => (
                                                        <p
                                                          className="chat-source"
                                                          key={sourceIndex}
                                                        >
                                                          <strong>
                                                            {source.filename}
                                                          </strong>
                                                          {source.page_number
                                                            ? ` · page ${source.page_number}`
                                                            : ""}
                                                          <br />
                                                          {source.excerpt}
                                                        </p>
                                                      )
                                                    )}
                                                </details>
                                              )}
                                          </div>
                                        )
                                      )}

                                      {!(agentChats[agent.id] || [])
                                        .length && (
                                        <p className="assistant-chat-empty">
                                          Ask a question about your documents.
                                        </p>
                                      )}
                                    </div>

                                    <form
                                      className="assistant-chat-form"
                                      onSubmit={(e) =>
                                        sendAgentMessage(agent.id, e)
                                      }
                                    >
                                      <input
                                        value={
                                          agentInputs[agent.id] || ""
                                        }
                                        onChange={(e) =>
                                          setAgentInputs((prev) => ({
                                            ...prev,
                                            [agent.id]: e.target.value,
                                          }))
                                        }
                                        placeholder="Ask a follow-up…"
                                        aria-label={`Ask ${
                                          ASSISTANT_NAMES[agent.id] ||
                                          "document assistant"
                                        }`}
                                        disabled={!!chatBusy[agent.id]}
                                        required
                                      />

                                      <button
                                        className="secondary-btn"
                                        disabled={
                                          !!chatBusy[agent.id] ||
                                          !agentInputs[agent.id]?.trim()
                                        }
                                      >
                                        {chatBusy[agent.id]
                                          ? "Thinking…"
                                          : "Send"}
                                      </button>
                                    </form>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                      </div>
                    </>
                  )}
                </section>

                <section className="panel report-panel" id="report">
                  <div className="panel-heading">
                    <div>
                      <h2>Report for you</h2>
                      <p>
                        A concise summary, important findings, and source
                        documents.
                      </p>
                    </div>
                    <span aria-hidden="true" className="panel-symbol">▥</span>
                  </div>

                  <button
                    className="primary-btn"
                    type="button"
                    onClick={runReport}
                    aria-busy={busy}
                    disabled={busy || !documents.length}
                  >
                    {busy ? "Generating…" : "Generate report →"}
                  </button>

                  {htmlReport && (
                    <div className="report-output">
                      <iframe
                        className="report-frame"
                        title="Readable VeriMerge report"
                        srcDoc={htmlReport}
                      />

                      <div className="report-actions">
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={exportHtmlReport}
                        >
                          Export HTML report
                        </button>

                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={exportPdfReport}
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>
                  )}

                  {report && !htmlReport && (
                    <div className="answer-box">
                      <strong>Report data returned</strong>
                      <p>
                        The backend returned a report, but did not provide
                        an HTML report for display.
                      </p>
                    </div>
                  )}
                </section>
              </div>
              </>
            )}
          </>
        )}

        <footer className="footer">
          <span>VeriMerge · Document review</span>
          <span>
            Check important findings against the original documents.
          </span>
        </footer>
      </section>
    </main>
  );
}
