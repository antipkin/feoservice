from sqlalchemy import Column, Integer, String, Boolean
from app.models.base import Base


class Unit(Base):
    """Справочник единиц измерения."""
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    symbol = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<Unit {self.code}: {self.symbol}>"