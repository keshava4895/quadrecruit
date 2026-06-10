import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from models.models import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    InviteUser, ProfileUpdate, UserRoleUpdate,
)
from services.auth_service import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin,
)
from database import get_db
from pydantic import BaseModel

router = APIRouter()

VALID_ROLES = {"admin", "editor", "viewer", "recruiter"}


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
        userId=user_id, name=doc["name"], email=doc["email"],
        role=doc["role"], is_active=True, created_at=now,
    )
    return TokenResponse(
        access_token=create_token(user_id, doc["email"], doc["role"]),
        user=user_out,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db   = get_db()
    user = await db["users"].find_one({"email": body.email.lower()})

    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    user_out = UserResponse(
        userId=user["userId"], name=user["name"], email=user["email"],
        role=user.get("role", "recruiter"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"],
    )
    return TokenResponse(
        access_token=create_token(user["userId"], user["email"], user_out.role),
        user=user_out,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    return current_user


@router.patch("/me")
async def update_me(body: ProfileUpdate, current_user=Depends(get_current_user)):
    """Update own name or password."""
    db     = get_db()
    update = {}

    if body.name and body.name.strip():
        update["name"] = body.name.strip()

    if body.new_password:
        if not body.current_password:
            raise HTTPException(400, "current_password is required to set a new password")
        user_doc = await db["users"].find_one({"userId": current_user["userId"]})
        if not verify_password(body.current_password, user_doc["password"]):
            raise HTTPException(400, "Current password is incorrect")
        if len(body.new_password) < 6:
            raise HTTPException(400, "New password must be at least 6 characters")
        update["password"] = hash_password(body.new_password)

    if not update:
        raise HTTPException(400, "Nothing to update")

    await db["users"].update_one({"userId": current_user["userId"]}, {"$set": update})
    updated = await db["users"].find_one(
        {"userId": current_user["userId"]}, {"_id": 0, "password": 0}
    )
    return updated


# ── Admin: user management ────────────────────────────────────────────────────

@router.get("/users")
async def list_users(current_user=Depends(require_admin)):
    db    = get_db()
    users = await db["users"].find({}, {"_id": 0, "password": 0}).to_list(200)
    return users


@router.post("/invite", status_code=201)
async def invite_user(body: InviteUser, current_user=Depends(require_admin)):
    """Admin creates a new team member with an assigned role."""
    if body.role not in VALID_ROLES:
        raise HTTPException(400, f"role must be one of: {', '.join(sorted(VALID_ROLES))}")

    db = get_db()
    if await db["users"].find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already registered")

    user_id = str(uuid.uuid4())
    now     = datetime.now(timezone.utc)
    doc = {
        "userId":     user_id,
        "name":       body.name.strip(),
        "email":      body.email.lower(),
        "password":   hash_password(body.password),
        "role":       body.role,
        "created_at": now,
        "is_active":  True,
    }
    await db["users"].insert_one(doc)
    doc.pop("password")
    return doc


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UserRoleUpdate,
    current_user=Depends(require_admin),
):
    """Admin updates a user's role or active status."""
    if user_id == current_user["userId"] and body.role and body.role != "admin":
        raise HTTPException(400, "Cannot remove admin role from your own account")

    if body.role and body.role not in VALID_ROLES:
        raise HTTPException(400, f"role must be one of: {', '.join(sorted(VALID_ROLES))}")

    db     = get_db()
    update = {}
    if body.role is not None:
        update["role"] = body.role
    if body.is_active is not None:
        update["is_active"] = body.is_active

    if not update:
        raise HTTPException(400, "Nothing to update")

    r = await db["users"].update_one({"userId": user_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(404, "User not found")

    updated = await db["users"].find_one({"userId": user_id}, {"_id": 0, "password": 0})
    return updated


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user=Depends(require_admin)):
    if current_user["userId"] == user_id:
        raise HTTPException(400, "Cannot delete your own account")
    db = get_db()
    r  = await db["users"].delete_one({"userId": user_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"deleted": True}


# ── Email / SMTP settings per user ────────────────────────────────────────────

class EmailSettingsBody(BaseModel):
    smtp_pass:  str
    smtp_email: str = ""


@router.post("/email-settings")
async def save_email_settings(body: EmailSettingsBody, current_user=Depends(get_current_user)):
    db = get_db()
    update: dict = {"smtp_pass": body.smtp_pass}
    update["smtp_email"] = body.smtp_email.strip().lower() if body.smtp_email.strip() else ""
    await db["users"].update_one(
        {"userId": current_user["userId"]},
        {"$set": update},
    )
    return {"saved": True}


@router.get("/email-settings")
async def get_email_settings(current_user=Depends(get_current_user)):
    db   = get_db()
    user = await db["users"].find_one({"userId": current_user["userId"]})
    configured = bool(user and user.get("smtp_pass"))
    smtp_email = (user or {}).get("smtp_email", "") or current_user["email"]
    return {"configured": configured, "email": smtp_email}


@router.delete("/email-settings")
async def clear_email_settings(current_user=Depends(get_current_user)):
    db = get_db()
    await db["users"].update_one(
        {"userId": current_user["userId"]},
        {"$unset": {"smtp_pass": ""}},
    )
    return {"cleared": True}
