from pydantic import BaseModel
from typing import List, Optional


class StatusTransitionRequest(BaseModel):
    new_status: str
    comment: Optional[str] = None


class StatusTransitionResponse(BaseModel):
    id: int
    old_status: str
    new_status: str
    status_label: str
    available_transitions: List[str]
    message: str


class AvailableTransitionsResponse(BaseModel):
    document_id: int
    current_status: str
    status_label: str
    available_transitions: List[str]
    can_edit: bool