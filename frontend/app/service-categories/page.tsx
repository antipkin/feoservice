// frontend/app/service-categories/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { serviceCategoriesApi, ServiceCategoryData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CanAccess } from '@/lib/rbac'; // 🎯 ИМПОРТ RBAC

// 🎯 Пресеты категорий услуг
const CATEGORY_PRESETS = [
  { code: 'UPR', name: 'Управление', sort_order: 1 },
  { code: 'SOI', name: 'Содержание ОИ', sort_order: 2 },
  { code: 'TR', name: 'Текущий ремонт', sort_order: 3 },
  { code: 'KR', name: 'Коммунальные ресурсы', sort_order: 4 },
  { code: 'BLG', name: 'Благоустройство', sort_order: 5 },
  { code: 'DOP', name: 'Дополнительные услуги', sort_order: 6 },
  { code: 'OK', name: 'Капитальный ремонт', sort_order: 7 },
  { code: 'OH', name: 'Охрана и безопасность', sort_order: 8 },
];

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategoryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    sort_order: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await serviceCategoriesApi.getAll();
      setCategories(data);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
    setLoading(false);
  };

  const handleOpenDialog = (category?: ServiceCategoryData) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        code: category.code,
        name: category.name,
        sort_order: category.sort_order.toString(),
      });
    } else {
      setEditingCategory(null);
      setFormData({
        code: '',
        name: '',
        sort_order: ((categories.length || 0) + 1).toString(),
      });
    }
    setDialogOpen(true);
  };

  const handleApplyPreset = (preset: typeof CATEGORY_PRESETS[0]) => {
    setFormData({
      code: preset.code,
      name: preset.name,
      sort_order: preset.sort_order.toString(),
    });
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        sort_order: parseInt(formData.sort_order) || 0,
        is_active: true,
      };

      if (editingCategory) {
        await serviceCategoriesApi.update(editingCategory.id, payload);
      } else {
        await serviceCategoriesApi.create(payload);
      }
      setDialogOpen(false);
      await loadCategories();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDelete = async (category: ServiceCategoryData) => {
    if (!window.confirm(`Удалить категорию "${category.name}"?`)) return;
    try {
      await serviceCategoriesApi.delete(category.id);
      await loadCategories();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleMoveUp = async (id: number) => {
    try {
      await serviceCategoriesApi.moveUp(id);
      await loadCategories();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleMoveDown = async (id: number) => {
    try {
      await serviceCategoriesApi.moveDown(id);
      await loadCategories();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  // Фильтрация по поисковому запросу
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">📂 Категории услуг</h1>
          <p className="text-muted-foreground mt-1">
            Группировка услуг для планов, отчётов и аналитики
          </p>
        </div>
        {/* 🎯 Кнопка создания — только admin и economist */}
        <CanAccess roles={['admin', 'economist']}>
          <Button onClick={() => handleOpenDialog()}>＋ Добавить категорию</Button>
        </CanAccess>
      </div>

      {/* Поиск */}
      <Card>
        <CardContent className="pt-6">
          <input
            type="text"
            placeholder="🔍 Поиск по названию или коду..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </CardContent>
      </Card>

      {/* Быстрые пресеты — только admin и economist */}
      {!searchQuery && (
        <CanAccess roles={['admin', 'economist']}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">⚡ Быстрое добавление</CardTitle>
              <CardDescription>
                Нажмите на пресет, чтобы заполнить форму. Сохраните, чтобы добавить в справочник.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_PRESETS.map((preset, idx) => {
                  const exists = categories.some(c => c.code === preset.code);
                  return (
                    <Button
                      key={idx}
                      variant={exists ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => handleApplyPreset(preset)}
                      disabled={exists}
                      className="gap-2"
                      title={exists ? 'Уже в справочнике' : 'Нажмите, чтобы заполнить форму'}
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
      )}

      {/* Таблица категорий */}
      <Card>
        <CardHeader>
          <CardTitle>Список категорий ({filteredCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-center">Порядок</TableHead>
                    <TableHead className="w-[120px]">Код</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead className="text-center w-[120px]">Услуг</TableHead>
                    {/* 🎯 Заголовок "Действия" — только admin и economist */}
                    <CanAccess roles={['admin', 'economist']}>
                      <TableHead className="text-right w-[180px]">Действия</TableHead>
                    </CanAccess>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        {searchQuery ? 'Ничего не найдено' : 'Нет категорий. Добавьте первую.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((cat, idx) => (
                      <TableRow key={cat.id}>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveUp(cat.id)}
                              disabled={idx === 0}
                              className="h-7 w-7 p-0"
                              title="Переместить вверх"
                            >
                              ↑
                            </Button>
                            <span className="text-sm font-mono w-6 text-center">{idx + 1}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveDown(cat.id)}
                              disabled={idx === filteredCategories.length - 1}
                              className="h-7 w-7 p-0"
                              title="Переместить вниз"
                            >
                              ↓
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {cat.code}
                        </TableCell>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                            {cat.services_count || 0}
                          </span>
                        </TableCell>
                        {/* 🎯 Кнопки редактирования/удаления — только admin и economist */}
                        <CanAccess roles={['admin', 'economist']}>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(cat)}
                                title="Редактировать"
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(cat)}
                                title="Удалить"
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
              <DialogTitle>
                {editingCategory ? 'Редактировать категорию' : 'Новая категория услуг'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Код *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="UPR"
                    maxLength={20}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Уникальный идентификатор (латиницей)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Порядок *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                    placeholder="1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Чем меньше, тем выше в списке
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Управление"
                  maxLength={200}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Полное название категории
                </p>
              </div>
              {/* Предпросмотр */}
              <div className="p-4 bg-muted/50 rounded-lg border">
                <Label className="text-xs text-muted-foreground mb-2 block">Предпросмотр</Label>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Код:</div>
                    <div className="font-mono text-sm">{formData.code || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Название:</div>
                    <div className="font-medium">{formData.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Порядок:</div>
                    <div className="font-mono text-sm">{formData.sort_order || '—'}</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">
                  {editingCategory ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}