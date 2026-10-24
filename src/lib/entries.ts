import { supabase } from './supabase';
import type { PrepItem, PrepStatus } from './types';

export type Data = Record<string, string>;
export interface Entry { id: string; item_id: string; trip_id: string; kind: Kind; data: Data; done: boolean; sort: number }

export type FieldType = 'text' | 'date' | 'time' | 'price' | 'select' | 'city' | 'url' | 'currency' | 'amount';
export interface FieldDef { key: string; label: string; type: FieldType; placeholder?: string; options?: string[]; half?: boolean }

export type Kind = 'lodging' | 'transport' | 'sight' | 'food' | 'shopping' | 'roaming' | 'exchange' | 'insurance' | 'packing';

export interface Ctx { rates: Record<string, number> | null }

export interface KindDef {
  kind: Kind;
  fields: FieldDef[];
  title: (d: Data) => string;
  sub: (d: Data, ctx: Ctx) => string;
  price?: (d: Data) => number | null;
  /** 완료 표시 이름: [안 됨, 됨] */
  doneLabel: [string, string];
  /** 후보/확정 두 묶음으로 보여줄지 */
  groups?: { off: string; on: string; offHint: string; onHint: string };
  add: string;
  empty: string;
  /** 완료를 데이터로 자동 판단 (예: 날짜가 있으면 일정에 들어감) */
  autoDone?: (d: Data) => boolean;
  /** 일정 탭에 넣을 내용 */
  schedule?: (d: Data, done: boolean) => { day: string; time: string | null; title: string; category: string; area: string; note: string } | null;
  /** 완료 상태 판단 */
  status?: (es: Entry[], t: TripRange) => PrepStatus;
  /** 시트 아래에 보여줄 계산 결과 */
  extra?: (d: Data) => string;
  /** 비용에 넣을 묶음: 완료된 것만 */
  costDone?: boolean;
  checklist?: boolean;
}

const won = (s?: string) => (s ? `${Number(s).toLocaleString('ko-KR')}원` : '');
const num = (s?: string) => (s ? Number(s) : null);
const md = (s?: string) => (s && s.length >= 10 ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : '');
const nights = (a?: string, b?: string) => {
  if (!a || !b) return '';
  const n = Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  return n > 0 ? `${n}박` : '';
};
const join = (...xs: (string | undefined | false)[]) => xs.filter(Boolean).join(' · ');

/** 출발~도착 소요 시간 (같은 시간대로 계산) */
export const travelTime = (d: Data) => {
  if (!d.date || !d.time || !d.arr_time) return '';
  const a = Date.parse(`${d.date}T${d.time}:00Z`), b = Date.parse(`${d.arr_date || d.date}T${d.arr_time}:00Z`);
  const m = Math.round((b - a) / 60000);
  if (!(m > 0)) return '';
  const h = Math.floor(m / 60), r = m % 60;
  return `${h ? `${h}시간` : ''}${h && r ? ' ' : ''}${r ? `${r}분` : ''}`;
};

export interface TripRange { start: string | null; end: string | null }

/** 여행 기간 중 숙소가 필요한 밤 (첫날 ~ 마지막 전날) 중 예약 안 된 밤 */
export const uncoveredNights = (es: Entry[], t: TripRange) => {
  if (!t.start || !t.end) return [] as string[];
  const covered = new Set<string>();
  for (const e of es.filter((x) => x.done && x.data.checkin && x.data.checkout)) {
    for (let d = new Date(`${e.data.checkin}T00:00:00Z`); d < new Date(`${e.data.checkout}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) covered.add(d.toISOString().slice(0, 10));
  }
  const out: string[] = [];
  for (let d = new Date(`${t.start}T00:00:00Z`); d < new Date(`${t.end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const k = d.toISOString().slice(0, 10);
    if (!covered.has(k)) out.push(k);
  }
  return out;
};

const allDone = (es: Entry[]): PrepStatus => (!es.length ? 'todo' : es.every((e) => e.done) ? 'done' : 'doing');

export const KINDS: Record<Kind, KindDef> = {
  lodging: {
    kind: 'lodging',
    fields: [
      { key: 'name', label: '숙소 이름', type: 'text', placeholder: '호텔 그레이서리 신주쿠' },
      { key: 'city', label: '도시', type: 'city' },
      { key: 'checkin', label: '체크인', type: 'date', half: true },
      { key: 'checkout', label: '체크아웃', type: 'date', half: true },
      { key: 'price', label: '가격 (원, 전체 숙박)', type: 'price', placeholder: '450,000' },
      { key: 'via', label: '예약처', type: 'text', placeholder: '트립닷컴, 부킹닷컴', half: true, options: ['트립닷컴', '부킹닷컴', '아고다', '에어비앤비', '호텔스닷컴', '익스피디아', '야놀자', '여기어때', '호텔 홈페이지'] },
      { key: 'link', label: '링크', type: 'url', placeholder: 'https://', half: true },
    ],
    title: (d) => d.name || '이름 없는 숙소',
    sub: (d) => join(d.city, d.checkin && `${md(d.checkin)}${d.checkout ? `~${md(d.checkout)}` : ''}`, nights(d.checkin, d.checkout), d.via),
    price: (d) => num(d.price),
    doneLabel: ['후보', '예약 확정'],
    groups: { off: '숙소 후보', on: '예약한 숙소', offHint: '비교 중인 숙소', onHint: '체크인 날 일정에 자동으로 들어가요' },
    add: '+ 숙소 추가',
    empty: '묵을 곳을 모아 비교해 보세요',
    schedule: (d, done) => (done && d.checkin ? { day: d.checkin, time: '15:00', title: `체크인 · ${d.name || '숙소'}`, category: '숙소', area: d.city ?? '', note: d.checkout ? `체크아웃 ${md(d.checkout)}` : '' } : null),
    status: (es, t) => (!es.length ? 'todo' : es.some((e) => e.done) && uncoveredNights(es, t).length === 0 ? 'done' : 'doing'),
    costDone: true,
  },
  transport: {
    kind: 'transport',
    fields: [
      { key: 'name', label: '이름', type: 'text', placeholder: '공항철도, 신칸센, 렌터카' },
      { key: 'scope', label: '이동 범위', type: 'select', options: ['도시 간 이동', '도시 내 이동'], half: true },
      { key: 'type', label: '종류', type: 'select', options: ['공항 이동', '교통 패스', '기차', '버스', '배·페리', '렌터카', '택시', '기타'], half: true },
      { key: 'from', label: '출발지', type: 'city', placeholder: '역, 공항, 항구' },
      { key: 'to', label: '도착지', type: 'city', placeholder: '역, 공항, 항구' },
      { key: 'date', label: '출발 날짜', type: 'date', half: true },
      { key: 'time', label: '출발 시각 (24시간)', type: 'time', half: true },
      { key: 'arr_date', label: '도착 날짜', type: 'date', half: true },
      { key: 'arr_time', label: '도착 시각 (24시간)', type: 'time', half: true },
      { key: 'price', label: '가격 (원)', type: 'price', placeholder: '30,000' },
      { key: 'memo', label: '메모', type: 'text', placeholder: '타는 곳, 예약번호' },
    ],
    title: (d) => d.name || (d.from || d.to ? `${d.from || '?'} → ${d.to || '?'}` : d.type || '이름 없는 교통편'),
    sub: (d) => join(
      d.name && (d.from || d.to) ? `${d.from || '?'} → ${d.to || '?'}` : '',
      d.date && `${md(d.date)}${d.time ? ` ${d.time}` : ''}${d.arr_time ? `-${d.arr_time}` : ''}`,
      travelTime(d), d.scope, d.type,
    ),
    extra: (d) => (travelTime(d) ? `소요 시간 ${travelTime(d)}` : ''),
    price: (d) => num(d.price),
    doneLabel: ['알아보는 중', '예약·구매 완료'],
    add: '+ 교통편 추가',
    empty: '공항 이동, 도시 간 기차, 페리 같은 걸 정리해요',
    schedule: (d) => (d.date ? {
      day: d.date, time: d.time || null,
      title: join(d.name || d.type || '교통', d.from || d.to ? `${d.from || '?'} → ${d.to || '?'}` : ''),
      category: '이동', area: '',
      note: join(d.arr_time && `도착 ${d.arr_date && d.arr_date !== d.date ? `${md(d.arr_date)} ` : ''}${d.arr_time}`, travelTime(d), d.memo),
    } : null),
    status: allDone,
    costDone: true,
  },
  sight: {
    kind: 'sight',
    fields: [
      { key: 'name', label: '가볼 곳', type: 'text', placeholder: '센소지' },
      { key: 'city', label: '도시', type: 'city' },
      { key: 'date', label: '갈 날', type: 'date', half: true },
      { key: 'time', label: '시각 (24시간)', type: 'time', half: true },
      { key: 'price', label: '입장료 등 (원)', type: 'price', placeholder: '0' },
      { key: 'link', label: '링크', type: 'url', placeholder: 'https://' },
    ],
    title: (d) => d.name || '이름 없는 장소',
    sub: (d) => join(d.city, d.date ? `${md(d.date)}${d.time ? ` ${d.time}` : ''} 일정에 있음` : '날짜 미정'),
    price: (d) => num(d.price),
    doneLabel: ['날짜 미정', '일정에 넣음'],
    add: '+ 가볼 곳 추가',
    empty: '가보고 싶은 곳을 모아두고, 날짜를 정하면 일정에 들어가요',
    autoDone: (d) => !!d.date,
    schedule: (d) => (d.date ? { day: d.date, time: d.time || null, title: d.name || '관광', category: '관광', area: d.city ?? '', note: '' } : null),
    status: allDone,
  },
  food: {
    kind: 'food',
    fields: [
      { key: 'name', label: '가게 이름', type: 'text', placeholder: '이치란 라멘 신주쿠점' },
      { key: 'menu', label: '먹을 메뉴', type: 'text', placeholder: '돈코츠 라멘' },
      { key: 'city', label: '도시', type: 'city' },
      { key: 'date', label: '갈 날', type: 'date', half: true },
      { key: 'time', label: '시각 (24시간)', type: 'time', half: true },
      { key: 'link', label: '링크', type: 'url', placeholder: 'https://' },
    ],
    title: (d) => d.name || '이름 없는 가게',
    sub: (d) => join(d.menu, d.city, d.date ? `${md(d.date)}${d.time ? ` ${d.time}` : ''} 일정에 있음` : '날짜 미정'),
    doneLabel: ['날짜 미정', '일정에 넣음'],
    add: '+ 맛집 추가',
    empty: '먹고 싶은 곳을 모아두고, 날짜를 정하면 일정에 들어가요',
    autoDone: (d) => !!d.date,
    schedule: (d) => (d.date ? { day: d.date, time: d.time || null, title: d.name || '식사', category: '식사', area: d.city ?? '', note: d.menu ?? '' } : null),
    status: allDone,
  },
  shopping: {
    kind: 'shopping',
    fields: [
      { key: 'name', label: '살 것', type: 'text', placeholder: '곤약젤리, 동전파스' },
      { key: 'for', label: '누구 거', type: 'text', placeholder: '엄마 선물', half: true },
      { key: 'price', label: '예산 (원)', type: 'price', placeholder: '20,000', half: true },
      { key: 'where', label: '어디서', type: 'text', placeholder: '돈키호테' },
    ],
    title: (d) => d.name || '이름 없는 물건',
    sub: (d) => join(d.for, d.where, d.price && `예산 ${won(d.price)}`),
    doneLabel: ['살 것', '샀어요'],
    add: '+ 살 것 추가',
    empty: '사 올 것을 적어두고 여행 중에 체크해요',
    checklist: true,
    status: (es) => (es.length ? (es.every((e) => e.done) ? 'done' : 'doing') : 'todo'),
  },
  roaming: {
    kind: 'roaming',
    fields: [
      { key: 'type', label: '방식', type: 'select', options: ['eSIM', '유심', '통신사 로밍', '포켓 와이파이'] },
      { key: 'name', label: '상품·업체', type: 'text', placeholder: '말톡 일본 5일 무제한' },
      { key: 'days', label: '기간·용량', type: 'text', placeholder: '5일, 매일 2GB', half: true },
      { key: 'price', label: '가격 (원)', type: 'price', placeholder: '15,000', half: true },
    ],
    title: (d) => d.name || d.type || '데이터',
    sub: (d) => join(d.type, d.days),
    price: (d) => num(d.price),
    doneLabel: ['비교 중', '구매 완료'],
    add: '+ 데이터 상품 추가',
    empty: 'eSIM, 유심, 로밍 중 무엇을 쓸지 정해요',
    status: (es) => (!es.length ? 'todo' : es.some((e) => e.done) ? 'done' : 'doing'),
    costDone: true,
  },
  exchange: {
    kind: 'exchange',
    fields: [
      { key: 'currency', label: '화폐', type: 'currency', half: true },
      { key: 'amount', label: '바꿀 금액 (현지 돈)', type: 'amount', placeholder: '50,000', half: true },
      { key: 'how', label: '방법', type: 'select', options: ['트래블카드 충전', '은행 환전', '공항 환전', '현지 ATM', '기타'] },
    ],
    title: (d) => (d.amount && d.currency ? `${Number(d.amount).toLocaleString('ko-KR')} ${d.currency}` : d.currency || '환전'),
    sub: (d, ctx) => {
      const r = d.currency && ctx.rates?.[d.currency];
      const krw = r && d.amount ? Math.round(Number(d.amount) / r) : null;
      return join(d.how, krw ? `약 ${krw.toLocaleString('ko-KR')}원 (오늘 환율)` : '');
    },
    doneLabel: ['할 예정', '환전 완료'],
    add: '+ 환전 추가',
    empty: '얼마를 어떻게 바꿀지 적어두세요',
    status: allDone,
  },
  insurance: {
    kind: 'insurance',
    fields: [
      { key: 'name', label: '보험사·상품', type: 'text', placeholder: '마이뱅크 해외여행보험 실속' },
      { key: 'price', label: '보험료 (원)', type: 'price', placeholder: '12,000', half: true },
      { key: 'policy', label: '증권번호', type: 'text', placeholder: '1234-5678', half: true },
      { key: 'phone', label: '긴급 연락처', type: 'text', placeholder: '+82-2-000-0000' },
      { key: 'link', label: '링크', type: 'url', placeholder: 'https://' },
    ],
    title: (d) => d.name || '여행자 보험',
    sub: (d) => join(d.policy && `증권 ${d.policy}`, d.phone && `긴급 ${d.phone}`),
    price: (d) => num(d.price),
    doneLabel: ['비교 중', '가입 완료'],
    add: '+ 보험 추가',
    empty: '비교 중인 보험이나 가입한 보험을 적어두세요',
    status: (es) => (!es.length ? 'todo' : es.some((e) => e.done) ? 'done' : 'doing'),
    costDone: true,
  },
  packing: {
    kind: 'packing',
    fields: [
      { key: 'name', label: '챙길 것', type: 'text', placeholder: '보조배터리' },
      { key: 'group', label: '분류', type: 'select', options: ['서류', '전자기기', '옷', '세면·화장품', '상비약', '기타'] },
    ],
    title: (d) => d.name || '',
    sub: () => '',
    doneLabel: ['챙길 것', '챙김'],
    add: '+ 챙길 것 추가',
    empty: '기본 목록을 불러오거나 직접 추가해요',
    checklist: true,
    status: allDone,
  },
};

export const PACKING_DEFAULT: [string, string][] = [
  ['서류', '여권'], ['서류', '항공권·예약 확인서'], ['서류', '트래블카드·신용카드'], ['서류', '현지 돈'],
  ['전자기기', '휴대폰 충전기'], ['전자기기', '보조배터리'], ['전자기기', '멀티 어댑터'],
  ['옷', '갈아입을 옷'], ['옷', '잠옷'], ['옷', '속옷·양말'],
  ['세면·화장품', '칫솔·치약'], ['세면·화장품', '선크림'],
  ['상비약', '소화제·진통제'], ['상비약', '밴드'],
];

/** 준비 항목 제목으로 종류를 정한다 (기본 템플릿 항목만) */
export const kindOf = (i: Pick<PrepItem, 'stage' | 'title'>): Kind | null => {
  const t = i.title.trim();
  const map: Record<string, Kind> = {
    '2:숙소': 'lodging', '2:교통': 'transport', '3:관광': 'sight', '3:맛집': 'food', '3:쇼핑 목록': 'shopping',
    '4:로밍': 'roaming', '4:환전': 'exchange', '4:여행자 보험': 'insurance', '5:짐 싸기': 'packing',
  };
  return map[`${i.stage}:${t}`] ?? null;
};
export const isSettleItem = (i: Pick<PrepItem, 'stage' | 'title'>) => i.stage === 6 && i.title.trim() === '정산';

export const fetchEntries = async (itemId: string) => {
  const { data } = await supabase.from('prep_entries').select('*').eq('item_id', itemId).order('sort').order('created_at');
  return (data as Entry[]) ?? [];
};

export const entryStatus = (def: KindDef, es: Entry[], t: TripRange): PrepStatus => (def.status ?? allDone)(es, t);
export const entryCost = (def: KindDef, es: Entry[]) => {
  if (!def.price || !def.costDone) return null;
  const xs = es.filter((e) => e.done).map((e) => def.price!(e.data) ?? 0);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
};

/** 항목 하나 저장 + 일정 연동 */
export const saveEntry = async (def: KindDef, e: Partial<Entry> & { trip_id: string; item_id: string; data: Data; done: boolean }) => {
  const done = def.autoDone ? def.autoDone(e.data) : e.done;
  const row = { trip_id: e.trip_id, item_id: e.item_id, kind: def.kind, data: e.data, done, sort: e.sort ?? 0 };
  const res = e.id
    ? await supabase.from('prep_entries').update(row).eq('id', e.id).select('*').single()
    : await supabase.from('prep_entries').insert(row).select('*').single();
  if (res.error || !res.data) return res;
  const saved = res.data as Entry;
  if (def.schedule) {
    await supabase.from('schedule_items').delete().eq('entry_id', saved.id);
    const s = def.schedule(saved.data, saved.done);
    if (s) await supabase.from('schedule_items').insert({ trip_id: saved.trip_id, entry_id: saved.id, day: s.day, time: s.time, title: s.title, category: s.category, area: s.area, note: s.note });
  }
  return res;
};
