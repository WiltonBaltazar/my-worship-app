import {
  Bell,
  Calendar,
  CalendarOff,
  LayoutDashboard,
  Music,
  SlidersHorizontal,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminBadgeKey = 'notifications' | 'pendingUsers';

export interface AdminNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: AdminBadgeKey;
  /** The page follows the DMS/GHJ filter, so the top bar shows it. */
  ministryScoped?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Visão geral',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/admin-app', ministryScoped: true }],
  },
  {
    label: 'Escalas',
    items: [
      { icon: Calendar, label: 'Escalas', path: '/admin-app/schedules', ministryScoped: true },
      { icon: SlidersHorizontal, label: 'Escala Técnica', path: '/admin-app/tech-schedules' },
      { icon: CalendarOff, label: 'Indisponibilidades', path: '/admin-app/availability', ministryScoped: true },
    ],
  },
  {
    label: 'Pessoas',
    items: [
      { icon: Users, label: 'Membros', path: '/admin-app/members', ministryScoped: true },
      { icon: UserCog, label: 'Usuários', path: '/admin-app/users', badge: 'pendingUsers' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [{ icon: Music, label: 'Repertório', path: '/admin-app/repertoire' }],
  },
  {
    label: 'Comunicação',
    items: [{ icon: Bell, label: 'Notificações', path: '/admin-app/notifications', badge: 'notifications' }],
  },
];

export const adminNavItems = adminNavGroups.flatMap((group) => group.items);

export function isAdminPathActive(pathname: string, path: string) {
  if (path === '/admin-app') {
    return pathname === path;
  }

  return pathname.startsWith(path);
}

/** The nav item that owns the current page, for the top bar title. */
export function findActiveAdminItem(pathname: string) {
  return adminNavItems.find((item) => isAdminPathActive(pathname, item.path));
}
