import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Eye, Users, Download } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/layout/BottomNav';
import { MinistryBadge } from '@/components/schedule/MinistryBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadMonthSchedulePdf } from '@/lib/schedule-pdf';
import { MINISTRY_LABELS, type Ministry } from '@/lib/ministry';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchedules, useSchedules } from '@/hooks/useSchedules';
import type { Schedule } from '@/hooks/useSchedules';

function functionLabel(type: string, detail: string | null): string {
  if (type === 'lead_vocal') return 'Vocal Principal';
  if (type === 'backing_vocal') return 'Backing Vocal';
  if (type === 'sound_tech') return 'Técnico de Som';
  return detail || 'Instrumentista';
}

export default function Schedules() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { profile, viewableMinistries } = useAuth();
  const { data: mySchedules, isLoading: myLoading } = useMySchedules(profile?.id);
  const { data: allSchedules, isLoading: allLoading } = useSchedules();

  const isLoading = myLoading || allLoading;
  // A member in both DMS and GHJ picks which rota to download; everyone else gets theirs.
  const pdfMinistries: Ministry[] = viewableMinistries.length > 0 ? viewableMinistries : ['dms'];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getMyScheduleForDate = (date: Date): Schedule | undefined =>
    mySchedules?.find((s) => isSameDay(new Date(s.schedule_date), date));

  const getAnyScheduleForDate = (date: Date): Schedule | undefined =>
    allSchedules?.find((s) => isSameDay(new Date(s.schedule_date), date));

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <BottomNav />
      </div>
    );
  }

  const selectedMySchedule = selectedDate ? getMyScheduleForDate(selectedDate) : null;
  const selectedAnySchedule = selectedDate ? getAnyScheduleForDate(selectedDate) : null;
  const selectedDaySchedule = selectedMySchedule ?? selectedAnySchedule;
  const myRole = selectedMySchedule?.members?.find((member) => member.profile_id === profile?.id);

  return (
    <div className="page-container">
      <header className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-border/65 bg-card/82 p-5 shadow-card animate-fade-in sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/18 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Calendário</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Escalas</h1>
          <p className="text-muted-foreground">Visualize suas próximas escalas</p>
        </div>
      </header>

      <div className="repertoire-card mb-6 animate-slide-up">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <h2 className="text-lg font-semibold capitalize text-foreground">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>

          <div className="flex items-center gap-1">
            {pdfMinistries.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="Baixar escala do mês">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {pdfMinistries.map((ministry) => (
                    <DropdownMenuItem
                      key={ministry}
                      onClick={() => downloadMonthSchedulePdf(currentMonth, allSchedules ?? [], ministry)}
                    >
                      Escala {MINISTRY_LABELS[ministry]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title={`Baixar escala ${MINISTRY_LABELS[pdfMinistries[0]]} do mês`}
                onClick={() => downloadMonthSchedulePdf(currentMonth, allSchedules ?? [], pdfMinistries[0])}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-0.5 sm:gap-1">
          {weekDays.map((day) => (
            <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const myScheduled = !!getMyScheduleForDate(day);
            const otherScheduled = !myScheduled && !!getAnyScheduleForDate(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'relative flex h-11 w-full touch-manipulation flex-col items-center justify-center rounded-xl border border-transparent text-sm font-semibold transition-all',
                  !isSameMonth(day, currentMonth) && 'text-muted-foreground/50',
                  myScheduled &&
                    'border-primary/35 bg-[linear-gradient(145deg,hsl(var(--primary))_0%,hsl(24_88%_51%)_100%)] text-primary-foreground shadow-soft',
                  otherScheduled && 'border-border/50 bg-secondary/70 text-foreground',
                  selected && !myScheduled && !otherScheduled && 'border-border/70 bg-secondary',
                  today && !myScheduled && !otherScheduled && 'border-primary/60 ring-2 ring-primary/30',
                  !myScheduled && !otherScheduled && !selected && !today && 'hover:border-border/55 hover:bg-secondary/70',
                )}
              >
                {format(day, 'd')}
                {otherScheduled && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-slide-up text-sm text-muted-foreground" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-primary" />
            <span>Escalado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border border-border/50 bg-secondary/70" />
            <span>Outra equipe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded ring-2 ring-primary" />
            <span>Hoje</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="mt-6 upcoming-card animate-scale-in">
          <div className="mb-3 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold capitalize text-foreground">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {selectedDaySchedule && <MinistryBadge ministry={selectedDaySchedule.ministry} />}
          </div>

          {selectedMySchedule ? (
            <div>
              <p className="mb-3 text-foreground">
                Você está escalado como:{' '}
                <strong>{functionLabel(myRole?.function_type ?? '', myRole?.function_detail ?? null)}</strong>
              </p>

              {selectedMySchedule.members && selectedMySchedule.members.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Equipe:
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {selectedMySchedule.members.map((member) => (
                      <li key={member.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                        <span className="font-medium text-foreground">{member.profile?.name ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">
                          {functionLabel(member.function_type, member.function_detail)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedMySchedule.songs && selectedMySchedule.songs.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-sm text-muted-foreground">Repertório:</p>
                  <ul className="space-y-1 text-sm">
                    {selectedMySchedule.songs.map((song, index) => (
                      <li key={song.id} className="text-foreground">
                        {index + 1}. {song.song?.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button className="w-full" onClick={() => navigate(`/schedules/${selectedMySchedule.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Escala
              </Button>
            </div>
          ) : selectedAnySchedule ? (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">Você não está nesta escala.</p>

              {selectedAnySchedule.members && selectedAnySchedule.members.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Equipe escalada:
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {selectedAnySchedule.members.map((member) => (
                      <li key={member.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
                        <span className="font-medium text-foreground">{member.profile?.name ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">
                          {functionLabel(member.function_type, member.function_detail)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => navigate(`/schedules/${selectedAnySchedule.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Escala
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma escala para este dia.</p>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
