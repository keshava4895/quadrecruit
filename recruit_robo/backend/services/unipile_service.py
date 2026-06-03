"""
Unipile LinkedIn API service
Base URL: https://api45.unipile.com:17538
Docs:     https://developer.unipile.com

Capabilities used:
  - Hosted auth link  — let users connect their LinkedIn account
  - Account list      — check which LinkedIn accounts are connected
  - People search     — search LinkedIn profiles
  - Send message      — LinkedIn DM outreach
"""
import httpx
from config import UNIPILE_API_KEY, UNIPILE_BASE_URL, FRONTEND_URL

_HEADERS = {
    "X-API-KEY": UNIPILE_API_KEY,
    "accept":    "application/json",
    "Content-Type": "application/json",
}


async def get_accounts() -> list[dict]:
    """List all connected LinkedIn accounts."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{UNIPILE_BASE_URL}/api/v1/accounts", headers=_HEADERS)
        r.raise_for_status()
        data = r.json()
        return data.get("items", [])


async def generate_connect_link(user_name: str, user_id: str) -> str:
    """
    Generate a Unipile hosted-auth URL so the user can connect their
    LinkedIn account. Redirect back to Quad Recruit after auth.
    """
    payload = {
        "type":                 "create",
        "providers":            ["LINKEDIN"],
        "expiresOn":            "2026-12-31T23:59:59.999Z",
        "api_url":              UNIPILE_BASE_URL,
        "name":                 f"{user_id}",         # echoed back in webhook
        "success_redirect_url": f"{FRONTEND_URL}/candidates?linkedin=connected",
        "failure_redirect_url": f"{FRONTEND_URL}/candidates?linkedin=failed",
    }
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"{UNIPILE_BASE_URL}/api/v1/hosted/accounts/link",
            headers=_HEADERS, json=payload,
        )
        r.raise_for_status()
        return r.json()["url"]


async def search_people(
    account_id: str,
    query: str,
    location: str = "",
    limit: int = 10,
) -> list[dict]:
    """
    Search LinkedIn profiles via Unipile.
    Returns normalised candidate dicts.
    """
    params = {
        "account_id": account_id,
        "keywords":   query,
        "limit":      min(limit, 20),
    }
    if location:
        params["location"] = location

    async with httpx.AsyncClient(timeout=20) as c:
        # Try LinkedIn people-search endpoint
        r = await c.get(
            f"{UNIPILE_BASE_URL}/api/v1/linkedin/people-search",
            headers=_HEADERS, params=params,
        )
        if r.status_code == 404:
            # fallback path
            r = await c.get(
                f"{UNIPILE_BASE_URL}/api/v1/users",
                headers=_HEADERS, params=params,
            )
        r.raise_for_status()
        raw = r.json()

    items = raw if isinstance(raw, list) else raw.get("items", raw.get("results", []))
    return [_normalise_person(p) for p in items[:limit]]


async def get_profile(account_id: str, profile_url: str) -> dict:
    """Fetch a single LinkedIn profile by URL."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            f"{UNIPILE_BASE_URL}/api/v1/linkedin/profile",
            headers=_HEADERS,
            params={"account_id": account_id, "url": profile_url},
        )
        r.raise_for_status()
        return _normalise_person(r.json())


async def send_linkedin_message(account_id: str, profile_url: str, message: str) -> dict:
    """
    Send a LinkedIn DM to a profile.
    Creates a new chat if one doesn't exist.
    """
    payload = {
        "account_id":       account_id,
        "attendees_ids":    [profile_url],
        "text":             message,
    }
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{UNIPILE_BASE_URL}/api/v1/chats",
            headers=_HEADERS, json=payload,
        )
        r.raise_for_status()
        return r.json()


async def disconnect_account(account_id: str) -> bool:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.delete(
            f"{UNIPILE_BASE_URL}/api/v1/accounts/{account_id}",
            headers=_HEADERS,
        )
        return r.status_code in (200, 204)


# ── Normalise ─────────────────────────────────────────────────────────────────

def _normalise_person(p: dict) -> dict:
    """Map Unipile person fields → standard candidate dict."""
    name = (
        p.get("name") or
        f"{p.get('firstName', '')} {p.get('lastName', '')}".strip() or
        "Unknown"
    )
    skills_raw = p.get("skills") or []
    skills = (
        [s["name"] if isinstance(s, dict) else s for s in skills_raw]
        if isinstance(skills_raw, list) else []
    )

    headline = p.get("headline") or p.get("title") or ""
    company  = (
        p.get("currentCompany") or
        p.get("company") or
        (p.get("positions", [{}])[0].get("companyName", "") if p.get("positions") else "")
    )
    location = p.get("location") or p.get("geo", {}).get("country", "") if isinstance(p.get("geo"), dict) else p.get("location", "")
    profile_url = p.get("profileUrl") or p.get("url") or p.get("publicIdentifier", "")
    if profile_url and not profile_url.startswith("http"):
        profile_url = f"https://www.linkedin.com/in/{profile_url}"

    exp_years = 0
    if p.get("positions"):
        exp_years = len(p["positions"])   # rough proxy

    return {
        "name":             name,
        "email":            p.get("email") or "",
        "phone":            p.get("phone") or "",
        "headline":         headline,
        "current_company":  company,
        "location":         location,
        "skills":           skills,
        "experience_years": exp_years,
        "summary":          p.get("summary") or p.get("about") or "",
        "availability":     "Open to Opportunities",
        "profile_url":      profile_url,
        "match_score":      0.75,
        "portal":           "LinkedIn (Unipile)",
        "provider_id":      p.get("id") or p.get("publicIdentifier") or "",
    }
