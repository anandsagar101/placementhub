"""Google Gemini integration used by PlacementHub's AI features."""

import asyncio
import os
from collections.abc import AsyncIterator, Callable
from typing import Any

from google import genai
from google.genai import errors, types


class GeminiServiceError(Exception):
    """A safe, user-facing error raised when Gemini cannot serve a request."""


class GeminiService:
    """Small adapter around the official Google Gen AI SDK.

    The client is created for each request so deployments can rotate
    ``GEMINI_API_KEY`` without restarting the application.
    """

    model = "gemini-2.5-flash"

    def __init__(self, client_factory: Callable[..., Any] = genai.Client, timeout_seconds: float = 45):
        self._client_factory = client_factory
        self._timeout_seconds = timeout_seconds

    def _create_client(self) -> Any:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise GeminiServiceError("AI service is not configured. Set GEMINI_API_KEY and try again.")
        return self._client_factory(api_key=api_key)

    @staticmethod
    def _config(system_instruction: str, json_response: bool) -> types.GenerateContentConfig:
        kwargs: dict[str, Any] = {
            "system_instruction": system_instruction,
            "temperature": 0.2,
            "max_output_tokens": 2048,
        }
        if json_response:
            kwargs["response_mime_type"] = "application/json"
        return types.GenerateContentConfig(**kwargs)

    @staticmethod
    def _response_text(response: Any) -> str:
        text = getattr(response, "text", None)
        if not isinstance(text, str) or not text.strip():
            raise GeminiServiceError("AI returned an empty response. Please try again.")
        return text

    @staticmethod
    def _service_error(exc: Exception) -> GeminiServiceError:
        if isinstance(exc, GeminiServiceError):
            return exc
        if isinstance(exc, TimeoutError):
            return GeminiServiceError("AI request timed out. Please try again.")
        if isinstance(exc, errors.APIError):
            if exc.code == 429:
                return GeminiServiceError("AI service is busy. Please try again in a moment.")
            if exc.code in {401, 403}:
                return GeminiServiceError("AI service configuration is invalid. Please contact support.")
            return GeminiServiceError("AI service is temporarily unavailable. Please try again.")
        return GeminiServiceError("AI service is temporarily unavailable. Please try again.")

    async def generate_text(self, system_instruction: str, prompt: str, *, json_response: bool = False) -> str:
        client = self._create_client()
        async_client = client.aio
        try:
            async with asyncio.timeout(self._timeout_seconds):
                response = await async_client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=self._config(system_instruction, json_response),
                )
            return self._response_text(response)
        except Exception as exc:
            import logging
            logging.exception("Gemini generate_text exception")
            raise self._service_error(exc) from exc
        finally:
            await async_client.aclose()

    async def stream_text(self, system_instruction: str, prompt: str) -> AsyncIterator[str]:
        client = self._create_client()
        async_client = client.aio
        try:
            async with asyncio.timeout(self._timeout_seconds):
                stream = await async_client.models.generate_content_stream(
                    model=self.model,
                    contents=prompt,
                    config=self._config(system_instruction, json_response=False),
                )
                async for chunk in stream:
                    text = getattr(chunk, "text", None)
                    if isinstance(text, str) and text:
                        yield text
        except Exception as exc:
            import logging
            logging.exception("Gemini stream_text exception")
            raise self._service_error(exc) from exc
        finally:
            await async_client.aclose()
