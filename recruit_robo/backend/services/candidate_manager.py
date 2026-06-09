from uuid import uuid4
from datetime import datetime, timezone

from database import get_db
from models.models import CandidateCreate


async def add_candidate(job_id: str, candidate: CandidateCreate, extra: dict = None) -> dict:
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
    if extra:
        doc.update(extra)

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
    cursor = db.job_candidates.find({"jobId": job_id}, {"_id": 0})
    candidates = await cursor.to_list(length=limit * 5)
    candidates.sort(key=lambda c: c.get("match_score") or 0, reverse=True)
    return candidates[:limit]


async def list_all_candidates(search: str = "", status: str = "", skip: int = 0, limit: int = 50) -> dict:
    db = get_db()
    query: dict = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name":  {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"skills": {"$elemMatch": {"$regex": search, "$options": "i"}}},
        ]
    total = await db.candidate_info.count_documents(query)
    # Cosmos DB rejects sort+skip combos — fetch, sort in Python, then slice
    fetch_limit = min(skip + limit, 1000)
    cursor = db.candidate_info.find(query, {"_id": 0}).limit(fetch_limit)
    all_cands = await cursor.to_list(length=fetch_limit)
    all_cands.sort(key=lambda c: str(c.get("created_at", "")), reverse=True)
    candidates = all_cands[skip: skip + limit]

    # Enrich each candidate with job count + best match score
    for c in candidates:
        cid = c.get("candidateId")
        job_entries = await db.job_candidates.find(
            {"candidateId": cid}, {"_id": 0, "jobId": 1, "match_score": 1, "status": 1, "title": 1}
        ).to_list(20)
        scores = [j.get("match_score", 0) for j in job_entries if j.get("match_score")]
        c["job_count"]   = len(job_entries)
        c["best_score"]  = max(scores) if scores else 0
        c["job_entries"] = job_entries

    return {"total": total, "candidates": candidates}


async def add_standalone_candidate(candidate: CandidateCreate, extra: dict = None) -> dict:
    """Store a candidate in candidate_info only (no job link)."""
    db = get_db()
    candidate_id = f"C_{str(uuid4())[:8].upper()}"
    doc = candidate.model_dump()
    doc.update({
        "candidateId": candidate_id,
        "status": "sourced",
        "interview_phase": "not_started",
        "match_score": 0.0,
        "created_at": datetime.now(timezone.utc),
    })
    if extra:
        doc.update(extra)
    await db.candidate_info.insert_one(doc)
    return {"candidateId": candidate_id}


async def get_candidate(candidate_id: str) -> dict | None:
    db = get_db()
    return await db.candidate_info.find_one(
        {"candidateId": candidate_id}, {"_id": 0}
    )


async def delete_candidate(candidate_id: str, job_id: str = None):
    db = get_db()
    await db.candidate_info.delete_one({"candidateId": candidate_id})
    if job_id:
        await db.job_candidates.delete_one({"candidateId": candidate_id, "jobId": job_id})
    else:
        await db.job_candidates.delete_many({"candidateId": candidate_id})
