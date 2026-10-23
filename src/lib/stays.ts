import { cityLabel } from './geo';
import type { CityRef, ScheduleItem, Trip } from './types';

export interface Stay {
  city: CityRef;
  name: string;
  sort: number;
  arrive: string | null;
  depart: string | null;
  note: string;
  inferred: boolean; // 날짜를 일정에서 추정했는지
}

const matches = (c: CityRef, area: string) => {
  const a = area.trim().toLowerCase();
  return !!a && (a === (c.name_ko ?? '').toLowerCase() || a === c.name_en.toLowerCase());
};

/** 도시별 체류 기간. 직접 적은 날짜가 없으면 일정의 지역으로 추정 */
export const computeStays = (trip: Trip, sched: ScheduleItem[]): Stay[] => {
  const list = [...(trip.trip_cities ?? [])].map((tc) => {
    const days = sched.filter((s) => matches(tc.cities, s.area)).map((s) => s.day).sort();
    const explicit = !!(tc.arrive || tc.depart);
    return {
      city: tc.cities,
      name: cityLabel(tc.cities),
      sort: tc.sort,
      arrive: explicit ? tc.arrive ?? null : days[0] ?? null,
      depart: explicit ? tc.depart ?? tc.arrive ?? null : days[days.length - 1] ?? null,
      note: tc.note ?? '',
      inferred: !explicit && days.length > 0,
    };
  });
  return list.sort((a, b) => {
    if (a.arrive && b.arrive && a.arrive !== b.arrive) return a.arrive.localeCompare(b.arrive);
    if (a.arrive && !b.arrive) return -1;
    if (!a.arrive && b.arrive) return 1;
    return a.sort - b.sort;
  });
};

/** 동선: 일정 순서대로 지나간 도시. 일정이 부족하면 체류 순서 */
export const computeRoute = (stays: Stay[], sched: ScheduleItem[]): CityRef[] => {
  const ordered = [...sched].sort((a, b) => (a.day + (a.time ?? '')).localeCompare(b.day + (b.time ?? '')));
  const seq: CityRef[] = [];
  for (const s of ordered) {
    const c = stays.find((x) => matches(x.city, s.area))?.city;
    if (c && seq[seq.length - 1]?.id !== c.id) seq.push(c);
  }
  if (new Set(seq.map((c) => c.id)).size >= 2) return seq;
  return stays.map((s) => s.city);
};
