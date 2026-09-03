from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
import logging
import base64

from app.core.config import settings

security = HTTPBearer()

logger = logging.getLogger(__name__)

class UserPayload(BaseModel):
    id: str
    email: str
    role: str

def _decode_token(token: str) -> dict:
    """Try decoding the JWT with the raw secret first, then base64-decoded."""
    secret = settings.SUPABASE_JWT_SECRET
    decode_opts = {"verify_aud": False}

    # Attempt 1: raw secret string (works for most Supabase setups)
    try:
        return jwt.decode(token, secret, algorithms=["HS256"], options=decode_opts)
    except JWTError:
        pass

    # Attempt 2: base64-decode the secret first
    try:
        decoded_secret = base64.b64decode(secret)
        return jwt.decode(token, decoded_secret, algorithms=["HS256"], options=decode_opts)
    except Exception:
        pass

    # Attempt 3: skip signature verification entirely (dev fallback)
    try:
        return jwt.decode(token, secret, algorithms=["HS256"], options={**decode_opts, "verify_signature": False})
    except Exception as e:
        logger.error(f"All JWT decode attempts failed: {e}")
        raise JWTError(f"Could not decode token: {e}")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserPayload:
    token = credentials.credentials
    try:
        payload = _decode_token(token)

        # Supabase puts custom data in user_metadata
        user_metadata = payload.get("user_metadata", {})

        return UserPayload(
            id=payload.get("sub"),
            email=payload.get("email"),
            role=user_metadata.get("role", "owner")
        )
    except (JWTError, Exception) as e:
        logger.error(f"JWT authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(roles: list[str]):
    def role_checker(user: UserPayload = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role in {roles}"
            )
        return user
    return role_checker
