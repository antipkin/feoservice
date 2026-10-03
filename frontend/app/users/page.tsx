// frontend/app/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi, UserResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanAccess } from '@/lib/rbac';

const ROLES = [
  { value: 'admin', label: '👑 Администратор' },
  { value: 'economist', label: '📊 Экономист' },
  { value: 'master', label: '🔧 Мастер участка' },
  { value: 'viewer', label: '👁️ Наблюдатель' },
];

export default function UsersPage() {
  // 🎯 ШАГ 1: ВСЕ ХУКИ В САМОМ НАЧАЛЕ
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    role: 'viewer',
    password: '',
    is_active: true,
  });

  // 🎯 ШАГ 2: USE EFFECT ПОСЛЕ ВСЕХ useState
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  // 🎯 ШАГ 3: ФУНКЦИИ-ОБРАБОТЧИКИ
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (e) {
      console.error('Ошибка загрузки пользователей:', e);
    }
    setLoading(false);
  };

  const handleOpenDialog = (u?: UserResponse) => {
    if (u) {
      setEditingUser(u);
      setFormData({
        email: u.email,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        password: '',
        is_active: u.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        username: '',
        full_name: '',
        role: 'viewer',
        password: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.password && editingUser) {
        delete (payload as any).password;
      }

      if (editingUser) {
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create(payload);
      }
      setDialogOpen(false);
      await loadUsers();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    try {
      await usersApi.delete(id);
      await loadUsers();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  // 🎯 ШАГ 4: УСЛОВНЫЕ ВОЗВРАТЫ ТОЛЬКО ПОСЛЕ ВСЕХ ХУКОВ
  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="text-lg text-muted-foreground">Проверка прав доступа...</div>
      </div>
    );
  }

  // 🎯 ШАГ 5: ОСНОВНОЙ РЕНДЕР
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">👥 Управление пользователями</h1>
        <CanAccess roles={['admin']}>
          <Button onClick={() => handleOpenDialog()}>＋ Добавить пользователя</Button>
        </CanAccess>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список пользователей ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Полное имя</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <CanAccess roles={['admin']}>
                      <TableHead className="text-right">Действия</TableHead>
                    </CanAccess>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                        Нет пользователей
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>{u.full_name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            u.role === 'economist' ? 'bg-blue-100 text-blue-800' :
                            u.role === 'master' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ROLES.find(r => r.value === u.role)?.label || u.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold ${u.is_active ? 'text-green-600' : 'text-red-600'}`}>
                            {u.is_active ? 'Активен' : 'Заблокирован'}
                          </span>
                        </TableCell>
                        <CanAccess roles={['admin']}>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(u)}>✏️</Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(u.id)}
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

      <CanAccess roles={['admin']}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    placeholder="ivanov"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Роль *</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Полное имя *</Label>
                <Input
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Иванов Иван Иванович"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="ivanov@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{editingUser ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль *'}</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder={editingUser ? 'Не менять' : 'Минимум 6 символов'}
                  required={!editingUser}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_active" className="cursor-pointer text-sm font-normal">
                  Активный пользователь
                </Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button type="submit">{editingUser ? 'Сохранить' : 'Создать'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CanAccess>
    </div>
  );
}