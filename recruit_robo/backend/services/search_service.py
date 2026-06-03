"""
Candidate search service.

AI tier priority:
  1. Azure OpenAI  — if AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT are set
  2. Standard OpenAI — if OPENAI_API_KEY is set (and not the placeholder "sk-...")
  3. Pure-Python mock  — always works, no API key required
"""
import json
import random
import hashlib
from config import (
    AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, OPENAI_MODEL,
    OPENAI_API_KEY,
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

# ── Tier detection ────────────────────────────────────────────────────────────

def _use_azure() -> bool:
    return bool(AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT)

def _use_openai() -> bool:
    key = OPENAI_API_KEY or ""
    return bool(key and not key.startswith("sk-...") and len(key) > 10)


# ── Public entry point ────────────────────────────────────────────────────────

async def search_portal_candidates(
    query: str,
    portal: str,
    location: str = None,
    experience_min: int = 0,
    experience_max: int = 20,
    limit: int = 10,
) -> list[dict]:
    portal = portal.lower()
    api_key = _PORTAL_KEYS.get(portal, "")

    # LinkedIn uses Unipile — always route through regardless of api_key
    if portal == "linkedin":
        return await _search_linkedin(query, location, experience_min, experience_max, limit, api_key)

    # Naukri uses session-based scraper — always route through regardless of api_key
    if portal == "naukri":
        return await _search_naukri(query, location, experience_min, experience_max, limit, api_key)

    if api_key:
        if portal == "github":
            return await _search_github(query, location, experience_min, experience_max, limit, api_key)
        if portal == "indeed":
            return await _search_indeed(query, location, experience_min, experience_max, limit, api_key)

    portal_label = PORTAL_LABELS.get(portal, portal.capitalize())
    return await _generate_candidates(query, portal_label, location, experience_min, experience_max, limit)


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


# ── Real portal stubs ─────────────────────────────────────────────────────────

async def _search_linkedin(query, location, exp_min, exp_max, limit, api_key):
    """Use Unipile with the first connected LinkedIn account."""
    try:
        from services.unipile_service import get_accounts, search_people
        accounts = await get_accounts()
        if not accounts:
            print("[LinkedIn] No account connected via Unipile — falling back to mock")
            return await _generate_candidates(query, "LinkedIn", location, exp_min, exp_max, limit)
        account_id = accounts[0]["id"]
        candidates = await search_people(account_id=account_id, query=query, location=location or "", limit=limit)
        return candidates if candidates else await _generate_candidates(query, "LinkedIn", location, exp_min, exp_max, limit)
    except Exception as e:
        print(f"[LinkedIn] Unipile search error: {e}")
        return await _generate_candidates(query, "LinkedIn", location, exp_min, exp_max, limit)

async def _search_indeed(query, location, exp_min, exp_max, limit, api_key):
    raise NotImplementedError("Indeed API key set but integration not yet wired")

async def _search_naukri(query, location, exp_min, exp_max, limit, api_key):
    from config import NAUKRI_EMAIL

    # Tier 1: Browser-based login (bypasses Akamai bot protection)
    if NAUKRI_EMAIL:
        try:
            from services.naukri_browser_service import search_candidates as browser_search
            candidates = await browser_search(
                query=query, location=location or "",
                experience_min=exp_min, experience_max=exp_max, limit=limit,
            )
            if candidates:
                return candidates
        except Exception as e:
            print(f"[Naukri] Browser search error: {e} — trying curl fallback")

    # Tier 2: curl-based scraper (manual session paste)
    try:
        from services.naukri_service import scrape_naukri_candidates
        from database import get_db
        doc = await get_db()["settings"].find_one({"key": "naukri_session"})
        curl = doc.get("curl_command", "") if doc else ""
        if curl:
            candidates = await scrape_naukri_candidates(curl_command=curl, max_results=limit)
            if candidates:
                return candidates
    except Exception as e:
        print(f"[Naukri] Curl scraper error: {e}")

    print("[Naukri] No real data — using mock")
    return await _generate_candidates(query, "Naukri", location, exp_min, exp_max, limit)


# ── Dispatcher: AI or mock ────────────────────────────────────────────────────

async def _generate_candidates(query, portal_label, location, exp_min, exp_max, limit):
    if _use_azure():
        try:
            return await _generate_ai_candidates_azure(query, portal_label, location, exp_min, exp_max, limit)
        except Exception as e:
            print(f"[Search] Azure OpenAI failed ({e}), trying standard OpenAI…")

    if _use_openai():
        try:
            return await _generate_ai_candidates_openai(query, portal_label, location, exp_min, exp_max, limit)
        except Exception as e:
            print(f"[Search] Standard OpenAI failed ({e}), falling back to mock data…")

    print("[Search] No AI credentials configured — using mock candidate generator")
    return _generate_mock_candidates(query, portal_label, location, exp_min, exp_max, limit)


# ── Tier 1: Azure OpenAI ──────────────────────────────────────────────────────

async def _generate_ai_candidates_azure(query, portal_label, location, exp_min, exp_max, limit):
    from openai import AsyncAzureOpenAI
    client = AsyncAzureOpenAI(
        api_key=AZURE_OPENAI_API_KEY,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_version=AZURE_OPENAI_API_VERSION,
    )
    return await _call_openai_client(client, query, portal_label, location, exp_min, exp_max, limit)


# ── Tier 2: Standard OpenAI ───────────────────────────────────────────────────

async def _generate_ai_candidates_openai(query, portal_label, location, exp_min, exp_max, limit):
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    return await _call_openai_client(client, query, portal_label, location, exp_min, exp_max, limit)


async def _call_openai_client(client, query, portal_label, location, exp_min, exp_max, limit):
    location_str = location if location else "Any location"
    exp_str = f"{exp_min}–{exp_max} years"
    portal_domain = portal_label.lower().replace(" ", "")

    prompt = f"""You are a talent database. Generate {min(limit, 50)} realistic candidate profiles \
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
        max_tokens=min(3500 + (limit * 120), 16000),
        response_format={"type": "json_object"},
    )

    data = json.loads(response.choices[0].message.content)
    candidates = data.get("candidates", [])
    for c in candidates:
        c["portal"] = portal_label
        c.setdefault("match_score", 0.75)
    candidates.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    return candidates


# ── Tier 3: Pure-Python mock (no API key needed) ──────────────────────────────

_FIRST_NAMES = [
    "Aarav", "Priya", "Rahul", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya",
    "Ravi", "Meera", "Kiran", "Divya", "Suresh", "Pooja", "Amit", "Shreya",
    "Nikhil", "Isha", "Rohan", "Neha", "Sanjay", "Ritu", "Manoj", "Swati",
]
_LAST_NAMES = [
    "Sharma", "Patel", "Kumar", "Singh", "Reddy", "Nair", "Gupta", "Iyer",
    "Verma", "Shah", "Mehta", "Joshi", "Rao", "Mishra", "Agarwal", "Bose",
]
_COMPANIES = [
    "Infosys", "TCS", "Wipro", "HCL Technologies", "Tech Mahindra", "Cognizant",
    "Accenture India", "Capgemini", "IBM India", "Oracle India", "Microsoft India",
    "Amazon India", "Google India", "Flipkart", "Zomato", "Swiggy", "Freshworks",
    "Zoho", "Byju's", "Paytm", "Ola", "Razorpay",
]
_AVAILABILITY = [
    "Immediately Available", "2 Weeks Notice", "1 Month Notice",
    "2 Months Notice", "3 Months Notice",
]
_SKILL_POOL = {
    "python": ["Python", "Django", "Flask", "FastAPI", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch"],
    "java":   ["Java", "Spring Boot", "Hibernate", "Maven", "JUnit", "Kafka", "Microservices"],
    "react":  ["React", "TypeScript", "Redux", "Next.js", "Tailwind CSS", "REST APIs", "GraphQL"],
    "data":   ["SQL", "Python", "Power BI", "Tableau", "ETL", "Apache Spark", "Databricks", "Snowflake"],
    "ml":     ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Scikit-learn", "TensorFlow", "MLOps"],
    "devops": ["Docker", "Kubernetes", "CI/CD", "Jenkins", "Terraform", "AWS", "Azure DevOps", "Ansible"],
    "node":   ["Node.js", "Express", "MongoDB", "REST APIs", "TypeScript", "AWS Lambda", "Microservices"],
    "cloud":  ["AWS", "Azure", "GCP", "Terraform", "CloudFormation", "Kubernetes", "Docker"],
}
_SOFT_SKILLS = ["Agile", "Problem Solving", "Team Leadership", "Communication", "Scrum"]


def _pick_skills(query: str, n: int = 8) -> list[str]:
    q = query.lower()
    chosen = []
    for key, skills in _SKILL_POOL.items():
        if key in q or any(s.lower() in q for s in skills):
            chosen.extend(skills)
    if not chosen:
        # generic tech skills
        chosen = ["Python", "SQL", "REST APIs", "Git", "Agile", "Microservices", "Cloud", "Linux"]
    chosen = list(dict.fromkeys(chosen))          # deduplicate, preserve order
    chosen += _SOFT_SKILLS
    return chosen[:n]


def _generate_mock_candidates(query, portal_label, location, exp_min, exp_max, limit) -> list[dict]:
    """Deterministic-ish mock candidates based on query hash so results are stable per search."""
    seed = int(hashlib.md5(f"{query}{portal_label}{location}".encode()).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)

    location_str = location if location else "Bangalore, India"
    portal_slug = portal_label.lower().replace(" ", "")
    base_skills = _pick_skills(query)
    count = min(limit, 50)

    candidates = []
    for i in range(count):
        first = rng.choice(_FIRST_NAMES)
        last  = rng.choice(_LAST_NAMES)
        name  = f"{first} {last}"
        exp   = rng.randint(max(exp_min, 1), max(exp_max, exp_min + 1))
        company = rng.choice(_COMPANIES)
        skills  = rng.sample(base_skills, min(7, len(base_skills)))
        avail   = rng.choice(_AVAILABILITY)
        score   = round(rng.uniform(0.70, 0.96), 2)
        slug    = f"{first.lower()}-{last.lower()}-{rng.randint(100, 999)}"

        seniority = "Senior" if exp >= 7 else ("Mid-Level" if exp >= 4 else "Junior")
        headline  = f"{seniority} {query.split()[0]} Engineer at {company}"

        candidates.append({
            "name":            name,
            "headline":        headline,
            "current_company": company,
            "location":        location_str,
            "skills":          skills,
            "experience_years": exp,
            "summary": (
                f"{name} is a {seniority.lower()} professional with {exp} years of experience "
                f"in {query}. Currently at {company}, they have delivered impactful projects "
                f"using {', '.join(skills[:3])}."
            ),
            "availability":  avail,
            "profile_url":   f"https://www.{portal_slug}.com/in/{slug}",
            "match_score":   score,
            "portal":        portal_label,
        })

    candidates.sort(key=lambda x: x["match_score"], reverse=True)
    return candidates
