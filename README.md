# ДомСервис

Комплексная система управления обслуживанием МКД и паркингов для управляющих компаний.

## Возможности

- 📚 Справочники: объекты, услуги, расценки
- 📊 Планирование ФЭО тарифа с помесячными расценками
- 📋 Ввод факта с план-факт анализом
- 📄 Формирование актов выполненных работ
- 📑 Отчёты за произвольный период
- 📈 Аналитический дашборд
- 📥 Импорт планов из Excel
- 📤 Экспорт в Excel и PDF

## Технологический стек

- **Backend**: Python 3.9, FastAPI, SQLAlchemy 2.0, PostgreSQL
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts
- **Документы**: openpyxl (Excel), reportlab (PDF)

## Установка

### Backend
```bash
cd backend
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000