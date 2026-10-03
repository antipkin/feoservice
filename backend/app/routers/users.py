# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.security import hash_password, require_admin
from app.utils.audit_helper import log_action  # 🎯 ИМПОРТ

router = APIRouter(prefix="/users", tags=["Управление пользователями"])


@router.get("/", response_model=List[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,  # 🎯 Для IP
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Пользователь с email '{user_in.email}' уже существует")

    existing = await db.execute(select(User).where(User.username == user_in.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Пользователь с username '{user_in.username}' уже существует")

    user_data = user_in.model_dump(exclude={"password"})
    user_data["hashed_password"] = hash_password(user_in.password)
    db_user = User(**user_data)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    # 🎯 ЛОГИРОВАНИЕ СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ
    await log_action(
        db=db,
        user=current_user,
        action="CREATE",
        resource_type="USER",
        resource_id=db_user.id,
        new_values={
            "username": db_user.username,
            "email": db_user.email,
            "role": db_user.role,
            "full_name": db_user.full_name,
        },
        ip_address=request.client.host if request.client else None
    )

    return db_user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,  # 🎯 Для IP
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == current_user.id and user_in.is_active is False:
        raise HTTPException(status_code=400, detail="Нельзя деактивировать собственную учётную запись")
    if user.id == current_user.id and user_in.role and user_in.role != current_user.role:
        raise HTTPException(status_code=400, detail="Нельзя изменить собственную роль")

    # 🎯 Сохраняем старые значения ДО изменений
    old_values = {
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "is_active": user.is_active,
    }

    update_data = user_in.model_dump(exclude_unset=True)

    if "email" in update_data and update_data["email"] != user.email:
        existing = await db.execute(select(User).where(User.email == update_data["email"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Email '{update_data['email']}' уже используется")

    if "username" in update_data and update_data["username"] != user.username:
        existing = await db.execute(select(User).where(User.username == update_data["username"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Username '{update_data['username']}' уже используется")

    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))
    else:
        update_data.pop("password", None)

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    # 🎯 ЛОГИРОВАНИЕ ОБНОВЛЕНИЯ (особенно важно для смены роли!)
    new_values = {
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "is_active": user.is_active,
    }
    await log_action(
        db=db,
        user=current_user,
        action="UPDATE",
        resource_type="USER",
        resource_id=user_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=request.client.host if request.client else None
    )

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    request: Request,  # 🎯 Для IP
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить собственную учётную запись")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # 🎯 Сохраняем данные перед удалением
    deleted_data = {
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
    }

    await db.delete(user)
    await db.commit()

    # 🎯 ЛОГИРОВАНИЕ УДАЛЕНИЯ
    await log_action(
        db=db,
        user=current_user,
        action="DELETE",
        resource_type="USER",
        resource_id=user_id,
        old_values=deleted_data,
        ip_address=request.client.host if request.client else None
    )

    return None


@router.get("/stats/summary")
async def get_users_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    total = await db.execute(select(func.count(User.id)))
    active = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    by_role = await db.execute(select(User.role, func.count(User.id)).group_by(User.role))
    return {
        "total": total.scalar() or 0,
        "active": active.scalar() or 0,
        "by_role": {row[0]: row[1] for row in by_role.all()}
    }