# routes/feedback_routes.py
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from models.models import InterviewerFeedback, CandidateFeedback
from services.feedback_service import (
    store_interviewer_feedback, store_candidate_feedback, summarise_feedback
)
from services.auth_service import get_current_user
from database import get_db

router = APIRouter()


@router.post("/interviewer")
async def interviewer_feedback(fb: InterviewerFeedback):
    return await store_interviewer_feedback(fb.model_dump())


@router.post("/candidate")
async def candidate_feedback(fb: CandidateFeedback):
    return await store_candidate_feedback(fb.model_dump())


@router.get("/summary/{candidate_id}")
async def feedback_summary(candidate_id: str):
    summary = await summarise_feedback(candidate_id)
    return {"candidateId": candidate_id, "summary": summary}


@router.get("/interviewers")
async def interviewer_stats(current_user=Depends(get_current_user)):
    """Return all system users with aggregated interview statistics."""
    db      = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()

    users = await db["users"].find(
        {}, {"_id": 0, "password": 0, "smtp_pass": 0, "smtp_email": 0}
    ).to_list(100)

    result = []
    for user in users:
        email = user.get("email", "")

        # All interview schedules for this interviewer
        schedules = await db["interview_schedules"].find(
            {"interviewer": email}, {"_id": 0}
        ).to_list(200)

        past_schedules     = [s for s in schedules if s.get("start", "") <  now_iso]
        upcoming_schedules = [s for s in schedules if s.get("start", "") >= now_iso]

        # Feedback decision counts (for records that carry interviewer_email)
        selected = await db["interview_feedback"].count_documents(
            {"interviewer_email": email, "decision": "Selected"}
        )
        rejected = await db["interview_feedback"].count_documents(
            {"interviewer_email": email, "decision": "Rejected"}
        )

        # Enrich upcoming with candidate/job names (top 5)
        enriched_upcoming = []
        for s in upcoming_schedules[:5]:
            cid  = s.get("candidateId")
            jid  = s.get("jobId")
            cand = await db["candidate_info"].find_one({"candidateId": cid}, {"_id": 0, "name": 1}) if cid else None
            job  = await db["job_info"].find_one({"jobId": jid}, {"_id": 0, "title": 1}) if jid else None
            enriched_upcoming.append({
                "candidateId":   cid,
                "candidateName": cand["name"] if cand else cid,
                "jobTitle":      job["title"]  if job  else jid,
                "round":         s.get("round"),
                "start":         s.get("start"),
                "meetLink":      s.get("meetLink"),
            })

        result.append({
            "userId":           user.get("userId"),
            "name":             user.get("name"),
            "email":            email,
            "role":             user.get("role", "recruiter"),
            "interviews_taken": len(past_schedules),
            "selected":         selected,
            "rejected":         rejected,
            "upcoming_count":   len(upcoming_schedules),
            "upcoming":         enriched_upcoming,
        })

    return result
