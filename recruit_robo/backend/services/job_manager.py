from uuid import uuid4
from datetime import datetime, timezone

from database import get_db
from models.models import JobCreate


async def create_job(job_data: JobCreate) -> dict:
    """Create a job, generate a unique ID, and initialise pipeline collections."""
    db = get_db()
    job_id = f"JOB_{str(uuid4())[:8].upper()}"

    doc = job_data.model_dump()
    doc.update({
        "jobId": job_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
    })

    await db.job_info.insert_one(doc)

    # Seed pipeline timeline
    await db.pipeline_timelines.insert_one({
        "jobId": job_id,
        "timeline": [{"stage": "Job Created",
                      "ts": datetime.now(timezone.utc).isoformat()}],
    })

    return {"jobId": job_id, "message": "Job created successfully"}


async def list_jobs() -> list:
    db = get_db()
    cursor = db.job_info.find({}, {"_id": 0})
    jobs = await cursor.to_list(length=100)
    jobs.sort(key=lambda j: j.get("created_at") or "", reverse=True)
    return jobs


async def get_job(job_id: str) -> dict | None:
    db = get_db()
    return await db.job_info.find_one({"jobId": job_id}, {"_id": 0})


async def delete_job(job_id: str) -> bool:
    db = get_db()
    result = await db.job_info.delete_one({"jobId": job_id})
    return result.deleted_count > 0
