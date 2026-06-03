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
    Search LinkedIn profiles via Unipile using POST /linkedin/search.
    Paginates automatically using cursor until `limit` results are collected.
    Unipile returns 10 per page for classic LinkedIn search.
    """
    keywords = f"{query} {location}".strip() if location else query
    collected = []
    cursor    = None
    page_size = 10   # Unipile classic LinkedIn search always returns 10 per page

    async with httpx.AsyncClient(timeout=30) as c:
        while len(collected) < limit:
            body = {
                "api":      "classic",
                "category": "people",
                "keywords": keywords,
            }
            params = {"account_id": account_id}
            if cursor:
                params["cursor"] = cursor

            r = await c.post(
                f"{UNIPILE_BASE_URL}/api/v1/linkedin/search",
                headers=_HEADERS,
                params=params,
                json=body,
            )
            r.raise_for_status()
            raw    = r.json()
            items  = raw.get("items", [])
            cursor = raw.get("cursor")

            collected.extend(items)

            # Stop if no more pages
            if not cursor or not items or len(items) < page_size:
                break

    return [_normalise_person(p) for p in collected[:limit]]


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
    """Map Unipile LinkedIn search result → standard candidate dict."""
    name        = p.get("name") or f"{p.get('firstName','')} {p.get('lastName','')}".strip() or "Unknown"
    headline    = p.get("headline") or ""
    location    = p.get("location") or ""
    profile_url = p.get("public_profile_url") or p.get("profile_url") or ""
    provider_id = p.get("public_identifier") or p.get("id") or ""
    picture     = p.get("profile_picture_url") or ""
    premium     = p.get("premium", False)
    verified    = p.get("verified", False)
    distance    = p.get("network_distance", "")
    shared      = p.get("shared_connections_count", 0)

    # Extract company from headline e.g. "Software Engineer at Bosch"
    company = ""
    if " at " in headline:
        company = headline.split(" at ")[-1].strip()
        company = company.split(",")[0].split("|")[0].strip()

    if not profile_url and provider_id:
        profile_url = f"https://www.linkedin.com/in/{provider_id}"

    deg = distance.replace("DISTANCE_", "").replace("_", "+") if distance else ""
    summary = f"{deg}° connection" if deg else ""
    if shared:
        summary += f" · {shared} shared connection{'s' if shared > 1 else ''}"

    return {
        "name":             name,
        "email":            "",
        "phone":            "",
        "headline":         headline,
        "current_company":  company,
        "location":         location,
        "skills":           [],
        "experience_years": 0,
        "summary":          summary,
        "availability":     "Open to Opportunities",
        "profile_url":      profile_url,
        "profile_picture":  picture,
        "match_score":      0.80,
        "portal":           "LinkedIn",
        "provider_id":      provider_id,
        "premium":          premium,
        "verified":         verified,
        "network_distance": distance,
    }
