import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Clock, FilePen, Megaphone, Repeat, TrendingDown, TrendingUp, UserCheck, type LucideIcon } from 'lucide-react';
import type { AttentionCounts, DashboardData } from '@/lib/adminDashboard';
import { formatShortDate, scheduleDay, scheduleTime } from '@/lib/adminDashboard';
import { MINISTRY_LABELS } from '@/lib/ministry';
import { cn } from '@/lib/utils';
import { MinistryDot } from './SectionCard';

type Tone = 'danger' | 'primary' | 'info';

const toneClasses: Record<Tone, { icon: string; count: string }> = {
  danger: { icon: 'bg-destructive/10 text-destructive-strong', count: 'text-destructive-strong' },
  primary: { icon: 'bg-primary/10 text-primary-strong', count: 'text-foreground' },
  info: { icon: 'bg-ministry-ghj/10 text-ministry-ghj-strong', count: 'text-foreground' },
};

function AttentionTile({ icon: Icon, count, label, to, tone }: { icon: LucideIcon; count: number; label: string; to: string; tone: Tone }) {
  return (
    <Link
      to={to}
      className="admin-surface flex min-w-0 items-center gap-3 p-3.5 transition-colors hover:bg-muted/40 max-sm:w-40 max-sm:shrink-0 max-sm:snap-start max-sm:flex-col max-sm:items-start"
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneClasses[tone].icon)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('text-xl font-bold leading-[26px] tabular-nums', toneClasses[tone].count)}>{count}</span>
        <span className="text-[13px] leading-[18px] text-muted-foreground">{label}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground max-sm:hidden" />
    </Link>
  );
}

interface AttentionTilesProps {
  attention: AttentionCounts;
  pendingUsers: number;
  withMinistry: (path: string) => string;
}

export function AttentionTiles({ attention, pendingUsers, withMinistry }: AttentionTilesProps) {
  const scheduleLink = (id?: string) => withMinistry(id ? `/admin-app/schedules/${id}` : '/admin-app/schedules');
  const tiles = [
    attention.unconfirmed.count > 0 && (
      <AttentionTile
        key="unconfirmed"
        icon={Clock}
        count={attention.unconfirmed.count}
        label="Não confirmados (7 dias)"
        to={scheduleLink(attention.unconfirmed.scheduleId)}
        tone={attention.unconfirmed.urgent ? 'danger' : 'primary'}
      />
    ),
    attention.swaps.count > 0 && (
      <AttentionTile
        key="swaps"
        icon={Repeat}
        count={attention.swaps.count}
        label="Solicitações de troca"
        to={scheduleLink(attention.swaps.scheduleId)}
        tone="danger"
      />
    ),
    pendingUsers > 0 && (
      <AttentionTile key="users" icon={UserCheck} count={pendingUsers} label="Contas aguardando aprovação" to="/admin-app/users" tone="primary" />
    ),
    attention.drafts > 0 && (
      <AttentionTile
        key="drafts"
        icon={FilePen}
        count={attention.drafts}
        label="Rascunhos para publicar"
        to={withMinistry('/admin-app/schedules')}
        tone="primary"
      />
    ),
    attention.closingCalls.count > 0 && (
      <AttentionTile
        key="calls"
        icon={Megaphone}
        count={attention.closingCalls.count}
        label="Chamadas fechando em 3 dias"
        to={scheduleLink(attention.closingCalls.scheduleId)}
        tone="info"
      />
    ),
  ].filter(Boolean);

  return (
    <section aria-labelledby="attention-title" className="space-y-2.5">
      <h2 id="attention-title" className="text-base font-semibold text-foreground">
        Precisa de atenção
      </h2>
      {tiles.length > 0 ? (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] sm:overflow-visible sm:px-0 sm:pb-0">
          {tiles}
        </div>
      ) : (
        <p className="admin-surface flex items-center gap-2 p-4 text-sm font-medium text-success-strong">
          <CheckCircle2 className="h-4 w-4" /> Tudo em dia.
        </p>
      )}
    </section>
  );
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 26;

function KpiCard({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('admin-surface flex min-w-0 flex-col gap-1.5 p-5', className)}>
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function KpiTiles({ data, ministryLabel }: { data: DashboardData; ministryLabel: string }) {
  const { next, confirmationRate, confirmationDelta, month, members } = data;
  const ratio = next && next.total > 0 ? next.confirmed / next.total : 0;
  const publishedPct = month.total > 0 ? (month.published / month.total) * 100 : 0;
  const DeltaIcon = (confirmationDelta ?? 0) < 0 ? TrendingDown : TrendingUp;

  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard label="Próximo culto" className="col-span-2 xl:col-span-1">
        {next ? (
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xl font-semibold leading-7 text-foreground">{formatShortDate(scheduleDay(next))}</p>
              <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                <MinistryDot ministry={next.ministry} />
                <span className="truncate">
                  {[scheduleTime(next), MINISTRY_LABELS[next.ministry], next.title || (next.schedule_type === 'rehearsal' ? 'Ensaio' : 'Culto')]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </p>
            </div>
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" role="img" aria-label={`${next.confirmed} de ${next.total} confirmados`}>
                <circle cx="32" cy="32" r="26" fill="none" strokeWidth="7" className="stroke-muted" />
                {/* A round cap would still paint a dot at 0%. */}
                {ratio > 0 && (
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${ratio * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                    className={ratio < 0.5 ? 'stroke-destructive' : 'stroke-success'}
                  />
                )}
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums text-foreground">
                {next.confirmed}/{next.total}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma escala marcada.</p>
        )}
      </KpiCard>

      <KpiCard label="Confirmação · 30 dias">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {confirmationRate !== null ? `${confirmationRate}%` : '—'}
        </span>
        {confirmationDelta !== null ? (
          <span
            className={cn(
              'flex items-center gap-1 text-[13px] font-semibold',
              confirmationDelta < 0 ? 'text-destructive-strong' : 'text-success-strong',
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" />
            {confirmationDelta > 0 ? '+' : ''}
            {confirmationDelta} pts
            <span className="font-normal text-muted-foreground max-sm:hidden">vs. 30 dias anteriores</span>
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground">Sem histórico para comparar</span>
        )}
      </KpiCard>

      <KpiCard label={`Escalas em ${month.label}`}>
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{month.total}</span>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="bg-success" style={{ width: `${publishedPct}%` }} />
          <span className="bg-chart-4" style={{ width: `${100 - publishedPct}%`, display: month.drafts ? undefined : 'none' }} />
        </div>
        <span className="text-[13px] text-muted-foreground">
          {month.published} publicadas · {month.drafts} rascunhos
        </span>
      </KpiCard>

      <KpiCard label={`Membros ativos${ministryLabel}`} className="col-span-2 xl:col-span-1">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{members.total}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MinistryDot ministry="dms" /> DMS {members.dms}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MinistryDot ministry="ghj" /> GHJ {members.ghj}
          </span>
          <span>{members.canLead} podem dirigir</span>
        </span>
      </KpiCard>
    </section>
  );
}
