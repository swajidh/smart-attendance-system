from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenPairResponse, UserResponse
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService
from app.utils.responses import success_response

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()


@router.post("/login", response_model=ApiResponse[TokenPairResponse], status_code=status.HTTP_200_OK)
async def login(
    request: Request,
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ApiResponse[TokenPairResponse]:
    tokens = await auth_service.login(db, body)
    return success_response(request, tokens)


@router.post("/refresh", response_model=ApiResponse[TokenPairResponse])
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ApiResponse[TokenPairResponse]:
    tokens = await auth_service.refresh(db, body.refresh_token)
    return success_response(request, tokens)


@router.get("/me", response_model=ApiResponse[UserResponse])
async def me(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ApiResponse[UserResponse]:
    user = await auth_service.get_user(db, current_user.id)
    return success_response(request, user)
