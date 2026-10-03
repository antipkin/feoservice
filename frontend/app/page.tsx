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
        return { icon: '👑', label: 'Администратор', color: 'purple', description: 'Полный доступ ко всем функциям системы' };
      case 'economist':
        return { icon: '📊', label: 'Экономист', color: 'blue', description: 'Управление справочниками, планирование и расчёты' };
      case 'master':
        return { icon: '🔧', label: 'Мастер участка', color: 'green', description: 'Ввод факта, формирование актов' };
      case 'viewer':
        return { icon: '👁️', label: 'Наблюдатель', color: 'gray', description: 'Просмотр отчётов и аналитики' };
      default:
        return { icon: '❓', label: 'Неизвестная роль', color: 'gray', description: '' };
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      {/* Приветствие */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Добро пожаловать в <span className="text-primary">ДомСервис</span>
        </h1>
        {user ? (
          <p className="text-lg text-muted-foreground">
            Здравствуйте, <strong>{user.full_name}</strong>! 
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
              {getRoleInfo(user.role).icon} {getRoleInfo(user.role).label}
            </span>
          </p>
        ) : (
          <p className="text-lg text-muted-foreground">
            Комплексная система управления обслуживанием МКД и паркингов:
            планирование тарифов на основе ресурсов, учёт выполненных работ, формирование актов и глубокий анализ себестоимости.
          </p>
        )}
        <div className="mt-4">
          <Link href="/help">
            <Button variant="outline" className="gap-2">
              📚 Открыть руководство
            </Button>
          </Link>
        </div>
      </div>

      {/* 👥 ИНФОРМАЦИЯ О РОЛЯХ (для админа) */}
      <CanAccess roles={['admin']}>
        <Card className="mb-8 border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              Управление пользователями
            </CardTitle>
            <CardDescription>
              Создавайте пользователей, назначайте роли и управляйте доступом к функциям системы
            </CardDescription>
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
              <Button className="w-full">Перейти к управлению пользователями</Button>
            </Link>
          </CardContent>
        </Card>
      </CanAccess>

      {/* 📚 СПРАВОЧНИКИ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">📚 Справочники</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>🏢 Объекты</CardTitle>
                <CardDescription>Управление МКД и паркингами, база расчёта</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/objects"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>🔧 Услуги</CardTitle>
                <CardDescription>Виды услуг, категории, периодичность</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/services"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>📂 Категории</CardTitle>
                <CardDescription>Группировка услуг для отчётов и аналитики</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/service-categories"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>📏 Ед. изм.</CardTitle>
                <CardDescription>Справочник единиц измерения</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/units"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>📦 Ресурсы</CardTitle>
                <CardDescription>Материалы, труд, нормативы и расценки</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/resources"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>💰 Расценки</CardTitle>
                <CardDescription>Цены на услуги с привязкой к объекту</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/rates"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>⚙️ Настройки расчёта</CardTitle>
                <CardDescription>Накладные, прибыль, НДС с наследованием</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/pricing-settings"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>📊 Дашборд</CardTitle>
              <CardDescription>KPI, графики план-факт, топ отклонений</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard"><Button className="w-full">Перейти</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 💼 РАБОЧИЕ ПРОЦЕССЫ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">💼 Рабочие процессы</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow border-primary/50">
              <CardHeader>
                <CardTitle>📊 Планирование (ФЭО)</CardTitle>
                <CardDescription>
                  Создание планов с помесячными расценками, авторасчёт тарифа, индексация на ИПЦ, импорт из Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/plans"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>

          <CanAccess roles={['admin', 'economist', 'master']}>
            <Card className="hover:shadow-md transition-shadow border-primary/50">
              <CardHeader>
                <CardTitle>📋 Ввод факта</CardTitle>
                <CardDescription>Учёт выполненных работ, план-факт анализ, отклонения</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/facts"><Button className="w-full">Перейти</Button></Link>
              </CardContent>
            </Card>
          </CanAccess>
        </div>
      </div>

      {/* 📄 ДОКУМЕНТООБОРОТ И АНАЛИТИКА */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">📄 Документооборот и Аналитика</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow border-green-500/50 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📄</span>
                Акты
              </CardTitle>
              <CardDescription>
                Формирование актов на основе факта, экспорт в PDF, учёт периодичности
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/acts">
                <Button className="w-full bg-green-600 hover:bg-green-700">Перейти к актам</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-purple-500/50 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📑</span>
                Отчёты
              </CardTitle>
              <CardDescription>
                Агрегация актов за произвольный период, экспорт в Excel/PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">Перейти к отчётам</Button>
              </Link>
            </CardContent>
          </Card>

          <CanAccess roles={['admin', 'economist']}>
            <Card className="hover:shadow-md transition-shadow border-amber-500/50 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Анализ себестоимости
                </CardTitle>
                <CardDescription>
                  Детальная разбивка по ресурсам и моделирование изменений цен
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/cost-analysis">
                  <Button className="w-full bg-amber-600 hover:bg-amber-700">Перейти к анализу</Button>
                </Link>
              </CardContent>
            </Card>
          </CanAccess>
        </div>
      </div>

      {/* ⚡ БЫСТРЫЕ ДЕЙСТВИЯ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">⚡ Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CanAccess roles={['admin', 'economist']}>
            <Link href="/plans">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">➕</span>
                    <div>
                      <div className="font-semibold">Создать план</div>
                      <div className="text-sm text-muted-foreground">Новый ФЭО для объекта</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </CanAccess>

          <CanAccess roles={['admin', 'economist', 'master']}>
            <Link href="/facts">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📝</span>
                    <div>
                      <div className="font-semibold">Ввести факт</div>
                      <div className="text-sm text-muted-foreground">Учёт выполненных работ</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </CanAccess>

          <Link href="/acts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📄</span>
                  <div>
                    <div className="font-semibold">Сформировать акт</div>
                    <div className="text-sm text-muted-foreground">Акт выполненных работ</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reports">
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
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

      {/* 💡 ИНСТРУКЦИЯ */}
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
                <li>Составьте план ФЭО на нужный период в разделе <Link href="/plans" className="text-primary hover:underline">Планирование</Link> (система автоматически рассчитает расценки)</li>
                <li>Ежемесячно вносите фактические объёмы в разделе <Link href="/facts" className="text-primary hover:underline">Ввод факта</Link></li>
                <li>Формируйте акты выполненных работ в разделе <Link href="/acts" className="text-primary hover:underline">Акты</Link></li>
                <li>Создавайте сводные отчёты за произвольный период в разделе <Link href="/reports" className="text-primary hover:underline">Отчёты</Link></li>
                <li>Анализируйте структуру себестоимости и моделируйте изменения цен в разделе <Link href="/cost-analysis" className="text-primary hover:underline">Анализ себестоимости</Link></li>
                <li>Отслеживайте KPI и отклонения на <Link href="/dashboard" className="text-primary hover:underline">Дашборде</Link></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}