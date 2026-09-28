// frontend/app/help/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type TabType = 'user' | 'admin';

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<TabType>('user');

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">📚 Руководство по ДомСервис</h1>
        <p className="text-muted-foreground mt-2">
          Полное руководство по использованию системы и её администрированию
        </p>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'user' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('user')}
          className="rounded-b-none"
        >
          👤 Для пользователя
        </Button>
        <Button
          variant={activeTab === 'admin' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('admin')}
          className="rounded-b-none"
        >
          🛠️ Для администратора
        </Button>
      </div>

      {activeTab === 'user' ? <UserGuide /> : <AdminGuide />}
    </div>
  );
}

// ============================================================
// РУКОВОДСТВО ДЛЯ ПОЛЬЗОВАТЕЛЯ
// ============================================================
function UserGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">👋</span>
            Добро пожаловать в ДомСервис!
          </CardTitle>
          <CardDescription>
            Комплексная система управления обслуживанием МКД и паркингов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <strong>ДомСервис</strong> — это система для экономистов и руководителей
            управляющих компаний, которая позволяет:
          </p>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li>Вести справочники объектов, услуг и расценок</li>
            <li>Планировать ФЭО тарифа с помесячными расценками</li>
            <li>Вести учёт фактически выполненных работ</li>
            <li>Автоматически сравнивать план и факт</li>
            <li>Формировать акты выполненных работ</li>
            <li>Создавать отчёты за произвольный период</li>
            <li>Импортировать планы из Excel и экспортировать данные в Excel/PDF</li>
            <li>Анализировать показатели на дашборде</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Основной рабочий процесс
          </CardTitle>
          <CardDescription>
            Система построена вокруг 8 основных этапов работы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Step
              number={1}
              title="Создайте объекты обслуживания"
              description="Добавьте в справочник все МКД и паркинги, которые вы обслуживаете"
              link="/objects"
              linkText="Перейти к объектам →"
              details={[
                'Укажите название объекта (например, "МКД Ленина 1")',
                'Выберите тип: МКД или Паркинг',
                'Для МКД укажите общую площадь в м²',
                'Для паркинга — количество машиномест и базу расчёта тарифа',
              ]}
            />

            <Step
              number={2}
              title="Настройте справочник услуг"
              description="Создайте виды услуг, которые вы оказываете"
              link="/services"
              linkText="Перейти к услугам →"
              details={[
                'Укажите код услуги (например, "SRV-001")',
                'Выберите категорию: Управление, Содержание ОИ, Текущий ремонт и т.д.',
                'Укажите единицу измерения: м², шт, час и т.д.',
                'Определите периодичность: ежедневно, ежемесячно, по заявке',
              ]}
            />

            <Step
              number={3}
              title="Установите расценки"
              description="Настройте цены на услуги для каждого объекта"
              link="/rates"
              linkText="Перейти к расценкам →"
              details={[
                'Выберите объект (или оставьте пустым для глобальной расценки)',
                'Укажите услугу и цену за единицу',
                'Задайте месяц начала действия (обязательно)',
                'При необходимости укажите месяц окончания действия',
                'Расценки могут меняться в течение года — создавайте несколько записей',
              ]}
            />

            <Step
              number={4}
              title="Составьте план ФЭО"
              description="Создайте план обслуживания на нужный период"
              link="/plans"
              linkText="Перейти к планированию →"
              details={[
                'Выберите объект и период планирования (от 1 до 36 месяцев)',
                'Добавьте услуги с помесячными объёмами',
                'Система автоматически подставит расценки для каждого месяца',
                'Тариф рассчитается автоматически на м² или машиноместо',
                'Используйте копирование плана с индексацией на ИПЦ для новых периодов',
                'Можно импортировать план из Excel-файла',
              ]}
            />

            <Step
              number={5}
              title="Вносите фактические данные"
              description="Ежемесячно фиксируйте реально выполненные работы"
              link="/facts"
              linkText="Перейти к вводу факта →"
              details={[
                'Создайте факт для нужного объекта и месяца',
                'Нажмите "Копировать из плана" — система заполнит данные автоматически',
                'Отредактируйте фактические объёмы (кнопка ✏️)',
                'Система покажет отклонения от плана с цветовой индикацией',
              ]}
            />

            <Step
              number={6}
              title="Сформируйте акты"
              description="Создайте акты выполненных работ на основе факта"
              link="/acts"
              linkText="Перейти к актам →"
              details={[
                'Нажмите "Сформировать акт" и выберите факт',
                'Система автоматически перенесёт все позиции с периодичностью',
                'Экспортируйте акт в PDF для печати и подписи',
                'Акт будет содержать все необходимые реквизиты',
              ]}
            />

            <Step
              number={7}
              title="Создавайте отчёты"
              description="Агрегируйте акты за произвольный период"
              link="/reports"
              linkText="Перейти к отчётам →"
              details={[
                'Выберите объект и период отчёта (например, Январь — Сентябрь 2026)',
                'Система автоматически соберёт данные всех актов за период',
                'Позиции группируются по категориям услуг',
                'Экспортируйте отчёт в Excel или PDF',
                'При изменении периода данные пересчитываются автоматически',
              ]}
            />

            <Step
              number={8}
              title="Анализируйте показатели"
              description="Используйте дашборд для принятия решений"
              link="/dashboard"
              linkText="Перейти к дашборду →"
              details={[
                'KPI-карточки с основными показателями',
                'График план-факт по месяцам',
                'Топ-5 услуг по отклонениям',
                'Распределение сумм по категориям',
                'Алерты при значительных отклонениях (>20%)',
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            Дополнительные возможности
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Feature icon="📊" title="Дашборд" description="Обзорная аналитика: KPI, графики план-факт, топ отклонений" link="/dashboard" />
            <Feature icon="📥" title="Импорт из Excel" description="Быстрая загрузка плана из Excel-файла с автосопоставлением услуг" link="/plans/import" />
            <Feature icon="💰" title="Расценки по объектам" description="Гибкая настройка цен: для каждого объекта свои расценки с периодом действия" link="/rates" />
            <Feature icon="📑" title="Отчёты за период" description="Агрегация актов за любой период с группировкой по категориям" link="/reports" />
            <Feature icon="📋" title="Копирование планов" description="Создание копии плана с индексацией тарифа на ИПЦ" link="/plans" />
            <Feature icon="📊" title="Экспорт в Excel" description="Выгрузка планов, фактов, актов, отчётов и расценок" link="/plans" />
            <Feature icon="📄" title="Экспорт в PDF" description="Печать планов, фактов и актов в формате PDF с кириллицей" link="/acts" />
            <Feature icon="🔍" title="Фильтрация и поиск" description="Быстрый поиск объектов по городу, планов по объекту" link="/objects" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Советы по эффективной работе
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tip
            title="Настраивайте расценки заранее"
            text="Создайте расценки на весь год вперёд. При планировании система автоматически подставит нужную цену для каждого месяца."
          />
          <Tip
            title="Используйте глобальные расценки"
            text="Если цена на услугу одинакова для всех объектов, создайте одну глобальную расценку (не выбирая объект). Она будет использоваться по умолчанию."
          />
          <Tip
            title="Импортируйте планы из Excel"
            text="Если у вас уже есть планы в Excel, используйте импорт. Система автоматически сопоставит услуги по названию."
          />
          <Tip
            title="Копируйте факт из плана"
            text="При вводе факта сначала нажмите 'Копировать из плана' — это заполнит все позиции автоматически. Затем скорректируйте фактические объёмы."
          />
          <Tip
            title="Следите за отклонениями на дашборде"
            text="Дашборд автоматически показывает алерты при отклонениях более 20%. Это помогает быстро выявлять проблемные объекты."
          />
          <Tip
            title="Используйте отчёты для руководства"
            text="Отчёты за квартал или полугодие — идеальный формат для предоставления руководству. Экспортируйте в PDF для печати."
          />
          <Tip
            title="Копируйте планы с индексацией"
            text="При переходе на новый год не создавайте план с нуля — скопируйте предыдущий и примените индексацию на ИПЦ. Это сэкономит часы работы."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">❓</span>
            Часто задаваемые вопросы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FAQ
              question="Можно ли планировать не на календарный год?"
              answer="Да! Вы можете указать любой месяц начала и любую длительность от 1 до 36 месяцев. Например, план с ноября 2026 по октябрь 2027."
            />
            <FAQ
              question="Как рассчитать тариф для паркинга?"
              answer="При создании паркинга выберите базу расчёта: 'на м² площади' или 'на машиноместо'. Система автоматически разделит общую сумму на выбранную базу."
            />
            <FAQ
              question="Можно ли установить разные цены для разных объектов?"
              answer="Да! В разделе 'Расценки' создайте расценку для конкретного объекта. Если для объекта расценка не задана, будет использована глобальная."
            />
            <FAQ
              question="Что делать, если расценка меняется в течение года?"
              answer="Создайте несколько записей расценок с разными периодами действия. Например: 'Янв-Июн 2026: 100 ₽' и 'Июл-Дек 2026: 110 ₽'. При планировании система автоматически подставит нужную цену для каждого месяца."
            />
            <FAQ
              question="Что делать, если услуга из Excel не нашлась при импорте?"
              answer="Сначала добавьте её в справочник услуг (раздел 'Услуги'), затем повторите импорт. Система сопоставит услуги по точному совпадению названия."
            />
            <FAQ
              question="Можно ли удалить утверждённый план?"
              answer="Нет. Утверждённые планы защищены от удаления. Сначала переведите план в статус 'Черновик', затем удалите."
            />
            <FAQ
              question="Как проиндексировать тариф на инфляцию?"
              answer="При копировании плана укажите процент индексации (например, 5 для 5%). Система автоматически увеличит все цены на указанный процент."
            />
            <FAQ
              question="Как создать отчёт за квартал?"
              answer="Перейдите в раздел 'Отчёты', нажмите 'Создать отчёт', выберите объект и период (например, Январь — Март 2026). Система автоматически соберёт данные всех актов за этот период."
            />
            <FAQ
              question="Куда сохраняются экспортированные файлы?"
              answer="Файлы скачиваются в папку 'Загрузки' вашего браузера. Имена файлов содержат название объекта и период для удобства."
            />
            <FAQ
              question="Можно ли изменить период уже созданного отчёта?"
              answer="Да! Нажмите 'Редактировать' в отчёте и измените даты начала и конца. Система автоматически пересчитает данные на основе актов за новый период."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// РУКОВОДСТВО ДЛЯ АДМИНИСТРАТОРА
// ============================================================
function AdminGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🛠️</span>
            Техническое руководство
          </CardTitle>
          <CardDescription>
            Установка, настройка и поддержка системы ДомСервис
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Это руководство предназначено для системных администраторов и технических специалистов,
            отвечающих за развёртывание и поддержку системы.
          </p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>Технологический стек:</strong> Python 3.9, FastAPI, PostgreSQL, Next.js 14, React 18, Tailwind CSS, Recharts, openpyxl, reportlab
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📦</span>
            Установка системы
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="1. Клонирование репозитория">
            <CodeBlock code="git clone https://github.com/your-org/feoservice.git
cd feoservice" />
          </Section>

          <Section title="2. Запуск PostgreSQL через Docker">
            <CodeBlock code={`docker run -d \\
  --name feoservice_postgres \\
  -e POSTGRES_USER=feouser \\
  -e POSTGRES_PASSWORD=feopass \\
  -e POSTGRES_DB=feodb \\
  -p 5432:5432 \\
  postgres:15`} />
          </Section>

          <Section title="3. Настройка backend">
            <CodeBlock code={`cd backend
python3.9 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Создайте файл .env
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://feouser:feopass@localhost:5432/feodb
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
SECRET_KEY=your-secret-key-here
EOF

# Примените миграции
alembic upgrade head

# Запустите сервер
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`} />
          </Section>

          <Section title="4. Настройка frontend">
            <CodeBlock code={`cd frontend
npm install

# Создайте файл .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
EOF

# Запустите dev-сервер
npm run dev`} />
          </Section>

          <Section title="5. Проверка работы">
            <p className="text-sm mb-2">Откройте в браузере:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Frontend: <a href="http://localhost:3000" className="text-primary hover:underline">http://localhost:3000</a></li>
              <li>Backend API: <a href="http://localhost:8000" className="text-primary hover:underline">http://localhost:8000</a></li>
              <li>Swagger UI: <a href="http://localhost:8000/docs" className="text-primary hover:underline">http://localhost:8000/docs</a></li>
            </ul>
          </Section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📁</span>
            Структура проекта
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`feoservice/
├── backend/
│   ├── app/
│   │   ├── models/              # SQLAlchemy модели (БД)
│   │   │   ├── base.py
│   │   │   ├── enums.py         # ObjectType, PlanStatus, FactStatus
│   │   │   ├── objects.py       # Object
│   │   │   ├── units.py         # Unit
│   │   │   ├── service_category.py  # ServiceCategory
│   │   │   ├── services.py      # ServiceType, ServiceRate, Resource...
│   │   │   ├── planning.py      # PlanHeader, PlanItem, PlanMonthly, PlanResource
│   │   │   ├── facts.py         # FactHeader, FactItem, Act, ActItem
│   │   │   └── reports.py       # Report, ReportItem
│   │   ├── schemas/             # Pydantic схемы (валидация)
│   │   │   ├── object.py
│   │   │   ├── service.py       # + ServiceRate с object_id
│   │   │   ├── plan.py
│   │   │   ├── fact.py
│   │   │   ├── act.py
│   │   │   ├── report.py        # Схемы отчётов
│   │   │   ├── dashboard.py
│   │   │   └── import_plan.py   # Импорт из Excel
│   │   ├── routers/
│   │   │   ├── objects.py       # CRUD объектов
│   │   │   ├── services.py      # Услуги + Расценки
│   │   │   ├── planning.py      # Планы + импорт/экспорт
│   │   │   ├── facts.py         # Факты + план-факт
│   │   │   ├── acts.py          # Акты + PDF
│   │   │   ├── reports.py       # Отчёты + агрегация
│   │   │   └── dashboard.py     # Статистика
│   │   ├── utils/
│   │   │   ├── export.py        # Excel/PDF экспорт
│   │   │   └── excel_import.py  # Парсинг Excel
│   │   ├── db/database.py       # Подключение к БД
│   │   ├── core/config.py       # Настройки
│   │   └── main.py              # Точка входа
│   ├── alembic/                 # Миграции БД
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── layout.tsx           # metadata: "ДомСервис"
    │   ├── page.tsx             # Главная
    │   ├── objects/page.tsx     # Объекты
    │   ├── services/page.tsx    # Услуги
    │   ├── rates/page.tsx       # Расценки
    │   ├── plans/page.tsx       # Планирование
    │   ├── plans/import/page.tsx # Импорт из Excel
    │   ├── facts/page.tsx       # Ввод факта
    │   ├── acts/page.tsx        # Акты
    │   ├── reports/page.tsx     # Отчёты
    │   ├── dashboard/page.tsx   # Дашборд
    │   └── help/page.tsx        # Это руководство
    ├── components/
    │   ├── app-header.tsx       # Навигация
    │   ├── plan-monthly-input.tsx # Модалка ввода помесячных данных
    │   └── ui/                  # shadcn/ui компоненты
    └── lib/api.ts               # API-клиент + типы`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🗄️</span>
            Работа с базой данных
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="Создание новой миграции">
            <CodeBlock code={`cd backend
source venv/bin/activate

# После изменения моделей
alembic revision --autogenerate -m "описание изменений"
alembic upgrade head`} />
          </Section>

          <Section title="Резервное копирование">
            <CodeBlock code={`# Создать дамп БД
docker exec feoservice_postgres pg_dump -U feouser feodb > backup_$(date +%Y%m%d).sql

# Восстановить из дампа
cat backup_20260928.sql | docker exec -i feoservice_postgres psql -U feouser feodb`} />
          </Section>

          <Section title="Автоматическое резервное копирование (cron)">
            <CodeBlock code={`# Добавьте в crontab (ежедневно в 2:00)
0 2 * * * /usr/bin/docker exec feoservice_postgres pg_dump -U feouser feodb > /backups/feodb_$(date +\\%Y\\%m\\%d).sql`} />
          </Section>

          <Section title="Основные таблицы">
            <div className="text-sm space-y-1">
              <p><code className="bg-muted px-1 rounded">objects</code> — объекты обслуживания (МКД, паркинги)</p>
              <p><code className="bg-muted px-1 rounded">service_types</code> — виды услуг (с полем frequency)</p>
              <p><code className="bg-muted px-1 rounded">service_rates</code> — расценки на услуги (с привязкой к объекту)</p>
              <p><code className="bg-muted px-1 rounded">plan_headers</code> — заголовки планов</p>
              <p><code className="bg-muted px-1 rounded">plan_items</code> — позиции планов</p>
              <p><code className="bg-muted px-1 rounded">plan_monthly</code> — помесячная детализация (с unit_price)</p>
              <p><code className="bg-muted px-1 rounded">fact_headers</code> — заголовки фактов</p>
              <p><code className="bg-muted px-1 rounded">fact_items</code> — позиции фактов</p>
              <p><code className="bg-muted px-1 rounded">acts</code> — акты выполненных работ</p>
              <p><code className="bg-muted px-1 rounded">act_items</code> — позиции актов (с frequency)</p>
              <p><code className="bg-muted px-1 rounded">reports</code> — отчёты по объектам за период</p>
              <p><code className="bg-muted px-1 rounded">report_items</code> — позиции отчётов (агрегированные данные)</p>
            </div>
          </Section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🔄</span>
            Обновление системы
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="Получение обновлений">
            <CodeBlock code={`cd feoservice
git pull origin main`} />
          </Section>

          <Section title="Обновление backend">
            <CodeBlock code={`cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
# Перезапустите uvicorn`} />
          </Section>

          <Section title="Обновление frontend">
            <CodeBlock code={`cd frontend
npm install
npm run build
# Перезапустите next`} />
          </Section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            Развёртывание в production
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="Backend (через systemd)">
            <CodeBlock code={`# /etc/systemd/system/feoservice-backend.service
[Unit]
Description=ДомСервис Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/feoservice/backend
Environment="PATH=/opt/feoservice/backend/venv/bin"
ExecStart=/opt/feoservice/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target`} />
          </Section>

          <Section title="Frontend (через PM2)">
            <CodeBlock code={`cd frontend
npm run build
pm2 start npm --name "feoservice-frontend" -- start
pm2 save`} />
          </Section>

          <Section title="Nginx (reverse proxy)">
            <CodeBlock code={`# /etc/nginx/sites-available/feoservice
server {
    listen 80;
    server_name feo.yourcompany.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}`} />
          </Section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            Решение типичных проблем
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Troubleshoot
              problem="Backend не запускается: 'cannot import name...'"
              solution="Проверьте, что все файлы в папках models/, schemas/, routers/ синхронизированы. Часто проблема в том, что в __init__.py импортируется модуль, которого ещё нет."
            />
            <Troubleshoot
              problem="Ошибка 'relation does not exist'"
              solution="Запустите 'alembic upgrade head' для применения миграций. Если миграции уже применены, проверьте DATABASE_URL в .env."
            />
            <Troubleshoot
              problem="В PDF вместо русских букв квадратики"
              solution="Система использует шрифт Arial из /System/Library/Fonts/Supplemental/Arial.ttf. Если его нет, установите шрифт DejaVuSans и поместите в backend/app/utils/fonts/."
            />
            <Troubleshoot
              problem="Frontend не видит backend (CORS ошибка)"
              solution="Проверьте BACKEND_CORS_ORIGINS в backend/.env — должен содержать URL фронтенда. Также проверьте NEXT_PUBLIC_API_URL в frontend/.env.local."
            />
            <Troubleshoot
              problem="При импорте Excel услуга не находится"
              solution="Excel часто добавляет невидимые символы. Система автоматически очищает текст (функция clean_text), но если проблема остаётся, проверьте точное совпадение названий в справочнике и Excel."
            />
            <Troubleshoot
              problem="Миграция падает с 'contains null values'"
              solution="При добавлении NOT NULL колонки в непустую таблицу используйте трёхэтапную миграцию: 1) добавить как nullable, 2) заполнить NULL значения, 3) сделать NOT NULL."
            />
            <Troubleshoot
              problem="Расценки не подставляются в план"
              solution="Проверьте, что для объекта и услуги создана расценка с периодом действия, покрывающим месяц планирования. Если расценки нет ни для объекта, ни глобальной — подставится 0."
            />
            <Troubleshoot
              problem="Docker-контейнер PostgreSQL не запускается"
              solution="Проверьте, что порт 5432 не занят: 'lsof -i :5432'. Если занят, остановите другой процесс или измените порт в docker run."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">📧</span>
            <div>
              <h3 className="font-semibold mb-2">Нужна помощь?</h3>
              <p className="text-sm text-muted-foreground">
                Если у вас возникли вопросы по установке или использованию системы,
                обратитесь к разработчику или в техническую поддержку.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================
function Step({ number, title, description, link, linkText, details }: {
  number: number;
  title: string;
  description: string;
  link: string;
  linkText: string;
  details: string[];
}) {
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-muted/30">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div className="flex-1 space-y-2">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          {details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
        <Link href={link}>
          <Button variant="link" className="p-0 h-auto text-primary hover:underline">
            {linkText}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Feature({ icon, title, description, link }: {
  icon: string;
  title: string;
  description: string;
  link: string;
}) {
  return (
    <Link href={link}>
      <div className="p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-xs text-muted-foreground mt-1">{description}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Tip({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
      <span className="text-xl">💡</span>
      <div>
        <div className="font-semibold text-sm text-amber-900">{title}</div>
        <div className="text-sm text-amber-800 mt-1">{text}</div>
      </div>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{question}</span>
        <span className="text-muted-foreground">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="p-4 pt-0 text-sm text-muted-foreground border-t">
          {answer}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto">
      <code>{code}</code>
    </pre>
  );
}

function Troubleshoot({ problem, solution }: { problem: string; solution: string }) {
  return (
    <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
      <div className="flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <div className="font-semibold text-sm text-red-900">{problem}</div>
          <div className="text-sm text-red-800 mt-1">
            <strong>Решение:</strong> {solution}
          </div>
        </div>
      </div>
    </div>
  );
}