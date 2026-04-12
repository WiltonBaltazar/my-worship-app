import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Mic,
  Music,
  Music2,
  Settings2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  { value: 'GHH', label: 'Grupo Homogéneo de Homens (GHH)' },
  { value: 'GHS', label: 'Grupo Homogéneo de Senhoras (GHS)' },
  { value: 'GHJ', label: 'Grupo Homogéneo de Jovens (GHJ)' },
  { value: 'GHC', label: 'Grupo Homogéneo de Crianças (GHC)' },
] as const;

function PasswordInput({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  required,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10"
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SkillChip({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
        checked
          ? 'border-primary/50 bg-primary/8 text-foreground font-medium'
          : 'border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="sr-only"
      />
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
        )}
      >
        {checked && (
          <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

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
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [resetToken, setResetToken] = useState('');
  const [hasUsers, setHasUsers] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleInstrument = (value: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  };

  const toggleVoice = (value: string) => {
    setSelectedVoices((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
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
    if (requestedMode !== 'reset') return;
    setMode('reset');
    setEmail(searchParams.get('email') ?? '');
    setResetToken(searchParams.get('token') ?? '');
  }, [searchParams]);

  const switchToLogin = () => {
    setMode('login');
    setSignupStep(1);
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setSearchParams({});
  };

  const handleSignupNext = () => {
    if (!name.trim()) {
      toast({ title: 'Informe seu nome completo', variant: 'destructive' });
      return;
    }
    if (!email.trim()) {
      toast({ title: 'Informe seu e-mail', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setSignupStep(2);
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
          toast({ title: 'Link inválido', description: 'Este link de redefinição está incompleto.', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          toast({ title: 'As senhas não conferem.', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        await apiRequest<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          auth: false,
          body: { token: resetToken, email, password, password_confirmation: confirmPassword },
        });
        toast({ title: 'Senha redefinida', description: 'Agora você pode entrar com sua nova senha.' });
        switchToLogin();
        return;
      }

      if (mode === 'setup') {
        if (!name.trim()) {
          toast({ title: 'Informe seu nome', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }
        const { error, requiresApproval } = await signUp(email, password, name);
        if (error) throw error;
        if (requiresApproval) {
          toast({ title: 'Conta criada', description: 'Seu acesso precisa ser aprovado por um administrador.' });
          setMode('login');
          return;
        }
        toast({ title: 'Conta de administrador criada!' });
        navigate('/dashboard');
      } else if (mode === 'signup') {
        if (!homeGroup) {
          toast({ title: 'Selecione o seu Grupo Homogéneo.', variant: 'destructive' });
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
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: 'Bem-vindo de volta!' });
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Credenciais inválidas. Tente novamente.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isResetLinkInvalid = mode === 'reset' && resetToken.trim() === '';

  // ── Hero copy ──────────────────────────────────────────
  const heroTitle = 'Coordenação de louvor com clareza e ritmo.';
  const heroSub = 'Escalas, repertório e comunicação da equipe em uma experiência organizada e confiável.';

  // ── Form metadata ──────────────────────────────────────
  const modeTitle =
    mode === 'setup' ? 'Configuração inicial'
    : mode === 'forgot' ? 'Recuperar acesso'
    : mode === 'reset' ? 'Nova senha'
    : mode === 'signup' ? 'Solicitar acesso'
    : 'Bem-vindo de volta';

  const modeDescription =
    mode === 'setup' ? 'Crie o primeiro utilizador com permissões de super admin.'
    : mode === 'forgot' ? 'Digite o seu e-mail para receber um link de redefinição.'
    : mode === 'reset' ? 'Defina uma senha forte para concluir a redefinição.'
    : mode === 'signup' ? signupStep === 1
        ? 'Crie suas credenciais de acesso.'
        : 'Conte ao admin quais funções você exerce.'
    : 'Entre para ver escalas, repertório e avisos da equipe.';

  const submitLabel = isSubmitting ? 'Aguarde...'
    : mode === 'setup' ? 'Criar conta admin'
    : mode === 'forgot' ? 'Enviar link de redefinição'
    : mode === 'reset' ? 'Redefinir senha'
    : mode === 'signup' ? 'Solicitar acesso'
    : 'Entrar';

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      {/* Background blobs */}
      <div className="pointer-events-none absolute left-[-16%] top-[-24%] h-[30rem] w-[30rem] rounded-full bg-primary/22 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-22%] right-[-12%] h-[26rem] w-[26rem] rounded-full bg-accent/24 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">

        {/* ── Hero panel (desktop only) ── */}
        <section className="relative hidden overflow-hidden rounded-[2.25rem] border border-white/30 bg-[linear-gradient(145deg,hsl(28_92%_56%/.95)_0%,hsl(24_88%_51%/.93)_56%,hsl(20_84%_47%/.86)_100%)] p-8 text-primary-foreground shadow-elevated lg:block">
          <div className="pointer-events-none absolute -left-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 top-12 h-40 w-40 rounded-full border border-white/35" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/78">Worship Agenda</p>
              <h1 className="mt-5 max-w-md text-5xl font-semibold leading-[1.04] text-primary-foreground">
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-lg text-base text-primary-foreground/86">{heroSub}</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Escalas', value: 'Sempre', sub: 'alinhadas' },
                  { label: 'Equipe', value: '100%', sub: 'conectada' },
                  { label: 'Avisos', value: 'Em', sub: 'tempo real' },
                ].map((stat) => (
                  <article key={stat.label} className="rounded-2xl border border-white/30 bg-white/15 p-3 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-primary-foreground/72">{stat.label}</p>
                    <p className="mt-1 text-xl font-semibold">{stat.value}</p>
                    <p className="text-sm text-primary-foreground/78">{stat.sub}</p>
                  </article>
                ))}
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/12 p-4 backdrop-blur-sm">
                <p className="text-sm text-primary-foreground/90">
                  Feito para ministérios que querem menos ruído e mais excelência em cada culto.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Form card ── */}
        <div className="relative animate-slide-up">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-white/35 blur-2xl" />
          <div className="rounded-[2rem] border border-border/65 bg-card/82 p-6 shadow-elevated backdrop-blur-xl sm:p-8">

            {/* Brand + mode badge */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/65 bg-primary text-primary-foreground shadow-card">
                  <Music className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold leading-none text-foreground">WORA</h2>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Worship Agenda
                  </p>
                </div>
              </div>
              <span className="mt-0.5 rounded-full border border-border/65 bg-secondary/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary-foreground">
                {modeTitle}
              </span>
            </div>

            {/* Signup step indicator */}
            {mode === 'signup' && (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className={signupStep === 1 ? 'font-semibold text-foreground' : ''}>1. Credenciais</span>
                  <span className={signupStep === 2 ? 'font-semibold text-foreground' : ''}>2. Perfil na equipe</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-1 flex-1 rounded-full bg-primary" />
                  <div className={cn('h-1 flex-1 rounded-full transition-colors', signupStep === 2 ? 'bg-primary' : 'bg-border/60')} />
                </div>
              </div>
            )}

            <p className="mb-5 text-sm text-muted-foreground">{modeDescription}</p>

            {/* ── LOGIN / SETUP / FORGOT / RESET ── */}
            {mode !== 'signup' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {(mode === 'setup') && (
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

                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{mode === 'reset' ? 'Nova senha' : 'Senha'}</Label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => { setPassword(''); setConfirmPassword(''); setMode('forgot'); }}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      )}
                    </div>
                    <PasswordInput id="password" value={password} onChange={setPassword} required minLength={6} />
                  </div>
                )}

                {mode === 'reset' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <PasswordInput id="confirm-password" value={confirmPassword} onChange={setConfirmPassword} required minLength={6} />
                  </div>
                )}

                {isResetLinkInvalid && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    Link de redefinição inválido. Solicite um novo link.
                  </div>
                )}

                {mode === 'setup' && (
                  <div className="rounded-xl border border-primary/35 bg-primary/10 p-3 text-center text-sm font-medium text-primary">
                    Configuração inicial: você será o super admin
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Aguarde...' : submitLabel}
                  {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            )}

            {/* ── SIGNUP step 1 ── */}
            {mode === 'signup' && signupStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <PasswordInput id="signup-password" value={password} onChange={setPassword} minLength={6} />
                  <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                </div>

                <Button type="button" className="w-full" onClick={handleSignupNext}>
                  Próximo: Perfil na equipe
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── SIGNUP step 2 ── */}
            {mode === 'signup' && signupStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Home group */}
                <div className="space-y-2">
                  <Label htmlFor="signup-home-group">Grupo Homogéneo</Label>
                  <Select
                    value={homeGroup ?? undefined}
                    onValueChange={(v) => setHomeGroup(v as (typeof homeGroupOptions)[number]['value'])}
                  >
                    <SelectTrigger id="signup-home-group">
                      <SelectValue placeholder="Selecione o seu grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {homeGroupOptions.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Leadership */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Music2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Liderança
                  </Label>
                  <SkillChip id="signup-can-lead" label="Posso liderar o louvor" checked={canLead} onChange={setCanLead} />
                </div>

                {/* Technical */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Técnico
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <SkillChip id="signup-tech-sound" label="Técnico de som" checked={canBeTechSound} onChange={setCanBeTechSound} />
                    <SkillChip id="signup-tech-projection" label="Técnico de projeção" checked={canBeTechProjection} onChange={setCanBeTechProjection} />
                  </div>
                </div>

                {/* Instruments */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Music className="h-3.5 w-3.5 text-muted-foreground" />
                    Instrumentos
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {instrumentOptions.map((inst) => (
                      <SkillChip
                        key={inst.value}
                        id={`signup-instrument-${inst.value}`}
                        label={inst.label}
                        checked={selectedInstruments.includes(inst.value)}
                        onChange={() => toggleInstrument(inst.value)}
                      />
                    ))}
                  </div>
                </div>

                {/* Voices */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                    Vocais
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {voiceOptions.map((v) => (
                      <SkillChip
                        key={v.value}
                        id={`signup-voice-${v.value}`}
                        label={v.label}
                        checked={selectedVoices.includes(v.value)}
                        onChange={() => toggleVoice(v.value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setSignupStep(1)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Solicitar acesso'}
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </form>
            )}

            {/* ── Footer links ── */}
            <div className="mt-6 border-t border-border/65 pt-5">
              {mode === 'login' && hasUsers && (
                <div className="text-center">
                  <p className="mb-3 text-sm text-muted-foreground">Membro da equipe de louvor?</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { resetSkills(); setSignupStep(1); setMode('signup'); }}
                  >
                    Solicitar acesso
                  </Button>
                </div>
              )}

              {mode === 'signup' && (
                <div className="text-center">
                  <p className="mb-3 text-sm text-muted-foreground">Já tem uma conta?</p>
                  <Button variant="outline" className="w-full" onClick={() => { resetSkills(); switchToLogin(); }}>
                    Fazer login
                  </Button>
                </div>
              )}

              {(mode === 'forgot' || mode === 'reset') && (
                <Button variant="outline" className="w-full" onClick={switchToLogin}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
