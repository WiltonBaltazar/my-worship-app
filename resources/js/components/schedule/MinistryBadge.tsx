import { Badge } from '@/components/ui/badge';
import { MINISTRY_LABELS, type Ministry } from '@/lib/ministry';
import { cn } from '@/lib/utils';

export function MinistryBadge({ ministry, className }: { ministry: Ministry; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'px-2 py-0 text-[10px] font-semibold tracking-wide',
        ministry === 'ghj' ? 'border-amber-500/40 text-amber-700 dark:text-amber-300' : 'border-primary/40 text-primary',
        className,
      )}
    >
      {MINISTRY_LABELS[ministry]}
    </Badge>
  );
}
