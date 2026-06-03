from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.models import CandidateSearchRequest
from services.search_service import search_portal_candidates
from services.naukri_service import scrape_naukri_candidates
from database import get_db

router = APIRouter()


# ── Candidate search (AI / mock fallback) ─────────────────────────────────────

@router.post("/candidates")
async def search_candidates(request: CandidateSearchRequest):
    db = get_db()
    query = request.query.strip()

    if request.job_id:
        job = await db["job_info"].find_one({"jobId": request.job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {request.job_id} not found")

        skills_str = ", ".join(job.get("skills", []))
        query = (
            f"{job['title']} — required skills: {skills_str}. "
            f"Experience: {job.get('experience_years', 0)}+ years. "
            f"{job.get('description', '')}"
        ).strip()

        if not request.location and job.get("location"):
            request.location = job["location"]

    if not query:
        raise HTTPException(status_code=422, detail="Provide a search query or a valid job_id")

    candidates = await search_portal_candidates(
        query=query,
        portal=request.portal,
        location=request.location,
        experience_min=request.experience_min or 0,
        experience_max=request.experience_max or 20,
        limit=request.limit,
    )

    return {
        "portal": request.portal,
        "query":  query,
        "total":  len(candidates),
        "candidates": candidates,
    }


# ── Naukri Resdex scraper ─────────────────────────────────────────────────────

class NaukriScrapeRequest(BaseModel):
    curl_command: str
    max_results:  int = 10
    save_session: bool = True   # persist curl command for future searches


class NaukriSessionSave(BaseModel):
    curl_command: str


@router.post("/naukri-scrape")
async def naukri_scrape(request: NaukriScrapeRequest):
    """
    Scrape Naukri Resdex using the caller's session curl command.
    Optionally persists the curl command so future searches reuse it.
    """
    if not request.curl_command.strip():
        raise HTTPException(status_code=422, detail="curl_command is required")

    db = get_db()

    # Persist session for reuse
    if request.save_session:
        await db["settings"].update_one(
            {"key": "naukri_session"},
            {"$set": {"key": "naukri_session", "curl_command": request.curl_command}},
            upsert=True,
        )

    try:
        candidates = await scrape_naukri_candidates(
            curl_command=request.curl_command,
            max_results=request.max_results,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Naukri scraper failed: {str(e)}. "
                   "Check that your Naukri session cookies are still valid.",
        )

    return {
        "portal":     "Naukri",
        "total":      len(candidates),
        "candidates": candidates,
    }


@router.post("/naukri-session")
async def save_naukri_session(body: NaukriSessionSave):
    """Save the Naukri Resdex curl command for reuse across searches."""
    db = get_db()
    await db["settings"].update_one(
        {"key": "naukri_session"},
        {"$set": {"key": "naukri_session", "curl_command": body.curl_command}},
        upsert=True,
    )
    return {"saved": True, "message": "Naukri session saved. It will be used for all Naukri searches."}


@router.get("/naukri-session")
async def get_naukri_session():
    """Check if a Naukri session is saved and if it looks valid."""
    db = get_db()
    doc = await db["settings"].find_one({"key": "naukri_session"})
    if not doc or not doc.get("curl_command"):
        return {"configured": False}
    curl = doc["curl_command"]
    has_cookie = "Cookie" in curl or "cookie" in curl
    return {
        "configured": True,
        "has_cookie": has_cookie,
        "preview":    curl[:80] + "…",
    }


@router.delete("/naukri-session")
async def delete_naukri_session():
    """Remove saved Naukri session."""
    db = get_db()
    await db["settings"].delete_one({"key": "naukri_session"})
    return {"cleared": True}


# ── Portal list ───────────────────────────────────────────────────────────────

@router.get("/portals")
async def list_portals():
    return [
        {"value": "linkedin",  "label": "LinkedIn"},
        {"value": "indeed",    "label": "Indeed"},
        {"value": "naukri",    "label": "Naukri"},
        {"value": "monster",   "label": "Monster"},
        {"value": "glassdoor", "label": "Glassdoor"},
        {"value": "github",    "label": "GitHub"},
    ]
