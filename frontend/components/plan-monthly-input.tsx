// frontend/components/plan-monthly-input.tsx
'use client';

import { useState, useEffect } from 'react';
import { ServiceData, plansApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MonthlyInputData {
  month: number;
  year: number;
  quantity: string;
  unit_price: string;
}

interface PlanMonthlyInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceData[];
  periodMonths: { month: number; year: number; label: string }[];
  planId: number;
  onSubmit: (data: any) => void;
  initialData: {
    service_type_id: number;
    description: string | null;
    frequency: string | null;
    monthly: MonthlyInputData[];
  } | null;
}

export function PlanMonthlyInput({ 
  open, onOpenChange, services, periodMonths, planId, onSubmit, initialData 
}: PlanMonthlyInputProps) {
  const [serviceId, setServiceId] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [monthlyData, setMonthlyData] = useState<Record<string, { quantity: string; unit_price: string }>>({});
  const [loadingRates, setLoadingRates] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setServiceId(initialData.service_type_id.toString());
        setFrequency(initialData.frequency || '');
        setDescription(initialData.description || '');
        const dataMap: Record<string, { quantity: string; unit_price: string }> = {};
        initialData.monthly.forEach(m => {
          dataMap[`${m.month}-${m.year}`] = { 
            quantity: m.quantity === '0' ? '' : m.quantity, 
            unit_price: m.unit_price 
          };
        });
        setMonthlyData(dataMap);
      } else {
        setServiceId('');
        setFrequency('');
        setDescription('');
        setMonthlyData({});
      }
    }
  }, [open, initialData]);

  useEffect(() => {
    if (open && serviceId && !initialData) {
      setLoadingRates(true);
      plansApi.getServiceRates(planId, parseInt(serviceId))
        .then(rates => {
          const newData: Record<string, { quantity: string; unit_price: string }> = {};
          rates.forEach((r: any) => {
            const key = `${r.month}-${r.year}`;
            newData[key] = { quantity: '', unit_price: r.unit_price };
          });
          setMonthlyData(newData);
        })
        .catch(err => console.error('Ошибка загрузки расценок:', err))
        .finally(() => setLoadingRates(false));
    }
  }, [open, serviceId, initialData, planId]);

  const handleMonthChange = (month: number, year: number, field: 'quantity' | 'unit_price', value: string) => {
    const key = `${month}-${year}`;
    setMonthlyData(prev => ({
      ...prev,
      [key]: {
        quantity: prev[key]?.quantity || '',
        unit_price: prev[key]?.unit_price || '0',
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleFillAll = () => {
    if (periodMonths.length === 0) return;
    const firstKey = `${periodMonths[0].month}-${periodMonths[0].year}`;
    const firstQty = monthlyData[firstKey]?.quantity || '';
    
    const newData = { ...monthlyData };
    periodMonths.forEach(pm => {
      const key = `${pm.month}-${pm.year}`;
      newData[key] = { ...newData[key], quantity: firstQty };
    });
    setMonthlyData(newData);
  };

  const handleClearAll = () => {
    const newData = { ...monthlyData };
    periodMonths.forEach(pm => {
      const key = `${pm.month}-${pm.year}`;
      newData[key] = { ...newData[key], quantity: '' };
    });
    setMonthlyData(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedMonthly = periodMonths.map(pm => {
      const key = `${pm.month}-${pm.year}`;
      const data = monthlyData[key] || { quantity: '0', unit_price: '0' };
      return {
        month: pm.month,
        year: pm.year,
        quantity: parseFloat(data.quantity) || 0,
        unit_price: parseFloat(data.unit_price) || 0
      };
    });

    onSubmit({
      service_type_id: parseInt(serviceId),
      frequency: frequency || null,
      description: description || null,
      monthly_data: formattedMonthly
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 🎯 ИЗМЕНЕНО: 50% ширины экрана через inline стили */}
      <DialogContent 
        className="max-h-[90vh] overflow-y-auto p-6"
        style={{ maxWidth: '50vw', width: '50vw' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{initialData ? 'Редактировать услугу' : 'Добавить услугу в план'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Верхние поля: в 2 колонки, чтобы помещались при 50vw */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Услуга *</Label>
              <Select value={serviceId} onValueChange={setServiceId} required>
                <SelectTrigger className="h-10"><SelectValue placeholder="Выберите услугу" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.unit?.symbol})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Периодичность</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Не указана" /></SelectTrigger>
                <SelectContent>
                  {['ежедневно', 'еженедельно', 'ежемесячно', 'раз в квартал', 'по заявке', 'по графику'].map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Примечание</Label>
            <Input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Необязательно" 
              className="h-10"
            />
          </div>

          {/* Кнопки управления количеством */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Label className="text-base font-semibold">Помесячные данные</Label>
            {!initialData && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleFillAll}>
                  📋 Как в 1-м мес.
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearAll} className="text-destructive hover:text-destructive">
                  🗑️ Очистить
                </Button>
              </div>
            )}
          </div>

          {/* Таблица с помесячными данными */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Месяц</TableHead>
                  <TableHead className="text-right">Количество</TableHead>
                  <TableHead className="text-right">Цена за ед. (₽)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRates ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Загрузка расценок...
                    </TableCell>
                  </TableRow>
                ) : (
                  periodMonths.map(pm => {
                    const key = `${pm.month}-${pm.year}`;
                    const data = monthlyData[key] || { quantity: '', unit_price: '0' };
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium py-3">{pm.label}</TableCell>
                        <TableCell className="py-3">
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            className="text-right h-9"
                            placeholder="0"
                            value={data.quantity} 
                            onChange={(e) => handleMonthChange(pm.month, pm.year, 'quantity', e.target.value)} 
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            className="text-right h-9 bg-muted/30"
                            placeholder="0.00"
                            value={data.unit_price} 
                            onChange={(e) => handleMonthChange(pm.month, pm.year, 'unit_price', e.target.value)} 
                            required 
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10">
              Отмена
            </Button>
            <Button type="submit" disabled={!serviceId} className="h-10">
              {initialData ? 'Сохранить изменения' : 'Добавить в план'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}