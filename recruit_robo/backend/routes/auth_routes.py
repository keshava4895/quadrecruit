import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from models.models import UserRegister, UserLogin, TokenResponse, UserResponse
from services.auth_service import hash_password, verify_password, create_token, get_current_user
from database import get_db

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister):
    db = get_db()

    if await db["users"].find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now     = datetime.now(timezone.utc)

    doc = {
        "userId":     user_id,
        "name":       body.name.strip(),
        "email":      body.email.lower(),
        "password":   hash_password(body.password),
        "role":       "recruiter",
        "created_at": now,
        "is_active":  True,
    }
    await db["users"].insert_one(doc)

    user_out = UserResponse(
        userId=user_id, name=doc["name"],
        email=doc["email"], role=doc["role"], created_at=now,
    )
    return TokenResponse(access_token=create_token(user_id, doc["email"]), user=user_out)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db   = get_db()
    user = await db["users"].find_one({"email": body.email.lower()})

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    user_out = UserResponse(
        userId=user["userId"], name=user["name"],
        email=user["email"], role=user.get("role", "recruiter"),
        created_at=user["created_at"],
    )
    return TokenResponse(access_token=create_token(user["userId"], user["email"]), user=user_out)


@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    return current_user


@router.get("/users")
async def list_users(current_user=Depends(get_current_user)):
    """Admin: list all users (any authenticated user can view for now)."""
    db    = get_db()
    users = await db["users"].find({}, {"_id": 0, "password": 0}).to_list(100)
    return users


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user=Depends(get_current_user)):
    if current_user["userId"] == user_id:
        raise HTTPException(400, "Cannot delete your own account")
    db = get_db()
    r  = await db["users"].delete_one({"userId": user_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"deleted": True}


# ── Email / SMTP settings per user ────────────────────────────────────────────

class EmailSettingsBody(BaseModel):
    smtp_pass: str


@router.post("/email-settings")
async def save_email_settings(body: EmailSettingsBody, current_user=Depends(get_current_user)):
    """Save the logged-in user's SMTP password so they can send emails from their own address."""
    db = get_db()
    await db["users"].update_one(
        {"userId": current_user["userId"]},
        {"$set": {"smtp_pass": body.smtp_pass}},
    )
    return {"saved": True}


@router.get("/email-settings")
async def get_email_settings(current_user=Depends(get_current_user)):
    """Return whether SMTP is configured for this user (never return the password)."""
    db   = get_db()
    user = await db["users"].find_one({"userId": current_user["userId"]})
    configured = bool(user and user.get("smtp_pass"))
    return {
        "configured": configured,
        "email":      current_user["email"],
    }


@router.delete("/email-settings")
async def clear_email_settings(current_user=Depends(get_current_user)):
    db = get_db()
    await db["users"].update_one(
        {"userId": current_user["userId"]},
        {"$unset": {"smtp_pass": ""}},
    )
    return {"cleared": True}
