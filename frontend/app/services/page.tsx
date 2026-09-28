// frontend/app/services/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { servicesApi, unitsApi, serviceCategoriesApi, ServiceData, UnitData, ServiceCategoryData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// 🆕 Предопределённые варианты периодичности
const FREQUENCY_PRESETS = [
  'ежедневно',
  'еженедельно',
  'ежемесячно',
  'раз в квартал',
  'раз в полгода',
  'ежегодно',
  'по заявке',
  'по графику',
  'аварийно-диспетчерское',
];

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit_id: '',
    category_id: '',
    frequency: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [svcs, uts, cats] = await Promise.all([
          servicesApi.getAll(),
          unitsApi.getAll(),
          serviceCategoriesApi.getAll(),
        ]);
        setServices(svcs);
        setUnits(uts);
        setCategories(cats);
      } catch (e) { console.error('Ошибка загрузки:', e); }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleOpenDialog = (service?: ServiceData) => {
    if (service) {
      setEditingService(service);
      setFormData({
        code: service.code,
        name: service.name,
        unit_id: service.unit_id.toString(),
        category_id: service.category_id.toString(),
        frequency: service.frequency || '',
      });
    } else {
      setEditingService(null);
      setFormData({ code: '', name: '', unit_id: '', category_id: '', frequency: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        unit_id: parseInt(formData.unit_id),
        category_id: parseInt(formData.category_id),
        frequency: formData.frequency || null,
        is_active: true,
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

  const handleDelete = async (service: ServiceData) => {
    if (!window.confirm(`Удалить услугу "${service.name}"?`)) return;
    try {
      await servicesApi.delete(service.id);
      setServices(services.filter(s => s.id !== service.id));
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Справочник услуг</h1>
        <Button onClick={() => handleOpenDialog()}>＋ Добавить услугу</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список услуг ({services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Ед. изм.</TableHead>
                    <TableHead>Периодичность</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Нет услуг. Добавьте первую.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map(svc => (
                      <TableRow key={svc.id}>
                        <TableCell className="font-mono text-sm">{svc.code}</TableCell>
                        <TableCell className="font-medium">{svc.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                            {svc.category?.name || '—'}
                          </span>
                        </TableCell>
                        <TableCell>{svc.unit?.symbol || '—'}</TableCell>
                        <TableCell>
                          {svc.frequency ? (
                            <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">
                              {svc.frequency}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(svc)}>✏️</Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(svc)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              🗑️
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Редактировать услугу' : 'Новая услуга'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Код *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="SRV-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Категория *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({...formData, category_id: v})}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Наименование *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ежедневная уборка подъездов"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Единица измерения *</Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(v) => setFormData({...formData, unit_id: v})}
                  required
                >
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 🆕 Поле периодичности */}
              <div className="space-y-2">
                <Label>Периодичность</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) => setFormData({...formData, frequency: v})}
                >
                  <SelectTrigger><SelectValue placeholder="Не указана" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_PRESETS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" className="flex-1">
                {editingService ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}