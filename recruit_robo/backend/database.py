from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URI, DB_NAME

client: AsyncIOMotorClient = None
db = None

_IS_COSMOS = "cosmos.azure.com" in MONGO_URI


async def connect_db():
    global client, db

    if _IS_COSMOS:
        # Cosmos DB for MongoDB API requires TLS and has no support for retryable writes
        client = AsyncIOMotorClient(
            MONGO_URI,
            tls=True,
            tlsAllowInvalidCertificates=True,
            retryWrites=False,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
        )
        print("[DB] Connected to Azure Cosmos DB (MongoDB API)")
    else:
        client = AsyncIOMotorClient(MONGO_URI)
        print("[DB] Connected to local MongoDB")

    db = client[DB_NAME]
    await _create_indexes()
    print(f"[DB] Database: {DB_NAME}")


async def _create_indexes():
    try:
        await db.candidate_info.create_index("candidateId", unique=True)
        await db.candidate_info.create_index("email")
        await db.job_info.create_index("jobId", unique=True)
        await db.job_candidates.create_index([("jobId", 1), ("match_score", -1)])
        await db.job_candidates.create_index("candidateId")
        print("[DB] Indexes ensured")
    except Exception as e:
        # Cosmos DB may already have these indexes from a previous run
        print(f"[DB] Index note: {e}")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
