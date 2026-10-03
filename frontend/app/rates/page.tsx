// frontend/app/rates/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { servicesApi, objectsApi, ServiceRateData, ObjectData, ServiceData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanAccess } from '@/lib/rbac'; // 🎯 ИМПОРТ RBAC

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function RatesPage() {
  const [rates, setRates] = useState<ServiceRateData[]>([]);
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterObjectId, setFilterObjectId] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ServiceRateData | null>(null);
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    object_id: '',
    service_type_id: '',
    price_per_unit: '',
    valid_from_month: '1',
    valid_from_year: currentYear.toString(),
    valid_to_month: '12',
    valid_to_year: currentYear.toString(),
    has_valid_to: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [objs, svcs, rts] = await Promise.all([
          objectsApi.getAll(),
          servicesApi.getAll(),
          servicesApi.getRates(filterObjectId === 'all' ? undefined : parseInt(filterObjectId)),
        ]);
        setObjects(objs);
        setServices(svcs);
        setRates(rts);
      } catch (e) {
        console.error('Ошибка загрузки:', e);
      }
      setLoading(false);
    };
    loadData();
  }, [filterObjectId]);

  const handleOpenDialog = (rate?: ServiceRateData) => {
    if (rate) {
      setEditingRate(rate);
      const fromDate = new Date(rate.valid_from);
      const toDate = rate.valid_to ? new Date(rate.valid_to) : null;
      setFormData({
        object_id: rate.object_id?.toString() || '',
        service_type_id: rate.service_type_id.toString(),
        price_per_unit: rate.price_per_unit,
        valid_from_month: (fromDate.getMonth() + 1).toString(),
        valid_from_year: fromDate.getFullYear().toString(),
        valid_to_month: toDate ? (toDate.getMonth() + 1).toString() : '12',
        valid_to_year: toDate ? toDate.getFullYear().toString() : currentYear.toString(),
        has_valid_to: !!rate.valid_to,
      });
    } else {
      setEditingRate(null);
      setFormData({
        object_id: '',
        service_type_id: '',
        price_per_unit: '',
        valid_from_month: '1',
        valid_from_year: currentYear.toString(),
        valid_to_month: '12',
        valid_to_year: currentYear.toString(),
        has_valid_to: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validFrom = `${formData.valid_from_year}-${formData.valid_from_month.padStart(2, '0')}-01`;
      let validTo = null;
      if (formData.has_valid_to) {
        const lastDay = new Date(parseInt(formData.valid_to_year), parseInt(formData.valid_to_month), 0).getDate();
        validTo = `${formData.valid_to_year}-${formData.valid_to_month.padStart(2, '0')}-${lastDay}`;
      }

      const payload = {
        object_id: formData.object_id ? parseInt(formData.object_id) : null,
        service_type_id: parseInt(formData.service_type_id),
        price_per_unit: parseFloat(formData.price_per_unit),
        valid_from: validFrom,
        valid_to: validTo,
      };

      if (editingRate) {
        await servicesApi.updateRate(editingRate.id, payload);
      } else {
        await servicesApi.createRate(payload);
      }
      setDialogOpen(false);
      setRates(await servicesApi.getRates(filterObjectId === 'all' ? undefined : parseInt(filterObjectId)));
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDelete = async (rate: ServiceRateData) => {
    if (!window.confirm(`Удалить расценку для "${rate.service_name}"?`)) return;
    try {
      await servicesApi.deleteRate(rate.id);
      setRates(await servicesApi.getRates(filterObjectId === 'all' ? undefined : parseInt(filterObjectId)));
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const formatMoney = (val: string) => new Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
  const formatDate = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : 'Бессрочно';

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">💰 Расценки на услуги</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(servicesApi.exportRatesExcel(filterObjectId === 'all' ? undefined : parseInt(filterObjectId)), '_blank')}>📊 Excel</Button>
          <Button variant="outline" onClick={() => window.open(servicesApi.exportRatesPdf(filterObjectId === 'all' ? undefined : parseInt(filterObjectId)), '_blank')}>📄 PDF</Button>
          {/* 🎯 Кнопка создания видна только admin и economist */}
          <CanAccess roles={['admin', 'economist']}>
            <Button onClick={() => handleOpenDialog()}>＋ Добавить расценку</Button>
          </CanAccess>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Список расценок ({rates.length})</CardTitle>
          <Select value={filterObjectId} onValueChange={setFilterObjectId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Все объекты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все объекты</SelectItem>
              {objects.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-center py-8">Загрузка...</p> : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Объект</TableHead>
                    <TableHead>Услуга</TableHead>
                    <TableHead>Цена за ед.</TableHead>
                    <TableHead>Действует с</TableHead>
                    <TableHead>Действует по</TableHead>
                    {/* 🎯 Заголовок "Действия" виден только admin и economist */}
                    <CanAccess roles={['admin', 'economist']}>
                      <TableHead className="text-right">Действия</TableHead>
                    </CanAccess>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">Нет расценок</TableCell></TableRow>
                  ) : (
                    rates.map(rate => (
                      <TableRow key={rate.id}>
                        <TableCell><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">{rate.object_name || 'Глобальная'}</span></TableCell>
                        <TableCell className="font-medium">{rate.service_name}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(rate.price_per_unit)}</TableCell>
                        <TableCell>{formatDate(rate.valid_from)}</TableCell>
                        <TableCell>{formatDate(rate.valid_to)}</TableCell>
                        {/* 🎯 Кнопки редактирования/удаления видны только admin и economist */}
                        <CanAccess roles={['admin', 'economist']}>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(rate)}>✏️</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(rate)} className="hover:bg-destructive/10 hover:text-destructive">🗑️</Button>
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

      {/* 🎯 Диалог создания/редактирования — только для admin и economist */}
      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRate ? 'Редактировать расценку' : 'Новая расценка'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Объект (оставьте пустым для глобальной расценки)</Label>
                <Select value={formData.object_id} onValueChange={(v) => setFormData({...formData, object_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Глобальная расценка" /></SelectTrigger>
                  <SelectContent>
                    {objects.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Услуга *</Label>
                <Select value={formData.service_type_id} onValueChange={(v) => setFormData({...formData, service_type_id: v})} required>
                  <SelectTrigger><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.unit?.symbol})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Цена за единицу *</Label>
                <Input type="number" step="0.01" value={formData.price_per_unit} onChange={(e) => setFormData({...formData, price_per_unit: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Действует с (месяц) *</Label>
                  <Select value={formData.valid_from_month} onValueChange={(v) => setFormData({...formData, valid_from_month: v})} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTH_NAMES.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Год *</Label>
                  <Input type="number" value={formData.valid_from_year} onChange={(e) => setFormData({...formData, valid_from_year: e.target.value})} required />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="has_valid_to" checked={formData.has_valid_to} onChange={(e) => setFormData({...formData, has_valid_to: e.target.checked})} className="rounded" />
                <Label htmlFor="has_valid_to" className="cursor-pointer">Указать дату окончания действия</Label>
              </div>
              {formData.has_valid_to && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>По месяц *</Label>
                    <Select value={formData.valid_to_month} onValueChange={(v) => setFormData({...formData, valid_to_month: v})} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{MONTH_NAMES.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Год *</Label>
                    <Input type="number" value={formData.valid_to_year} onChange={(e) => setFormData({...formData, valid_to_year: e.target.value})} required />
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button type="submit" className="flex-1">{editingRate ? 'Сохранить' : 'Создать'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}