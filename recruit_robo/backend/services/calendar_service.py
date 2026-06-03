from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from database import get_db
from datetime import datetime, timezone


def _build_service(token: dict):
    creds = Credentials.from_authorized_user_info(token)
    return build("calendar", "v3", credentials=creds)


async def schedule_interview(
    candidate_email: str,
    interviewer_email: str,
    candidate_id: str,
    job_id: str,
    start_time: str,
    end_time: str,
    token: dict,
    round_num: int = 1,
) -> dict:
    service = _build_service(token)
    event = {
        "summary": f"Interview – Round {round_num}",
        "description": f"Recruit Robo automated interview\nJob: {job_id}",
        "start": {"dateTime": start_time, "timeZone": "UTC"},
        "end":   {"dateTime": end_time,   "timeZone": "UTC"},
        "attendees": [
            {"email": candidate_email},
            {"email": interviewer_email},
        ],
        "conferenceData": {
            "createRequest": {"requestId": f"{candidate_id}-{job_id}-r{round_num}"}
        },
        "reminders": {
            "useDefault": False,
            "overrides": [{"method": "email", "minutes": 60},
                          {"method": "popup", "minutes": 15}],
        },
    }
    created = service.events().insert(
        calendarId="primary",
        body=event,
        conferenceDataVersion=1,
        sendUpdates="all",
    ).execute()

    # Store in DB
    db = get_db()
    await db.interview_schedules.insert_one({
        "candidateId": candidate_id,
        "jobId": job_id,
        "round": round_num,
        "interviewer": interviewer_email,
        "eventId": created.get("id"),
        "meetLink": created.get("hangoutLink"),
        "start": start_time,
        "end": end_time,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc),
    })
    return created


async def get_schedule(candidate_id: str) -> list:
    db = get_db()
    cursor = db.interview_schedules.find({"candidateId": candidate_id}, {"_id": 0})
    docs = await cursor.to_list(length=20)
    docs.sort(key=lambda d: d.get("round") or 0)
    return docs
