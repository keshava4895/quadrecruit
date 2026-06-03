"""
Matching / scoring service.

Embedding tier priority:
  1. Azure OpenAI  — if AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT are set
  2. Standard OpenAI — if OPENAI_API_KEY is set and valid
  3. Overlap-only scoring — always works, no API key required
"""
import math
from config import (
    AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION,
    EMBEDDING_MODEL, OPENAI_API_KEY,
)


def _use_azure() -> bool:
    return bool(AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT)


def _use_openai() -> bool:
    key = OPENAI_API_KEY or ""
    return bool(key and not key.startswith("sk-...") and len(key) > 10)


def _cosine(a: list[float], b: list[float]) -> float:
    dot    = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    denom  = norm_a * norm_b
    return dot / denom if denom else 0.0


async def _embed(text: str) -> list[float] | None:
    """Return an embedding vector, or None if no AI is configured."""
    if _use_azure():
        try:
            from openai import AsyncAzureOpenAI
            client = AsyncAzureOpenAI(
                api_key=AZURE_OPENAI_API_KEY,
                azure_endpoint=AZURE_OPENAI_ENDPOINT,
                api_version=AZURE_OPENAI_API_VERSION,
            )
            resp = await client.embeddings.create(model=EMBEDDING_MODEL, input=text)
            return resp.data[0].embedding
        except Exception as e:
            print(f"[Match] Azure embed failed: {e}")

    if _use_openai():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            resp = await client.embeddings.create(model=EMBEDDING_MODEL, input=text)
            return resp.data[0].embedding
        except Exception as e:
            print(f"[Match] OpenAI embed failed: {e}")

    return None


async def compute_match(
    job_skills: list[str],
    candidate_skills: list[str],
    experience_required: int,
    experience_actual: int,
) -> float:
    """
    Hybrid match score (0.0 – 1.0).

    With AI embeddings:    60% semantic + 30% overlap + 10% experience
    Without AI embeddings: 80% overlap  + 20% experience  (no API key needed)
    """
    job_text  = ", ".join(job_skills)
    cand_text = ", ".join(candidate_skills)

    semantic_score = 0.0
    has_embedding  = False

    if job_text and cand_text:
        job_vec  = await _embed(job_text)
        cand_vec = await _embed(cand_text)
        if job_vec and cand_vec:
            semantic_score = _cosine(job_vec, cand_vec)
            has_embedding  = True

    job_set  = {s.lower() for s in job_skills}
    cand_set = {s.lower() for s in candidate_skills}
    overlap  = len(job_set & cand_set) / len(job_set) if job_set else 0.0

    exp_score = 1.0 if experience_actual >= experience_required else (
        experience_actual / experience_required if experience_required else 0.0
    )

    if has_embedding:
        final = (semantic_score * 0.6) + (overlap * 0.3) + (exp_score * 0.1)
    else:
        final = (overlap * 0.8) + (exp_score * 0.2)

    return round(min(final, 1.0), 4)


async def rank_candidates(job: dict, candidates: list[dict]) -> list[dict]:
    """Score and sort all candidates for a job, return sorted list."""
    scored = []
    for c in candidates:
        score = await compute_match(
            job_skills=job.get("skills", []),
            candidate_skills=c.get("skills", []),
            experience_required=job.get("experience_years", 0),
            experience_actual=c.get("experience", 0),
        )
        c["match_score"] = score
        scored.append(c)
    return sorted(scored, key=lambda x: x["match_score"], reverse=True)
