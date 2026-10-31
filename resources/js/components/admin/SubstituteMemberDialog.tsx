import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { type Profile, useProfiles } from '@/hooks/useProfiles';
import { type Schedule, type ScheduleMember, useSubstituteMember } from '@/hooks/useSchedules';
import { formatShortDate, initials, instrumentLabels, scheduleDay } from '@/lib/adminDashboard';
import { isProfileUnavailableOnDate } from '@/lib/availability';
import { MINISTRY_LABELS } from '@/lib/ministry';
import { cn } from '@/lib/utils';

const functionLabels: Record<ScheduleMember['function_type'], string> = {
  lead_vocal: 'Vocal principal',
  backing_vocal: 'Backing vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de som',
};

/** Mirrors NormalScheduleEligibility::isTechOnlyProfile on the server. */
function isTechOnly(profile: Profile) {
  const hasTech = profile.can_be_tech_lead || profile.can_be_tech_sound || profile.can_be_tech_streaming;
  const hasNormal =
    profile.can_lead || (profile.voices ?? []).length > 0 || (profile.instruments ?? []).some((instrument) => instrument !== 'sound_tech');
  return hasTech && !hasNormal;
}

function hasMatchingSkill(profile: Profile, member: ScheduleMember) {
  if (member.function_type === 'lead_vocal') return profile.can_lead;
  if (member.function_type === 'backing_vocal') return (profile.voices ?? []).length > 0;
  if (member.function_type === 'instrumentalist') {
    const detail = member.function_detail?.trim().toLowerCase();
    return (profile.instruments ?? []).some((instrument) =>
      detail ? (instrumentLabels[instrument] ?? instrument).toLowerCase() === detail : instrument !== 'sound_tech',
    );
  }
  return false;
}

interface SubstituteMemberDialogProps {
  schedule: Schedule;
  member: ScheduleMember | null;
  onOpenChange: (open: boolean) => void;
}

export function SubstituteMemberDialog({ schedule, member, onOpenChange }: SubstituteMemberDialogProps) {
  const open = member !== null;
  const { data: profiles, isLoading } = useProfiles({ ministry: schedule.ministry, enabled: open });
  const substituteMutation = useSubstituteMember();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    if (!member || !profiles) return [];

    const onSchedule = new Set((schedule.members ?? []).map((entry) => entry.profile_id));
    const invited = new Set((member.pending_substitute_requests ?? []).map((request) => request.candidate_profile?.id));
    const day = scheduleDay(schedule);

    return profiles
      .filter((profile) => !onSchedule.has(profile.id) && profile.role !== 'admin' && !isTechOnly(profile))
      .map((profile) => ({
        profile,
        invited: invited.has(profile.id),
        matches: hasMatchingSkill(profile, member),
        unavailable: isProfileUnavailableOnDate(profile, day, schedule.ministry),
      }))
      .sort(
        (a, b) =>
          Number(a.unavailable) - Number(b.unavailable)
          || Number(b.invited) - Number(a.invited)
          || Number(b.matches) - Number(a.matches)
          || a.profile.name.localeCompare(b.profile.name),
      );
  }, [member, profiles, schedule]);

  const query = search.trim().toLowerCase();
  const visible = query ? candidates.filter(({ profile }) => profile.name.toLowerCase().includes(query)) : candidates;
  const selected = candidates.find(({ profile }) => profile.id === selectedId)?.profile;

  const close = (next: boolean) => {
    if (!next) {
      setSearch('');
      setSelectedId(null);
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    if (!member || !selected) return;
    await substituteMutation.mutateAsync({ memberId: member.id, profileId: selected.id, substituteName: selected.name });
    close(false);
  };

  const role = member ? member.function_detail || functionLabels[member.function_type] : '';

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>Escolher substituto</DialogTitle>
          <DialogDescription>
            {member?.profile?.name ?? 'Membro'} · {role} · {formatShortDate(scheduleDay(schedule))} ({MINISTRY_LABELS[schedule.ministry]}).
            Quem você escolher entra na escala já confirmado(a), e os dois recebem uma notificação.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar membro…"
            className="pl-9"
            aria-label="Buscar membro"
          />
        </div>

        <div role="radiogroup" aria-label="Substitutos" className="-mx-1 max-h-80 space-y-1 overflow-y-auto px-1">
          {isLoading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando membros…
            </p>
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro disponível.</p>
          ) : (
            visible.map(({ profile, invited, matches, unavailable }) => {
              const isSelected = profile.id === selectedId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={unavailable}
                  onClick={() => setSelectedId(profile.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted',
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-muted text-xs font-bold text-foreground">{initials(profile.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{profile.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {unavailable ? 'Indisponível nesta data' : matches ? `Pode assumir: ${role}` : 'Sem essa habilidade cadastrada'}
                    </span>
                  </span>
                  {invited && !unavailable && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary-strong">
                      Convidado(a)
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={!selected || substituteMutation.isPending}>
            {substituteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selected ? `Substituir por ${selected.name.split(' ')[0]}` : 'Substituir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
