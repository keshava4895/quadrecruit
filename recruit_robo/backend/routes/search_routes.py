from fastapi import APIRouter, HTTPException, Query
from models.models import CandidateSearchRequest
from services.search_service import search_portal_candidates
from services.linkedin_service import search_linkedin_jobs
from config import RAPIDAPI_KEY
from database import db

router = APIRouter()


@router.post("/candidates")
async def search_candidates(request: CandidateSearchRequest):
    query = request.query.strip()

    # If a job_id is provided, derive the search query from that job's details
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

        # Use the job's location if the caller didn't supply one
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
        "query": query,
        "total": len(candidates),
        "candidates": candidates,
    }


@router.get("/portals")
async def list_portals():
    """Return supported portal options for the frontend dropdown."""
    return [
        {"value": "linkedin",  "label": "LinkedIn"},
        {"value": "indeed",    "label": "Indeed"},
        {"value": "naukri",    "label": "Naukri"},
        {"value": "monster",   "label": "Monster"},
        {"value": "glassdoor", "label": "Glassdoor"},
    ]


@router.get("/linkedin-jobs")
async def linkedin_jobs(
    title:    str = Query(..., description="Job title to search"),
    location: str = Query("", description="Location filter"),
    limit:    int = Query(10, ge=1, le=25),
):
    """
    Fetch live job postings from LinkedIn via RapidAPI.
    Returns job listings that can be imported into the ATS.
    """
    if not RAPIDAPI_KEY:
        raise HTTPException(
            status_code=503,
            detail="RAPIDAPI_KEY not configured. Add it to your .env file.",
        )
    jobs = await search_linkedin_jobs(title=title, location=location, limit=limit)
    return {
        "total":  len(jobs),
        "source": "LinkedIn (RapidAPI)",
        "jobs":   jobs,
    }
