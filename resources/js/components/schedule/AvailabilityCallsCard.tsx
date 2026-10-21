import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Clock, Megaphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MinistryBadge } from '@/components/schedule/MinistryBadge';
import { useOpenAvailabilityCalls, useRespondAvailability } from '@/hooks/useAvailabilityCalls';
import { cn } from '@/lib/utils';

export function AvailabilityCallsCard() {
  const { data: calls } = useOpenAvailabilityCalls();
  const respondMutation = useRespondAvailability();

  const pendingCalls = (calls ?? []).filter((call) => !call.is_scheduled);

  if (pendingCalls.length === 0) {
    return null;
  }

  return (
    <section className="repertoire-card space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Quem pode participar?</h2>
      </div>

      <div className="space-y-3">
        {pendingCalls.map((call) => {
          const date = format(new Date(`${call.schedule_date}T00:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR });
          const isSubmitting = respondMutation.isPending && respondMutation.variables?.scheduleId === call.schedule_id;

          return (
            <div key={call.schedule_id} className="rounded-2xl border border-border/70 bg-secondary/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{call.title || 'Culto'}</p>
                <MinistryBadge ministry={call.ministry} />
              </div>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {date} · {call.start_time?.slice(0, 5) ?? '11:00'}
              </p>
              {call.deadline && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Responda até {format(new Date(call.deadline), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant={call.my_response === true ? 'default' : 'outline'}
                  className={cn('rounded-xl', call.my_response === true && 'bg-success text-success-foreground hover:bg-success/90')}
                  disabled={isSubmitting}
                  onClick={() => respondMutation.mutate({ scheduleId: call.schedule_id, available: true })}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Posso participar
                </Button>
                <Button
                  variant={call.my_response === false ? 'secondary' : 'outline'}
                  className="rounded-xl"
                  disabled={isSubmitting}
                  onClick={() => respondMutation.mutate({ scheduleId: call.schedule_id, available: false })}
                >
                  <X className="mr-1 h-4 w-4" />
                  Não posso
                </Button>
              </div>

              {call.my_response === true && (
                <p className="mt-2 text-xs text-muted-foreground">Recebido! A liderança vai definir sua função.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
