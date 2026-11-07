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


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Log in as an admin",
    description=(
        "Authenticate an admin using a username and password. "
        "Returns a short-lived Bearer access token and sets a refresh "
        "token in an HttpOnly cookie."
    ),
    response_description="Access token and login information.",
    responses={
        401: {"description": "Invalid username or password."},
    },
)
def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    return service.login(db, login_data, response)


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Refresh the access token",
    description=(
        "Uses the refresh_token HttpOnly cookie to issue a new access "
        "token and rotate the refresh cookie. The refresh token is not "
        "sent in the request body. The request origin must be allowed "
        "when an Origin header is provided."
    ),
    response_description="A new access token and its expiration time.",
    responses={
        401: {"description": "Refresh cookie missing, invalid, or associated with a deleted admin."},
        403: {"description": "Request origin is not allowed."},
    },
)
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    return service.refresh_access_token(request, response, db)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out",
    description=(
        "Clears the refresh-token cookie. This endpoint does not require "
        "an access token. An Origin header must match an allowed origin "
        "when provided."
    ),
    response_description="Logout confirmation.",
    responses={
        403: {"description": "Request origin is not allowed."},
    },
)
def logout(request: Request, response: Response):
    return service.logout(request, response)


@router.get(
    "/me",
    response_model=CurrentAdminResponse,
    summary="Get the current admin",
    description=(
        "Returns the profile of the admin identified by the Bearer "
        "access token."
    ),
    response_description="The authenticated admin's profile.",
    responses={
        401: {"description": "Access token missing, invalid, or associated with a deleted admin."},
    },
)
def get_me(
    current_admin: Admin = Depends(get_current_admin),
):
    return service.get_admin_profile(current_admin)
