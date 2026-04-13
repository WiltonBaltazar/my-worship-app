import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Music,
  Mic2,
  LogOut,
  Shield,
  Edit,
  Loader2,
  CheckCircle2,
  Bell,
  CalendarDays,
  Plus,
  Save,
  Wrench,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/layout/BottomNav';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useApproveProfile, usePendingProfiles, useProfiles, useUpdateProfile } from '@/hooks/useProfiles';
import { toLocalDateInputValue } from '@/lib/date-time';

const instrumentLabels: Record<string, string> = {
  guitar: 'Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  acoustic_guitar: 'Violão',
  violin: 'Violino',
  percussion: 'Percussão',
  other: 'Outro'
};

const voiceLabels: Record<string, string> = {
  lead: 'Voz Principal (Dirigente)',
  soprano: 'Primeira Voz (Soprano)',
  alto: 'Segunda Voz (Alto/Contralto)',
  tenor: 'Terceira Voz (Tenor)',
  bass_voice: 'Voz Grave (Baixo)'
};

export default function Profile() {
  const { profile, signOut, isAdmin, isLeader, roles } = useAuth();
  const { isSubscribed, permission } = usePushNotifications();
  const { preferences, update: updatePreferences, isPending: isUpdatingPrefs } = useNotificationPreferences();
  const pushIsActive = permission === 'granted' && isSubscribed;
  const { data: profiles } = useProfiles();
  const { data: pendingProfiles, isLoading: isLoadingPendingProfiles } = usePendingProfiles(isAdmin);
  const approveProfileMutation = useApproveProfile();
  const updateProfileMutation = useUpdateProfile();
  const navigate = useNavigate();
  const minUnavailableDate = toLocalDateInputValue();

  const myProfile = profiles?.find(p => p.id === profile?.id);
  const [newUnavailableDate, setNewUnavailableDate] = useState('');
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleApproveRequest = (profileId: string) => {
    approveProfileMutation.mutate(profileId);
  };

  useEffect(() => {
    if (!myProfile) {
      return;
    }

    setUnavailableDates([...(myProfile.unavailable_dates ?? [])].sort());
  }, [myProfile]);

  const handleAddUnavailableDate = () => {
    if (!newUnavailableDate) {
      return;
    }

    setUnavailableDates((previous) => {
      if (previous.includes(newUnavailableDate)) {
        return previous;
      }

      return [...previous, newUnavailableDate].sort();
    });
    setNewUnavailableDate('');
  };

  const handleRemoveUnavailableDate = (date: string) => {
    setUnavailableDates((previous) => previous.filter((item) => item !== date));
  };

  const handleSaveUnavailableDates = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!profile?.id) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        profileId: profile.id,
        updates: {},
        unavailableDates,
      });
    } catch {
      // Toast is handled by hook.
    }
  };

  const initials = profile?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="page-container">
      <header className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground">Suas informações e configurações</p>
      </header>

      {/* Profile card */}
      <div className="repertoire-card mb-6 animate-slide-up">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 border-4 border-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{profile?.name}</h2>
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="text-sm break-all">{profile?.email}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile?.can_lead && (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                  Pode dirigir
                </Badge>
              )}
              {isAdmin && (
                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              {isLeader && !isAdmin && (
                <Badge className="bg-accent/10 text-accent hover:bg-accent/20">
                  Líder
                </Badge>
              )}
              {roles.includes('sound_tech') && !isLeader && !isAdmin && (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                  <Wrench className="mr-1 h-3 w-3" />
                  Técnico de Som
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => navigate('/profile/edit')}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Perfil
        </Button>
      </div>

      <div className="repertoire-card mb-6 animate-slide-up" style={{ animationDelay: '0.03s' }}>
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Indisponibilidade</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Marque datas em que você não pode ser escalado.
        </p>

        <form onSubmit={handleSaveUnavailableDates} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-unavailable-date">Adicionar data indisponível</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="profile-unavailable-date"
                type="date"
                value={newUnavailableDate}
                onChange={(event) => setNewUnavailableDate(event.target.value)}
                min={minUnavailableDate}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleAddUnavailableDate}
                disabled={!newUnavailableDate || updateProfileMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Datas marcadas</Label>
            {unavailableDates.length > 0 ? (
              <div className="space-y-2">
                {unavailableDates.map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{date}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUnavailableDate(date)}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma data marcada.</p>
            )}
          </div>

          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={updateProfileMutation.isPending || !profile?.id}
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar indisponibilidade
              </>
            )}
          </Button>
        </form>
      </div>

      <div className="repertoire-card mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Instalar App</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Instale o app para acesso rápido e agilidade no teu celular.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <InstallAppButton />
          </div>
        </div>
      </div>

      <div className="repertoire-card mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Notificações Push</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ative para receber alertas de escala e solicitações de troca em tempo real.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <PushNotificationToggle hideIfUnsupported={false} />
          </div>
        </div>
      </div>

      {pushIsActive && (
        <div className="repertoire-card mb-6 animate-slide-up" style={{ animationDelay: '0.06s' }}>
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Preferências de notificação</h3>
          </div>
          <div className="space-y-3">
            {([
              { key: 'schedule', label: 'Escalas', description: 'Quando for escalado ou removido' },
              { key: 'confirmation', label: 'Confirmações', description: 'Confirmações de participação' },
              { key: 'substitute_request', label: 'Substituições', description: 'Pedidos de substituição' },
              { key: 'announcement', label: 'Anúncios', description: 'Avisos gerais do ministério' },
            ] as const).map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={preferences[key]}
                  onCheckedChange={(checked) => void updatePreferences({ [key]: checked })}
                  disabled={isUpdatingPrefs}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="repertoire-card mb-6 animate-slide-up" style={{ animationDelay: '0.07s' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Solicitações de acesso</h3>
            <Badge variant="secondary">
              {pendingProfiles?.length || 0}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Aprove membros que pediram para entrar no aplicativo.
          </p>

          {isLoadingPendingProfiles ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando solicitações...
            </div>
          ) : pendingProfiles && pendingProfiles.length > 0 ? (
            <div className="space-y-3">
              {pendingProfiles.map((pendingProfile) => (
                <div
                  key={pendingProfile.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{pendingProfile.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{pendingProfile.email}</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => handleApproveRequest(pendingProfile.id)}
                    disabled={approveProfileMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem solicitações pendentes.</p>
          )}
        </div>
      )}

      {/* Skills section */}
      <div className="space-y-4 mb-6">
        {myProfile?.instruments && myProfile.instruments.length > 0 && (
          <div className="repertoire-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Music className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Instrumentos</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {myProfile.instruments.map(instrument => (
                <Badge key={instrument} variant="secondary">
                  {instrumentLabels[instrument] || instrument}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {myProfile?.voices && myProfile.voices.length > 0 && (
          <div className="repertoire-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Mic2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Vocais</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {myProfile.voices.map(voice => (
                <Badge key={voice} variant="secondary">
                  {voiceLabels[voice] || voice}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        {(isAdmin || isLeader) && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.location.assign('/admin-app/schedules')}
          >
            <Shield className="h-5 w-5 mr-3" />
            Área Administrativa
          </Button>
        )}
        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
