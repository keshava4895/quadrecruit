from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from models.models import CandidateCreate
from services.candidate_manager import (
    add_candidate, get_top_candidates, get_candidate, update_status, delete_candidate
)
from services.screening_service import screen_resume, extract_text_from_bytes
from services.matching_service  import compute_match
from services.candidate_manager import update_match_score
from services.job_manager       import get_job

router = APIRouter()


@router.post("/{job_id}")
async def add_candidate_route(job_id: str, candidate: CandidateCreate):
    if not candidate.email:
        import re as _re, time as _time
        slug = _re.sub(r"[^a-z0-9]", ".", candidate.name.lower())[:30]
        candidate.email = f"ext.{slug}.{int(_time.time())}@portal.placeholder"
    return await add_candidate(job_id, candidate)


@router.post("/{job_id}/upload-resume")
async def upload_and_screen(
    job_id: str,
    file: UploadFile = File(...),
):
    """Upload a PDF/text resume, screen it, score it, store candidate."""
    file_bytes  = await file.read()
    resume_text = extract_text_from_bytes(file_bytes, file.filename or "")

    if not resume_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from the uploaded file. "
                   "Please upload a readable PDF or plain-text resume.",
        )

    parsed = await screen_resume(resume_text)

    # Ensure a usable email so the DB unique-key constraint doesn't fail
    email = parsed.get("email") or f"candidate_{job_id}_{file.filename}@placeholder.com"
    email = email.strip()

    candidate = CandidateCreate(
        name=parsed.get("name") or file.filename or "Unknown",
        email=email,
        phone=parsed.get("phone"),
        skills=parsed.get("skills", []),
        experience=parsed.get("experience", 0),
        summary=parsed.get("summary"),
        resume_text=resume_text,
    )
    result = await add_candidate(job_id, candidate)
    candidate_id = result["candidateId"]

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

    # Always surface extracted contact info to the frontend
    # Clean name fallback: strip extension and underscores from filename
    fallback_name = ""
    if file.filename:
        import re as _re
        fn = _re.sub(r"\.(pdf|doc|docx|txt)$", "", file.filename, flags=_re.IGNORECASE)
        fn = _re.sub(r"[_\-\.]+", " ", fn).strip()
        fn = _re.sub(r"(?i)\b(resume|cv)\b", "", fn).strip()
        fallback_name = " ".join(w.capitalize() for w in fn.split() if w) or file.filename
    result["name"]  = parsed.get("name")  or fallback_name or "Unknown"
    result["email"] = parsed.get("email") or ""
    result["phone"] = parsed.get("phone") or ""

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


@router.get("/profile/{candidate_id}/full")
async def candidate_full_profile(candidate_id: str):
    from database import get_db as _get_db
    db = _get_db()
    c  = await get_candidate(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")

    # Jobs this candidate appears in
    job_entries = await db["job_candidates"].find(
        {"candidateId": candidate_id}, {"_id": 0}
    ).to_list(20)
    jobs_detail = []
    for je in job_entries:
        job = await db["job_info"].find_one({"jobId": je["jobId"]}, {"_id": 0, "title": 1, "location": 1, "skills": 1})
        jobs_detail.append({
            "jobId":       je["jobId"],
            "title":       job["title"] if job else je["jobId"],
            "location":    job.get("location") if job else None,
            "match_score": je.get("match_score", 0),
            "status":      je.get("status", "sourced"),
            "updated_at":  je.get("updated_at"),
        })

    # Interview feedback
    feedback = await db["interview_feedback"].find(
        {"candidateId": candidate_id}, {"_id": 0}
    ).to_list(20)

    # Interview assignments
    assignments = await db["interview_assignments"].find(
        {"candidateId": candidate_id}, {"_id": 0}
    ).to_list(20)
    for a in assignments:
        job = await db["job_info"].find_one({"jobId": a.get("jobId")}, {"_id": 0, "title": 1})
        a["jobTitle"] = job["title"] if job else a.get("jobId")

    # Pipeline timeline (from each job)
    timelines = []
    for je in job_entries:
        tl = await db["pipeline_timelines"].find_one({"jobId": je["jobId"]}, {"_id": 0})
        if tl and tl.get("timeline"):
            for entry in tl["timeline"]:
                if candidate_id in str(entry.get("stage", "")):
                    timelines.append({**entry, "jobId": je["jobId"]})

    return {
        **c,
        "jobs":        jobs_detail,
        "feedback":    feedback,
        "assignments": assignments,
        "timeline":    sorted(timelines, key=lambda x: x.get("ts", ""), reverse=True),
    }


@router.patch("/{candidate_id}/status")
async def update_candidate_status(candidate_id: str, payload: dict):
    status  = payload.get("status")
    job_id  = payload.get("jobId")
    if not status:
        raise HTTPException(400, "status required")
    await update_status(candidate_id, status, job_id)
    return {"updated": True}


@router.delete("/{candidate_id}")
async def delete_candidate_route(candidate_id: str, job_id: str = None):
    await delete_candidate(candidate_id, job_id)
    return {"deleted": True}
