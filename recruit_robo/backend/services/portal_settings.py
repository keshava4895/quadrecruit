from database import get_db
from config import UNIPILE_API_KEY, UNIPILE_BASE_URL, NAUKRI_EMAIL, NAUKRI_PASSWORD


async def get_naukri_creds() -> dict:
    db  = get_db()
    doc = await db["settings"].find_one({"key": "naukri_credentials"})
    if doc and doc.get("rapidapi_key"):
        return {
            "rapidapi_key": doc["rapidapi_key"],
            "email":        doc.get("email", "") or NAUKRI_EMAIL,
            "password":     doc.get("password", "") or NAUKRI_PASSWORD,
        }
    return {
        "rapidapi_key": "",
        "email":        NAUKRI_EMAIL,
        "password":     NAUKRI_PASSWORD,
    }


async def get_linkedin_creds() -> dict:
    db  = get_db()
    doc = await db["settings"].find_one({"key": "linkedin_credentials"})
    if doc and doc.get("unipile_api_key"):
        return {
            "unipile_api_key":  doc["unipile_api_key"],
            "unipile_base_url": doc.get("unipile_base_url") or UNIPILE_BASE_URL,
        }
    return {
        "unipile_api_key":  UNIPILE_API_KEY,
        "unipile_base_url": UNIPILE_BASE_URL,
    }
