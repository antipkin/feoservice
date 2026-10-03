# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserLogin, Token, UserResponse
from app.core.security import verify_password, create_access_token, get_current_active_user

router = APIRouter(prefix="/auth", tags=["Аутентификация"])


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Аутентификация пользователя.
    
    Принимает email ИЛИ username + пароль.
    Возвращает JWT-токен и данные пользователя.
    """
    # Ищем пользователя по email или username
    result = await db.execute(
        select(User).where(
            or_(User.email == login_data.login, User.username == login_data.login)
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован. Обратитесь к администратору."
        )
    
    # Создаём токен
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role, "email": user.email}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Получить данные текущего пользователя."""
    return current_user