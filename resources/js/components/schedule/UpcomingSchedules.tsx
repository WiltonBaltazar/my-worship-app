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
          scheduleId: selectedSchedule.id
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground">Próximas escalas</h3>
          <Link 
            to="/schedules" 
            className="text-sm text-primary hover:underline font-medium"
          >
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
              const myMembership = item.schedule?.members?.find(m => m.profile_id === profile?.id);
              
              return (
                <li key={item.id}>
                  <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedId(open ? item.id : null)}>
                    <CollapsibleTrigger asChild>
                      <button className="flex min-h-11 w-full touch-manipulation items-center justify-between gap-3 -mx-2 rounded-lg p-3 text-left transition-colors hover:bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-medium">
                                {formattedDate}
                              </span>
                              <Badge variant="outline" className="text-xs">Culto</Badge>
                              {myMembership?.confirmed && (
                                <Check className="h-3 w-3 text-success" />
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {item.isScheduled ? item.role : 'Não escalado'}
                            </span>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="pt-2">
                      {item.schedule && (
                        <div className="p-3 bg-secondary/30 rounded-xl space-y-3">
                          {/* Team preview */}
                          {item.schedule.members && item.schedule.members.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                                <Users className="h-4 w-4" />
                                Equipe ({item.schedule.members.length})
                              </div>
                              <div className="space-y-1.5">
                                {item.schedule.members.slice(0, 5).map(member => (
                                  <div key={member.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                      {member.profile?.avatar_url ? (
                                        <img 
                                          src={member.profile.avatar_url} 
                                          alt={member.profile.name}
                                          className="w-5 h-5 rounded-full object-cover"
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
                                    {member.confirmed && <Check className="h-3 w-3 text-success ml-auto shrink-0" />}
                                  </div>
                                ))}
                                {item.schedule.members.length > 5 && (
                                  <p className="text-xs text-muted-foreground">+{item.schedule.members.length - 5} outros</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action buttons for my schedule */}
                          {myMembership && (
                            <div className="flex gap-2">
                              <Button
                                variant="request"
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestChange(item.schedule!, myMembership);
                                }}
                              >
                                <RefreshCw className="h-3 w-3" />
                                Troca
                              </Button>
                            </div>
                          )}

                          {/* View details */}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate(`/schedules/${item.schedule!.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
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
