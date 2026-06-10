from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS
from database import get_db

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str, role: str = "recruiter") -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role, "exp": expire},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid or expired token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    """FastAPI dependency — returns the logged-in user doc or raises 401."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Authentication required")
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    db = get_db()
    user = await db["users"].find_one({"userId": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User not found")
    return user


async def require_admin(current_user=Depends(get_current_user)):
    """Dependency that allows only admin users."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Admin access required")
    return current_user
