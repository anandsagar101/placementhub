"""Tests for AI Chat assistant (streaming, history, roles)."""
import os
import json
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")

CREDS = {
    "student": ("aarav@student.com", "Student@123"),
    "company": ("hr@nimbuscloud.com", "Company@123"),
    "admin": ("admin@placementhub.com", "Admin@123"),
}


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def tokens():
    return {role: _login(e, p) for role, (e, p) in CREDS.items()}


def _headers(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _stream_chat(token, message, timeout=60):
    """POST /api/chat and parse SSE stream. Returns (full_text, done_seen, chunk_count)."""
    r = requests.post(f"{BASE_URL}/api/chat",
                      headers=_headers(token),
                      json={"message": message}, stream=True, timeout=timeout)
    assert r.status_code == 200, f"chat failed {r.status_code} {r.text[:400]}"
    assert "text/event-stream" in r.headers.get("content-type", ""), r.headers
    full = ""
    done = False
    chunks = 0
    buf = ""
    for raw in r.iter_content(chunk_size=None, decode_unicode=True):
        if not raw:
            continue
        buf += raw
        while "\n\n" in buf:
            line, buf = buf.split("\n\n", 1)
            if not line.startswith("data: "):
                continue
            payload = json.loads(line[6:])
            if "delta" in payload:
                full += payload["delta"]
                chunks += 1
            if payload.get("done"):
                done = True
        if done:
            break
    return full, done, chunks


class TestChatHistory:
    def test_clear_then_history_empty(self, tokens):
        tok = tokens["student"]
        r = requests.delete(f"{BASE_URL}/api/chat/history", headers=_headers(tok))
        assert r.status_code == 200
        r = requests.get(f"{BASE_URL}/api/chat/history", headers=_headers(tok))
        assert r.status_code == 200
        assert r.json() == []

    def test_unauth_chat_blocked(self):
        r = requests.post(f"{BASE_URL}/api/chat", json={"message": "hi"})
        assert r.status_code in (401, 403)

    def test_empty_message_400(self, tokens):
        r = requests.post(f"{BASE_URL}/api/chat",
                          headers=_headers(tokens["student"]),
                          json={"message": "   "})
        assert r.status_code == 400


class TestChatStreaming:
    def test_student_stream_and_persist(self, tokens):
        tok = tokens["student"]
        # clear first
        requests.delete(f"{BASE_URL}/api/chat/history", headers=_headers(tok))
        msg = "In one short sentence, what is a resume?"
        full, done, chunks = _stream_chat(tok, msg)
        assert done, "no done event"
        assert chunks > 0, "no delta chunks received"
        assert len(full.strip()) > 0, "empty assistant text"
        # verify persisted
        time.sleep(0.5)
        h = requests.get(f"{BASE_URL}/api/chat/history", headers=_headers(tok)).json()
        assert len(h) >= 2
        assert h[-2]["role"] == "user" and h[-2]["content"] == msg
        assert h[-1]["role"] == "assistant" and h[-1]["content"].strip() != ""
        # no _id leaked
        assert "_id" not in h[-1]

    def test_recruiter_role_context(self, tokens):
        tok = tokens["company"]
        requests.delete(f"{BASE_URL}/api/chat/history", headers=_headers(tok))
        full, done, _ = _stream_chat(tok, "In one sentence, name one screening criterion for freshers.")
        assert done and len(full.strip()) > 0

    def test_admin_role_context(self, tokens):
        tok = tokens["admin"]
        requests.delete(f"{BASE_URL}/api/chat/history", headers=_headers(tok))
        full, done, _ = _stream_chat(tok, "In one sentence, one tip to improve placement rate.")
        assert done and len(full.strip()) > 0

    def test_clear_removes_history(self, tokens):
        tok = tokens["student"]
        r = requests.delete(f"{BASE_URL}/api/chat/history", headers=_headers(tok))
        assert r.status_code == 200
        h = requests.get(f"{BASE_URL}/api/chat/history", headers=_headers(tok)).json()
        assert h == []
