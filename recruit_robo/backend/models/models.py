from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# ── User / Auth models ────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    userId: str
    name: str
    email: str
    role: str = "recruiter"
    is_active: bool = True
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class InviteUser(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "viewer"

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class UserRoleUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# ── Job models ────────────────────────────────────────────────────────────────
class JobCreate(BaseModel):
    title: str
    description: str
    skills: List[str]
    experience_years: int
    location: Optional[str] = None
    recruiter_email: Optional[EmailStr] = None
    positions_open: int = 1
    rounds_technical: int = 0
    rounds_tech_managerial: int = 0
    rounds_managerial: int = 0
    rounds_hr: int = 0
    project: Optional[str] = None
    team: Optional[str] = None

class JobPositionsUpdate(BaseModel):
    positions_open: Optional[int] = None
    positions_filled: Optional[int] = None
    status: Optional[str] = None
    project: Optional[str] = None
    team: Optional[str] = None
    description: Optional[str] = None

class JobResponse(JobCreate):
    jobId: str
    created_at: datetime
    status: str = "active"

# ── Candidate models ──────────────────────────────────────────────────────────
class CandidateCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = []
    experience: int = 0
    summary: Optional[str] = None
    resume_text: Optional[str] = None

class CandidateResponse(CandidateCreate):
    candidateId: str
    match_score: float = 0.0
    status: str = "sourced"          # sourced | emailed | interested | rejected | selected
    interview_phase: str = "not_started"
    created_at: datetime

# ── Email models ──────────────────────────────────────────────────────────────
class EmailRequest(BaseModel):
    candidate_email: EmailStr
    subject: str
    body: str

class BulkEmailRequest(BaseModel):
    jobId: str
    subject: Optional[str] = None

# ── Schedule models ───────────────────────────────────────────────────────────
class ScheduleRequest(BaseModel):
    candidateId: str
    jobId: str
    interviewer_email: EmailStr
    start_time: str    # ISO 8601
    end_time: str

# ── Feedback models ───────────────────────────────────────────────────────────
class InterviewerFeedback(BaseModel):
    candidateId: str
    jobId: str
    round: int
    rating: int = Field(..., ge=1, le=10)
    comments: str
    decision: str    # "Next Round" | "Selected" | "Rejected"
    interviewer_email: Optional[str] = None
    interviewer_name: Optional[str] = None

class CandidateFeedback(BaseModel):
    candidateId: str
    jobId: str
    experience_rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

# ── Notes models ─────────────────────────────────────────────────────────────
class NoteCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)

# ── Offer models ──────────────────────────────────────────────────────────────
class OfferCreate(BaseModel):
    candidateId: str
    jobId: str
    ctc: Optional[float] = None
    joining_date: Optional[str] = None
    notes: Optional[str] = None

class OfferUpdate(BaseModel):
    status: Optional[str] = None
    ctc: Optional[float] = None
    joining_date: Optional[str] = None
    notes: Optional[str] = None

# ── Job Portal Search models ───────────────────────────────────────────────────
class CandidateSearchRequest(BaseModel):
    query: str                          # free-text requirements
    portal: str                         # linkedin | indeed | naukri | monster | glassdoor
    job_id: Optional[str] = None        # if set, query is derived from this job
    location: Optional[str] = None
    experience_min: Optional[int] = 0
    experience_max: Optional[int] = 20
    limit: int = Field(default=10, ge=1, le=50)

class ExternalCandidate(BaseModel):
    name: str
    headline: str = ""
    current_company: str = ""
    location: str = ""
    skills: List[str] = []
    experience_years: int = 0
    summary: str = ""
    availability: str = ""
    profile_url: str = ""
    portal: str = ""
    match_score: float = 0.0
