"""
Naukri CV Scraper via RapidAPI (naukri-cv-scraper.p.rapidapi.com)

Requires a valid Naukri Resdex session curl command obtained from the
user's browser DevTools while logged into resdex.naukri.com.

Flow:
  1. User logs into resdex.naukri.com → searches for candidates
  2. DevTools → Network → copy the search request as cURL
  3. Paste into Quad Recruit settings — stored in DB
  4. This service injects the curl command into RapidAPI scraper
  5. Returns structured candidate profiles
"""
import json
import httpx

_RAPIDAPI_HOST = "naukri-cv-scraper.p.rapidapi.com"
_SCRAPE_URL    = f"https://{_RAPIDAPI_HOST}/api/scrape"


async def scrape_naukri_candidates(curl_command: str, max_results: int = 10, rapidapi_key: str = "") -> list[dict]:
    """
    Send the Naukri Resdex curl command to the scraper API.
    Returns a list of normalised candidate dicts.
    """
    if not rapidapi_key:
        raise RuntimeError("Naukri RapidAPI key not configured. Go to Account settings → Portals → Naukri.")

    headers = {
        "x-rapidapi-key":  rapidapi_key,
        "x-rapidapi-host": _RAPIDAPI_HOST,
        "Content-Type":    "application/json",
    }
    payload = {
        "curlCommand": curl_command,
        "maxResults":  max_results,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(_SCRAPE_URL, headers=headers, json=payload)
            resp.raise_for_status()
            raw = resp.json()
    except httpx.HTTPStatusError as e:
        print(f"[Naukri] API error {e.response.status_code}: {e.response.text[:300]}")
        raise
    except Exception as e:
        print(f"[Naukri] Request failed: {e}")
        raise

    # Normalise — the scraper may return a list or a wrapped object
    candidates_raw = []
    if isinstance(raw, list):
        candidates_raw = raw
    elif isinstance(raw, dict):
        candidates_raw = (
            raw.get("candidates") or
            raw.get("results")    or
            raw.get("data")       or
            raw.get("cvs")        or
            []
        )

    return [_normalise(c) for c in candidates_raw]


def _normalise(c: dict) -> dict:
    """Map raw scraper fields → standard candidate dict used across the app."""
    # Skills may come as a string or list
    skills_raw = c.get("skills") or c.get("keySkills") or c.get("key_skills") or []
    if isinstance(skills_raw, str):
        skills = [s.strip() for s in skills_raw.split(",") if s.strip()]
    else:
        skills = list(skills_raw)

    # Experience — may be a string like "5 years" or an integer
    exp_raw = c.get("experience") or c.get("totalExperience") or c.get("total_experience") or 0
    if isinstance(exp_raw, str):
        import re
        m = re.search(r"(\d+)", exp_raw)
        exp_years = int(m.group(1)) if m else 0
    else:
        exp_years = int(exp_raw) if exp_raw else 0

    name     = c.get("name") or c.get("candidateName") or c.get("fullName") or "Unknown"
    email    = c.get("email") or c.get("emailId") or ""
    phone    = c.get("phone") or c.get("mobile") or c.get("contactNumber") or ""
    location = c.get("location") or c.get("currentLocation") or c.get("city") or ""
    company  = c.get("currentCompany") or c.get("company") or c.get("employer") or ""
    title    = c.get("currentDesignation") or c.get("designation") or c.get("title") or ""
    summary  = c.get("summary") or c.get("profile") or c.get("objective") or ""
    resume   = c.get("resumeUrl") or c.get("resume_url") or c.get("profileUrl") or ""

    return {
        "name":            name,
        "email":           email,
        "phone":           phone,
        "headline":        f"{title} at {company}" if title and company else (title or company),
        "current_company": company,
        "location":        location,
        "skills":          skills,
        "experience_years": exp_years,
        "experience":      exp_years,
        "summary":         summary[:500] if summary else "",
        "availability":    c.get("availability") or "Open to Opportunities",
        "profile_url":     resume or c.get("naukri_profile") or "",
        "match_score":     0.75,
        "portal":          "Naukri",
        "raw":             c,          # preserve original for debugging
    }
