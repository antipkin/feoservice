// frontend/app/resources/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { resourcesApi, servicesApi, ResourceData, ResourceRateData, ResourceNormData, ServiceData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanAccess } from '@/lib/rbac'; // 🎯 ИМПОРТ RBAC

// 🎯 Типы ресурсов
const RESOURCE_TYPES = [
  { value: 'material', label: '📦 Материалы' },
  { value: 'labor', label: '👷 Трудозатраты' },
  { value: 'transport', label: '🚗 Транспорт' },
  { value: 'energy', label: '⚡ Энергоресурсы' },
  { value: 'other', label: '📋 Прочее' },
];

// 🎯 Пресеты ресурсов для быстрого добавления
const RESOURCE_PRESETS = [
  { code: 'KRASKA', name: 'Краска водоэмульсионная', unit: 'л', resource_type: 'material' },
  { code: 'LAMP', name: 'Лампа светодиодная', unit: 'шт', resource_type: 'material' },
  { code: 'TRUD_DVOR', name: 'Труд дворника', unit: 'час', resource_type: 'labor' },
  { code: 'TRUD_SLES', name: 'Труд сантехника', unit: 'час', resource_type: 'labor' },
  { code: 'TRUD_ELEK', name: 'Труд электрика', unit: 'час', resource_type: 'labor' },
  { code: 'MOYSRED', name: 'Моющее средство', unit: 'л', resource_type: 'material' },
  { code: 'BENZIN', name: 'Бензин АИ-92', unit: 'л', resource_type: 'transport' },
  { code: 'ELECTRO', name: 'Электроэнергия', unit: 'кВт·ч', resource_type: 'energy' },
  { code: 'HVS', name: 'Холодное водоснабжение', unit: 'м³', resource_type: 'energy' },
  { code: 'GVS', name: 'Горячее водоснабжение', unit: 'м³', resource_type: 'energy' },
];

type TabType = 'resources' | 'rates' | 'norms';

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [rates, setRates] = useState<ResourceRateData[]>([]);
  const [norms, setNorms] = useState<ResourceNormData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('resources');
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [normDialogOpen, setNormDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceData | null>(null);
  const [editingRate, setEditingRate] = useState<ResourceRateData | null>(null);
  const [editingNorm, setEditingNorm] = useState<ResourceNormData | null>(null);

  const [resourceForm, setResourceForm] = useState({
    code: '', name: '', unit: '', resource_type: 'material'
  });
  const [rateForm, setRateForm] = useState({
    resource_id: '', price_per_unit: '', valid_from: '', valid_to: ''
  });
  const [normForm, setNormForm] = useState({
    service_type_id: '', resource_id: '', quantity_per_unit: '', valid_from: '', valid_to: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [res, rts, nrm, svc] = await Promise.all([
        resourcesApi.getAll(),
        resourcesApi.getRates(),
        resourcesApi.getNorms(),
        servicesApi.getAll()
      ]);
      setResources(res);
      setRates(rts);
      setNorms(nrm);
      setServices(svc);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
    setLoading(false);
  };

  // === РЕСУРСЫ ===
  const handleOpenResourceDialog = (resource?: ResourceData) => {
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        code: resource.code,
        name: resource.name,
        unit: resource.unit,
        resource_type: resource.resource_type
      });
    } else {
      setEditingResource(null);
      setResourceForm({ code: '', name: '', unit: '', resource_type: 'material' });
    }
    setResourceDialogOpen(true);
  };

  const handleApplyResourcePreset = (preset: typeof RESOURCE_PRESETS[0]) => {
    setResourceForm({
      code: preset.code,
      name: preset.name,
      unit: preset.unit,
      resource_type: preset.resource_type
    });
    setEditingResource(null);
    setResourceDialogOpen(true);
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingResource) {
        await resourcesApi.update(editingResource.id, resourceForm);
      } else {
        await resourcesApi.create({ ...resourceForm, is_active: true });
      }
      setResourceDialogOpen(false);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDeleteResource = async (resource: ResourceData) => {
    if (!window.confirm(`Удалить ресурс "${resource.name}"?`)) return;
    try {
      await resourcesApi.delete(resource.id);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  // === РАСЦЕНКИ ===
  const handleOpenRateDialog = (rate?: ResourceRateData) => {
    if (rate) {
      setEditingRate(rate);
      setRateForm({
        resource_id: rate.resource_id.toString(),
        price_per_unit: rate.price_per_unit,
        valid_from: rate.valid_from,
        valid_to: rate.valid_to || ''
      });
    } else {
      setEditingRate(null);
      setRateForm({ resource_id: '', price_per_unit: '', valid_from: '', valid_to: '' });
    }
    setRateDialogOpen(true);
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        resource_id: parseInt(rateForm.resource_id),
        price_per_unit: parseFloat(rateForm.price_per_unit),
        valid_from: rateForm.valid_from,
        valid_to: rateForm.valid_to || null
      };
      if (editingRate) {
        await resourcesApi.updateRate(editingRate.id, payload);
      } else {
        await resourcesApi.createRate(payload);
      }
      setRateDialogOpen(false);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDeleteRate = async (rate: ResourceRateData) => {
    if (!window.confirm('Удалить расценку?')) return;
    try {
      await resourcesApi.deleteRate(rate.id);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  // === НОРМАТИВЫ ===
  const handleOpenNormDialog = (norm?: ResourceNormData) => {
    if (norm) {
      setEditingNorm(norm);
      setNormForm({
        service_type_id: norm.service_type_id.toString(),
        resource_id: norm.resource_id.toString(),
        quantity_per_unit: norm.quantity_per_unit,
        valid_from: norm.valid_from,
        valid_to: norm.valid_to || ''
      });
    } else {
      setEditingNorm(null);
      setNormForm({ service_type_id: '', resource_id: '', quantity_per_unit: '', valid_from: '', valid_to: '' });
    }
    setNormDialogOpen(true);
  };

  const handleNormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        service_type_id: parseInt(normForm.service_type_id),
        resource_id: parseInt(normForm.resource_id),
        quantity_per_unit: parseFloat(normForm.quantity_per_unit),
        is_active: true,
        valid_from: normForm.valid_from,
        valid_to: normForm.valid_to || null
      };
      if (editingNorm) {
        await resourcesApi.updateNorm(editingNorm.id, payload);
      } else {
        await resourcesApi.createNorm(payload);
      }
      setNormDialogOpen(false);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDeleteNorm = async (norm: ResourceNormData) => {
    if (!window.confirm('Удалить норматив?')) return;
    try {
      await resourcesApi.deleteNorm(norm.id);
      await loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const formatMoney = (val: string) => new Number(val).toLocaleString('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2
  });
  const formatDate = (dateStr: string | null) =>
    dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : 'Бессрочно';
  const getResourceName = (id: number) => resources.find(r => r.id === id)?.name || '—';
  const getServiceName = (id: number) => services.find(s => s.id === id)?.name || '—';

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">📦 Ресурсы</h1>
        <p className="text-muted-foreground mt-1">
          Управление ресурсами, расценками и нормативами для расчёта себестоимости услуг
        </p>
      </div>

      {/* Переключатель вкладок */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'resources' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('resources')}
          className="rounded-b-none"
        >
          📦 Ресурсы ({resources.length})
        </Button>
        <Button
          variant={activeTab === 'rates' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('rates')}
          className="rounded-b-none"
        >
          💰 Расценки ({rates.length})
        </Button>
        <Button
          variant={activeTab === 'norms' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('norms')}
          className="rounded-b-none"
        >
          📊 Нормативы ({norms.length})
        </Button>
      </div>

      {/* ============================================================ */}
      {/* ВКЛАДКА: РЕСУРСЫ */}
      {/* ============================================================ */}
      {activeTab === 'resources' && (
        <>
          {/* 🎯 Быстрые пресеты — только для admin и economist */}
          <CanAccess roles={['admin', 'economist']}>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base">⚡ Быстрое добавление</CardTitle>
                    <CardDescription>
                      Нажмите на пресет, чтобы заполнить форму и создать ресурс
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleOpenResourceDialog()}>＋ Добавить ресурс</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {RESOURCE_PRESETS.map((preset, idx) => {
                    const exists = resources.some(r => r.code === preset.code);
                    return (
                      <Button
                        key={idx}
                        variant={exists ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleApplyResourcePreset(preset)}
                        className="gap-2"
                        title={exists ? 'Уже в справочнике (нажмите для редактирования)' : 'Создать ресурс'}
                      >
                        <span className="font-mono text-xs">{preset.code}</span>
                        <span className="text-sm">{preset.name}</span>
                        {exists && <span className="text-xs">✓</span>}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </CanAccess>

          {/* Таблица ресурсов */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Справочник ресурсов ({resources.length})</CardTitle>
                {/* 🎯 Кнопка добавления — только для admin и economist */}
                <CanAccess roles={['admin', 'economist']}>
                  <Button onClick={() => handleOpenResourceDialog()}>＋ Добавить ресурс</Button>
                </CanAccess>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8">Загрузка...</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Код</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead className="w-[100px]">Ед. изм.</TableHead>
                        <TableHead className="w-[150px]">Тип</TableHead>
                        {/* 🎯 Заголовок "Действия" — только для admin и economist */}
                        <CanAccess roles={['admin', 'economist']}>
                          <TableHead className="text-right w-[120px]">Действия</TableHead>
                        </CanAccess>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                            Нет ресурсов. Добавьте первый.
                          </TableCell>
                        </TableRow>
                      ) : (
                        resources.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-sm">{r.code}</TableCell>
                            <TableCell className="font-medium">{r.name}</TableCell>
                            <TableCell>
                              <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">
                                {r.unit}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                {RESOURCE_TYPES.find(t => t.value === r.resource_type)?.label || r.resource_type}
                              </span>
                            </TableCell>
                            {/* 🎯 Кнопки редактирования/удаления — только для admin и economist */}
                            <CanAccess roles={['admin', 'economist']}>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenResourceDialog(r)}>✏️</Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteResource(r)}
                                    className="hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    🗑️
                                  </Button>
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
        </>
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА: РАСЦЕНКИ */}
      {/* ============================================================ */}
      {activeTab === 'rates' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Расценки на ресурсы ({rates.length})</CardTitle>
                <CardDescription>Цены на ресурсы с периодами действия</CardDescription>
              </div>
              {/* 🎯 Кнопка добавления — только для admin и economist */}
              <CanAccess roles={['admin', 'economist']}>
                <Button onClick={() => handleOpenRateDialog()}>＋ Добавить расценку</Button>
              </CanAccess>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Загрузка...</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ресурс</TableHead>
                      <TableHead className="text-right">Цена за ед.</TableHead>
                      <TableHead>Действует с</TableHead>
                      <TableHead>Действует по</TableHead>
                      {/* 🎯 Заголовок "Действия" — только для admin и economist */}
                      <CanAccess roles={['admin', 'economist']}>
                        <TableHead className="text-right w-[120px]">Действия</TableHead>
                      </CanAccess>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                          Нет расценок. Добавьте первую.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rates.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.resource_name || getResourceName(r.resource_id)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(r.price_per_unit)}</TableCell>
                          <TableCell>{formatDate(r.valid_from)}</TableCell>
                          <TableCell>{formatDate(r.valid_to)}</TableCell>
                          {/* 🎯 Кнопки редактирования/удаления — только для admin и economist */}
                          <CanAccess roles={['admin', 'economist']}>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenRateDialog(r)}>✏️</Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRate(r)}
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  🗑️
                                </Button>
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
      )}

      {/* ============================================================ */}
      {/* ВКЛАДКА: НОРМАТИВЫ */}
      {/* ============================================================ */}
      {activeTab === 'norms' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Нормативы ресурсов ({norms.length})</CardTitle>
                <CardDescription>
                  Сколько ресурса нужно на 1 единицу услуги (например, 0.5 л краски на 1 м² покраски)
                </CardDescription>
              </div>
              {/* 🎯 Кнопка добавления — только для admin и economist */}
              <CanAccess roles={['admin', 'economist']}>
                <Button onClick={() => handleOpenNormDialog()}>＋ Добавить норматив</Button>
              </CanAccess>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Загрузка...</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Услуга</TableHead>
                      <TableHead>Ресурс</TableHead>
                      <TableHead className="text-right">Норма на 1 ед.</TableHead>
                      <TableHead>Действует с</TableHead>
                      <TableHead>Действует по</TableHead>
                      {/* 🎯 Заголовок "Действия" — только для admin и economist */}
                      <CanAccess roles={['admin', 'economist']}>
                        <TableHead className="text-right w-[120px]">Действия</TableHead>
                      </CanAccess>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {norms.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                          Нет нормативов. Добавьте первый.
                        </TableCell>
                      </TableRow>
                    ) : (
                      norms.map(n => (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium">{n.service_name || getServiceName(n.service_type_id)}</TableCell>
                          <TableCell>{n.resource_name || getResourceName(n.resource_id)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {new Number(n.quantity_per_unit).toLocaleString('ru-RU', { maximumFractionDigits: 4 })}
                          </TableCell>
                          <TableCell>{formatDate(n.valid_from)}</TableCell>
                          <TableCell>{formatDate(n.valid_to)}</TableCell>
                          {/* 🎯 Кнопки редактирования/удаления — только для admin и economist */}
                          <CanAccess roles={['admin', 'economist']}>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenNormDialog(n)}>✏️</Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNorm(n)}
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  🗑️
                                </Button>
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
      )}

      {/* ============================================================ */}
      {/* 🎯 ДИАЛОГ: РЕСУРС — только для admin и economist */}
      {/* ============================================================ */}
      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingResource ? 'Редактировать ресурс' : 'Новый ресурс'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleResourceSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Код *</Label>
                  <Input
                    value={resourceForm.code}
                    onChange={(e) => setResourceForm({ ...resourceForm, code: e.target.value.toUpperCase() })}
                    placeholder="KRASKA"
                    maxLength={50}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Единица измерения *</Label>
                  <Input
                    value={resourceForm.unit}
                    onChange={(e) => setResourceForm({ ...resourceForm, unit: e.target.value })}
                    placeholder="л, кг, час"
                    maxLength={50}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  placeholder="Краска водоэмульсионная"
                  maxLength={500}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Тип ресурса *</Label>
                <Select
                  value={resourceForm.resource_type}
                  onValueChange={(v) => setResourceForm({ ...resourceForm, resource_type: v })}
                  required
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setResourceDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  {editingResource ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>

      {/* ============================================================ */}
      {/* 🎯 ДИАЛОГ: РАСЦЕНКА — только для admin и economist */}
      {/* ============================================================ */}
      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Редактировать расценку' : 'Новая расценка на ресурс'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRateSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Ресурс *</Label>
                <Select
                  value={rateForm.resource_id}
                  onValueChange={(v) => setRateForm({ ...rateForm, resource_id: v })}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Выберите ресурс" /></SelectTrigger>
                  <SelectContent>
                    {resources.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name} ({r.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Цена за единицу (₽) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateForm.price_per_unit}
                  onChange={(e) => setRateForm({ ...rateForm, price_per_unit: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Действует с (дата) *</Label>
                <Input
                  type="date"
                  value={rateForm.valid_from}
                  onChange={(e) => setRateForm({ ...rateForm, valid_from: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Действует по (необязательно)</Label>
                <Input
                  type="date"
                  value={rateForm.valid_to}
                  onChange={(e) => setRateForm({ ...rateForm, valid_to: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Оставьте пустым для бессрочной расценки
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setRateDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  {editingRate ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>

      {/* ============================================================ */}
      {/* 🎯 ДИАЛОГ: НОРМАТИВ — только для admin и economist */}
      {/* ============================================================ */}
      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={normDialogOpen} onOpenChange={setNormDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingNorm ? 'Редактировать норматив' : 'Новый норматив'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNormSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Услуга *</Label>
                <Select
                  value={normForm.service_type_id}
                  onValueChange={(v) => setNormForm({ ...normForm, service_type_id: v })}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ресурс *</Label>
                <Select
                  value={normForm.resource_id}
                  onValueChange={(v) => setNormForm({ ...normForm, resource_id: v })}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Выберите ресурс" /></SelectTrigger>
                  <SelectContent>
                    {resources.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name} ({r.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Норма расхода на 1 ед. услуги *</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={normForm.quantity_per_unit}
                  onChange={(e) => setNormForm({ ...normForm, quantity_per_unit: e.target.value })}
                  placeholder="Например: 0.5 (литра краски на 1 м²)"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Сколько единиц ресурса требуется на 1 единицу услуги
                </p>
              </div>
              <div className="space-y-2">
                <Label>Действует с (дата) *</Label>
                <Input
                  type="date"
                  value={normForm.valid_from}
                  onChange={(e) => setNormForm({ ...normForm, valid_from: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Действует по (необязательно)</Label>
                <Input
                  type="date"
                  value={normForm.valid_to}
                  onChange={(e) => setNormForm({ ...normForm, valid_to: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setNormDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  {editingNorm ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}