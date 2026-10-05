"""add submitted to planstatus enum

Revision ID: <оставьте как есть, не меняйте>
Revises: <оставьте как есть, не меняйте>
Create Date: <оставьте как есть, не меняйте>
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd11eb29ae635'
down_revision: str = '70c9a290e0b1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 🎯 Единственная задача этой миграции: добавить значение 'submitted' в ENUM
    op.execute("ALTER TYPE planstatus ADD VALUE IF NOT EXISTS 'submitted'")


def downgrade() -> None:
    # Удаление значений из ENUM в PostgreSQL — сложная операция, 
    # поэтому для отката мы просто ничего не делаем.
    pass