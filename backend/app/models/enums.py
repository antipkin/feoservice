# backend/app/models/enums.py
from enum import Enum


class PlanStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    ARCHIVED = "ARCHIVED"


class FactStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    SIGNED = "SIGNED"


class ActStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    SIGNED = "SIGNED"


# 🎯 Матрица разрешённых переходов для фактов
FACT_STATUS_TRANSITIONS = {
    FactStatus.DRAFT: [FactStatus.SUBMITTED],
    FactStatus.SUBMITTED: [FactStatus.DRAFT, FactStatus.APPROVED],
    FactStatus.APPROVED: [FactStatus.SIGNED],
    FactStatus.SIGNED: [],
}

# 🎯 Матрица разрешённых переходов для актов
ACT_STATUS_TRANSITIONS = {
    ActStatus.DRAFT: [ActStatus.SUBMITTED],
    ActStatus.SUBMITTED: [ActStatus.DRAFT, ActStatus.APPROVED],
    ActStatus.APPROVED: [ActStatus.SIGNED],
    ActStatus.SIGNED: [],
}

# 🎯 Матрица разрешённых переходов для планов
PLAN_STATUS_TRANSITIONS = {
    PlanStatus.DRAFT: [PlanStatus.SUBMITTED],
    PlanStatus.SUBMITTED: [PlanStatus.DRAFT, PlanStatus.APPROVED],
    PlanStatus.APPROVED: [PlanStatus.ARCHIVED],
    PlanStatus.ARCHIVED: [],
}

# 🎯 Матрица прав
FACT_STATUS_ROLES = {
    (FactStatus.DRAFT, FactStatus.SUBMITTED): ["master", "economist", "admin"],
    (FactStatus.SUBMITTED, FactStatus.DRAFT): ["economist", "admin"],
    (FactStatus.SUBMITTED, FactStatus.APPROVED): ["economist", "admin"],
    (FactStatus.APPROVED, FactStatus.SIGNED): ["admin"],
}

ACT_STATUS_ROLES = {
    (ActStatus.DRAFT, ActStatus.SUBMITTED): ["master", "economist", "admin"],
    (ActStatus.SUBMITTED, ActStatus.DRAFT): ["economist", "admin"],
    (ActStatus.SUBMITTED, ActStatus.APPROVED): ["economist", "admin"],
    (ActStatus.APPROVED, ActStatus.SIGNED): ["admin"],
}

PLAN_STATUS_ROLES = {
    (PlanStatus.DRAFT, PlanStatus.SUBMITTED): ["master", "economist", "admin"],
    (PlanStatus.SUBMITTED, PlanStatus.DRAFT): ["economist", "admin"],
    (PlanStatus.SUBMITTED, PlanStatus.APPROVED): ["economist", "admin"],
    (PlanStatus.APPROVED, PlanStatus.ARCHIVED): ["admin"],
}

# 🎯 Красивые названия для UI
FACT_STATUS_LABELS = {
    FactStatus.DRAFT: "📝 Черновик",
    FactStatus.SUBMITTED: "⏳ На согласовании",
    FactStatus.APPROVED: "✅ Утверждён",
    FactStatus.SIGNED: "🖋️ Подписан",
}

ACT_STATUS_LABELS = {
    ActStatus.DRAFT: "📝 Черновик",
    ActStatus.SUBMITTED: "⏳ На согласовании",
    ActStatus.APPROVED: "✅ Утверждён",
    ActStatus.SIGNED: "🖋️ Подписан",
}

PLAN_STATUS_LABELS = {
    PlanStatus.DRAFT: "📝 Черновик",
    PlanStatus.SUBMITTED: "⏳ На согласовании",
    PlanStatus.APPROVED: "✅ Утверждён",
    PlanStatus.ARCHIVED: "📦 В архиве",
}