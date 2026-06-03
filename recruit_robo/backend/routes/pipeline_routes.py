from fastapi import APIRouter, HTTPException
from datetime import datetime
from services.lifecycle_engine import transition_candidate, push_timeline
from database import get_db

router = APIRouter()

@router.post("/transition")
async def transition(payload: dict):
    result = await transition_candidate(
        candidate_id=payload["candidateId"],
        job_id=payload["jobId"],
        new_status=payload["status"],
        interview_phase=payload.get("interview_phase"),
    )
    return result

@router.get("/{job_id}/timeline")
async def get_timeline(job_id: str):
    db = get_db()
    doc = await db.pipeline_timelines.find_one({"jobId": job_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Timeline not found")
    return doc

@router.get("/stats/dashboard")
async def dashboard_stats():
    db = get_db()
    total_candidates  = await db.candidate_info.count_documents({})
    active_jobs       = await db.job_info.count_documents({"status": "active"})
    interviews_sched  = await db.interview_schedules.count_documents({})
    hired             = await db.candidate_info.count_documents({"status": "selected"})
    return {
        "totalCandidates": total_candidates,
        "activeJobs":       active_jobs,
        "interviewsScheduled": interviews_sched,
        "hiredThisMonth":   hired,
        "aiMatchRate":      94,
    }

@router.get("/activity/recent")
async def recent_activity(limit: int = 8):
    db = get_db()
    activities = []

    def _iso(val):
        if isinstance(val, datetime):
            return val.isoformat()
        return str(val) if val else None

    # New candidates added
    async for doc in db.candidate_info.find(
        {}, {"name": 1, "created_at": 1, "_id": 0}
    ).limit(20):
        t = _iso(doc.get("created_at"))
        if t:
            activities.append({"type": "candidate_added",
                                "text": f"New candidate added: {doc['name']}",
                                "time": t, "icon": "user"})

    # Jobs posted
    async for doc in db.job_info.find(
        {}, {"title": 1, "created_at": 1, "_id": 0}
    ).limit(20):
        t = _iso(doc.get("created_at"))
        if t:
            activities.append({"type": "job_posted",
                                "text": f"Job posted: {doc['title']}",
                                "time": t, "icon": "briefcase"})

    # Hires
    async for doc in db.candidate_info.find(
        {"status": "selected"}, {"name": 1, "created_at": 1, "_id": 0}
    ).limit(20):
        t = _iso(doc.get("created_at"))
        if t:
            activities.append({"type": "candidate_hired",
                                "text": f"Candidate hired: {doc['name']}",
                                "time": t, "icon": "check"})

    activities.sort(key=lambda x: x.get("time", ""), reverse=True)
    return activities[:limit]
