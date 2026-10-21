import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Loader2, Repeat, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAcceptSubstituteRequest,
  useMySubstituteRequests,
  useRejectSubstituteRequest,
} from '@/hooks/useSubstituteRequests';

const functionLabels: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

/**
 * Lets the person asked to cover someone accept or refuse right on the schedule page,
 * which is where the "Solicitação de troca" notification takes them.
 */
export function SubstituteRequestPrompt({ scheduleId }: { scheduleId: string }) {
  const { user } = useAuth();
  const { data: requests } = useMySubstituteRequests(user?.id);
  const acceptMutation = useAcceptSubstituteRequest();
  const rejectMutation = useRejectSubstituteRequest();

  const pending = (requests ?? []).filter(
    (request) => request.status === 'pending' && request.schedule_member?.schedule_id === scheduleId,
  );

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pending.map((request) => {
        const member = request.schedule_member;
        const requesterName = member?.profile?.name ?? 'Um membro';
        const role = member?.function_detail || functionLabels[member?.function_type ?? ''] || 'membro da equipe';
        const date = member?.schedule?.schedule_date
          ? format(new Date(`${member.schedule.schedule_date}T00:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })
          : null;
        const isBusy =
          (acceptMutation.isPending && acceptMutation.variables?.requestId === request.id)
          || (rejectMutation.isPending && rejectMutation.variables?.requestId === request.id);

        return (
          <Card key={request.id} className="space-y-3 border-orange-300 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                <Repeat className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Pedido de substituição</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{requesterName}</span> pediu para você substituí-lo(a) como{' '}
                  <span className="font-medium text-foreground">{role}</span>
                  {date ? <span className="capitalize"> — {date}</span> : null}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="rounded-xl bg-success text-success-foreground hover:bg-success/90"
                disabled={isBusy}
                onClick={() =>
                  acceptMutation.mutate({
                    requestId: request.id,
                    scheduleMemberId: request.schedule_member_id,
                    candidateProfileId: request.candidate_profile_id,
                    candidateName: request.candidate_profile?.name ?? '',
                    functionType: member?.function_type ?? '',
                    functionDetail: member?.function_detail ?? null,
                  })}
              >
                {isBusy && acceptMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                Aceitar
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={isBusy}
                onClick={() => rejectMutation.mutate({ requestId: request.id, candidateName: request.candidate_profile?.name ?? '' })}
              >
                {isBusy && rejectMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                Recusar
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
