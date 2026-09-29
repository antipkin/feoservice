// frontend/app/plans/page.tsx
'use client';

import { useState, useEffect, useMemo, Fragment } from 'react'; // 🎯 Добавлен Fragment
import Link from 'next/link';
import { 
  objectsApi, servicesApi, plansApi, serviceCategoriesApi,
  ServiceData, ObjectData, PlanData, PlanItemData, TariffData, ServiceCategoryData
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlanMonthlyInput } from '@/components/plan-monthly-input';

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_NAMES_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const formatObjectType = (type: string) => type === 'MKD' ? 'МКД' : type === 'PARKING' ? 'Паркинг' : type;
const getPeriodString = (startMonth: number, startYear: number, periodMonths: number) => {
  let m = startMonth + periodMonths - 1, y = startYear;
  while (m > 12) { m -= 12; y += 1; }
  return `${MONTH_NAMES[startMonth - 1]} ${startYear} – ${MONTH_NAMES[m - 1]} ${y}`;
};

const generatePeriodMonths = (startMonth: number, startYear: number, periodMonthsCount: number) => {
  const months = [];
  for (let i = 0; i < periodMonthsCount; i++) {
    let m = startMonth + i, y = startYear;
    while (m > 12) { m -= 12; y += 1; }
    months.push({ month: m, year: y, label: `${MONTH_NAMES_SHORT[m - 1]} ${y}` });
  }
  return months;
};

interface GroupedRow {
  type: 'category' | 'item';
  category?: ServiceCategoryData;
  categoryTotal?: number;
  item?: PlanItemData;
}

const COL_SERVICE_W = 200;
const COL_FREQUENCY_W = 120;
const COL_ACTION_W = 90;
const COL_TOTAL_SUM_W = 140;

export default function PlansPage() {
  const handleRecalculateRates = async () => {
    if (!selectedPlan) return;
    if (!window.confirm('Пересчитать все расценки в плане на основе актуальных тарифов из справочника?\n\nЭто обновит цены во всех месяцах для всех услуг.')) return;
    
    setLoading(true);
    try {
      await plansApi.recalculateRates(selectedPlan.id);
      await loadPlanDetails(selectedPlan.id);
      alert('✅ Расценки в плане успешно обновлены на основе актуальных тарифов!');
    } catch (e: any) {
      alert(`Ошибка пересчёта: ${e.message}`);
    }
    setLoading(false);
  };
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryData[]>([]);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [planItems, setPlanItems] = useState<PlanItemData[]>([]);
  const [tariff, setTariff] = useState<TariffData | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItemData | null>(null);
  const [filterObjectId, setFilterObjectId] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const [newPlan, setNewPlan] = useState({ object_id: '', start_year: currentYear.toString(), start_month: '', period_months: '12', name: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [objs, svcs, cats] = await Promise.all([objectsApi.getAll(), servicesApi.getAll(), serviceCategoriesApi.getAll()]);
        setObjects(objs); setServices(svcs); setCategories(cats);
      } catch (e) { console.error('Ошибка загрузки справочников:', e); }
    };
    loadData();
    const loadPlans = async () => { try { setPlans(await plansApi.getAll()); } catch (e) { console.error(e); } };
    loadPlans();
  }, []);

  useEffect(() => { if (selectedPlan) loadPlanDetails(selectedPlan.id); }, [selectedPlan]);

  const loadPlanDetails = async (planId: number) => {
    setLoading(true);
    try {
      const [items, tar] = await Promise.all([plansApi.getItems(planId), plansApi.getTariff(planId)]);
      setPlanItems(items); setTariff(tar);
    } catch (e) { console.error('Ошибка загрузки деталей плана:', e); }
    setLoading(false);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await plansApi.create({ ...newPlan, object_id: parseInt(newPlan.object_id), start_year: parseInt(newPlan.start_year), start_month: parseInt(newPlan.start_month), period_months: parseInt(newPlan.period_months) });
      setPlans([...plans, created]);
      setNewPlan({ object_id: '', start_year: currentYear.toString(), start_month: '', period_months: '12', name: '' });
      setSelectedPlan(created);
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan || !window.confirm(`Удалить план "${selectedPlan.name}"?`)) return;
    try {
      await plansApi.delete(selectedPlan.id);
      setPlans(plans.filter(p => p.id !== selectedPlan.id));
      setSelectedPlan(null); setPlanItems([]); setTariff(null);
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  const handleItemSubmit = async (data: any) => {
    if (!selectedPlan) return;
    try {
      if (editingItem) await plansApi.updateItem(selectedPlan.id, editingItem.id, data);
      else await plansApi.addItem(selectedPlan.id, data);
      setDialogOpen(false); setEditingItem(null);
      await loadPlanDetails(selectedPlan.id);
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  const formatMoney = (val: string | number) => new Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
  const formatNumber = (val: string | number) => new Number(val).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  const periodMonths = selectedPlan ? generatePeriodMonths(selectedPlan.start_month, selectedPlan.start_year, selectedPlan.period_months) : [];
  const currentObject = useMemo(() => selectedPlan ? objects.find(o => Number(o.id) === Number(selectedPlan.object_id)) || null : null, [selectedPlan, objects]);
  
  const groupedRows = useMemo((): GroupedRow[] => {
    if (!selectedPlan) return [];
    const rows: GroupedRow[] = [];
    const activeCategories = categories.filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order);
    
    for (const cat of activeCategories) {
      const itemsInCategory = planItems.filter(item => {
        const svc = services.find(s => Number(s.id) === Number(item.service_type_id));
        return svc && svc.category_id === cat.id;
      });
      if (itemsInCategory.length === 0) continue;
      const categoryTotal = itemsInCategory.reduce((sum, item) => sum + Number(item.total_amount), 0);
      rows.push({ type: 'category', category: cat, categoryTotal });
      for (const item of itemsInCategory) rows.push({ type: 'item', item });
    }
    return rows;
  }, [planItems, services, categories, selectedPlan]);

  const filteredPlans = filterObjectId && filterObjectId !== 'all' ? plans.filter(p => p.object_id.toString() === filterObjectId) : plans;
  const TOTAL_COLS = 2 + periodMonths.length + 2;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Планирование ФЭО</h1>
        <div className="flex gap-2">
          <Link href="/plans/import"><Button variant="outline" className="h-10">📥 Импорт из Excel</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Создать новый план</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePlan} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[350px] space-y-2">
              <Label>Объект</Label>
              <Select value={newPlan.object_id} onValueChange={(v) => setNewPlan({...newPlan, object_id: v})} required>
                <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                <SelectContent>{objects.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name} ({formatObjectType(o.type)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-48 space-y-2">
              <Label>Месяц начала</Label>
              <Select value={newPlan.start_month} onValueChange={(v) => setNewPlan({...newPlan, start_month: v})} required>
                <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Выберите месяц" /></SelectTrigger>
                <SelectContent>{MONTH_NAMES.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-40 space-y-2">
              <Label>Кол-во месяцев</Label>
              <Input type="number" min="1" max="36" className="h-10" value={newPlan.period_months} onChange={(e) => setNewPlan({...newPlan, period_months: e.target.value})} required />
            </div>
            <div className="w-28 space-y-2">
              <Label>Год</Label>
              <Input type="number" className="h-10" value={newPlan.start_year} onChange={(e) => setNewPlan({...newPlan, start_year: e.target.value})} required />
            </div>
            <div className="flex-1 min-w-[250px] space-y-2">
              <Label>Название плана</Label>
              <Input className="h-10" value={newPlan.name} onChange={(e) => setNewPlan({...newPlan, name: e.target.value})} placeholder="Основной тариф" required />
            </div>
            <Button type="submit" className="h-10">Создать план</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Список планов ({filteredPlans.length})</CardTitle>
            <Select value={filterObjectId} onValueChange={setFilterObjectId}>
              <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Все объекты" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все объекты</SelectItem>
                {objects.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{filterObjectId && filterObjectId !== 'all' ? 'Планов для выбранного объекта нет.' : 'Планов пока нет.'}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredPlans.map(p => {
                const obj = objects.find(o => Number(o.id) === Number(p.object_id));
                return (
                  <button key={p.id} onClick={() => setSelectedPlan(p)} className={`px-4 py-2 rounded-lg border text-left transition-all ${selectedPlan?.id === p.id ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background hover:bg-muted border-border'}`}>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className={`text-xs ${selectedPlan?.id === p.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {getPeriodString(p.start_month, p.start_year, p.period_months)} • {obj?.name || '—'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <CardTitle>{selectedPlan ? selectedPlan.name : 'Выберите план'}</CardTitle>
              {selectedPlan && <CardDescription className="mt-1">{getPeriodString(selectedPlan.start_month, selectedPlan.start_year, selectedPlan.period_months)} • {currentObject?.name} • {selectedPlan.period_months} мес.</CardDescription>}
            </div>
            {selectedPlan && tariff && (
              <div className="flex items-start gap-3 flex-wrap">
                <div className="px-3 py-2 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground">Итого</div>
                  <div className="font-bold text-foreground">{formatMoney(tariff.grand_total)}</div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-xs text-muted-foreground">Тариф</div>
                  <div className="font-bold text-foreground">{formatMoney(tariff.tariff_per_unit)} / {tariff.tariff_unit}</div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(plansApi.exportExcel(selectedPlan.id), '_blank')}
                  title="Экспорт в Excel"
                  className="h-10"
                >
                  📊 Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(plansApi.exportPdf(selectedPlan.id), '_blank')}
                  title="Экспорт в PDF"
                  className="h-10"
                >
                  📄 PDF
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeletePlan} className="h-10">🗑️ Удалить</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedPlan ? (
            <>
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-semibold">Позиции плана</h3>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRecalculateRates} 
                    disabled={loading}
                    title="Обновить цены во всех месяцах на основе актуальных расценок из справочника"
                  >
                    🔄 Обновить расценки
                  </Button>
                  <Button size="sm" onClick={() => { setEditingItem(null); setDialogOpen(true); }}>
                    ＋ Добавить услугу
                  </Button>
                </div>
              </div>

              {loading ? <p>Загрузка...</p> : (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="w-full border-collapse">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="bg-muted min-w-[200px] border-r border-border text-center" style={{ position: 'sticky', left: 0, zIndex: 30 }}>Услуга</TableHead>
                        <TableHead className="bg-muted min-w-[70px] border-r-2 border-border text-center" style={{ position: 'sticky', left: COL_SERVICE_W, zIndex: 30 }}>Ед. изм.</TableHead>
                        {periodMonths.map((pm, idx) => <TableHead key={idx} className="text-center min-w-[100px] text-xs">{pm.label}</TableHead>)}
                        <TableHead className="text-center min-w-[120px] bg-muted border-l-2 border-border" style={{ position: 'sticky', right: `${COL_TOTAL_SUM_W + COL_ACTION_W}px`, zIndex: 30 }}>Итого кол-во</TableHead>
                        <TableHead className="text-center min-w-[140px] bg-muted border-l border-border" style={{ position: 'sticky', right: `${COL_ACTION_W}px`, zIndex: 30 }}>Итого сумма</TableHead>
                        <TableHead className="bg-muted min-w-[90px] text-center border-l-2 border-border" style={{ position: 'sticky', right: 0, zIndex: 40 }}>⚙️</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedRows.length === 0 ? (
                        <TableRow><TableCell colSpan={TOTAL_COLS} className="text-center text-muted-foreground h-24">Нет позиций. Добавьте первую услугу.</TableCell></TableRow>
                      ) : (
                        groupedRows.map((row, rowIdx) => {
                          if (row.type === 'category') {
                            return (
                              <TableRow key={`cat-${row.category?.id}-${rowIdx}`} className="bg-primary/5 hover:bg-primary/5">
                                <TableCell colSpan={2} className="bg-primary/10 font-bold text-sm uppercase tracking-wide border-r-2 border-primary/30" style={{ position: 'sticky', left: 0, zIndex: 20 }}>{row.category?.name}</TableCell>
                                {periodMonths.map((_, idx) => <TableCell key={idx} className="bg-primary/5"></TableCell>)}
                                <TableCell className="bg-primary/5"></TableCell>
                                <TableCell className="text-right font-bold text-sm bg-primary/10 border-l border-primary/30" style={{ position: 'sticky', right: `${COL_ACTION_W}px`, zIndex: 20 }}>{formatMoney(row.categoryTotal || 0)}</TableCell>
                                <TableCell className="bg-primary/10"></TableCell>
                              </TableRow>
                            );
                          }
                          
                          const item = row.item!;
                          const svc = services.find(s => Number(s.id) === Number(item.service_type_id));
                          
                          // 🎯 ИСПРАВЛЕНО: используем Fragment с key вместо пустого <>
                          return (
                            <Fragment key={`item-wrapper-${item.id}`}>
                              <TableRow key={`item-qty-${item.id}`}>
                                <TableCell className="bg-muted font-medium border-r border-border" style={{ position: 'sticky', left: 0, zIndex: 10 }}>
                                  {svc?.name || `Услуга (ID: ${item.service_type_id})`}
                                  {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                                </TableCell>
                                <TableCell className="bg-muted text-center font-medium border-r-2 border-border" style={{ position: 'sticky', left: COL_SERVICE_W, zIndex: 10 }}>
                                  <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">{svc?.unit?.symbol || 'ед.'}</span>
                                </TableCell>
                                {periodMonths.map((pm, idx) => {
                                  const m = item.monthly.find(x => x.month === pm.month && x.year === pm.year);
                                  return <TableCell key={idx} className="text-right text-sm">{m ? formatNumber(m.quantity) : '—'}</TableCell>;
                                })}
                                <TableCell className="text-right font-semibold bg-muted border-l-2 border-border" style={{ position: 'sticky', right: `${COL_TOTAL_SUM_W + COL_ACTION_W}px`, zIndex: 10 }}>{formatNumber(item.total_quantity)}</TableCell>
                                <TableCell className="text-right font-bold bg-muted border-l border-border" style={{ position: 'sticky', right: `${COL_ACTION_W}px`, zIndex: 10 }}>{formatMoney(item.total_amount)}</TableCell>
                                <TableCell className="bg-muted text-center border-l-2 border-border" style={{ position: 'sticky', right: 0, zIndex: 20 }}>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setDialogOpen(true); }} className="h-8 w-8 p-0">✏️</Button>
                                    <Button variant="ghost" size="sm" onClick={async () => { if(window.confirm('Удалить?')) { await plansApi.deleteItem(selectedPlan.id, item.id); await loadPlanDetails(selectedPlan.id); } }} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">🗑️</Button>
                                  </div>
                                </TableCell>
                              </TableRow>

                              <TableRow key={`item-rate-${item.id}`} className="bg-muted/30 text-sm">
                                <TableCell className="bg-muted/50 font-medium text-muted-foreground border-r border-border" style={{ position: 'sticky', left: 0, zIndex: 10 }}>Цена за ед.</TableCell>
                                <TableCell className="bg-muted/50 border-r-2 border-border" style={{ position: 'sticky', left: COL_SERVICE_W, zIndex: 10 }}></TableCell>
                                {periodMonths.map((pm, idx) => {
                                  const m = item.monthly.find(x => x.month === pm.month && x.year === pm.year);
                                  return <TableCell key={idx} className="text-right text-muted-foreground">{m ? formatMoney(m.unit_price) : '—'}</TableCell>;
                                })}
                                <TableCell className="bg-muted/50 border-l-2 border-border" style={{ position: 'sticky', right: `${COL_TOTAL_SUM_W + COL_ACTION_W}px`, zIndex: 10 }}></TableCell>
                                <TableCell className="bg-muted/50 border-l border-border" style={{ position: 'sticky', right: `${COL_ACTION_W}px`, zIndex: 10 }}></TableCell>
                                <TableCell className="bg-muted/50 border-l-2 border-border" style={{ position: 'sticky', right: 0, zIndex: 20 }}></TableCell>
                              </TableRow>
                            </Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Выберите план из списка выше или создайте новый.</div>
          )}
        </CardContent>
      </Card>

      {selectedPlan && (
        <PlanMonthlyInput
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingItem(null); }}
          services={services}
          periodMonths={periodMonths}
          planId={selectedPlan.id}
          onSubmit={handleItemSubmit}
          initialData={editingItem ? {
            service_type_id: editingItem.service_type_id,
            description: editingItem.description,
            frequency: editingItem.frequency,
            monthly: editingItem.monthly
          } : null}
        />
      )}
    </div>
  );
}