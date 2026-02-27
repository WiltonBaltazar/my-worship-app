import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationToggleProps {
  className?: string;
  hideIfUnsupported?: boolean;
}

export function PushNotificationToggle({ className, hideIfUnsupported = true }: PushNotificationToggleProps) {
  const { isSupported, isSubscribed, permission, requestPermission } = usePushNotifications();

  if (!isSupported) {
    if (hideIfUnsupported) {
      return null;
    }

    return (
      <Button variant="outline" size="sm" className={cn('gap-2', className)} disabled>
        <BellOff className="h-4 w-4" />
        Não suportado
      </Button>
    );
  }

  const isEnabled = permission === 'granted' && isSubscribed;
  const isDenied = permission === 'denied';

  return (
    <Button
      variant={isEnabled ? 'default' : 'outline'}
      size="sm"
      className={cn('gap-2', className)}
      onClick={requestPermission}
      disabled={isDenied}
    >
      {isEnabled ? (
        <>
          <Bell className="h-4 w-4" />
          Notificações ativas
        </>
      ) : isDenied ? (
        <>
          <BellOff className="h-4 w-4" />
          Bloqueadas
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          {permission === 'granted' ? 'Concluir ativação' : 'Ativar notificações'}
        </>
      )}
    </Button>
  );
}
