from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.db.mongodb import get_database
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.permissions import get_current_user
from app.services.audit_service import AuditService

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def login(req: LoginRequest):
    db = get_database()
    user = await db.users.find_one({"username": req.username})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        await AuditService.log_event(
            user_id=req.username,
            action="LOGIN_FAILED",
            resource_type="auth",
            resource_id=req.username,
            outcome="FAILURE",
            metadata={"reason": "Invalid credentials"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if user.get("status") == "disabled":
        await AuditService.log_event(
            user_id=req.username,
            action="LOGIN_REJECTED_DISABLED",
            resource_type="auth",
            resource_id=req.username,
            outcome="FAILURE"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been administratively disabled. Contact the System Administrator."
        )

    token = create_access_token(data={"sub": user["username"], "role": user.get("role")})

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

    await AuditService.log_event(
        user_id=user["username"],
        action="USER_LOGIN",
        resource_type="auth",
        resource_id=user["username"],
        outcome="SUCCESS"
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "full_name": user.get("full_name"),
            "role": user.get("role"),
            "assigned_cases": user.get("assigned_cases", []),
        }
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    await AuditService.log_event(
        user_id=current_user["username"],
        action="USER_LOGOUT",
        resource_type="auth",
        resource_id=current_user["username"],
        outcome="SUCCESS"
    )
    return {"message": "Successfully logged out"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "username": current_user["username"],
        "email": current_user["email"],
        "full_name": current_user.get("full_name"),
        "role": current_user.get("role"),
        "assigned_cases": current_user.get("assigned_cases", []),
        "last_login": current_user.get("last_login"),
    }


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    if not verify_password(req.current_password, current_user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    new_hash = get_password_hash(req.new_password)
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await AuditService.log_event(
        user_id=current_user["username"],
        action="PASSWORD_CHANGED",
        resource_type="user",
        resource_id=current_user["username"],
        outcome="SUCCESS"
    )
    return {"message": "Password changed successfully"}
