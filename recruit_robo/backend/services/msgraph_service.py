"""
Microsoft Graph API — OAuth2 + email sending.

Flow:
  1. /msgraph/oauth/authorize  → returns Microsoft login URL
  2. User signs in → Microsoft redirects to /msgraph/oauth/callback?code=...&state=<userId>
  3. Backend exchanges code for tokens → stored in db["ms_tokens"]
  4. /email/send-smtp (or direct) uses Graph API to send mail
"""
import httpx
from database import get_db
from config import MS_CLIENT_ID, MS_CLIENT_SECRET, MS_TENANT_ID, BACKEND_URL, FRONTEND_URL

SCOPES = [
    "https://graph.microsoft.com/Mail.Send",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/OnlineMeetings.ReadWrite",
    "offline_access",
]

MS_REDIRECT_URI = f"{FRONTEND_URL}/api/msgraph/oauth/callback"


def get_auth_url(user_id: str) -> str:
    scope = " ".join(SCOPES)
    import urllib.parse
    params = {
        "client_id":     MS_CLIENT_ID,
        "response_type": "code",
        "redirect_uri":  MS_REDIRECT_URI,
        "scope":         scope,
        "state":         user_id,
        "prompt":        "select_account",
    }
    return (
        f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/authorize?"
        + urllib.parse.urlencode(params)
    )


async def exchange_code(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token",
            data={
                "client_id":     MS_CLIENT_ID,
                "client_secret": MS_CLIENT_SECRET,
                "code":          code,
                "redirect_uri":  MS_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
        )
        r.raise_for_status()
        return r.json()


async def _refresh(refresh_tok: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://login.microsoftonline.com/{MS_TENANT_ID}/oauth2/v2.0/token",
            data={
                "client_id":     MS_CLIENT_ID,
                "client_secret": MS_CLIENT_SECRET,
                "refresh_token": refresh_tok,
                "grant_type":    "refresh_token",
                "scope":         " ".join(SCOPES),
            },
        )
        if r.status_code in (400, 401):
            raise RuntimeError(f"token_expired:{r.status_code}")
        r.raise_for_status()
        return r.json()


async def save_tokens(user_id: str, tokens: dict):
    db = get_db()
    await db["ms_tokens"].update_one(
        {"userId": user_id},
        {"$set": {"userId": user_id, **tokens}},
        upsert=True,
    )


async def get_tokens(user_id: str) -> dict | None:
    db = get_db()
    return await db["ms_tokens"].find_one({"userId": user_id}, {"_id": 0})


async def disconnect(user_id: str):
    db = get_db()
    await db["ms_tokens"].delete_one({"userId": user_id})


async def send_mail(user_id: str, to: str, subject: str, body: str) -> dict:
    doc = await get_tokens(user_id)
    if not doc or not doc.get("access_token"):
        raise RuntimeError(
            "Microsoft account not connected. "
            "Go to Account settings → Connect Outlook to authorise."
        )

    payload = {
        "message": {
            "subject": subject,
            "body":    {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": to}}],
        },
        "saveToSentItems": True,
    }

    async def _post(token: str):
        async with httpx.AsyncClient(timeout=15) as client:
            return await client.post(
                "https://graph.microsoft.com/v1.0/me/sendMail",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                },
                json=payload,
            )

    r = await _post(doc["access_token"])

    if r.status_code == 401 and doc.get("refresh_token"):
        new_tokens = await _refresh(doc["refresh_token"])
        await save_tokens(user_id, new_tokens)
        r = await _post(new_tokens["access_token"])

    if r.status_code not in (200, 202):
        raise RuntimeError(f"Microsoft Graph error {r.status_code}: {r.text}")

    db = get_db()
    from datetime import datetime, timezone
    await db["email_logs"].insert_one({
        "from": doc.get("email", ""), "to": to,
        "subject": subject, "status": "SENT",
        "via": "msgraph", "sent_at": datetime.now(timezone.utc),
    })
    return {"sent": True, "to": to}


async def create_teams_meeting(user_id: str, subject: str, start_dt: str, end_dt: str) -> dict:
    doc = await get_tokens(user_id)
    if not doc or not doc.get("access_token"):
        raise RuntimeError(
            "Microsoft account not connected. "
            "Go to Account settings → Connect Outlook to authorise."
        )

    payload = {
        "subject":       subject,
        "startDateTime": start_dt,
        "endDateTime":   end_dt,
    }

    async def _post(token: str):
        async with httpx.AsyncClient(timeout=15) as client:
            return await client.post(
                "https://graph.microsoft.com/v1.0/me/onlineMeetings",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                },
                json=payload,
            )

    r = await _post(doc["access_token"])

    if r.status_code == 401 and doc.get("refresh_token"):
        new_tokens = await _refresh(doc["refresh_token"])
        await save_tokens(user_id, new_tokens)
        r = await _post(new_tokens["access_token"])

    if r.status_code == 403:
        raise RuntimeError(
            "Teams meeting permission not granted. "
            "Please reconnect your Outlook account in Account settings to grant the required permissions."
        )

    if r.status_code not in (200, 201):
        raise RuntimeError(f"Teams API error {r.status_code}: {r.text}")

    data = r.json()
    return {"joinUrl": data.get("joinWebUrl"), "meetingId": data.get("id")}
