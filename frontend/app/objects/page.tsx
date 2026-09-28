// frontend/app/objects/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { objectsApi, ObjectData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';

const formatObjectType = (type: string) => {
  if (type === 'MKD') return 'МКД';
  if (type === 'PARKING') return 'Паркинг';
  return type;
};

const formatTariffBase = (base: string, type: string) => {
  if (type === 'MKD') return 'на м² площади';
  return base === 'spaces' ? 'на машиноместо' : 'на м² площади';
};

export default function ObjectsPage() {
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<ObjectData | null>(null);
  
  // 🆕 Состояние для фильтрации
  const [addressFilter, setAddressFilter] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'MKD' as 'MKD' | 'PARKING',
    address: '',
    area_sqm: '',
    spaces_count: '',
    tariff_base: 'area' as 'area' | 'spaces',
  });

  const loadObjects = async () => {
    try {
      setLoading(true);
      const data = await objectsApi.getAll();
      setObjects(data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      alert('Не удалось загрузить объекты. Убедитесь, что бэкенд запущен.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjects();
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingObject(null);
      setFormData({ 
        name: '', type: 'MKD', address: '', 
        area_sqm: '', spaces_count: '', tariff_base: 'area' 
      });
    }
  };

  const handleEdit = (obj: ObjectData) => {
    setEditingObject(obj);
    setFormData({
      name: obj.name,
      type: obj.type,
      address: obj.address || '',
      area_sqm: obj.area_sqm ? String(obj.area_sqm) : '',
      spaces_count: obj.spaces_count ? String(obj.spaces_count) : '',
      tariff_base: obj.tariff_base,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        address: formData.address || null,
        area_sqm: formData.area_sqm ? parseFloat(formData.area_sqm) : null,
        spaces_count: formData.spaces_count ? parseInt(formData.spaces_count) : null,
        tariff_base: formData.type === 'MKD' ? 'area' : formData.tariff_base,
        is_active: true,
      };

      if (editingObject) {
        await objectsApi.update(editingObject.id, payload);
      } else {
        await objectsApi.create(payload);
      }
      
      handleOpenChange(false);
      loadObjects();
    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    }
  };

  const handleDelete = async (obj: ObjectData) => {
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить объект "${obj.name}"?\n\n` +
      `⚠️ ВНИМАНИЕ: Будут безвозвратно удалены:\n` +
      `• Все планы, связанные с этим объектом\n` +
      `• Все позиции планов и помесячные данные\n` +
      `• Все связанные ресурсы\n\n` +
      `Это действие нельзя отменить!`
    );
    
    if (!confirmed) return;
    
    try {
      await objectsApi.delete(obj.id);
      setObjects(objects.filter(o => o.id !== obj.id));
    } catch (error: any) {
      alert(`Ошибка удаления: ${error.message}`);
    }
  };

  // 🆕 Фильтрация объектов по названию или адресу
  const filteredObjects = objects.filter(obj => 
    obj.address?.toLowerCase().includes(addressFilter.toLowerCase()) || 
    obj.name.toLowerCase().includes(addressFilter.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Справочник объектов</h1>
        <div className="flex gap-2">
          <Link href="/plans">
            <Button variant="outline">📊 Перейти к планированию</Button>
          </Link>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              ＋ Добавить объект
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingObject ? 'Редактировать объект' : 'Новый объект обслуживания'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    placeholder="Например: МКД Ленина 1"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип объекта</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(val: 'MKD' | 'PARKING') => setFormData({
                      ...formData, 
                      type: val,
                      tariff_base: val === 'MKD' ? 'area' : formData.tariff_base
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MKD">МКД (Многоквартирный дом)</SelectItem>
                      <SelectItem value="PARKING">Паркинг</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Адрес</Label>
                  <Input 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                    placeholder="г. Москва, ул. Ленина, д. 1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>
                    Общая площадь (м²)
                    {formData.type === 'MKD' && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.area_sqm} 
                    onChange={(e) => setFormData({...formData, area_sqm: e.target.value})} 
                    required={formData.type === 'MKD'}
                  />
                </div>
                
                {formData.type === 'PARKING' && (
                  <>
                    <div className="space-y-2">
                      <Label>Количество машиномест</Label>
                      <Input 
                        type="number" 
                        value={formData.spaces_count} 
                        onChange={(e) => setFormData({...formData, spaces_count: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>База расчёта тарифа</Label>
                      <Select 
                        value={formData.tariff_base} 
                        onValueChange={(val: 'area' | 'spaces') => setFormData({...formData, tariff_base: val})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="area">На м² площади</SelectItem>
                          <SelectItem value="spaces">На машиноместо</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.tariff_base === 'spaces' 
                          ? 'Тариф будет рассчитываться как общая стоимость / количество машиномест'
                          : 'Тариф будет рассчитываться как общая стоимость / площадь паркинга'}
                      </p>
                    </div>
                  </>
                )}
                
                <Button type="submit" className="w-full">
                  {editingObject ? 'Сохранить изменения' : 'Сохранить объект'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Список объектов ({filteredObjects.length})</CardTitle>
            {/* 🆕 Поле поиска */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или адресу..."
                value={addressFilter}
                onChange={(e) => setAddressFilter(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка данных...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Адрес</TableHead>
                    <TableHead>Площадь</TableHead>
                    <TableHead>Машиноместа</TableHead>
                    <TableHead>База тарифа</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredObjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                        {addressFilter ? 'Объекты не найдены' : 'Нет данных. Добавьте первый объект.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredObjects.map((obj) => (
                      <TableRow key={obj.id}>
                        <TableCell className="font-mono text-sm">{obj.id}</TableCell>
                        <TableCell className="font-medium">{obj.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            obj.type === 'MKD' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {formatObjectType(obj.type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate" title={obj.address || ''}>
                          {obj.address || '—'}
                        </TableCell>
                        <TableCell>
                          {obj.area_sqm ? `${Number(obj.area_sqm).toLocaleString('ru-RU')} м²` : '—'}
                        </TableCell>
                        <TableCell>
                          {obj.spaces_count ? `${obj.spaces_count} мест` : '—'}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                            {formatTariffBase(obj.tariff_base, obj.type)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            obj.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {obj.is_active ? 'Активен' : 'Неактивен'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(obj)} 
                              title="Редактировать"
                            >
                              ✏️
                            </Button>
                            <Link href={`/plans?object_id=${obj.id}`}>
                              <Button variant="ghost" size="sm" title="Создать план">
                                📊
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(obj)}
                              title="Удалить объект"
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
    </div>
  );
}