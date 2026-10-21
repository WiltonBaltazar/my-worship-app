import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Hand, Loader2, Megaphone, User, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useAvailabilityResponses,
  useCloseAvailabilityCall,
  useOpenAvailabilityCall,
  type AvailabilityResponse,
} from '@/hooks/useAvailabilityCalls';
import { useAddScheduleMember, type Schedule } from '@/hooks/useSchedules';

type AssignableFunction = 'lead_vocal' | 'backing_vocal' | 'instrumentalist';

const functionOptions: Array<{ value: AssignableFunction; label: string }> = [
  { value: 'lead_vocal', label: 'Vocal Principal' },
  { value: 'backing_vocal', label: 'Backing Vocal' },
  { value: 'instrumentalist', label: 'Instrumentista' },
];

const instrumentLabels: Record<string, string> = {
  guitar: 'Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  acoustic_guitar: 'Violão',
  violin: 'Violino',
  percussion: 'Percussão',
  other: 'Outro',
};

const voiceLabels: Record<string, string> = {
  lead: 'Voz principal',
  soprano: 'Soprano',
  alto: 'Alto',
  tenor: 'Tenor',
  bass_voice: 'Baixo (voz)',
};

function formatDeadline(deadline: string) {
  return format(new Date(deadline), "dd/MM 'às' HH:mm", { locale: ptBR });
}

function suggestFunction(response: AvailabilityResponse): AssignableFunction {
  const profile = response.profile;
  if (profile?.voices.includes('lead')) return 'lead_vocal';
  if (profile && profile.instruments.length > 0) return 'instrumentalist';
  return 'backing_vocal';
}

function ResponderRow({ scheduleId, response }: { scheduleId: string; response: AvailabilityResponse }) {
  const addMemberMutation = useAddScheduleMember();
  const profile = response.profile;
  const [functionType, setFunctionType] = useState<AssignableFunction>(() => suggestFunction(response));
  const [functionDetail, setFunctionDetail] = useState(
    () => (profile?.instruments[0] ? instrumentLabels[profile.instruments[0]] ?? profile.instruments[0] : ''),
  );

  if (!profile) {
    return null;
  }

  const skills = [
    ...profile.voices.map((voice) => voiceLabels[voice] ?? voice),
    ...profile.instruments.map((instrument) => instrumentLabels[instrument] ?? instrument),
  ];

  const handleAssign = () => {
    addMemberMutation.mutate({
      schedule_id: scheduleId,
      profile_id: profile.id,
      function_type: functionType,
      function_detail: functionType === 'instrumentalist' ? functionDetail.trim() || undefined : undefined,
    });
  };

  return (
    <div className="admin-surface-muted space-y-3 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{profile.name}</p>
          <p className="truncate text-xs text-slate-500">{skills.length > 0 ? skills.join(' · ') : 'Sem habilidades registradas'}</p>
        </div>
        {response.is_scheduled && (
          <Badge className="shrink-0 bg-success/10 text-success">
            <Check className="mr-1 h-3 w-3" />
            Na escala
          </Badge>
        )}
      </div>

      {!response.is_scheduled && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={functionType} onValueChange={(value) => setFunctionType(value as AssignableFunction)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {functionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {functionType === 'instrumentalist' && (
            <Input
              value={functionDetail}
              onChange={(event) => setFunctionDetail(event.target.value)}
              placeholder="Instrumento"
              className="sm:flex-1"
              maxLength={255}
            />
          )}
          <Button onClick={handleAssign} disabled={addMemberMutation.isPending} className="sm:ml-auto">
            {addMemberMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

export function AvailabilityCallPanel({ schedule }: { schedule: Schedule }) {
  const hasCall = !!schedule.availability_call;
  const { data, isLoading } = useAvailabilityResponses(schedule.id, hasCall);
  const openCallMutation = useOpenAvailabilityCall();
  const closeCallMutation = useCloseAvailabilityCall();
  const [deadline, setDeadline] = useState('');

  const isOpen = data?.is_open ?? schedule.availability_call?.is_open ?? false;
  const currentDeadline = data?.deadline ?? schedule.availability_call?.deadline ?? null;
  const available = (data?.responses ?? []).filter((response) => response.available);
  const unavailableCount = (data?.responses ?? []).length - available.length;

  const handleOpen = () => {
    openCallMutation.mutate(
      { scheduleId: schedule.id, deadline: deadline ? new Date(deadline).toISOString() : null },
      { onSuccess: () => setDeadline('') },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Convocatória</h2>
          {hasCall && (
            <Badge variant="outline" className={isOpen ? 'border-green-300 text-green-700' : 'text-slate-500'}>
              {isOpen ? 'Aberta' : 'Encerrada'}
            </Badge>
          )}
        </div>
        {isOpen && (
          <Button variant="outline" size="sm" onClick={() => closeCallMutation.mutate(schedule.id)} disabled={closeCallMutation.isPending}>
            <X className="mr-1 h-4 w-4" />
            Encerrar
          </Button>
        )}
      </div>

      {isOpen ? (
        <p className="text-sm text-slate-500">
          Os membros do ministério podem confirmar se podem participar
          {currentDeadline ? ` até ${formatDeadline(currentDeadline)}` : ''}. Defina a função de quem confirmou.
        </p>
      ) : (
        <div className="admin-surface-muted space-y-3 p-3">
          <p className="text-sm text-slate-600">
            {hasCall
              ? 'A convocatória está encerrada. Você pode reabri-la para receber mais respostas.'
              : 'Pergunte aos membros do ministério quem pode participar desta escala.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-1 sm:flex-1">
              <Label htmlFor={`call-deadline-${schedule.id}`} className="text-xs text-slate-500">
                Prazo para responder (opcional)
              </Label>
              <Input
                id={`call-deadline-${schedule.id}`}
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
            <Button onClick={handleOpen} disabled={openCallMutation.isPending}>
              {openCallMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
              {hasCall ? 'Reabrir convocatória' : 'Abrir convocatória'}
            </Button>
          </div>
        </div>
      )}

      {hasCall && (
        isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Hand className="h-4 w-4 text-green-600" />
                {available.length} pode(m) participar
              </span>
              <span>·</span>
              <span>{unavailableCount} não pode(m)</span>
            </div>
            {available.map((response) => (
              <ResponderRow key={response.id} scheduleId={schedule.id} response={response} />
            ))}
            {available.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-slate-500">
                Ninguém confirmou disponibilidade ainda.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
