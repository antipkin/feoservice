// frontend/components/notification-bell.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi, NotificationData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загрузка счётчика непрочитанных
  const loadUnreadCount = async () => {
    try {
      const data = await notificationsApi.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch (e) {
      console.error('Ошибка загрузки счётчика:', e);
    }
  };

  // Загрузка последних уведомлений
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.getAll({ limit: 10 });
      setNotifications(data);
    } catch (e) {
      console.error('Ошибка загрузки уведомлений:', e);
    }
    setLoading(false);
  };

  // Первоначальная загрузка
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Периодическое обновление счётчика (каждые 30 секунд)
  useEffect(() => {
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = async () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      await loadNotifications();
    }
  };

  const handleMarkAsRead = async (notification: NotificationData) => {
    try {
      await notificationsApi.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Переход к ресурсу, если есть
      if (notification.resource_type && notification.resource_id) {
        const baseUrl = RESOURCE_LINKS[notification.resource_type];
        if (baseUrl) {
          router.push(baseUrl);
          setIsOpen(false);
        }
      }
    } catch (e) {
      console.error('Ошибка отметки:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Ошибка:', e);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Колокольчик */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="relative h-10 w-10"
        title="Уведомления"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 z-50 shadow-lg">
          <Card className="border-border">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Уведомления</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
                    ✓ Прочитать все
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    router.push('/notifications');
                    setIsOpen(false);
                  }}
                  className="text-xs"
                >
                  Все →
                </Button>
              </div>
            </div>
            <ScrollArea className="max-h-[500px]">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Загрузка...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <div className="text-4xl mb-2">🔕</div>
                    Уведомлений нет
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => handleMarkAsRead(notification)}
                      className={`p-3 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                        !notification.is_read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="text-2xl flex-shrink-0">
                          {TYPE_ICONS[notification.type] || 'ℹ️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className={`text-sm font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </div>
                            {!notification.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(notification.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}