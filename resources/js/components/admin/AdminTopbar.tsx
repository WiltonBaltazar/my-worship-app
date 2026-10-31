import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Bell, ChevronRight, Eye, Menu, Monitor, Moon, PanelLeft, Search, Sun } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminMinistry, type MinistryFilterValue } from '@/hooks/useAdminMinistry';
import { MINISTRY_LABELS } from '@/lib/ministry';
import { cn } from '@/lib/utils';
import { adminNavGroups, findActiveAdminItem } from './adminNavigation';

const iconButton =
  'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted';

function MinistryFilter() {
  const { ministry, setMinistry, options, showFilter } = useAdminMinistry();

  if (!showFilter) {
    return null;
  }

  const choices: MinistryFilterValue[] = ['all', ...options];

  return (
    <div
      role="group"
      aria-label="Filtrar por ministério"
      className="order-last flex w-full gap-0.5 rounded-lg border border-border bg-muted p-[3px] sm:order-none sm:w-auto"
    >
      {choices.map((choice) => {
        const selected = choice === ministry;
        return (
          <button
            key={choice}
            type="button"
            aria-pressed={selected}
            onClick={() => setMinistry(choice)}
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] transition-colors sm:h-8 sm:flex-none',
              selected ? 'bg-card font-semibold text-foreground shadow-sm' : 'font-medium text-muted-foreground hover:text-foreground',
            )}
          >
            {choice !== 'all' && (
              <span
                aria-hidden="true"
                className={cn('h-2 w-2 rounded-full', choice === 'ghj' ? 'bg-ministry-ghj' : 'bg-ministry-dms')}
              />
            )}
            {choice === 'all' ? 'Todos' : MINISTRY_LABELS[choice]}
          </button>
        );
      })}
    </div>
  );
}

function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={iconButton} aria-label="Tema">
          <Icon className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme ?? 'light'} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" /> Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" /> Escuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" /> Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PageSearch() {
  const navigate = useNavigate();
  const { withMinistry } = useAdminMinistry();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-10 min-w-0 flex-[0_1_260px] items-center gap-2 rounded-lg border border-border bg-background px-3 text-[13px] text-muted-foreground transition-colors hover:bg-muted md:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">Ir para…</span>
        <kbd className="rounded border border-border px-1.5 text-[11px] font-semibold">⌘K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} className={cn(iconButton, 'md:hidden')} aria-label="Ir para página">
        <Search className="h-[18px] w-[18px]" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar página…" />
        <CommandList>
          <CommandEmpty>Nenhuma página encontrada.</CommandEmpty>
          {adminNavGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem key={item.path} value={`${group.label} ${item.label}`} onSelect={() => go(withMinistry(item.path))}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
          <CommandGroup heading="Outros">
            <CommandItem value="Ver como Membro" onSelect={() => go('/dashboard')}>
              <Eye className="mr-2 h-4 w-4" />
              Ver como Membro
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

interface AdminTopbarProps {
  unreadNotifications: number;
  onOpenMobileMenu: () => void;
  onToggleRail: () => void;
}

export function AdminTopbar({ unreadNotifications, onOpenMobileMenu, onToggleRail }: AdminTopbarProps) {
  const location = useLocation();
  const { withMinistry } = useAdminMinistry();
  const activeItem = findActiveAdminItem(location.pathname);
  const isScheduleDetail = /^\/admin-app\/schedules\/[^/]+/.test(location.pathname);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-2 border-b border-border bg-card/90 px-3 py-3 backdrop-blur sm:gap-3 sm:px-6">
      <button type="button" onClick={onOpenMobileMenu} className={cn(iconButton, 'border-transparent bg-transparent lg:hidden')} aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToggleRail}
        className={cn(iconButton, 'hidden border-transparent bg-transparent text-muted-foreground lg:inline-flex')}
        aria-label="Recolher ou expandir menu lateral"
      >
        <PanelLeft className="h-[18px] w-[18px]" />
      </button>

      <nav aria-label="Você está em" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] text-muted-foreground">
        <span className="hidden sm:inline">Admin</span>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 sm:block" aria-hidden="true" />
        {isScheduleDetail && activeItem ? (
          <>
            <Link to={withMinistry(activeItem.path)} className="truncate hover:text-foreground">
              {activeItem.label}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate font-semibold text-foreground">Detalhes</span>
          </>
        ) : (
          <span className="truncate text-base font-semibold text-foreground sm:text-[13px]">{activeItem?.label ?? 'Admin'}</span>
        )}
      </nav>

      <PageSearch />
      <MinistryFilter />

      <Link to={withMinistry('/admin-app/notifications')} className={iconButton} aria-label={`Notificações (${unreadNotifications} não lidas)`}>
        <Bell className="h-[18px] w-[18px]" />
        {unreadNotifications > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card" aria-hidden="true" />
        )}
      </Link>
      <ThemeMenu />
    </header>
  );
}
