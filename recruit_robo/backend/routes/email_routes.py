# routes/email_routes.py
from fastapi import APIRouter, HTTPException
from models.models import EmailRequest, BulkEmailRequest
from services.email_service import send_email, draft_outreach_email, parse_reply_intent
from services.candidate_manager import get_top_candidates, get_candidate
from database import get_db

router = APIRouter()

@router.post("/send")
async def send_single_email(req: EmailRequest, token: dict = None):
    if not token:
        raise HTTPException(400, "OAuth token required")
    result = await send_email(req.candidate_email, req.subject, req.body, token)
    return {"sent": True, "messageId": result.get("id")}

@router.post("/draft")
async def draft_email(payload: dict):
    name  = payload.get("candidate_name", "")
    title = payload.get("job_title", "")
    return await draft_outreach_email(name, title)

@router.post("/parse-reply")
async def classify_reply(payload: dict):
    reply = payload.get("reply_text", "")
    intent = await parse_reply_intent(reply)
    return {"intent": intent}
