// frontend/app/services/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  servicesApi, unitsApi, serviceCategoriesApi, objectsApi, pricingSettingsApi,
  ServiceData, UnitData, ServiceCategoryData, ObjectData, PriceCalculationResult
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanAccess } from '@/lib/rbac';

const FREQUENCY_PRESETS = [
  'ежедневно', 'еженедельно', 'ежемесячно', 'раз в квартал',
  'раз в полгода', 'ежегодно', 'по заявке', 'по графику', 'аварийно-диспетчерское',
];

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryData[]>([]);
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<PriceCalculationResult | null>(null);
  const [tempServiceId, setTempServiceId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', unit_id: '', category_id: '', frequency: '' });
  const [calcForm, setCalcForm] = useState({ object_id: '', target_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [svcs, uts, cats, objs] = await Promise.all([
          servicesApi.getAll(), unitsApi.getAll(), serviceCategoriesApi.getAll(), objectsApi.getAll()
        ]);
        setServices(svcs); setUnits(uts); setCategories(cats); setObjects(objs);
      } catch (e) { console.error('Ошибка загрузки:', e); }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleOpenDialog = (service?: ServiceData) => {
    if (service) {
      setEditingService(service);
      setFormData({
        code: service.code, name: service.name, unit_id: service.unit_id.toString(),
        category_id: service.category_id.toString(), frequency: service.frequency || '',
      });
    } else {
      setEditingService(null);
      setFormData({ code: '', name: '', unit_id: '', category_id: '', frequency: '' });
    }
    setDialogOpen(true);
  };

  const handleSaveAndCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code, name: formData.name, unit_id: parseInt(formData.unit_id),
        category_id: parseInt(formData.category_id), frequency: formData.frequency || null, is_active: true,
      };
      let savedId = editingService?.id;
      if (editingService) {
        await servicesApi.update(editingService.id, payload);
      } else {
        const newService = await servicesApi.create(payload);
        savedId = newService.id;
      }
      setTempServiceId(savedId || null);
      setDialogOpen(false);
      setCalcDialogOpen(true);
      setCalcResult(null);
    } catch (e: any) {
      alert(`Ошибка сохранения услуги: ${e.message}`);
    }
  };

  const handleJustSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code, name: formData.name, unit_id: parseInt(formData.unit_id),
        category_id: parseInt(formData.category_id), frequency: formData.frequency || null, is_active: true,
      };
      if (editingService) {
        await servicesApi.update(editingService.id, payload);
      } else {
        await servicesApi.create(payload);
      }
      setDialogOpen(false);
      setServices(await servicesApi.getAll());
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleCalculate = async () => {
    if (!tempServiceId || !calcForm.object_id) {
      alert('Пожалуйста, выберите объект для расчёта');
      return;
    }
    setCalcLoading(true);
    try {
      const result = await pricingSettingsApi.calculate({
        service_type_id: tempServiceId,
        object_id: parseInt(calcForm.object_id),
        target_date: calcForm.target_date,
      });
      setCalcResult(result);
    } catch (e: any) {
      alert(`Ошибка расчёта: ${e.message}`);
    }
    setCalcLoading(false);
  };

  const handleApplyRate = async () => {
    if (!tempServiceId || !calcResult) return;
    try {
      await servicesApi.createRate({
        object_id: calcForm.object_id ? parseInt(calcForm.object_id) : null,
        service_type_id: tempServiceId,
        price_per_unit: parseFloat(calcResult.final_price),
        valid_from: calcForm.target_date,
        valid_to: null,
      });
      setCalcDialogOpen(false);
      setCalcResult(null);
      setTempServiceId(null);
      setServices(await servicesApi.getAll());
      alert('✅ Расценка успешно рассчитана и создана!');
    } catch (e: any) {
      alert(`Ошибка создания расценки: ${e.message}`);
    }
  };

  const handleDelete = async (service: ServiceData) => {
    if (!window.confirm(`Удалить услугу "${service.name}"?`)) return;
    try {
      await servicesApi.delete(service.id);
      setServices(services.filter(s => s.id !== service.id));
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const formatMoney = (val: string) => new Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Справочник услуг</h1>
        <CanAccess roles={['admin', 'economist']}>
          <Button onClick={() => handleOpenDialog()}>＋ Добавить услугу</Button>
        </CanAccess>
      </div>

      <Card>
        <CardHeader><CardTitle>Список услуг ({services.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-center py-8 text-muted-foreground">Загрузка...</p> : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Ед. изм.</TableHead>
                    <TableHead>Периодичность</TableHead>
                    <CanAccess roles={['admin', 'economist']}>
                      <TableHead className="text-right">Действия</TableHead>
                    </CanAccess>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">Нет услуг. Добавьте первую.</TableCell></TableRow>
                  ) : (
                    services.map(svc => (
                      <TableRow key={svc.id}>
                        <TableCell className="font-mono text-sm">{svc.code}</TableCell>
                        <TableCell className="font-medium">{svc.name}</TableCell>
                        <TableCell><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">{svc.category?.name || '—'}</span></TableCell>
                        <TableCell>{svc.unit?.symbol || '—'}</TableCell>
                        <TableCell>
                          {svc.frequency ? <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">{svc.frequency}</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <CanAccess roles={['admin', 'economist']}>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(svc)}>✏️</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(svc)} className="hover:bg-destructive/10 hover:text-destructive">🗑️</Button>
                            </div>
                          </TableCell>
                        </CanAccess>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Редактировать услугу' : 'Новая услуга'}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Код *</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="SRV-001" required />
                </div>
                <div className="space-y-2">
                  <Label>Категория *</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({...formData, category_id: v})} required>
                    <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Наименование *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ежедневная уборка подъездов" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Единица измерения *</Label>
                  <Select value={formData.unit_id} onValueChange={(v) => setFormData({...formData, unit_id: v})} required>
                    <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                    <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.symbol})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Периодичность</Label>
                  <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                    <SelectTrigger><SelectValue placeholder="Не указана" /></SelectTrigger>
                    <SelectContent>{FREQUENCY_PRESETS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={handleJustSave}>
                  {editingService ? 'Сохранить' : 'Создать'}
                </Button>
                <Button type="button" className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSaveAndCalculate}>
                  💾 Сохранить и рассчитать
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>

      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={calcDialogOpen} onOpenChange={(open) => { if (!open) { setCalcDialogOpen(false); setCalcResult(null); setTempServiceId(null); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>🧮 Расчёт и создание расценки</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Объект (для применения настроек) *</Label>
                  <Select value={calcForm.object_id} onValueChange={(v) => { setCalcForm({...calcForm, object_id: v}); setCalcResult(null); }}>
                    <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                    <SelectContent>
                      {objects.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Дата расчёта *</Label>
                  <Input type="date" value={calcForm.target_date} onChange={(e) => { setCalcForm({...calcForm, target_date: e.target.value}); setCalcResult(null); }} required />
                </div>
              </div>
              <Button onClick={handleCalculate} disabled={calcLoading || !calcForm.object_id} className="w-full">
                {calcLoading ? 'Расчёт...' : '🧮 Рассчитать себестоимость и наценки'}
              </Button>
              {calcResult && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Расчёт для:</div>
                      <div className="font-semibold">{calcResult.service_name}</div>
                      <div className="text-sm text-muted-foreground">Объект: {calcResult.object_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Источник настроек:</div>
                      <div className="font-semibold text-primary">
                        {calcResult.settings_source === 'service+object' ? '🎯 Услуга + Объект' :
                         calcResult.settings_source === 'service' ? '🔧 Только услуга' :
                         calcResult.settings_source === 'object' ? '🏢 Только объект' : '🌍 Глобальные'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Себестоимость (ресурсы):</span>
                      <span className="font-semibold">{formatMoney(calcResult.cost_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ Накладные ({calcResult.overhead_percent}%):</span>
                      <span className="font-semibold text-blue-600">{formatMoney(calcResult.overhead_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ Прибыль ({calcResult.profit_percent}%):</span>
                      <span className="font-semibold text-green-600">{formatMoney(calcResult.profit_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ НДС ({calcResult.vat_percent}%):</span>
                      <span className="font-semibold text-amber-600">{formatMoney(calcResult.vat_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t font-bold">
                      <span>ИТОГО к применению:</span>
                      <span className="text-primary text-lg">{formatMoney(calcResult.final_price)}</span>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => { setCalcDialogOpen(false); setCalcResult(null); setTempServiceId(null); }}>
                      Отмена
                    </Button>
                    <Button onClick={handleApplyRate} className="bg-green-600 hover:bg-green-700">
                      ✅ Создать расценку с этой ценой
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}