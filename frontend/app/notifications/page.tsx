// frontend/app/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, NotificationData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  { value: 'status_change', label: '🔄 Смена статуса' },
  { value: 'approval_request', label: '📨 Запрос на согласование' },
  { value: 'approved', label: '✅ Утверждено' },
  { value: 'rejected', label: '↩️ Возврат на доработку' },
  { value: 'signed', label: '🖋️ Подписано' },
  { value: 'new_fact', label: '📑 Новый факт' },
  { value: 'new_act', label: '📃 Новый акт' },
  { value: 'new_plan', label: '📋 Новый план' },
  { value: 'deviation_alert', label: '⚠️ Отклонение' },
];

const TYPE_ICONS: Record<string, string> = {
  status_change: '🔄',
  approval_request: '📨',
  approved: '✅',
  rejected: '↩️',
  signed: '🖋️',
  new_fact: '📑',
  new_act: '📃',
  new_plan: '📋',
  deviation_alert: '⚠️',
  system: 'ℹ️',
};

const RESOURCE_LINKS: Record<string, string> = {
  PLAN: '/plans',
  FACT: '/facts',
  ACT: '/acts',
  REPORT: '/reports',
};

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.getAll({
        unread_only: showUnreadOnly,
        type: filterType !== 'all' ? filterType : undefined,
        limit: 100,
      });
      setNotifications(data);
    } catch (e) {
      console.error('Ошибка:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadNotifications();
  }, [user, filterType, showUnreadOnly]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error('Ошибка:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('Ошибка:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить уведомление?')) return;
    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('Ошибка:', e);
    }
  };

  const handleNavigate = (notification: NotificationData) => {
    if (notification.resource_type && notification.resource_id) {
      const baseUrl = RESOURCE_LINKS[notification.resource_type];
      if (baseUrl) {
        router.push(baseUrl);
      }
    }
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading || !user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="text-lg text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🔔 Уведомления</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Всего: {notifications.length} • Непрочитанных: {unreadCount}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
            ✓ Прочитать все
          </Button>
          <Button variant="outline" onClick={loadNotifications}>
            🔄 Обновить
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Тип уведомления</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Показывать</Label>
              <Select value={showUnreadOnly ? 'unread' : 'all'} onValueChange={(v) => setShowUnreadOnly(v === 'unread')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уведомления</SelectItem>
                  <SelectItem value="unread">Только непрочитанные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список уведомлений */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔕</div>
              <p className="text-muted-foreground">Уведомлений нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    !notification.is_read
                      ? 'bg-primary/5 border-primary/30 hover:bg-primary/10'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="text-3xl flex-shrink-0">
                      {TYPE_ICONS[notification.type] || 'ℹ️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{formatDateTime(notification.created_at)}</span>
                            {notification.is_read && notification.read_at && (
                              <span>✓ Прочитано {formatDateTime(notification.read_at)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {!notification.is_read && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(notification.id)}>
                              ✓ Прочитано
                            </Button>
                          )}
                          {notification.resource_type && (
                            <Button size="sm" variant="outline" onClick={() => handleNavigate(notification)}>
                              Открыть →
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(notification.id)} className="text-destructive hover:text-destructive">
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}