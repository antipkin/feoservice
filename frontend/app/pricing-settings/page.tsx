// frontend/app/pricing-settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  pricingSettingsApi, objectsApi, servicesApi,
  PricingSettingsData, ObjectData, ServiceData, PriceCalculationResult
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanAccess } from '@/lib/rbac'; // 🎯 ИМПОРТ RBAC

export default function PricingSettingsPage() {
  const [settings, setSettings] = useState<PricingSettingsData[]>([]);
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState<PricingSettingsData | null>(null);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [calcResult, setCalcResult] = useState<PriceCalculationResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const [formData, setFormData] = useState({
    object_id: '',
    service_type_id: '',
    overhead_percent: '0',
    profit_percent: '0',
    vat_percent: '0',
    valid_from: '',
    valid_to: '',
  });

  const [calcForm, setCalcForm] = useState({
    service_type_id: '',
    object_id: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [set, obj, svc] = await Promise.all([
        pricingSettingsApi.getAll(),
        objectsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setSettings(set);
      setObjects(obj);
      setServices(svc);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
    setLoading(false);
  };

  const handleOpenDialog = (setting?: PricingSettingsData) => {
    if (setting) {
      setEditingSettings(setting);
      setFormData({
        object_id: setting.object_id?.toString() || '',
        service_type_id: setting.service_type_id?.toString() || '',
        overhead_percent: setting.overhead_percent,
        profit_percent: setting.profit_percent,
        vat_percent: setting.vat_percent,
        valid_from: setting.valid_from,
        valid_to: setting.valid_to || '',
      });
    } else {
      setEditingSettings(null);
      setFormData({
        object_id: '',
        service_type_id: '',
        overhead_percent: '0',
        profit_percent: '0',
        vat_percent: '0',
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        object_id: formData.object_id ? parseInt(formData.object_id) : null,
        service_type_id: formData.service_type_id ? parseInt(formData.service_type_id) : null,
        overhead_percent: parseFloat(formData.overhead_percent),
        profit_percent: parseFloat(formData.profit_percent),
        vat_percent: parseFloat(formData.vat_percent),
        valid_from: formData.valid_from,
        valid_to: formData.valid_to || null,
      };

      if (editingSettings) {
        await pricingSettingsApi.update(editingSettings.id, payload);
      } else {
        await pricingSettingsApi.create(payload);
      }
      setDialogOpen(false);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDelete = async (setting: PricingSettingsData) => {
    if (!window.confirm('Удалить эти настройки?')) return;
    try {
      await pricingSettingsApi.delete(setting.id);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcForm.service_type_id || !calcForm.object_id) {
      alert('Выберите услугу и объект');
      return;
    }
    setCalcLoading(true);
    try {
      const result = await pricingSettingsApi.calculate({
        service_type_id: parseInt(calcForm.service_type_id),
        object_id: parseInt(calcForm.object_id),
        target_date: calcForm.date,
      });
      setCalcResult(result);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
    setCalcLoading(false);
  };

  const formatMoney = (val: string) => new Number(val).toLocaleString('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2
  });

  const formatDate = (dateStr: string | null) =>
    dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : 'Бессрочно';

  const getLevelLabel = (setting: PricingSettingsData) => {
    if (setting.object_id && setting.service_type_id) return { text: '🎯 Услуга + Объект', color: 'bg-purple-100 text-purple-800' };
    if (setting.service_type_id) return { text: '🔧 Только услуга', color: 'bg-blue-100 text-blue-800' };
    if (setting.object_id) return { text: '🏢 Только объект', color: 'bg-green-100 text-green-800' };
    return { text: '🌍 Глобальные', color: 'bg-amber-100 text-amber-800' };
  };

  const getScopeDescription = (setting: PricingSettingsData) => {
    const parts = [];
    if (setting.service_name) parts.push(`Услуга: ${setting.service_name}`);
    if (setting.object_name) parts.push(`Объект: ${setting.object_name}`);
    if (parts.length === 0) return 'Применяется ко всем услугам и объектам';
    return parts.join(' • ');
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">⚙️ Настройки расчёта расценок</h1>
          <p className="text-muted-foreground mt-1">
            Управление накладными расходами, нормой прибыли и НДС
          </p>
        </div>
        <div className="flex gap-2">
          {/* 🎯 Калькулятор доступен всем авторизованным (не оборачиваем в CanAccess) */}
          <Button variant="outline" onClick={() => setCalcDialogOpen(true)}>🧮 Калькулятор</Button>
          {/* 🎯 Кнопка создания — только admin и economist */}
          <CanAccess roles={['admin', 'economist']}>
            <Button onClick={() => handleOpenDialog()}>＋ Добавить настройки</Button>
          </CanAccess>
        </div>
      </div>

      {/* Объяснение уровней */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">💡 Как работают уровни настроек</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Настройки имеют 4 уровня приоритета (от высшего к низшему):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="font-semibold text-sm text-purple-900">🎯 1. Услуга + Объект</div>
              <div className="text-xs text-purple-700 mt-1">Самый высокий приоритет. Переопределяет все остальные.</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="font-semibold text-sm text-blue-900">🔧 2. Только услуга</div>
              <div className="text-xs text-blue-700 mt-1">Применяется ко всем объектам для данной услуги.</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="font-semibold text-sm text-green-900">🏢 3. Только объект</div>
              <div className="text-xs text-green-700 mt-1">Применяется ко всем услугам на данном объекте.</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="font-semibold text-sm text-amber-900">🌍 4. Глобальные</div>
              <div className="text-xs text-amber-700 mt-1">Самый низкий приоритет. По умолчанию для всех.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Формула расчёта */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">📐 Формула расчёта расценки</h3>
          <div className="font-mono text-sm space-y-1 bg-white p-4 rounded-lg border">
            <div><span className="text-muted-foreground">1.</span> Себестоимость = Σ (норматив ресурса × цена ресурса)</div>
            <div><span className="text-muted-foreground">2.</span> С накладными = Себестоимость × (1 + накладные%)</div>
            <div><span className="text-muted-foreground">3.</span> С прибылью = С накладными × (1 + прибыль%)</div>
            <div><span className="text-muted-foreground">4.</span> С НДС = С прибылью × (1 + НДС%)</div>
            <div className="pt-2 font-bold text-primary">→ Итоговая расценка = С НДС</div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица настроек */}
      <Card>
        <CardHeader>
          <CardTitle>Список настроек ({settings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8">Загрузка...</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Уровень</TableHead>
                    <TableHead>Область применения</TableHead>
                    <TableHead className="text-right">Накладные %</TableHead>
                    <TableHead className="text-right">Прибыль %</TableHead>
                    <TableHead className="text-right">НДС %</TableHead>
                    <TableHead>Действует с</TableHead>
                    <TableHead>Действует по</TableHead>
                    {/* 🎯 Заголовок "Действия" виден только admin и economist */}
                    <CanAccess roles={['admin', 'economist']}>
                      <TableHead className="text-right w-[120px]">Действия</TableHead>
                    </CanAccess>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                        Нет настроек. Добавьте первую (рекомендуется начать с глобальных).
                      </TableCell>
                    </TableRow>
                  ) : (
                    settings.map(s => {
                      const level = getLevelLabel(s);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${level.color}`}>
                              {level.text}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{getScopeDescription(s)}</TableCell>
                          <TableCell className="text-right font-semibold">{s.overhead_percent}%</TableCell>
                          <TableCell className="text-right font-semibold">{s.profit_percent}%</TableCell>
                          <TableCell className="text-right font-semibold">{s.vat_percent}%</TableCell>
                          <TableCell>{formatDate(s.valid_from)}</TableCell>
                          <TableCell>{formatDate(s.valid_to)}</TableCell>
                          {/* 🎯 Кнопки редактирования/удаления — только admin и economist */}
                          <CanAccess roles={['admin', 'economist']}>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(s)}>✏️</Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(s)}
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </TableCell>
                          </CanAccess>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🎯 ДИАЛОГ: НАСТРОЙКИ — только для admin и economist */}
      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSettings ? 'Редактировать настройки' : 'Новые настройки расчёта'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Объект (необязательно)</Label>
                  <Select
                    value={formData.object_id}
                    onValueChange={(v) => setFormData({ ...formData, object_id: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Все объекты (глобально)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">🌍 Все объекты</SelectItem>
                      {objects.map(o => (
                        <SelectItem key={o.id} value={o.id.toString()}>🏢 {o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Оставьте пустым для применения ко всем объектам
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Услуга (необязательно)</Label>
                  <Select
                    value={formData.service_type_id}
                    onValueChange={(v) => setFormData({ ...formData, service_type_id: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Все услуги (глобально)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">🌍 Все услуги</SelectItem>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>🔧 {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Оставьте пустым для применения ко всем услугам
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label>Накладные расходы (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.overhead_percent}
                    onChange={(e) => setFormData({ ...formData, overhead_percent: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Аренда, административные расходы</p>
                </div>
                <div className="space-y-2">
                  <Label>Норма прибыли (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.profit_percent}
                    onChange={(e) => setFormData({ ...formData, profit_percent: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Наценка компании</p>
                </div>
                <div className="space-y-2">
                  <Label>НДС (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.vat_percent}
                    onChange={(e) => setFormData({ ...formData, vat_percent: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">0, 5, 7, 10, 20 или 22%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Действует с (дата) *</Label>
                  <Input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Действует по (необязательно)</Label>
                  <Input
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Пустое = бессрочно</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  {editingSettings ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>

      {/* 🎯 ДИАЛОГ: КАЛЬКУЛЯТОР — доступен всем авторизованным */}
      <CanAccess roles={['admin', 'economist', 'master', 'viewer']}>
        <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>🧮 Калькулятор расчёта расценки</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCalculate} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Услуга *</Label>
                  <Select
                    value={calcForm.service_type_id}
                    onValueChange={(v) => setCalcForm({ ...calcForm, service_type_id: v })}
                    required
                  >
                    <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Объект *</Label>
                  <Select
                    value={calcForm.object_id}
                    onValueChange={(v) => setCalcForm({ ...calcForm, object_id: v })}
                    required
                  >
                    <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                    <SelectContent>
                      {objects.map(o => (
                        <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Дата расчёта *</Label>
                <Input
                  type="date"
                  value={calcForm.date}
                  onChange={(e) => setCalcForm({ ...calcForm, date: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={calcLoading}>
                {calcLoading ? 'Расчёт...' : '🧮 Рассчитать расценку'}
              </Button>
              {calcResult && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Расчёт для:</div>
                      <div className="font-semibold">{calcResult.service_name}</div>
                      <div className="text-sm text-muted-foreground">Объект: {calcResult.object_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Источник настроек:</div>
                      <div className="font-semibold">{
                        calcResult.settings_source === 'service+object' ? '🎯 Услуга + Объект' :
                        calcResult.settings_source === 'service' ? '🔧 Только услуга' :
                        calcResult.settings_source === 'object' ? '🏢 Только объект' :
                        calcResult.settings_source === 'global' ? '🌍 Глобальные' : '❌ Не заданы'
                      }</div>
                    </div>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Себестоимость (ресурсы):</span>
                      <span className="font-semibold">{formatMoney(calcResult.cost_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">+ Накладные ({calcResult.overhead_percent}%):</span>
                      <span className="font-semibold text-blue-600">{formatMoney(calcResult.overhead_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">+ Прибыль ({calcResult.profit_percent}%):</span>
                      <span className="font-semibold text-green-600">{formatMoney(calcResult.profit_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">+ НДС ({calcResult.vat_percent}%):</span>
                      <span className="font-semibold text-amber-600">{formatMoney(calcResult.vat_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t">
                      <span className="font-bold">ИТОГО:</span>
                      <span className="font-bold text-primary text-lg">{formatMoney(calcResult.final_price)}</span>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}