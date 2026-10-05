# backend/app/utils/status_helper.py
from fastapi import HTTPException
from app.models.enums import (
    FactStatus, ActStatus, PlanStatus,
    FACT_STATUS_TRANSITIONS, ACT_STATUS_TRANSITIONS, PLAN_STATUS_TRANSITIONS,
    FACT_STATUS_ROLES, ACT_STATUS_ROLES, PLAN_STATUS_ROLES,
)
from app.models.user import User


def validate_status_transition(
    current_status: str,
    new_status: str,
    user: User,
    document_type: str = "fact"  # "fact", "act" или "plan"
) -> None:
    if document_type == "fact":
        try:
            current_enum = FactStatus(current_status)
            new_enum = FactStatus(new_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Неизвестный статус факта: {new_status}")
        transitions = FACT_STATUS_TRANSITIONS
        roles_matrix = FACT_STATUS_ROLES
    elif document_type == "act":
        try:
            current_enum = ActStatus(current_status)
            new_enum = ActStatus(new_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Неизвестный статус акта: {new_status}")
        transitions = ACT_STATUS_TRANSITIONS
        roles_matrix = ACT_STATUS_ROLES
    elif document_type == "plan":
        try:
            current_enum = PlanStatus(current_status)
            new_enum = PlanStatus(new_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Неизвестный статус плана: {new_status}")
        transitions = PLAN_STATUS_TRANSITIONS
        roles_matrix = PLAN_STATUS_ROLES
    else:
        raise HTTPException(status_code=400, detail=f"Неизвестный тип документа: {document_type}")

    if new_enum not in transitions[current_enum]:
        allowed = [s.value for s in transitions[current_enum]]
        raise HTTPException(
            status_code=400,
            detail=f"Переход '{current_status}' → '{new_status}' невозможен. Разрешённые: {allowed}"
        )

    transition_key = (current_enum, new_enum)
    allowed_roles = roles_matrix.get(transition_key, [])
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"У вас нет прав на этот переход. Требуется: {allowed_roles}"
        )


def can_edit_document(status: str, document_type: str = "fact") -> bool:
    # 🎯 Приводим к верхнему регистру для надёжного сравнения
    return status.upper() == "DRAFT"


def get_available_transitions(current_status: str, user_role: str, document_type: str = "fact") -> list:
    if document_type == "fact":
        try:
            current_enum = FactStatus(current_status)
        except ValueError:
            return []
        transitions = FACT_STATUS_TRANSITIONS
        roles_matrix = FACT_STATUS_ROLES
    elif document_type == "act":
        try:
            current_enum = ActStatus(current_status)
        except ValueError:
            return []
        transitions = ACT_STATUS_TRANSITIONS
        roles_matrix = ACT_STATUS_ROLES
    elif document_type == "plan":
        try:
            current_enum = PlanStatus(current_status)
        except ValueError:
            return []
        transitions = PLAN_STATUS_TRANSITIONS
        roles_matrix = PLAN_STATUS_ROLES
    else:
        return []

    available = []
    for next_status in transitions[current_enum]:
        transition_key = (current_enum, next_status)
        allowed_roles = roles_matrix.get(transition_key, [])
        if user_role in allowed_roles:
            available.append(next_status.value)
    return available