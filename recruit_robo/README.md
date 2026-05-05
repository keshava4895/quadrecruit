# Recruit Robo 🤖
**AI-Powered Autonomous Recruitment Platform**
*M.Tech Project — PES University, November 2025*

---

## Overview

Recruit Robo automates the complete recruitment lifecycle using:
- **Multi-agent AI** (Job, Screening, Matching, Email, Calendar, Feedback agents)
- **Model Context Protocol (MCP)** for safe, schema-validated tool invocation
- **OpenAI GPT-4o** for natural language understanding and generation
- **FastAPI** async backend + **ReactJS** frontend
- **MongoDB** dynamic collections per job pipeline
- **Gmail API** for automated outreach
- **Google Calendar API** for interview scheduling

---

## Project Structure

```
recruit_robo/
├── backend/                  ← FastAPI Python backend
│   ├── main.py               ← App entry point + route registration
│   ├── config.py             ← Environment variables
│   ├── database.py           ← Async MongoDB connection (Motor)
│   ├── requirements.txt
│   ├── .env.example          ← Copy to .env and fill in your keys
│   ├── mcp_server/
│   │   └── server.py         ← MCP tool registry + call_tool()
│   ├── routes/               ← FastAPI routers (1 file per domain)
│   │   ├── job_routes.py
│   │   ├── candidate_routes.py
│   │   ├── email_routes.py
│   │   ├── calendar_routes.py
│   │   ├── feedback_routes.py
│   │   └── pipeline_routes.py
│   ├── services/             ← Business logic
│   │   ├── job_manager.py
│   │   ├── candidate_manager.py
│   │   ├── screening_service.py   ← LLM resume parser
│   │   ├── matching_service.py    ← Semantic embedding match score
│   │   ├── email_service.py       ← Gmail API + LLM email drafting
│   │   ├── calendar_service.py    ← Google Calendar integration
│   │   ├── lifecycle_engine.py    ← State machine (sourced→selected)
│   │   └── feedback_service.py    ← Feedback storage + LLM summary
│   └── models/
│       └── models.py         ← Pydantic v2 schemas
└── frontend/                 ← React + Vite + Tailwind
    ├── src/
    │   ├── App.jsx            ← Router
    │   ├── api/index.js       ← Axios API client
    │   ├── components/
    │   │   └── Navbar.jsx
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── Jobs.jsx
    │       ├── JobDetail.jsx  ← Candidate table + pipeline timeline
    │       ├── UploadResume.jsx
    │       └── Candidates.jsx
    ├── package.json
    └── vite.config.js
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| MongoDB | 6+ (local or Atlas) |
| OpenAI API key | GPT-4o access |
| Google Cloud project | Gmail + Calendar APIs enabled |

---

## Quick Start

### 1. Clone and set up the backend

```bash
cd recruit_robo/backend

# Copy and fill in your environment variables
cp .env.example .env
# Edit .env with your OPENAI_API_KEY, MONGO_URI, Google credentials

# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

API docs auto-generated at: http://localhost:8000/docs

### 2. Set up the frontend

```bash
cd recruit_robo/frontend
npm install
npm run dev
```

Open: http://localhost:3000

### 3. Set up MongoDB

```bash
# Local MongoDB
mongod --dbpath /data/db

# Or use MongoDB Atlas free tier — paste the connection string in .env:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/
```

---

## Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → Enable **Gmail API** and **Google Calendar API**
3. Create OAuth 2.0 credentials (Web Application)
4. Add redirect URIs:
   - `http://localhost:8000/gmail/oauth/callback`
   - `http://localhost:8000/calendar/oauth/callback`
5. Copy Client ID and Secret to `.env`

---

## Core API Endpoints

### Jobs
```
POST   /jobs/           Create a job
GET    /jobs/           List all jobs
GET    /jobs/{id}       Get job details
DELETE /jobs/{id}       Delete job
POST   /jobs/parse      Parse NL job description → structured fields
```

### Candidates
```
POST   /candidates/{jobId}               Add candidate manually
POST   /candidates/{jobId}/upload-resume Upload PDF → auto-screen → score
GET    /candidates/{jobId}/top           Top 10 ranked candidates
PATCH  /candidates/{id}/status           Update status
```

### Pipeline
```
POST   /pipeline/transition              Move candidate to next stage
GET    /pipeline/{jobId}/timeline        Full pipeline history
GET    /pipeline/stats/dashboard         KPI metrics
```

### Email & Calendar
```
POST   /email/draft          LLM-generated outreach email
POST   /email/parse-reply    Classify candidate reply intent
POST   /calendar/schedule    Create Google Calendar interview event
```

### Feedback
```
POST   /feedback/interviewer   Store interviewer rating + decision
POST   /feedback/candidate     Store candidate experience rating
GET    /feedback/summary/{id}  LLM summary of all feedback
```

---

## Candidate Lifecycle State Machine

```
sourced → emailed → interested → scheduled → round_1_complete
                 ↘ not_interested             ↓
                 ↘ no_response        round_2_scheduled → round_2_complete
                                              ↓                  ↓
                                         rejected           selected
```

---

## Match Score Formula

```
Final Score = (semantic_embedding_cosine × 0.6)
            + (exact_skill_overlap_ratio  × 0.3)
            + (experience_fit_score       × 0.1)
```

Embeddings use OpenAI `text-embedding-3-small`.

---

## MCP Tool Registry

| Tool | Purpose |
|------|---------|
| `screen_resume` | Parse raw resume → structured JSON |
| `extract_job_requirements` | NL job description → skills/experience |
| `compute_match` | Score candidate vs job |
| `draft_outreach_email` | Generate personalised email |
| `update_pipeline` | Append stage to timeline |

---

## Future Enhancements (from report)

- LinkedIn / Naukri / Indeed real API integration
- BERT/RoBERTa sentence transformer embeddings
- Voice-based screening (Whisper)
- Full ATS integration (Workday, Greenhouse)
- RAG chatbot: "Show top 5 candidates similar to X"
- Kubernetes horizontal scaling
- Slack/Teams hiring notifications

---

## Team
Sunil Kumar N J, Venu, Keshava Jujaray, Abinesh, Hemanth, Harees
*Guided by Mr. Anvesh Reddy & Mr. Narayan*
*Department of CSE, PES University*
