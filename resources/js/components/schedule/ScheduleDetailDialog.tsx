import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Music2, Users, User, Check, Clock, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Schedule } from '@/hooks/useSchedules';

interface ScheduleDetailDialogProps {
  schedule: Schedule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewSongDetails?: (songId: string) => void;
}

const functionTypeLabels: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

export function ScheduleDetailDialog({ 
  schedule, 
  open, 
  onOpenChange,
  onViewSongDetails 
}: ScheduleDetailDialogProps) {
  if (!schedule) return null;

  const formattedDate = format(
    new Date(schedule.schedule_date), 
    "EEEE, dd 'de' MMMM 'de' yyyy", 
    { locale: ptBR }
  );
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-4 sm:w-full sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Detalhes da Escala
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date and Time */}
          <div className="schedule-card">
            <p className="font-medium text-lg">{capitalizedDate}</p>
            {schedule.start_time && (
              <div className="flex items-center gap-2 mt-2 opacity-90">
                <Clock className="h-4 w-4" />
                <span>{schedule.start_time.slice(0, 5)}</span>
              </div>
            )}
            {schedule.notes && (
              <p className="mt-3 text-sm opacity-80">{schedule.notes}</p>
            )}
          </div>

          {/* Team Members */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Equipe ({schedule.members?.length || 0})</h3>
            </div>
            
            <div className="space-y-2">
              {schedule.members?.map(member => (
                <div 
                  key={member.id}
                  className="flex flex-col gap-3 rounded-xl bg-secondary/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {member.profile?.avatar_url ? (
                        <img 
                          src={member.profile.avatar_url} 
                          alt={member.profile.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{member.profile?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {functionTypeLabels[member.function_type] || member.function_type}
                        {member.function_detail && ` - ${member.function_detail}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {member.confirmed && (
                      <Badge className="bg-success/10 text-success border-0">
                        <Check className="h-3 w-3 mr-1" />
                        Confirmado
                      </Badge>
                    )}
                    {member.requested_change && (
                      <Badge variant="outline" className="text-orange-700 border-orange-400">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Troca
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {(!schedule.members || schedule.members.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum membro escalado ainda
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Songs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Music2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Repertório ({schedule.songs?.length || 0})</h3>
            </div>
            
            <div className="space-y-2">
              {schedule.songs?.map((scheduleSong, index) => (
                <div 
                  key={scheduleSong.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{scheduleSong.song?.title}</p>
                      {scheduleSong.song?.artist && (
                        <p className="text-sm text-muted-foreground truncate">{scheduleSong.song.artist}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewSongDetails?.(scheduleSong.song?.id || scheduleSong.song_id)}
                      className="px-2 text-primary hover:text-primary"
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              ))}

              {(!schedule.songs || schedule.songs.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma música adicionada ainda
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
