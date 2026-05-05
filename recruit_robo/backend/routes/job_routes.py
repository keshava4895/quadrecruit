# routes/job_routes.py
from fastapi import APIRouter, HTTPException
from models.models import JobCreate
from services.job_manager import create_job, list_jobs, get_job, delete_job
from services.screening_service import extract_job_requirements

router = APIRouter()

@router.post("/")
async def create_job_route(job: JobCreate):
    return await create_job(job)

@router.post("/parse")
async def parse_job_description(payload: dict):
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

@router.delete("/{job_id}")
async def delete_job_route(job_id: str):
    ok = await delete_job(job_id)
    if not ok:
        raise HTTPException(404, "Job not found")
    return {"deleted": job_id}
