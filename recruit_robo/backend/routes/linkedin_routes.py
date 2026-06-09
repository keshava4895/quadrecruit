from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.unipile_service import (
    get_accounts, generate_connect_link,
    search_people, send_linkedin_message, disconnect_account,
)
from services.portal_settings import get_linkedin_creds

router = APIRouter()


async def _creds():
    c = await get_linkedin_creds()
    if not c.get("unipile_api_key"):
        raise HTTPException(503, "LinkedIn (Unipile) API key not configured. Go to Account settings → Portals → LinkedIn.")
    return c


# ── Account management ────────────────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts():
    """List all LinkedIn accounts connected via Unipile."""
    creds = await _creds()
    try:
        accounts = await get_accounts(api_key=creds["unipile_api_key"], base_url=creds["unipile_base_url"])
        return {"accounts": accounts, "count": len(accounts)}
    except Exception as e:
        raise HTTPException(502, f"Unipile error: {e}")


@router.get("/connect")
async def connect_linkedin(
    user_id:   str = Query(...),
    user_name: str = Query(""),
):
    """Generate a Unipile hosted-auth URL for the user to connect their LinkedIn account."""
    creds = await _creds()
    try:
        url = await generate_connect_link(
            user_name=user_name, user_id=user_id,
            api_key=creds["unipile_api_key"], base_url=creds["unipile_base_url"],
        )
        return {"url": url}
    except Exception as e:
        raise HTTPException(502, f"Could not generate connect link: {e}")


@router.delete("/accounts/{account_id}")
async def remove_account(account_id: str):
    creds = await _creds()
    ok = await disconnect_account(account_id, api_key=creds["unipile_api_key"], base_url=creds["unipile_base_url"])
    if not ok:
        raise HTTPException(502, "Failed to disconnect account")
    return {"disconnected": True}


# ── People search ─────────────────────────────────────────────────────────────

@router.get("/search")
async def search_linkedin_profiles(
    account_id: str = Query(..., description="Unipile account ID of connected LinkedIn"),
    query:      str = Query(..., description="Job title or keywords"),
    location:   str = Query("", description="Location filter"),
    limit:      int = Query(10, ge=1, le=50),
):
    """Search LinkedIn candidate profiles via the connected account."""
    creds = await _creds()
    try:
        candidates = await search_people(
            account_id=account_id, query=query, location=location, limit=limit,
            api_key=creds["unipile_api_key"], base_url=creds["unipile_base_url"],
        )
        return {"total": len(candidates), "candidates": candidates}
    except Exception as e:
        raise HTTPException(502, f"LinkedIn search failed: {e}")


# ── Messaging ─────────────────────────────────────────────────────────────────

class MessageRequest(BaseModel):
    account_id:  str
    profile_url: str
    message:     str


@router.post("/message")
async def send_message(body: MessageRequest):
    """Send a LinkedIn DM to a candidate profile via Unipile."""
    creds = await _creds()
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")
    try:
        result = await send_linkedin_message(
            account_id=body.account_id, profile_url=body.profile_url, message=body.message,
            api_key=creds["unipile_api_key"], base_url=creds["unipile_base_url"],
        )
        return {"sent": True, "result": result}
    except Exception as e:
        raise HTTPException(502, f"Failed to send message: {e}")
