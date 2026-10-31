import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { type Profile, useUpdateProfile } from '@/hooks/useProfiles';
import { MINISTRY_LABELS } from '@/lib/ministry';

const instruments = [
  { value: 'guitar', label: 'Guitarra' },
  { value: 'bass', label: 'Baixo' },
  { value: 'drums', label: 'Bateria' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'acoustic_guitar', label: 'Violão' },
  { value: 'violin', label: 'Violino' },
  { value: 'percussion', label: 'Percussão' },
  { value: 'other', label: 'Outro' },
];

const voiceTypes = [
  { value: 'lead', label: 'Voz Principal (Dirigente)' },
  { value: 'soprano', label: 'Primeira Voz (Soprano)' },
  { value: 'alto', label: 'Segunda Voz (Alto/Contralto)' },
  { value: 'tenor', label: 'Terceira Voz (Tenor)' },
  { value: 'bass_voice', label: 'Voz Grave (Baixo)' },
];

const homeGroups = [
  { value: 'GHH', label: 'Grupo Homegénio de Homens (GHH)' },
  { value: 'GHS', label: 'Grupo Homegénio de Senhoras (GHS)' },
  { value: 'GHJ', label: 'Grupo Homegénio de Jovens (GHJ)' },
  { value: 'GHC', label: 'Grupo Homegénio de Crianças (GHC)' },
] as const;

interface EditMemberDialogProps {
  member: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemberDialog({ member, open, onOpenChange }: EditMemberDialogProps) {
  const updateProfileMutation = useUpdateProfile();
  const pauseMutation = useUpdateProfile();
  const { isAdmin, canManageMinistry, ledMinistries } = useAuth();
  // Mirrors the server: leaders can pause members of the ministries they lead.
  const canPause = isAdmin || ledMinistries.some((ministry) =>
    ministry === 'ghj' ? member.home_group === 'GHJ' : member.in_dms);
  const canEditDmsRoster = isAdmin || canManageMinistry('dms');
  const canEditLeadership = isAdmin && member.role === 'leader';

  const [name, setName] = useState(member.name);
  const [homeGroup, setHomeGroup] = useState<Profile['home_group']>(member.home_group);
  const [canLead, setCanLead] = useState(member.can_lead);
  const [canBeTechLead, setCanBeTechLead] = useState(member.can_be_tech_lead);
  const [canBeTechSound, setCanBeTechSound] = useState(member.can_be_tech_sound);
  const [canBeTechStreaming, setCanBeTechStreaming] = useState(member.can_be_tech_streaming);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(member.instruments ?? []);
  const [selectedVoices, setSelectedVoices] = useState<string[]>(member.voices ?? []);
  const [inDms, setInDms] = useState(member.in_dms);
  const [leadsDms, setLeadsDms] = useState(member.leads_dms);
  const [leadsGhj, setLeadsGhj] = useState(member.leads_ghj);

  useEffect(() => {
    setName(member.name);
    setHomeGroup(member.home_group);
    setCanLead(member.can_lead);
    setCanBeTechLead(member.can_be_tech_lead);
    setCanBeTechSound(member.can_be_tech_sound);
    setCanBeTechStreaming(member.can_be_tech_streaming);
    setSelectedInstruments(member.instruments ?? []);
    setSelectedVoices(member.voices ?? []);
    setInDms(member.in_dms);
    setLeadsDms(member.leads_dms);
    setLeadsGhj(member.leads_ghj);
  }, [member]);

  const toggleInstrument = (value: string) => {
    setSelectedInstruments((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  };

  const toggleVoice = (value: string) => {
    setSelectedVoices((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (!isAdmin) {
        // DMS leaders may only maintain the DMS roster.
        await updateProfileMutation.mutateAsync({ profileId: member.id, updates: { in_dms: inDms } });
        onOpenChange(false);
        return;
      }

      await updateProfileMutation.mutateAsync({
        profileId: member.id,
        updates: {
          name,
          home_group: homeGroup,
          in_dms: inDms,
          can_lead: canLead,
          can_be_tech_lead: canBeTechLead,
          can_be_tech_sound: canBeTechSound,
          can_be_tech_streaming: canBeTechStreaming,
          ...(canEditLeadership ? { leads_dms: leadsDms, leads_ghj: leadsGhj } : {}),
        },
        instruments: selectedInstruments,
        voices: selectedVoices,
      });

      onOpenChange(false);
    } catch {
      // Toast is handled by hook.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {canPause && (
            <div
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${member.is_paused ? 'border-warning/50 bg-warning/10' : 'border-border'}`}
            >
              <div>
                <Label htmlFor="edit-member-paused" className="cursor-pointer text-sm font-medium">
                  Escalas pausadas
                </Label>
                <p className="text-xs text-muted-foreground">
                  {member.is_paused
                    ? `Pausado${member.pause_ministry ? ` no ${MINISTRY_LABELS[member.pause_ministry]}` : ''}${member.paused_at ? ` desde ${new Date(member.paused_at).toLocaleDateString('pt-BR')}` : ''}. Não será escalado nem convocado.`
                    : 'Pausa o membro até ser retomado. Salva na hora.'}
                </p>
              </div>
              <Switch
                id="edit-member-paused"
                checked={Boolean(member.is_paused)}
                onCheckedChange={(checked) =>
                  pauseMutation.mutate({ profileId: member.id, updates: {}, isPaused: checked })}
                disabled={pauseMutation.isPending}
              />
            </div>
          )}

          {canEditDmsRoster && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <Label htmlFor="edit-member-in-dms" className="cursor-pointer text-sm font-medium">
                  Membro do DMS
                </Label>
                <p className="text-xs text-muted-foreground">Pode ser escalado nas escalas do DMS.</p>
              </div>
              <Switch id="edit-member-in-dms" checked={inDms} onCheckedChange={setInDms} />
            </div>
          )}

          {canEditLeadership && (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <Label className="text-sm font-medium">Liderança</Label>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="edit-member-leads-dms" className="cursor-pointer text-sm">
                  Lidera DMS
                </Label>
                <Switch id="edit-member-leads-dms" checked={leadsDms} onCheckedChange={setLeadsDms} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="edit-member-leads-ghj" className="cursor-pointer text-sm">
                  Lidera GHJ
                </Label>
                <Switch id="edit-member-leads-ghj" checked={leadsGhj} onCheckedChange={setLeadsGhj} />
              </div>
            </div>
          )}

          <fieldset disabled={!isAdmin} className="space-y-4 disabled:opacity-60">
            <div className="space-y-2">
              <Label htmlFor="edit-member-name">Nome completo</Label>
              <Input
                id="edit-member-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={member.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-member-home-group">Grupo Homegénio</Label>
              <Select
                value={homeGroup ?? 'none'}
                onValueChange={(value) => setHomeGroup(value === 'none' ? null : value as Profile['home_group'])}
              >
                <SelectTrigger id="edit-member-home-group">
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {homeGroups.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-member-can-lead"
                checked={canLead}
                onCheckedChange={(checked) => setCanLead(checked === true)}
              />
              <Label htmlFor="edit-member-can-lead" className="cursor-pointer">
                Pode dirigir o louvor
              </Label>
            </div>

            <div className="space-y-2 rounded-xl border border-border p-3">
              <Label className="text-sm font-medium">Escala técnica de som</Label>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-member-tech-lead"
                    checked={canBeTechLead}
                    onCheckedChange={(checked) => setCanBeTechLead(checked === true)}
                  />
                  <Label htmlFor="edit-member-tech-lead" className="cursor-pointer text-sm">
                    Pode atuar como Lead técnico
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-member-tech-sound"
                    checked={canBeTechSound}
                    onCheckedChange={(checked) => setCanBeTechSound(checked === true)}
                  />
                  <Label htmlFor="edit-member-tech-sound" className="cursor-pointer text-sm">
                    Pode atuar no Som
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-member-tech-streaming"
                    checked={canBeTechStreaming}
                    onCheckedChange={(checked) => setCanBeTechStreaming(checked === true)}
                  />
                  <Label htmlFor="edit-member-tech-streaming" className="cursor-pointer text-sm">
                    Pode atuar no Streaming
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instrumentos</Label>
              <div className="grid grid-cols-2 gap-2">
                {instruments.map((instrument) => (
                  <div key={instrument.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-member-instrument-${instrument.value}`}
                      checked={selectedInstruments.includes(instrument.value)}
                      onCheckedChange={() => toggleInstrument(instrument.value)}
                    />
                    <Label htmlFor={`edit-member-instrument-${instrument.value}`} className="cursor-pointer text-sm">
                      {instrument.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vocais</Label>
              <div className="grid grid-cols-2 gap-2">
                {voiceTypes.map((voice) => (
                  <div key={voice.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-member-voice-${voice.value}`}
                      checked={selectedVoices.includes(voice.value)}
                      onCheckedChange={() => toggleVoice(voice.value)}
                    />
                    <Label htmlFor={`edit-member-voice-${voice.value}`} className="cursor-pointer text-sm">
                      {voice.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
