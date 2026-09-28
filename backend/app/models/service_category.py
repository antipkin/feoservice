from sqlalchemy import Column, Integer, String, Boolean
from app.models.base import Base


class ServiceCategory(Base):
    """Категория услуг (Управление, Содержание ОИ, Текущий ремонт, Доп. услуги и т.д.)."""
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<ServiceCategory {self.code}: {self.name}>"