# routes/feedback_routes.py
from fastapi import APIRouter
from models.models import InterviewerFeedback, CandidateFeedback
from services.feedback_service import (
    store_interviewer_feedback, store_candidate_feedback, summarise_feedback
)

router = APIRouter()

@router.post("/interviewer")
async def interviewer_feedback(fb: InterviewerFeedback):
    return await store_interviewer_feedback(fb.model_dump())

@router.post("/candidate")
async def candidate_feedback(fb: CandidateFeedback):
    return await store_candidate_feedback(fb.model_dump())

@router.get("/summary/{candidate_id}")
async def feedback_summary(candidate_id: str):
    summary = await summarise_feedback(candidate_id)
    return {"candidateId": candidate_id, "summary": summary}
