import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

type UnsupportedReason = 'unsupported_browser' | 'ios_home_screen_required' | null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [unsupportedReason, setUnsupportedReason] = useState<UnsupportedReason>(null);
  const { toast } = useToast();

  const registerSubscription = useCallback(async (subscription: PushSubscription) => {
    await apiRequest<{ message: string }>('/api/push-subscriptions', {
      method: 'POST',
      body: subscription.toJSON(),
    });
  }, []);

  const ensureSubscription = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const { public_key: publicKey } = await apiRequest<{ public_key: string }>(
        '/api/push-subscriptions/vapid-public-key',
      );

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await registerSubscription(subscription);
    setIsSubscribed(true);

    return true;
  }, [isSupported, permission, registerSubscription]);

  useEffect(() => {
    const hasBrowserSupport = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    if (!hasBrowserSupport) {
      setIsSupported(false);
      setUnsupportedReason('unsupported_browser');
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;

    if (isIOS && !isStandalone) {
      setIsSupported(false);
      setUnsupportedReason('ios_home_screen_required');
      setPermission(Notification.permission);
      return;
    }

    setIsSupported(true);
    setUnsupportedReason(null);
    setPermission(Notification.permission);

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });

        if (Notification.permission === 'granted') {
          ensureSubscription().catch((error) => {
            console.error('Failed to ensure push subscription:', error);
          });
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }, [ensureSubscription]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      const unsupportedDescription = unsupportedReason === 'ios_home_screen_required'
        ? 'No iPhone, instale o app na Tela de Início e abra por lá para ativar notificações.'
        : 'Seu navegador não suporta notificações push.';

      toast({
        title: 'Não suportado',
        description: unsupportedDescription,
        variant: 'destructive'
      });
      return false;
    }

    try {
      if (permission === 'granted') {
        await ensureSubscription();
        return true;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        await ensureSubscription();

        toast({
          title: 'Notificações ativadas',
          description: 'Você receberá notificações push quando houver atualizações.'
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: 'Notificações bloqueadas',
          description: 'Você bloqueou as notificações. Habilite-as nas configurações do navegador.',
          variant: 'destructive'
        });
        return false;
      }
      
      setIsSubscribed(false);
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);

      toast({
        title: 'Falha ao ativar push',
        description: 'Não foi possível ativar notificações push agora.',
        variant: 'destructive'
      });

      return false;
    }
  }, [ensureSubscription, isSupported, permission, toast, unsupportedReason]);

  const showLocalNotification = useCallback((title: string, body: string, url?: string) => {
    if (!isSupported || permission !== 'granted') return;

    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: url || '/notifications' }
      });
    });
  }, [isSupported, permission]);

  return {
    isSupported,
    isSubscribed,
    permission,
    unsupportedReason,
    requestPermission,
    showLocalNotification
  };
}
