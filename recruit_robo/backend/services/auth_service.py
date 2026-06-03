from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS
from database import get_db

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": expire},
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
