import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/hooks/useProfiles';
import type { Schedule, ScheduleMember } from '@/hooks/useSchedules';
import { formatShortDate, initials, scheduleDay, scheduleTime } from '@/lib/adminDashboard';
import { MINISTRY_LABELS, type Ministry } from '@/lib/ministry';
import { cn } from '@/lib/utils';
import { EmptyState, MinistryDot, SectionCard } from './SectionCard';

function TeamStack({ members = [] }: { members?: ScheduleMember[] }) {
  const shown = members.slice(0, 4);
  const extra = members.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((member) => (
        <Avatar key={member.id} className="-mr-1.5 h-7 w-7 border-2 border-card">
          <AvatarImage src={member.profile?.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="bg-muted text-[10px] font-bold text-foreground">{initials(member.profile?.name)}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && <span className="ml-3 text-xs tabular-nums text-muted-foreground">+{extra}</span>}
      {members.length === 0 && <span className="text-xs text-muted-foreground">Sem equipe</span>}
    </div>
  );
}

function ConfirmationBar({ members = [], isDraft }: { members?: ScheduleMember[]; isDraft: boolean }) {
  const confirmed = members.filter((member) => member.confirmed).length;
  const ratio = members.length > 0 ? confirmed / members.length : 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', !isDraft && ratio < 0.5 ? 'bg-destructive' : 'bg-success')}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <span className="text-[13px] font-semibold tabular-nums text-foreground">
        {confirmed}/{members.length}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: Schedule['status'] }) {
  return status === 'draft' ? (
    <span className="inline-flex rounded-full border border-dashed border-chart-4 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      Rascunho
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success-strong">Publicada</span>
  );
}

function DateBlock({ day }: { day: string }) {
  const [weekday, date] = formatShortDate(day).split(', ');
  return (
    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{weekday}</span>
      <span className="mt-0.5 text-base font-bold tabular-nums text-foreground">{date?.slice(0, 2)}</span>
    </div>
  );
}

const typeLabel = (schedule: Schedule) => schedule.title || (schedule.schedule_type === 'rehearsal' ? 'Ensaio' : 'Culto');

interface UpcomingSchedulesCardProps {
  schedules: Schedule[];
  allLink: string;
  /** Upcoming services with no lead vocal assigned. */
  warnings: Schedule[];
  className?: string;
}

export function UpcomingSchedulesCard({ schedules, allLink, warnings, className }: UpcomingSchedulesCardProps) {
  const navigate = useNavigate();
  const rows = schedules.slice(0, 6);

  return (
    <SectionCard title="Próximas escalas" action={{ label: 'Ver todas', to: allLink }} flush className={className}>
      {warnings.length > 0 && (
        <p className="mx-5 mb-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] font-medium text-destructive-strong">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Sem dirigente: {warnings.map((schedule) => `${formatShortDate(scheduleDay(schedule))} (${MINISTRY_LABELS[schedule.ministry]})`).join(', ')}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState>Nenhuma escala próxima.</EmptyState>
      ) : (
        <>
          {/* Phones: stacked cards */}
          <ul className="space-y-2 px-4 pb-4 md:hidden">
            {rows.map((schedule) => (
              <li key={schedule.id}>
                <Link to={`/admin-app/schedules/${schedule.id}`} className="admin-surface-muted flex flex-col gap-2.5 p-3">
                  <div className="flex items-center gap-3">
                    <DateBlock day={scheduleDay(schedule)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {typeLabel(schedule)} {scheduleTime(schedule) && `· ${scheduleTime(schedule)}`}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MinistryDot ministry={schedule.ministry} withLabel /> · {schedule.members?.length ?? 0} na equipe
                      </p>
                    </div>
                    <StatusBadge status={schedule.status} />
                  </div>
                  <ConfirmationBar members={schedule.members} isDraft={schedule.status === 'draft'} />
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-5 py-2 font-semibold">Data</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Ministério</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Tipo</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Equipe</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Confirmação</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-2"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((schedule) => (
                  <tr
                    key={schedule.id}
                    onClick={() => navigate(`/admin-app/schedules/${schedule.id}`)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <DateBlock day={scheduleDay(schedule)} />
                        <div>
                          <p className="font-semibold text-foreground">{formatShortDate(scheduleDay(schedule))}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{scheduleTime(schedule)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">
                      <MinistryDot ministry={schedule.ministry} withLabel />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{typeLabel(schedule)}</td>
                    <td className="px-3 py-3">
                      <TeamStack members={schedule.members} />
                    </td>
                    <td className="px-3 py-3">
                      <ConfirmationBar members={schedule.members} isDraft={schedule.status === 'draft'} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={schedule.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/admin-app/schedules/${schedule.id}`}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Abrir escala de ${formatShortDate(scheduleDay(schedule))}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}

interface UnavailableEntry {
  profile: Profile;
  label: string;
  scope: Ministry | null;
}

export function UnavailableThisWeekCard({ entries, allLink }: { entries: UnavailableEntry[]; allLink: string }) {
  return (
    <SectionCard title="Indisponíveis esta semana" action={{ label: 'Ver', to: allLink }}>
      {entries.length === 0 ? (
        <EmptyState>Todos disponíveis nos próximos 7 dias.</EmptyState>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {entries.slice(0, 5).map(({ profile, label, scope }) => (
            <li key={profile.id} className="flex items-center gap-2.5 py-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-muted text-[11px] font-bold text-foreground">{initials(profile.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{profile.name}</p>
                <p className="truncate text-xs text-muted-foreground">{label}</p>
              </div>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {scope ? MINISTRY_LABELS[scope] : 'Todos'}
              </span>
            </li>
          ))}
          {entries.length > 5 && (
            <li className="pt-2.5 text-xs text-muted-foreground">+{entries.length - 5} membros</li>
          )}
        </ul>
      )}
    </SectionCard>
  );
}

interface SwapRequest {
  schedule: Schedule;
  member: ScheduleMember;
}

export function SwapRequestsCard({ requests, onOpen }: { requests: SwapRequest[]; onOpen: (scheduleId: string) => void }) {
  return (
    <SectionCard title="Solicitações de troca">
      {requests.length === 0 ? (
        <EmptyState>Nenhuma solicitação pendente.</EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {requests.slice(0, 3).map(({ schedule, member }) => {
            const candidates = member.pending_substitute_requests?.length ?? 0;
            return (
              <li key={member.id} className="admin-surface-muted space-y-1.5 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-foreground">{member.profile?.name ?? 'Membro'}</span>
                  {member.function_detail && <span className="shrink-0 text-xs text-muted-foreground">{member.function_detail}</span>}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {formatShortDate(scheduleDay(schedule))} · {MINISTRY_LABELS[schedule.ministry]}
                  {member.change_reason && ` — “${member.change_reason}”`}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {candidates > 0 ? `Aguardando substituto (${candidates} convidado${candidates > 1 ? 's' : ''})` : 'Sem substituto convidado'}
                </p>
                <Button variant="outline" size="sm" className="mt-1 h-8 rounded-lg" onClick={() => onOpen(schedule.id)}>
                  Abrir escala
                </Button>
              </li>
            );
          })}
          {requests.length > 3 && <li className="text-xs text-muted-foreground">+{requests.length - 3} solicitações</li>}
        </ul>
      )}
    </SectionCard>
  );
}
