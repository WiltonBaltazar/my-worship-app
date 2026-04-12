import { useState } from 'react';
import { Calendar, Eye, Check, RefreshCw, Users, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RequestSubstituteDialog } from '@/components/schedule/RequestSubstituteDialog';
import { useAuth } from '@/contexts/AuthContext';
import { type Schedule, type ScheduleMember } from '@/hooks/useSchedules';
import { useCreateSubstituteRequests } from '@/hooks/useSubstituteRequests';

interface UpcomingSchedule {
  id: string;
  date: Date;
  role: string;
  isScheduled: boolean;
  schedule?: Schedule;
}

interface UpcomingSchedulesProps {
  schedules: UpcomingSchedule[];
}

const functionTypeLabels: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

export function UpcomingSchedules({ schedules }: UpcomingSchedulesProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const createSubstituteRequestsMutation = useCreateSubstituteRequests();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<ScheduleMember | null>(null);

  const handleRequestChange = (schedule: Schedule, membership: ScheduleMember) => {
    setSelectedSchedule(schedule);
    setSelectedMembership(membership);
    setChangeDialogOpen(true);
  };

  const submitChangeRequest = async (substituteProfileIds: string[]) => {
    if (selectedSchedule && profile && selectedMembership) {
      try {
        const scheduleDate = new Date(`${selectedSchedule.schedule_date}T${selectedSchedule.start_time || '11:00'}`);
        await createSubstituteRequestsMutation.mutateAsync({
          scheduleMemberId: selectedMembership.id,
          candidateProfileIds: substituteProfileIds,
          requesterName: profile.name,
          scheduleDate: format(scheduleDate, "dd 'de' MMMM", { locale: ptBR }),
          scheduleId: selectedSchedule.id,
        });
        setChangeDialogOpen(false);
        setSelectedSchedule(null);
        setSelectedMembership(null);
      } catch {
        // toast handled in hook
      }
    }
  };

  return (
    <>
      <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Próximas escalas</h3>
          <Link to="/schedules" className="text-sm font-semibold text-primary hover:underline">
            Ver todas
          </Link>
        </div>

        <div className="upcoming-card">
          <ul className="space-y-2">
            {schedules.map((item) => {
              const formattedDate = format(item.date, "dd 'de' MMMM", {
                locale: ptBR,
              });

              const isExpanded = expandedId === item.id;
              const myMembership = item.schedule?.members?.find((member) => member.profile_id === profile?.id);

              return (
                <li key={item.id}>
                  <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedId(open ? item.id : null)}>
                    <CollapsibleTrigger asChild>
                      <button className="-mx-2 flex min-h-11 w-full touch-manipulation items-center justify-between gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary/55">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>

                          <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">{formattedDate}</span>
                              <Badge variant="outline" className="text-[11px]">
                                Culto
                              </Badge>
                              {myMembership?.confirmed && <Check className="h-3.5 w-3.5 text-success" />}
                            </div>
                            <span className="text-sm text-muted-foreground">{item.isScheduled ? item.role : 'Não escalado'}</span>
                          </div>
                        </div>

                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pt-2">
                      {item.schedule && (
                        <div className="space-y-3 rounded-2xl border border-border/65 bg-card/65 p-3">
                          {item.schedule.members && item.schedule.members.length > 0 && (
                            <div>
                              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Users className="h-4 w-4" />
                                Equipe ({item.schedule.members.length})
                              </div>

                              <div className="space-y-1.5">
                                {item.schedule.members.slice(0, 5).map((member) => (
                                  <div key={member.id} className="flex items-center gap-2 text-sm">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                      {member.profile?.avatar_url ? (
                                        <img
                                          src={member.profile.avatar_url}
                                          alt={member.profile.name}
                                          className="h-5 w-5 rounded-full object-cover"
                                        />
                                      ) : (
                                        <User className="h-2.5 w-2.5 text-primary" />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-foreground">{member.profile?.name}</p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {functionTypeLabels[member.function_type] || member.function_detail || 'Instrumentista'}
                                      </p>
                                    </div>

                                    {member.confirmed && <Check className="ml-auto h-3 w-3 shrink-0 text-success" />}
                                  </div>
                                ))}

                                {item.schedule.members.length > 5 && (
                                  <p className="text-xs text-muted-foreground">+{item.schedule.members.length - 5} outros</p>
                                )}
                              </div>
                            </div>
                          )}

                          {myMembership && (
                            <Button
                              variant="request"
                              size="sm"
                              className="w-full"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRequestChange(item.schedule!, myMembership);
                              }}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Solicitar troca
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate(`/schedules/${item.schedule!.id}`)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Ver detalhes
                          </Button>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <RequestSubstituteDialog
        open={changeDialogOpen}
        onOpenChange={setChangeDialogOpen}
        schedule={selectedSchedule}
        myMembership={selectedMembership}
        onSubmit={submitChangeRequest}
        isLoading={createSubstituteRequestsMutation.isPending}
      />
    </>
  );
}
