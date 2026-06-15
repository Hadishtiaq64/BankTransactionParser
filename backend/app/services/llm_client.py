"""
Anthropic Claude API client.
Uses the official anthropic Python SDK with Claude Sonnet 4.6.
Falls back gracefully when no API key is configured.
"""

import logging
import os

logger = logging.getLogger(__name__)

_client = None
_available = False
_model = "claude-sonnet-4-6"


def _get_client():
    """Lazy-initialize the Anthropic client."""
    global _client, _available

    if _client is not None:
        return _client

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()

    if not api_key:
        logger.warning(
            "No ANTHROPIC_API_KEY configured — LLM features will use keyword fallback"
        )
        _available = False
        return None

    try:
        import anthropic

        _client = anthropic.Anthropic(api_key=api_key)
        _available = True
        logger.info("LLM Client initialized with model: %s", _model)
        return _client
    except Exception as e:
        logger.error("Failed to initialize Anthropic client: %s", e)
        _available = False
        return None


def is_available() -> bool:
    """Return True if a valid API key is configured."""
    _get_client()
    return _available


def chat(system_prompt: str, user_prompt: str) -> str:
    """
    Send a prompt to Claude and return the text response.

    Args:
        system_prompt: System-level instructions.
        user_prompt: The user message / query.

    Returns:
        The assistant's text response.

    Raises:
        RuntimeError: If the client is not configured or the API call fails.
    """
    client = _get_client()
    if client is None:
        raise RuntimeError("LLM client is not configured (missing API key)")

    try:
        message = client.messages.create(
            model=_model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        if message.content and len(message.content) > 0:
            return message.content[0].text.strip()

        logger.warning("Unexpected API response structure")
        return ""

    except Exception as e:
        logger.error("Claude API call failed: %s", e)
        raise RuntimeError(f"LLM API call failed: {e}") from e
