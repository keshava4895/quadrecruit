from fastapi import APIRouter, HTTPException
from models.models import ScheduleRequest
from services.calendar_service import schedule_interview, get_schedule

router = APIRouter()

@router.post("/schedule")
async def schedule(req: ScheduleRequest, token: dict = None):
    if not token:
        raise HTTPException(400, "OAuth token required")
    result = await schedule_interview(
        candidate_email=req.candidate_email if hasattr(req, "candidate_email") else "",
        interviewer_email=req.interviewer_email,
        candidate_id=req.candidateId,
        job_id=req.jobId,
        start_time=req.start_time,
        end_time=req.end_time,
        token=token,
    )
    return {"scheduled": True, "eventId": result.get("id"),
            "meetLink": result.get("hangoutLink")}

@router.get("/{candidate_id}")
async def get_candidate_schedule(candidate_id: str):
    return await get_schedule(candidate_id)
