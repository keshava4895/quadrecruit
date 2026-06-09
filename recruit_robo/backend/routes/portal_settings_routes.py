from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
from services.auth_service import get_current_user

router = APIRouter()


# ── Naukri ────────────────────────────────────────────────────────────────────

class NaukriCredentials(BaseModel):
    rapidapi_key: str
    email:        str = ""
    password:     str = ""


@router.post("/naukri")
async def save_naukri_credentials(body: NaukriCredentials, _=Depends(get_current_user)):
    db = get_db()
    await db["settings"].update_one(
        {"key": "naukri_credentials"},
        {"$set": {
            "key":          "naukri_credentials",
            "rapidapi_key": body.rapidapi_key.strip(),
            "email":        body.email.strip(),
            "password":     body.password,
        }},
        upsert=True,
    )
    return {"saved": True}


@router.get("/naukri")
async def get_naukri_credentials(_=Depends(get_current_user)):
    db  = get_db()
    doc = await db["settings"].find_one({"key": "naukri_credentials"})
    if not doc:
        return {"configured": False}
    return {
        "configured":  bool(doc.get("rapidapi_key")),
        "email":       doc.get("email", ""),
        "has_password": bool(doc.get("password")),
    }


@router.delete("/naukri")
async def delete_naukri_credentials(_=Depends(get_current_user)):
    db = get_db()
    await db["settings"].delete_one({"key": "naukri_credentials"})
    return {"cleared": True}


# ── LinkedIn (Unipile) ────────────────────────────────────────────────────────

class LinkedInCredentials(BaseModel):
    unipile_api_key:  str
    unipile_base_url: str = "https://api45.unipile.com:17538"


@router.post("/linkedin")
async def save_linkedin_credentials(body: LinkedInCredentials, _=Depends(get_current_user)):
    db = get_db()
    await db["settings"].update_one(
        {"key": "linkedin_credentials"},
        {"$set": {
            "key":              "linkedin_credentials",
            "unipile_api_key":  body.unipile_api_key.strip(),
            "unipile_base_url": body.unipile_base_url.strip(),
        }},
        upsert=True,
    )
    return {"saved": True}


@router.get("/linkedin")
async def get_linkedin_credentials(_=Depends(get_current_user)):
    db  = get_db()
    doc = await db["settings"].find_one({"key": "linkedin_credentials"})
    if not doc:
        return {"configured": False}
    return {
        "configured":       bool(doc.get("unipile_api_key")),
        "unipile_base_url": doc.get("unipile_base_url", ""),
    }


@router.delete("/linkedin")
async def delete_linkedin_credentials(_=Depends(get_current_user)):
    db = get_db()
    await db["settings"].delete_one({"key": "linkedin_credentials"})
    return {"cleared": True}
