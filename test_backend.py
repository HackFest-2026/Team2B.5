import os
import tempfile
import shutil
from fastapi.testclient import TestClient

# Use a separate test database to avoid affecting production data
os.environ["DATABASE_URL"] = "sqlite:///./test_verimerge.db"

from backend.main import app

client = TestClient(app)

def test_full_workflow():
    # Register a user
    email = "test_user@example.com"
    password = "StrongPass123!"
    resp = client.post("/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a project
    resp = client.post("/projects", json={"name": "Test Project"}, headers=headers)
    assert resp.status_code == 200
    project = resp.json()
    project_id = project["id"]

    # Create a temporary text document with known facts
    temp_dir = tempfile.mkdtemp()
    txt_path = os.path.join(temp_dir, "sample.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("The deployment is scheduled for 15 October 2026. Security review must happen before deployment. Internal test server only.")

    # Upload the document
    with open(txt_path, "rb") as f:
        files = {"file": ("sample.txt", f)}
        resp = client.post(f"/projects/{project_id}/documents", files=files, headers=headers)
    assert resp.status_code == 200
    doc = resp.json()
    assert doc["status"] == "READY"

    # Keyword search – expect the deployment term to be found
    resp = client.get(f"/projects/{project_id}/search?q=deployment", headers=headers)
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert any("deployment" in r["snippet"].lower() for r in results)

    # Ask a question – should return an answer with citations
    question = "When is the deployment scheduled?"
    resp = client.post(f"/projects/{project_id}/qa", json={"question": question}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data and "citations" in data
    assert len(data["citations"]) > 0

    # Verify a claim that is supported by the document
    claim = "Security review must happen before deployment"
    resp = client.post(f"/orchestrator/{project_id}/verify", json={"claim": claim}, headers=headers)
    assert resp.status_code == 200
    verification = resp.json()
    assert verification["status"] == "supported"
    assert verification["supported"] is True

    # Generate the workspace report (JSON + HTML)
    resp = client.post(f"/orchestrator/{project_id}/report", json={}, headers=headers)
    assert resp.status_code == 200
    report = resp.json()
    assert "html_report" in report
    assert "deployment" in report["html_report"].lower()

    # Download PDF version of the report
    resp = client.get(f"/projects/{project_id}/report/pdf", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("content-type") == "application/pdf"

    # Cleanup temporary files and test database
    shutil.rmtree(temp_dir)
    os.remove("test_verimerge.db")

if __name__ == "__main__":
    test_full_workflow()
