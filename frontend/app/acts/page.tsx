// frontend/app/acts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { actsApi, factsApi, objectsApi, servicesApi, ActData, FactHeaderData, ObjectData, ServiceData } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function ActsPage() {
  const [acts, setActs] = useState<ActData[]>([]);
  const [facts, setFacts] = useState<FactHeaderData[]>([]);
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [selectedAct, setSelectedAct] = useState<ActData | null>(null);
  const [loading, setLoading] = useState(true);

  // Состояние для диалога создания акта
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFactId, setSelectedFactId] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [actsData, factsData, objsData, svcsData] = await Promise.all([
          actsApi.getAll(),
          factsApi.getAll(),
          objectsApi.getAll(),
          servicesApi.getAll(),
        ]);
        setActs(actsData);
        setFacts(factsData);
        setObjects(objsData);
        setServices(svcsData);
      } catch (e) { console.error('Ошибка загрузки:', e); }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleCreateAct = async () => {
    if (!selectedFactId) {
      alert('Выберите факт');
      return;
    }
    try {
      const newAct = await actsApi.createFromFact(parseInt(selectedFactId));
      setActs([newAct, ...acts]);
      setCreateDialogOpen(false);
      setSelectedFactId('');
      setSelectedAct(newAct);
      alert(`Акт ${newAct.act_number} успешно создан!`);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDeleteAct = async (actId: number) => {
    if (!window.confirm('Удалить этот акт?')) return;
    try {
      await actsApi.delete(actId);
      setActs(acts.filter(a => a.id !== actId));
      if (selectedAct?.id === actId) setSelectedAct(null);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleViewAct = async (actId: number) => {
    try {
      const act = await actsApi.get(actId);
      setSelectedAct(act);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const formatMoney = (val: string | number) =>
    new Number(val).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU');
  };

  // Факты, для которых ещё нет актов
  const availableFacts = facts.filter(f => !acts.some(a => a.fact_header_id === f.id));

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Акты выполненных работ</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>＋ Сформировать акт</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список актов */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Список актов ({acts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {acts.length === 0 && <p className="text-sm text-muted-foreground">Актов пока нет</p>}
            {acts.map(act => (
              <div
                key={act.id}
                onClick={() => handleViewAct(act.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAct?.id === act.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium">{act.act_number}</div>
                <div className="text-sm text-muted-foreground">
                  от {formatDate(act.act_date)} • {formatMoney(act.total_amount)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Детали акта */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{selectedAct ? selectedAct.act_number : 'Выберите акт'}</CardTitle>
                {selectedAct && (
                  <div className="text-sm text-muted-foreground mt-1">
                    от {formatDate(selectedAct.act_date)} • Статус: {selectedAct.status}
                  </div>
                )}
              </div>
              {selectedAct && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(actsApi.exportPdf(selectedAct.id), '_blank')}
                  >
                    📄 PDF
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAct(selectedAct.id)}
                  >
                    🗑️ Удалить
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedAct ? (
              <>
                <h3 className="text-lg font-semibold mb-4">Позиции акта</h3>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>№</TableHead>
                        <TableHead>Услуга</TableHead>
                        <TableHead>Ед. изм.</TableHead>
                        <TableHead>Периодичность</TableHead>
                        <TableHead className="text-right">Кол-во</TableHead>
                        <TableHead className="text-right">Цена</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAct.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                            Нет позиций
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedAct.items.map((item, idx) => {
                          const svc = services.find(s => s.id === item.service_type_id);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell className="font-medium">{svc?.name || '—'}</TableCell>
                              <TableCell>{svc?.unit?.symbol || '—'}</TableCell>
                              <TableCell>
                                {item.frequency ? (
                                  <span className="inline-block px-2 py-1 rounded bg-background text-xs font-semibold">
                                    {item.frequency}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">{Number(item.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">{formatMoney(item.unit_price)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(item.total_amount || 0)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                      <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
                        <TableCell colSpan={6} className="text-right">ИТОГО:</TableCell>
                        <TableCell className="text-right text-lg">{formatMoney(selectedAct.total_amount)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Выберите акт из списка слева или сформируйте новый.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Диалог создания акта */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сформировать акт из факта</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              Акт будет автоматически сформирован на основе выбранного факта.
              В акт войдут все позиции факта с указанием периодичности из справочника услуг.
            </div>
            <div className="space-y-2">
              <Label>Выберите факт *</Label>
              <Select value={selectedFactId} onValueChange={setSelectedFactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите факт" />
                </SelectTrigger>
                <SelectContent>
                  {availableFacts.length === 0 ? (
                    <SelectItem value="none" disabled>Нет доступных фактов</SelectItem>
                  ) : (
                    availableFacts.map(f => {
                      const obj = objects.find(o => o.id === f.object_id);
                      return (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {obj?.name || '—'} • {MONTH_NAMES[f.month - 1]} {f.year}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="button" className="flex-1" onClick={handleCreateAct} disabled={!selectedFactId}>
                📄 Сформировать акт
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}