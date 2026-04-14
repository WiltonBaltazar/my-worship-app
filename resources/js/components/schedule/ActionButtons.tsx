import { RefreshCw, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  onRequestChange: () => void;
  onCancelRequest?: () => void;
  isCanceling?: boolean;
  hasRequestedChange?: boolean;
}

export function ActionButtons({ 
  onRequestChange, 
  onCancelRequest,
  isCanceling,
  hasRequestedChange 
}: ActionButtonsProps) {
  return (
    <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
      {hasRequestedChange && onCancelRequest ? (
        <Button
          variant="destructive"
          className="flex-1"
          onClick={onCancelRequest}
          disabled={isCanceling}
        >
          {isCanceling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          Cancelar solicitação
        </Button>
      ) : (
        <Button
          variant="request"
          className="flex-1 bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
          onClick={onRequestChange}
        >
          <RefreshCw className="h-4 w-4" />
          Solicitar troca
        </Button>
      )}
    </div>
  );
}
