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
            <li>Вести справочники объектов, услуг, ресурсов и расценок</li>
            <li>Рассчитывать себестоимость на основе нормативов ресурсов</li>
            <li>Планировать ФЭО тарифа с помесячными расценками</li>
            <li>Вести учёт фактически выполненных работ</li>
            <li>Автоматически сравнивать план и факт</li>
            <li>Формировать акты выполненных работ</li>
            <li>Создавать отчёты за произвольный период</li>
            <li>Анализировать структуру себестоимости и моделировать изменения цен</li>
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
            Система построена вокруг 10 основных этапов работы
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
              title="Настройте справочники услуг"
              description="Создайте категории, единицы измерения и виды услуг"
              link="/services"
              linkText="Перейти к услугам →"
              details={[
                'Создайте категории (Управление, Содержание ОИ, Текущий ремонт и т.д.)',
                'Укажите код услуги, выберите категорию и единицу измерения',
                'Определите периодичность: ежедневно, ежемесячно, по заявке',
              ]}
            />
            <Step
              number={3}
              title="Добавьте ресурсы и нормативы"
              description="Настройте материалы и трудозатраты для услуг"
              link="/resources"
              linkText="Перейти к ресурсам →"
              details={[
                'Создайте справочник ресурсов (краска, труд дворника и т.д.)',
                'Установите расценки на ресурсы с периодами действия',
                'Задайте нормативы: сколько ресурса нужно на 1 единицу услуги',
                'Например: "На 1 м² покраски нужно 0.5 л краски"',
              ]}
            />
            <Step
              number={4}
              title="Настройте расчёт расценок"
              description="Определите накладные расходы, норму прибыли и НДС"
              link="/pricing-settings"
              linkText="Перейти к настройкам расчёта →"
              details={[
                'Создайте глобальные настройки (применяются ко всем услугам и объектам)',
                'При необходимости создайте индивидуальные настройки для конкретных услуг или объектов',
                'Укажите накладные расходы (%), норму прибыли (%) и НДС (%)',
                'Система автоматически применяет настройки по приоритету: услуга+объект → услуга → объект → глобальные',
              ]}
            />
            <Step
              number={5}
              title="Рассчитайте и установите расценки"
              description="Сформируйте цены на услуги на основе ресурсов и настроек"
              link="/services"
              linkText="Перейти к услугам →"
              details={[
                'При создании или редактировании услуги нажмите "Сохранить и рассчитать"',
                'Система автоматически рассчитает себестоимость, добавит наценки и НДС',
                'Подтвердите создание расценки, она будет привязана к объекту и периоду',
              ]}
            />
            <Step
              number={6}
              title="Составьте план ФЭО"
              description="Создайте план обслуживания на нужный период"
              link="/plans"
              linkText="Перейти к планированию →"
              details={[
                'Выберите объект и период планирования (от 1 до 36 месяцев)',
                'Добавьте услуги — система автоматически подставит расценки для каждого месяца',
                'Тариф рассчитается автоматически на м² или машиноместо',
                'Используйте копирование плана с индексацией на ИПЦ для новых периодов',
              ]}
            />
            <Step
              number={7}
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
              number={8}
              title="Сформируйте акты"
              description="Создайте акты выполненных работ на основе факта"
              link="/acts"
              linkText="Перейти к актам →"
              details={[
                'Нажмите "Сформировать акт" и выберите факт',
                'Система автоматически перенесёт все позиции с периодичностью',
                'Экспортируйте акт в PDF для печати и подписи',
              ]}
            />
            <Step
              number={9}
              title="Создавайте отчёты"
              description="Агрегируйте акты за произвольный период"
              link="/reports"
              linkText="Перейти к отчётам →"
              details={[
                'Выберите объект и период отчёта (например, Январь — Сентябрь 2026)',
                'Система автоматически соберёт данные всех актов за период',
                'Позиции группируются по категориям услуг',
                'Экспортируйте отчёт в Excel или PDF',
              ]}
            />
            <Step
              number={10}
              title="Анализируйте показатели"
              description="Используйте дашборд и анализ себестоимости для принятия решений"
              link="/dashboard"
              linkText="Перейти к аналитике →"
              details={[
                'KPI-карточки с основными показателями',
                'График план-факт по месяцам и топ-5 услуг по отклонениям',
                'Детальная разбивка себестоимости по типам ресурсов (материалы, труд и т.д.)',
                'Моделирование: как изменится тариф при росте цен на ресурсы',
              ]}
            />
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
            title="Настраивайте ресурсы и нормативы заранее"
            text="Чем точнее заданы нормативы расхода материалов и труда, тем точнее система рассчитает себестоимость и итоговую расценку."
          />
          <Tip
            title="Используйте глобальные настройки расчёта"
            text="Если накладные, прибыль и НДС одинаковы для всех объектов, создайте одну глобальную настройку. Она будет использоваться по умолчанию."
          />
          <Tip
            title="Копируйте факт из плана"
            text="При вводе факта сначала нажмите 'Копировать из плана' — это заполнит все позиции автоматически. Затем скорректируйте фактические объёмы."
          />
          <Tip
            title="Моделируйте изменения цен"
            text="Перед заключением новых договоров с поставщиками используйте раздел 'Анализ себестоимости', чтобы понять, как рост цен на ресурсы повлияет на итоговый тариф."
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
              question="Как система рассчитывает расценку на услугу?"
              answer="Система суммирует стоимость всех ресурсов, необходимых для 1 единицы услуги (норматив × цена ресурса). Затем последовательно применяются: накладные расходы, норма прибыли и НДС, согласно настройкам расчёта."
            />
            <FAQ
              question="Можно ли установить разные цены для разных объектов?"
              answer="Да! В разделе 'Расценки' создайте расценку для конкретного объекта. Если для объекта расценка не задана, будет использована глобальная."
            />
            <FAQ
              question="Что делать, если расценка на ресурс меняется в течение года?"
              answer="Создайте несколько записей расценок на ресурс с разными периодами действия. При расчёте или планировании система автоматически подставит нужную цену для каждого месяца."
            />
            <FAQ
              question="Можно ли изменить период уже созданного отчёта?"
              answer="Да! Нажмите 'Редактировать' в отчёте и измените даты начала и конца. Система автоматически пересчитает данные на основе актов за новый период."
            />
            <FAQ
              question="Как проиндексировать тариф на инфляцию?"
              answer="При копировании плана укажите процент индексации (например, 5 для 5%). Система автоматически увеличит все цены на указанный процент."
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
            <strong>Технологический стек:</strong> Python 3.9, FastAPI, PostgreSQL 15, Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts, openpyxl, reportlab
          </div>
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
          <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto">
{`feoservice/
├── backend/
│   ├── app/
│   │   ├── models/              # SQLAlchemy модели (БД)
│   │   │   ├── base.py
│   │   │   ├── enums.py         # ObjectType, PlanStatus, FactStatus
│   │   │   ├── objects.py       # Object
│   │   │   ├── units.py         # Unit
│   │   │   ├── service_category.py  # ServiceCategory
│   │   │   ├── services.py      # ServiceType, ServiceRate, Resource, ResourceRate, ResourceNorm
│   │   │   ├── planning.py      # PlanHeader, PlanItem, PlanMonthly, PlanResource
│   │   │   ├── facts.py         # FactHeader, FactItem, Act, ActItem
│   │   │   ├── reports.py       # Report, ReportItem
│   │   │   └── pricing_settings.py  # 🆕 ServicePricingSettings
│   │   ├── schemas/             # Pydantic схемы (валидация)
│   │   │   ├── object.py, service.py, plan.py, fact.py, act.py, report.py
│   │   │   ├── pricing_settings.py  # 🆕 Схемы настроек расчёта
│   │   │   └── cost_analysis.py     # 🆕 Схемы анализа себестоимости
│   │   ├── routers/
│   │   │   ├── objects.py, services.py, planning.py, facts.py, acts.py, reports.py
│   │   │   ├── pricing_settings.py  # 🆕 CRUD настроек расчёта и калькулятор
│   │   │   └── cost_analysis.py     # 🆕 Анализ структуры себестоимости и моделирование
│   │   ├── utils/
│   │   │   ├── export.py        # Excel/PDF экспорт
│   │   │   └── excel_import.py  # Парсинг Excel с очисткой текста
│   │   ├── db/database.py       # Подключение к БД
│   │   ├── core/config.py       # Настройки
│   │   └── main.py              # Точка входа FastAPI
│   ├── alembic/                 # Миграции БД
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── layout.tsx           # metadata: "ДомСервис"
    │   ├── page.tsx             # Главная страница
    │   ├── objects/page.tsx     # Объекты
    │   ├── services/page.tsx    # Услуги (с калькулятором расценок)
    │   ├── service-categories/page.tsx # Категории
    │   ├── units/page.tsx       # Единицы измерения
    │   ├── rates/page.tsx       # Расценки на услуги
    │   ├── resources/page.tsx   # 🆕 Ресурсы, расценки и нормативы
    │   ├── pricing-settings/page.tsx # 🆕 Настройки расчёта (накладные, прибыль, НДС)
    │   ├── cost-analysis/page.tsx    # 🆕 Анализ себестоимости и моделирование
    │   ├── plans/page.tsx       # Планирование (с массовым пересчётом)
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
    └── lib/api.ts               # API-клиент + типы`}
          </pre>
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
              problem="Расценки не подставляются в план или равны 0"
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