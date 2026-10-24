import { supabase } from './supabase';

export type FlightMode = 'round' | 'oneway' | 'multi';
export interface Flight {
  id?: string;
  flight_no: string;
  dep_airport: string;
  dep_date: string;
  dep_time: string;
  arr_airport: string;
  arr_date: string;
  arr_time: string;
}

export const emptyFlight = (date = ''): Flight => ({ flight_no: '', dep_airport: '', dep_date: date, dep_time: '', arr_airport: '', arr_date: date, arr_time: '' });

export const fetchFlights = async (tripId: string): Promise<Flight[]> => {
  const { data } = await supabase.from('flights').select('*').eq('trip_id', tripId).order('seq');
  return ((data ?? []) as Record<string, string | null>[]).map((r) => ({
    id: r.id ?? undefined,
    flight_no: r.flight_no ?? '',
    dep_airport: r.dep_airport ?? '',
    dep_date: r.dep_date ?? '',
    dep_time: (r.dep_time ?? '').slice(0, 5),
    arr_airport: r.arr_airport ?? '',
    arr_date: r.arr_date ?? '',
    arr_time: (r.arr_time ?? '').slice(0, 5),
  }));
};

export const saveFlights = (tripId: string, mode: FlightMode, segs: Flight[]) =>
  supabase.rpc('save_flights', { tid: tripId, p_mode: mode, p_segments: segs });

export const isFlightItem = (i: { stage: number; title: string }) => i.stage === 1 && i.title.trim() === '항공권';

/** 편명 앞 두 글자(IATA 항공사 코드) */
export const airlineCode = (flightNo: string) => {
  const m = flightNo.toUpperCase().replace(/\s/g, '').match(/^([A-Z0-9]{2})(?=\d)/);
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
