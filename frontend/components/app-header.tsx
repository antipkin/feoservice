// frontend/components/app-header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { canAccess, UserRole } from '@/lib/rbac';
import { NotificationBell } from '@/components/notification-bell';

const NAV_ITEMS = [
  { href: '/', label: '🏠 Главная', roles: ['admin', 'economist', 'master', 'viewer'] as UserRole[] },
  { href: '/dashboard', label: '📊 Дашборд', roles: ['admin', 'economist', 'master', 'viewer'] as UserRole[] },
  { href: '/objects', label: '🏢 Объекты', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/services', label: '🔧 Услуги', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/service-categories', label: '📂 Категории', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/units', label: '📏 Ед. изм.', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/resources', label: '📦 Ресурсы', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/rates', label: '💰 Расценки', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/pricing-settings', label: '⚙️ Расчёт', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/cost-analysis', label: '📈 Анализ', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/plans', label: '📋 Планы', roles: ['admin', 'economist'] as UserRole[] },
  { href: '/facts', label: '📝 Факт', roles: ['admin', 'economist', 'master'] as UserRole[] },
  { href: '/acts', label: '📄 Акты', roles: ['admin', 'economist', 'master', 'viewer'] as UserRole[] },
  { href: '/reports', label: '📑 Отчёты', roles: ['admin', 'economist', 'master', 'viewer'] as UserRole[] },
  { href: '/users', label: '👥 Пользователи', roles: ['admin'] as UserRole[] },
  { href: '/help', label: '📚 Помощь', roles: ['admin', 'economist', 'master', 'viewer'] as UserRole[] },
  { href: '/audit', label: '🛡️ Аудит', roles: ['admin'] as UserRole[] },
  { href: '/notifications', label: '🔔 Уведомления', roles: ['admin', 'economist', 'master', 'viewer'] as UserRole[]},
];

export default function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Админ';
      case 'economist': return 'Экономист';
      case 'master': return 'Мастер';
      case 'viewer': return 'Наблюдатель';
      default: return role;
    }
  };

  // Фильтруем меню: показываем только те пункты, которые разрешены текущей роли
  const visibleItems = user ? NAV_ITEMS.filter(item => canAccess(user.role as UserRole, item.roles)) : [];

  return (
    <header className="border-b bg-background sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary flex-shrink-0">
            🏢 ДомСервис
          </Link>
          
          <nav className="hidden md:flex flex-1 mx-6 overflow-x-auto items-center gap-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`nav::-webkit-scrollbar { display: none; }`}</style>
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  pathname === item.href ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <>
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium leading-tight">{user.full_name}</span>
                  <span className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</span>
                </div>
                <Button variant="outline" size="sm" onClick={logout} className="flex-shrink-0">🚪 Выйти</Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm" className="flex-shrink-0">🔐 Войти</Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? '✕' : '☰'}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-1 max-h-[80vh] overflow-y-auto bg-background">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}