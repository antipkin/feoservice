"""add submitted to planstatus enum

Revision ID: 9f49d804eb1e
Revises: d11eb29ae635
Create Date: 2026-10-05 00:20:45.263073

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f49d804eb1e'
down_revision: Union[str, None] = 'd11eb29ae635'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 🎯 Добавляем значение 'submitted' в существующий ENUM тип planstatus
    # IF NOT EXISTS гарантирует, что ошибка не возникнет, если значение уже есть
    op.execute("ALTER TYPE planstatus ADD VALUE IF NOT EXISTS 'submitted'")


def downgrade() -> None:
    # Удаление значений из ENUM в PostgreSQL — сложная операция,
    # поэтому для отката мы просто ничего не делаем.
    pass