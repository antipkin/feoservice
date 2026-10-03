// frontend/app/audit/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditLog {
  id: number;
  username: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  created_at: string;
}

interface AuditStats {
  total: number;
  by_action: Record<string, number>;
  by_resource_type: Record<string, number>;
  by_user: { username: string; count: number }[];
}

interface AuditUser {
  id: number;
  username: string;
}

const ACTION_OPTIONS = [
  { value: 'all', label: 'Все действия' },
  { value: 'CREATE', label: '🟢 Создание' },
  { value: 'UPDATE', label: '🔵 Изменение' },
  { value: 'DELETE', label: '🔴 Удаление' },
];

const RESOURCE_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  { value: 'OBJECT', label: '🏢 Объекты' },
  { value: 'USER', label: '👥 Пользователи' },
  { value: 'SERVICE_TYPE', label: '🔧 Услуги' },
  { value: 'SERVICE_RATE', label: '💰 Расценки на услуги' },
  { value: 'SERVICE_CATEGORY', label: '📂 Категории' },
  { value: 'UNIT', label: '📏 Ед. измерения' },
  { value: 'RESOURCE', label: '📦 Ресурсы' },
  { value: 'RESOURCE_RATE', label: '💵 Расценки на ресурсы' },
  { value: 'RESOURCE_NORM', label: '📊 Нормативы' },
  { value: 'PRICING_SETTINGS', label: '⚙️ Настройки расчёта' },
  { value: 'PLAN', label: '📋 Планы' },
  { value: 'PLAN_ITEM', label: '📝 Позиции планов' },
  { value: 'FACT', label: '📑 Факты' },
  { value: 'FACT_ITEM', label: '📄 Позиции фактов' },
  { value: 'ACT', label: '📃 Акты' },
  { value: 'REPORT', label: '📈 Отчёты' },
];

const PAGE_SIZE = 50;

export default function AuditPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Фильтры
  const [filterAction, setFilterAction] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const buildQueryString = useCallback((currentOffset: number) => {
    const params = new URLSearchParams();
    params.set('limit', PAGE_SIZE.toString());
    params.set('offset', currentOffset.toString());
    if (filterAction !== 'all') params.set('action', filterAction);
    if (filterResource !== 'all') params.set('resource_type', filterResource);
    if (filterUser !== 'all') params.set('user_id', filterUser);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    return params.toString();
  }, [filterAction, filterResource, filterUser, searchQuery, dateFrom, dateTo]);

  const loadLogs = useCallback(async (reset = true) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await fetchAPI(`/audit?${buildQueryString(currentOffset)}`);
      if (reset) {
        setLogs(data);
      } else {
        setLogs(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
      setOffset(currentOffset + data.length);
    } catch (e) {
      console.error('Ошибка загрузки логов:', e);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [offset, buildQueryString]);

  const loadStats = async () => {
    try {
      const data = await fetchAPI('/audit/stats');
      setStats(data);
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchAPI('/audit/users');
      setUsers(data);
    } catch (e) {
      console.error('Ошибка загрузки пользователей:', e);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadLogs(true);
      loadStats();
      loadUsers();
    }
  }, [user]);

  // Перезагрузка при изменении фильтров
  useEffect(() => {
    if (user?.role === 'admin') {
      loadLogs(true);
    }
  }, [filterAction, filterResource, filterUser, dateFrom, dateTo]);

  const handleSearch = () => {
    loadLogs(true);
  };

  const handleResetFilters = () => {
    setFilterAction('all');
    setFilterResource('all');
    setFilterUser('all');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
    };
    return styles[action] || 'bg-gray-100 text-gray-800';
  };

  const getResourceLabel = (type: string) => {
    const found = RESOURCE_OPTIONS.find(o => o.value === type);
    return found ? found.label : type;
  };

  const formatJson = (data: any) => {
    if (!data) return '—';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="text-lg text-muted-foreground">Проверка прав...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">🛡️ Журнал аудита</h1>
        <Button onClick={() => { loadLogs(true); loadStats(); }} variant="outline">
          🔄 Обновить
        </Button>
      </div>

      {/* 📊 Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Всего записей</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Созданий</div>
              <div className="text-2xl font-bold text-green-600">{stats.by_action['CREATE'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Изменений</div>
              <div className="text-2xl font-bold text-blue-600">{stats.by_action['UPDATE'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Удалений</div>
              <div className="text-2xl font-bold text-red-600">{stats.by_action['DELETE'] || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 🔍 Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔍 Фильтры и поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Действие</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Тип ресурса</Label>
              <Select value={filterResource} onValueChange={setFilterResource}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Пользователь</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все пользователи</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Дата от</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Дата до</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Поиск</Label>
              <div className="flex gap-1">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Текст..."
                  className="h-9"
                />
                <Button size="sm" onClick={handleSearch} className="h-9 px-3">🔍</Button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Показано: <strong>{logs.length}</strong> записей
            </p>
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              ✕ Сбросить фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 📋 Таблица логов */}
      <Card>
        <CardHeader>
          <CardTitle>История изменений</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8">Загрузка...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Записей не найдено. Попробуйте изменить фильтры.
            </p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Время</TableHead>
                      <TableHead className="w-[100px]">Пользователь</TableHead>
                      <TableHead className="w-[100px]">Действие</TableHead>
                      <TableHead className="w-[160px]">Тип ресурса</TableHead>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead className="w-[100px]">IP</TableHead>
                      <TableHead>Детали</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{log.username}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getActionBadge(log.action)}`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{getResourceLabel(log.resource_type)}</TableCell>
                        <TableCell className="text-muted-foreground">{log.resource_id || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{log.ip_address || '—'}</TableCell>
                        <TableCell className="max-w-md">
                          {log.action === 'UPDATE' ? (
                            <details className="group">
                              <summary className="cursor-pointer text-primary text-xs font-medium hover:underline">
                                Показать изменения
                              </summary>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-xs font-semibold text-red-600 mb-1">Было:</div>
                                  <pre className="p-2 bg-red-50 border border-red-200 rounded text-xs overflow-x-auto max-h-40">
                                    {formatJson(log.old_values)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-green-600 mb-1">Стало:</div>
                                  <pre className="p-2 bg-green-50 border border-green-200 rounded text-xs overflow-x-auto max-h-40">
                                    {formatJson(log.new_values)}
                                  </pre>
                                </div>
                              </div>
                            </details>
                          ) : (
                            <details className="group">
                              <summary className="cursor-pointer text-primary text-xs font-medium hover:underline">
                                Показать детали
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-40">
                                {formatJson(log.new_values || log.old_values)}
                              </pre>
                            </details>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Кнопка "Загрузить ещё" */}
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => loadLogs(false)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Загрузка...' : `Загрузить ещё (по ${PAGE_SIZE})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}