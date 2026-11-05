from enum import Enum
from typing import List, Optional
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.db.mongodb import get_database

security_bearer = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    SYSTEM_ADMINISTRATOR = "system_administrator"
    INTAKE_OFFICER = "intake_officer"
    INVESTIGATING_OFFICER = "investigating_officer"
    SUPERVISORY_REVIEWER = "supervisory_reviewer"
    AUDITOR = "auditor"


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    token: Optional[str] = Query(None, description="Optional access token query parameter for iframe/downloads"),
) -> dict:
    raw_token = auth.credentials if auth else token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(raw_token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    db = get_database()
    user = await db.users.find_one({"username": payload["sub"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.get("status") == "disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been administratively disabled",
        )
    return user


def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in allowed_roles and user_role != UserRole.SYSTEM_ADMINISTRATOR.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles [{', '.join(allowed_roles)}]",
            )
        return current_user
    return role_checker


async def check_case_access(case_id: str, current_user: dict) -> bool:
    """Enforce that officers have access to the specific case, unless System Administrator or Auditor."""
    user_role = current_user.get("role")
    if user_role in [UserRole.SYSTEM_ADMINISTRATOR.value, UserRole.AUDITOR.value]:
        return True
    assigned_cases = current_user.get("assigned_cases", [])
    if "*" in assigned_cases or case_id in assigned_cases:
        return True

    # Also check if user is assigned on the case document
    db = get_database()
    case = await db.cases.find_one({"$or": [{"_id": case_id}, {"case_id": case_id}, {"case_reference": case_id}]})
    if case:
        if case["_id"] in assigned_cases or case.get("case_reference") in assigned_cases:
            return True
        officers = case.get("assigned_officers", [])
        if current_user.get("username") in officers or str(current_user.get("_id")) in officers:
            return True
        if case.get("created_by") == current_user.get("username"):
            return True

    return False
