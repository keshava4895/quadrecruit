from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from services.auth_service import get_current_user
from services import msgraph_service
from config import FRONTEND_URL, MS_CLIENT_ID

router = APIRouter()


@router.get("/oauth/authorize")
async def authorize(current_user=Depends(get_current_user)):
    if not MS_CLIENT_ID:
        raise HTTPException(503, "Microsoft OAuth not configured (MS_CLIENT_ID missing).")
    url = msgraph_service.get_auth_url(current_user["userId"])
    return {"url": url}


@router.get("/oauth/callback")
async def callback(code: str = "", state: str = "", error: str = ""):
    if error:
        return RedirectResponse(f"{FRONTEND_URL}/?ms_error={error}")
    if not code or not state:
        raise HTTPException(400, "Missing code or state")
    try:
        tokens = await msgraph_service.exchange_code(code)
        await msgraph_service.save_tokens(state, tokens)
    except Exception as e:
        return RedirectResponse(f"{FRONTEND_URL}/?ms_error=token_exchange_failed")
    return RedirectResponse(f"{FRONTEND_URL}/?ms_connected=1")


@router.get("/status")
async def status(current_user=Depends(get_current_user)):
    doc = await msgraph_service.get_tokens(current_user["userId"])
    return {
        "connected": bool(doc and doc.get("access_token")),
        "configured": bool(MS_CLIENT_ID),
    }


@router.delete("/disconnect")
async def disconnect(current_user=Depends(get_current_user)):
    await msgraph_service.disconnect(current_user["userId"])
    return {"disconnected": True}


@router.post("/create-meeting")
async def create_meeting(payload: dict, current_user=Depends(get_current_user)):
    try:
        result = await msgraph_service.create_teams_meeting(
            user_id=current_user["userId"],
            subject=payload.get("subject", "Interview"),
            start_dt=payload["startDateTime"],
            end_dt=payload["endDateTime"],
        )
        return result
    except RuntimeError as e:
        raise HTTPException(400, str(e))
