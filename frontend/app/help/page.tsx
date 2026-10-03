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
      {/* Приветствие */}
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

      {/* 👥 СИСТЕМА РОЛЕЙ И ПРАВ ДОСТУПА */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            Система ролей и прав доступа
          </CardTitle>
          <CardDescription>
            В системе предусмотрено 4 роли с разным уровнем доступа к функциям
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/30">
              <div className="font-semibold text-purple-900 dark:text-purple-100 mb-2">👑 Администратор</div>
              <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 list-disc list-inside">
                <li>Полный доступ ко всем функциям</li>
                <li>Управление пользователями и ролями</li>
                <li>Все справочники и настройки</li>
                <li>Планирование, факт, акты, отчёты</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📊 Экономист</div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Все справочники и настройки</li>
                <li>Планирование ФЭО</li>
                <li>Анализ себестоимости</li>
                <li>Ввод факта, акты, отчёты</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30">
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">🔧 Мастер участка</div>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
                <li>Просмотр справочников и планов</li>
                <li>Ввод фактических данных</li>
                <li>Формирование актов</li>
                <li>Просмотр отчётов</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-950/30">
              <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">👁️ Наблюдатель</div>
              <ul className="text-sm text-gray-800 dark:text-gray-200 space-y-1 list-disc list-inside">
                <li>Просмотр дашборда</li>
                <li>Просмотр актов</li>
                <li>Просмотр отчётов</li>
                <li>Без возможности редактирования</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200">
            <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">💡 Как узнать свою роль?</div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Ваша роль отображается в правом верхнем углу страницы рядом с вашим именем. 
              В зависимости от роли вам доступны разные разделы меню и функции.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 🎯 13-ШАГОВАЯ ПОШАГОВАЯ ИНСТРУКЦИЯ */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Пошаговая инструкция: от первого объекта до годового отчёта
          </CardTitle>
          <CardDescription>
            Следуйте этим 13 шагам по порядку. Шаги 1–8 выполняются один раз при настройке системы,
            далее — ежемесячная работа.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="font-semibold text-sm text-blue-900 mb-2">📋 Общий порядок работы:</div>
            <div className="text-sm text-blue-800 space-y-1">
              <div><strong>СПРАВОЧНИКИ</strong> (заполняются один раз): Объекты → Ед. изм. → Категории → Услуги → Ресурсы → Расценки на ресурсы → Нормативы → Настройки расчёта</div>
              <div><strong>РАСЧЁТЫ</strong>: Расчёт расценок на услуги (автоматически)</div>
              <div><strong>ЕЖЕМЕСЯЧНАЯ РАБОТА</strong>: Планирование → Ввод факта → Акты</div>
              <div><strong>ИТОГОВАЯ РАБОТА</strong>: Годовой отчёт</div>
            </div>
          </div>

          <div className="space-y-4">
            <Step number={1} title="Создайте объекты обслуживания" description="Добавьте в справочник все МКД и паркинги, которые вы обслуживаете" link="/objects" linkText="Перейти к объектам →" details={['Укажите название объекта (например, "МКД ул. Ленина, д. 1")', 'Выберите тип: МКД или Паркинг', 'Для МКД укажите общую площадь в м²', 'Для паркинга — количество машиномест и базу расчёта тарифа']} />
            <Step number={2} title="Заполните единицы измерения" description="Добавьте единицы измерения, которые используются в услугах" link="/units" linkText="Перейти к единицам измерения →" details={['Используйте пресеты для быстрого добавления: м², шт, час, п.м., компл.', 'Если нужной единицы нет — создайте свою (код латиницей, обозначение, название)', 'Обычно достаточно 5–8 единиц измерения']} />
            <Step number={3} title="Создайте категории услуг" description="Группировка услуг для удобства отображения в планах и отчётах" link="/service-categories" linkText="Перейти к категориям →" details={['Используйте пресеты: Управление, Содержание ОИ, Текущий ремонт, Коммунальные ресурсы', 'Порядок категорий можно менять кнопками ↑ и ↓', 'Порядок определяет, как услуги будут отображаться в планах и отчётах']} />
            <Step number={4} title="Настройте виды услуг" description="Создайте конкретные виды работ, которые вы выполняете" link="/services" linkText="Перейти к услугам →" details={['Укажите код услуги (уникальный!), категорию, единицу измерения', 'Определите периодичность: ежедневно, ежемесячно, по заявке и т.д.', '⚠️ Пока не нажимайте "💾 Сохранить и рассчитать" — сначала заполните ресурсы!']} />
            <Step number={5} title="Добавьте ресурсы" description="Создайте справочник материалов, трудозатрат, транспорта и энергии" link="/resources" linkText="Перейти к ресурсам →" details={['Используйте пресеты: краска, лампочки, труд дворника, сантехника и т.д.', 'Каждый ресурс имеет тип: материал, труд, транспорт, энергия, прочее', 'Тип ресурса используется для анализа себестоимости']} />
            <Step number={6} title="Установите расценки на ресурсы" description="Укажите стоимость каждой единицы ресурса" link="/resources" linkText="Перейти к расценкам на ресурсы →" details={['Перейдите на вкладку "💰 Расценки" в разделе Ресурсы', 'Укажите цену за единицу и дату начала действия', 'Если цена меняется в течение года — создайте несколько записей с разными периодами']} />
            <Step number={7} title="Задайте нормативы расхода" description="Свяжите услуги с ресурсами: сколько ресурса нужно на 1 единицу услуги" link="/resources" linkText="Перейти к нормативам →" details={['Перейдите на вкладку "📊 Нормативы" в разделе Ресурсы', 'Пример: "На 1 м² покраски нужно 0.5 л краски"', 'Одна услуга может иметь несколько нормативов (разные ресурсы)']} />
            <Step number={8} title="Настройте расчёт расценок" description="Определите накладные расходы, норму прибыли и НДС" link="/pricing-settings" linkText="Перейти к настройкам расчёта →" details={['Создайте глобальные настройки (применяются ко всем услугам и объектам)', 'Укажите накладные расходы (%), норму прибыли (%) и НДС (%)', 'Система имеет 4 уровня приоритета: услуга+объект → услуга → объект → глобальные', 'Используйте встроенный калькулятор для проверки расчёта']} />
            <Step number={9} title="Рассчитайте расценки на услуги" description="Сформируйте итоговые цены на услуги на основе ресурсов и настроек" link="/services" linkText="Перейти к услугам →" details={['Откройте услугу и нажмите "💾 Сохранить и рассчитать"', 'Выберите объект и дату, система рассчитает себестоимость + наценки + НДС', 'Нажмите "✅ Создать расценку" — она автоматически появится в справочнике расценок', 'Повторите для каждой услуги']} />
            <Step number={10} title="Составьте план ФЭО" description="Создайте план обслуживания на нужный период" link="/plans" linkText="Перейти к планированию →" details={['Выберите объект и период планирования (от 1 до 36 месяцев)', 'Добавьте услуги — система автоматически подставит расценки для каждого месяца', 'Тариф рассчитается автоматически на м² или машиноместо', 'Используйте копирование плана с индексацией на ИПЦ для новых периодов']} />
            <Step number={11} title="Ежемесячно вносите фактические данные" description="Фиксируйте реально выполненные работы каждый месяц" link="/facts" linkText="Перейти к вводу факта →" details={['Создайте факт для нужного объекта и месяца', 'Нажмите "Копировать из плана" — система заполнит данные автоматически', 'Отредактируйте фактические объёмы (кнопка ✏️)', 'Система покажет отклонения от плана с цветовой индикацией']} />
            <Step number={12} title="Сформируйте акты" description="Создайте акты выполненных работ на основе факта" link="/acts" linkText="Перейти к актам →" details={['Нажмите "Сформировать акт" и выберите факт', 'Система автоматически перенесёт все позиции с периодичностью', 'Экспортируйте акт в PDF для печати и подписи']} />
            <Step number={13} title="Создайте годовой отчёт" description="Агрегируйте акты за год и получите итоговую картину" link="/reports" linkText="Перейти к отчётам →" details={['Выберите объект и период (например, Январь — Декабрь 2026)', 'Система автоматически соберёт данные всех актов за период', 'Позиции группируются по категориям услуг', 'Экспортируйте отчёт в Excel или PDF']} />
          </div>
        </CardContent>
      </Card>

      {/* ✅ ЧЕК-ЛИСТ ГОТОВНОСТИ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            Чек-лист готовности к планированию
          </CardTitle>
          <CardDescription>
            Используйте этот чек-лист, чтобы убедиться, что всё готово к созданию плана
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">📚 Справочники (заполнить один раз):</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Создан хотя бы один объект (МКД или паркинг)</li>
                <li>Заполнены единицы измерения (м², шт, час и т.д.)</li>
                <li>Созданы категории услуг (Управление, Содержание ОИ и т.д.)</li>
                <li>Созданы виды услуг с привязкой к категориям и единицам</li>
                <li>Созданы ресурсы (материалы, трудозатраты)</li>
                <li>Установлены расценки на ресурсы</li>
                <li>Заданы нормативы расхода (услуга → ресурс)</li>
                <li>Созданы настройки расчёта (накладные, прибыль, НДС)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">🧮 Расчёты:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Для каждой услуги рассчитана расценка через калькулятор</li>
                <li>Расценки отображаются в разделе "Расценки" (/rates)</li>
                <li>Проверена работа калькулятора (себестоимость ≠ 0 для услуг с нормативами)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">📋 Планирование и документооборот:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Создан план ФЭО на нужный период</li>
                <li>В план добавлены все услуги</li>
                <li>Тариф рассчитан корректно</li>
                <li>Ежемесячно вводится факт</li>
                <li>На основе факта формируются акты</li>
                <li>По итогам периода создаётся отчёт</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ⏱️ ОЦЕНОЧНОЕ ВРЕМЯ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            Оценочное время работы
          </CardTitle>
          <CardDescription>
            Сколько времени занимает каждый этап
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold">Этап</th>
                  <th className="text-center p-3 font-semibold">Время</th>
                  <th className="text-center p-3 font-semibold">Частота</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="p-3">Создание объектов</td><td className="text-center p-3">5–10 мин</td><td className="text-center p-3 text-muted-foreground">Один раз</td></tr>
                <tr className="border-t bg-muted/30"><td className="p-3">Единицы измерения</td><td className="text-center p-3">2–5 мин</td><td className="text-center p-3 text-muted-foreground">Один раз</td></tr>
                <tr className="border-t"><td className="p-3">Категории услуг</td><td className="text-center p-3">2–5 мин</td><td className="text-center p-3 text-muted-foreground">Один раз</td></tr>
                <tr className="border-t bg-muted/30"><td className="p-3">Виды услуг (20–30 шт)</td><td className="text-center p-3">15–30 мин</td><td className="text-center p-3 text-muted-foreground">Один раз</td></tr>
                <tr className="border-t"><td className="p-3">Ресурсы (10–15 шт)</td><td className="text-center p-3">10–15 мин</td><td className="text-center p-3 text-muted-foreground">Один раз</td></tr>
                <tr className="border-t bg-muted/30"><td className="p-3">Расценки на ресурсы</td><td className="text-center p-3">5–10 мин</td><td className="text-center p-3 text-muted-foreground">При изменении цен</td></tr>
                <tr className="border-t"><td className="p-3">Нормативы (30–50 шт)</td><td className="text-center p-3">30–60 мин</td><td className="text-center p-3 text-muted-foreground">Один раз</td></tr>
                <tr className="border-t bg-muted/30"><td className="p-3">Настройки расчёта</td><td className="text-center p-3">5 мин</td><td className="text-center p-3 text-muted-foreground">Один раз</td></tr>
                <tr className="border-t"><td className="p-3">Расчёт расценок на услуги</td><td className="text-center p-3">15–30 мин</td><td className="text-center p-3 text-muted-foreground">При изменении цен</td></tr>
                <tr className="border-t bg-muted/30"><td className="p-3">Создание плана</td><td className="text-center p-3">20–40 мин</td><td className="text-center p-3 text-muted-foreground">Раз в год</td></tr>
                <tr className="border-t"><td className="p-3">Ввод факта</td><td className="text-center p-3">10–15 мин</td><td className="text-center p-3 text-primary font-semibold">Ежемесячно</td></tr>
                <tr className="border-t bg-muted/30"><td className="p-3">Формирование акта</td><td className="text-center p-3">2–5 мин</td><td className="text-center p-3 text-primary font-semibold">Ежемесячно</td></tr>
                <tr className="border-t"><td className="p-3">Годовой отчёт</td><td className="text-center p-3">2–5 мин</td><td className="text-center p-3 text-muted-foreground">Раз в год</td></tr>
              </tbody>
              <tfoot className="bg-primary/10">
                <tr>
                  <td className="p-3 font-bold">ИТОГО первоначальная настройка</td>
                  <td className="text-center p-3 font-bold text-primary" colSpan={2}>~2–3 часа</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold">Ежемесячная работа</td>
                  <td className="text-center p-3 font-bold text-primary" colSpan={2}>~15–20 минут</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 💡 СОВЕТЫ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Советы по эффективной работе
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tip title="Настраивайте ресурсы и нормативы заранее" text="Чем точнее заданы нормативы расхода материалов и труда, тем точнее система рассчитает себестоимость и итоговую расценку." />
          <Tip title="Используйте глобальные настройки расчёта" text="Если накладные, прибыль и НДС одинаковы для всех объектов, создайте одну глобальную настройку. Она будет использоваться по умолчанию." />
          <Tip title="Копируйте факт из плана" text="При вводе факта сначала нажмите 'Копировать из плана' — это заполнит все позиции автоматически. Затем скорректируйте фактические объёмы." />
          <Tip title="Моделируйте изменения цен" text="Перед заключением новых договоров с поставщиками используйте раздел 'Анализ себестоимости', чтобы понять, как рост цен на ресурсы повлияет на итоговый тариф." />
          <Tip title="Копируйте планы с индексацией" text="При переходе на новый год не создавайте план с нуля — скопируйте предыдущий и примените индексацию на ИПЦ. Это сэкономит часы работы." />
          <Tip title="Вводите факт в первые 5 дней месяца" text="Это обеспечит своевременное формирование актов и ускорит документооборот с заказчиком." />
        </CardContent>
      </Card>

      {/* ❓ FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">❓</span>
            Часто задаваемые вопросы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FAQ question="Как узнать, какие функции мне доступны?" answer="Ваша роль отображается в правом верхнем углу страницы. В зависимости от роли вам доступны разные разделы меню. Если какого-то раздела нет в меню — значит, у вас нет прав доступа к нему." />
            <FAQ question="Как система рассчитывает расценку на услугу?" answer="Система суммирует стоимость всех ресурсов, необходимых для 1 единицы услуги (норматив × цена ресурса). Затем последовательно применяются: накладные расходы, норма прибыли и НДС, согласно настройкам расчёта." />
            <FAQ question="Можно ли планировать не на календарный год?" answer="Да! Вы можете указать любой месяц начала и любую длительность от 1 до 36 месяцев. Например, план с ноября 2026 по октябрь 2027." />
            <FAQ question="Можно ли установить разные цены для разных объектов?" answer="Да! В разделе 'Расценки' создайте расценку для конкретного объекта. Если для объекта расценка не задана, будет использована глобальная." />
            <FAQ question="Что делать, если расценка меняется в течение года?" answer="Создайте несколько записей расценок с разными периодами действия. Например: 'Янв-Июн 2026: 100 ₽' и 'Июл-Дек 2026: 110 ₽'. При планировании система автоматически подставит нужную цену для каждого месяца." />
            <FAQ question="Как проиндексировать тариф на инфляцию?" answer="При копировании плана укажите процент индексации (например, 5 для 5%). Система автоматически увеличит все цены на указанный процент." />
            <FAQ question="Можно ли изменить период уже созданного отчёта?" answer="Да! Нажмите 'Редактировать' в отчёте и измените даты начала и конца. Система автоматически пересчитает данные на основе актов за новый период." />
            <FAQ question="Как создать отчёт за квартал?" answer="Перейдите в раздел 'Отчёты', нажмите 'Создать отчёт', выберите объект и период (например, Январь — Март 2026). Система автоматически соберёт данные всех актов за этот период." />
            <FAQ question="Что делать, если услуга из Excel не нашлась при импорте?" answer="Сначала добавьте её в справочник услуг (раздел 'Услуги'), затем повторите импорт. Система сопоставит услуги по точному совпадению названия." />
            <FAQ question="Куда сохраняются экспортированные файлы?" answer="Файлы скачиваются в папку 'Загрузки' вашего браузера. Имена файлов содержат название объекта и период для удобства." />
          </div>
        </CardContent>
      </Card>

      {/* 🔗 БЫСТРЫЕ ССЫЛКИ */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🚀</span>
            <div className="flex-1">
              <h3 className="font-semibold mb-3">Быстрый старт</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <Link href="/objects" className="text-primary hover:underline">🏢 Создать объект</Link>
                <Link href="/services" className="text-primary hover:underline">🔧 Добавить услугу</Link>
                <Link href="/resources" className="text-primary hover:underline">📦 Настроить ресурсы</Link>
                <Link href="/pricing-settings" className="text-primary hover:underline">⚙️ Настроить расчёт</Link>
                <Link href="/plans" className="text-primary hover:underline">📊 Создать план</Link>
                <Link href="/facts" className="text-primary hover:underline">📋 Ввести факт</Link>
                <Link href="/acts" className="text-primary hover:underline">📄 Сформировать акт</Link>
                <Link href="/reports" className="text-primary hover:underline">📑 Создать отчёт</Link>
              </div>
            </div>
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

      {/* 👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ И РОЛЯМИ */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            Управление пользователями и ролями
          </CardTitle>
          <CardDescription>
            Как создавать пользователей и назначать роли
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Создание первого администратора</h3>
            <p className="text-sm text-muted-foreground mb-2">
              После установки системы создайте первого администратора через скрипт:
            </p>
            <CodeBlock code={`cd ~/Documents/feoservice/backend
source venv/bin/activate
python scripts/create_admin.py`} />
            <p className="text-sm text-muted-foreground mt-2">
              Скрипт запросит email, username, полное имя и пароль. После создания вы сможете войти в систему и управлять другими пользователями через интерфейс.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Управление пользователями через интерфейс</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Перейдите в раздел <Link href="/users" className="text-primary hover:underline">👥 Пользователи</Link> (доступен только администратору):
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li><strong>Создание пользователя:</strong> нажмите "＋ Добавить пользователя", заполните форму и выберите роль</li>
              <li><strong>Редактирование:</strong> нажмите ✏️ рядом с пользователем, измените данные и сохраните</li>
              <li><strong>Блокировка:</strong> снимите галочку "Активный пользователь" — пользователь не сможет войти в систему</li>
              <li><strong>Удаление:</strong> нажмите 🗑️ — пользователь будет удалён из системы</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Описание ролей</h3>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold">Роль</th>
                    <th className="text-left p-3 font-semibold">Описание</th>
                    <th className="text-left p-3 font-semibold">Доступ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-3 font-medium">👑 admin</td>
                    <td className="p-3">Администратор</td>
                    <td className="p-3 text-muted-foreground">Полный доступ ко всем функциям</td>
                  </tr>
                  <tr className="border-t bg-muted/30">
                    <td className="p-3 font-medium">📊 economist</td>
                    <td className="p-3">Экономист</td>
                    <td className="p-3 text-muted-foreground">Справочники, планирование, расчёты, факт, акты, отчёты</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-medium">🔧 master</td>
                    <td className="p-3">Мастер участка</td>
                    <td className="p-3 text-muted-foreground">Просмотр справочников и планов, ввод факта, акты, отчёты</td>
                  </tr>
                  <tr className="border-t bg-muted/30">
                    <td className="p-3 font-medium">👁️ viewer</td>
                    <td className="p-3">Наблюдатель</td>
                    <td className="p-3 text-muted-foreground">Только просмотр: дашборд, акты, отчёты</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Матрица прав доступа</h3>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-semibold">Раздел</th>
                    <th className="text-center p-2 font-semibold">admin</th>
                    <th className="text-center p-2 font-semibold">economist</th>
                    <th className="text-center p-2 font-semibold">master</th>
                    <th className="text-center p-2 font-semibold">viewer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t"><td className="p-2">Управление пользователями</td><td className="text-center p-2">✅</td><td className="text-center p-2">❌</td><td className="text-center p-2">❌</td><td className="text-center p-2">❌</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-2">Справочники (объекты, услуги, ресурсы)</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">❌</td><td className="text-center p-2">❌</td></tr>
                  <tr className="border-t"><td className="p-2">Настройки расчёта</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">❌</td><td className="text-center p-2">❌</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-2">Планирование</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">❌</td><td className="text-center p-2">❌</td></tr>
                  <tr className="border-t"><td className="p-2">Анализ себестоимости</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">❌</td><td className="text-center p-2">❌</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-2">Ввод факта</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">❌</td></tr>
                  <tr className="border-t"><td className="p-2">Акты</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td></tr>
                  <tr className="border-t bg-muted/30"><td className="p-2">Отчёты</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td></tr>
                  <tr className="border-t"><td className="p-2">Дашборд</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td><td className="text-center p-2">✅</td></tr>
                </tbody>
              </table>
            </div>
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
            <CodeBlock code={`git clone https://github.com/your-org/feoservice.git
cd feoservice`} />
          </Section>
          <Section title="2. Запуск PostgreSQL через Docker">
            <CodeBlock code={`docker run -d \\
  --name feoservice_postgres \\
  -e POSTGRES_USER=feoservice \\
  -e POSTGRES_PASSWORD=feoservice_secret \\
  -e POSTGRES_DB=feoservice \\
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
DB_HOST=localhost
DB_PORT=5432
DB_USER=feoservice
DB_PASSWORD=feoservice_secret
DB_NAME=feoservice
SECRET_KEY=your-secret-key-here
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
EOF

# Примените миграции
alembic upgrade head

# Создайте первого администратора
python scripts/create_admin.py

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
│   │   │   ├── user.py          # User (пользователи)
│   │   │   ├── objects.py       # Object
│   │   │   ├── services.py      # ServiceType, ServiceRate, Resource...
│   │   │   ├── planning.py      # PlanHeader, PlanItem, PlanMonthly
│   │   │   ├── facts.py         # FactHeader, FactItem, Act, ActItem
│   │   │   ├── reports.py       # Report, ReportItem
│   │   │   └── pricing_settings.py  # ServicePricingSettings
│   │   ├── schemas/             # Pydantic схемы (валидация)
│   │   │   └── user.py          # UserCreate, UserUpdate, UserResponse
│   │   ├── routers/
│   │   │   ├── auth.py          # Аутентификация (login, me)
│   │   │   ├── users.py         # Управление пользователями
│   │   │   ├── services.py      # Услуги + Расценки
│   │   │   ├── resources.py     # Ресурсы + Нормативы
│   │   │   ├── planning.py      # Планы + импорт/экспорт
│   │   │   ├── pricing_settings.py  # Настройки расчёта
│   │   │   └── cost_analysis.py     # Анализ себестоимости
│   │   ├── core/
│   │   │   └── security.py      # JWT, хеширование паролей, проверки ролей
│   │   └── main.py              # Точка входа
│   ├── alembic/                 # Миграции БД
│   ├── scripts/
│   │   └── create_admin.py      # Скрипт создания первого админа
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Главная (с приветствием по роли)
│   │   ├── login/page.tsx       # Страница входа
│   │   ├── users/page.tsx       # Управление пользователями (admin)
│   │   ├── objects/             # Объекты
│   │   ├── services/            # Услуги (с калькулятором)
│   │   ├── plans/               # Планирование
│   │   ├── facts/               # Ввод факта
│   │   ├── acts/                # Акты
│   │   ├── reports/             # Отчёты
│   │   ├── dashboard/           # Дашборд
│   │   └── help/                # Это руководство
│   ├── context/
│   │   └── AuthContext.tsx      # Контекст авторизации
│   ├── lib/
│   │   ├── api.ts               # API-клиент + типы
│   │   └── rbac.tsx             # Компонент CanAccess для проверки ролей
│   └── components/
│       └── app-header.tsx       # Навигация с фильтрацией по ролям
│
├── docker-compose.yml           # Docker-оркестрация
└── SPEC.md                      # Спецификация проекта`} />
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
            <Troubleshoot problem="Backend не запускается: 'password authentication failed'" solution="Проверьте, что учётные данные в backend/.env совпадают с теми, что заданы при создании Docker-контейнера PostgreSQL (DB_USER, DB_PASSWORD, DB_NAME)." />
            <Troubleshoot problem="Пользователь не может войти: 'Не удалось подтвердить учётные данные'" solution="Проверьте, что пользователь активен (is_active=True). Если токен истёк, очистите localStorage в браузере и войдите заново." />
            <Troubleshoot problem="После входа все запросы возвращают 401 Unauthorized" solution="Проверьте, что в backend/app/core/security.py функция get_current_user корректно преобразует user_id в int. Также убедитесь, что BACKEND_CORS_ORIGINS распарсился как список, а не как строка." />
            <Troubleshoot problem="Frontend не видит backend (CORS ошибка)" solution="Проверьте BACKEND_CORS_ORIGINS в backend/.env — должен содержать URL фронтенда. Также проверьте NEXT_PUBLIC_API_URL в frontend/.env.local." />
            <Troubleshoot problem="Ошибка 'relation does not exist'" solution="Запустите 'alembic upgrade head' для применения миграций. Если миграции уже применены, проверьте DATABASE_URL в .env." />
            <Troubleshoot problem="Docker-контейнер PostgreSQL не запускается" solution="Проверьте, что порт 5432 не занят: 'lsof -i :5432'. Если занят, остановите другой процесс или измените порт в docker run." />
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
    <div className="flex gap-4 p-4 rounded-lg border bg-background hover:border-primary/50 transition-colors">
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