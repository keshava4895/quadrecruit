from uuid import uuid4
from datetime import datetime, timezone

from database import get_db
from models.models import CandidateCreate


async def add_candidate(job_id: str, candidate: CandidateCreate) -> dict:
    db = get_db()
    candidate_id = f"C_{str(uuid4())[:8].upper()}"
    doc = candidate.model_dump()
    doc.update({
        "candidateId": candidate_id,
        "jobId": job_id,
        "status": "sourced",
        "interview_phase": "not_started",
        "match_score": 0.0,
        "created_at": datetime.now(timezone.utc),
    })

    await db.candidate_info.insert_one(doc)
    await db.job_candidates.insert_one(doc)

    return {"candidateId": candidate_id}


async def update_status(candidate_id: str, status: str, job_id: str = None):
    db = get_db()
    update = {"$set": {"status": status,
                       "updated_at": datetime.now(timezone.utc)}}
    await db.candidate_info.update_one({"candidateId": candidate_id}, update)
    if job_id:
        await db.job_candidates.update_one(
            {"candidateId": candidate_id, "jobId": job_id}, update
        )


async def update_match_score(candidate_id: str, job_id: str, score: float):
    db = get_db()
    update = {"$set": {"match_score": round(score, 4),
                       "updated_at": datetime.now(timezone.utc)}}
    await db.candidate_info.update_one({"candidateId": candidate_id}, update)
    await db.job_candidates.update_one(
        {"candidateId": candidate_id, "jobId": job_id}, update
    )


async def get_top_candidates(job_id: str, limit: int = 10) -> list:
    db = get_db()
    cursor = (
        db.job_candidates
        .find({"jobId": job_id}, {"_id": 0})
        .sort("match_score", -1)
        .limit(limit)
    )
    return await cursor.to_list(length=limit)


async def get_candidate(candidate_id: str) -> dict | None:
    db = get_db()
    return await db.candidate_info.find_one(
        {"candidateId": candidate_id}, {"_id": 0}
    )
