import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Music, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

const instrumentOptions = [
  { value: 'guitar', label: 'Guitarra' },
  { value: 'bass', label: 'Baixo' },
  { value: 'drums', label: 'Bateria' },
  { value: 'keyboard', label: 'Teclado' },
  { value: 'acoustic_guitar', label: 'Violão' },
  { value: 'violin', label: 'Violino' },
  { value: 'percussion', label: 'Percussão' },
  { value: 'other', label: 'Outro' },
];

const voiceOptions = [
  { value: 'lead', label: 'Voz Principal (Dirigente)' },
  { value: 'soprano', label: 'Primeira Voz (Soprano)' },
  { value: 'alto', label: 'Segunda Voz (Alto/Contralto)' },
  { value: 'tenor', label: 'Terceira Voz (Tenor)' },
  { value: 'bass_voice', label: 'Voz Grave (Baixo)' },
];

const homeGroupOptions = [
  { value: 'GHH', label: 'Grupo Homegénio de Homens (GHH)' },
  { value: 'GHS', label: 'Grupo Homegénio de Senhoras (GHS)' },
  { value: 'GHJ', label: 'Grupo Homegénio de Jovens (GHJ)' },
  { value: 'GHC', label: 'Grupo Homegénio de Crianças (GHC)' },
] as const;

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [homeGroup, setHomeGroup] = useState<(typeof homeGroupOptions)[number]['value'] | null>(null);
  const [canLead, setCanLead] = useState(false);
  const [canBeTechSound, setCanBeTechSound] = useState(false);
  const [canBeTechProjection, setCanBeTechProjection] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedVoices, setSelectedVoices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'setup' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState('');
  const [hasUsers, setHasUsers] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const resetSkills = () => {
    setHomeGroup(null);
    setCanLead(false);
    setCanBeTechSound(false);
    setCanBeTechProjection(false);
    setSelectedInstruments([]);
    setSelectedVoices([]);
  };

  // Check if app needs initial setup (no users exist)
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await apiRequest<{ needs_initial_setup: boolean }>('/api/setup/needs-initial', {
          auth: false,
        });

        if (response.needs_initial_setup) {
          setMode('setup');
          setHasUsers(false);
        }
      } catch {
        // Keep default login mode when setup check fails.
      }
    };

    void checkSetup();
  }, []);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');

    if (requestedMode !== 'reset') {
      return;
    }

    setMode('reset');
    setEmail(searchParams.get('email') ?? '');
    setResetToken(searchParams.get('token') ?? '');
  }, [searchParams]);

  const switchToLogin = () => {
    setMode('login');
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setSearchParams({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'forgot') {
        await apiRequest<{ message: string }>('/api/auth/forgot-password', {
          method: 'POST',
          auth: false,
          body: { email },
        });

        toast({
          title: 'Link enviado',
          description: 'Se o e-mail existir, enviaremos um link para redefinir sua senha.',
        });

        switchToLogin();

        return;
      }

      if (mode === 'reset') {
        if (!resetToken.trim()) {
          toast({
            title: 'Link inválido',
            description: 'Este link de redefinição está incompleto.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          toast({
            title: 'Erro',
            description: 'As senhas não conferem.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        await apiRequest<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          auth: false,
          body: {
            token: resetToken,
            email,
            password,
            password_confirmation: confirmPassword,
          },
        });

        toast({
          title: 'Senha redefinida',
          description: 'Agora você pode entrar com sua nova senha.',
        });

        switchToLogin();

        return;
      }

      if (mode === 'setup') {
        // First user signup - will become admin
        if (!name.trim()) {
          toast({ title: 'Erro', description: 'Por favor, informe seu nome', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        const { error, requiresApproval } = await signUp(email, password, name);
        if (error) throw error;

        if (requiresApproval) {
          toast({
            title: 'Conta criada',
            description: 'Seu acesso precisa ser aprovado por um administrador.',
          });
          setMode('login');
          return;
        }

        toast({ title: 'Conta de administrador criada!', description: 'Você agora é o super admin.' });
        navigate('/dashboard');
      } else if (mode === 'signup') {
        // Team member signup - needs approval
        if (!name.trim()) {
          toast({ title: 'Erro', description: 'Por favor, informe seu nome', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        if (!homeGroup) {
          toast({ title: 'Erro', description: 'Selecione o seu Grupo Homegénio.', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        const { error, requiresApproval } = await signUp(email, password, name, {
          homeGroup,
          canLead,
          canBeTechSound,
          canBeTechProjection,
          instruments: selectedInstruments,
          voices: selectedVoices,
        });
        if (error) throw error;

        toast({
          title: requiresApproval ? 'Solicitação enviada!' : 'Cadastro concluído!',
          description: requiresApproval
            ? 'Aguarde a aprovação do administrador.'
            : 'Sua conta foi criada com sucesso.',
        });

        switchToLogin();
        setName('');
        resetSkills();
      } else {
        // Regular login
        const { error } = await signIn(email, password);
        if (error) throw error;

        toast({ title: 'Bem-vindo de volta!' });
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Credenciais inválidas. Tente novamente.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNameField = mode === 'setup' || mode === 'signup';
  const showSkillsFields = mode === 'signup';
  const showPasswordField = mode !== 'forgot';
  const showConfirmPasswordField = mode === 'reset';
  const isResetLinkInvalid = mode === 'reset' && resetToken.trim() === '';
  const modeTitle =
    mode === 'setup'
      ? 'Configuração inicial'
      : mode === 'forgot'
        ? 'Recuperar acesso'
        : mode === 'reset'
          ? 'Nova senha'
          : mode === 'signup'
            ? 'Solicitação de acesso'
            : 'Bem-vindo de volta';
  const modeDescription =
    mode === 'setup'
      ? 'Crie o primeiro utilizador com permissões de super admin.'
      : mode === 'forgot'
        ? 'Digite o seu e-mail para receber um link de redefinição.'
        : mode === 'reset'
          ? 'Defina uma senha forte para concluir a redefinição.'
          : mode === 'signup'
            ? 'Preencha os seus dados para solicitar acesso da liderança.'
            : 'Entre para ver escalas, repertório e avisos da equipe.';
  const submitLabel = isSubmitting
    ? 'Aguarde...'
    : mode === 'setup'
      ? 'Criar conta admin'
      : mode === 'forgot'
        ? 'Enviar link de redefinição'
        : mode === 'reset'
          ? 'Redefinir senha'
          : mode === 'signup'
            ? 'Solicitar acesso'
            : 'Entrar';

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-16%] top-[-24%] h-[30rem] w-[30rem] rounded-full bg-primary/22 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-22%] right-[-12%] h-[26rem] w-[26rem] rounded-full bg-accent/24 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="relative hidden overflow-hidden rounded-[2.25rem] border border-white/30 bg-[linear-gradient(145deg,hsl(28_92%_56%/.95)_0%,hsl(24_88%_51%/.93)_56%,hsl(20_84%_47%/.86)_100%)] p-8 text-primary-foreground shadow-elevated lg:block">
          <div className="pointer-events-none absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 top-12 h-40 w-40 rounded-full border border-white/35" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/78">Worship Agenda</p>
              <h1 className="mt-5 max-w-md text-5xl font-semibold leading-[1.04] text-primary-foreground">
                Coordenação de louvor com clareza e ritmo.
              </h1>
              <p className="mt-5 max-w-lg text-base text-primary-foreground/86">
                Escalas, repertório e comunicação da equipe em uma experiência única, organizada e confiável.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <article className="rounded-2xl border border-white/30 bg-white/15 p-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.14em] text-primary-foreground/72">Escalas</p>
                  <p className="mt-1 text-xl font-semibold">Sempre</p>
                  <p className="text-sm text-primary-foreground/78">alinhadas</p>
                </article>
                <article className="rounded-2xl border border-white/30 bg-white/15 p-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.14em] text-primary-foreground/72">Equipe</p>
                  <p className="mt-1 text-xl font-semibold">100%</p>
                  <p className="text-sm text-primary-foreground/78">conectada</p>
                </article>
                <article className="rounded-2xl border border-white/30 bg-white/15 p-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.14em] text-primary-foreground/72">Avisos</p>
                  <p className="mt-1 text-xl font-semibold">Em</p>
                  <p className="text-sm text-primary-foreground/78">tempo real</p>
                </article>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/12 p-4 backdrop-blur-sm">
                <p className="text-sm text-primary-foreground/90">
                  Feito para ministérios que querem menos ruído e mais excelência em cada culto.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="relative animate-slide-up">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-white/35 blur-2xl" />
          <div className="rounded-[2rem] border border-border/65 bg-card/82 p-6 shadow-elevated backdrop-blur-xl sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/65 bg-primary text-primary-foreground shadow-card">
                  <Music className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-3xl font-semibold leading-tight text-foreground">WORA</h2>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Worship Agenda</p>
              </div>
              <span className="rounded-full border border-border/65 bg-secondary/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
                {modeTitle}
              </span>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">{modeDescription}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {showNameField && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {showPasswordField && (
                <div className="space-y-2">
                  <Label htmlFor="password">{mode === 'reset' ? 'Nova senha' : 'Senha'}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              {showConfirmPasswordField && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              {isResetLinkInvalid && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  Link de redefinição inválido. Solicite um novo link.
                </div>
              )}

              {showSkillsFields && (
                <div className="space-y-4 rounded-2xl border border-border/70 bg-secondary/38 p-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Conte ao admin o que você pode fazer</Label>
                    <p className="text-xs text-muted-foreground">
                      Essas informações aparecem na solicitação de acesso e ajudam na aprovação.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-home-group" className="text-sm">
                      Grupo Homegénio
                    </Label>
                    <Select
                      value={homeGroup ?? undefined}
                      onValueChange={(value) => setHomeGroup(value as (typeof homeGroupOptions)[number]['value'])}
                    >
                      <SelectTrigger id="signup-home-group">
                        <SelectValue placeholder="Selecione o seu grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {homeGroupOptions.map((group) => (
                          <SelectItem key={group.value} value={group.value}>
                            {group.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="signup-can-lead"
                      checked={canLead}
                      onCheckedChange={(checked) => setCanLead(checked === true)}
                    />
                    <Label htmlFor="signup-can-lead" className="cursor-pointer">
                      Posso liderar o louvor
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Técnico</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="signup-tech-sound"
                          checked={canBeTechSound}
                          onCheckedChange={(checked) => setCanBeTechSound(checked === true)}
                        />
                        <Label htmlFor="signup-tech-sound" className="cursor-pointer text-sm">
                          Técnico de som
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="signup-tech-projection"
                          checked={canBeTechProjection}
                          onCheckedChange={(checked) => setCanBeTechProjection(checked === true)}
                        />
                        <Label htmlFor="signup-tech-projection" className="cursor-pointer text-sm">
                          Técnico de projeção
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Instrumentos</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {instrumentOptions.map((instrument) => (
                        <div key={instrument.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`signup-instrument-${instrument.value}`}
                            checked={selectedInstruments.includes(instrument.value)}
                            onCheckedChange={() => toggleInstrument(instrument.value)}
                          />
                          <Label htmlFor={`signup-instrument-${instrument.value}`} className="cursor-pointer text-sm">
                            {instrument.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Vocais</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {voiceOptions.map((voice) => (
                        <div key={voice.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`signup-voice-${voice.value}`}
                            checked={selectedVoices.includes(voice.value)}
                            onCheckedChange={() => toggleVoice(voice.value)}
                          />
                          <Label htmlFor={`signup-voice-${voice.value}`} className="cursor-pointer text-sm">
                            {voice.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {submitLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {mode === 'login' && hasUsers && (
              <div className="mt-6 space-y-3 border-t border-border/65 pt-5 text-center">
                <p className="text-sm text-muted-foreground">Membro da equipe de louvor?</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    resetSkills();
                    setMode('signup');
                  }}
                >
                  Solicitar acesso
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setPassword('');
                    setConfirmPassword('');
                    setMode('forgot');
                  }}
                >
                  Esqueci minha senha
                </Button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="mt-6 space-y-3 border-t border-border/65 pt-5 text-center">
                <p className="text-sm text-muted-foreground">Já tem uma conta?</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    resetSkills();
                    switchToLogin();
                  }}
                >
                  Fazer login
                </Button>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="mt-6 space-y-3 border-t border-border/65 pt-5 text-center">
                <Button variant="outline" className="w-full" onClick={switchToLogin}>
                  Voltar ao login
                </Button>
              </div>
            )}

            {mode === 'reset' && (
              <div className="mt-6 space-y-3 border-t border-border/65 pt-5 text-center">
                <Button variant="outline" className="w-full" onClick={switchToLogin}>
                  Voltar ao login
                </Button>
              </div>
            )}

            {mode === 'setup' && (
              <div className="mt-6 rounded-xl border border-primary/35 bg-primary/10 p-3">
                <p className="text-center text-sm font-medium text-primary">
                  Configuração inicial: você será o super admin
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
