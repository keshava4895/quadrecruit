from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import connect_db, close_db
from config import FRONTEND_URL

from routes.auth_routes      import router as auth_router
from routes.linkedin_routes  import router as linkedin_router
from routes.job_routes       import router as job_router
from routes.candidate_routes import router as candidate_router
from routes.email_routes     import router as email_router
from routes.calendar_routes  import router as calendar_router
from routes.feedback_routes  import router as feedback_router
from routes.pipeline_routes  import router as pipeline_router
from routes.search_routes    import router as search_router
from routes.msgraph_routes   import router as msgraph_router
from routes.zoho_routes      import router as zoho_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="Recruit Robo API",
    description="AI-Powered Autonomous Recruitment Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,      prefix="/auth",       tags=["Auth"])
app.include_router(linkedin_router,  prefix="/linkedin",   tags=["LinkedIn"])
app.include_router(job_router,       prefix="/jobs",       tags=["Jobs"])
app.include_router(candidate_router, prefix="/candidates", tags=["Candidates"])
app.include_router(email_router,     prefix="/email",      tags=["Email"])
app.include_router(calendar_router,  prefix="/calendar",   tags=["Calendar"])
app.include_router(feedback_router,  prefix="/feedback",   tags=["Feedback"])
app.include_router(pipeline_router,  prefix="/pipeline",   tags=["Pipeline"])
app.include_router(search_router,    prefix="/search",     tags=["Search"])
app.include_router(msgraph_router,   prefix="/msgraph",    tags=["Microsoft Graph"])
app.include_router(zoho_router,      prefix="/zoho",        tags=["Zoho Recruit"])

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "Recruit Robo API v1.0"}

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
