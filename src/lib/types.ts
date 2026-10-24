export type Companion = 'solo' | 'couple' | 'friends' | 'family' | 'with_kids' | 'business';
export type PrepStatus = 'todo' | 'doing' | 'done';

export const COMPANIONS: { value: Companion; label: string }[] = [
  { value: 'solo', label: '혼자' },
  { value: 'couple', label: '부부' },
  { value: 'friends', label: '친구' },
  { value: 'family', label: '가족' },
  { value: 'with_kids', label: '아이 동반' },
  { value: 'business', label: '출장' },
];
export const companionLabel = (c: Companion) => COMPANIONS.find((x) => x.value === c)?.label ?? c;

export const STAGES: Record<number, string> = {
  1: '출국 서류와 항공',
  2: '숙소와 교통',
  3: '관광, 맛집, 쇼핑',
  4: '로밍, 환전, 보험',
  5: '짐 싸기와 입국 등록',
  6: '정산',
};

/** 단계별 권장 시기: [시작, 끝] 출발 며칠 전 (음수는 여행 후) */
export const STAGE_WHEN: Record<number, { label: string; from: number; to: number }> = {
  1: { label: '1년~3개월 전', from: 365, to: 90 },
  2: { label: '9개월~1개월 전', from: 270, to: 30 },
  3: { label: '2개월~1주 전', from: 60, to: 7 },
  4: { label: '2주~3일 전', from: 14, to: 3 },
  5: { label: '1주 전~출발 전날', from: 7, to: 1 },
  6: { label: '여행 후', from: -1, to: -9999 },
};

export const STATUS_LABEL: Record<PrepStatus, string> = { todo: '준비 전', doing: '진행 중', done: '완료' };
export const NEXT_STATUS: Record<PrepStatus, PrepStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

export const CATEGORIES = ['항공', '이동', '숙소', '식사', '관광', '쇼핑', '준비', '기타'] as const;
export const CATEGORY_COLORS: Record<string, [string, string]> = {
  항공: ['#E3E9FF', '#2F4BC0'],
  이동: ['#DDF3F1', '#16766C'],
  숙소: ['#EFE6FB', '#6B3FB0'],
  식사: ['#FDEBDD', '#B4561B'],
  관광: ['#E2F4E3', '#2E7D32'],
  쇼핑: ['#FCE4EE', '#B0306A'],
  준비: ['#FFF4D6', '#8A6200'],
  기타: ['#EEF0F4', '#4E5568'],
};
export const catStyle = (c: string) => {
  const [bg, fg] = CATEGORY_COLORS[c] ?? CATEGORY_COLORS['기타'];
  return { background: bg, color: fg, fontWeight: 600 };
};

export interface CityRef {
  id: number;
  name_en: string;
  name_ko: string | null;
  country_code: string;
  lat?: number;
  lng?: number;
}

export interface Trip {
  id: string;
  owner_id: string;
  kind: 'simple' | 'full';
  title: string;
  companion: Companion;
  start_date: string | null;
  end_date: string | null;
  year: number | null;
  month: number | null;
  budget: number | null;
  total_cost: number | null;
  headcount: number;
  memo: string;
  visibility: 'private' | 'group' | 'public';
  group_id: string | null;
  created_at: string;
  flight_mode?: string;
  members?: string[];
  settled?: boolean;
  trip_cities?: { sort: number; arrive?: string | null; depart?: string | null; note?: string; cities: CityRef }[];
  prep_items?: { status: PrepStatus; cost: number | null }[];
}

export interface PrepItem {
  id: string;
  trip_id: string;
  stage: number;
  title: string;
  status: PrepStatus;
  cost: number | null;
  note: string;
  sort: number;
  currency?: string;
  amount?: number | null;
}

export interface ScheduleItem {
  id: string;
  trip_id: string;
  day: string;
  time: string | null;
  title: string;
  category: string;
  area: string;
  cost: number | null;
  note: string;
  currency?: string;
  amount?: number | null;
  flight_id?: string | null;
  entry_id?: string | null;
  payer?: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  tickets: number;
  like_coupons: number;
  free_trips_used: number;
  likes_received: number;
  is_admin: boolean;
  referral_count: number;
  referred_by: string | null;
}

export interface Group {
  id: string;
  name: string;
  owner_id: string;
}
