import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, Calendar, Clock, Music, User, Check, AlertCircle, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { BottomNav } from '@/components/layout/BottomNav';
import { ActionButtons } from '@/components/schedule/ActionButtons';
import { RequestSubstituteDialog } from '@/components/schedule/RequestSubstituteDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchedules, useSetScheduleMemberEditPermission, useSyncScheduleSongs } from '@/hooks/useSchedules';
import { useSongs } from '@/hooks/useSongs';
import { AddSongDialog } from '@/components/admin/AddSongDialog';
import { useCreateSubstituteRequests, useCancelSubstituteRequest } from '@/hooks/useSubstituteRequests';

const functionTypeLabels: Record<string, string> = {
  lead_vocal: 'Vocal Principal',
  backing_vocal: 'Backing Vocal',
  instrumentalist: 'Instrumentista',
  sound_tech: 'Técnico de Som',
};

export default function ScheduleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isAdmin, isLeader } = useAuth();
  const { data: schedules, isLoading } = useMySchedules(profile?.id);
  const { data: songs } = useSongs();
  const createSubstituteRequestsMutation = useCreateSubstituteRequests();
  const cancelSubstituteRequestMutation = useCancelSubstituteRequest();
  const syncSongsMutation = useSyncScheduleSongs();
  const setMemberEditPermissionMutation = useSetScheduleMemberEditPermission();
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState('');
  const [addSongDialogOpen, setAddSongDialogOpen] = useState(false);

  const schedule = schedules?.find(s => s.id === id);
  const myMembership = schedule?.members?.find(m => m.profile_id === profile?.id);
  const canManageSongs = Boolean(
    isAdmin ||
      isLeader ||
      myMembership?.function_type === 'lead_vocal' ||
      myMembership?.can_edit,
  );
  const canManageEditors = Boolean(
    isAdmin || isLeader || myMembership?.function_type === 'lead_vocal',
  );

  const availableSongs = useMemo(() => {
    if (!schedule || !songs) {
      return [];
    }

    const existingSongIds = new Set((schedule.songs ?? []).map((item) => item.song_id));
    const normalizedQuery = songSearch.trim().toLowerCase();

    return songs
      .filter((song) => !existingSongIds.has(song.id))
      .filter((song) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          song.title.toLowerCase().includes(normalizedQuery) ||
          (song.artist ?? '').toLowerCase().includes(normalizedQuery)
        );
      });
  }, [schedule, songSearch, songs]);

  useEffect(() => {
    if (!selectedSongId) {
      return;
    }

    const isStillAvailable = availableSongs.some((song) => song.id === selectedSongId);

    if (!isStillAvailable) {
      setSelectedSongId('');
    }
  }, [availableSongs, selectedSongId]);

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Escala não encontrada</h1>
        </div>
        <BottomNav />
      </div>
    );
  }

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

  const handleCancelRequest = async () => {
    if (myMembership) {
      try {
        await cancelSubstituteRequestMutation.mutateAsync(myMembership.id);
      } catch {
        // toast handled in hook
      }
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
      setSongSearch('');
      setSelectedSongId('');
    } catch {
      // toast handled in hook
    }
  };

  const handleRemoveSong = async (scheduleSongId: string) => {
    if (!schedule) {
      return;
    }

    const nextSongs = (schedule.songs ?? [])
      .filter((song) => song.id !== scheduleSongId)
      .map((song, index) => ({
        song_id: song.song_id,
        order_position: index,
        notes: song.notes,
      }));

    try {
      await syncSongList(nextSongs);
    } catch {
      // toast handled in hook
    }
  };

  const handleToggleMemberEditPermission = async (memberId: string, canEdit: boolean) => {
    try {
      await setMemberEditPermissionMutation.mutateAsync({ memberId, canEdit });
    } catch {
      // toast handled in hook
    }
  };

  const date = new Date(`${schedule.schedule_date}T${schedule.start_time || '11:00'}`);

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Detalhes da Escala</h1>
      </div>

      <div className="space-y-6 pb-20">
        {/* Schedule Header Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="default">Culto</Badge>
            {schedule.title && <span className="font-medium text-foreground">{schedule.title}</span>}
          </div>
          
          <div className="flex items-center gap-3 text-foreground mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5 text-primary" />
            <span>{format(date, "HH:mm")}</span>
          </div>

          {schedule.notes && (
            <p className="mt-3 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
              {schedule.notes}
            </p>
          )}
        </Card>

        {/* Action Buttons for my schedule */}
        {myMembership && (
          <ActionButtons 
            onRequestChange={handleRequestChange}
            onCancelRequest={myMembership.requested_change ? handleCancelRequest : undefined}
            isCanceling={cancelSubstituteRequestMutation.isPending}
            hasRequestedChange={myMembership.requested_change || false}
          />
        )}

        {/* Team Members */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Equipe</h2>
          <div className="space-y-2">
            {schedule.members?.map(member => (
              <Card key={member.id} className="p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {member.profile?.avatar_url ? (
                        <img 
                          src={member.profile.avatar_url} 
                          alt={member.profile.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{member.profile?.name}</span>
                        {member.confirmed && (
                          <Check className="h-4 w-4 text-success shrink-0" />
                        )}
                        {member.requested_change && (
                          <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                        {member.can_edit && (
                          <Badge variant="secondary" className="shrink-0">
                            Editor
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {functionTypeLabels[member.function_type] || 'Instrumentista'}
                        {member.function_detail && ` - ${member.function_detail}`}
                      </span>
                    </div>
                  </div>

                  {canManageEditors && member.profile_id !== profile?.id && (
                    <div className="flex items-center gap-2 self-end shrink-0 sm:self-auto">
                      <span className="text-xs text-muted-foreground">Pode editar</span>
                      <Switch
                        checked={member.can_edit}
                        onCheckedChange={(checked) => void handleToggleMemberEditPermission(member.id, checked)}
                        disabled={setMemberEditPermissionMutation.isPending}
                      />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Songs */}
        {(canManageSongs || (schedule.songs?.length ?? 0) > 0) && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Repertório</h2>

            {canManageSongs && (
              <Card className="mb-3 p-3 space-y-3">
                <p className="text-sm font-medium text-foreground">Adicionar música</p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={songSearch}
                    onChange={(event) => setSongSearch(event.target.value)}
                    className="pl-10"
                    placeholder="Buscar música por título ou artista..."
                  />
                </div>

                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {availableSongs.length > 0 ? (
                    availableSongs.slice(0, 10).map((song) => (
                      <button
                        key={song.id}
                        type="button"
                        onClick={() => setSelectedSongId(song.id)}
                        className={`w-full min-h-11 touch-manipulation rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary ${
                          selectedSongId === song.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <p className="truncate text-sm font-medium text-foreground">{song.title}</p>
                        {song.artist && <p className="truncate text-xs text-muted-foreground">{song.artist}</p>}
                      </button>
                    ))
                  ) : (
                    <div className="space-y-2 py-2">
                      <p className="text-center text-sm text-muted-foreground">Nenhuma música disponível</p>
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

                <Button
                  className="w-full"
                  onClick={handleAddSong}
                  disabled={!selectedSongId || syncSongsMutation.isPending}
                >
                  {syncSongsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Adicionar música
                </Button>
              </Card>
            )}

            <div className="space-y-2">
              {(schedule.songs ?? []).map((scheduleSong, index) => (
                <Card
                  key={scheduleSong.id}
                  className="p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate(`/songs/${scheduleSong.song?.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground truncate block">
                        {index + 1}. {scheduleSong.song?.title}
                      </span>
                      {scheduleSong.song?.artist && (
                        <span className="text-sm text-muted-foreground truncate block">
                          {scheduleSong.song.artist}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageSongs && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={syncSongsMutation.isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRemoveSong(scheduleSong.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {(schedule.songs ?? []).length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma música adicionada ainda.</p>
            )}
          </div>
        )}
      </div>

      <RequestSubstituteDialog
        open={changeDialogOpen}
        onOpenChange={setChangeDialogOpen}
        schedule={schedule}
        myMembership={myMembership || null}
        onSubmit={submitChangeRequest}
        isLoading={createSubstituteRequestsMutation.isPending}
      />

      <AddSongDialog
        open={addSongDialogOpen}
        onOpenChange={setAddSongDialogOpen}
        initialTitle={songSearch.trim()}
        onSongCreated={(song) => void handleSongCreated(song)}
      />

      <BottomNav />
    </div>
  );
}
