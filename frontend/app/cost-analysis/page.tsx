// frontend/app/cost-analysis/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { costAnalysisApi, reportsApi, resourcesApi, ReportCostAnalysis, ImpactAnalysis, ReportData, ResourceData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CostAnalysisPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [analysis, setAnalysis] = useState<ReportCostAnalysis | null>(null);
  const [impact, setImpact] = useState<ImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [priceChanges, setPriceChanges] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rpts, res] = await Promise.all([reportsApi.getAll(), resourcesApi.getAll()]);
        setReports(rpts);
        setResources(res);
      } catch (e) { console.error('Ошибка загрузки:', e); }
    };
    loadData();
  }, []);

  const handleAnalyze = async () => {
    if (!selectedReportId) return;
    setLoading(true);
    try {
      const result = await costAnalysisApi.analyzeReport(parseInt(selectedReportId));
      setAnalysis(result);
      setImpact(null);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
    setLoading(false);
  };

  const handleImpactAnalysis = async () => {
    if (!selectedReportId || Object.keys(priceChanges).length === 0) {
      alert('Выберите отчёт и измените хотя бы одну цену на ресурс');
      return;
    }
    setLoading(true);
    try {
      const changes = Object.entries(priceChanges)
        .filter(([_, price]) => price !== '')
        .map(([resourceId, price]) => ({
          resource_id: parseInt(resourceId),
          new_price: parseFloat(price)
        }));
      
      const result = await costAnalysisApi.analyzeImpact({
        report_id: parseInt(selectedReportId),
        price_changes: changes
      });
      setImpact(result);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
    setLoading(false);
  };

  const formatMoney = (val: string) => new Number(val).toLocaleString('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2
  });

  const formatPercent = (val: string) => `${new Number(val).toFixed(1)}%`;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">📊 Анализ себестоимости</h1>
        <p className="text-muted-foreground mt-1">
          Детальная разбивка стоимости услуг по типам ресурсов и моделирование изменений
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
              <Select value={selectedReportId} onValueChange={(v) => { setSelectedReportId(v); setAnalysis(null); setImpact(null); }}>
                <SelectTrigger><SelectValue placeholder="Выберите отчёт" /></SelectTrigger>
                <SelectContent>
                  {reports.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name || 'Без названия'} — {r.object_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAnalyze} disabled={loading || !selectedReportId}>
              {loading ? 'Анализ...' : '🔍 Анализировать'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          {/* Итоги */}
          <Card>
            <CardHeader>
              <CardTitle>📈 Итоги по отчёту</CardTitle>
              <CardDescription>
                {analysis.report_name} • {analysis.object_name} • {analysis.period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-sm text-muted-foreground">Общая стоимость</div>
                  <div className="text-2xl font-bold">{formatMoney(analysis.total_amount)}</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-sm text-muted-foreground">📦 Материалы</div>
                  <div className="text-xl font-bold">{formatMoney(analysis.materials_total)}</div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-sm text-muted-foreground">👷 Труд</div>
                  <div className="text-xl font-bold">{formatMoney(analysis.labor_total)}</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="text-sm text-muted-foreground">🚗 Транспорт</div>
                  <div className="text-xl font-bold">{formatMoney(analysis.transport_total)}</div>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-sm text-muted-foreground">⚡ Энергия</div>
                  <div className="text-xl font-bold">{formatMoney(analysis.energy_total)}</div>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-sm text-muted-foreground">📋 Прочее</div>
                  <div className="text-xl font-bold">{formatMoney(analysis.other_total)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Вкладки */}
          <Tabs defaultValue="services" className="space-y-4">
            <TabsList>
              <TabsTrigger value="services">По услугам</TabsTrigger>
              <TabsTrigger value="impact">Моделирование изменений</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Детализация по услугам</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Услуга</TableHead>
                          <TableHead>Категория</TableHead>
                          <TableHead className="text-right">Объём</TableHead>
                          <TableHead className="text-right">Сумма</TableHead>
                          <TableHead className="text-right">Материалы</TableHead>
                          <TableHead className="text-right">Труд</TableHead>
                          <TableHead className="text-right">Транспорт</TableHead>
                          <TableHead className="text-right">Энергия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.services.map(svc => (
                          <TableRow key={svc.service_type_id}>
                            <TableCell className="font-medium">{svc.service_name}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                {svc.category_name || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{new Number(svc.total_quantity).toLocaleString('ru-RU')} {svc.unit_symbol}</TableCell>
                            <TableCell className="text-right font-semibold">{formatMoney(svc.total_amount)}</TableCell>
                            <TableCell className="text-right text-blue-600">{formatMoney(svc.materials_cost)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatMoney(svc.labor_cost)}</TableCell>
                            <TableCell className="text-right text-purple-600">{formatMoney(svc.transport_cost)}</TableCell>
                            <TableCell className="text-right text-amber-600">{formatMoney(svc.energy_cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="impact">
              <Card>
                <CardHeader>
                  <CardTitle>🔧 Моделирование изменений цен на ресурсы</CardTitle>
                  <CardDescription>
                    Измените цены на ресурсы и посмотрите, как это повлияет на итоговую стоимость
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resources.map(res => (
                      <div key={res.id} className="space-y-2">
                        <Label>{res.name} ({res.unit})</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Новая цена"
                          value={priceChanges[res.id] || ''}
                          onChange={(e) => setPriceChanges({...priceChanges, [res.id]: e.target.value})}
                        />
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleImpactAnalysis} disabled={loading || Object.keys(priceChanges).length === 0}>
                    {loading ? 'Расчёт...' : '🧮 Рассчитать влияние'}
                  </Button>

                  {impact && (
                    <div className="mt-6 space-y-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm text-muted-foreground">Старая стоимость:</div>
                            <div className="text-xl font-bold">{formatMoney(impact.total_old)}</div>
                          </div>
                          <div className="text-3xl">→</div>
                          <div>
                            <div className="text-sm text-muted-foreground">Новая стоимость:</div>
                            <div className="text-xl font-bold">{formatMoney(impact.total_new)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Изменение:</div>
                            <div className={`text-xl font-bold ${new Number(impact.total_change) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatMoney(impact.total_change)} ({formatPercent(impact.total_change_percent)})
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Услуга</TableHead>
                              <TableHead className="text-right">Старая цена/ед.</TableHead>
                              <TableHead className="text-right">Новая цена/ед.</TableHead>
                              <TableHead className="text-right">Изменение</TableHead>
                              <TableHead className="text-right">Старая сумма</TableHead>
                              <TableHead className="text-right">Новая сумма</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {impact.services_impact.map(svc => (
                              <TableRow key={svc.service_type_id}>
                                <TableCell className="font-medium">{svc.service_name}</TableCell>
                                <TableCell className="text-right">{formatMoney(svc.old_price)}</TableCell>
                                <TableCell className="text-right">{formatMoney(svc.new_price)}</TableCell>
                                <TableCell className={`text-right font-semibold ${new Number(svc.price_change) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatMoney(svc.price_change)} ({formatPercent(svc.price_change_percent)})
                                </TableCell>
                                <TableCell className="text-right">{formatMoney(svc.total_amount_old)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatMoney(svc.total_amount_new)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}