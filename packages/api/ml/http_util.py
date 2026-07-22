"""Shared polite HTTP helpers for scrapers."""

from __future__ import annotations

import time
from typing import Optional

import requests

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_TIMEOUT = 20
DEFAULT_RETRIES = 3


def session(user_agent: str = DEFAULT_UA) -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {
            "User-Agent": user_agent,
            "Accept": "text/html,application/json,*/*",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    return s


def get(
    url: str,
    *,
    sess: Optional[requests.Session] = None,
    timeout: int = DEFAULT_TIMEOUT,
    retries: int = DEFAULT_RETRIES,
    headers: Optional[dict] = None,
    params: Optional[dict] = None,
) -> requests.Response:
    s = sess or session()
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            resp = s.get(url, timeout=timeout, headers=headers, params=params)
            resp.raise_for_status()
            return resp
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f"GET failed after {retries} tries: {url} ({last_err})")
