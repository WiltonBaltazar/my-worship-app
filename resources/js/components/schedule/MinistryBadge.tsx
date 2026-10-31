import { Badge } from '@/components/ui/badge';
import { MINISTRY_LABELS, type Ministry } from '@/lib/ministry';
import { cn } from '@/lib/utils';

export function MinistryBadge({ ministry, className }: { ministry: Ministry; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'px-2 py-0 text-[10px] font-semibold tracking-wide',
        ministry === 'ghj' ? 'border-ministry-ghj/40 text-ministry-ghj-strong' : 'border-ministry-dms/40 text-ministry-dms-strong',
        className,
      )}
    >
      {MINISTRY_LABELS[ministry]}
    </Badge>
  );
}
