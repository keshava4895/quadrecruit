from datetime import datetime, timezone
from openai import AsyncAzureOpenAI
from database import get_db
from services.lifecycle_engine import process_feedback_decision
from config import AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, OPENAI_MODEL

openai_client = AsyncAzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION,
)


async def store_interviewer_feedback(data: dict) -> dict:
    db = get_db()
    data["created_at"] = datetime.now(timezone.utc)
    await db.interview_feedback.insert_one(data)

    result = await process_feedback_decision(
        candidate_id=data["candidateId"],
        job_id=data["jobId"],
        decision=data["decision"],
        current_round=data.get("round", 1),
    )
    return {"feedback_stored": True, "lifecycle": result}


async def store_candidate_feedback(data: dict) -> dict:
    db = get_db()
    data["type"] = "candidate"
    data["created_at"] = datetime.now(timezone.utc)
    await db.interview_feedback.insert_one(data)
    return {"feedback_stored": True}


async def summarise_feedback(candidate_id: str) -> str:
    """Use LLM to produce a plain-English summary of all feedback for a candidate."""
    db = get_db()
    entries = await db.interview_feedback.find(
        {"candidateId": candidate_id}, {"_id": 0}
    ).to_list(length=20)

    if not entries:
        return "No feedback available yet."

    text = "\n".join(
        f"Round {e.get('round','?')}: rating={e.get('rating','?')}, "
        f"decision={e.get('decision','?')}, comments={e.get('comments','')}"
        for e in entries
    )
    resp = await openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "Summarise candidate interview feedback in 2-3 sentences."},
            {"role": "user",   "content": text},
        ],
        temperature=0.4, max_tokens=200,
    )
    return resp.choices[0].message.content.strip()
