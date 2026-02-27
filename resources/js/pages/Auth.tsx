import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Music, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  { value: 'sound_tech', label: 'Técnico de Som' },
  { value: 'other', label: 'Outro' },
];

const voiceOptions = [
  { value: 'lead', label: 'Voz Principal (Dirigente)' },
  { value: 'soprano', label: 'Primeira Voz (Soprano)' },
  { value: 'alto', label: 'Segunda Voz (Alto/Contralto)' },
  { value: 'tenor', label: 'Terceira Voz (Tenor)' },
  { value: 'bass_voice', label: 'Voz Grave (Baixo)' },
];

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [canLead, setCanLead] = useState(false);
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
    setCanLead(false);
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
        const { error, requiresApproval } = await signUp(email, password, name, {
          canLead,
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
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Credenciais inválidas. Tente novamente.',
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-elevated">
            <Music className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">WORA</h1>
          <p className="text-sm text-muted-foreground">Worship Agenda</p>
          <p className="text-muted-foreground mt-4">
            {mode === 'setup' 
              ? 'Configure sua conta de administrador' 
              : mode === 'forgot'
                ? 'Digite seu e-mail para recuperar acesso'
                : mode === 'reset'
                  ? 'Defina sua nova senha'
              : mode === 'signup'
                ? 'Solicitar acesso como membro'
                : 'Faça login para continuar'}
          </p>
        </div>

        <div className="repertoire-card animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            {showNameField && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
              <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Conte ao admin o que você pode fazer</Label>
                  <p className="text-xs text-muted-foreground">
                    Essas informações aparecem na solicitação de acesso e ajudam na aprovação.
                  </p>
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
              {isSubmitting 
                ? 'Aguarde...' 
                : mode === 'setup' 
                  ? 'Criar conta admin'
                  : mode === 'forgot'
                    ? 'Enviar link de redefinição'
                    : mode === 'reset'
                      ? 'Redefinir senha'
                  : mode === 'signup'
                    ? 'Solicitar acesso'
                    : 'Entrar'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          {mode === 'login' && hasUsers && (
            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Membro da equipe de louvor?
              </p>
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
            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?
              </p>
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
            <div className="mt-6 text-center space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={switchToLogin}
              >
                Voltar ao login
              </Button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="mt-6 text-center space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={switchToLogin}
              >
                Voltar ao login
              </Button>
            </div>
          )}

          {mode === 'setup' && (
            <div className="mt-6 p-3 bg-primary/10 rounded-xl">
              <p className="text-sm text-primary text-center font-medium">
                🔐 Configuração inicial - você será o super admin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
