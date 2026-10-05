"""add workflow statuses to acts and facts

Revision ID: 70c9a290e0b1
Revises: a24fa0e0903f
Create Date: 2026-10-05
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '70c9a290e0b1'
down_revision = 'a24fa0e0903f'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Мигрируем старые значения статуса в acts (если есть "created" → "draft")
    op.execute("UPDATE acts SET status = 'draft' WHERE status = 'created'")
    
    # 2. Создаём PostgreSQL enum тип для ActStatus
    op.execute("CREATE TYPE actstatus AS ENUM ('draft', 'submitted', 'approved', 'signed')")
    
    # 3. Безопасно меняем тип колонки
    op.execute("ALTER TABLE acts ALTER COLUMN status TYPE actstatus USING status::actstatus")
    op.execute("ALTER TABLE acts ALTER COLUMN status SET DEFAULT 'draft'")
    
    # 4. Добавляем новые поля для аудита workflow в acts
    op.add_column('acts', sa.Column('created_by', sa.Integer(), nullable=True))
    op.add_column('acts', sa.Column('approved_by', sa.Integer(), nullable=True))
    op.add_column('acts', sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('acts', sa.Column('signed_by', sa.Integer(), nullable=True))
    op.add_column('acts', sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('acts', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))
    
    # 5. Добавляем новые поля для аудита workflow в fact_headers (безопасная проверка)
    op.execute("""
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='fact_headers' AND column_name='created_by') THEN
                ALTER TABLE fact_headers ADD COLUMN created_by INTEGER;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='fact_headers' AND column_name='approved_by') THEN
                ALTER TABLE fact_headers ADD COLUMN approved_by INTEGER;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='fact_headers' AND column_name='approved_at') THEN
                ALTER TABLE fact_headers ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
            END IF;
        END $$;
    """)
    
    # 6. Создаём индексы для быстрой фильтрации
    op.create_index('ix_acts_status', 'acts', ['status'])
    op.create_index('ix_acts_date', 'acts', ['act_date'])
    op.create_index('ix_fact_headers_status', 'fact_headers', ['status'])


def downgrade():
    # Удаляем индексы
    op.drop_index('ix_fact_headers_status')
    op.drop_index('ix_acts_date')
    op.drop_index('ix_acts_status')
    
    # Удаляем новые колонки из acts
    op.drop_column('acts', 'updated_at')
    op.drop_column('acts', 'signed_at')
    op.drop_column('acts', 'signed_by')
    op.drop_column('acts', 'approved_at')
    op.drop_column('acts', 'approved_by')
    op.drop_column('acts', 'created_by')
    
    # Возвращаем старый тип status в acts
    op.execute("ALTER TABLE acts ALTER COLUMN status TYPE VARCHAR(20) USING status::varchar")
    op.execute("DROP TYPE IF EXISTS actstatus")
    
    # Удаляем новые колонки из fact_headers
    op.drop_column('fact_headers', 'approved_at')
    op.drop_column('fact_headers', 'approved_by')
    op.drop_column('fact_headers', 'created_by')