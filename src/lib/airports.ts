type AirportMap = Record<string, [string, string]>; // IATA -> [이름, 시간대]

let p: Promise<AirportMap> | null = null;
export const loadAirports = () => (p ??= fetch('/data/airports.json').then((r) => r.json()).catch(() => { p = null; return {}; }));

const offset = (ms: number, tz: string) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - ms;
};

/** "2026-11-26T09:10" (그 공항 현지 시각) -> UTC 밀리초 */
export const toUtc = (local: string, tz?: string) => {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (!tz) return naive;
  try {
    let t = naive - offset(naive, tz);
    t = naive - offset(t, tz);
    return t;
  } catch {
    return naive;
  }
};

/** 두 현지 시각 사이의 분 (시차 반영) */
export const minutesBetween = (a: string, aTz: string | undefined, b: string, bTz: string | undefined) => {
  const x = toUtc(a, aTz), y = toUtc(b, bTz);
  return x == null || y == null ? null : Math.round((y - x) / 60000);
};

export const durLabel = (min: number | null) => {
  if (min == null || min <= 0) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return `${h ? `${h}시간` : ''}${h && m ? ' ' : ''}${m ? `${m}분` : ''}`;
};
