// frontend/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi, DashboardData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { CanAccess } from '@/lib/rbac'; // 🎯 ИМПОРТ RBAC

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  // 🎯 ШАГ 1: ВСЕ ХУКИ В САМОМ НАЧАЛЕ
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // 🎯 ШАГ 2: USE EFFECT ДЛЯ ПРОВЕРКИ АВТОРИЗАЦИИ
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // 🎯 ШАГ 3: USE EFFECT ДЛЯ ЗАГРУЗКИ ДАННЫХ
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true);
        try {
          const stats = await dashboardApi.getStats(year);
          setData(stats);
        } catch (e) {
          console.error('Ошибка загрузки дашборда:', e);
        }
        setLoading(false);
      };
      loadData();
    }
  }, [year, user]);

  // 🎯 ШАГ 4: ФУНКЦИИ
  const formatMoney = (val: number) =>
    val.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

  const getKpiColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
    };
    return colors[color] || colors.blue;
  };

  // 🎯 ШАГ 5: УСЛОВНЫЕ ВОЗВРАТЫ ТОЛЬКО ПОСЛЕ ВСЕХ ХУКОВ
  if (isLoading || !user) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="text-lg text-muted-foreground">Проверка авторизации...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12">Загрузка данных...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center py-12 text-muted-foreground">
          Не удалось загрузить данные дашборда
        </div>
      </div>
    );
  }

  // 🎯 ШАГ 6: ОСНОВНОЙ РЕНДЕР
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Заголовок с выбором года */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">📊 Дашборд</h1>
        <div className="flex items-center gap-4">
          {/* 🎯 Кнопка "Анализ себестоимости" — только для admin и economist */}
          <CanAccess roles={['admin', 'economist']}>
            <Link href="/cost-analysis">
              <Button variant="outline">🔍 Анализ себестоимости</Button>
            </Link>
          </CanAccess>
          <div className="flex items-center gap-2">
            <Label>Год:</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-24 h-10"
            />
          </div>
        </div>
      </div>

      {/* KPI-карточки */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {data.kpi.map((kpi, idx) => (
          <Card key={idx} className={`border-2 ${getKpiColor(kpi.color)}`}>
            <CardContent className="pt-4">
              <div className="text-sm font-medium opacity-80">{kpi.title}</div>
              <div className="text-2xl font-bold mt-1">{kpi.value}</div>
              {kpi.subtitle && (
                <div className="text-xs opacity-70 mt-1">{kpi.subtitle}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* График план-факт по месяцам */}
      <Card>
        <CardHeader>
          <CardTitle>План-факт по месяцам</CardTitle>
          <CardDescription>Сравнение плановых и фактических сумм за {year} год</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.monthly_plan_fact}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month_label" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
              <Tooltip
                formatter={(value: number) => formatMoney(value)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="plan_amount" name="План" fill="#3b82f6" />
              <Bar dataKey="fact_amount" name="Факт" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Топ-5 услуг по отклонениям */}
        <Card>
          <CardHeader>
            <CardTitle>Топ-5 услуг по отклонениям</CardTitle>
            <CardDescription>Услуги с наибольшим расхождением план/факт</CardDescription>
          </CardHeader>
          <CardContent>
            {data.top_deviations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет данных для анализа
              </p>
            ) : (
              <div className="space-y-3">
                {data.top_deviations.map((item, idx) => {
                  const isPositive = item.deviation_pct > 0;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.service_name}</div>
                        <div className="text-xs text-muted-foreground">{item.category_name}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{item.deviation_pct}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatMoney(item.fact_amount)} / {formatMoney(item.plan_amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Распределение по категориям */}
        <Card>
          <CardHeader>
            <CardTitle>Распределение по категориям</CardTitle>
            <CardDescription>Доля каждой категории в общем плане</CardDescription>
          </CardHeader>
          <CardContent>
            {data.category_distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет данных
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.category_distribution}
                      dataKey="total_amount"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.percentage}%`}
                    >
                      {data.category_distribution.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.category_distribution.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <div className="flex-1 text-sm">{cat.category_name}</div>
                      <div className="text-sm font-semibold">{cat.percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Алерты */}
      {data.alerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Алерты: значительные отклонения
            </CardTitle>
            <CardDescription>Факт отличается от плана более чем на 20%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'danger'
                      ? 'bg-red-50 border-red-500'
                      : 'bg-amber-50 border-amber-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {alert.object_name} • {alert.period}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {alert.service_name}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      alert.severity === 'danger' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {alert.deviation_pct > 0 ? '+' : ''}{alert.deviation_pct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}