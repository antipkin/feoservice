// frontend/app/plans/import/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { importApi, objectsApi, ImportPreview, ObjectData } from '@/lib/api';
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

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                     'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function ImportPlanPage() {
  const router = useRouter();
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const [formData, setFormData] = useState({
    object_id: '',
    start_month: '1',
    start_year: new Date().getFullYear().toString(),
  });
  const [file, setFile] = useState<File | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    objectsApi.getAll().then(setObjects).catch(e => console.error('Ошибка загрузки объектов:', e));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file || !formData.object_id || !formData.start_month || !formData.start_year) {
      alert('Заполните все поля и выберите файл');
      return;
    }

    setLoading(true);
    try {
      const result = await importApi.preview(
        file,
        parseInt(formData.object_id),
        parseInt(formData.start_month),
        parseInt(formData.start_year)
      );
      setPreview(result);
      // По умолчанию выбираем все сопоставленные услуги
      const matched = new Set(result.services
        .filter(s => s.match_status === 'matched')
        .map(s => s.row_number));
      setSelectedRows(matched);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!preview || selectedRows.size === 0) {
      alert('Выберите хотя бы одну услугу для импорта');
      return;
    }

    setLoading(true);
    try {
      const result = await importApi.confirm({
        preview_data: preview,
        selected_services: Array.from(selectedRows),
      });
      alert(result.message);
      router.push('/plans');
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
    setLoading(false);
  };

  const toggleRow = (rowNumber: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (!preview) return;
    const matched = preview.services
      .filter(s => s.match_status === 'matched')
      .map(s => s.row_number);

    if (selectedRows.size === matched.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(matched));
    }
  };

  const formatNumber = (val: number) => 
    val.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">📥 Импорт плана из Excel</h1>
        <p className="text-muted-foreground mt-2">
          Загрузите Excel-файл с планом. Система автоматически сопоставит услуги со справочником.
        </p>
      </div>

      {/* Форма загрузки */}
      <Card>
        <CardHeader>
          <CardTitle>1. Параметры импорта</CardTitle>
          <CardDescription>
            Выберите объект, период начала плана и Excel-файл для загрузки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Объект *</Label>
              <Select value={formData.object_id} onValueChange={(v) => setFormData({...formData, object_id: v})}>
                <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                <SelectContent>
                  {objects.map(o => (
                    <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Месяц начала *</Label>
              <Select value={formData.start_month} onValueChange={(v) => setFormData({...formData, start_month: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Год *</Label>
              <Input type="number" value={formData.start_year}
                     onChange={(e) => setFormData({...formData, start_year: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Excel-файл (.xlsx) *</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange}
                     className="h-10 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
            </div>
          </div>
          <Button className="mt-4" onClick={handlePreview} disabled={loading || !file || !formData.object_id}>
            {loading ? 'Загрузка...' : '🔍 Предпросмотр'}
          </Button>
        </CardContent>
      </Card>

      {/* Предпросмотр */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>2. Предпросмотр импорта</CardTitle>
            <CardDescription>
              Файл: <strong>{preview.file_name}</strong> • 
              План: <strong>{preview.plan_name}</strong> • 
              Объект: <strong>{preview.object_name}</strong> • 
              Период: {preview.period_months} мес. с {MONTH_NAMES[preview.start_month - 1]} {preview.start_year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preview.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-semibold text-amber-800 flex items-center gap-2">
                  <span>⚠️</span> Предупреждения:
                </div>
                <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                  {preview.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.size > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>№</TableHead>
                    <TableHead>Услуга</TableHead>
                    <TableHead>Код</TableHead>
                    <TableHead>Ед.изм.</TableHead>
                    <TableHead>Статус</TableHead>
                    {preview.services[0]?.monthly_quantities.map((_, idx) => {
                      const m = preview.start_month + idx;
                      const y = preview.start_year + Math.floor((preview.start_month + idx - 1) / 12);
                      const monthIdx = ((m - 1) % 12);
                      return (
                        <TableHead key={idx} className="text-right min-w-[80px]">
                          {MONTH_NAMES[monthIdx].substring(0, 3)} {y}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground h-24">
                        В файле не найдено данных услуг
                      </TableCell>
                    </TableRow>
                  ) : (
                    preview.services.map(svc => {
                      const isSelected = selectedRows.has(svc.row_number);
                      const isMatched = svc.match_status === 'matched';
                      const statusColor = isMatched
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800';
                      const statusText = isMatched ? '✓ Найден' : '✗ Не найден';

                      return (
                        <TableRow 
                          key={svc.row_number} 
                          className={isSelected ? 'bg-blue-50' : ''}
                        >
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(svc.row_number)}
                              disabled={!isMatched}
                              className="w-4 h-4 rounded border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{svc.row_number}</TableCell>
                          <TableCell className="font-medium">{svc.service_name}</TableCell>
                          <TableCell className="text-muted-foreground">{svc.service_code || '—'}</TableCell>
                          <TableCell>{svc.unit_symbol}</TableCell>
                          <TableCell>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                              {statusText}
                            </span>
                          </TableCell>
                          {svc.monthly_quantities.map((qty, idx) => (
                            <TableCell key={idx} className="text-right text-sm">
                              {qty > 0 ? formatNumber(qty) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Выбрано: <strong>{selectedRows.size}</strong> из {preview.services.filter(s => s.match_status === 'matched').length} сопоставленных услуг
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Отмена</Button>
                <Button onClick={handleConfirm} disabled={loading || selectedRows.size === 0}>
                  {loading ? 'Импорт...' : `✓ Импортировать (${selectedRows.size} услуг)`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}