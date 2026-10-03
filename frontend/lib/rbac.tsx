// frontend/lib/rbac.ts
import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

export type UserRole = 'admin' | 'economist' | 'master' | 'viewer';

/**
 * Проверяет, есть ли у пользователя одна из разрешённых ролей.
 */
export const canAccess = (userRole: UserRole | undefined | null, allowedRoles: UserRole[]): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Компонент-обёртка для скрытия/показа элементов интерфейса.
 * 
 * Пример использования:
 * <CanAccess roles={['admin', 'economist']}>
 *   <Button>Удалить</Button>
 * </CanAccess>
 */
interface CanAccessProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode; // Что показывать, если доступ запрещён (по умолчанию ничего)
}

export function CanAccess({ roles, children, fallback = null }: CanAccessProps) {
  const { user, isLoading } = useAuth();

  // Пока загружается состояние авторизации, ничего не рендерим (или можно показать skeleton)
  if (isLoading) return null;

  if (canAccess(user?.role as UserRole, roles)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}