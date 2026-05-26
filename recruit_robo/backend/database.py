from config import COSMOS_CONNECTION_STRING, MONGO_URI, DB_NAME
from json_db import JsonDB

client = None
db = None
_using_json = False


async def connect_db():
    global client, db, _using_json

    # ── 1. Cosmos DB ──────────────────────────────────────────────────────────
    if COSMOS_CONNECTION_STRING:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(
                COSMOS_CONNECTION_STRING,
                tls=True,
                tlsAllowInvalidCertificates=True,
                retryWrites=False,
                serverSelectionTimeoutMS=8000,
                connectTimeoutMS=8000,
                socketTimeoutMS=8000,
            )
            db = client[DB_NAME]
            # Quick ping to confirm connection
            await db.command("ping")
            await _create_indexes()
            print("[DB] Connected to Azure Cosmos DB (MongoDB API)")
            return
        except Exception as e:
            print(f"[DB] Cosmos DB connection failed: {e}")

    # ── 2. Local MongoDB ──────────────────────────────────────────────────────
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000,
        )
        db = client[DB_NAME]
        await db.command("ping")
        await _create_indexes()
        print(f"[DB] Connected to local MongoDB — {DB_NAME}")
        return
    except Exception as e:
        print(f"[DB] Local MongoDB not available: {e}")

    # ── 3. JSON file fallback (zero setup) ───────────────────────────────────
    db = JsonDB()
    _using_json = True
    print("[DB] Using local JSON file storage (data/ folder) — no external DB needed")


async def _create_indexes():
    try:
        await db.candidate_info.create_index("candidateId", unique=True)
        await db.candidate_info.create_index("email")
        await db.job_info.create_index("jobId", unique=True)
        await db.job_candidates.create_index([("jobId", 1), ("match_score", -1)])
        await db.job_candidates.create_index("candidateId")
        print("[DB] Indexes ensured")
    except Exception as e:
        print(f"[DB] Index note: {e}")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
