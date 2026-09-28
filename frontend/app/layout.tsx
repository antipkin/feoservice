// frontend/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/app-header';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'ДомСервис — Управление обслуживанием МКД и паркингов',
  description: 'Комплексная система планирования тарифов, учёта выполненных работ и формирования актов для управляющих компаний',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <AppHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}