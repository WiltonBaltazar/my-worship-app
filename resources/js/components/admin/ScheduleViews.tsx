import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Music2,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MinistryBadge } from '@/components/schedule/MinistryBadge';
import type { Schedule } from '@/hooks/useSchedules';
import { cn } from '@/lib/utils';

export type ScheduleViewMode = 'cards' | 'list' | 'grid' | 'calendar';

export interface ScheduleViewProps {
  schedules: Schedule[];
  canManage: (schedule: Schedule) => boolean;
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  onPublish: (schedule: Schedule) => void;
}

const statusLabelMap: Record<Schedule['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  confirmed: 'Confirmado',
};

const functionLabelMap: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseScheduleDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function formatScheduleDate(date: string, pattern = "EEEE, d 'de' MMMM"): string {
  const formatted = format(parseScheduleDate(date), pattern, { locale: ptBR });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(schedule: Schedule) {
  return schedule.start_time?.slice(0, 5) ?? '11:00';
}

function statusBadgeClass(status: Schedule['status']) {
  if (status === 'published') {
    return 'bg-success text-success-foreground';
  }

  if (status === 'confirmed') {
    return '';
  }

  return 'bg-secondary text-secondary-foreground';
}

function scheduleStats(schedule: Schedule) {
  const members = schedule.members ?? [];

  return {
    members,
    songs: schedule.songs ?? [],
    confirmedCount: members.filter((member) => member.confirmed).length,
    requestCount: members.filter((member) => member.requested_change).length,
  };
}

function ScheduleBadges({ schedule, compact = false }: { schedule: Schedule; compact?: boolean }) {
  const { requestCount } = scheduleStats(schedule);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MinistryBadge ministry={schedule.ministry} />
      <Badge className={statusBadgeClass(schedule.status)}>{statusLabelMap[schedule.status]}</Badge>
      {schedule.availability_call?.is_open && (
        <Badge variant="outline" className="border-green-300 text-green-700">
          {compact ? 'Convocatória' : 'Convocatória aberta'}
        </Badge>
      )}
      {(schedule.guests?.length ?? 0) > 0 && (
        <Badge variant="outline" className="border-amber-400/60 text-amber-800">
          <Star className="mr-1 h-3 w-3" />
          {compact ? schedule.guests?.length : `${schedule.guests?.length} participação(ões)`}
        </Badge>
      )}
      {requestCount > 0 && (
        <Badge variant="outline" className="border-orange-400 text-orange-700">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {compact ? requestCount : `${requestCount} solicitação(ões)`}
        </Badge>
      )}
    </div>
  );
}

function ScheduleActions({
  schedule,
  canManage,
  onView,
  onEdit,
  onDelete,
  onPublish,
  compact = false,
}: Omit<ScheduleViewProps, 'schedules' | 'canManage'> & { schedule: Schedule; canManage: boolean; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <Button variant="ghost" size="sm" onClick={() => onView(schedule)}>
        <Eye className={cn('h-4 w-4', !compact && 'mr-1')} />
        {!compact && 'Ver'}
      </Button>
      {canManage && schedule.status === 'draft' && (
        <Button variant="outline" size="sm" onClick={() => onPublish(schedule)}>
          Publicar
        </Button>
      )}
      {canManage && (
        <>
          <Button variant="outline" size="sm" onClick={() => onEdit(schedule)}>
            Editar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(schedule)}
            aria-label="Excluir escala"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export function ScheduleCardsView({ schedules, canManage, ...actions }: ScheduleViewProps) {
  return (
    <div className="space-y-4">
      {schedules.map((schedule) => {
        const { members, songs, confirmedCount } = scheduleStats(schedule);

        return (
          <Card key={schedule.id} className="admin-surface">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-xl text-slate-900 lg:text-2xl">{formatScheduleDate(schedule.schedule_date)}</CardTitle>
                    {schedule.title && <p className="mt-1 text-sm text-slate-500 lg:text-base">{schedule.title}</p>}
                    <div className="mt-2">
                      <ScheduleBadges schedule={schedule} />
                    </div>
                  </div>
                </div>

                <ScheduleActions schedule={schedule} canManage={canManage(schedule)} {...actions} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6 text-slate-500">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{members.length} membros escalados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>{confirmedCount} confirmados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{songs.length} músicas</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 font-medium text-slate-900">Equipe:</p>
                {members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => (
                      <Badge
                        key={member.id}
                        variant={member.confirmed ? 'default' : 'secondary'}
                        className={member.confirmed ? 'whitespace-normal break-words bg-orange-50 text-orange-700' : 'whitespace-normal break-words'}
                      >
                        {member.profile?.name} - {functionLabelMap[member.function_type] || member.function_type}
                        {member.function_detail ? ` - ${member.function_detail}` : ''}
                        {member.confirmed && <Check className="ml-1 h-3 w-3" />}
                        {member.requested_change && <AlertTriangle className="ml-1 h-3 w-3" />}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro escalado ainda. Clique em "Editar" para adicionar.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ScheduleListView({ schedules, canManage, ...actions }: ScheduleViewProps) {
  return (
    <div className="admin-surface overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="hidden md:table-cell">Título</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden sm:table-cell text-center">Equipe</TableHead>
            <TableHead className="hidden lg:table-cell text-center">Músicas</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => {
            const { members, songs, confirmedCount } = scheduleStats(schedule);

            return (
              <TableRow key={schedule.id} className="cursor-pointer" onClick={() => actions.onView(schedule)}>
                <TableCell className="whitespace-nowrap">
                  <p className="font-medium text-slate-900">{formatScheduleDate(schedule.schedule_date, "EEE, dd/MM/yyyy")}</p>
                  <p className="text-xs text-slate-500">
                    {formatTime(schedule)}
                    {schedule.title && <span className="md:hidden"> · {schedule.title}</span>}
                  </p>
                </TableCell>
                <TableCell className="hidden max-w-[16rem] truncate md:table-cell">{schedule.title || '—'}</TableCell>
                <TableCell>
                  <ScheduleBadges schedule={schedule} compact />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-center sm:table-cell">
                  {confirmedCount}/{members.length}
                </TableCell>
                <TableCell className="hidden text-center lg:table-cell">{songs.length}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <ScheduleActions schedule={schedule} canManage={canManage(schedule)} compact {...actions} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ScheduleGridView({ schedules, canManage, ...actions }: ScheduleViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {schedules.map((schedule) => {
        const { members, songs, confirmedCount } = scheduleStats(schedule);
        const date = parseScheduleDate(schedule.schedule_date);

        return (
          <Card
            key={schedule.id}
            className="admin-surface flex cursor-pointer flex-col transition-shadow hover:shadow-md"
            onClick={() => actions.onView(schedule)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-orange-50 text-primary">
                  <span className="text-[10px] font-semibold uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                  <span className="text-xl font-bold leading-none">{format(date, 'dd')}</span>
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base text-slate-900">{schedule.title || 'Culto'}</CardTitle>
                  <p className="mt-0.5 text-sm capitalize text-slate-500">
                    {format(date, 'EEEE', { locale: ptBR })} · {formatTime(schedule)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <ScheduleBadges schedule={schedule} compact />
              <div className="flex gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {members.length}
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-success" />
                  {confirmedCount}
                </span>
                <span className="flex items-center gap-1">
                  <Music2 className="h-4 w-4" />
                  {songs.length}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <ScheduleActions schedule={schedule} canManage={canManage(schedule)} compact {...actions} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function initialCalendarMonth(schedules: Schedule[]) {
  const today = new Date();
  const hasThisMonth = schedules.some((schedule) => isSameMonth(parseScheduleDate(schedule.schedule_date), today));

  if (hasThisMonth || schedules.length === 0) {
    return startOfMonth(today);
  }

  // Otherwise jump to the most recent month that has schedules.
  return startOfMonth(parseScheduleDate(schedules[0].schedule_date));
}

export function ScheduleCalendarView({ schedules, canManage, ...actions }: ScheduleViewProps) {
  const [month, setMonth] = useState(() => initialCalendarMonth(schedules));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }),
    [month],
  );

  const schedulesByDay = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      const list = map.get(schedule.schedule_date) ?? [];
      list.push(schedule);
      map.set(schedule.schedule_date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }
    return map;
  }, [schedules]);

  const selectedSchedules = selectedDay ? schedulesByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [] : [];
  const monthLabel = format(month, 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="space-y-4">
      <div className="admin-surface p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setMonth((current) => subMonths(current, 1))} aria-label="Mês anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold capitalize text-slate-900">{monthLabel}</p>
            {!isSameMonth(month, new Date()) && (
              <Button variant="outline" size="sm" className="h-7" onClick={() => setMonth(startOfMonth(new Date()))}>
                Hoje
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMonth((current) => addMonths(current, 1))} aria-label="Próximo mês">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
          {weekDayLabels.map((label) => (
            <div key={label} className="py-1">{label}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const daySchedules = schedulesByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
            const inMonth = isSameMonth(day, month);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDay(daySchedules.length > 0 ? day : null)}
                className={cn(
                  'flex min-h-14 flex-col rounded-lg border p-1 text-left transition-colors sm:min-h-24',
                  inMonth ? 'border-slate-200 bg-white' : 'border-transparent bg-slate-50 text-slate-400',
                  daySchedules.length > 0 && 'hover:border-primary/50',
                  isSelected && 'border-primary ring-1 ring-primary',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Phones only fit dots; larger screens show labelled chips. */}
                <div className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                  {daySchedules.map((schedule) => (
                    <span
                      key={schedule.id}
                      className={cn('h-1.5 w-1.5 rounded-full', schedule.ministry === 'ghj' ? 'bg-amber-500' : 'bg-primary')}
                    />
                  ))}
                </div>
                <div className="mt-1 hidden w-full space-y-0.5 sm:block">
                  {daySchedules.slice(0, 2).map((schedule) => (
                    <span
                      key={schedule.id}
                      className={cn(
                        'block truncate rounded px-1 py-0.5 text-[11px] font-medium',
                        schedule.ministry === 'ghj' ? 'bg-amber-50 text-amber-800' : 'bg-orange-50 text-orange-800',
                        schedule.status === 'draft' && 'opacity-60',
                      )}
                    >
                      {formatTime(schedule)} {schedule.title || 'Culto'}
                    </span>
                  ))}
                  {daySchedules.length > 2 && (
                    <span className="block px-1 text-[11px] text-slate-500">+{daySchedules.length - 2}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && selectedSchedules.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium text-slate-900">{formatScheduleDate(format(selectedDay, 'yyyy-MM-dd'))}</p>
          {selectedSchedules.map((schedule) => {
            const { members, confirmedCount } = scheduleStats(schedule);

            return (
              <div
                key={schedule.id}
                className="admin-surface-muted flex cursor-pointer flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                onClick={() => actions.onView(schedule)}
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-slate-900">
                    {formatTime(schedule)} · {schedule.title || 'Culto'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <ScheduleBadges schedule={schedule} compact />
                    <span className="text-xs text-slate-500">
                      {confirmedCount}/{members.length} confirmados
                    </span>
                  </div>
                </div>
                <ScheduleActions schedule={schedule} canManage={canManage(schedule)} compact {...actions} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-slate-500">Toque num dia com escala para ver os detalhes.</p>
      )}
    </div>
  );
}
