"""
Outreach routes — candidate interest email + self-scheduling flow.

Public endpoints (no auth):  GET/POST /outreach/respond/{token}
                              POST     /outreach/book/{token}
Auth-required endpoints:     POST     /outreach/send
                              GET      /outreach/
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import get_db
from services.auth_service import get_current_user
from services.email_service import _smtp_settings_for
from models.models import OutreachCreate
from config import FRONTEND_URL, SMTP_USER, SMTP_PASS

router = APIRouter()


# ── helpers ───────────────────────────────────────────────────────────────────

def _meeting_link() -> str:
    return f"https://meet.jit.si/rr-{uuid.uuid4().hex[:8]}"


async def _get_smtp(db, user_id: str):
    """Resolve SMTP credentials for a user; falls back to system .env creds."""
    user = await db["users"].find_one({"userId": user_id})
    if user:
        pw = user.get("smtp_pass", "")
        em = user.get("smtp_email", "") or user.get("email", "")
        if pw and em:
            return em, pw
    if SMTP_USER and SMTP_PASS:
        return SMTP_USER, SMTP_PASS
    return None, None


async def _send_html(from_email: str, from_pass: str, to: str, subject: str, html: str):
    host, port = _smtp_settings_for(from_email)

    def _do():
        msg = MIMEMultipart("alternative")
        msg["From"] = from_email
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(host, port) as s:
            s.ehlo()
            s.starttls()
            s.login(from_email, from_pass)
            s.sendmail(from_email, [to], msg.as_string())

    await asyncio.get_event_loop().run_in_executor(None, _do)


def _fmt_slot(slot: dict) -> str:
    """Human-readable slot label, e.g. 'Monday, Jun 16 · 2:00 PM – 3:00 PM'"""
    try:
        from datetime import date as _date, time as _time
        d = _date.fromisoformat(slot["slot_date"])
        label = d.strftime("%A, %b %d")
        def _fmt_t(t_str):
            h, m = map(int, t_str.split(":"))
            ampm = "AM" if h < 12 else "PM"
            h12 = h % 12 or 12
            return f"{h12}:{m:02d} {ampm}"
        return f"{label} · {_fmt_t(slot['start_time'])} – {_fmt_t(slot['end_time'])}"
    except Exception:
        return f"{slot.get('slot_date', '')} {slot.get('start_time', '')}–{slot.get('end_time', '')}"


# ── HTML email templates ──────────────────────────────────────────────────────

def _interest_email_html(
    candidate_name: str, job_title: str, hr_name: str,
    respond_url: str, personal_note: str = ""
) -> str:
    note_block = (
        f'<div style="background:#f8f5ff;border-left:3px solid #7c3aed;padding:12px 16px;'
        f'border-radius:6px;margin:0 0 20px">'
        f'<p style="margin:0;font-size:14px;color:#555;line-height:1.6">{personal_note}</p></div>'
    ) if personal_note else ""

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;
  background:#f1f0f7;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#49029F,#7c3aed);border-radius:16px 16px 0 0;
    padding:28px 32px">
    <p style="margin:0 0 4px;color:rgba(255,255,255,.7);font-size:12px;
      text-transform:uppercase;letter-spacing:.08em">Recruit Robo</p>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">
      You've been invited!</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,.75);font-size:15px">{job_title}</p>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 32px;
    box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <p style="margin:0 0 16px;font-size:16px;color:#111">Hi {candidate_name},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.7">
      <strong>{hr_name}</strong> from the recruitment team has personally selected your
      profile for the role of <strong>{job_title}</strong>. We'd love to have a
      conversation with you.
    </p>
    {note_block}
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7">
      Are you interested in learning more? If yes, you'll be able to choose a
      time slot that works best for you.
    </p>
    <div style="text-align:center;margin:0 0 28px">
      <a href="{respond_url}?intent=yes"
        style="display:inline-block;background:linear-gradient(135deg,#49029F,#7c3aed);
          color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;
          font-size:15px;font-weight:600;margin:0 8px 12px;letter-spacing:.01em">
        ✓&nbsp;&nbsp;Yes, I'm Interested
      </a>
      <a href="{respond_url}?intent=no"
        style="display:inline-block;background:#f1f0f7;color:#666;text-decoration:none;
          padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;
          margin:0 8px 12px">
        Not Interested
      </a>
    </div>
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">
      Sent by {hr_name} via Recruit Robo &nbsp;·&nbsp;
      Your response helps us respect your time.
    </p>
  </div>
</div>
</body></html>"""


def _confirmation_email_html(
    to_name: str, role: str, job_title: str,
    formatted_dt: str, duration: int, meeting_link: str,
    candidate_name: str = "", interviewer_name: str = "", hr_name: str = ""
) -> str:
    if role == "candidate":
        intro = (f"Your interview for <strong>{job_title}</strong> has been confirmed. "
                 f"<strong>{interviewer_name}</strong> will be conducting your interview.")
    elif role == "interviewer":
        intro = (f"An interview has been scheduled for you with candidate "
                 f"<strong>{candidate_name}</strong> for the role of <strong>{job_title}</strong>.")
    else:
        intro = (f"Interview confirmed: <strong>{candidate_name}</strong> for "
                 f"<strong>{job_title}</strong> with <strong>{interviewer_name}</strong>.")

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;
  background:#f1f0f7;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#49029F,#7c3aed);
    border-radius:16px 16px 0 0;padding:24px 32px">
    <p style="margin:0 0 4px;color:rgba(255,255,255,.7);font-size:12px;
      text-transform:uppercase;letter-spacing:.08em">Interview Confirmed</p>
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">{job_title}</h1>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 32px;
    box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <p style="margin:0 0 20px;font-size:16px;color:#111">Hi {to_name},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.7">{intro}</p>
    <div style="background:#f8f5ff;border-radius:12px;padding:18px 20px;margin:0 0 24px">
      <table style="width:100%;font-size:13px;color:#555;border-collapse:collapse">
        <tr><td style="padding:5px 0;color:#888;width:100px">Date &amp; Time</td>
            <td style="padding:5px 0;font-weight:600;color:#111">{formatted_dt}</td></tr>
        <tr><td style="padding:5px 0;color:#888">Duration</td>
            <td style="padding:5px 0;color:#111">{duration} minutes</td></tr>
        {'<tr><td style="padding:5px 0;color:#888">Interviewer</td><td style="padding:5px 0;color:#111">' + interviewer_name + '</td></tr>' if interviewer_name and role != 'interviewer' else ''}
        {'<tr><td style="padding:5px 0;color:#888">Candidate</td><td style="padding:5px 0;color:#111">' + candidate_name + '</td></tr>' if candidate_name and role == 'interviewer' else ''}
      </table>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <a href="{meeting_link}"
        style="display:inline-block;background:linear-gradient(135deg,#49029F,#7c3aed);
          color:#fff;text-decoration:none;padding:13px 32px;border-radius:10px;
          font-size:14px;font-weight:600">
        🎥&nbsp; Join Meeting
      </a>
    </div>
    <p style="margin:0;font-size:11px;color:#bbb;text-align:center">
      Scheduled via Recruit Robo &nbsp;·&nbsp; Keep this link safe.
    </p>
  </div>
</div>
</body></html>"""


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/send")
async def send_interest_email(body: OutreachCreate, current_user=Depends(get_current_user)):
    """HR sends an interest/invitation email to a candidate."""
    db = get_db()

    candidate   = await db["candidates"].find_one({"candidateId": body.candidateId})
    job         = await db["jobs"].find_one({"jobId": body.jobId})
    interviewer = await db["interviewers"].find_one({"interviewerId": body.interviewerId})

    if not candidate:   raise HTTPException(404, "Candidate not found")
    if not job:         raise HTTPException(404, "Job not found")
    if not interviewer: raise HTTPException(404, "Interviewer not found")

    # Verify at least one slot is valid and available
    valid_slots = []
    for sid in body.offered_slot_ids:
        s = await db["interviewer_availability"].find_one({"slotId": sid, "is_booked": False})
        if s:
            valid_slots.append(s)
    if not valid_slots:
        raise HTTPException(400, "No valid available slots found. Add slots on the Interviewers page first.")

    token       = str(uuid.uuid4())
    outreach_id = str(uuid.uuid4())
    now_iso     = datetime.now(timezone.utc).isoformat()

    doc = {
        "outreachId":      outreach_id,
        "token":           token,
        "candidateId":     body.candidateId,
        "candidateName":   candidate.get("name", ""),
        "candidateEmail":  candidate.get("email", ""),
        "jobId":           body.jobId,
        "jobTitle":        job.get("title", ""),
        "interviewerId":   body.interviewerId,
        "interviewerName": interviewer.get("name", ""),
        "interviewerEmail":interviewer.get("email", ""),
        "hrId":            current_user["userId"],
        "hrName":          current_user["name"],
        "hrEmail":         current_user["email"],
        "offered_slot_ids":body.offered_slot_ids,
        "personal_note":   body.personal_note or "",
        "status":          "sent",
        "selected_slot_id":None,
        "interview_id":    None,
        "meeting_link":    None,
        "sent_at":         now_iso,
        "responded_at":    None,
        "scheduled_at":    None,
    }
    await db["candidate_outreach"].insert_one(doc)

    from_email, from_pass = await _get_smtp(db, current_user["userId"])
    if not from_email:
        await db["candidate_outreach"].delete_one({"outreachId": outreach_id})
        raise HTTPException(
            503,
            "Email not configured. Go to Account Settings → Connect Outlook to set up email sending."
        )

    respond_url = f"{FRONTEND_URL}/respond/{token}"
    html = _interest_email_html(
        candidate_name=candidate.get("name", ""),
        job_title=job.get("title", ""),
        hr_name=current_user["name"],
        respond_url=respond_url,
        personal_note=body.personal_note or "",
    )

    try:
        await _send_html(from_email, from_pass, candidate.get("email", ""),
                         f"Invitation: {job.get('title', 'Role')} Opportunity", html)
    except Exception as e:
        await db["candidate_outreach"].delete_one({"outreachId": outreach_id})
        raise HTTPException(502, f"Failed to send email: {e}")

    await db["candidate_activity"].insert_one({
        "activityId":  str(uuid.uuid4()),
        "candidateId": body.candidateId,
        "type":        "outreach_sent",
        "description": f"Interest email sent for {job.get('title', '')}",
        "by":          current_user["name"],
        "created_at":  now_iso,
    })

    return {"outreachId": outreach_id, "token": token, "sent": True}


@router.get("/")
async def list_outreach(current_user=Depends(get_current_user)):
    """List all outreach records for HR overview."""
    db = get_db()
    docs = await db["candidate_outreach"].find({}, {"_id": 0}).to_list(200)
    docs.sort(key=lambda x: x.get("sent_at", ""), reverse=True)
    return docs


@router.get("/respond/{token}")
async def get_outreach_for_candidate(token: str):
    """Public — no auth. Returns outreach info + available slots for the respond page."""
    db = get_db()
    outreach = await db["candidate_outreach"].find_one({"token": token})
    if not outreach:
        raise HTTPException(404, "Invalid or expired link")
    outreach.pop("_id", None)
    # Redact sensitive internal IDs
    outreach.pop("hrId", None)

    slots = []
    if outreach.get("status") in ("sent", "interested"):
        for sid in outreach.get("offered_slot_ids", []):
            s = await db["interviewer_availability"].find_one({"slotId": sid})
            if s and not s.get("is_booked"):
                s.pop("_id", None)
                slots.append(s)
    slots.sort(key=lambda x: (x.get("slot_date", ""), x.get("start_time", "")))

    return {"outreach": outreach, "slots": slots}


@router.post("/respond/{token}")
async def record_candidate_response(token: str, body: dict):
    """Public — candidate responds 'interested' or 'declined'."""
    db = get_db()
    outreach = await db["candidate_outreach"].find_one({"token": token})
    if not outreach:
        raise HTTPException(404, "Invalid or expired link")

    if outreach["status"] not in ("sent",):
        # Already responded — return current state + slots if still relevant
        slots = []
        if outreach["status"] == "interested":
            for sid in outreach.get("offered_slot_ids", []):
                s = await db["interviewer_availability"].find_one({"slotId": sid})
                if s and not s.get("is_booked"):
                    s.pop("_id", None)
                    slots.append(s)
        return {"status": outreach["status"], "slots": slots, "already_responded": True}

    response = (body.get("response") or "").lower()
    if response not in ("interested", "declined"):
        raise HTTPException(400, "response must be 'interested' or 'declined'")

    new_status = "interested" if response == "interested" else "declined"
    await db["candidate_outreach"].update_one(
        {"token": token},
        {"$set": {"status": new_status, "responded_at": datetime.now(timezone.utc).isoformat()}}
    )

    await db["candidate_activity"].insert_one({
        "activityId":  str(uuid.uuid4()),
        "candidateId": outreach["candidateId"],
        "type":        "outreach_responded",
        "description": f"Candidate {response} for {outreach.get('jobTitle', '')}",
        "by":          outreach.get("candidateName", "Candidate"),
        "created_at":  datetime.now(timezone.utc).isoformat(),
    })

    slots = []
    if new_status == "interested":
        for sid in outreach.get("offered_slot_ids", []):
            s = await db["interviewer_availability"].find_one({"slotId": sid})
            if s and not s.get("is_booked"):
                s.pop("_id", None)
                slots.append(s)
        slots.sort(key=lambda x: (x.get("slot_date", ""), x.get("start_time", "")))

    return {"status": new_status, "slots": slots}


@router.post("/book/{token}")
async def book_slot(token: str, body: dict):
    """Public — candidate selects a time slot and confirms the interview."""
    db = get_db()
    outreach = await db["candidate_outreach"].find_one({"token": token})
    if not outreach:
        raise HTTPException(404, "Invalid or expired link")

    if outreach["status"] == "scheduled":
        return {
            "already_scheduled": True,
            "meeting_link": outreach.get("meeting_link"),
            "scheduled_at": outreach.get("scheduled_at"),
        }
    if outreach["status"] == "declined":
        raise HTTPException(400, "Candidate has declined this opportunity")

    slot_id = (body.get("slot_id") or "").strip()
    if not slot_id:
        raise HTTPException(400, "slot_id is required")
    if slot_id not in outreach.get("offered_slot_ids", []):
        raise HTTPException(403, "Slot not part of this invitation")

    slot = await db["interviewer_availability"].find_one({"slotId": slot_id})
    if not slot:
        raise HTTPException(404, "Slot not found")
    if slot.get("is_booked"):
        raise HTTPException(409, "This slot is already taken. Please go back and choose another.")

    meeting = _meeting_link()
    scheduled_at = f"{slot['slot_date']}T{slot['start_time']}:00"
    interview_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    interview_doc = {
        "interviewId":      interview_id,
        "candidateId":      outreach["candidateId"],
        "candidateName":    outreach["candidateName"],
        "candidateEmail":   outreach["candidateEmail"],
        "jobId":            outreach["jobId"],
        "jobTitle":         outreach["jobTitle"],
        "interviewerId":    outreach["interviewerId"],
        "interviewerName":  outreach["interviewerName"],
        "interviewerEmail": outreach["interviewerEmail"],
        "round":            1,
        "type":             "video",
        "scheduled_at":     scheduled_at,
        "duration_mins":    slot.get("duration_mins", 60),
        "status":           "scheduled",
        "meeting_link":     meeting,
        "location":         None,
        "notes":            outreach.get("personal_note", ""),
        "feedback":         None,
        "rating":           None,
        "created_by":       outreach["hrId"],
        "created_by_name":  outreach["hrName"],
        "created_at":       now_iso,
        "updated_at":       now_iso,
        "outreach_id":      outreach["outreachId"],
    }
    await db["scheduled_interviews"].insert_one(interview_doc)

    await db["interviewer_availability"].update_one(
        {"slotId": slot_id},
        {"$set": {"is_booked": True, "booked_for": outreach["candidateId"], "interview_id": interview_id}}
    )
    await db["candidate_outreach"].update_one(
        {"token": token},
        {"$set": {
            "status": "scheduled",
            "selected_slot_id": slot_id,
            "interview_id": interview_id,
            "meeting_link": meeting,
            "scheduled_at": scheduled_at,
        }}
    )
    await db["candidate_activity"].insert_one({
        "activityId":  str(uuid.uuid4()),
        "candidateId": outreach["candidateId"],
        "type":        "interview_scheduled",
        "description": f"Interview self-scheduled for {outreach.get('jobTitle', '')} on {slot['slot_date']} {slot['start_time']}",
        "by":          outreach.get("candidateName", "Candidate"),
        "created_at":  now_iso,
    })

    # Format datetime for emails
    try:
        dt = datetime.fromisoformat(scheduled_at)
        formatted_dt = dt.strftime("%A, %B %d, %Y at %I:%M %p")
    except Exception:
        formatted_dt = scheduled_at

    duration = slot.get("duration_mins", 60)

    # Send confirmation emails — best-effort (don't fail booking if email fails)
    try:
        from_email, from_pass = await _get_smtp(db, outreach["hrId"])
        if from_email and from_pass:
            await _send_html(
                from_email, from_pass,
                outreach["candidateEmail"],
                f"Interview Confirmed: {outreach['jobTitle']}",
                _confirmation_email_html(
                    to_name=outreach["candidateName"], role="candidate",
                    job_title=outreach["jobTitle"], formatted_dt=formatted_dt,
                    duration=duration, meeting_link=meeting,
                    interviewer_name=outreach["interviewerName"],
                )
            )
            await _send_html(
                from_email, from_pass,
                outreach["interviewerEmail"],
                f"Interview Scheduled: {outreach['candidateName']} — {outreach['jobTitle']}",
                _confirmation_email_html(
                    to_name=outreach["interviewerName"], role="interviewer",
                    job_title=outreach["jobTitle"], formatted_dt=formatted_dt,
                    duration=duration, meeting_link=meeting,
                    candidate_name=outreach["candidateName"],
                )
            )
            await _send_html(
                from_email, from_pass,
                outreach["hrEmail"],
                f"Interview Booked: {outreach['candidateName']} for {outreach['jobTitle']}",
                _confirmation_email_html(
                    to_name=outreach["hrName"], role="hr",
                    job_title=outreach["jobTitle"], formatted_dt=formatted_dt,
                    duration=duration, meeting_link=meeting,
                    candidate_name=outreach["candidateName"],
                    interviewer_name=outreach["interviewerName"],
                )
            )
    except Exception:
        pass  # Booking is confirmed; email failures are non-fatal

    return {
        "scheduled": True,
        "interview_id": interview_id,
        "meeting_link": meeting,
        "scheduled_at": scheduled_at,
        "duration_mins": duration,
        "jobTitle": outreach["jobTitle"],
        "interviewerName": outreach["interviewerName"],
    }
