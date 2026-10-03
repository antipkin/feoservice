# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: str = Field("viewer", pattern="^(admin|economist|master|viewer)$")
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=2, max_length=100)
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    role: Optional[str] = Field(None, pattern="^(admin|economist|master|viewer)$")
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Важно для Pydantic v2

class UserLogin(BaseModel):
    login: str = Field(..., description="Email или username")
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None