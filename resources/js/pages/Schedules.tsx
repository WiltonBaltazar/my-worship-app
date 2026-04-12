import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Eye } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchedules } from '@/hooks/useSchedules';
import type { Schedule } from '@/hooks/useSchedules';

export default function Schedules() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { profile } = useAuth();
  const { data: schedules, isLoading } = useMySchedules(profile?.id);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getScheduleForDate = (date: Date): Schedule | undefined =>
    schedules?.find((schedule) => isSameDay(new Date(schedule.schedule_date), date));

  const isScheduled = (date: Date) => !!getScheduleForDate(date);

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <BottomNav />
      </div>
    );
  }

  const selectedSchedule = selectedDate ? getScheduleForDate(selectedDate) : null;
  const myRole = selectedSchedule?.members?.find((member) => member.profile_id === profile?.id);

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

          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
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
            const scheduled = isScheduled(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex h-11 w-full touch-manipulation items-center justify-center rounded-xl border border-transparent text-sm font-semibold transition-all',
                  !isSameMonth(day, currentMonth) && 'text-muted-foreground/50',
                  scheduled && 'border-primary/35 bg-[linear-gradient(145deg,hsl(var(--primary))_0%,hsl(24_88%_51%)_100%)] text-primary-foreground shadow-soft',
                  selected && !scheduled && 'border-border/70 bg-secondary',
                  today && !scheduled && 'border-primary/60 ring-2 ring-primary/30',
                  !scheduled && !selected && !today && 'hover:border-border/55 hover:bg-secondary/70',
                )}
              >
                {format(day, 'd')}
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
            <div className="h-4 w-4 rounded ring-2 ring-primary" />
            <span>Hoje</span>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="mt-6 upcoming-card animate-scale-in">
          <div className="mb-2 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold capitalize text-foreground">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
          </div>

          {selectedSchedule ? (
            <div>
              <p className="mb-2 text-foreground">
                Você está escalado como:{' '}
                <strong>
                  {myRole?.function_type === 'lead_vocal'
                    ? 'Vocal Principal'
                    : myRole?.function_type === 'backing_vocal'
                      ? 'Backing Vocal'
                      : myRole?.function_type === 'sound_tech'
                        ? 'Técnico de Som'
                        : myRole?.function_detail || 'Instrumentista'}
                </strong>
              </p>

              {selectedSchedule.songs && selectedSchedule.songs.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-sm text-muted-foreground">Repertório:</p>
                  <ul className="space-y-1 text-sm">
                    {selectedSchedule.songs.map((song, index) => (
                      <li key={song.id} className="text-foreground">
                        {index + 1}. {song.song?.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button className="mt-4 w-full" onClick={() => navigate(`/schedules/${selectedSchedule.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Escala
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Você não está escalado para este dia.</p>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
