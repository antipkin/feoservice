import enum


class ObjectType(str, enum.Enum):
    MKD = "MKD"           # Многоквартирный дом
    PARKING = "PARKING"   # Паркинг


class TariffBase(str, enum.Enum):
    AREA = "area"         # Тариф считается на м² площади
    SPACES = "spaces"     # Тариф считается на машиноместо


class ResourceType(str, enum.Enum):
    MATERIAL = "material"
    LABOR = "labor"
    EQUIPMENT = "equipment"


class PlanStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    ARCHIVED = "archived"


class FactStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"