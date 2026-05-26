"""
Resume screening service.

AI tier priority:
  1. Azure OpenAI  — if AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT are set
  2. Standard OpenAI — if OPENAI_API_KEY is set and valid
  3. Pure-Python regex parser — always works, no API key required

PDF extraction uses pypdf (pure Python, no external dependencies).
"""
import io
import json
import re
from config import (
    AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION,
    OPENAI_MODEL, OPENAI_API_KEY,
)

# ── Tier detection ────────────────────────────────────────────────────────────

def _use_azure() -> bool:
    return bool(AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT)


def _use_openai() -> bool:
    key = OPENAI_API_KEY or ""
    return bool(key and not key.startswith("sk-...") and len(key) > 10)


# ── PDF text extraction ───────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from a PDF file using pypdf."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n".join(pages)
    except Exception as e:
        print(f"[Screening] PDF extraction failed: {e}")
        return ""


def extract_text_from_bytes(file_bytes: bytes, filename: str = "") -> str:
    """Auto-detect file type and extract text."""
    fname = (filename or "").lower()
    # PDF: either by extension or by magic bytes
    if fname.endswith(".pdf") or file_bytes[:4] == b"%PDF":
        return extract_text_from_pdf(file_bytes)
    # Plain text / TXT
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


# ── AI screening ──────────────────────────────────────────────────────────────

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


async def _ai_screen(client, resume_text: str) -> dict:
    response = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": resume_text[:6000]},   # cap tokens
        ],
        temperature=0,
        max_tokens=600,
    )
    raw = response.choices[0].message.content.strip()
    # Strip markdown fences if model returned them
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
    return json.loads(raw)


async def screen_resume(resume_text: str) -> dict:
    """Parse a plain-text resume into structured fields (AI or regex fallback)."""
    if not resume_text or not resume_text.strip():
        return _regex_parse("")

    if _use_azure():
        try:
            from openai import AsyncAzureOpenAI
            client = AsyncAzureOpenAI(
                api_key=AZURE_OPENAI_API_KEY,
                azure_endpoint=AZURE_OPENAI_ENDPOINT,
                api_version=AZURE_OPENAI_API_VERSION,
            )
            return await _ai_screen(client, resume_text)
        except Exception as e:
            print(f"[Screening] Azure OpenAI failed ({e}), trying standard OpenAI…")

    if _use_openai():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            return await _ai_screen(client, resume_text)
        except Exception as e:
            print(f"[Screening] Standard OpenAI failed ({e}), falling back to regex…")

    print("[Screening] No AI credentials — using regex resume parser")
    return _regex_parse(resume_text)


# ── Pure-Python regex resume parser ──────────────────────────────────────────

_KNOWN_SKILLS = [
    # Languages
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust",
    "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB",
    # Web / Frontend
    "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "HTML", "CSS",
    "Tailwind", "Redux", "GraphQL", "REST", "REST APIs",
    # Backend / DB
    "Django", "Flask", "FastAPI", "Spring", "Spring Boot", "Hibernate",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "SQLite",
    "SQL", "NoSQL",
    # Cloud / DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible",
    "CI/CD", "Jenkins", "GitHub Actions", "Linux", "Bash",
    # Data / ML / AI
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Spark",
    "Databricks", "Snowflake", "Power BI", "Tableau", "ETL", "Kafka",
    # Tools / Methodology
    "Git", "Agile", "Scrum", "Microservices", "API", "OOP",
    "Excel", "Jira", "Confluence",
]
_SKILLS_LOWER = {s.lower(): s for s in _KNOWN_SKILLS}


def _extract_email(text: str) -> str:
    m = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
    return m.group(0) if m else ""


def _extract_phone(text: str) -> str:
    m = re.search(
        r"(\+?\d{1,3}[\s\-.]?)?"          # country code optional
        r"(\(?\d{3}\)?[\s\-.]?)"           # area code
        r"(\d{3}[\s\-.]?\d{4})",           # local number
        text,
    )
    return m.group(0).strip() if m else ""


def _extract_name(text: str) -> str:
    """Heuristic: first non-empty line that isn't an email/phone/URL and is ≤ 5 words."""
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.search(r"[@/\\:\d]{3,}", line):
            continue
        words = line.split()
        if 1 < len(words) <= 5 and all(w[0].isupper() for w in words if w.isalpha()):
            return line
    return ""


def _extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found = []
    for skill_lower, skill_proper in _SKILLS_LOWER.items():
        # match whole word / phrase
        pattern = r"\b" + re.escape(skill_lower) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill_proper)
    return found


def _extract_experience(text: str) -> int:
    """Look for patterns like '5 years', '3+ years of experience'."""
    patterns = [
        r"(\d+)\+?\s*years?\s+of\s+(?:professional\s+)?experience",
        r"(\d+)\+?\s*years?\s+experience",
        r"experience\s*[:\-]?\s*(\d+)\+?\s*years?",
        r"(\d+)\+?\s*yrs?\.?\s+(?:of\s+)?experience",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return 0


def _regex_parse(text: str) -> dict:
    name     = _extract_name(text)
    email    = _extract_email(text)
    phone    = _extract_phone(text)
    skills   = _extract_skills(text)
    exp      = _extract_experience(text)

    # Build a short summary from the first paragraph / first 300 chars
    summary_text = ""
    for para in text.split("\n\n"):
        para = para.strip()
        if len(para) > 40 and not re.search(r"[@+\d]{5}", para):
            summary_text = para[:300]
            break

    return {
        "name":      name,
        "email":     email,
        "phone":     phone,
        "skills":    skills,
        "experience": exp,
        "education": "",
        "summary":   summary_text,
    }


# ── Job description parser ────────────────────────────────────────────────────

async def extract_job_requirements(description: str) -> dict:
    """Parse a job description into structured requirements."""
    prompt = """Extract the following from the job description and return ONLY valid JSON:
{
  "title": "string",
  "skills": ["list"],
  "experience_years": <integer>,
  "location": "string or null"
}"""

    if _use_azure():
        try:
            from openai import AsyncAzureOpenAI
            client = AsyncAzureOpenAI(
                api_key=AZURE_OPENAI_API_KEY,
                azure_endpoint=AZURE_OPENAI_ENDPOINT,
                api_version=AZURE_OPENAI_API_VERSION,
            )
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
        except Exception as e:
            print(f"[Screening] Azure job-req parse failed: {e}")

    if _use_openai():
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
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
        except Exception as e:
            print(f"[Screening] OpenAI job-req parse failed: {e}")

    # Regex fallback for job description
    skills   = _extract_skills(description)
    exp      = _extract_experience(description)
    title_m  = re.search(r"(?:position|role|title)[:\s]+([^\n]+)", description, re.I)
    title    = title_m.group(1).strip() if title_m else ""
    loc_m    = re.search(r"(?:location|city)[:\s]+([^\n]+)", description, re.I)
    location = loc_m.group(1).strip() if loc_m else None

    return {
        "title":            title,
        "skills":           skills,
        "experience_years": exp,
        "location":         location,
    }
