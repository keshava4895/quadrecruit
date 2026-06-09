from fastapi import APIRouter
from datetime import datetime, timezone
from database import get_db

router = APIRouter()

FUNNEL_STAGES = ["sourced", "emailed", "interested", "scheduled", "selected"]


def _to_dt(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _infer_source(email: str) -> str:
    if not email:
        return "Direct"
    if "@portal.placeholder" in email:
        return "Portal Search"
    if "@placeholder" in email:
        return "Resume Upload"
    return "Direct"


@router.get("/overview")
async def analytics_overview():
    db = get_db()

    total_candidates = await db.candidate_info.count_documents({})
    total_hired      = await db.candidate_info.count_documents({"status": "selected"})
    total_rejected   = await db.candidate_info.count_documents({"status": "rejected"})
    active_jobs      = await db.job_info.count_documents({"status": "active"})

    # Source breakdown
    all_cands = await db.candidate_info.find(
        {}, {"email": 1, "created_at": 1, "updated_at": 1, "status": 1, "_id": 0}
    ).to_list(2000)

    sources: dict[str, int] = {}
    time_to_hire_days = []
    for c in all_cands:
        src = _infer_source(c.get("email", ""))
        sources[src] = sources.get(src, 0) + 1
        if c.get("status") == "selected":
            created = _to_dt(c.get("created_at"))
            updated = _to_dt(c.get("updated_at"))
            if created and updated:
                d = (updated - created).days
                if d >= 0:
                    time_to_hire_days.append(d)

    avg_time_to_hire = (
        round(sum(time_to_hire_days) / len(time_to_hire_days), 1)
        if time_to_hire_days else None
    )

    # Per-job summary
    jobs = await db.job_info.find({}, {"_id": 0, "jobId": 1, "title": 1}).to_list(100)
    job_stats = []
    for job in jobs:
        jid  = job["jobId"]
        cands = await db.job_candidates.find(
            {"jobId": jid}, {"status": 1, "match_score": 1, "_id": 0}
        ).to_list(500)
        total  = len(cands)
        hired  = sum(1 for c in cands if c.get("status") == "selected")
        scores = [c["match_score"] for c in cands if c.get("match_score")]
        job_stats.append({
            "jobId":           jid,
            "title":           job["title"],
            "total":           total,
            "hired":           hired,
            "conversion_rate": round(hired / total * 100, 1) if total else 0,
            "avg_match_score": round(sum(scores) / len(scores) * 100, 1) if scores else 0,
        })
    job_stats.sort(key=lambda x: x["total"], reverse=True)

    return {
        "total_candidates":    total_candidates,
        "total_hired":         total_hired,
        "total_rejected":      total_rejected,
        "active_jobs":         active_jobs,
        "avg_time_to_hire":    avg_time_to_hire,
        "sources":             sources,
        "job_stats":           job_stats,
    }


@router.get("/funnel/{job_id}")
async def funnel_stats(job_id: str):
    db = get_db()
    cands = await db.job_candidates.find(
        {"jobId": job_id}, {"status": 1, "match_score": 1, "created_at": 1, "updated_at": 1, "_id": 0}
    ).to_list(500)
    total = len(cands)

    # Count current status distribution
    dist: dict[str, int] = {}
    for c in cands:
        s = c.get("status", "sourced")
        dist[s] = dist.get(s, 0) + 1

    funnel = []
    for stage in FUNNEL_STAGES:
        count = dist.get(stage, 0)
        funnel.append({
            "stage": stage,
            "count": count,
            "pct_of_total": round(count / total * 100, 1) if total else 0,
        })

    # Conversion between consecutive stages (count / previous stage count)
    for i in range(1, len(funnel)):
        prev = funnel[i - 1]["count"]
        funnel[i]["conversion_from_prev"] = (
            round(funnel[i]["count"] / prev * 100, 1) if prev else 0
        )
    if funnel:
        funnel[0]["conversion_from_prev"] = 100.0

    # Drop-off per stage
    for i in range(len(funnel) - 1):
        funnel[i]["drop_off"] = funnel[i]["count"] - funnel[i + 1]["count"]

    # Time-to-hire
    hired = [c for c in cands if c.get("status") == "selected"]
    days_list = []
    for c in hired:
        cr = _to_dt(c.get("created_at"))
        up = _to_dt(c.get("updated_at"))
        if cr and up:
            d = (up - cr).days
            if d >= 0:
                days_list.append(d)

    # Rejection rate
    rejected_count = dist.get("rejected", 0)

    # Average match score per stage
    for item in funnel:
        stage_scores = [
            c.get("match_score", 0) for c in cands
            if c.get("status") == item["stage"] and c.get("match_score")
        ]
        item["avg_score"] = (
            round(sum(stage_scores) / len(stage_scores) * 100, 1) if stage_scores else None
        )

    return {
        "job_id":             job_id,
        "total":              total,
        "funnel":             funnel,
        "rejected":           rejected_count,
        "hired":              len(hired),
        "avg_time_to_hire":   round(sum(days_list) / len(days_list), 1) if days_list else None,
        "status_distribution": dist,
    }
