"""Utilities required by the serialized sklearn pipeline."""

from __future__ import annotations

import html
import re


TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """Normalize raw review text while preserving sentiment-bearing words."""
    text = html.unescape(str(text))
    text = TAG_RE.sub(" ", text)
    text = WHITESPACE_RE.sub(" ", text).strip()
    return text
