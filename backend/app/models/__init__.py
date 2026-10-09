# backend/app/models/__init__.py
"""
Импорт всех моделей для SQLAlchemy metadata.
Это нужно, чтобы Alembic видел все таблицы при создании миграций.
"""

# Базовый класс
from app.models.base import Base  # noqa: F401

# Enums (только те, что реально существуют)
from app.models.enums import PlanStatus, FactStatus, ActStatus  # noqa: F401

# Модели пользователей
from app.models.user import User  # noqa: F401

# Справочники
from app.models.units import Unit  # noqa: F401
from app.models.service_category import ServiceCategory  # noqa: F401
from app.models.services import (  # noqa: F401
    ServiceType,
    ServiceRate,
    Resource,
    ResourceRate,
    ResourceNorm,
)

# Объекты
from app.models.objects import Object  # noqa: F401

# Планирование
from app.models.planning import (  # noqa: F401
    PlanHeader,
    PlanItem,
    PlanMonthly,
    PlanResource,
)

# Факты и акты
from app.models.facts import (  # noqa: F401
    FactHeader,
    FactItem,
    FactResource,
    Act,
    ActItem,
)

# Отчёты
from app.models.reports import Report, ReportItem  # noqa: F401

# Настройки расчёта расценок
from app.models.pricing_settings import ServicePricingSettings  # noqa: F401

# Журнал аудита
from app.models.audit_log import AuditLog  # noqa: F401

from app.models.notification import Notification  # noqa: F401