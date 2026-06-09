"""
Zoho Recruit API service for candidate searching.

OAuth flow (one-time setup):
  1. Visit GET /zoho/auth  → redirects to Zoho consent screen
  2. Zoho calls GET /zoho/oauth/callback?code=...  → stores refresh token in DB
  3. All subsequent searches use the stored refresh token automatically

Token priority: DB (set via OAuth callback) → env var ZOHO_REFRESH_TOKEN
"""
import httpx
from config import (
    ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN,
    ZOHO_BASE_URL, ZOHO_ACCOUNTS_URL,
)


async def _get_access_token(refresh_token: str = None) -> str:
    token = refresh_token or ZOHO_REFRESH_TOKEN
    if not token:
        raise ValueError(
            "No Zoho refresh token available. "
            "Complete OAuth setup at GET /zoho/auth or set ZOHO_REFRESH_TOKEN in .env"
        )
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{ZOHO_ACCOUNTS_URL}/oauth/v2/token", data={
            "grant_type":    "refresh_token",
            "client_id":     ZOHO_CLIENT_ID,
            "client_secret": ZOHO_CLIENT_SECRET,
            "refresh_token": token,
        })
        r.raise_for_status()
        data = r.json()
        if "access_token" not in data:
            raise ValueError(f"Zoho token refresh failed: {data}")
        return data["access_token"]


def _build_criteria(query: str, location: str = None, exp_min: int = 0, exp_max: int = 20) -> str:
    """Build Zoho search criteria string from free-text query + filters."""
    stop_words = {"and", "or", "with", "for", "in", "at", "the", "a", "an"}
    keywords = [w for w in query.lower().split() if len(w) > 2 and w not in stop_words]

    parts = []

    if keywords:
        # Search skill set and job title for the primary keyword
        kw = keywords[0]
        parts.append(f"((Skill_Set:contains:{kw})or(Current_Job_Title:contains:{kw}))")

    if exp_min > 0:
        parts.append(f"(Experience_in_Years:greater_equal:{exp_min})")
    if exp_max < 20:
        parts.append(f"(Experience_in_Years:less_equal:{exp_max})")

    if location:
        city = location.split(",")[0].strip()
        parts.append(f"(City:contains:{city})")

    return "and".join(parts) if parts else "(Candidate_Status:equals:Active)"


def _map_candidate(record: dict, query: str) -> dict:
    """Map a Zoho Recruit candidate record to the project's standard candidate dict."""
    first = record.get("First_Name", "") or ""
    last  = record.get("Last_Name", "") or ""
    name  = record.get("Full_Name") or f"{first} {last}".strip() or "Unknown"

    city    = record.get("City", "") or ""
    state   = record.get("State", "") or ""
    country = record.get("Country", "") or ""
    location = ", ".join(p for p in [city, state, country] if p) or "Not specified"

    skill_set = record.get("Skill_Set", "") or ""
    if isinstance(skill_set, list):
        skills = [s.strip() for s in skill_set if s]
    else:
        skills = [s.strip() for s in skill_set.split(",") if s.strip()]

    try:
        exp_years = int(float(record.get("Experience_in_Years") or 0))
    except (TypeError, ValueError):
        exp_years = 0

    current_title   = record.get("Current_Job_Title", "") or ""
    current_company = record.get("Current_Employer", "") or "Not specified"
    headline = f"{current_title} at {current_company}" if current_title else current_company

    summary = (
        record.get("Candidate_Summary")
        or record.get("Summary")
        or f"{name} has {exp_years} years of experience. "
           f"Skills: {', '.join(skills[:5]) if skills else query}."
    )

    candidate_id = record.get("id", "")
    profile_url = (
        record.get("Profile_URL")
        or f"{ZOHO_BASE_URL}/recruit/EntityInfo.do?module=Candidates&id={candidate_id}"
    )

    availability_map = {
        "Active":    "Immediately Available",
        "Available": "Immediately Available",
        "Contacted": "2 Weeks Notice",
        "Placed":    "3 Months Notice",
    }
    status = record.get("Candidate_Status", "Active")
    availability = availability_map.get(status, "Open to Opportunities")

    query_terms = set(query.lower().split())
    skill_terms = set(s.lower() for s in skills)
    overlap     = len(query_terms & skill_terms)
    score       = round(min(0.65 + min(overlap * 0.05, 0.30), 0.99), 2)

    return {
        "name":             name,
        "headline":         headline,
        "current_company":  current_company,
        "location":         location,
        "skills":           skills,
        "experience_years": exp_years,
        "summary":          summary,
        "availability":     availability,
        "profile_url":      profile_url,
        "match_score":      score,
        "portal":           "Zoho Recruit",
        "email":            record.get("Email", "") or "",
    }


async def search_candidates(
    query: str,
    location: str = None,
    exp_min: int = 0,
    exp_max: int = 20,
    limit: int = 10,
    refresh_token: str = None,
) -> list[dict]:
    access_token = await _get_access_token(refresh_token)
    criteria     = _build_criteria(query, location, exp_min, exp_max)

    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    params  = {
        "criteria": criteria,
        "per_page": min(limit, 200),
        "fields": (
            "Full_Name,First_Name,Last_Name,Email,Mobile,"
            "Current_Job_Title,Current_Employer,"
            "City,State,Country,"
            "Skill_Set,Experience_in_Years,"
            "Candidate_Summary,Candidate_Status,Profile_URL,id"
        ),
    }

    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(
            f"{ZOHO_BASE_URL}/recruit/v2/Candidates/search",
            headers=headers,
            params=params,
        )
        if r.status_code == 204:
            return []
        r.raise_for_status()
        records = r.json().get("data", [])

    candidates = [_map_candidate(rec, query) for rec in records]
    candidates.sort(key=lambda x: x["match_score"], reverse=True)
    return candidates[:limit]


async def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange an OAuth authorization code for access + refresh tokens (one-time setup)."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{ZOHO_ACCOUNTS_URL}/oauth/v2/token", data={
            "grant_type":    "authorization_code",
            "client_id":     ZOHO_CLIENT_ID,
            "client_secret": ZOHO_CLIENT_SECRET,
            "redirect_uri":  redirect_uri,
            "code":          code,
        })
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            raise ValueError(f"Zoho token exchange failed: {data['error']}")
        return data
