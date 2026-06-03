import os
from dotenv import load_dotenv

load_dotenv()

# Azure Cosmos DB (MongoDB API)
COSMOS_CONNECTION_STRING = os.getenv("COSMOS_CONNECTION_STRING", "")

# Active DB URI: Cosmos DB if configured, otherwise local MongoDB for dev
MONGO_URI = COSMOS_CONNECTION_STRING if COSMOS_CONNECTION_STRING else os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "quad_recruit")

# Azure OpenAI
AZURE_OPENAI_API_KEY   = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_ENDPOINT  = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
OPENAI_MODEL           = os.getenv("OPENAI_MODEL", "gpt-4o")
EMBEDDING_MODEL        = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# Standard OpenAI (fallback when Azure OpenAI is not configured)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# JWT Authentication
JWT_SECRET      = os.getenv("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM   = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))

# Google OAuth
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# App URLs
FRONTEND_URL          = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL           = os.getenv("BACKEND_URL", "http://localhost:8000")
GMAIL_REDIRECT_URI    = f"{BACKEND_URL}/gmail/oauth/callback"
CALENDAR_REDIRECT_URI = f"{BACKEND_URL}/calendar/oauth/callback"

# Google OAuth scopes
GMAIL_SCOPES    = ["https://www.googleapis.com/auth/gmail.send",
                   "https://www.googleapis.com/auth/gmail.readonly"]
CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]

# Job Portal API keys (optional — AI demo mode is used when not set)
LINKEDIN_API_KEY  = os.getenv("LINKEDIN_API_KEY", "")
INDEED_API_KEY    = os.getenv("INDEED_API_KEY", "")
NAUKRI_API_KEY    = os.getenv("NAUKRI_API_KEY", "")
MONSTER_API_KEY   = os.getenv("MONSTER_API_KEY", "")
GLASSDOOR_API_KEY = os.getenv("GLASSDOOR_API_KEY", "")
GITHUB_TOKEN      = os.getenv("GITHUB_TOKEN", "")
