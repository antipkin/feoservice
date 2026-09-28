// frontend/app/facts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  objectsApi, plansApi, servicesApi, factsApi,
  ObjectData, PlanData, ServiceData, FactHeaderData, FactItemData, PlanFactComparisonItem
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function FactsPage() {
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [facts, setFacts] = useState<FactHeaderData[]>([]);
  const [selectedFact, setSelectedFact] = useState<FactHeaderData | null>(null);
  const [factItems, setFactItems] = useState<FactItemData[]>([]);
  const [comparison, setComparison] = useState<PlanFactComparisonItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Состояния для диалогов добавления/редактирования
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionMode, setActionMode] = useState<'add' | 'edit'>('add');
  const [editingFactItem, setEditingFactItem] = useState<FactItemData | null>(null);
  
  const [formData, setFormData] = useState({
    service_type_id: '',
    actual_quantity: '',
    unit_price: '',
    notes: '',
  });

  const [newFact, setNewFact] = useState({
    object_id: '',
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [objs, plns, svcs, fcts] = await Promise.all([
          objectsApi.getAll(), plansApi.getAll(), servicesApi.getAll(), factsApi.getAll(),
        ]);
        setObjects(objs); setPlans(plns); setServices(svcs); setFacts(fcts);
      } catch (e) { console.error('Ошибка загрузки данных:', e); }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedFact) loadFactDetails(selectedFact.id);
  }, [selectedFact]);

  const loadFactDetails = async (factId: number) => {
    setLoading(true);
    try {
      const [items, comp] = await Promise.all([
        factsApi.getItems(factId),
        factsApi.getPlanFactComparison(factId),
      ]);
      setFactItems(items);
      setComparison(comp);
    } catch (e) { console.error('Ошибка загрузки деталей факта:', e); }
    setLoading(false);
  };

  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await factsApi.create({
        object_id: parseInt(newFact.object_id),
        year: parseInt(newFact.year),
        month: parseInt(newFact.month),
        status: 'draft',
      });
      setFacts([...facts, created]);
      setCreateDialogOpen(false);
      setSelectedFact(created);
      setNewFact({ object_id: '', year: new Date().getFullYear().toString(), month: (new Date().getMonth() + 1).toString() });
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  const handleCopyFromPlan = async () => {
    if (!selectedFact) return;
    const planId = prompt('Введите ID плана для копирования:');
    if (!planId) return;
    try {
      await factsApi.copyFromPlan(selectedFact.id, parseInt(planId), selectedFact.month, selectedFact.year);
      await loadFactDetails(selectedFact.id);
      alert('Данные из плана успешно скопированы! Теперь вы можете отредактировать фактические значения.');
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  // 🎯 УМНАЯ ФУНКЦИЯ ОТКРЫТИЯ ДИАЛОГА
  const handleOpenActionDialog = (row: PlanFactComparisonItem) => {
    // Ищем, есть ли уже запись факта для этой услуги по service_type_id
    const existingFactItem = factItems.find(fi => fi.service_type_id === row.service_type_id);

    if (existingFactItem) {
      // Режим РЕДАКТИРОВАНИЯ
      setActionMode('edit');
      setEditingFactItem(existingFactItem);
      setFormData({
        service_type_id: existingFactItem.service_type_id.toString(),
        actual_quantity: existingFactItem.actual_quantity,
        unit_price: existingFactItem.unit_price,
        notes: existingFactItem.notes || '',
      });
    } else {
      // Режим ДОБАВЛЕНИЯ, но с предзаполненными плановыми данными!
      setActionMode('add');
      setEditingFactItem(null);
      setFormData({
        service_type_id: row.service_type_id.toString(),
        actual_quantity: row.plan_quantity, // Берем из плана как основу
        unit_price: row.plan_amount && row.plan_quantity ? (parseFloat(row.plan_amount) / parseFloat(row.plan_quantity)).toString() : '0',
        notes: '',
      });
    }
    setActionDialogOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFact) return;
    
    try {
      const payload = {
        service_type_id: parseInt(formData.service_type_id),
        actual_quantity: parseFloat(formData.actual_quantity),
        unit_price: parseFloat(formData.unit_price),
        notes: formData.notes || null,
      };

      if (actionMode === 'edit' && editingFactItem) {
        await factsApi.updateItem(editingFactItem.id, payload);
      } else {
        await factsApi.addItem(selectedFact.id, payload);
      }
      
      setActionDialogOpen(false);
      setEditingFactItem(null);
      await loadFactDetails(selectedFact.id);
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  const handleDeleteFact = async () => {
    if (!selectedFact) return;
    if (!window.confirm(`Удалить факт за ${MONTH_NAMES[selectedFact.month - 1]} ${selectedFact.year}?`)) return;
    try {
      await factsApi.delete(selectedFact.id);
      setFacts(facts.filter(f => f.id !== selectedFact.id));
      setSelectedFact(null); setFactItems([]); setComparison([]);
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  const handleDeleteFactItem = async (itemId: number) => {
    if (!selectedFact) return;
    if (!window.confirm('Удалить эту позицию из факта?')) return;
    try {
      await factsApi.deleteItem(itemId);
      await loadFactDetails(selectedFact.id);
    } catch (e: any) { alert(`Ошибка: ${e.message}`); }
  };

  const formatMoney = (val: string | number) => new Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
  const formatNumber = (val: string | number) => new Number(val).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Ввод факта</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>＋ Создать факт</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Список фактов ({facts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {facts.length === 0 && <p className="text-sm text-muted-foreground">Фактов пока нет</p>}
            {facts.map(f => {
              const obj = objects.find(o => o.id === f.object_id);
              return (
                <div key={f.id} onClick={() => setSelectedFact(f)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedFact?.id === f.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}>
                  <div className="font-medium">{obj?.name || 'Неизвестный объект'}</div>
                  <div className="text-sm text-muted-foreground">{MONTH_NAMES[f.month - 1]} {f.year} • {f.status}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{selectedFact ? `${objects.find(o => o.id === selectedFact.object_id)?.name || '—'} — ${MONTH_NAMES[selectedFact.month - 1]} ${selectedFact.year}` : 'Выберите факт'}</CardTitle>
                {selectedFact && <CardDescription className="mt-1">Статус: {selectedFact.status}</CardDescription>}
              </div>
              {selectedFact && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(factsApi.exportExcel(selectedFact.id), '_blank')}
                    title="Экспорт в Excel"
                  >
                    📊 Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(factsApi.exportPdf(selectedFact.id), '_blank')}
                    title="Экспорт в PDF"
                  >
                    📄 PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyFromPlan}>
                    📋 Копировать из плана
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDeleteFact}>
                    🗑️ Удалить
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedFact ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">План-факт анализ</h3>
                  <Button size="sm" onClick={() => {
                    setActionMode('add');
                    setEditingFactItem(null);
                    setFormData({ service_type_id: '', actual_quantity: '', unit_price: '', notes: '' });
                    setActionDialogOpen(true);
                  }}>＋ Добавить услугу</Button>
                </div>

                {loading ? <p>Загрузка...</p> : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Услуга</TableHead>
                          <TableHead>Ед. изм.</TableHead>
                          <TableHead className="text-right">План кол-во</TableHead>
                          <TableHead className="text-right">Факт кол-во</TableHead>
                          <TableHead className="text-right">Отклонение</TableHead>
                          <TableHead className="text-right">План сумма</TableHead>
                          <TableHead className="text-right">Факт сумма</TableHead>
                          <TableHead className="text-right">Отклонение %</TableHead>
                          <TableHead className="text-center">⚙️</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground h-24">Нет данных. Скопируйте из плана или добавьте услуги вручную.</TableCell></TableRow>
                        ) : (
                          comparison.map((row, idx) => {
                            const deviationPct = parseFloat(row.deviation_pct);
                            const deviationColor = deviationPct > 0 ? 'text-green-600' : deviationPct < 0 ? 'text-red-600' : 'text-muted-foreground';
                            const hasFact = factItems.some(fi => fi.service_type_id === row.service_type_id);
                            
                            return (
                              <TableRow key={idx} className={!hasFact ? 'bg-muted/30' : ''}>
                                <TableCell className="font-medium">{row.service_name}</TableCell>
                                <TableCell>{row.unit_symbol}</TableCell>
                                <TableCell className="text-right">{formatNumber(row.plan_quantity)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatNumber(row.fact_quantity)}</TableCell>
                                <TableCell className={`text-right ${deviationColor}`}>{deviationPct > 0 ? '+' : ''}{formatNumber(row.deviation_qty)}</TableCell>
                                <TableCell className="text-right">{formatMoney(row.plan_amount)}</TableCell>
                                <TableCell className="text-right">{formatMoney(row.fact_amount)}</TableCell>
                                <TableCell className={`text-right font-semibold ${deviationColor}`}>{deviationPct > 0 ? '+' : ''}{formatNumber(row.deviation_pct)}%</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenActionDialog(row)} title={hasFact ? "Редактировать факт" : "Внести факт на основе плана"} className="h-8 w-8 p-0">
                                      ✏️
                                    </Button>
                                    {hasFact && (
                                      <Button variant="ghost" size="sm" onClick={() => {
                                        const item = factItems.find(fi => fi.service_type_id === row.service_type_id);
                                        if (item) handleDeleteFactItem(item.id);
                                      }} title="Удалить" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                                        🗑️
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">Выберите факт из списка слева или создайте новый.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Диалог создания факта */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать новый факт</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateFact} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Объект *</Label>
              <Select value={newFact.object_id} onValueChange={(v) => setNewFact({...newFact, object_id: v})} required>
                <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                <SelectContent>{objects.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Месяц *</Label>
                <Select value={newFact.month} onValueChange={(v) => setNewFact({...newFact, month: v})} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTH_NAMES.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Год *</Label>
                <Input type="number" value={newFact.year} onChange={(e) => setNewFact({...newFact, year: e.target.value})} required />
              </div>
            </div>
            <Button type="submit" className="w-full">Создать факт</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 🎯 УНИВЕРСАЛЬНЫЙ ДИАЛОГ: Добавление или Редактирование */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionMode === 'edit' ? 'Редактировать фактические данные' : 'Внести фактические данные'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAction} className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-md text-sm">
              <strong>Услуга:</strong> {services.find(s => s.id.toString() === formData.service_type_id)?.name || 'Выберите услугу'}
            </div>
            
            {actionMode === 'add' && (
              <div className="space-y-2">
                <Label>Услуга *</Label>
                <Select value={formData.service_type_id} onValueChange={(v) => setFormData({...formData, service_type_id: v})} required>
                  <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.unit?.symbol})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Фактическое количество *</Label>
                <Input type="number" step="0.01" value={formData.actual_quantity} onChange={(e) => setFormData({...formData, actual_quantity: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Фактическая цена за ед. *</Label>
                <Input type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({...formData, unit_price: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Примечания</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Необязательно" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setActionDialogOpen(false)}>Отмена</Button>
              <Button type="submit" className="flex-1">{actionMode === 'edit' ? 'Сохранить изменения' : 'Добавить в факт'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}