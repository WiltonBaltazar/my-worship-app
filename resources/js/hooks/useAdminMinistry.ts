import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Ministry } from '@/lib/ministry';

export type MinistryFilterValue = 'all' | Ministry;

const PARAM = 'm';

/**
 * Admin-wide ministry filter, kept in the URL (`?m=dms`) so it survives
 * navigation between admin pages and can be shared as a link.
 */
export function useAdminMinistry() {
  const { ledMinistries } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(PARAM);
  const ministry: MinistryFilterValue =
    raw && ledMinistries.includes(raw as Ministry) ? (raw as Ministry) : 'all';

  const setMinistry = useCallback(
    (next: MinistryFilterValue) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === 'all') {
            params.delete(PARAM);
          } else {
            params.set(PARAM, next);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /** Appends the current filter to an admin path so links keep it. */
  const withMinistry = useCallback(
    (path: string) => (ministry === 'all' || !path.startsWith('/admin-app') ? path : `${path}?${PARAM}=${ministry}`),
    [ministry],
  );

  return {
    ministry,
    setMinistry,
    withMinistry,
    options: ledMinistries,
    showFilter: ledMinistries.length > 1,
  };
}
