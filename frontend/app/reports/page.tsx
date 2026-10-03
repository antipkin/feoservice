// frontend/app/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  reportsApi, objectsApi,
  ObjectData, ReportData, ReportListItemData
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CanAccess } from '@/lib/rbac'; // 🎯 ДОБАВЛЕН ИМПОРТ

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const formatPeriod = (startMonth: number, startYear: number, endMonth: number, endYear: number) => {
  return `${MONTH_NAMES[startMonth - 1]} ${startYear} — ${MONTH_NAMES[endMonth - 1]} ${endYear}`;
};

export default function ReportsPage() {
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [reports, setReports] = useState<ReportListItemData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState({
    object_id: '',
    start_month: '1',
    start_year: currentYear.toString(),
    end_month: '12',
    end_year: currentYear.toString(),
    name: '',
  });
  
  const [editData, setEditData] = useState({
    start_month: '',
    start_year: '',
    end_month: '',
    end_year: '',
    name: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [objs, rpts] = await Promise.all([
          objectsApi.getAll(),
          reportsApi.getAll(),
        ]);
        setObjects(objs);
        setReports(rpts);
      } catch (e) { console.error('Ошибка загрузки:', e); }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleViewReport = async (reportId: number) => {
    try {
      const report = await reportsApi.get(reportId);
      setSelectedReport(report);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        object_id: parseInt(formData.object_id),
        start_month: parseInt(formData.start_month),
        start_year: parseInt(formData.start_year),
        end_month: parseInt(formData.end_month),
        end_year: parseInt(formData.end_year),
        name: formData.name || null,
      };
      const created = await reportsApi.create(payload);
      const updatedReports = await reportsApi.getAll();
      setReports(updatedReports);
      setCreateDialogOpen(false);
      setFormData({
        object_id: '',
        start_month: '1',
        start_year: currentYear.toString(),
        end_month: '12',
        end_year: currentYear.toString(),
        name: '',
      });
      setSelectedReport(created);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleOpenEdit = () => {
    if (!selectedReport) return;
    setEditData({
      start_month: selectedReport.start_month.toString(),
      start_year: selectedReport.start_year.toString(),
      end_month: selectedReport.end_month.toString(),
      end_year: selectedReport.end_year.toString(),
      name: selectedReport.name || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      const payload = {
        start_month: parseInt(editData.start_month),
        start_year: parseInt(editData.start_year),
        end_month: parseInt(editData.end_month),
        end_year: parseInt(editData.end_year),
        name: editData.name || null,
      };
      const updated = await reportsApi.update(selectedReport.id, payload);
      setSelectedReport(updated);
      const updatedReports = await reportsApi.getAll();
      setReports(updatedReports);
      setEditDialogOpen(false);
      alert('Отчет обновлен. Период и данные пересчитаны.');
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;
    const confirmed = window.confirm(
      `Удалить отчет "${selectedReport.name || 'Без названия'}"?\n\nЭто действие нельзя отменить.`
    );
    if (!confirmed) return;
    try {
      await reportsApi.delete(selectedReport.id);
      setReports(reports.filter(r => r.id !== selectedReport.id));
      setSelectedReport(null);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const formatMoney = (val: string | number) =>
    new Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
  const formatNumber = (val: string | number) =>
    new Number(val).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">📑 Отчеты по объектам</h1>
        {/* 🎯 Кнопка создания видна только admin, economist, master */}
        <CanAccess roles={['admin', 'economist', 'master']}>
          <Button onClick={() => setCreateDialogOpen(true)}>＋ Создать отчет</Button>
        </CanAccess>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список отчетов */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Список отчетов ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Отчетов пока нет</p>
            ) : (
              reports.map(r => (
                <div
                  key={r.id}
                  onClick={() => handleViewReport(r.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReport?.id === r.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium text-sm">{r.name || 'Без названия'}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.object_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPeriod(r.start_month, r.start_year, r.end_month, r.end_year)}
                  </div>
                  <div className="text-sm font-semibold mt-1">
                    {formatMoney(r.total_amount)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Детали отчета */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <CardTitle>
                  {selectedReport ? (selectedReport.name || 'Отчет') : 'Выберите отчет'}
                </CardTitle>
                {selectedReport && (
                  <CardDescription className="mt-1">
                    {selectedReport.object_name && (
                      <span><strong>Объект:</strong> {
                        objects.find(o => o.id === selectedReport.object_id)?.name || '—'
                      }<br /></span>
                    )}
                    <strong>Период:</strong> {formatPeriod(
                      selectedReport.start_month, selectedReport.start_year,
                      selectedReport.end_month, selectedReport.end_year
                    )}
                    <br />
                    <strong>Итого:</strong> {formatMoney(selectedReport.total_amount)}
                    {' '}• {selectedReport.items.length} услуг
                  </CardDescription>
                )}
              </div>
              {selectedReport && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(reportsApi.exportExcel(selectedReport.id), '_blank')}
                  >
                    📊 Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(reportsApi.exportPdf(selectedReport.id), '_blank')}
                  >
                    📄 PDF
                  </Button>
                  {/* 🎯 Кнопки редактирования и удаления только для admin, economist, master */}
                  <CanAccess roles={['admin', 'economist', 'master']}>
                    <Button variant="outline" size="sm" onClick={handleOpenEdit}>
                      ✏️ Редактировать
                    </Button>
                  </CanAccess>
                  <CanAccess roles={['admin', 'economist', 'master']}>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                      🗑️ Удалить
                    </Button>
                  </CanAccess>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedReport ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Позиции отчета</h3>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>№</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead>Услуга</TableHead>
                        <TableHead>Ед.изм.</TableHead>
                        <TableHead>Периодичность</TableHead>
                        <TableHead className="text-right">Кол-во актов</TableHead>
                        <TableHead className="text-right">Объем</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReport.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                            За период не найдено ни одного акта. Создайте акты в разделе "Акты".
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedReport.items.map((item, idx) => (
                          <TableRow key={item.id}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                {item.category_name || 'Без категории'}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{item.service_name}</TableCell>
                            <TableCell>
                              <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">
                                {item.unit_symbol}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.frequency ? (
                                <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">
                                  {item.frequency}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{item.acts_count}</TableCell>
                            <TableCell className="text-right">{formatNumber(item.total_quantity)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatMoney(item.total_amount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                      {selectedReport.items.length > 0 && (
                        <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
                          <TableCell colSpan={7} className="text-right">ИТОГО:</TableCell>
                          <TableCell className="text-right text-lg">{formatMoney(selectedReport.total_amount)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Выберите отчет из списка слева или создайте новый.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 🎯 Диалог создания отчета — только для admin, economist, master */}
      <CanAccess roles={['admin', 'economist', 'master']}>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Создать отчет по объекту</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Объект *</Label>
                <Select value={formData.object_id} onValueChange={(v) => setFormData({...formData, object_id: v})} required>
                  <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                  <SelectContent>
                    {objects.map(o => (
                      <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Месяц начала *</Label>
                  <Select value={formData.start_month} onValueChange={(v) => setFormData({...formData, start_month: v})} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Год начала *</Label>
                  <Input type="number" value={formData.start_year}
                         onChange={(e) => setFormData({...formData, start_year: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Месяц конца *</Label>
                  <Select value={formData.end_month} onValueChange={(v) => setFormData({...formData, end_month: v})} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Год конца *</Label>
                  <Input type="number" value={formData.end_year}
                         onChange={(e) => setFormData({...formData, end_year: e.target.value})} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Название отчета (необязательно)</Label>
                <Input value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                       placeholder="Например: Отчет за 1 полугодие 2026" />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>💡 Как это работает:</strong> Система найдет все акты выбранного объекта
                за указанный период и агрегирует данные по услугам.
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">Создать отчет</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>

      {/* 🎯 Диалог редактирования отчета — только для admin, economist, master */}
      <CanAccess roles={['admin', 'economist', 'master']}>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Редактировать отчет</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Месяц начала *</Label>
                  <Select value={editData.start_month} onValueChange={(v) => setEditData({...editData, start_month: v})} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Год начала *</Label>
                  <Input type="number" value={editData.start_year}
                         onChange={(e) => setEditData({...editData, start_year: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Месяц конца *</Label>
                  <Select value={editData.end_month} onValueChange={(v) => setEditData({...editData, end_month: v})} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, i) => (
                        <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Год конца *</Label>
                  <Input type="number" value={editData.end_year}
                         onChange={(e) => setEditData({...editData, end_year: e.target.value})} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Название отчета</Label>
                <Input value={editData.name}
                       onChange={(e) => setEditData({...editData, name: e.target.value})} />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>⚠️ Внимание:</strong> При изменении периода данные отчета будут пересчитаны
                на основе актов за новый период.
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="flex-1">Сохранить и пересчитать</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}