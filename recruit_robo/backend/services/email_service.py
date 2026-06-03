import base64
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from openai import AsyncAzureOpenAI
from config import (
    AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, OPENAI_MODEL,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
)
from database import get_db
from datetime import datetime, timezone

openai_client = AsyncAzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION,
)


def _build_service(token: dict):
    creds = Credentials.from_authorized_user_info(token)
    return build("gmail", "v1", credentials=creds)


def _make_message(to: str, subject: str, body: str) -> dict:
    msg = MIMEText(body)
    msg["to"] = to
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return {"raw": raw}


async def send_email(to: str, subject: str, body: str, token: dict) -> dict:
    service = _build_service(token)
    result = service.users().messages().send(
        userId="me", body=_make_message(to, subject, body)
    ).execute()

    # Log to MongoDB
    db = get_db()
    await db.email_logs.insert_one({
        "to": to, "subject": subject,
        "status": "SENT", "messageId": result.get("id"),
        "sent_at": datetime.now(timezone.utc),
    })
    return result


# ── SMTP host auto-detection by email domain ──────────────────────────────────
_SMTP_PROVIDERS = {
    "gmail.com":          ("smtp.gmail.com",       587),
    "googlemail.com":     ("smtp.gmail.com",       587),
    "outlook.com":        ("smtp.office365.com",   587),
    "hotmail.com":        ("smtp.office365.com",   587),
    "live.com":           ("smtp.office365.com",   587),
    "office365.com":      ("smtp.office365.com",   587),
    "yahoo.com":          ("smtp.mail.yahoo.com",  587),
    "yahoo.in":           ("smtp.mail.yahoo.com",  587),
    "zoho.com":           ("smtp.zoho.com",        587),
}

def _smtp_settings_for(email: str):
    """Return (host, port) based on email domain. Falls back to .env values."""
    domain = email.split("@")[-1].lower() if "@" in email else ""
    # Check known providers
    for key, val in _SMTP_PROVIDERS.items():
        if domain == key or domain.endswith("." + key):
            return val
    # Corporate / custom domain — Office 365 is most common for business
    return (SMTP_HOST or "smtp.office365.com", SMTP_PORT or 587)


async def send_email_smtp(
    to: str,
    subject: str,
    body: str,
    from_email: str = "",
    from_pass:  str = "",
) -> dict:
    """
    Send email via SMTP from the logged-in user's own email address.
    SMTP host is auto-detected from their email domain.
    """
    sender   = from_email or SMTP_USER
    password = from_pass  or SMTP_PASS

    if not sender or not password:
        raise RuntimeError(
            "No email credentials configured. "
            "Go to Account settings → Outgoing Email and save your password."
        )

    host, port = _smtp_settings_for(sender)

    def _send():
        msg = MIMEMultipart("alternative")
        msg["From"]    = sender
        msg["To"]      = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(host, port) as server:
            server.ehlo()
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, [to], msg.as_string())

    await asyncio.get_event_loop().run_in_executor(None, _send)

    db = get_db()
    await db.email_logs.insert_one({
        "from": sender, "to": to, "subject": subject,
        "smtp_host": host,
        "status": "SENT", "sent_at": datetime.now(timezone.utc),
    })
    return {"sent": True, "to": to, "from": sender}


async def draft_outreach_email(candidate_name: str, job_title: str) -> dict:
    """Use LLM to generate a personalised outreach email."""
    prompt = f"""Write a professional, friendly recruitment outreach email for:
- Candidate: {candidate_name}
- Role: {job_title}
Return JSON with keys "subject" and "body". Body should be 3 short paragraphs max."""
    import json
    resp = await openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7, max_tokens=400,
    )
    return json.loads(resp.choices[0].message.content.strip())


async def parse_reply_intent(reply_text: str) -> str:
    """Classify a candidate reply as interested / not_interested / unclear."""
    prompt = f"""Classify the following email reply as one of:
interested | not_interested | unclear

Reply:
{reply_text}

Return only the label, nothing else."""
    resp = await openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0, max_tokens=10,
    )
    label = resp.choices[0].message.content.strip().lower()
    return label if label in ("interested", "not_interested") else "unclear"
