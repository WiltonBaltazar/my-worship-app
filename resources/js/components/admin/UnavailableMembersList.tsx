import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarOff, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Profile, useProfiles } from '@/hooks/useProfiles';
import { toLocalDateInputValue } from '@/lib/date-time';
import { cn } from '@/lib/utils';

interface UnavailableMembersListProps {
  variant?: 'card' | 'plain';
  className?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  maxMembers?: number;
}

interface UnavailableEntry {
  profile: Profile;
  dates: string[];
}

function formatUnavailableDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  const formatted = format(parsed, "EEE, d 'de' MMM", { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getInitials(name: string | undefined | null): string {
  if (!name) {
    return 'U';
  }

  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UnavailableMembersList({
  variant = 'card',
  className,
  title = 'Indisponibilidades',
  description = 'Membros com datas marcadas como indisponíveis.',
  emptyMessage = 'Nenhum membro com datas indisponíveis futuras.',
  maxMembers,
}: UnavailableMembersListProps) {
  const { data: profiles, isLoading } = useProfiles();

  const entries = useMemo<UnavailableEntry[]>(() => {
    if (!profiles) {
      return [];
    }

    const today = toLocalDateInputValue();

    return profiles
      .map((profile) => {
        const dates = (profile.unavailable_dates ?? [])
          .filter((date) => date >= today)
          .sort();

        return { profile, dates };
      })
      .filter((entry) => entry.dates.length > 0)
      .sort((a, b) => a.dates[0].localeCompare(b.dates[0]));
  }, [profiles]);

  const visibleEntries = maxMembers ? entries.slice(0, maxMembers) : entries;
  const hiddenCount = maxMembers ? Math.max(0, entries.length - maxMembers) : 0;

  const body = (
    <>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      ) : visibleEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map(({ profile, dates }) => (
            <div
              key={profile.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{profile.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {dates.map((date) => (
                  <Badge
                    key={date}
                    variant="secondary"
                    className="whitespace-nowrap bg-orange-50 text-orange-700 hover:bg-orange-50"
                  >
                    {formatUnavailableDate(date)}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground">
              + {hiddenCount} {hiddenCount === 1 ? 'membro' : 'membros'} com datas indisponíveis
            </p>
          )}
        </div>
      )}
    </>
  );

  if (variant === 'plain') {
    return <div className={cn('space-y-3', className)}>{body}</div>;
  }

  return (
    <Card className={cn('admin-surface', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarOff className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
