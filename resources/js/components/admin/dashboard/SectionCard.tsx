import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Ministry } from '@/lib/ministry';
import { MINISTRY_LABELS } from '@/lib/ministry';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  /** Small text or link on the right of the title. */
  meta?: ReactNode;
  action?: { label: string; to: string };
  /** Body runs edge to edge (tables); only the header is padded. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

export function SectionCard({ title, meta, action, flush = false, className, children }: SectionCardProps) {
  return (
    <section className={cn('admin-surface flex flex-col', flush ? 'overflow-hidden' : 'gap-3 p-5', className)}>
      <div className={cn('flex flex-wrap items-baseline justify-between gap-2', flush && 'px-5 pb-3 pt-5')}>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {meta}
        {action && (
          <Link to={action.to} className="text-[13px] font-semibold text-primary-strong hover:underline">
            {action.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function MinistryDot({ ministry, withLabel = false }: { ministry: Ministry; withLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn('h-2 w-2 shrink-0 rounded-full', ministry === 'ghj' ? 'bg-ministry-ghj' : 'bg-ministry-dms')}
      />
      {withLabel && MINISTRY_LABELS[ministry]}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
