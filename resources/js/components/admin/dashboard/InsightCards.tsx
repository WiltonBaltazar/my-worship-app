import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdminMinistry } from '@/hooks/useAdminMinistry';
import type { Profile } from '@/hooks/useProfiles';
import { countBy, initials, instrumentLabels, voiceLabels } from '@/lib/adminDashboard';
import { cn } from '@/lib/utils';
import { EmptyState, SectionCard } from './SectionCard';

type CoverageTab = 'instruments' | 'voices';

export function TeamCoverageCard({ profiles }: { profiles: Profile[] }) {
  const [tab, setTab] = useState<CoverageTab>('instruments');
  const bars = tab === 'instruments' ? countBy(profiles, 'instruments', instrumentLabels) : countBy(profiles, 'voices', voiceLabels);
  const max = Math.max(1, ...bars.map((bar) => bar.count));

  return (
    <SectionCard
      title="Cobertura da equipe"
      meta={
        <div role="tablist" aria-label="Tipo de função" className="flex gap-0.5 rounded-lg bg-muted p-[3px]">
          {(['instruments', 'voices'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'h-7 rounded-md px-3 text-[13px] transition-colors',
                tab === value ? 'bg-card font-semibold text-foreground shadow-sm' : 'font-medium text-muted-foreground hover:text-foreground',
              )}
            >
              {value === 'instruments' ? 'Instrumentos' : 'Vozes'}
            </button>
          ))}
        </div>
      }
    >
      {bars.length === 0 ? (
        <EmptyState>Nenhum membro com {tab === 'instruments' ? 'instrumento' : 'voz'} cadastrado.</EmptyState>
      ) : (
        <ul className="space-y-2.5" role="tabpanel">
          {bars.map((bar) => (
            <li key={bar.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)_1.75rem] items-center gap-3">
              <span className="truncate text-[13px] text-muted-foreground">{bar.label}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(bar.count / max) * 100}%` }} />
              </div>
              <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">{bar.count}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function PersonRow({ profile, count, muted }: { profile: Profile; count: number; muted?: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <Avatar className="h-7 w-7">
        <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
        <AvatarFallback className={cn('text-[10px] font-bold', muted ? 'bg-ministry-ghj/10 text-ministry-ghj-strong' : 'bg-muted text-foreground')}>
          {initials(profile.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{profile.name}</span>
      <span className={cn('text-sm font-semibold tabular-nums', muted ? 'text-muted-foreground' : 'text-foreground')}>{count}×</span>
    </li>
  );
}

interface RotationEntry {
  profile: Profile;
  count: number;
}

export function RotationCard({ most, least }: { most: RotationEntry[]; least: RotationEntry[] }) {
  return (
    <SectionCard title="Distribuição de escalas" meta={<span className="text-xs text-muted-foreground">Últimos 90 dias</span>}>
      {most.length === 0 && least.length === 0 ? (
        <EmptyState>Sem escalas nos últimos 90 dias.</EmptyState>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Mais escalados</p>
              {most.length > 0 ? (
                <ul className="space-y-2">
                  {most.map((entry) => (
                    <PersonRow key={entry.profile.id} {...entry} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Ninguém escalado ainda.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Pouco escalados</p>
              <ul className="space-y-2">
                {least.map((entry) => (
                  <PersonRow key={entry.profile.id} {...entry} muted />
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Use para equilibrar a rotação ao montar a próxima escala.</p>
        </>
      )}
    </SectionCard>
  );
}

interface SongEntry {
  title: string;
  artist: string | null;
  count: number;
}

export function RepertoireCard({ top, unused, repertoireLink }: { top: SongEntry[]; unused: number; repertoireLink: string }) {
  return (
    <SectionCard title="Repertório mais usado" meta={<span className="text-xs text-muted-foreground">Últimos 90 dias</span>}>
      {top.length === 0 ? (
        <EmptyState>Nenhuma música usada nos últimos 90 dias.</EmptyState>
      ) : (
        <ol className="divide-y divide-border border-t border-border">
          {top.map((song, index) => (
            <li key={`${song.title}-${index}`} className="flex items-center gap-3 py-2.5">
              <span className="w-5 text-[13px] font-bold tabular-nums text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{song.title}</span>
                {song.artist && <span className="block truncate text-xs text-muted-foreground">{song.artist}</span>}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                {song.count} {song.count === 1 ? 'vez' : 'vezes'}
              </span>
            </li>
          ))}
        </ol>
      )}
      {unused > 0 && (
        <Link
          to={repertoireLink}
          className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 text-[13px] font-semibold transition-colors hover:bg-muted/70"
        >
          <span className="text-foreground">
            {unused} {unused === 1 ? 'música não usada' : 'músicas não usadas'} em 90 dias
          </span>
          <span className="text-primary-strong">Repertório →</span>
        </Link>
      )}
    </SectionCard>
  );
}

const activityTone: Record<string, string> = {
  confirmation: 'bg-success',
  change_request: 'bg-destructive',
  substitute_request: 'bg-destructive',
  approval_request: 'bg-primary',
  schedule: 'bg-ministry-ghj',
  reminder: 'bg-warning',
};

interface ActivityItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  schedule_id?: string | null;
}

export function ActivityCard({ items, notificationsLink }: { items: ActivityItem[]; notificationsLink: string }) {
  const { withMinistry } = useAdminMinistry();

  return (
    <SectionCard title="Atividade recente" action={{ label: 'Notificações', to: notificationsLink }}>
      {items.length === 0 ? (
        <EmptyState>Nenhuma atividade recente.</EmptyState>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.slice(0, 6).map((item) => {
            const body = (
              <>
                <span aria-hidden="true" className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', activityTone[item.type] ?? 'bg-chart-4')} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm text-foreground', !item.read && 'font-semibold')}>{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.message}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </>
            );

            return (
              <li key={item.id}>
                {item.schedule_id ? (
                  <Link to={withMinistry(`/admin-app/schedules/${item.schedule_id}`)} className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted/40">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
