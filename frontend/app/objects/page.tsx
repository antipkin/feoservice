// frontend/app/objects/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { objectsApi, ObjectData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // 🎯 Добавляем радио-кнопки
import { CanAccess } from '@/lib/rbac';

export default function ObjectsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<ObjectData | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'МКД',
    address: '',
    area_sqm: '',
    spaces_count: '',
    tariff_base: 'area' as 'area' | 'spaces',
    is_active: true,
  });

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    try {
      const data = await objectsApi.getAll();
      setObjects(data);
    } catch (e) {
      console.error('Ошибка загрузки объектов:', e);
    }
    setLoading(false);
  };

  const handleOpenDialog = (obj?: ObjectData) => {
    if (obj) {
      setEditingObject(obj);
      setFormData({
        name: obj.name,
        type: obj.type,
        address: obj.address || '',
        area_sqm: obj.area_sqm?.toString() || '',
        spaces_count: obj.spaces_count?.toString() || '',
        tariff_base: obj.tariff_base,
        is_active: obj.is_active,
      });
    } else {
      setEditingObject(null);
      setFormData({
        name: '',
        type: 'МКД',
        address: '',
        area_sqm: '',
        spaces_count: '',
        tariff_base: 'area',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        address: formData.address || null,
        tariff_base: formData.tariff_base,
        is_active: formData.is_active,
        // Отправляем только то, что нужно для выбранной базы тарифа
        area_sqm: formData.tariff_base === 'area' && formData.area_sqm ? parseFloat(formData.area_sqm) : null,
        spaces_count: formData.tariff_base === 'spaces' && formData.spaces_count ? parseInt(formData.spaces_count) : null,
      };

      if (editingObject) {
        await objectsApi.update(editingObject.id, payload);
      } else {
        await objectsApi.create(payload);
      }
      setDialogOpen(false);
      await loadObjects();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDelete = async (obj: ObjectData) => {
    if (!window.confirm(`Вы уверены, что хотите удалить объект "${obj.name}"?`)) return;
    try {
      await objectsApi.delete(obj.id);
      setObjects(objects.filter(o => o.id !== obj.id));
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  // 🎯 Обработчик смены типа объекта
  const handleTypeChange = (newType: string) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      // Для МКД база всегда area, для Паркинга можно выбрать
      tariff_base: newType === 'МКД' ? 'area' : prev.tariff_base,
      // Очищаем лишние поля при смене типа, если они не соответствуют базе
      area_sqm: newType === 'Паркинг' && prev.tariff_base === 'spaces' ? '' : prev.area_sqm,
      spaces_count: newType === 'МКД' ? '' : prev.spaces_count,
    }));
  };

  if (isLoading || !user) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="text-lg text-muted-foreground">Проверка авторизации...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">🏢 Объекты обслуживания</h1>
        <CanAccess roles={['admin', 'economist']}>
          <Button onClick={() => handleOpenDialog()}>＋ Добавить объект</Button>
        </CanAccess>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список объектов ({objects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Адрес</TableHead>
                    <TableHead>База тарифа</TableHead>
                    <TableHead>Статус</TableHead>
                    <CanAccess roles={['admin', 'economist']}>
                      <TableHead className="text-right">Действия</TableHead>
                    </CanAccess>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Нет объектов. Добавьте первый.
                      </TableCell>
                    </TableRow>
                  ) : (
                    objects.map(obj => (
                      <TableRow key={obj.id}>
                        <TableCell className="font-medium">{obj.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            obj.type === 'МКД' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {obj.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{obj.address || '—'}</TableCell>
                        <TableCell>
                          {obj.tariff_base === 'area' 
                            ? `на м² (${obj.area_sqm || 0} м²)` 
                            : `на машиноместо (${obj.spaces_count || 0} шт)`}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold ${obj.is_active ? 'text-green-600' : 'text-red-600'}`}>
                            {obj.is_active ? 'Активен' : 'Неактивен'}
                          </span>
                        </TableCell>
                        <CanAccess roles={['admin', 'economist']}>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(obj)}>✏️</Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(obj)}
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

      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingObject ? 'Редактировать объект' : 'Новый объект'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Название объекта *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Например: МКД ул. Ленина, д. 1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип объекта *</Label>
                  <Select value={formData.type} onValueChange={handleTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="МКД">🏢 МКД</SelectItem>
                      <SelectItem value="Паркинг">🅿️ Паркинг</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Адрес</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="г. Москва, ул..."
                  />
                </div>
              </div>

              {/* 🎯 Выбор базы тарифа для Паркинга */}
              {formData.type === 'Паркинг' && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                  <Label>База расчёта тарифа *</Label>
                  <RadioGroup
                    value={formData.tariff_base}
                    onValueChange={(v) => setFormData({...formData, tariff_base: v as 'area' | 'spaces'})}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="area" id="base-area" />
                      <Label htmlFor="base-area" className="cursor-pointer font-normal">По площади (м²)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="spaces" id="base-spaces" />
                      <Label htmlFor="base-spaces" className="cursor-pointer font-normal">По машиноместам (шт)</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* 🎯 Динамическое поле ввода в зависимости от базы тарифа */}
              {formData.tariff_base === 'area' ? (
                <div className="space-y-2">
                  <Label>Общая площадь (м²) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.area_sqm}
                    onChange={(e) => setFormData({...formData, area_sqm: e.target.value})}
                    placeholder="Например: 5400"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Тариф будет рассчитываться на 1 м² площади</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Количество машиномест *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.spaces_count}
                    onChange={(e) => setFormData({...formData, spaces_count: e.target.value})}
                    placeholder="Например: 120"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Тариф будет рассчитываться на 1 машиноместо</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_active" className="cursor-pointer text-sm font-normal">
                  Объект активен (отображается в списках)
                </Label>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button type="submit">{editingObject ? 'Сохранить' : 'Создать'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}