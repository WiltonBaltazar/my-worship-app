import { useState } from 'react';
import { Calendar, Music, Eye, Check, RefreshCw, Users, User } from 'lucide-react';
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
          scheduleId: schedule.id,
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Próxima escala</h3>
          <Badge variant="outline" className="rounded-full border-primary/35 bg-primary/10 text-primary">
            Confirmação ativa
          </Badge>
        </div>

        <div className="schedule-card relative overflow-hidden">
          <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-white/20 blur-3xl" />

          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">Culto</Badge>
              {schedule.title && (
                <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                  {schedule.title}
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 opacity-90" />
              <span className="font-semibold leading-snug">{capitalizedDate}</span>
            </div>

            {myMembership && (
              <div className="flex items-start gap-3">
                <Music className="mt-0.5 h-5 w-5 opacity-90" />
                <span className="text-primary-foreground/95">Sua função: <strong>{getMyRole()}</strong></span>
              </div>
            )}

            {schedule.members && schedule.members.length > 0 && (
              <div className="rounded-2xl border border-white/18 bg-background/45 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Users className="h-4 w-4" />
                  Equipe ({schedule.members.length})
                </div>

                <div className="space-y-1.5">
                  {schedule.members.slice(0, 4).map((member) => (
                    <div key={member.id} className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        {member.profile?.avatar_url ? (
                          <img
                            src={member.profile.avatar_url}
                            alt={member.profile.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-3 w-3 text-primary" />
                        )}
                      </div>

                      <span className="truncate font-semibold text-primary-foreground">{member.profile?.name}</span>
                      <span className="text-xs text-primary-foreground/90">
                        ({functionTypeLabels[member.function_type] || member.function_detail || 'Instrumentista'})
                      </span>

                      {member.confirmed && <Check className="ml-auto h-3 w-3 shrink-0 text-success" />}
                    </div>
                  ))}

                  {schedule.members.length > 4 && (
                    <p className="text-xs text-primary-foreground/82">+{schedule.members.length - 4} outros</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {myMembership && (
                <Button variant="request" className="w-full" onClick={handleRequestChange}>
                  <RefreshCw className="h-4 w-4" />
                  Solicitar troca
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/schedules/${schedule.id}`)}
                className="w-full"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver detalhes completos
              </Button>
            </div>
          </div>
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
