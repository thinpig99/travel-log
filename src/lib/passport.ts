import { supabase } from './supabase';
import { parseDate, toDateStr } from './format';

export interface Passport { issued: string | null; expires: string | null }

export const fetchPassport = async (): Promise<Passport | null> => {
  const { data } = await supabase.from('passports').select('issued, expires').maybeSingle();
  return (data as Passport | null) ?? null;
};

/**
 * 한국 여권 기준, 여행이 끝나는 날(귀국일)에 남아 있어야 하는 개월 수.
 * 0 은 "체류 기간 동안 유효"면 된다는 뜻. 나라마다 입국일/출국일 기준이 달라서
 * 안전하게 귀국일 기준으로 계산한다.
 */
const SCHENGEN = ['AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH'];
const SIX = ['TW', 'US', 'GB', 'AU', 'TH', 'VN', 'LA', 'SG', 'MY', 'ID', 'KH', 'MM', 'PH', 'TR', 'CN', 'IN', 'AE', 'EG', 'MX', 'BR', 'AR', 'PE', 'CL', 'CO', 'BO', 'EC'];
const RULES: Record<string, number> = {
  JP: 0, CA: 0, HK: 1, MO: 1, NZ: 3, MN: 6,
  ...Object.fromEntries(SCHENGEN.map((c) => [c, 3])),
  ...Object.fromEntries(SIX.map((c) => [c, 6])),
};
const NOTES: Record<string, string> = {
  JP: '체류 기간 동안 유효하면 돼요. 여유 있게 3개월 이상을 권장해요.',
  CA: '체류 기간 동안 유효하면 돼요.',
  US: '6개월 이상 남아 있는 것을 권장해요.',
  PH: '규정은 완화됐지만 너무 짧으면 입국이 거부될 수 있어요.',
};

export interface CountryCheck { cc: string; months: number; ok: boolean; known: boolean; note?: string }
export type PassportState = 'domestic' | 'none' | 'bad' | 'ok';

const addMonths = (s: string, m: number) => {
  const d = parseDate(s);
  d.setMonth(d.getMonth() + m);
  return toDateStr(d);
};

/** 여행 나라들 기준 여권 상태 */
export const checkPassport = (p: Passport | null, countries: string[], tripEnd: string | null) => {
  const abroad = [...new Set(countries)].filter((c) => c !== 'KR');
  if (!abroad.length) return { state: 'domestic' as PassportState, checks: [] as CountryCheck[], need: null as string | null };
  const end = tripEnd ?? toDateStr(new Date());
  const checks: CountryCheck[] = abroad.map((cc) => {
    const known = cc in RULES;
    const months = known ? RULES[cc] : 6;
    const need = months === 0 ? end : addMonths(end, months);
    return { cc, months, known, note: NOTES[cc], ok: !!p?.expires && p.expires >= need };
  });
  const strict = Math.max(...checks.map((c) => c.months));
  const need = strict === 0 ? end : addMonths(end, strict);
  if (!p?.expires) return { state: 'none' as PassportState, checks, need };
  return { state: (checks.every((c) => c.ok) ? 'ok' : 'bad') as PassportState, checks, need };
};

export const isPassportItem = (i: { stage: number; title: string }) => i.stage === 1 && i.title.trim() === '여권';
