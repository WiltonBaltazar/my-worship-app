import { useEffect, useState } from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function detectIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function detectStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function InstallAppButton() {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    setIsIOS(detectIOS());
    setIsInstalled(detectStandalone());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isInstalled) {
      toast({
        title: 'App já instalada',
        description: 'Este dispositivo já está com a versão instalada.',
      });
      return;
    }

    if (isIOS && !detectStandalone()) {
      setShowIosInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      toast({
        title: 'Instalação indisponível',
        description: 'Use o menu do navegador para instalar o app neste dispositivo.',
      });
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      toast({
        title: 'Instalação iniciada',
        description: 'Confirme os passos finais para concluir.',
      });
      return;
    }

    toast({
      title: 'Instalação cancelada',
      description: 'Você pode tentar novamente quando quiser.',
    });
  };

  return (
    <>
      <Button
        variant={isInstalled ? 'secondary' : 'outline'}
        size="sm"
        className="gap-2"
        onClick={() => void handleInstall()}
      >
        {isInstalled ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {isInstalled ? 'App instalada' : 'Instalar app'}
      </Button>

      <AlertDialog open={showIosInstructions} onOpenChange={setShowIosInstructions}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Instalar no iPhone</AlertDialogTitle>
            <AlertDialogDescription>
              No Safari, toque em Compartilhar, escolha &quot;Adicionar à Tela de Início&quot; e abra o app pelo ícone criado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
