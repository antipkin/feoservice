# backend/app/schemas/audit_log.py
from pydantic import BaseModel
from typing import Optional, Any, List, Dict
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    resource_type: str
    resource_id: Optional[int]
    old_values: Optional[Any]
    new_values: Optional[Any]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogStats(BaseModel):
    total: int
    by_action: Dict[str, int]
    by_resource_type: Dict[str, int]
    by_user: List[Dict[str, Any]]