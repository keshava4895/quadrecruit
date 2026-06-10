# routes/job_routes.py
from fastapi import APIRouter, HTTPException, Body
from models.models import JobCreate, JobPositionsUpdate
from services.job_manager import create_job, list_jobs, get_job, delete_job, update_job
from services.screening_service import extract_job_requirements

router = APIRouter()

@router.post("/")
async def create_job_route(job: JobCreate):
    return await create_job(job)

@router.post("/parse")
async def parse_job_description(payload: dict = Body(...)):
    desc = payload.get("description", "")
    if not desc:
        raise HTTPException(400, "description required")
    return await extract_job_requirements(desc)

@router.get("/")
async def list_jobs_route():
    return await list_jobs()

@router.get("/{job_id}")
async def get_job_route(job_id: str):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@router.patch("/{job_id}")
async def update_job_route(job_id: str, payload: JobPositionsUpdate):
    ok = await update_job(job_id, payload.model_dump(exclude_none=True))
    if not ok:
        raise HTTPException(404, "Job not found")
    return {"updated": job_id}

@router.delete("/{job_id}")
async def delete_job_route(job_id: str):
    ok = await delete_job(job_id)
    if not ok:
        raise HTTPException(404, "Job not found")
    return {"deleted": job_id}
