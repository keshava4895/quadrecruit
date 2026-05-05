from datetime import datetime, timezone
from database import get_db

# Valid status transitions
TRANSITIONS: dict[str, list[str]] = {
    "sourced":       ["emailed"],
    "emailed":       ["interested", "not_interested", "no_response"],
    "interested":    ["scheduled"],
    "scheduled":     ["round_1_complete"],
    "round_1_complete": ["round_2_scheduled", "rejected", "selected"],
    "round_2_scheduled": ["round_2_complete"],
    "round_2_complete":  ["rejected", "selected"],
    "rejected":      [],
    "selected":      [],
}


async def push_timeline(job_id: str, stage: str, meta: dict = None):
    """Append a stage entry to the job pipeline timeline."""
    db = get_db()
    entry = {"stage": stage, "ts": datetime.now(timezone.utc).isoformat()}
    if meta:
        entry.update(meta)
    await db.pipeline_timelines.update_one(
        {"jobId": job_id},
        {"$push": {"timeline": entry}},
        upsert=True,
    )


async def transition_candidate(
    candidate_id: str,
    job_id: str,
    new_status: str,
    interview_phase: str = None,
) -> dict:
    """
    Move a candidate to a new status.
    Validates the transition and updates both global and job-specific collections.
    """
    db = get_db()
    candidate = await db.candidate_info.find_one(
        {"candidateId": candidate_id}, {"_id": 0}
    )
    if not candidate:
        return {"error": f"Candidate {candidate_id} not found"}

    current = candidate.get("status", "sourced")
    allowed = TRANSITIONS.get(current, [])

    if new_status not in allowed:
        return {
            "error": f"Invalid transition: {current} → {new_status}",
            "allowed": allowed,
        }

    update_fields = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc),
    }
    if interview_phase:
        update_fields["interview_phase"] = interview_phase

    update = {"$set": update_fields}
    await db.candidate_info.update_one({"candidateId": candidate_id}, update)
    await db[f"job_{job_id}_candidates"].update_one(
        {"candidateId": candidate_id}, update
    )
    await push_timeline(job_id, f"Candidate {candidate_id} → {new_status}")
    return {"success": True, "status": new_status}


async def process_feedback_decision(
    candidate_id: str,
    job_id: str,
    decision: str,
    current_round: int,
) -> dict:
    """Map interviewer decision to the correct lifecycle transition."""
    mapping = {
        "Next Round": ("round_1_complete" if current_round == 1 else "round_2_scheduled",
                       f"Round {current_round + 1}"),
        "Selected":   ("selected",  "Final Round"),
        "Rejected":   ("rejected",  "Rejected"),
    }
    if decision not in mapping:
        return {"error": f"Unknown decision: {decision}"}

    new_status, phase = mapping[decision]
    return await transition_candidate(candidate_id, job_id, new_status, phase)
