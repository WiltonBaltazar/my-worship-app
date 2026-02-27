import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Eye } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
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
    schedules?.find(s => isSameDay(new Date(s.schedule_date), date));

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
  const myRole = selectedSchedule?.members?.find(m => m.profile_id === profile?.id);

  return (
    <div className="page-container">
      <header className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Escalas</h1>
        <p className="text-muted-foreground">Visualize suas próximas escalas</p>
      </header>

      <div className="repertoire-card mb-6 animate-slide-up">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {days.map(day => {
            const scheduled = isScheduled(day);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square min-h-11 rounded-xl flex items-center justify-center text-sm font-medium transition-all touch-manipulation",
                  !isSameMonth(day, currentMonth) && "text-muted-foreground/50",
                  scheduled && "bg-primary text-primary-foreground",
                  selected && !scheduled && "bg-secondary",
                  today && !scheduled && "ring-2 ring-primary",
                  !scheduled && !selected && !today && "hover:bg-secondary"
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Escalado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded ring-2 ring-primary" />
          <span>Hoje</span>
        </div>
      </div>

      {/* Selected date info */}
      {selectedDate && (
        <div className="mt-6 upcoming-card animate-scale-in">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground capitalize">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
          </div>
          {selectedSchedule ? (
            <div>
              <p className="text-foreground mb-2">
                Você está escalado como: <strong>{
                  myRole?.function_type === 'lead_vocal' ? 'Vocal Principal' :
                  myRole?.function_type === 'backing_vocal' ? 'Backing Vocal' :
                  myRole?.function_type === 'sound_tech' ? 'Técnico de Som' :
                  myRole?.function_detail || 'Instrumentista'
                }</strong>
              </p>
              {selectedSchedule.songs && selectedSchedule.songs.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground mb-1">Repertório:</p>
                  <ul className="text-sm space-y-1">
                    {selectedSchedule.songs.map((s, i) => (
                      <li key={s.id} className="text-foreground">
                        {i + 1}. {s.song?.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button 
                className="w-full mt-4" 
                onClick={() => navigate(`/schedules/${selectedSchedule.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Escala
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Você não está escalado para este dia.
            </p>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
