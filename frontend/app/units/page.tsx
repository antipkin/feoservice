// frontend/app/units/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { unitsApi, UnitData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CanAccess } from '@/lib/rbac'; // 🎯 ИМПОРТ RBAC

export default function UnitsPage() {
  const [units, setUnits] = useState<UnitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitData | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
  });

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const data = await unitsApi.getAll();
      setUnits(data);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
    setLoading(false);
  };

  const handleOpenDialog = (unit?: UnitData) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        code: unit.code,
        name: unit.name,
        symbol: unit.symbol,
      });
    } else {
      setEditingUnit(null);
      setFormData({ code: '', name: '', symbol: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await unitsApi.update(editingUnit.id, formData);
      } else {
        await unitsApi.create({ ...formData, is_active: true });
      }
      setDialogOpen(false);
      await loadUnits();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDelete = async (unit: UnitData) => {
    if (!window.confirm(`Удалить единицу измерения "${unit.name}"?`)) return;
    try {
      await unitsApi.delete(unit.id);
      await loadUnits();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">📏 Единицы измерения</h1>
        {/* 🎯 Кнопка создания — только admin и economist */}
        <CanAccess roles={['admin', 'economist']}>
          <Button onClick={() => handleOpenDialog()}>＋ Добавить единицу</Button>
        </CanAccess>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список единиц ({units.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Код</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead className="w-[100px]">Обозначение</TableHead>
                    {/* 🎯 Заголовок "Действия" — только admin и economist */}
                    <CanAccess roles={['admin', 'economist']}>
                      <TableHead className="text-right w-[120px]">Действия</TableHead>
                    </CanAccess>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        Нет единиц измерения. Добавьте первую.
                      </TableCell>
                    </TableRow>
                  ) : (
                    units.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-sm">{u.code}</TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>
                          <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">
                            {u.symbol}
                          </span>
                        </TableCell>
                        {/* 🎯 Кнопки редактирования/удаления — только admin и economist */}
                        <CanAccess roles={['admin', 'economist']}>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(u)}>✏️</Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(u)}
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

      {/* 🎯 Диалог создания/редактирования — только admin и economist */}
      <CanAccess roles={['admin', 'economist']}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingUnit ? 'Редактировать единицу' : 'Новая единица измерения'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Код *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="M2"
                    maxLength={20}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Уникальный идентификатор (латиницей)</p>
                </div>
                <div className="space-y-2">
                  <Label>Обозначение *</Label>
                  <Input
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                    placeholder="м²"
                    maxLength={20}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Символ для отображения в таблицах</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Полное название *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Квадратный метр"
                  maxLength={200}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  {editingUnit ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}