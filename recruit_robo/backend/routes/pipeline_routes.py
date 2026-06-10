from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import asyncio
from services.lifecycle_engine import transition_candidate, push_timeline
from database import get_db

router = APIRouter()

# ── AI suggestion rules engine ────────────────────────────────────────────────

def _days_since(dt_val) -> int:
    if dt_val is None:
        return 0
    if isinstance(dt_val, str):
        try:
            dt_val = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        except Exception:
            return 0
    if dt_val.tzinfo is None:
        dt_val = dt_val.replace(tzinfo=timezone.utc)
    return max(0, (datetime.now(timezone.utc) - dt_val).days)


def _suggest(candidate: dict) -> dict:
    status    = candidate.get("status", "sourced")
    score     = candidate.get("match_score") or 0
    pct       = int(score * 100)
    days      = _days_since(candidate.get("updated_at") or candidate.get("created_at"))

    if status == "sourced":
        if score >= 0.80:
            return {"action": "Send outreach email",        "reason": f"{pct}% match — high priority",    "urgency": "high",   "next_status": "emailed"}
        if score >= 0.60:
            return {"action": "Review & email",             "reason": f"{pct}% match — good fit",         "urgency": "medium", "next_status": "emailed"}
        return     {"action": "Low match — consider rejecting", "reason": f"Only {pct}% match",           "urgency": "low",    "next_status": "rejected"}

    if status == "emailed":
        if days >= 7:
            return {"action": "Follow up or close",         "reason": f"No response in {days} days",      "urgency": "high",   "next_status": None}
        if days >= 3:
            return {"action": "Send follow-up",             "reason": f"{days} days since outreach",      "urgency": "medium", "next_status": None}
        return     {"action": "Awaiting response",          "reason": "Recently emailed",                 "urgency": "low",    "next_status": None}

    if status == "interested":
        return     {"action": "Schedule interview",         "reason": "Candidate is interested",          "urgency": "high",   "next_status": "scheduled"}

    if status == "scheduled":
        if days >= 3:
            return {"action": "Collect interview feedback", "reason": f"Interview likely done ({days}d)", "urgency": "high",   "next_status": None}
        return     {"action": "Interview upcoming",         "reason": "Scheduled soon",                   "urgency": "low",    "next_status": None}

    if status == "no_response":
        return     {"action": "Try LinkedIn outreach",      "reason": "No email response",                "urgency": "medium", "next_status": None}

    if status in ("selected", "rejected"):
        return     {"action": "Pipeline complete",          "reason": status.capitalize(),                "urgency": "none",   "next_status": None}

    return         {"action": "Review manually",            "reason": "Unusual status",                   "urgency": "low",    "next_status": None}


# ── Board endpoint ────────────────────────────────────────────────────────────

BOARD_STAGES = ["sourced", "emailed", "interested", "scheduled", "selected", "rejected", "no_response"]

@router.get("/board/{job_id}")
async def pipeline_board(job_id: str):
    db = get_db()
    raw = await db.job_candidates.find({"jobId": job_id}, {"_id": 0}).to_list(500)
    raw.sort(key=lambda c: c.get("match_score") or 0, reverse=True)

    columns: dict[str, list] = {s: [] for s in BOARD_STAGES}
    for c in raw:
        status = c.get("status", "sourced")
        if status not in columns:
            columns[status] = []
        c["days_in_stage"] = _days_since(c.get("updated_at") or c.get("created_at"))
        c["suggestion"]    = _suggest(c)
        # keep card payload lean
        columns[status].append({
            "candidateId":  c["candidateId"],
            "name":         c.get("name", "Unknown"),
            "email":        c.get("email", ""),
            "match_score":  round(c.get("match_score") or 0, 4),
            "skills":       c.get("skills", []),
            "experience":   c.get("experience", 0),
            "status":       status,
            "days_in_stage": c["days_in_stage"],
            "suggestion":   c["suggestion"],
        })

    return {
        "columns": columns,
        "totals":  {s: len(columns[s]) for s in columns},
    }


@router.get("/suggest/{candidate_id}")
async def suggest_action(candidate_id: str):
    db = get_db()
    c  = await db.candidate_info.find_one({"candidateId": candidate_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Candidate not found")
    return _suggest(c)


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
    total_candidates, active_jobs, interviews_sched, hired = await asyncio.gather(
        db.candidate_info.count_documents({}),
        db.job_info.count_documents({"status": "active"}),
        db.interview_schedules.count_documents({}),
        db.candidate_info.count_documents({"status": "selected"}),
    )
    return {
        "totalCandidates":     total_candidates,
        "activeJobs":          active_jobs,
        "interviewsScheduled": interviews_sched,
        "hiredThisMonth":      hired,
        "aiMatchRate":         94,
    }

@router.get("/activity/recent")
async def recent_activity(limit: int = 8):
    db = get_db()

    def _iso(val):
        if isinstance(val, datetime):
            return val.isoformat()
        return str(val) if val else None

    candidates_docs, jobs_docs, hires_docs = await asyncio.gather(
        db.candidate_info.find({}, {"name": 1, "created_at": 1, "_id": 0}).limit(20).to_list(20),
        db.job_info.find({}, {"title": 1, "created_at": 1, "_id": 0}).limit(20).to_list(20),
        db.candidate_info.find({"status": "selected"}, {"name": 1, "created_at": 1, "_id": 0}).limit(20).to_list(20),
    )

    activities = []
    for doc in candidates_docs:
        t = _iso(doc.get("created_at"))
        if t:
            activities.append({"type": "candidate_added", "text": f"New candidate added: {doc['name']}", "time": t, "icon": "user"})
    for doc in jobs_docs:
        t = _iso(doc.get("created_at"))
        if t:
            activities.append({"type": "job_posted", "text": f"Job posted: {doc['title']}", "time": t, "icon": "briefcase"})
    for doc in hires_docs:
        t = _iso(doc.get("created_at"))
        if t:
            activities.append({"type": "candidate_hired", "text": f"Candidate hired: {doc['name']}", "time": t, "icon": "check"})

    activities.sort(key=lambda x: x.get("time", ""), reverse=True)
    return activities[:limit]
