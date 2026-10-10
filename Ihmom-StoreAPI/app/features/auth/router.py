from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.security import get_current_admin
from app.db.session import get_db
from app.features.auth import service
from app.features.admins.model import Admin
from app.features.auth.schema import (
    CurrentAdminResponse,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RefreshResponse,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    return service.login(db, login_data, response)


@router.post("/refresh", response_model=RefreshResponse)
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    return service.refresh_access_token(request, response, db)


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, response: Response):
    return service.logout(request, response)


@router.get("/me", response_model=CurrentAdminResponse)
def get_me(
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_admin_profile(current_admin)
