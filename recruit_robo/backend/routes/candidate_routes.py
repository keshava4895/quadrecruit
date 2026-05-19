from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from models.models import CandidateCreate
from services.candidate_manager import (
    add_candidate, get_top_candidates, get_candidate, update_status
)
from services.screening_service import screen_resume
from services.matching_service  import compute_match
from services.candidate_manager import update_match_score
from services.job_manager       import get_job

router = APIRouter()


@router.post("/{job_id}")
async def add_candidate_route(job_id: str, candidate: CandidateCreate):
    return await add_candidate(job_id, candidate)


@router.post("/{job_id}/upload-resume")
async def upload_and_screen(
    job_id: str,
    file: UploadFile = File(...),
):
    """Upload a PDF/text resume, screen it with LLM, score it, store candidate."""
    content = await file.read()
    resume_text = content.decode("utf-8", errors="ignore")

    parsed = await screen_resume(resume_text)

    candidate = CandidateCreate(
        name=parsed.get("name", "Unknown"),
        email=parsed.get("email", f"unknown_{job_id}@placeholder.com"),
        phone=parsed.get("phone"),
        skills=parsed.get("skills", []),
        experience=parsed.get("experience", 0),
        summary=parsed.get("summary"),
        resume_text=resume_text,
    )
    result = await add_candidate(job_id, candidate)
    candidate_id = result["candidateId"]
    result["name"]  = parsed.get("name",  "Unknown")
    result["email"] = parsed.get("email", "")
    result["phone"] = parsed.get("phone", "")

    job = await get_job(job_id)
    if job:
        score = await compute_match(
            job_skills=job.get("skills", []),
            candidate_skills=parsed.get("skills", []),
            experience_required=job.get("experience_years", 0),
            experience_actual=parsed.get("experience", 0),
        )
        await update_match_score(candidate_id, job_id, score)
        result["match_score"] = score

    result["name"]  = parsed.get("name",  "Unknown")
    result["email"] = parsed.get("email", "")
    result["phone"] = parsed.get("phone", "")

    return result


@router.get("/{job_id}/top")
async def top_candidates(job_id: str, limit: int = 10):
    return await get_top_candidates(job_id, limit)


@router.get("/profile/{candidate_id}")
async def candidate_profile(candidate_id: str):
    c = await get_candidate(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")
    return c


@router.patch("/{candidate_id}/status")
async def update_candidate_status(candidate_id: str, payload: dict):
    status  = payload.get("status")
    job_id  = payload.get("jobId")
    if not status:
        raise HTTPException(400, "status required")
    await update_status(candidate_id, status, job_id)
    return {"updated": True}
