// frontend/app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="container mx-auto py-10 px-4">
      {/* Приветствие */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Добро пожаловать в <span className="text-primary">ДомСервис</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Комплексная система управления обслуживанием МКД и паркингов:
          планирование тарифов, учёт выполненных работ, формирование актов и отчётов
        </p>
        <div className="mt-4">
          <Link href="/help">
            <Button variant="outline" className="gap-2">
              📚 Открыть руководство
            </Button>
          </Link>
        </div>
      </div>

      {/* 📚 СПРАВОЧНИКИ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">📚 Справочники</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>🏢 Объекты</CardTitle>
              <CardDescription>Управление МКД и паркингами, настройка базы расчёта тарифа</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/objects"><Button className="w-full">Перейти</Button></Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>🔧 Услуги</CardTitle>
              <CardDescription>Виды услуг, категории, периодичность выполнения</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/services"><Button className="w-full">Перейти</Button></Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>💰 Расценки</CardTitle>
              <CardDescription>Цены на услуги с привязкой к объекту и периодом действия</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/rates"><Button className="w-full">Перейти</Button></Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>📊 Дашборд</CardTitle>
              <CardDescription>KPI, графики план-факт, топ отклонений, аналитика</CardDescription>
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
          <Card className="hover:shadow-md transition-shadow border-primary/50">
            <CardHeader>
              <CardTitle>📊 Планирование (ФЭО)</CardTitle>
              <CardDescription>
                Создание планов с помесячными расценками, расчёт тарифа, индексация на ИПЦ, импорт из Excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/plans"><Button className="w-full">Перейти</Button></Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-primary/50">
            <CardHeader>
              <CardTitle>📋 Ввод факта</CardTitle>
              <CardDescription>Учёт выполненных работ, план-факт анализ, отклонения</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/facts"><Button className="w-full">Перейти</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 📄 ДОКУМЕНТООБОРОТ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">📄 Документооборот</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow border-green-500/50 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📄</span>
                Акты
              </CardTitle>
              <CardDescription>
                Формирование актов на основе факта, экспорт в PDF, учёт периодичности услуг
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

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📥</span>
                Импорт и экспорт
              </CardTitle>
              <CardDescription>
                Загрузка планов из Excel, выгрузка в Excel и PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• <Link href="/plans/import" className="text-primary hover:underline">Импорт плана из Excel</Link></p>
                <p>• <Link href="/plans" className="text-primary hover:underline">Экспорт планов</Link></p>
                <p>• <Link href="/facts" className="text-primary hover:underline">Экспорт фактов</Link></p>
                <p>• <Link href="/acts" className="text-primary hover:underline">Экспорт актов</Link></p>
                <p>• <Link href="/reports" className="text-primary hover:underline">Экспорт отчётов</Link></p>
                <p>• <Link href="/rates" className="text-primary hover:underline">Экспорт расценок</Link></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ⚡ БЫСТРЫЕ ДЕЙСТВИЯ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">⚡ Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <li>Создайте объекты обслуживания (МКД, паркинги) в <Link href="/objects" className="text-primary hover:underline">справочнике объектов</Link></li>
                <li>Настройте виды услуг и их периодичность в <Link href="/services" className="text-primary hover:underline">справочнике услуг</Link></li>
                <li>Установите расценки для каждого объекта в разделе <Link href="/rates" className="text-primary hover:underline">Расценки</Link></li>
                <li>Составьте план ФЭО на нужный период в разделе <Link href="/plans" className="text-primary hover:underline">Планирование</Link></li>
                <li>Ежемесячно вносите фактические объёмы в разделе <Link href="/facts" className="text-primary hover:underline">Ввод факта</Link></li>
                <li>Формируйте акты выполненных работ в разделе <Link href="/acts" className="text-primary hover:underline">Акты</Link></li>
                <li>Создавайте отчёты за произвольный период в разделе <Link href="/reports" className="text-primary hover:underline">Отчёты</Link></li>
                <li>Анализируйте показатели на <Link href="/dashboard" className="text-primary hover:underline">Дашборде</Link></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}