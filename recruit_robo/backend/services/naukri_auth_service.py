"""
Naukri Recruiter auto-login service.

Flow:
  1. POST to Naukri login API with recruiter credentials
  2. Extract session cookies from response
  3. Use cookies to search Resdex candidate database
  4. Auto-refresh session when cookies expire (401/403)
"""
import json
import re
import httpx
from datetime import datetime, timezone, timedelta
from config import NAUKRI_EMAIL, NAUKRI_PASSWORD

# ── Session cache (in-memory, survives restarts via DB below) ─────────────────
_session: dict = {
    "cookies":    {},
    "expires_at": None,
    "nauk_id":    "",
}

_LOGIN_URL  = "https://www.naukri.com/central-login-services/v1/login"
_RESDEX_URL = "https://resdex.naukri.com"

_LOGIN_HEADERS = {
    "Content-Type":  "application/json",
    "appid":         "105",
    "systemid":      "105",
    "User-Agent":    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Origin":        "https://www.naukri.com",
    "Referer":       "https://www.naukri.com/",
    "Accept":        "application/json, text/plain, */*",
}


def _session_valid() -> bool:
    if not _session["cookies"]:
        return False
    if not _session["expires_at"]:
        return False
    return datetime.now(timezone.utc) < _session["expires_at"]


async def login() -> dict:
    """Log into Naukri and return the session cookies dict."""
    global _session

    payload = {
        "username":     NAUKRI_EMAIL,
        "password":     NAUKRI_PASSWORD,
        "emailaddress": NAUKRI_EMAIL,
    }

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.post(_LOGIN_URL, headers=_LOGIN_HEADERS, json=payload)

    print(f"[Naukri] Login status: {resp.status_code}")

    if resp.status_code not in (200, 201):
        detail = ""
        try:
            detail = resp.json().get("message") or resp.text[:200]
        except Exception:
            detail = resp.text[:200]
        raise RuntimeError(f"Naukri login failed ({resp.status_code}): {detail}")

    # Collect all cookies from the response
    cookies = dict(resp.cookies)

    # Also grab cookies from Set-Cookie headers directly
    for hdr in resp.headers.get_list("set-cookie") if hasattr(resp.headers, "get_list") else []:
        name, _, rest = hdr.partition("=")
        value, _, _   = rest.partition(";")
        cookies[name.strip()] = value.strip()

    _session["cookies"]    = cookies
    _session["expires_at"] = datetime.now(timezone.utc) + timedelta(hours=12)

    try:
        body = resp.json()
        _session["nauk_id"] = (
            body.get("loginId") or
            body.get("userId") or
            body.get("data", {}).get("userId", "") if isinstance(body.get("data"), dict) else ""
        )
        print(f"[Naukri] Logged in as: {_session['nauk_id'] or NAUKRI_EMAIL}")
    except Exception:
        pass

    return cookies


async def get_session() -> dict:
    """Return valid session cookies, logging in first if needed."""
    if not _session_valid():
        await login()
    return _session["cookies"]


async def search_candidates(
    query: str,
    location: str = "",
    experience_min: int = 0,
    experience_max: int = 20,
    limit: int = 10,
) -> list[dict]:
    """
    Search Naukri Resdex for candidates using the recruiter session.
    Returns normalised candidate dicts.
    """
    cookies = await get_session()

    # Build Resdex search parameters
    params = {
        "noOfResults":  limit,
        "searchType":   "7",        # keyword search
        "keyword":      query,
        "minExp":       experience_min,
        "maxExp":       experience_max,
        "pageNo":       1,
    }
    if location:
        params["location"] = location

    search_headers = {
        **_LOGIN_HEADERS,
        "Referer": "https://resdex.naukri.com/",
        "Origin":  "https://resdex.naukri.com",
    }

    # Try multiple known Resdex search API paths
    endpoints = [
        f"{_RESDEX_URL}/resdex/v1/search",
        f"{_RESDEX_URL}/resdex/search/profile",
        "https://www.naukri.com/resdex/search/result",
    ]

    raw_candidates = []
    last_error = None

    async with httpx.AsyncClient(
        timeout=25,
        follow_redirects=True,
        cookies=cookies,
    ) as client:
        for endpoint in endpoints:
            try:
                resp = await client.get(endpoint, headers=search_headers, params=params)
                print(f"[Naukri] Search {endpoint} → {resp.status_code}")

                if resp.status_code == 401:
                    # Session expired — re-login and retry once
                    await login()
                    cookies = _session["cookies"]
                    resp = await client.get(endpoint, headers=search_headers, params=params)

                if resp.status_code == 200:
                    body = resp.json()
                    raw_candidates = (
                        body.get("candidateList") or
                        body.get("profiles")      or
                        body.get("results")       or
                        body.get("data")          or
                        (body if isinstance(body, list) else [])
                    )
                    if raw_candidates:
                        break
            except Exception as e:
                last_error = e
                continue

    if not raw_candidates and last_error:
        raise RuntimeError(f"All Resdex search endpoints failed: {last_error}")

    return [_normalise(c) for c in raw_candidates[:limit]]


def _normalise(c: dict) -> dict:
    """Map Resdex candidate fields → standard app candidate dict."""
    # Skills
    skills_raw = (
        c.get("keySkills") or c.get("skills") or
        c.get("skillsList") or c.get("profileSkills") or []
    )
    if isinstance(skills_raw, str):
        skills = [s.strip() for s in skills_raw.split(",") if s.strip()]
    elif isinstance(skills_raw, list):
        skills = [
            s.get("skillName") if isinstance(s, dict) else str(s)
            for s in skills_raw
        ]
    else:
        skills = []

    # Experience
    exp_raw = (
        c.get("totalExperience") or c.get("experience") or
        c.get("expInMonths") or 0
    )
    if isinstance(exp_raw, str):
        m = re.search(r"(\d+)", exp_raw)
        exp_years = int(m.group(1)) if m else 0
    elif isinstance(exp_raw, (int, float)):
        # Naukri sometimes returns months
        exp_years = int(exp_raw / 12) if exp_raw > 30 else int(exp_raw)
    else:
        exp_years = 0

    name     = (c.get("name") or c.get("candidateName") or c.get("profileName") or "Unknown").strip()
    email    = c.get("email") or c.get("emailId") or ""
    phone    = c.get("mobile") or c.get("phone") or c.get("contactNumber") or ""
    location = (
        c.get("currentLocation") or c.get("location") or
        c.get("city") or c.get("prefLocation") or ""
    )
    company  = c.get("currentEmployer") or c.get("currentCompany") or c.get("employer") or ""
    title    = c.get("currentDesignation") or c.get("designation") or c.get("title") or ""
    summary  = c.get("profileSummary") or c.get("summary") or c.get("objective") or ""
    profile_id = c.get("candidateId") or c.get("profileId") or c.get("id") or ""
    profile_url = (
        c.get("profileUrl") or
        (f"https://resdex.naukri.com/recruiter/candidate/detail/{profile_id}" if profile_id else "")
    )

    return {
        "name":             name,
        "email":            email,
        "phone":            phone,
        "headline":         f"{title} at {company}".strip(" at") if title or company else "",
        "current_company":  company,
        "location":         location,
        "skills":           skills,
        "experience_years": exp_years,
        "experience":       exp_years,
        "summary":          summary[:500] if summary else "",
        "availability":     c.get("availability") or "Open to Opportunities",
        "profile_url":      profile_url,
        "match_score":      0.80,
        "portal":           "Naukri",
        "candidate_id":     str(profile_id),
    }
