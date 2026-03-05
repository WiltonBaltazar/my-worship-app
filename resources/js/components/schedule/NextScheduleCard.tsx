import { useState } from 'react';
import { Calendar, Music, Eye, Check, RefreshCw, Users, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequestSubstituteDialog } from '@/components/schedule/RequestSubstituteDialog';
import { useAuth } from '@/contexts/AuthContext';
import { type Schedule, type ScheduleMember } from '@/hooks/useSchedules';
import { useCreateSubstituteRequests } from '@/hooks/useSubstituteRequests';

interface NextScheduleCardProps {
  schedule: Schedule;
  myMembership?: ScheduleMember | null;
}

const functionTypeLabels: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

export function NextScheduleCard({ schedule, myMembership }: NextScheduleCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createSubstituteRequestsMutation = useCreateSubstituteRequests();
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);

  const date = new Date(`${schedule.schedule_date}T${schedule.start_time || '11:00'}`);
  const formattedDate = format(date, "EEEE, dd 'de' MMMM 'às' HH'h'mm", {
    locale: ptBR,
  });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  
  const getMyRole = () => {
    if (!myMembership) return 'Membro';
    return functionTypeLabels[myMembership.function_type] || myMembership.function_detail || 'Instrumentista';
  };

  const handleRequestChange = () => {
    setChangeDialogOpen(true);
  };

  const submitChangeRequest = async (substituteProfileIds: string[]) => {
    if (schedule && profile && myMembership) {
      try {
        await createSubstituteRequestsMutation.mutateAsync({
          scheduleMemberId: myMembership.id,
          candidateProfileIds: substituteProfileIds,
          requesterName: profile.name,
          scheduleDate: format(date, "dd 'de' MMMM", { locale: ptBR }),
          scheduleId: schedule.id
        });
        setChangeDialogOpen(false);
      } catch {
        // toast handled in hook
      }
    }
  };

  return (
    <>
      <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Próxima escala</h3>
        <div className="schedule-card">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="default">Culto</Badge>
            {schedule.title && <span className="font-medium  text-white text-foreground">{schedule.title}</span>}
          </div>
          
          {/* Date and time */}
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 opacity-90" />
            <span className="font-medium">{capitalizedDate}</span>
          </div>
          
          {/* My role */}
          {myMembership && (
            <div className="flex items-center gap-3 mb-4">
              <Music className="h-5 w-5 opacity-90" />
              <span className="opacity-90">Sua função: {getMyRole()}</span>
            </div>
          )}

          {/* Team preview */}
          {schedule.members && schedule.members.length > 0 && (
            <div className="mb-4 p-3 bg-background/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-sm text-white font-medium">
                <Users className="h-4 w-4" />
                Equipe ({schedule.members.length})
              </div>
              <div className="space-y-1.5">
                {schedule.members.slice(0, 4).map(member => (
                  <div key={member.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {member.profile?.avatar_url ? (
                        <img 
                          src={member.profile.avatar_url} 
                          alt={member.profile.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    <span className="text-foreground font-bold truncate">{member.profile?.name}</span>
                    <span className="text-black text-xs">
                      ({functionTypeLabels[member.function_type] || member.function_detail || 'Instrumentista'})
                    </span>
                    {member.confirmed && <Check className="h-3 w-3 text-success ml-auto shrink-0" />}
                  </div>
                ))}
                {schedule.members.length > 4 && (
                  <p className="text-xs text-muted-foreground">+{schedule.members.length - 4} outros</p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {myMembership && (
            <div className="flex gap-3 mb-3">
              <Button
                variant="request"
                className="flex-1"
                onClick={handleRequestChange}
              >
                <RefreshCw className="h-4 w-4" />
                Solicitar troca
              </Button>
            </div>
          )}

          {/* View details button */}
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate(`/schedules/${schedule.id}`)}
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver detalhes completos
          </Button>
        </div>
      </section>

      <RequestSubstituteDialog
        open={changeDialogOpen}
        onOpenChange={setChangeDialogOpen}
        schedule={schedule}
        myMembership={myMembership || null}
        onSubmit={submitChangeRequest}
        isLoading={createSubstituteRequestsMutation.isPending}
      />
    </>
  );
}
