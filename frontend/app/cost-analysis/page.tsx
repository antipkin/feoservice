// frontend/app/cost-analysis/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { reportsApi, costAnalysisApi, ReportListItemData, ReportCostAnalysis } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatMoney = (val: string | number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(Number(val));

export default function CostAnalysisPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportListItemData[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [analysis, setAnalysis] = useState<ReportCostAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) loadReports();
  }, [user]);

  const loadReports = async () => {
    try {
      const data = await reportsApi.getAll();
      setReports(data);
    } catch (e) {
      console.error('Ошибка:', e);
    }
  };

  const loadAnalysis = async () => {
    if (!selectedReportId) return;
    setLoading(true);
    try {
      const data = await costAnalysisApi.analyzeReport(parseInt(selectedReportId));
      setAnalysis(data);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedReportId) loadAnalysis();
  }, [selectedReportId]);

  if (isLoading || !user) {
    return <div className="container mx-auto py-12 text-center">Загрузка...</div>;
  }

  // Данные для круговой диаграммы структуры затрат
  const costStructureData = analysis ? [
    { name: 'Материалы', value: Number(analysis.materials_total) },
    { name: 'Труд', value: Number(analysis.labor_total) },
    { name: 'Транспорт', value: Number(analysis.transport_total) },
    { name: 'Энергия', value: Number(analysis.energy_total) },
    { name: 'Прочее', value: Number(analysis.other_total) },
  ].filter(d => d.value > 0) : [];

  // Данные для графика по услугам
  const servicesChartData = analysis ? analysis.services.map(s => ({
    name: s.service_name.length > 25 ? s.service_name.substring(0, 25) + '...' : s.service_name,
    amount: Number(s.total_amount),
    materials: Number(s.materials_cost),
    labor: Number(s.labor_cost),
  })) : [];

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">💰 Анализ себестоимости</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Детальная разбивка затрат по ресурсам и услугам
        </p>
      </div>

      {/* Выбор отчёта */}
      <Card>
        <CardHeader>
          <CardTitle>Выберите отчёт для анализа</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Отчёт</Label>
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger><SelectValue placeholder="Выберите отчёт" /></SelectTrigger>
                <SelectContent>
                  {reports.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name || 'Без названия'} — {r.object_name} ({formatMoney(r.total_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadAnalysis} disabled={!selectedReportId || loading}>
              {loading ? 'Анализ...' : '🔍 Анализировать'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          {/* Общая информация */}
          <Card>
            <CardHeader>
              <CardTitle>{analysis.report_name}</CardTitle>
              <CardDescription>
                {analysis.object_name} • {analysis.period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Всего</div>
                  <div className="font-bold text-lg">{formatMoney(analysis.total_amount)}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Материалы</div>
                  <div className="font-bold text-lg">{formatMoney(analysis.materials_total)}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Труд</div>
                  <div className="font-bold text-lg">{formatMoney(analysis.labor_total)}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Транспорт</div>
                  <div className="font-bold text-lg">{formatMoney(analysis.transport_total)}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Энергия</div>
                  <div className="font-bold text-lg">{formatMoney(analysis.energy_total)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">Прочее</div>
                  <div className="font-bold text-lg">{formatMoney(analysis.other_total)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Графики */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Структура затрат */}
            <Card>
              <CardHeader>
                <CardTitle>🥧 Структура затрат</CardTitle>
                <CardDescription>Распределение по типам ресурсов</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costStructureData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${((entry.value / Number(analysis.total_amount)) * 100).toFixed(1)}%`}
                    >
                      {costStructureData.map((entry, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Затраты по услугам */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Затраты по услугам</CardTitle>
                <CardDescription>Топ-10 услуг по сумме затрат</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={servicesChartData.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Legend />
                    <Bar dataKey="materials" name="Материалы" stackId="a" fill="#10b981" />
                    <Bar dataKey="labor" name="Труд" stackId="a" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Детализация по услугам */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Детализация по услугам</CardTitle>
              <CardDescription>Разбивка затрат по каждой услуге</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.services.map((service, idx) => (
                  <details key={idx} className="border rounded-lg">
                    <summary className="p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{service.service_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {service.category_name} • {service.total_quantity} {service.unit_symbol}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatMoney(service.total_amount)}</div>
                      </div>
                    </summary>
                    <div className="p-3 bg-muted/30 border-t">
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="text-xs">Материалы</div>
                          <div className="font-semibold text-sm">{formatMoney(service.materials_cost)}</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-xs">Труд</div>
                          <div className="font-semibold text-sm">{formatMoney(service.labor_cost)}</div>
                        </div>
                        <div className="text-center p-2 bg-amber-50 rounded">
                          <div className="text-xs">Транспорт</div>
                          <div className="font-semibold text-sm">{formatMoney(service.transport_cost)}</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="text-xs">Энергия</div>
                          <div className="font-semibold text-sm">{formatMoney(service.energy_cost)}</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-xs">Прочее</div>
                          <div className="font-semibold text-sm">{formatMoney(service.other_cost)}</div>
                        </div>
                      </div>
                      {service.resources.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-semibold mb-2">Использованные ресурсы:</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Ресурс</th>
                                  <th className="text-left p-2">Тип</th>
                                  <th className="text-right p-2">Кол-во</th>
                                  <th className="text-right p-2">Цена</th>
                                  <th className="text-right p-2">Сумма</th>
                                </tr>
                              </thead>
                              <tbody>
                                {service.resources.map((res, ridx) => (
                                  <tr key={ridx} className="border-b hover:bg-muted/30">
                                    <td className="p-2">{res.resource_name}</td>
                                    <td className="p-2 text-muted-foreground">{res.resource_type}</td>
                                    <td className="p-2 text-right">{Number(res.quantity).toFixed(2)} {res.unit}</td>
                                    <td className="p-2 text-right">{formatMoney(res.price_per_unit)}</td>
                                    <td className="p-2 text-right font-semibold">{formatMoney(res.total_amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}