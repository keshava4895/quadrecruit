import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from models.models import InterviewCreate, InterviewUpdate
from services.auth_service import get_current_user
from services.candidate_manager import get_candidate
from services.job_manager import get_job
from database import get_db

router = APIRouter()

INTERVIEW_STATUSES = {"scheduled", "completed", "cancelled", "no_show", "rescheduled"}
INTERVIEW_TYPES    = {"video", "phone", "in_person"}


@router.post("/", status_code=201)
async def schedule_interview(body: InterviewCreate, current_user=Depends(get_current_user)):
    db = get_db()

    candidate = await get_candidate(body.candidateId)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    job = await get_job(body.jobId)
    if not job:
        raise HTTPException(404, "Job not found")

    interviewer = await db["interviewers"].find_one({"interviewerId": body.interviewerId})
    if not interviewer:
        raise HTTPException(404, "Interviewer not found")

    if body.type not in INTERVIEW_TYPES:
        raise HTTPException(400, f"type must be one of: {', '.join(sorted(INTERVIEW_TYPES))}")

    interview_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "interviewId":      interview_id,
        "candidateId":      body.candidateId,
        "candidateName":    candidate["name"],
        "candidateEmail":   candidate.get("email", ""),
        "jobId":            body.jobId,
        "jobTitle":         job["title"],
        "interviewerId":    body.interviewerId,
        "interviewerName":  interviewer["name"],
        "interviewerEmail": interviewer.get("email", ""),
        "round":            body.round,
        "type":             body.type,
        "scheduled_at":     body.scheduled_at,
        "duration_mins":    body.duration_mins,
        "status":           "scheduled",
        "meeting_link":     body.meeting_link or "",
        "location":         body.location or "",
        "notes":            body.notes or "",
        "feedback":         "",
        "rating":           None,
        "created_by":       current_user["userId"],
        "created_by_name":  current_user["name"],
        "created_at":       now,
        "updated_at":       now,
    }
    await db["scheduled_interviews"].insert_one(doc)

    date_str = body.scheduled_at[:10] if body.scheduled_at else ""
    await db["candidate_activity"].insert_one({
        "activityId":  str(uuid.uuid4()),
        "candidateId": body.candidateId,
        "type":        "interview_scheduled",
        "text":        (
            f"Round {body.round} interview scheduled for {job['title']} "
            f"with {interviewer['name']}"
            + (f" on {date_str}" if date_str else "")
        ),
        "userId":   current_user["userId"],
        "userName": current_user["name"],
        "ts":       now,
    })

    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_interviews(
    candidate_id:   str = None,
    job_id:         str = None,
    interviewer_id: str = None,
    status:         str = None,
    current_user=Depends(get_current_user),
):
    db = get_db()
    query = {}
    if candidate_id:   query["candidateId"]   = candidate_id
    if job_id:         query["jobId"]          = job_id
    if interviewer_id: query["interviewerId"]  = interviewer_id
    if status:         query["status"]         = status

    interviews = await db["scheduled_interviews"].find(query, {"_id": 0}).sort("scheduled_at", 1).to_list(500)
    return interviews


@router.get("/{interview_id}")
async def get_interview(interview_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    iv = await db["scheduled_interviews"].find_one({"interviewId": interview_id}, {"_id": 0})
    if not iv:
        raise HTTPException(404, "Interview not found")
    return iv


@router.patch("/{interview_id}")
async def update_interview(
    interview_id: str,
    body: InterviewUpdate,
    current_user=Depends(get_current_user),
):
    db = get_db()
    iv = await db["scheduled_interviews"].find_one({"interviewId": interview_id})
    if not iv:
        raise HTTPException(404, "Interview not found")

    if body.status and body.status not in INTERVIEW_STATUSES:
        raise HTTPException(400, f"status must be one of: {', '.join(sorted(INTERVIEW_STATUSES))}")

    now = datetime.now(timezone.utc)
    update: dict = {"updated_at": now}
    if body.status       is not None: update["status"]       = body.status
    if body.scheduled_at is not None: update["scheduled_at"] = body.scheduled_at
    if body.duration_mins is not None: update["duration_mins"] = body.duration_mins
    if body.meeting_link is not None: update["meeting_link"] = body.meeting_link
    if body.location     is not None: update["location"]     = body.location
    if body.notes        is not None: update["notes"]        = body.notes
    if body.feedback     is not None: update["feedback"]     = body.feedback
    if body.rating       is not None: update["rating"]       = body.rating

    await db["scheduled_interviews"].update_one({"interviewId": interview_id}, {"$set": update})

    if body.status and body.status != iv.get("status"):
        await db["candidate_activity"].insert_one({
            "activityId":  str(uuid.uuid4()),
            "candidateId": iv["candidateId"],
            "type":        "interview_updated",
            "text":        f"Interview status changed to '{body.status}' for {iv['jobTitle']} by {current_user['name']}",
            "userId":      current_user["userId"],
            "userName":    current_user["name"],
            "ts":          now,
        })

    updated = await db["scheduled_interviews"].find_one({"interviewId": interview_id}, {"_id": 0})
    return updated


@router.delete("/{interview_id}")
async def delete_interview(interview_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    r = await db["scheduled_interviews"].delete_one({"interviewId": interview_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Interview not found")
    return {"deleted": True}
