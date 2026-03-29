"""Fetch privacy policy HTML/text from common paths (best-effort, no headless browser)."""

from __future__ import annotations

import hashlib
import re
from urllib.parse import urlparse

import httpx

DEFAULT_PATHS = (
    "/privacy-policy",
    "/privacy",
    "/legal/privacy",
    "/en/privacy",
    "/policies/privacy",
    "/privacy.html",
)

USER_AGENT = "Private-C-Bot/1.0 (+https://example.com/privacy-bot) policy-audit"


def normalize_domain(domain: str) -> str:
    d = domain.strip().lower()
    if d.startswith("http://") or d.startswith("https://"):
        p = urlparse(d)
        d = p.hostname or d
    if d.startswith("www."):
        d = d[4:]
    return d.split("/")[0].split(":")[0]


def policy_hash(text: str) -> str:
    norm = re.sub(r"\s+", " ", text.strip())[:500_000]
    return hashlib.sha256(norm.encode("utf-8", errors="ignore")).hexdigest()


def html_to_text(html: str) -> str:
    # Lightweight strip — production may use trafilatura/readability
    text = re.sub(r"(?is)<script.*?>.*?</script>", " ", html)
    text = re.sub(r"(?is)<style.*?>.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def fetch_privacy_policy_text(domain: str) -> tuple[str, str]:
    """
    Returns (raw_best_effort_text, final_url_or_path_hint).
    Raises if no candidate returns usable text.
    """
    host = normalize_domain(domain)
    base = f"https://{host}"

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(20.0),
        headers={"User-Agent": USER_AGENT},
    ) as client:
        errors: list[str] = []
        for path in DEFAULT_PATHS:
            url = base + path
            try:
                r = await client.get(url)
                if r.status_code >= 400:
                    errors.append(f"{url}: {r.status_code}")
                    continue
                ctype = r.headers.get("content-type", "")
                if "html" in ctype or path.endswith(".html") or "<html" in r.text[:2000].lower():
                    text = html_to_text(r.text)
                else:
                    text = r.text.strip()
                if len(text) < 200:
                    errors.append(f"{url}: too_short")
                    continue
                return text, str(r.url)
            except Exception as e:  # noqa: BLE001
                errors.append(f"{url}: {e!s}")
                continue

        # Fallback: homepage snippet (weak signal)
        try:
            r = await client.get(base + "/")
            if r.status_code < 400:
                text = html_to_text(r.text)
                if len(text) >= 400:
                    return text[:50_000], str(r.url)
        except Exception:
            pass

    raise RuntimeError("Could not retrieve a usable privacy policy: " + "; ".join(errors[:5]))
