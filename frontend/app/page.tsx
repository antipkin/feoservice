// frontend/app/page.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { CanAccess } from '@/lib/rbac';

export default function Home() {
  const { user } = useAuth();

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return { 
          icon: '👑', 
          label: 'Администратор', 
          color: 'purple', 
          description: 'Полный доступ ко всем функциям системы, управление пользователями и ролями' 
        };
      case 'economist':
        return { 
          icon: '📊', 
          label: 'Экономист', 
          color: 'blue', 
          description: 'Управление справочниками, планирование ФЭО, расчёт себестоимости, аналитика' 
        };
      case 'master':
        return { 
          icon: '🔧', 
          label: 'Мастер участка', 
          color: 'green', 
          description: 'Ввод фактических данных, формирование актов, просмотр планов и отчётов' 
        };
      case 'viewer':
        return { 
          icon: '👁️', 
          label: 'Наблюдатель', 
          color: 'gray', 
          description: 'Просмотр дашборда, актов и отчётов без возможности редактирования' 
        };
      default:
        return { icon: '❓', label: 'Неизвестная роль', color: 'gray', description: '' };
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      {/* Приветствие */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Добро пожаловать в <span className="text-primary">ДомСервис</span>
          </h1>
          {user ? (
            <div>
              <p className="text-lg text-muted-foreground">
                Здравствуйте, <strong>{user.full_name}</strong>! 
                <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium bg-${getRoleInfo(user.role).color}-100 text-${getRoleInfo(user.role).color}-800 dark:bg-${getRoleInfo(user.role).color}-900/30 dark:text-${getRoleInfo(user.role).color}-200`}>
                  {getRoleInfo(user.role).icon} {getRoleInfo(user.role).label}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {getRoleInfo(user.role).description}
              </p>
            </div>
          ) : (
            <p className="text-lg text-muted-foreground">
              Комплексная система управления обслуживанием МКД и паркингов: планирование тарифов на основе ресурсов, учёт выполненных работ с workflow согласования, формирование актов и глубокий анализ себестоимости.
            </p>
          )}
        </div>
        <Link href="/help">
          <Button variant="outline" className="gap-2 h-12">📚 Открыть руководство</Button>
        </Link>
      </div>

      {/* 🆕 ЧТО НОВОГО В СИСТЕМЕ */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🆕</span>
            Что нового в системе
          </CardTitle>
          <CardDescription>
            Недавние обновления и новые возможности
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔔 Система уведомлений</div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Теперь при смене статуса документа (отправка на согласование, утверждение) ответственные лица получают уведомления. Нажмите на колокольчик в шапке, чтобы просмотреть.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30">
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">📊 Обновлённый Дашборд</div>
              <p className="text-sm text-green-800 dark:text-green-200">
                KPI-карточки с трендами, графики план-факт по месяцам, топ-5 отклонений, алерты о критических расхождениях и структура затрат по категориям.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30">
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">💰 Анализ себестоимости</div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Детальная разбивка затрат по ресурсам (материалы, труд, энергия) для каждой услуги. Моделирование влияния изменения цен на итоговый тариф.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🔄 WORKFLOW СОГЛАСОВАНИЯ */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🔄</span>
            Workflow согласования документов
          </CardTitle>
          <CardDescription>
            Как работает процесс согласования планов, фактов и актов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-background">
              <div className="font-semibold mb-3">📋 Этапы согласования:</div>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-300">📝 Черновик</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">⏳ На согласовании</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 border border-green-300">✅ Утверждён</span>
                <span className="text-muted-foreground">→</span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">🖋️ Подписан</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="font-semibold text-sm mb-2">🔒 Блокировка редактирования</div>
                <p className="text-xs text-muted-foreground">
                  Документы в статусах "На согласовании", "Утверждён" и "Подписан" нельзя редактировать или удалять. Это предотвращает несогласованные изменения.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="font-semibold text-sm mb-2">👥 Кто может согласовывать</div>
                <p className="text-xs text-muted-foreground">
                  <strong>Мастер:</strong> может отправлять на согласование<br />
                  <strong>Экономист:</strong> может утверждать и возвращать на доработку<br />
                  <strong>Администратор:</strong> может подписывать и архивировать
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="font-semibold text-sm text-blue-900 mb-1">💡 Совет</div>
              <p className="text-xs text-blue-800">
                При отправке документа на согласование вы можете добавить комментарий. Этот комментарий будет виден в журнале аудита и в уведомлениях.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ⚡ БЫСТРЫЕ ДЕЙСТВИЯ */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">⚡ Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CanAccess roles={['admin', 'economist']}>
            <Link href="/plans">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50 h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">➕</span>
                    <div>
                      <div className="font-semibold">Создать план ФЭО</div>
                      <div className="text-sm text-muted-foreground">Новый план с авторасчётом тарифа</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </CanAccess>
          
          <CanAccess roles={['admin', 'economist', 'master']}>
            <Link href="/facts">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50 h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📝</span>
                    <div>
                      <div className="font-semibold">Ввести факт</div>
                      <div className="text-sm text-muted-foreground">Учёт выполненных работ за месяц</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </CanAccess>

          <Link href="/acts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📄</span>
                  <div>
                    <div className="font-semibold">Сформировать акт</div>
                    <div className="text-sm text-muted-foreground">Акт выполненных работ (PDF)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reports">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📑</span>
                  <div>
                    <div className="font-semibold">Создать отчёт</div>
                    <div className="text-sm text-muted-foreground">Агрегация актов за период</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* 💼 ДОКУМЕНТООБОРОТ И СОГЛАСОВАНИЕ */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">💼 Документооборот и Согласование</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><span className="text-2xl">📊</span> Планирование</CardTitle>
                <CardDescription>Создание планов, помесячные расценки, копирование с индексацией на ИПЦ, импорт из Excel, workflow согласования</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/plans"><Button className="w-full bg-blue-600 hover:bg-blue-700">Перейти к планам</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist', 'master']}>
            <Card className="hover:shadow-md transition-shadow border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><span className="text-2xl">📋</span> Ввод факта</CardTitle>
                <CardDescription>Учёт выполненных работ, план-факт анализ, отправка на согласование и утверждение</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/facts"><Button className="w-full bg-green-600 hover:bg-green-700">Перейти к фактам</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <Card className="hover:shadow-md transition-shadow border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><span className="text-2xl">📄</span> Акты</CardTitle>
              <CardDescription>Формирование актов на основе утверждённых фактов, экспорт в PDF, статусы согласования</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/acts"><Button className="w-full bg-purple-600 hover:bg-purple-700">Перейти к актам</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 🔍 АНАЛИТИКА И ИНСАЙТЫ */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">🔍 Аналитика и Инсайты</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-md transition-shadow border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><span className="text-2xl">📈</span> Дашборд</CardTitle>
              <CardDescription>KPI с трендами, графики план-факт по месяцам, топ отклонений, алерты о критических расхождениях (более 20%), структура затрат</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard"><Button className="w-full bg-amber-600 hover:bg-amber-700">Открыть дашборд</Button></Link>
            </CardContent>
          </Card>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow border-rose-200 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><span className="text-2xl">💰</span> Анализ себестоимости</CardTitle>
                <CardDescription>Детальная разбивка затрат по ресурсам (материалы, труд, энергия) для каждой услуги. Моделирование влияния изменения цен на итоговый тариф.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/cost-analysis"><Button className="w-full bg-rose-600 hover:bg-rose-700">Перейти к анализу</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>
        </div>
      </div>

      {/* 📚 СПРАВОЧНИКИ И НАСТРОЙКИ */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">📚 Справочники и Настройки</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CanAccess roles={['admin', 'economist']}>
            <Link href="/objects">
              <Card className="hover:shadow-md transition-shadow p-4">
                <div className="font-semibold">🏢 Объекты</div>
                <div className="text-xs text-muted-foreground mt-1">МКД и паркинги</div>
              </Card>
            </Link>
          </CanAccess>
          <CanAccess roles={['admin', 'economist']}>
            <Link href="/services">
              <Card className="hover:shadow-md transition-shadow p-4">
                <div className="font-semibold">🔧 Услуги</div>
                <div className="text-xs text-muted-foreground mt-1">Виды работ и категории</div>
              </Card>
            </Link>
          </CanAccess>
          <CanAccess roles={['admin', 'economist']}>
            <Link href="/resources">
              <Card className="hover:shadow-md transition-shadow p-4">
                <div className="font-semibold">📦 Ресурсы</div>
                <div className="text-xs text-muted-foreground mt-1">Материалы, труд, нормативы</div>
              </Card>
            </Link>
          </CanAccess>
          <CanAccess roles={['admin', 'economist']}>
            <Link href="/pricing-settings">
              <Card className="hover:shadow-md transition-shadow p-4">
                <div className="font-semibold">⚙️ Настройки расчёта</div>
                <div className="text-xs text-muted-foreground mt-1">Накладные, прибыль, НДС</div>
              </Card>
            </Link>
          </CanAccess>
        </div>
      </div>

      {/* 👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только для админа) */}
      <CanAccess roles={['admin']}>
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><span className="text-2xl">👥</span> Управление пользователями</CardTitle>
            <CardDescription>Создавайте пользователей, назначайте роли и управляйте доступом к функциям системы</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <div className="font-semibold text-purple-900 dark:text-purple-100">👑 Администратор</div>
                <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">Полный доступ</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <div className="font-semibold text-blue-900 dark:text-blue-100">📊 Экономист</div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">Справочники, планы</div>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <div className="font-semibold text-green-900 dark:text-green-100">🔧 Мастер</div>
                <div className="text-xs text-green-700 dark:text-green-300 mt-1">Ввод факта</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                <div className="font-semibold text-gray-900 dark:text-gray-100">👁️ Наблюдатель</div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Просмотр</div>
              </div>
            </div>
            <Link href="/users">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">Перейти к управлению</Button>
            </Link>
          </CardContent>
        </Card>
      </CanAccess>

      {/* 💡 КАК РАБОТАТЬ С СИСТЕМОЙ */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">💡</span>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Как работать с системой?</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Создайте объекты обслуживания в <Link href="/objects" className="text-primary hover:underline">справочнике объектов</Link></li>
                <li>Настройте виды услуг, категории и единицы измерения в соответствующих <Link href="/services" className="text-primary hover:underline">справочниках</Link></li>
                <li>Добавьте ресурсы, нормативы и расценки на них в разделе <Link href="/resources" className="text-primary hover:underline">Ресурсы</Link></li>
                <li>Настройте накладные расходы, норму прибыли и НДС в разделе <Link href="/pricing-settings" className="text-primary hover:underline">Настройки расчёта</Link></li>
                <li>Составьте план ФЭО на нужный период в разделе <Link href="/plans" className="text-primary hover:underline">Планирование</Link></li>
                <li>Ежемесячно вносите фактические объёмы в разделе <Link href="/facts" className="text-primary hover:underline">Ввод факта</Link></li>
                <li>Отправьте факт на согласование → утвердите → подпишите (workflow)</li>
                <li>Формируйте акты выполненных работ в разделе <Link href="/acts" className="text-primary hover:underline">Акты</Link></li>
                <li>Создавайте сводные отчёты за произвольный период в разделе <Link href="/reports" className="text-primary hover:underline">Отчёты</Link></li>
                <li>Анализируйте структуру себестоимости в разделе <Link href="/cost-analysis" className="text-primary hover:underline">Анализ себестоимости</Link></li>
                <li>Отслеживайте KPI и отклонения на <Link href="/dashboard" className="text-primary hover:underline">Дашборде</Link></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}