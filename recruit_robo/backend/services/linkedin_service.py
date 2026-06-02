"""
LinkedIn Job Search via RapidAPI
Host: linkedin-job-search-api.p.rapidapi.com
Endpoint: /active-jb-1h
"""
import urllib.parse
import httpx
from config import RAPIDAPI_KEY

_HOST    = "linkedin-job-search-api.p.rapidapi.com"
_BASE    = f"https://{_HOST}"
_HEADERS = {
    "x-rapidapi-key":  RAPIDAPI_KEY,
    "x-rapidapi-host": _HOST,
    "Content-Type":    "application/json",
}


def _has_key() -> bool:
    return bool(RAPIDAPI_KEY and len(RAPIDAPI_KEY) > 10)


async def search_linkedin_jobs(
    title: str,
    location: str = "",
    limit: int = 10,
) -> list[dict]:
    """
    Call the RapidAPI LinkedIn Job Search and return a list of job dicts.
    Each dict has: title, company, location, description, url, skills, posted_at
    Returns [] if RAPIDAPI_KEY is not configured.
    """
    if not _has_key():
        return []

    loc_filter = location if location else "United States OR India"
    title_enc  = urllib.parse.quote(title)
    loc_enc    = urllib.parse.quote(loc_filter)
    path       = f"/active-jb-1h?offset=0&title_filter={title_enc}&location_filter={loc_enc}&description_type=text"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(_BASE + path, headers=_HEADERS)
            resp.raise_for_status()
            raw = resp.json()
    except Exception as e:
        print(f"[LinkedIn] RapidAPI call failed: {e}")
        return []

    # The API may return a list directly or a dict with a list inside
    jobs_raw = raw if isinstance(raw, list) else raw.get("data", raw.get("jobs", []))

    results = []
    for item in jobs_raw[:limit]:
        company = ""
        if isinstance(item.get("company"), dict):
            company = item["company"].get("name", "")
        elif isinstance(item.get("company"), str):
            company = item["company"]
        else:
            company = item.get("company_name", item.get("organization", ""))

        results.append({
            "title":       item.get("title", ""),
            "company":     company,
            "location":    item.get("location", item.get("city", "")),
            "description": (item.get("description") or item.get("job_description") or "")[:1000],
            "url":         item.get("url", item.get("job_url", item.get("linkedin_url", ""))),
            "skills":      item.get("skills", []),
            "posted_at":   item.get("posted_at", item.get("date_posted", "")),
            "employment_type": item.get("employment_type", item.get("job_type", "")),
        })

    return results
