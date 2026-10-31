import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Profile } from '@/hooks/useProfiles';
import type { Schedule, ScheduleMember } from '@/hooks/useSchedules';
import type { MinistryFilterValue } from '@/hooks/useAdminMinistry';
import { toLocalDateInputValue } from '@/lib/date-time';
import type { Ministry } from '@/lib/ministry';

/** Calculations behind the admin dashboard; everything is derived from data the app already loads. */

export const instrumentLabels: Record<string, string> = {
  guitar: 'Guitarra',
  bass: 'Baixo',
  drums: 'Bateria',
  keyboard: 'Teclado',
  acoustic_guitar: 'Violão',
  violin: 'Violino',
  percussion: 'Percussão',
  sound_tech: 'Técnico de som',
  other: 'Outro',
};

export const voiceLabels: Record<string, string> = {
  lead: 'Dirigente',
  soprano: 'Soprano',
  alto: 'Contralto',
  tenor: 'Tenor',
  bass_voice: 'Voz grave',
};

export function scheduleDay(schedule: Schedule): string {
  return schedule.schedule_date.slice(0, 10);
}

export function scheduleTime(schedule: Schedule): string {
  return schedule.start_time?.slice(0, 5) ?? '';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "Dom, 01 nov" — date-fns' ptBR "EEE" spells weekdays out in full. */
export function formatShortDate(day: string): string {
  const date = parseISO(day);
  return `${WEEKDAYS[date.getDay()]}, ${format(date, 'dd MMM', { locale: ptBR })}`;
}

export function initials(name?: string | null): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function belongsToMinistry(profile: Profile, ministry: Ministry): boolean {
  return ministry === 'dms' ? profile.in_dms : profile.home_group === 'GHJ';
}

export function inScope(ministry: MinistryFilterValue, scheduleMinistry: Ministry) {
  return ministry === 'all' || scheduleMinistry === ministry;
}

function confirmation(members: ScheduleMember[] = []) {
  return { confirmed: members.filter((member) => member.confirmed).length, total: members.length };
}

function rate({ confirmed, total }: { confirmed: number; total: number }) {
  return total > 0 ? Math.round((confirmed / total) * 100) : null;
}

export interface AttentionCounts {
  unconfirmed: { count: number; scheduleId?: string; urgent: boolean };
  swaps: { count: number; scheduleId?: string };
  drafts: number;
  closingCalls: { count: number; scheduleId?: string };
}

export interface DashboardData {
  today: string;
  upcoming: Schedule[];
  next?: Schedule & { confirmed: number; total: number };
  attention: AttentionCounts;
  confirmationRate: number | null;
  confirmationDelta: number | null;
  month: { total: number; published: number; drafts: number; label: string };
  members: { total: number; dms: number; ghj: number; canLead: number };
  swapRequests: Array<{ schedule: Schedule; member: ScheduleMember }>;
  leaderlessSoon: Schedule[];
}

export function buildDashboardData(
  schedules: Schedule[],
  profiles: Profile[],
  ministry: MinistryFilterValue,
  now = new Date(),
): DashboardData {
  const today = toLocalDateInputValue(now);
  const in7 = toLocalDateInputValue(addDays(now, 7));
  const in14 = toLocalDateInputValue(addDays(now, 14));
  const in30 = toLocalDateInputValue(addDays(now, 30));
  const ago30 = toLocalDateInputValue(addDays(now, -30));
  const monthKey = today.slice(0, 7);

  const scoped = schedules
    .filter((schedule) => inScope(ministry, schedule.ministry))
    .sort((a, b) => `${scheduleDay(a)} ${scheduleTime(a)}`.localeCompare(`${scheduleDay(b)} ${scheduleTime(b)}`));
  const upcoming = scoped.filter((schedule) => scheduleDay(schedule) >= today);
  const published = upcoming.filter((schedule) => schedule.status !== 'draft');

  const nextSchedule = published[0] ?? upcoming[0];
  const next = nextSchedule ? { ...nextSchedule, ...confirmation(nextSchedule.members) } : undefined;

  const soonPublished = published.filter((schedule) => scheduleDay(schedule) <= in7);
  const firstUnconfirmed = soonPublished.find((schedule) => schedule.members?.some((member) => !member.confirmed));
  const unconfirmedCount = soonPublished.reduce(
    (sum, schedule) => sum + (schedule.members?.filter((member) => !member.confirmed).length ?? 0),
    0,
  );

  const swapRequests = upcoming.flatMap((schedule) =>
    (schedule.members ?? []).filter((member) => member.requested_change).map((member) => ({ schedule, member })),
  );

  const closingCalls = upcoming.filter((schedule) => {
    const deadline = schedule.availability_call?.is_open ? schedule.availability_call.deadline : null;
    return deadline ? differenceInCalendarDays(parseISO(deadline), now) <= 3 : false;
  });

  const sumConfirmation = (list: Schedule[]) =>
    list.reduce(
      (acc, schedule) => {
        const current = confirmation(schedule.members);
        return { confirmed: acc.confirmed + current.confirmed, total: acc.total + current.total };
      },
      { confirmed: 0, total: 0 },
    );
  const confirmationRate = rate(sumConfirmation(published.filter((schedule) => scheduleDay(schedule) <= in30)));
  const previousRate = rate(
    sumConfirmation(
      scoped.filter(
        (schedule) => schedule.status !== 'draft' && scheduleDay(schedule) < today && scheduleDay(schedule) >= ago30,
      ),
    ),
  );

  const monthSchedules = scoped.filter((schedule) => scheduleDay(schedule).startsWith(monthKey));
  const monthDrafts = monthSchedules.filter((schedule) => schedule.status === 'draft').length;

  const activeProfiles = profiles.filter((profile) => profile.is_active !== false);
  const scopedProfiles = ministry === 'all' ? activeProfiles : activeProfiles.filter((profile) => belongsToMinistry(profile, ministry));

  return {
    today,
    upcoming,
    next,
    attention: {
      unconfirmed: {
        count: unconfirmedCount,
        scheduleId: firstUnconfirmed?.id,
        urgent: firstUnconfirmed ? differenceInCalendarDays(parseISO(scheduleDay(firstUnconfirmed)), now) <= 2 : false,
      },
      swaps: { count: swapRequests.length, scheduleId: swapRequests[0]?.schedule.id },
      drafts: upcoming.filter((schedule) => schedule.status === 'draft' && scheduleDay(schedule) <= in14).length,
      closingCalls: { count: closingCalls.length, scheduleId: closingCalls[0]?.id },
    },
    confirmationRate,
    confirmationDelta: confirmationRate !== null && previousRate !== null ? confirmationRate - previousRate : null,
    month: {
      total: monthSchedules.length,
      published: monthSchedules.length - monthDrafts,
      drafts: monthDrafts,
      label: format(now, 'MMMM', { locale: ptBR }),
    },
    members: {
      total: scopedProfiles.length,
      dms: activeProfiles.filter((profile) => belongsToMinistry(profile, 'dms')).length,
      ghj: activeProfiles.filter((profile) => belongsToMinistry(profile, 'ghj')).length,
      canLead: scopedProfiles.filter((profile) => profile.can_lead).length,
    },
    swapRequests,
    leaderlessSoon: published.filter(
      (schedule) =>
        schedule.schedule_type === 'worship'
        && scheduleDay(schedule) <= in14
        && !(schedule.members ?? []).some((member) => member.function_type === 'lead_vocal'),
    ),
  };
}

export function scopedProfiles(profiles: Profile[], ministry: MinistryFilterValue) {
  const active = profiles.filter((profile) => profile.is_active !== false);
  return ministry === 'all' ? active : active.filter((profile) => belongsToMinistry(profile, ministry));
}

export function countBy(profiles: Profile[], key: 'instruments' | 'voices', labels: Record<string, string>) {
  const counts = new Map<string, number>();
  profiles.forEach((profile) => {
    profile[key]?.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });

  return [...counts.entries()]
    .map(([value, count]) => ({ label: labels[value] ?? value, count }))
    .sort((a, b) => b.count - a.count);
}

/** Times each in-scope member served in the last 90 days, for balancing the rotation. */
export function rotation(schedules: Schedule[], profiles: Profile[], ministry: MinistryFilterValue, now = new Date()) {
  const today = toLocalDateInputValue(now);
  const ago90 = toLocalDateInputValue(addDays(now, -90));
  const counts = new Map<string, number>();

  schedules
    .filter((schedule) => inScope(ministry, schedule.ministry) && scheduleDay(schedule) < today && scheduleDay(schedule) >= ago90)
    .forEach((schedule) => {
      schedule.members?.forEach((member) => counts.set(member.profile_id, (counts.get(member.profile_id) ?? 0) + 1));
    });

  const ranked = scopedProfiles(profiles, ministry)
    .filter((profile) => !profile.is_paused)
    .map((profile) => ({ profile, count: counts.get(profile.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.profile.name.localeCompare(b.profile.name));

  return {
    most: ranked.filter((entry) => entry.count > 0).slice(0, 5),
    least: [...ranked].reverse().slice(0, 5),
  };
}

/** Song usage over the last 90 days of in-scope schedules. */
export function songUsage(schedules: Schedule[], totalSongs: number, ministry: MinistryFilterValue, now = new Date()) {
  const today = toLocalDateInputValue(now);
  const ago90 = toLocalDateInputValue(addDays(now, -90));
  const usage = new Map<string, { title: string; artist: string | null; count: number }>();

  schedules
    .filter((schedule) => inScope(ministry, schedule.ministry) && scheduleDay(schedule) <= today && scheduleDay(schedule) >= ago90)
    .forEach((schedule) => {
      schedule.songs?.forEach((entry) => {
        const current = usage.get(entry.song_id);
        usage.set(entry.song_id, {
          title: entry.song?.title ?? current?.title ?? 'Música',
          artist: entry.song?.artist ?? current?.artist ?? null,
          count: (current?.count ?? 0) + 1,
        });
      });
    });

  return {
    top: [...usage.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    unused: Math.max(0, totalSongs - usage.size),
  };
}

/** Members who can't serve on at least one day this week (today + 6). */
export function unavailableThisWeek(profiles: Profile[], ministry: MinistryFilterValue, now = new Date()) {
  const start = toLocalDateInputValue(now);
  const end = toLocalDateInputValue(addDays(now, 6));
  const applies = (absenceMinistry?: Ministry | null) => !absenceMinistry || ministry === 'all' || absenceMinistry === ministry;

  return scopedProfiles(profiles, ministry)
    .map((profile) => {
      if (profile.is_paused && applies(profile.pause_ministry)) {
        return { profile, label: 'Escalas pausadas', scope: profile.pause_ministry ?? null, sortKey: '' };
      }

      const period = (profile.unavailable_periods ?? []).find(
        (entry) => entry.start_date <= end && entry.end_date >= start && applies(entry.ministry),
      );
      if (period) {
        return {
          profile,
          label: `${formatShortDate(period.start_date)} – ${formatShortDate(period.end_date)}`,
          scope: period.ministry ?? null,
          sortKey: period.start_date,
        };
      }

      const dates = (profile.unavailable_dates ?? [])
        .filter((entry) => entry.date >= start && entry.date <= end && applies(entry.ministry))
        .sort((a, b) => a.date.localeCompare(b.date));
      if (dates.length > 0) {
        return {
          profile,
          label: dates.map((entry) => formatShortDate(entry.date)).join(', '),
          scope: dates[0].ministry ?? null,
          sortKey: dates[0].date,
        };
      }

      return null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
