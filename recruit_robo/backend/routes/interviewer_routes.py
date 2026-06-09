from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
from services.auth_service import get_current_user
from database import get_db

router = APIRouter()


@router.get("/")
async def list_interviewers(current_user=Depends(get_current_user)):
    """Return all interviewers with aggregated assignment stats."""
    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()

    interviewers = await db["interviewers"].find({}, {"_id": 0}).to_list(100)
    result = []

    for iv in interviewers:
        iid   = iv["interviewerId"]
        email = iv.get("email", "")

        assignments = await db["interview_assignments"].find(
            {"interviewerId": iid}, {"_id": 0}
        ).to_list(200)

        upcoming = sorted(
            [a for a in assignments if (a.get("scheduledDate") or "") >= now_iso],
            key=lambda x: x.get("scheduledDate", ""),
        )
        past_count = len(assignments) - len(upcoming)

        selected = await db["interview_feedback"].count_documents(
            {"interviewer_email": email, "decision": "Selected"}
        )
        rejected = await db["interview_feedback"].count_documents(
            {"interviewer_email": email, "decision": "Rejected"}
        )

        enriched_upcoming = []
        for a in upcoming[:5]:
            cid  = a.get("candidateId")
            jid  = a.get("jobId")
            cand = await db["candidate_info"].find_one({"candidateId": cid}, {"_id": 0, "name": 1}) if cid else None
            job  = await db["job_info"].find_one({"jobId": jid}, {"_id": 0, "title": 1}) if jid else None
            enriched_upcoming.append({
                "assignmentId":  a.get("assignmentId"),
                "candidateId":   cid,
                "candidateName": cand["name"] if cand else cid,
                "jobTitle":      job["title"] if job else jid,
                "round":         a.get("round", 1),
                "start":         a.get("scheduledDate"),
            })

        result.append({
            **iv,
            "interviews_taken": past_count,
            "total_assigned":   len(assignments),
            "selected":         selected,
            "rejected":         rejected,
            "upcoming_count":   len(upcoming),
            "upcoming":         enriched_upcoming,
        })

    return result


@router.post("/")
async def add_interviewer(body: dict, current_user=Depends(get_current_user)):
    """Add a new interviewer."""
    db    = get_db()
    name  = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()

    if not name or not email:
        raise HTTPException(400, "name and email are required")
    if await db["interviewers"].find_one({"email": email}):
        raise HTTPException(400, f"Interviewer with email {email} already exists")

    doc = {
        "interviewerId": str(uuid.uuid4()),
        "name":          name,
        "email":         email,
        "phone":         (body.get("phone") or "").strip(),
        "department":    (body.get("department") or "").strip(),
        "created_at":    datetime.now(timezone.utc).isoformat(),
    }
    await db["interviewers"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/{interviewer_id}")
async def delete_interviewer(interviewer_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    r  = await db["interviewers"].delete_one({"interviewerId": interviewer_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Interviewer not found")
    return {"deleted": True}


@router.post("/{interviewer_id}/assign")
async def assign_candidate(
    interviewer_id: str,
    body: dict,
    current_user=Depends(get_current_user),
):
    """Assign a shortlisted candidate to an interviewer."""
    db = get_db()
    iv = await db["interviewers"].find_one({"interviewerId": interviewer_id}, {"_id": 0})
    if not iv:
        raise HTTPException(404, "Interviewer not found")

    candidate_id   = (body.get("candidateId") or "").strip()
    job_id         = (body.get("jobId") or "").strip()
    scheduled_date = body.get("scheduledDate") or None
    round_num      = int(body.get("round") or 1)

    if not candidate_id or not job_id:
        raise HTTPException(400, "candidateId and jobId are required")

    assignment = {
        "assignmentId":      str(uuid.uuid4()),
        "interviewerId":     interviewer_id,
        "interviewer_name":  iv["name"],
        "interviewer_email": iv["email"],
        "candidateId":       candidate_id,
        "jobId":             job_id,
        "round":             round_num,
        "scheduledDate":     scheduled_date,
        "status":            "assigned",
        "created_at":        datetime.now(timezone.utc).isoformat(),
    }
    await db["interview_assignments"].insert_one(assignment)
    assignment.pop("_id", None)

    # Move candidate to "scheduled" status
    await db["candidate_info"].update_one(
        {"candidateId": candidate_id},
        {"$set": {
            "status":          "scheduled",
            "interview_phase": f"round_{round_num}",
        }}
    )

    return assignment
