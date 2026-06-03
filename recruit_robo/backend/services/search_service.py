import json
from openai import AsyncAzureOpenAI
from config import (
    AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, OPENAI_MODEL,
    LINKEDIN_API_KEY, INDEED_API_KEY, NAUKRI_API_KEY,
    MONSTER_API_KEY, GLASSDOOR_API_KEY, GITHUB_TOKEN,
)

PORTAL_LABELS = {
    "linkedin":  "LinkedIn",
    "indeed":    "Indeed",
    "naukri":    "Naukri",
    "monster":   "Monster",
    "glassdoor": "Glassdoor",
    "github":    "GitHub",
}

_PORTAL_KEYS = {
    "linkedin":  LINKEDIN_API_KEY,
    "indeed":    INDEED_API_KEY,
    "naukri":    NAUKRI_API_KEY,
    "monster":   MONSTER_API_KEY,
    "glassdoor": GLASSDOOR_API_KEY,
    "github":    GITHUB_TOKEN,
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
        if portal == "github":
            return await _search_github(query, location, experience_min, experience_max, limit, api_key)
        if portal == "linkedin":
            return await _search_linkedin(query, location, experience_min, experience_max, limit, api_key)
        if portal == "indeed":
            return await _search_indeed(query, location, experience_min, experience_max, limit, api_key)
        if portal == "naukri":
            return await _search_naukri(query, location, experience_min, experience_max, limit, api_key)

    # No API key configured — return AI-generated demo candidates
    portal_label = PORTAL_LABELS.get(portal, portal.capitalize())
    return await _generate_ai_candidates(query, portal_label, location, experience_min, experience_max, limit)


# ── GitHub developer search ───────────────────────────────────────────────────

async def _search_github(query, location, exp_min, exp_max, limit, token):
    import httpx, re
    from datetime import datetime, timezone

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    # Build GitHub search query from free-text input
    keywords = [w for w in re.sub(r'[^\w\s]', ' ', query).split() if len(w) > 2][:4]
    gh_q = "+".join(keywords)
    if location:
        city = location.split(",")[0].strip()
        gh_q += f"+location:{city}"

    async with httpx.AsyncClient(timeout=20) as client:
        search_r = await client.get(
            f"https://api.github.com/search/users?q={gh_q}&per_page={min(limit, 10)}&sort=followers",
            headers=headers,
        )
        items = search_r.json().get("items", [])

        candidates = []
        for user in items[:limit]:
            prof_r  = await client.get(user["url"], headers=headers)
            prof    = prof_r.json()
            repos_r = await client.get(
                f"https://api.github.com/users/{user['login']}/repos?sort=stars&per_page=8",
                headers=headers,
            )
            repos = repos_r.json() if repos_r.status_code == 200 else []

            # Skills from repo languages (unique, ordered by frequency)
            langs = list(dict.fromkeys(r["language"] for r in repos if r.get("language")))[:8]

            # Estimate experience from account creation date
            created_str = prof.get("created_at", "2020-01-01T00:00:00Z").replace("Z", "+00:00")
            created     = datetime.fromisoformat(created_str)
            exp_years   = max(1, (datetime.now(timezone.utc) - created).days // 365)

            # Match score: weighted blend of followers and repo stars
            followers   = min(prof.get("followers", 0), 2000)
            total_stars = sum(r.get("stargazers_count", 0) for r in repos)
            score       = round(min(0.99, 0.65 + (followers / 2000) * 0.20 + min(total_stars, 1000) / 1000 * 0.14), 2)

            top_repo_descs = [r["description"] for r in repos[:3] if r.get("description")]
            summary = (prof.get("bio") or "")
            if top_repo_descs:
                summary += (" | " if summary else "") + " | ".join(top_repo_descs)

            candidates.append({
                "name":             prof.get("name") or prof["login"],
                "headline":         prof.get("bio") or f"Developer · {prof.get('public_repos', 0)} public repositories",
                "current_company":  (prof.get("company") or "").strip().lstrip("@") or "Independent",
                "location":         prof.get("location") or location or "Not specified",
                "skills":           langs or ["Git", "Open Source"],
                "experience_years": exp_years,
                "summary":          summary or f"GitHub developer with {prof.get('public_repos', 0)} repos and {prof.get('followers', 0)} followers.",
                "availability":     "Open to opportunities",
                "profile_url":      prof["html_url"],
                "match_score":      score,
                "portal":           "GitHub",
                "email":            prof.get("email") or "",
            })

    candidates.sort(key=lambda x: x["match_score"], reverse=True)
    return candidates


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
    client = AsyncAzureOpenAI(
        api_key=AZURE_OPENAI_API_KEY,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_version=AZURE_OPENAI_API_VERSION,
    )

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
