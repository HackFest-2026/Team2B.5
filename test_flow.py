"""Optional smoke test. Start the backend first, then run: python test_flow.py"""
import os
import uuid
import requests

BASE_URL = os.getenv("VERIMERGE_TEST_URL", "http://127.0.0.1:8000")


def main():
    email = f"demo-{uuid.uuid4().hex[:10]}@example.com"
    password = "DemoPassword123!"
    r = requests.get(f"{BASE_URL}/ping", timeout=5)
    r.raise_for_status()
    print("API health: OK")

    r = requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password}, timeout=10)
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = requests.post(f"{BASE_URL}/projects", json={"name": "Smoke Test Workspace"}, headers=headers, timeout=10)
    r.raise_for_status()
    project = r.json()
    print("Workspace creation: OK")

    r = requests.get(f"{BASE_URL}/projects", headers=headers, timeout=10)
    r.raise_for_status()
    assert any(p["id"] == project["id"] for p in r.json())
    print("Workspace listing: OK")

    r = requests.get(f"{BASE_URL}/projects/{project['id']}/documents", headers=headers, timeout=10)
    r.raise_for_status()
    print("Document listing: OK")
    print("Smoke test passed. Test account:", email)


if __name__ == "__main__":
    main()
