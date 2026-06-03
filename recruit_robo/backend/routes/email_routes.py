# routes/email_routes.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from models.models import EmailRequest, BulkEmailRequest
from services.email_service import send_email, send_email_smtp, draft_outreach_email, parse_reply_intent
from services.auth_service import get_current_user
from services.candidate_manager import get_top_candidates, get_candidate
from database import get_db

router = APIRouter()


class SmtpSendRequest(BaseModel):
    to:      EmailStr
    subject: str
    body:    str


@router.post("/send-smtp")
async def send_via_smtp(req: SmtpSendRequest, current_user=Depends(get_current_user)):
    """Send email from the logged-in user's email address via SMTP."""
    db   = get_db()
    user = await db["users"].find_one({"userId": current_user["userId"]})
    smtp_pass = user.get("smtp_pass", "") if user else ""

    if not smtp_pass:
        raise HTTPException(
            status_code=503,
            detail="Email password not configured. Go to your Account settings and save your email password.",
        )
    try:
        result = await send_email_smtp(
            to=req.to, subject=req.subject, body=req.body,
            from_email=current_user["email"],
            from_pass=smtp_pass,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send: {str(e)}")


@router.get("/smtp-status")
async def smtp_status(current_user=Depends(get_current_user)):
    """Check if the logged-in user has SMTP configured."""
    db   = get_db()
    user = await db["users"].find_one({"userId": current_user["userId"]})
    configured = bool(user and user.get("smtp_pass"))
    return {"configured": configured, "from": current_user["email"] if configured else None}


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
