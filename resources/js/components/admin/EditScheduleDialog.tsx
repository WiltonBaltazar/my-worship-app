import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Loader2,
  Music2,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProfiles } from '@/hooks/useProfiles';
import {
  useAddScheduleMember,
  useRemoveScheduleMemberById,
  useSchedules,
  useSetScheduleMemberEditPermission,
  useSyncScheduleSongs,
  useUpdateSchedule,
  useUpdateScheduleMemberFunction,
} from '@/hooks/useSchedules';
import { useSongs } from '@/hooks/useSongs';
import { AddSongDialog } from '@/components/admin/AddSongDialog';
import { HALF_HOUR_TIME_OPTIONS, toLocalDateInputValue } from '@/lib/date-time';

interface EditScheduleDialogProps {
  scheduleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const functionTypes = [
  { value: 'lead_vocal', label: 'Vocal Principal' },
  { value: 'backing_vocal', label: 'Backing Vocal' },
  { value: 'instrumentalist', label: 'Instrumentista' },
] as const;

const instrumentLabels: Record<string, string> = {
  guitar: 'Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  acoustic_guitar: 'Violão',
  violin: 'Violino',
  percussion: 'Percussão',
  sound_tech: 'Técnico de Som',
  other: 'Outro',
};

const voiceLabels: Record<string, string> = {
  lead: 'Voz Principal (Dirigente)',
  soprano: 'Primeira Voz (Soprano)',
  alto: 'Segunda Voz (Alto/Contralto)',
  tenor: 'Terceira Voz (Tenor)',
  bass_voice: 'Voz Grave (Baixo)',
};

const functionTypeLabel: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

function timeToInput(time?: string | null): string {
  if (!time) {
    return '11:00';
  }

  return time.slice(0, 5);
}

function isProfileUnavailableOnDate(
  profile: { unavailable_dates?: string[] | null },
  scheduleDate?: string | null,
): boolean {
  if (!scheduleDate) {
    return false;
  }

  return (profile.unavailable_dates ?? []).includes(scheduleDate);
}

function isTechOnlyProfile(profile: {
  can_lead: boolean;
  can_be_tech_lead: boolean;
  can_be_tech_sound: boolean;
  can_be_tech_streaming: boolean;
  instruments?: string[] | null;
  voices?: string[] | null;
}): boolean {
  const hasTechnicalCapability = profile.can_be_tech_lead || profile.can_be_tech_sound || profile.can_be_tech_streaming;

  if (!hasTechnicalCapability) {
    return false;
  }

  const hasNormalCapability = profile.can_lead
    || (profile.voices ?? []).length > 0
    || (profile.instruments ?? []).some((instrument) => instrument !== 'sound_tech');

  return !hasNormalCapability;
}

export function EditScheduleDialog({ scheduleId, open, onOpenChange }: EditScheduleDialogProps) {
  const { data: schedules } = useSchedules();
  const { data: profiles } = useProfiles();
  const { data: songs } = useSongs();
  const minScheduleDate = toLocalDateInputValue();

  const updateScheduleMutation = useUpdateSchedule();
  const addMemberMutation = useAddScheduleMember();
  const removeMemberMutation = useRemoveScheduleMemberById();
  const setMemberEditPermissionMutation = useSetScheduleMemberEditPermission();
  const updateMemberFunctionMutation = useUpdateScheduleMemberFunction();
  const syncSongsMutation = useSyncScheduleSongs();

  const schedule = useMemo(
    () => schedules?.find((item) => item.id === scheduleId) ?? null,
    [schedules, scheduleId],
  );

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedFunctionType, setSelectedFunctionType] = useState('');
  const [functionDetail, setFunctionDetail] = useState('');

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editFunctionType, setEditFunctionType] = useState('');
  const [editFunctionDetail, setEditFunctionDetail] = useState('');

  const [songSearch, setSongSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState('');
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);

  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('11:00');
  const [scheduleTitle, setScheduleTitle] = useState('');

  useEffect(() => {
    if (!schedule) {
      return;
    }

    setScheduleDate(schedule.schedule_date);
    setStartTime(timeToInput(schedule.start_time));
    setScheduleTitle(schedule.title ?? '');
  }, [schedule]);

  useEffect(() => {
    if (!open) {
      setSelectedProfileId('');
      setMemberSearch('');
      setSelectedFunctionType('');
      setFunctionDetail('');
      setSongSearch('');
      setSelectedSongId('');
      setAddSongDialogOpen(false);
      setEditingMemberId(null);
    }
  }, [open]);

  const availableProfiles = useMemo(() => {
    if (!profiles || !schedule) {
      return [];
    }

    const existingProfileIds = new Set(schedule.members?.map((member) => member.profile_id) ?? []);

    return profiles.filter(
      (profile) =>
        profile.role !== 'admin' &&
        !existingProfileIds.has(profile.id) &&
        !isTechOnlyProfile(profile) &&
        !isProfileUnavailableOnDate(profile, schedule.schedule_date),
    );
  }, [profiles, schedule]);

  const unavailableProfileCount = useMemo(() => {
    if (!profiles || !schedule) {
      return 0;
    }

    const existingProfileIds = new Set(schedule.members?.map((member) => member.profile_id) ?? []);

    return profiles.filter(
      (profile) =>
        profile.role !== 'admin' &&
        !existingProfileIds.has(profile.id) &&
        !isTechOnlyProfile(profile) &&
        isProfileUnavailableOnDate(profile, schedule.schedule_date),
    ).length;
  }, [profiles, schedule]);

  const selectedProfile = useMemo(
    () => availableProfiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [availableProfiles, selectedProfileId],
  );

  const filteredAvailableProfiles = useMemo(() => {
    if (!memberSearch.trim()) {
      return availableProfiles;
    }

    const normalizedQuery = memberSearch.toLowerCase();

    return availableProfiles.filter((profile) => {
      return (
        profile.name.toLowerCase().includes(normalizedQuery) ||
        profile.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [availableProfiles, memberSearch]);

  const instrumentFunctionOptions = useMemo(() => {
    if (!selectedProfile) {
      return [];
    }

    return (selectedProfile.instruments ?? [])
      .filter((instrument) => instrument !== 'sound_tech')
      .map((instrument) => instrumentLabels[instrument] ?? instrument);
  }, [selectedProfile]);

  const allVoiceFunctionOptions = useMemo(() => {
    if (!selectedProfile) {
      return [];
    }

    return (selectedProfile.voices ?? []).map((voice) => voiceLabels[voice] ?? voice);
  }, [selectedProfile]);

  const backingVoiceFunctionOptions = useMemo(
    () => allVoiceFunctionOptions.filter((voice) => voice !== voiceLabels.lead),
    [allVoiceFunctionOptions],
  );

  const voiceFunctionOptions = useMemo(() => {
    if (selectedFunctionType === 'backing_vocal') {
      return backingVoiceFunctionOptions;
    }

    return allVoiceFunctionOptions;
  }, [allVoiceFunctionOptions, backingVoiceFunctionOptions, selectedFunctionType]);

  const availableFunctionTypes = useMemo(() => {
    if (!selectedProfile) {
      return [];
    }

    return functionTypes.filter((item) => {
      if (item.value === 'instrumentalist') {
        return instrumentFunctionOptions.length > 0;
      }

      if (item.value === 'backing_vocal') {
        return backingVoiceFunctionOptions.length > 0;
      }

      if (item.value === 'lead_vocal') {
        return Boolean(selectedProfile.can_lead) || allVoiceFunctionOptions.length > 0;
      }

      return true;
    });
  }, [allVoiceFunctionOptions.length, backingVoiceFunctionOptions.length, instrumentFunctionOptions.length, selectedProfile]);

  const editingMemberProfile = useMemo(() => {
    if (!editingMemberId || !schedule) return null;
    const member = schedule.members?.find((m) => m.id === editingMemberId);
    return profiles?.find((p) => p.id === member?.profile_id) ?? null;
  }, [editingMemberId, schedule, profiles]);

  const editInstrumentOptions = useMemo(() => {
    if (!editingMemberProfile) return [];
    return (editingMemberProfile.instruments ?? [])
      .filter((i) => i !== 'sound_tech')
      .map((i) => instrumentLabels[i] ?? i);
  }, [editingMemberProfile]);

  const editAllVoiceOptions = useMemo(() => {
    if (!editingMemberProfile) return [];
    return (editingMemberProfile.voices ?? []).map((v) => voiceLabels[v] ?? v);
  }, [editingMemberProfile]);

  const editVoiceOptions = useMemo(() => {
    if (editFunctionType === 'backing_vocal') {
      return editAllVoiceOptions.filter((v) => v !== voiceLabels.lead);
    }
    return editAllVoiceOptions;
  }, [editAllVoiceOptions, editFunctionType]);

  const editAvailableFunctionTypes = useMemo(() => {
    if (!editingMemberProfile) return [];
    return functionTypes.filter((item) => {
      if (item.value === 'instrumentalist') return editInstrumentOptions.length > 0;
      if (item.value === 'backing_vocal') return editAllVoiceOptions.filter((v) => v !== voiceLabels.lead).length > 0;
      if (item.value === 'lead_vocal') return Boolean(editingMemberProfile.can_lead) || editAllVoiceOptions.length > 0;
      return true;
    });
  }, [editingMemberProfile, editInstrumentOptions, editAllVoiceOptions]);

  useEffect(() => {
    setSelectedFunctionType('');
    setFunctionDetail('');
  }, [selectedProfileId]);

  useEffect(() => {
    if (!selectedFunctionType) {
      return;
    }

    const isFunctionTypeAvailable = availableFunctionTypes.some((item) => item.value === selectedFunctionType);

    if (!isFunctionTypeAvailable) {
      setSelectedFunctionType('');
      setFunctionDetail('');
    }
  }, [availableFunctionTypes, selectedFunctionType]);

  useEffect(() => {
    if (selectedFunctionType !== 'instrumentalist') {
      return;
    }

    if (!functionDetail && instrumentFunctionOptions.length === 1) {
      setFunctionDetail(instrumentFunctionOptions[0]);
      return;
    }

    if (functionDetail && !instrumentFunctionOptions.includes(functionDetail)) {
      setFunctionDetail('');
    }
  }, [functionDetail, instrumentFunctionOptions, selectedFunctionType]);

  useEffect(() => {
    if (selectedFunctionType !== 'lead_vocal' && selectedFunctionType !== 'backing_vocal') {
      return;
    }

    if (!functionDetail && voiceFunctionOptions.length === 1) {
      setFunctionDetail(voiceFunctionOptions[0]);
      return;
    }

    if (functionDetail && !voiceFunctionOptions.includes(functionDetail)) {
      setFunctionDetail('');
    }
  }, [functionDetail, selectedFunctionType, voiceFunctionOptions]);

  const availableSongs = useMemo(() => {
    if (!songs || !schedule) {
      return [];
    }

    const existingSongIds = new Set(schedule.songs?.map((song) => song.song_id) ?? []);

    return songs
      .filter((song) => !existingSongIds.has(song.id))
      .filter((song) => {
        if (!songSearch.trim()) {
          return true;
        }

        const normalizedQuery = songSearch.toLowerCase();

        return (
          song.title.toLowerCase().includes(normalizedQuery) ||
          (song.artist ?? '').toLowerCase().includes(normalizedQuery)
        );
      });
  }, [songSearch, songs, schedule]);

  const selectedSong = useMemo(
    () => availableSongs.find((song) => song.id === selectedSongId) ?? null,
    [availableSongs, selectedSongId],
  );

  useEffect(() => {
    if (!selectedSongId) {
      return;
    }

    const stillAvailable = availableSongs.some((song) => song.id === selectedSongId);

    if (!stillAvailable) {
      setSelectedSongId('');
    }
  }, [availableSongs, selectedSongId]);

  useEffect(() => {
    if (!selectedProfileId) {
      return;
    }

    const stillAvailable = availableProfiles.some((profile) => profile.id === selectedProfileId);

    if (!stillAvailable) {
      setSelectedProfileId('');
      setSelectedFunctionType('');
      setFunctionDetail('');
    }
  }, [availableProfiles, selectedProfileId]);

  const handleSaveSettings = async () => {
    if (!schedule) {
      return;
    }

    const nextTitle = scheduleTitle.trim();
    const updates: {
      id: string;
      schedule_date?: string;
      start_time: string;
      title: string | null;
    } = {
      id: schedule.id,
      start_time: startTime,
      title: nextTitle || null,
    };

    if (scheduleDate !== schedule.schedule_date) {
      updates.schedule_date = scheduleDate;
    }

    try {
      await updateScheduleMutation.mutateAsync(updates);
    } catch {
      // Toast is handled by hook.
    }
  };

  const handleAddMember = async () => {
    if (!schedule || !selectedProfileId || !selectedFunctionType) {
      return;
    }

    try {
      await addMemberMutation.mutateAsync({
        schedule_id: schedule.id,
        profile_id: selectedProfileId,
        function_type: selectedFunctionType as 'lead_vocal' | 'backing_vocal' | 'instrumentalist',
        function_detail: functionDetail || undefined,
      });

      setSelectedProfileId('');
      setMemberSearch('');
      setSelectedFunctionType('');
      setFunctionDetail('');
    } catch {
      // Toast is handled by hook.
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMemberMutation.mutateAsync(memberId);
    } catch {
      // Toast is handled by hook.
    }
  };

  const handleSaveMemberFunction = async (memberId: string) => {
    if (!editFunctionType) return;
    try {
      await updateMemberFunctionMutation.mutateAsync({
        memberId,
        function_type: editFunctionType as 'lead_vocal' | 'backing_vocal' | 'instrumentalist',
        function_detail: editFunctionDetail || null,
      });
      setEditingMemberId(null);
    } catch {
      // Toast is handled by hook.
    }
  };

  const handleToggleMemberEditPermission = async (memberId: string, canEdit: boolean) => {
    try {
      await setMemberEditPermissionMutation.mutateAsync({ memberId, canEdit });
    } catch {
      // Toast is handled by hook.
    }
  };

  const syncSongList = async (
    nextSongs: Array<{
      song_id: string;
      order_position: number;
      notes: string | null;
    }>,
  ) => {
    if (!schedule) {
      return;
    }

    await syncSongsMutation.mutateAsync({
      scheduleId: schedule.id,
      songs: nextSongs,
    });
  };

  const handleSongCreated = async (newSong: { id: string }) => {
    if (!schedule) return;
    const currentSongs = schedule.songs ?? [];
    try {
      await syncSongList([
        ...currentSongs.map((song, index) => ({
          song_id: song.song_id,
          order_position: index,
          notes: song.notes,
        })),
        { song_id: newSong.id, order_position: currentSongs.length, notes: null },
      ]);
      setSongSearch('');
    } catch {
      // Toast handled by hook.
    }
  };

  const handleAddSong = async () => {
    if (!schedule || !selectedSongId) {
      return;
    }

    const currentSongs = schedule.songs ?? [];
    const nextSongs = [
      ...currentSongs.map((song, index) => ({
        song_id: song.song_id,
        order_position: index,
        notes: song.notes,
      })),
      {
        song_id: selectedSongId,
        order_position: currentSongs.length,
        notes: null,
      },
    ];

    try {
      await syncSongList(nextSongs);
      setSelectedSongId('');
      setSongSearch('');
    } catch {
      // Toast is handled by hook.
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!schedule) {
      return;
    }

    const nextSongs = (schedule.songs ?? [])
      .filter((song) => song.id !== songId)
      .map((song, index) => ({
        song_id: song.song_id,
        order_position: index,
        notes: song.notes,
      }));

    try {
      await syncSongList(nextSongs);
    } catch {
      // Toast is handled by hook.
    }
  };

  const isBusy =
    updateScheduleMutation.isPending ||
    addMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    setMemberEditPermissionMutation.isPending ||
    updateMemberFunctionMutation.isPending ||
    syncSongsMutation.isPending;

  const needsVoiceDetail = (selectedFunctionType === 'lead_vocal' || selectedFunctionType === 'backing_vocal') && voiceFunctionOptions.length > 0;
  const needsInstrumentDetail = selectedFunctionType === 'instrumentalist' && instrumentFunctionOptions.length > 0;
  const requiresFunctionDetail = needsVoiceDetail || needsInstrumentDetail;
  const canAddMember = Boolean(selectedProfileId && selectedFunctionType && (!requiresFunctionDetail || functionDetail));

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-4xl overflow-x-hidden overflow-y-auto p-4 sm:w-full sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl lg:text-4xl">Editar Escala</DialogTitle>
        </DialogHeader>

        {!schedule ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="settings" className="min-w-0 space-y-4">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl p-1 sm:grid sm:grid-cols-3 sm:justify-center sm:gap-0 sm:overflow-visible">
              <TabsTrigger value="settings" className="shrink-0 gap-2 rounded-xl py-2 text-sm sm:w-full sm:justify-center md:text-base">
                <Settings className="h-4 w-4" />
                <span className="sm:hidden">Config.</span>
                <span className="hidden sm:inline">Configurações</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="shrink-0 gap-2 rounded-xl py-2 text-sm sm:w-full sm:justify-center md:text-base">
                <Users className="h-4 w-4" />
                <span className="sm:hidden">Membros</span>
                <span className="hidden sm:inline">Membros ({schedule.members?.length ?? 0})</span>
              </TabsTrigger>
              <TabsTrigger value="songs" className="shrink-0 gap-2 rounded-xl py-2 text-sm sm:w-full sm:justify-center md:text-base">
                <Music2 className="h-4 w-4" />
                <span className="sm:hidden">Músicas</span>
                <span className="hidden sm:inline">Músicas ({schedule.songs?.length ?? 0})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <div className="rounded-2xl bg-secondary/50 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-schedule-date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data
                    </Label>
                    <Input
                      id="edit-schedule-date"
                      type="date"
                      value={scheduleDate}
                      onChange={(event) => setScheduleDate(event.target.value)}
                      min={minScheduleDate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-schedule-time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário
                    </Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger id="edit-schedule-time">
                        <SelectValue placeholder="Selecione o horário" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {HALF_HOUR_TIME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="schedule-title">Título</Label>
                  <Input
                    id="schedule-title"
                    value={scheduleTitle}
                    onChange={(event) => setScheduleTitle(event.target.value)}
                    placeholder="Ex: Culto de Domingo"
                    maxLength={255}
                  />
                </div>

                <Button onClick={handleSaveSettings} className="mt-4 w-full" disabled={updateScheduleMutation.isPending}>
                  {updateScheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Configurações
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <div className="rounded-2xl bg-secondary/50 p-4">
                <Label className="mb-3 block">Adicionar membro</Label>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                      className="pl-10"
                      placeholder="Buscar membro por nome..."
                    />
                  </div>

                  {selectedProfile && (
                    <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {selectedProfile.avatar_url ? (
                            <img
                              src={selectedProfile.avatar_url}
                              alt={selectedProfile.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{selectedProfile.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{selectedProfile.email}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedProfileId('')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                    {filteredAvailableProfiles.length > 0 ? (
                      filteredAvailableProfiles.slice(0, 20).map((profile) => (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => setSelectedProfileId(profile.id)}
                          className={`w-full min-h-11 touch-manipulation rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary ${
                            selectedProfileId === profile.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.name} className="h-8 w-8 rounded-full object-cover" />
                              ) : (
                                <User className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{profile.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                            </div>
                            {selectedProfileId === profile.id && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        {availableProfiles.length === 0 ? 'Nenhum membro disponível' : 'Nenhum membro encontrado'}
                      </p>
                    )}
                  </div>

                  {filteredAvailableProfiles.length > 20 && (
                    <p className="text-xs text-muted-foreground">
                      Mostrando 20 de {filteredAvailableProfiles.length}. Continue digitando para filtrar mais.
                    </p>
                  )}

                  {unavailableProfileCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {unavailableProfileCount} membro(s) não aparecem porque marcaram indisponibilidade para esta data.
                    </p>
                  )}

                  <Select
                    value={selectedFunctionType}
                    onValueChange={(value) => {
                      setSelectedFunctionType(value);
                      setFunctionDetail('');
                    }}
                  >
                    <SelectTrigger disabled={!selectedProfile || availableFunctionTypes.length === 0}>
                      <SelectValue
                        placeholder={
                          !selectedProfile
                            ? 'Selecione o membro primeiro'
                            : availableFunctionTypes.length === 0
                              ? 'Membro sem funções configuradas'
                              : 'Função'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFunctionTypes.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                      {selectedProfile && availableFunctionTypes.length === 0 && (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          Este membro não tem funções configuradas.
                        </div>
                      )}
                    </SelectContent>
                  </Select>

                  {selectedFunctionType === 'instrumentalist' && (
                    <Select value={functionDetail} onValueChange={setFunctionDetail}>
                      <SelectTrigger disabled={instrumentFunctionOptions.length === 0}>
                        <SelectValue
                          placeholder={
                            instrumentFunctionOptions.length === 0
                              ? 'Sem instrumentos configurados'
                              : 'Selecione o instrumento'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {instrumentFunctionOptions.map((instrument) => (
                          <SelectItem key={instrument} value={instrument}>
                            {instrument}
                          </SelectItem>
                        ))}
                        {instrumentFunctionOptions.length === 0 && (
                          <div className="p-2 text-center text-sm text-muted-foreground">Sem instrumentos configurados</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  {(selectedFunctionType === 'lead_vocal' || selectedFunctionType === 'backing_vocal') && (
                    <Select value={functionDetail} onValueChange={setFunctionDetail}>
                      <SelectTrigger disabled={voiceFunctionOptions.length === 0}>
                        <SelectValue
                          placeholder={
                            voiceFunctionOptions.length === 0
                              ? 'Sem vozes configuradas'
                              : 'Selecione o tipo de voz'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceFunctionOptions.map((voice) => (
                          <SelectItem key={voice} value={voice}>
                            {voice}
                          </SelectItem>
                        ))}
                        {voiceFunctionOptions.length === 0 && (
                          <div className="p-2 text-center text-sm text-muted-foreground">Sem vozes configuradas</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedProfile && availableFunctionTypes.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Atualize instrumentos e vocais desse membro em Membros antes de escalar.
                    </p>
                  )}

                  <Button
                    className="w-full"
                    disabled={!canAddMember || addMemberMutation.isPending}
                    onClick={handleAddMember}
                  >
                    {addMemberMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Adicionar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {(schedule.members ?? []).map((member) => (
                  <div key={member.id} className="space-y-3 rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          {member.profile?.avatar_url ? (
                            <img src={member.profile.avatar_url} alt={member.profile.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{member.profile?.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {functionTypeLabel[member.function_type] || member.function_type}
                            {member.function_detail ? ` - ${member.function_detail}` : ''}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {member.confirmed && (
                              <Badge className="bg-success/10 text-success">
                                <Check className="mr-1 h-3 w-3" />
                                Confirmado
                              </Badge>
                            )}
                            {member.requested_change && (
                              <Badge variant="outline" className="border-orange-400 text-orange-700">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Solicitou troca
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (editingMemberId === member.id) {
                              setEditingMemberId(null);
                            } else {
                              setEditingMemberId(member.id);
                              setEditFunctionType(member.function_type);
                              setEditFunctionDetail(member.function_detail ?? '');
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={removeMemberMutation.isPending}
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {editingMemberId === member.id && (
                      <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <Select
                          value={editFunctionType}
                          onValueChange={(value) => {
                            setEditFunctionType(value);
                            setEditFunctionDetail('');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Função" />
                          </SelectTrigger>
                          <SelectContent>
                            {editAvailableFunctionTypes.map((item) => (
                              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {editFunctionType === 'instrumentalist' && editInstrumentOptions.length > 0 && (
                          <Select value={editFunctionDetail} onValueChange={setEditFunctionDetail}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o instrumento" />
                            </SelectTrigger>
                            <SelectContent>
                              {editInstrumentOptions.map((i) => (
                                <SelectItem key={i} value={i}>{i}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {(editFunctionType === 'lead_vocal' || editFunctionType === 'backing_vocal') && editVoiceOptions.length > 0 && (
                          <Select value={editFunctionDetail} onValueChange={setEditFunctionDetail}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de voz" />
                            </SelectTrigger>
                            <SelectContent>
                              {editVoiceOptions.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={!editFunctionType || updateMemberFunctionMutation.isPending}
                            onClick={() => void handleSaveMemberFunction(member.id)}
                          >
                            {updateMemberFunctionMutation.isPending
                              ? <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              : <Check className="mr-2 h-3 w-3" />}
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingMemberId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2">
                      <Label htmlFor={`member-can-edit-${member.id}`} className="text-sm text-muted-foreground">
                        Pode editar
                      </Label>
                      <Switch
                        id={`member-can-edit-${member.id}`}
                        checked={member.can_edit}
                        onCheckedChange={(checked) => void handleToggleMemberEditPermission(member.id, checked)}
                        disabled={setMemberEditPermissionMutation.isPending}
                      />
                    </div>
                  </div>
                ))}

                {(schedule.members ?? []).length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">Nenhum membro escalado ainda</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="songs" className="space-y-4">
              <div className="rounded-2xl bg-secondary/50 p-4">
                <Label className="mb-3 block">Adicionar música</Label>

                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={songSearch}
                    onChange={(event) => setSongSearch(event.target.value)}
                    className="pl-10"
                    placeholder="Buscar música por título ou artista..."
                  />
                </div>

                {selectedSong && (
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{selectedSong.title}</p>
                      {selectedSong.artist && <p className="truncate text-xs text-muted-foreground">{selectedSong.artist}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedSongId('')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {availableSongs.length > 0 ? (
                    availableSongs.slice(0, 20).map((song) => (
                      <button
                        key={song.id}
                        type="button"
                        onClick={() => setSelectedSongId(song.id)}
                        className={`w-full min-h-11 touch-manipulation rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary ${
                          selectedSongId === song.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Music2 className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{song.title}</p>
                            {song.artist && <p className="truncate text-xs text-muted-foreground">{song.artist}</p>}
                          </div>
                          {selectedSongId === song.id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="space-y-2 py-2">
                      <p className="text-center text-sm text-muted-foreground">Nenhuma música encontrada</p>
                      {songSearch.trim() && (
                        <button
                          type="button"
                          onClick={() => setAddSongDialogOpen(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/5"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar "{songSearch.trim()}" ao repertório
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {availableSongs.length > 20 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mostrando 20 de {availableSongs.length}. Continue digitando para filtrar mais.
                  </p>
                )}

                <div className="mt-3">
                  <Button className="w-full" disabled={!selectedSongId || syncSongsMutation.isPending} onClick={handleAddSong}>
                    {syncSongsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Adicionar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {(schedule.songs ?? []).map((scheduleSong, index) => (
                  <div key={scheduleSong.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{scheduleSong.song?.title ?? 'Música sem título'}</p>
                        {scheduleSong.song?.artist && (
                          <p className="truncate text-sm text-muted-foreground">{scheduleSong.song.artist}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={syncSongsMutation.isPending}
                      onClick={() => handleRemoveSong(scheduleSong.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {(schedule.songs ?? []).length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">Nenhuma música adicionada ainda</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {isBusy && schedule && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-background/30">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </DialogContent>
    </Dialog>

    <AddSongDialog
      open={addSongDialogOpen}
      onOpenChange={setAddSongDialogOpen}
      initialTitle={songSearch.trim()}
      onSongCreated={(song) => void handleSongCreated(song)}
    />
    </>
  );
}
