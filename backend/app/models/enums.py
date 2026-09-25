import enum


class ObjectType(str, enum.Enum):
    MKD = "MKD"           # Многоквартирный дом
    PARKING = "PARKING"   # Паркинг


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