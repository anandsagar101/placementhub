"""Unit tests for the Gemini adapter; no network or API key is required."""

import asyncio
from types import SimpleNamespace

import pytest

from services.gemini_service import GeminiService, GeminiServiceError


class FakeModels:
    def __init__(self):
        self.calls = []

    async def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(text="generated response")

    async def generate_content_stream(self, **kwargs):
        self.calls.append(kwargs)

        async def chunks():
            yield SimpleNamespace(text="first ")
            yield SimpleNamespace(text="second")

        return chunks()


class FakeAsyncClient:
    def __init__(self):
        self.models = FakeModels()
        self.closed = False

    async def aclose(self):
        self.closed = True


class FakeClient:
    def __init__(self, **kwargs):
        self.api_key = kwargs["api_key"]
        self.aio = FakeAsyncClient()


def test_generate_json_uses_official_request_shape(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    service = GeminiService(client_factory=FakeClient)

    result = asyncio.run(service.generate_text("System", "Prompt", json_response=True))

    assert result == "generated response"


def test_streaming_yields_each_text_delta(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    service = GeminiService(client_factory=FakeClient)

    async def collect():
        return [chunk async for chunk in service.stream_text("System", "Prompt")]

    assert asyncio.run(collect()) == ["first ", "second"]


def test_missing_key_returns_safe_configuration_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    service = GeminiService(client_factory=FakeClient)

    with pytest.raises(GeminiServiceError, match="not configured"):
        asyncio.run(service.generate_text("System", "Prompt"))
