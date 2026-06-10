import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from models.models import OfferCreate, OfferUpdate
from services.auth_service import get_current_user
from services.candidate_manager import get_candidate
from services.job_manager import get_job
from database import get_db

router = APIRouter()

OFFER_STATUSES = {"draft", "sent", "negotiating", "accepted", "declined", "withdrawn"}


@router.post("/", status_code=201)
async def create_offer(body: OfferCreate, current_user=Depends(get_current_user)):
    db = get_db()

    candidate = await get_candidate(body.candidateId)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    job = await get_job(body.jobId)
    if not job:
        raise HTTPException(404, "Job not found")

    offer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "offerId":         offer_id,
        "candidateId":     body.candidateId,
        "candidateName":   candidate["name"],
        "candidateEmail":  candidate.get("email", ""),
        "jobId":           body.jobId,
        "jobTitle":        job["title"],
        "status":          "draft",
        "ctc":             body.ctc,
        "joining_date":    body.joining_date,
        "notes":           body.notes or "",
        "created_by":      current_user["userId"],
        "created_by_name": current_user["name"],
        "created_at":      now,
        "updated_at":      now,
    }
    await db["offers"].insert_one(doc)

    await db["candidate_activity"].insert_one({
        "activityId":  str(uuid.uuid4()),
        "candidateId": body.candidateId,
        "type":        "offer_created",
        "text":        f"Offer created for {job['title']} by {current_user['name']}",
        "userId":      current_user["userId"],
        "userName":    current_user["name"],
        "ts":          now,
    })

    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_offers(candidate_id: str = None, current_user=Depends(get_current_user)):
    db = get_db()
    query = {}
    if candidate_id:
        query["candidateId"] = candidate_id
    offers = await db["offers"].find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return offers


@router.get("/{offer_id}")
async def get_offer(offer_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    offer = await db["offers"].find_one({"offerId": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(404, "Offer not found")
    return offer


@router.patch("/{offer_id}")
async def update_offer(offer_id: str, body: OfferUpdate, current_user=Depends(get_current_user)):
    db = get_db()
    offer = await db["offers"].find_one({"offerId": offer_id})
    if not offer:
        raise HTTPException(404, "Offer not found")

    if body.status and body.status not in OFFER_STATUSES:
        raise HTTPException(400, f"status must be one of: {', '.join(sorted(OFFER_STATUSES))}")

    now = datetime.now(timezone.utc)
    update: dict = {"updated_at": now}
    if body.status is not None:
        update["status"] = body.status
    if body.ctc is not None:
        update["ctc"] = body.ctc
    if body.joining_date is not None:
        update["joining_date"] = body.joining_date
    if body.notes is not None:
        update["notes"] = body.notes

    await db["offers"].update_one({"offerId": offer_id}, {"$set": update})

    if body.status and body.status != offer.get("status"):
        await db["candidate_activity"].insert_one({
            "activityId":  str(uuid.uuid4()),
            "candidateId": offer["candidateId"],
            "type":        "offer_updated",
            "text":        f"Offer status changed to '{body.status}' by {current_user['name']}",
            "userId":      current_user["userId"],
            "userName":    current_user["name"],
            "ts":          now,
        })

    updated = await db["offers"].find_one({"offerId": offer_id}, {"_id": 0})
    return updated


@router.delete("/{offer_id}")
async def delete_offer(offer_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    r = await db["offers"].delete_one({"offerId": offer_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Offer not found")
    return {"deleted": True}
