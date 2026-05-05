import json
from openai import AsyncOpenAI
from config import (
    OPENAI_API_KEY, OPENAI_MODEL,
    LINKEDIN_API_KEY, INDEED_API_KEY, NAUKRI_API_KEY,
    MONSTER_API_KEY, GLASSDOOR_API_KEY,
)

PORTAL_LABELS = {
    "linkedin":  "LinkedIn",
    "indeed":    "Indeed",
    "naukri":    "Naukri",
    "monster":   "Monster",
    "glassdoor": "Glassdoor",
}

_PORTAL_KEYS = {
    "linkedin":  LINKEDIN_API_KEY,
    "indeed":    INDEED_API_KEY,
    "naukri":    NAUKRI_API_KEY,
    "monster":   MONSTER_API_KEY,
    "glassdoor": GLASSDOOR_API_KEY,
}


async def search_portal_candidates(
    query: str,
    portal: str,
    location: str = None,
    experience_min: int = 0,
    experience_max: int = 20,
    limit: int = 10,
) -> list[dict]:
    """
    Search candidates from an external job portal.
    Routes to the real portal API when an API key is configured;
    falls back to AI-generated demo profiles otherwise.
    """
    portal = portal.lower()
    api_key = _PORTAL_KEYS.get(portal, "")

    if api_key:
        # Real portal API handlers — plug in when keys are available
        if portal == "linkedin":
            return await _search_linkedin(query, location, experience_min, experience_max, limit, api_key)
        if portal == "indeed":
            return await _search_indeed(query, location, experience_min, experience_max, limit, api_key)
        if portal == "naukri":
            return await _search_naukri(query, location, experience_min, experience_max, limit, api_key)

    # No API key configured — return AI-generated demo candidates
    portal_label = PORTAL_LABELS.get(portal, portal.capitalize())
    return await _generate_ai_candidates(query, portal_label, location, experience_min, experience_max, limit)


# ── Real portal stubs (fill in when API contracts are ready) ──────────────────

async def _search_linkedin(query, location, exp_min, exp_max, limit, api_key):
    # LinkedIn Talent Solutions API
    # https://developer.linkedin.com/product-catalog/talent
    raise NotImplementedError("LinkedIn API key set but integration not yet wired")


async def _search_indeed(query, location, exp_min, exp_max, limit, api_key):
    # Indeed Publisher API
    # https://ads.indeed.com/jobroll/xmlfeed
    raise NotImplementedError("Indeed API key set but integration not yet wired")


async def _search_naukri(query, location, exp_min, exp_max, limit, api_key):
    # Naukri B2B Partner API
    raise NotImplementedError("Naukri API key set but integration not yet wired")


# ── AI demo mode ──────────────────────────────────────────────────────────────

async def _generate_ai_candidates(
    query: str,
    portal_label: str,
    location: str,
    exp_min: int,
    exp_max: int,
    limit: int,
) -> list[dict]:
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    location_str = location if location else "Any location"
    exp_str = f"{exp_min}–{exp_max} years"
    portal_domain = portal_label.lower().replace(" ", "")

    prompt = f"""You are a talent database. Generate {min(limit, 12)} realistic candidate profiles \
for a recruiter searching on {portal_label}.

Search Requirements: {query}
Location Preference: {location_str}
Experience Range: {exp_str}

Return a JSON object with a "candidates" array. Each candidate must have exactly these fields:
- name            (realistic full name; match region if location is specific)
- headline        (current role + company, e.g. "Senior React Developer at Infosys")
- current_company (company name only)
- location        (city, country)
- skills          (array of 6-10 relevant skills, mix of technical and soft)
- experience_years (integer within the exp range)
- summary         (2-3 sentences tailored to the search requirements)
- availability    (one of: "Immediately Available", "2 Weeks Notice", "1 Month Notice", "2 Months Notice", "3 Months Notice")
- profile_url     (realistic URL, e.g. "https://www.{portal_domain}.com/in/john-doe-abc123")
- match_score     (float 0.70–0.99; higher = more relevant)

Make candidates diverse in background, seniority, and company tier. Return ONLY valid JSON."""

    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=3500,
        response_format={"type": "json_object"},
    )

    data = json.loads(response.choices[0].message.content)
    candidates = data.get("candidates", [])

    for c in candidates:
        c["portal"] = portal_label
        c.setdefault("match_score", 0.75)

    candidates.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return candidates
