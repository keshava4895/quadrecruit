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

@router.post("/bulk-draft")
async def bulk_draft_emails(payload: dict):
    candidates = payload.get("candidates", [])
    job_title  = payload.get("job_title", "the role")
    drafts = []
    for c in candidates:
        draft = await draft_outreach_email(c["name"], job_title)
        loopback = (
            "\n\n---\nPlease reply to this email with:\n"
            "  INTERESTED – if you'd like to learn more\n"
            "  NOT INTERESTED – if you'd prefer not to be contacted\n"
            "We'll follow up based on your response."
        )
        drafts.append({
            "name":    c["name"],
            "email":   c.get("email", ""),
            "phone":   c.get("phone", ""),
            "subject": draft["subject"],
            "body":    draft["body"] + loopback,
        })
    return {"drafts": drafts}

@router.post("/parse-reply")
async def classify_reply(payload: dict):
    reply = payload.get("reply_text", "")
    intent = await parse_reply_intent(reply)
    return {"intent": intent}
