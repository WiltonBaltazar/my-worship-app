import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock, Mail, Save, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useUpdateProfile } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

const instruments = [
  { value: 'guitar', label: 'Guitarra' },
  { value: 'bass', label: 'Baixo' },
  { value: 'drums', label: 'Bateria' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'acoustic_guitar', label: 'Violão' },
  { value: 'violin', label: 'Violino' },
  { value: 'percussion', label: 'Percussão' },
  { value: 'sound_tech', label: 'Técnico de Som' },
  { value: 'other', label: 'Outro' },
];

const voiceTypes = [
  { value: 'lead', label: 'Voz Principal (Dirigente)' },
  { value: 'soprano', label: 'Primeira Voz (Soprano)' },
  { value: 'alto', label: 'Segunda Voz (Alto/Contralto)' },
  { value: 'tenor', label: 'Terceira Voz (Tenor)' },
  { value: 'bass_voice', label: 'Voz Grave (Baixo)' },
];

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: profiles } = useProfiles();
  const updateProfileMutation = useUpdateProfile();
  
  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedVoices, setSelectedVoices] = useState<string[]>([]);
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile || !profiles) {
      return;
    }

    const currentProfile = profiles.find((item) => item.id === profile.id);

    if (!currentProfile) {
      return;
    }

    setSelectedInstruments(currentProfile.instruments ?? []);
    setSelectedVoices(currentProfile.voices ?? []);
  }, [profile, profiles]);

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

  const handleUpdateSkills = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!profile?.id) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        profileId: profile.id,
        updates: {},
        instruments: selectedInstruments,
        voices: selectedVoices,
      });
    } catch {
      // Toast is handled by hook.
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'E-mail inválido', variant: 'destructive' });
      return;
    }

    setIsUpdatingProfile(true);

    try {
      await apiRequest('/api/auth/me', {
        method: 'PATCH',
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
        },
      });

      await refreshProfile();
      toast({ title: 'Perfil atualizado!' });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar perfil', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({ title: 'A nova senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await apiRequest('/api/auth/password', {
        method: 'PATCH',
        body: {
          password: newPassword,
        },
      });

      toast({ title: 'Senha atualizada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar senha', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!profile) {
    return (
      <div className="page-container flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="mb-6 animate-fade-in">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-2 -ml-2" 
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Editar Perfil</h1>
        <p className="text-muted-foreground">Atualize suas informações</p>
      </header>

      {/* Profile Info */}
      <Card className="mb-6 border-none shadow-soft animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6 border-none shadow-soft animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle className="text-lg">Habilidades</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateSkills} className="space-y-4">
            <div className="space-y-2">
              <Label>Instrumentos</Label>
              <div className="grid grid-cols-2 gap-2">
                {instruments.map((instrument) => (
                  <div key={instrument.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-profile-instrument-${instrument.value}`}
                      checked={selectedInstruments.includes(instrument.value)}
                      onCheckedChange={() => toggleInstrument(instrument.value)}
                    />
                    <Label htmlFor={`edit-profile-instrument-${instrument.value}`} className="cursor-pointer text-sm">
                      {instrument.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vocais</Label>
              <div className="grid grid-cols-1 gap-2">
                {voiceTypes.map((voice) => (
                  <div key={voice.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-profile-voice-${voice.value}`}
                      checked={selectedVoices.includes(voice.value)}
                      onCheckedChange={() => toggleVoice(voice.value)}
                    />
                    <Label htmlFor={`edit-profile-voice-${voice.value}`} className="cursor-pointer text-sm">
                      {voice.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" variant="outline" className="w-full" disabled={updateProfileMutation.isPending || !profile?.id}>
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Habilidades
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="mb-24 border-none shadow-soft animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                minLength={6}
                required
              />
            </div>

            <Button type="submit" variant="outline" className="w-full" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Atualizar Senha
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <BottomNav />
    </div>
  );
}
