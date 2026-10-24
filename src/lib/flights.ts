import { supabase } from './supabase';

export type Cabin = 'economy' | 'premium' | 'business' | 'first';
export const CABINS: Record<Cabin, string> = { economy: '이코노미', premium: '프리미엄 이코노미', business: '비즈니스', first: '퍼스트' };

/** 비행 한 구간. 시각은 그 공항 현지 시각 "YYYY-MM-DDTHH:MM" */
export interface Segment { flight_no: string; dep_airport: string; dep_at: string; arr_airport: string; arr_at: string; cabin: Cabin }
/** 여정 = 갈아타는 구간들의 묶음 (가는 편, 오는 편 ...) */
export type Journey = Segment[];

export const emptySeg = (date = ''): Segment => ({ flight_no: '', dep_airport: '', dep_at: date ? `${date}T` : '', arr_airport: '', arr_at: '', cabin: 'economy' });
export const journeyLabel = (i: number, total: number) => (total <= 2 ? (i === 0 ? '가는 편' : '오는 편') : `여정 ${i + 1}`);

const dt = (d: string | null, t: string | null) => (d ? `${d}T${(t ?? '').slice(0, 5)}` : '');

export const fetchJourneys = async (tripId: string): Promise<Journey[]> => {
  const { data } = await supabase.from('flights').select('*').eq('trip_id', tripId).order('journey').order('seq');
  const out: Journey[] = [];
  for (const r of (data ?? []) as Record<string, string | null>[]) {
    const j = Number(r.journey ?? 0);
    (out[j] ??= []).push({
      flight_no: r.flight_no ?? '', dep_airport: r.dep_airport ?? '', dep_at: dt(r.dep_date, r.dep_time),
      arr_airport: r.arr_airport ?? '', arr_at: dt(r.arr_date, r.arr_time), cabin: (r.cabin as Cabin) ?? 'economy',
    });
  }
  return out.filter(Boolean);
};

const clean = (j: Journey[]) => j.map((x) => x.map((s) => ({ ...s, dep_at: s.dep_at.length === 16 ? s.dep_at : s.dep_at.slice(0, 10), arr_at: s.arr_at.length === 16 ? s.arr_at : s.arr_at.slice(0, 10) }))).filter((x) => x.length);
export const saveJourneys = (tripId: string, journeys: Journey[]) => supabase.rpc('save_journeys', { tid: tripId, p_journeys: clean(journeys) });

export const segComplete = (s: Segment) => !!(s.flight_no && s.dep_airport && s.arr_airport && s.dep_at.length >= 10);
export const journeysComplete = (js: Journey[]) => js.length > 0 && js.every((j) => j.length > 0 && j.every(segComplete));

export const isFlightItem = (i: { stage: number; title: string }) => i.stage === 1 && i.title.trim() === '항공권';

/** 항공권 후보 = 왕복 한 세트 (가는 편, 오는 편) + 가격 */
export interface Candidate { id?: string; journeys: Journey[]; price: number | null; note: string }

const legacy = (r: Record<string, unknown>): Journey[] => {
  const legs = (r.legs as { dep: string; arr: string; date: string; time: string }[] | null) ?? null;
  const cabin = (r.cabin as Cabin) ?? 'economy';
  const airline = (r.airline as string) ?? '';
  if (legs?.length) return legs.map((l) => [{ flight_no: airline, dep_airport: l.dep, arr_airport: l.arr, dep_at: l.date ? `${l.date}T${l.time ?? ''}` : '', arr_at: '', cabin }]);
  return [[{ flight_no: airline, dep_airport: (r.dep_airport as string) ?? '', arr_airport: (r.arr_airport as string) ?? '', dep_at: dt(r.dep_date as string | null, r.dep_time as string | null), arr_at: '', cabin }]];
};

export const fetchCandidates = async (tripId: string): Promise<Candidate[]> => {
  const { data } = await supabase.from('flight_options').select('*').eq('trip_id', tripId).order('created_at');
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    journeys: (r.journeys as Journey[] | null) ?? legacy(r),
    price: r.price != null ? Number(r.price) : null,
    note: (r.note as string) ?? '',
  }));
};

export const saveCandidate = async (tripId: string, c: Candidate) => {
  const first = c.journeys[0]?.[0];
  const row = {
    trip_id: tripId, journeys: clean(c.journeys), price: c.price, currency: 'KRW', note: c.note,
    dep_airport: first?.dep_airport ?? '', arr_airport: c.journeys[0]?.[c.journeys[0].length - 1]?.arr_airport ?? '',
    dep_date: first?.dep_at ? first.dep_at.slice(0, 10) : null, airline: first?.flight_no ?? '', cabin: first?.cabin ?? 'economy',
  };
  if (c.id) return supabase.from('flight_options').update(row).eq('id', c.id).select('id').single();
  return supabase.from('flight_options').insert(row).select('id').single();
};

/** 편명 앞 두 글자(IATA 항공사 코드) */
export const airlineCode = (flightNo: string) => {
  const m = flightNo.toUpperCase().replace(/\s/g, '').match(/^([A-Z0-9]{2})(?=\d|$)/);
  return m && /[A-Z]/.test(m[1]) ? m[1] : null;
};

export const AIRLINES: Record<string, string> = {
  KE: '대한항공', OZ: '아시아나항공', '7C': '제주항공', LJ: '진에어', TW: '티웨이항공', BX: '에어부산', RS: '에어서울',
  ZE: '이스타항공', YP: '에어프레미아', RF: '에어로케이', '4V': '플라이강원', KJ: '에어인천',
  JL: '일본항공', NH: '전일본공수', MM: '피치항공', GK: '젯스타 재팬', BC: '스카이마크', HD: '에어두',
  CI: '중화항공', BR: '에바항공', IT: '타이거에어 타이완', JX: '스타럭스', CX: '캐세이퍼시픽', UO: '홍콩익스프레스', HX: '홍콩항공',
  CA: '중국국제항공', MU: '중국동방항공', CZ: '중국남방항공', SQ: '싱가포르항공', TR: '스쿠트', TG: '타이항공',
  VN: '베트남항공', VJ: '비엣젯항공', PR: '필리핀항공', '5J': '세부퍼시픽', MH: '말레이시아항공', AK: '에어아시아', D7: '에어아시아X',
  GA: '가루다인도네시아', QR: '카타르항공', EK: '에미레이트항공', EY: '에티하드항공', TK: '터키항공',
  AF: '에어프랑스', KL: 'KLM', LH: '루프트한자', BA: '영국항공', LX: '스위스항공', AY: '핀에어', AZ: 'ITA항공', LO: 'LOT 폴란드항공',
  DL: '델타항공', UA: '유나이티드항공', AA: '아메리칸항공', HA: '하와이안항공', AS: '알래스카항공', AC: '에어캐나다',
  QF: '콴타스항공', NZ: '에어뉴질랜드', OM: '몽골항공', MR: '훈누에어', HU: '하이난항공',
};

/** "KE703" -> "대한항공 KE703", "대한항공" -> "대한항공" */
export const flightLabel = (no: string) => {
  const c = airlineCode(no);
  return c && AIRLINES[c] ? `${AIRLINES[c]} ${no}` : no;
};
