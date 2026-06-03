from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from services.unipile_service import (
    get_accounts, generate_connect_link,
    search_people, send_linkedin_message, disconnect_account,
)
from config import UNIPILE_API_KEY

router = APIRouter()


def _check_key():
    if not UNIPILE_API_KEY:
        raise HTTPException(503, "UNIPILE_API_KEY not configured in .env")


# ── Account management ────────────────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts():
    """List all LinkedIn accounts connected via Unipile."""
    _check_key()
    try:
        accounts = await get_accounts()
        return {"accounts": accounts, "count": len(accounts)}
    except Exception as e:
        raise HTTPException(502, f"Unipile error: {e}")


@router.get("/connect")
async def connect_linkedin(
    user_id:   str = Query(...),
    user_name: str = Query(""),
):
    """
    Generate a Unipile hosted-auth URL.
    Frontend redirects the user to this URL to connect their LinkedIn account.
    """
    _check_key()
    try:
        url = await generate_connect_link(user_name=user_name, user_id=user_id)
        return {"url": url}
    except Exception as e:
        raise HTTPException(502, f"Could not generate connect link: {e}")


@router.delete("/accounts/{account_id}")
async def remove_account(account_id: str):
    _check_key()
    ok = await disconnect_account(account_id)
    if not ok:
        raise HTTPException(502, "Failed to disconnect account")
    return {"disconnected": True}


# ── People search ─────────────────────────────────────────────────────────────

@router.get("/search")
async def search_linkedin_profiles(
    account_id: str   = Query(..., description="Unipile account ID of connected LinkedIn"),
    query:      str   = Query(..., description="Job title or keywords"),
    location:   str   = Query("", description="Location filter"),
    limit:      int   = Query(10, ge=1, le=20),
):
    """Search LinkedIn candidate profiles via the connected account."""
    _check_key()
    try:
        candidates = await search_people(
            account_id=account_id,
            query=query,
            location=location,
            limit=limit,
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
    _check_key()
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")
    try:
        result = await send_linkedin_message(
            account_id=body.account_id,
            profile_url=body.profile_url,
            message=body.message,
        )
        return {"sent": True, "result": result}
    except Exception as e:
        raise HTTPException(502, f"Failed to send message: {e}")
