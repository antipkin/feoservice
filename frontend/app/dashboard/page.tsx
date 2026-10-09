// frontend/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi, DashboardData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatMoney = (val: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (!isLoading && !user) router.push('/');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user, selectedYear]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const result = await dashboardApi.getStats(parseInt(selectedYear));
      setData(result);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
    setLoading(false);
  };

  if (isLoading || !user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="text-lg text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="text-lg text-muted-foreground">Загрузка данных...</div>
      </div>
    );
  }

  const trendColor = (trend?: number) => {
    if (!trend) return 'text-muted-foreground';
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const trendIcon = (trend?: number) => {
    if (!trend) return '';
    return trend > 0 ? '↑' : '↓';
  };

  const kpiColors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📊 Дашборд</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Аналитика финансово-экономической деятельности
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadDashboard}>🔄 Обновить</Button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.kpi.map((kpi, idx) => (
          <Card key={idx} className="overflow-hidden">
            <div className={`bg-gradient-to-br ${kpiColors[kpi.color] || kpiColors.blue} p-4 text-white`}>
              <div className="text-sm opacity-90">{kpi.title}</div>
              <div className="text-3xl font-bold mt-1">{kpi.value}</div>
              <div className="text-xs opacity-90 mt-1 flex items-center gap-2">
                {kpi.subtitle}
                {kpi.trend !== undefined && (
                  <span className={`font-semibold ${kpi.trend > 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {trendIcon(kpi.trend)} {Math.abs(kpi.trend)}%
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* План-факт по месяцам */}
        <Card>
          <CardHeader>
            <CardTitle>📈 План-факт по месяцам</CardTitle>
            <CardDescription>Сравнение плановых и фактических сумм за {selectedYear} год</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthly_plan_fact}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Legend />
                <Bar dataKey="plan_amount" name="План" fill="#3b82f6" />
                <Bar dataKey="fact_amount" name="Факт" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Распределение по категориям */}
        <Card>
          <CardHeader>
            <CardTitle>🥧 Структура затрат по категориям</CardTitle>
            <CardDescription>Распределение фактических затрат за {selectedYear} год</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.category_distribution}
                  dataKey="total_amount"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.percentage}%`}
                >
                  {data.category_distribution.map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Тренд отклонений */}
        <Card>
          <CardHeader>
            <CardTitle>📉 Отклонения по месяцам</CardTitle>
            <CardDescription>Разница между фактом и планом (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthly_plan_fact}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="deviation_pct"
                  name="Отклонение %"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Статусы документов */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Статусы документов</CardTitle>
            <CardDescription>Текущее состояние workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-gray-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.plans_draft}</div>
                  <div className="text-xs text-muted-foreground">Планов (черновики)</div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.plans_approved}</div>
                  <div className="text-xs text-muted-foreground">Планов (утв.)</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.plans_draft + data.status_counts.plans_approved}</div>
                  <div className="text-xs text-muted-foreground">Всего планов</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-gray-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.facts_draft}</div>
                  <div className="text-xs text-muted-foreground">Фактов (черн.)</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.facts_signed}</div>
                  <div className="text-xs text-muted-foreground">Фактов (подп.)</div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.facts_draft + data.status_counts.facts_signed}</div>
                  <div className="text-xs text-muted-foreground">Всего фактов</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-gray-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.acts_draft}</div>
                  <div className="text-xs text-muted-foreground">Актов (черн.)</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.acts_signed}</div>
                  <div className="text-xs text-muted-foreground">Актов (подп.)</div>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg text-center">
                  <div className="text-2xl font-bold">{data.status_counts.acts_draft + data.status_counts.acts_signed}</div>
                  <div className="text-xs text-muted-foreground">Всего актов</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Топ отклонений */}
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Топ-5 отклонений план-факт</CardTitle>
          <CardDescription>Услуги с наибольшим отклонением факта от плана</CardDescription>
        </CardHeader>
        <CardContent>
          {data.top_deviations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>
          ) : (
            <div className="space-y-2">
              {data.top_deviations.map((dev, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">{dev.service_name}</div>
                    <div className="text-xs text-muted-foreground">{dev.category_name}</div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">План</div>
                      <div className="font-semibold">{formatMoney(dev.plan_amount)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Факт</div>
                      <div className="font-semibold">{formatMoney(dev.fact_amount)}</div>
                    </div>
                    <div className={`text-right px-3 py-1 rounded-lg font-bold ${
                      dev.deviation_pct > 0 ? 'bg-green-100 text-green-800' :
                      dev.deviation_pct < 0 ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {dev.deviation_pct > 0 ? '+' : ''}{dev.deviation_pct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Алерты */}
      {data.alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">🚨 Критические алерты</CardTitle>
            <CardDescription className="text-red-700">
              Обнаружены существенные отклонения, требующие внимания
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.alerts.map((alert, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  alert.severity === 'critical' ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{alert.service_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {alert.object_name} • {alert.period}
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      alert.severity === 'critical' ? 'text-red-700' : 'text-yellow-700'
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

      {/* Быстрые действия */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={() => router.push('/plans')} variant="outline">📋 Планы</Button>
            <Button onClick={() => router.push('/facts')} variant="outline">📝 Факты</Button>
            <Button onClick={() => router.push('/acts')} variant="outline">📄 Акты</Button>
            <Button onClick={() => router.push('/reports')} variant="outline">📑 Отчёты</Button>
            <Button onClick={() => router.push('/notifications')} variant="outline">
              🔔 Уведомления
            </Button>
            <Button onClick={() => router.push('/services')} variant="outline">🛠️ Услуги</Button>
            <Button onClick={() => router.push('/objects')} variant="outline">🏢 Объекты</Button>
            <Button onClick={() => router.push('/audit')} variant="outline">📜 Журнал</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}