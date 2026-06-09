"""
Zoho Recruit OAuth routes.

One-time setup flow:
  1. GET /zoho/auth          → redirects to Zoho consent screen
  2. GET /zoho/oauth/callback → receives code, exchanges for tokens, stores refresh token in DB
  3. GET /zoho/status         → verify the connection is ready

After setup, candidate searches via POST /search/candidates with portal="zoho"
will use the stored refresh token automatically.
"""
import urllib.parse
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse

from config import ZOHO_CLIENT_ID, ZOHO_REFRESH_TOKEN, ZOHO_REDIRECT_URI, ZOHO_ACCOUNTS_URL
from database import get_db

router = APIRouter()


@router.get("/auth")
async def zoho_auth_start():
    """Redirect the browser to Zoho's OAuth consent page."""
    if not ZOHO_CLIENT_ID:
        raise HTTPException(400, "ZOHO_CLIENT_ID not set in .env")

    params = urllib.parse.urlencode({
        "scope":         "ZohoRecruit.modules.Candidates.READ",
        "client_id":     ZOHO_CLIENT_ID,
        "response_type": "code",
        "access_type":   "offline",
        "redirect_uri":  ZOHO_REDIRECT_URI,
    })
    return RedirectResponse(url=f"{ZOHO_ACCOUNTS_URL}/oauth/v2/auth?{params}")


@router.get("/oauth/callback")
async def zoho_oauth_callback(code: str = None, error: str = None):
    """Receive the OAuth code from Zoho, exchange for tokens, persist refresh token."""
    if error:
        raise HTTPException(400, f"Zoho OAuth denied: {error}")
    if not code:
        raise HTTPException(400, "Missing code parameter in Zoho callback")

    try:
        from services.zoho_service import exchange_code_for_tokens
        tokens = await exchange_code_for_tokens(code, ZOHO_REDIRECT_URI)
    except Exception as e:
        raise HTTPException(502, f"Zoho token exchange failed: {e}")

    refresh_token = tokens.get("refresh_token", "")
    if not refresh_token:
        raise HTTPException(502, "Zoho did not return a refresh token — ensure access_type=offline in the auth request")

    db = get_db()
    await db["settings"].update_one(
        {"key": "zoho_tokens"},
        {"$set": {"key": "zoho_tokens", "refresh_token": refresh_token}},
        upsert=True,
    )

    return HTMLResponse(
        "<html><body style='font-family:sans-serif;padding:40px'>"
        "<h2>✅ Zoho Recruit connected!</h2>"
        "<p>Refresh token saved. You can close this tab and use Zoho Recruit as a search portal.</p>"
        "</body></html>"
    )


@router.get("/status")
async def zoho_status():
    """Check whether Zoho Recruit is configured and ready to search."""
    db = get_db()
    doc = await db["settings"].find_one({"key": "zoho_tokens"})
    db_token = (doc.get("refresh_token", "") if doc else "") or ""

    has_token = bool(db_token or ZOHO_REFRESH_TOKEN)
    source    = "database" if db_token else ("env" if ZOHO_REFRESH_TOKEN else None)

    return {
        "client_configured": bool(ZOHO_CLIENT_ID),
        "token_configured":  has_token,
        "token_source":      source,
        "ready":             bool(ZOHO_CLIENT_ID) and has_token,
        "auth_url":          "/zoho/auth" if ZOHO_CLIENT_ID else None,
    }


@router.delete("/disconnect")
async def zoho_disconnect():
    """Remove stored Zoho refresh token from the database."""
    db = get_db()
    await db["settings"].delete_one({"key": "zoho_tokens"})
    return {"disconnected": True, "message": "Zoho Recruit token removed. Visit /zoho/auth to reconnect."}
