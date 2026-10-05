// frontend/components/status-transition.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StatusTransitionProps {
  documentType: 'fact' | 'act' | 'plan';
  documentId: number;
  currentStatus: string;
  onTransitionComplete: () => void;
}

interface AvailableTransitions {
  document_id: number;
  current_status: string;
  status_label: string;
  available_transitions: string[];
  can_edit: boolean;
}

// 🎯 Все ключи в ВЕРХНЕМ регистре — совпадает с бэкендом
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
  CREATED: 'bg-gray-100 text-gray-800 border-gray-300', // обратная совместимость
  SUBMITTED: 'bg-amber-100 text-amber-800 border-amber-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  SIGNED: 'bg-blue-100 text-blue-800 border-blue-300',
  ARCHIVED: 'bg-slate-100 text-slate-800 border-slate-300',
};

// 🎯 Все ключи в ВЕРХНЕМ регистре
const TRANSITION_BUTTONS: Record<string, { label: string; variant: 'default' | 'outline' | 'destructive' }> = {
  SUBMITTED: { label: '⏳ На согласование', variant: 'default' },
  DRAFT: { label: '↩️ Вернуть в черновик', variant: 'outline' },
  APPROVED: { label: '✅ Утвердить', variant: 'default' },
  SIGNED: { label: '🖋️ Подписать', variant: 'default' },
  ARCHIVED: { label: '📦 В архив', variant: 'outline' },
};

export function StatusTransition({
  documentType,
  documentId,
  currentStatus,
  onTransitionComplete,
}: StatusTransitionProps) {
  const [available, setAvailable] = useState<AvailableTransitions | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // 🎯 Приводим текущий статус к верхнему регистру для корректного отображения цветов
  const statusUpper = (currentStatus || 'DRAFT').toUpperCase();

  const endpoint = documentType === 'fact' ? 'facts' : documentType === 'act' ? 'acts' : 'plans';

  useEffect(() => {
    loadAvailableTransitions();
  }, [documentId, currentStatus]);

  const loadAvailableTransitions = async () => {
    try {
      const data = await fetchAPI(`/${endpoint}/${documentId}/available-transitions`);
      setAvailable(data);
    } catch (e) {
      console.error('Ошибка загрузки переходов:', e);
    }
  };

  const handleTransition = async () => {
    if (!selectedStatus) return;
    setLoading(true);
    try {
      await fetchAPI(`/${endpoint}/${documentId}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          new_status: selectedStatus.toUpperCase(), // 🎯 Отправляем в верхнем регистре
          comment: comment || null,
        }),
      });
      setDialogOpen(false);
      setComment('');
      setSelectedStatus('');
      await loadAvailableTransitions();
      onTransitionComplete();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
    setLoading(false);
  };

  if (!available) {
    return <span className="text-sm text-muted-foreground">Загрузка статуса...</span>;
  }

  // 🎯 Получаем цвет для текущего статуса (с fallback на DRAFT)
  const currentColor = STATUS_COLORS[statusUpper] || STATUS_COLORS.DRAFT;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Бейдж текущего статуса */}
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${currentColor}`}>
          {available.status_label}
        </span>

        {/* Кнопки доступных переходов */}
        {available.available_transitions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {available.available_transitions.map(status => {
              // 🎯 Приводим статус из ответа к верхнему регистру
              const statusKey = status.toUpperCase();
              const btn = TRANSITION_BUTTONS[statusKey];
              if (!btn) return null;
              return (
                <Button
                  key={statusKey}
                  variant={btn.variant}
                  size="sm"
                  onClick={() => {
                    setSelectedStatus(statusKey);
                    setDialogOpen(true);
                  }}
                >
                  {btn.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Диалог подтверждения */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Подтверждение смены статуса</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Текущий статус:</div>
              <div className="font-semibold">{available.status_label}</div>
              <div className="text-sm text-muted-foreground mt-2">Новый статус:</div>
              <div className="font-semibold">
                {TRANSITION_BUTTONS[selectedStatus]?.label || selectedStatus}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Комментарий (необязательно)</Label>
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: Проверено, замечаний нет"
              />
              <p className="text-xs text-muted-foreground">
                Комментарий будет сохранён в журнале аудита
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button className="flex-1" onClick={handleTransition} disabled={loading}>
                {loading ? 'Перевод...' : 'Подтвердить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}