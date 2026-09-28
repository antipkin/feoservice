"""drop unit_price from plan_items and add to plan_monthly

Revision ID: f94124a1a6ac
Revises: 68f36ea567e0
Create Date: 2026-09-29 ...
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f94124a1a6ac'
down_revision: Union[str, None] = '68f36ea567e0'  # ⚠️ Убедитесь, что это совпадает с вашим файлом!
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Добавляем колонку как nullable, чтобы не блокировать существующие строки
    op.add_column('plan_monthly', sa.Column('unit_price', sa.Numeric(precision=15, scale=4), nullable=True))
    
    # 2. Заполняем NULL значения нулем (безопасное значение по умолчанию)
    op.execute("UPDATE plan_monthly SET unit_price = 0 WHERE unit_price IS NULL")
    
    # 3. Делаем колонку NOT NULL
    op.alter_column('plan_monthly', 'unit_price', 
                    existing_type=sa.Numeric(precision=15, scale=4), 
                    nullable=False)
    
    # 4. Удаляем старую колонку из plan_items
    op.drop_column('plan_items', 'unit_price')

def downgrade() -> None:
    # 1. Возвращаем колонку в plan_items
    op.add_column('plan_items', sa.Column('unit_price', sa.Numeric(precision=15, scale=4), nullable=True))
    op.execute("UPDATE plan_items SET unit_price = 0 WHERE unit_price IS NULL")
    op.alter_column('plan_items', 'unit_price', 
                    existing_type=sa.Numeric(precision=15, scale=4), 
                    nullable=False)
    
    # 2. Удаляем колонку из plan_monthly
    op.drop_column('plan_monthly', 'unit_price')