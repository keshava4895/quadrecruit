import json
from openai import AsyncAzureOpenAI
from config import AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION, OPENAI_MODEL

client = AsyncAzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION,
)

SYSTEM_PROMPT = """You are a resume parser. Extract structured information from the
resume text provided and return ONLY valid JSON with these fields:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "skills": ["list", "of", "skills"],
  "experience": <integer years>,
  "education": "string",
  "summary": "brief 2-sentence professional summary"
}
Return nothing else — no markdown, no explanation, just the JSON object."""


async def screen_resume(resume_text: str) -> dict:
    """Use OpenAI to parse a raw resume into structured fields."""
    try:
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": resume_text},
            ],
            temperature=0,
            max_tokens=600,
        )
        raw = response.choices[0].message.content.strip()
        return json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[Screening] Error: {e}")
        # Fallback — return empty structure so pipeline continues
        return {"skills": [], "experience": 0, "summary": "", "name": "", "email": ""}


async def extract_job_requirements(description: str) -> dict:
    """Parse a natural-language job description into structured requirements."""
    prompt = """Extract the following from the job description and return ONLY valid JSON:
{
  "title": "string",
  "skills": ["list"],
  "experience_years": <integer>,
  "location": "string or null"
}"""
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user",   "content": description},
        ],
        temperature=0,
        max_tokens=300,
    )
    return json.loads(response.choices[0].message.content.strip())
