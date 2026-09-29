// frontend/components/app-header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/', label: '🏠 Главная' },
  { href: '/dashboard', label: '📊 Дашборд' },
  { href: '/objects', label: '🏢 Объекты' },
  { href: '/services', label: '🔧 Услуги' },
  { href: '/service-categories', label: '📂 Категории' },
  { href: '/rates', label: '💰 Расценки' },
  { href: '/resources', label: '📦 Ресурсы' },
  { href: '/pricing-settings', label: '⚙️ Расчёт' },
  { href: '/cost-analysis', label: '📊 Анализ' },
  { href: '/plans', label: '📊 Планирование' },
  { href: '/facts', label: '📋 Ввод факта' },
  { href: '/acts', label: '📄 Акты' },
  { href: '/reports', label: '📑 Отчеты' },
  { href: '/help', label: '📚 Помощь' },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-primary">Дом</span>
          <span className="text-muted-foreground">Сервис</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2"
                >
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}