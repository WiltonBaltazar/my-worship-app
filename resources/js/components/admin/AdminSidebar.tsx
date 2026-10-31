import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye, Loader2, LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdminMinistry } from '@/hooks/useAdminMinistry';
import { cn } from '@/lib/utils';
import { adminNavGroups, isAdminPathActive, type AdminBadgeKey } from './adminNavigation';

interface AdminSidebarProps {
  /** Icon-only rail: labels move into tooltips. */
  rail?: boolean;
  badges: Record<AdminBadgeKey, number>;
  userName: string;
  userRole: string;
  isSigningOut: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
}

function RailTooltip({ rail, label, children }: { rail: boolean; label: string; children: ReactNode }) {
  if (!rail) {
    return <>{children}</>;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function AdminSidebar({
  rail = false,
  badges,
  userName,
  userRole,
  isSigningOut,
  onSignOut,
  onNavigate,
}: AdminSidebarProps) {
  const location = useLocation();
  const { withMinistry } = useAdminMinistry();
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="flex h-full flex-col gap-5 px-3 py-5">
      <div className={cn('flex items-center gap-3 px-1.5', rail && 'justify-center px-0')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
          W
        </div>
        {!rail && (
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-5 text-sidebar-foreground">WORA</p>
            <p className="text-xs text-muted-foreground">Painel administrativo</p>
          </div>
        )}
      </div>

      <nav aria-label="Navegação do admin" className="flex-1 space-y-4 overflow-y-auto">
        {adminNavGroups.map((group, groupIndex) => (
          <div key={group.label} className="space-y-0.5">
            {rail ? (
              groupIndex > 0 && <div className="mx-auto mb-1.5 h-px w-6 bg-sidebar-border" aria-hidden="true" />
            ) : (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {group.label}
              </p>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isAdminPathActive(location.pathname, item.path);
              const badgeCount = item.badge ? badges[item.badge] : 0;

              return (
                <RailTooltip key={item.path} rail={rail} label={item.label}>
                  <Link
                    to={withMinistry(item.path)}
                    onClick={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={rail ? item.label : undefined}
                    className={cn(
                      'relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors',
                      rail && 'justify-center px-0',
                      isActive
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                        : 'font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-primary-strong')} />
                    {!rail && <span className="flex-1 truncate">{item.label}</span>}

                    {badgeCount > 0 &&
                      (rail ? (
                        <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar" />
                      ) : (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {badgeCount}
                        </span>
                      ))}
                  </Link>
                </RailTooltip>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border pt-3">
        <RailTooltip rail={rail} label="Ver como Membro">
          <Link
            to="/dashboard"
            onClick={onNavigate}
            aria-label={rail ? 'Ver como Membro' : undefined}
            className={cn(
              'flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              rail && 'justify-center px-0',
            )}
          >
            <Eye className="h-[18px] w-[18px] shrink-0" />
            {!rail && <span>Ver como Membro</span>}
          </Link>
        </RailTooltip>

        <div
          className={cn(
            'flex items-center gap-2.5 rounded-lg border border-border bg-card p-2',
            rail && 'flex-col border-transparent bg-transparent p-0',
          )}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary-strong"
            title={rail ? userName : undefined}
          >
            {initials || 'A'}
          </div>
          {!rail && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-[18px] text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">{userRole}</p>
            </div>
          )}
          <RailTooltip rail={rail} label="Sair">
            <button
              type="button"
              onClick={onSignOut}
              disabled={isSigningOut}
              aria-label="Sair"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive-strong disabled:opacity-50"
            >
              {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </button>
          </RailTooltip>
        </div>
      </div>
    </div>
  );
}
