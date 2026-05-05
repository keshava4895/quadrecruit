"""
MCP Server — registers all Recruit Robo tools and exposes them to the LLM.
Each tool has a strict JSON schema; MCP validates inputs before execution.
"""
import json
import asyncio
from services.screening_service import screen_resume, extract_job_requirements
from services.matching_service   import compute_match
from services.email_service      import send_email, draft_outreach_email
from services.calendar_service   import schedule_interview
from services.lifecycle_engine   import transition_candidate, push_timeline

# ── Tool definitions (schema + handler) ──────────────────────────────────────

TOOLS: dict[str, dict] = {
    "screen_resume": {
        "description": "Parse a raw resume and return structured fields",
        "schema": {
            "type": "object",
            "properties": {
                "resume_text": {"type": "string"}
            },
            "required": ["resume_text"],
        },
        "handler": lambda p: screen_resume(p["resume_text"]),
    },
    "extract_job_requirements": {
        "description": "Parse a natural-language job description",
        "schema": {
            "type": "object",
            "properties": {
                "description": {"type": "string"}
            },
            "required": ["description"],
        },
        "handler": lambda p: extract_job_requirements(p["description"]),
    },
    "compute_match": {
        "description": "Score a candidate against job requirements",
        "schema": {
            "type": "object",
            "properties": {
                "job_skills":           {"type": "array",  "items": {"type": "string"}},
                "candidate_skills":     {"type": "array",  "items": {"type": "string"}},
                "experience_required":  {"type": "integer"},
                "experience_actual":    {"type": "integer"},
            },
            "required": ["job_skills", "candidate_skills",
                         "experience_required", "experience_actual"],
        },
        "handler": lambda p: compute_match(
            p["job_skills"], p["candidate_skills"],
            p["experience_required"], p["experience_actual"]
        ),
    },
    "draft_outreach_email": {
        "description": "Generate a personalised outreach email using LLM",
        "schema": {
            "type": "object",
            "properties": {
                "candidate_name": {"type": "string"},
                "job_title":      {"type": "string"},
            },
            "required": ["candidate_name", "job_title"],
        },
        "handler": lambda p: draft_outreach_email(p["candidate_name"], p["job_title"]),
    },
    "update_pipeline": {
        "description": "Append a stage entry to the recruitment pipeline timeline",
        "schema": {
            "type": "object",
            "properties": {
                "job_id": {"type": "string"},
                "stage":  {"type": "string"},
            },
            "required": ["job_id", "stage"],
        },
        "handler": lambda p: push_timeline(p["job_id"], p["stage"]),
    },
}


async def call_tool(tool_name: str, params: dict) -> dict:
    """Validate params against schema then execute the registered handler."""
    if tool_name not in TOOLS:
        return {"error": f"Tool '{tool_name}' not registered"}

    tool = TOOLS[tool_name]
    schema_required = tool["schema"].get("required", [])
    for field in schema_required:
        if field not in params:
            return {"error": f"Missing required field: {field}"}

    try:
        result = await tool["handler"](params)
        return {"result": result}
    except Exception as e:
        return {"error": str(e)}


def list_tools() -> list[dict]:
    return [
        {"name": name, "description": t["description"], "schema": t["schema"]}
        for name, t in TOOLS.items()
    ]
