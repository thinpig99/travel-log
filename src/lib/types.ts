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
  2: '교통과 숙소',
  3: '맛집, 관광, 쇼핑',
  4: '로밍, 환전, 보험',
  5: '짐 싸기',
  6: '정산',
};

export const STATUS_LABEL: Record<PrepStatus, string> = { todo: '준비 전', doing: '진행 중', done: '완료' };
export const NEXT_STATUS: Record<PrepStatus, PrepStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

export const CATEGORIES = ['항공', '이동', '숙소', '식사', '관광', '쇼핑', '준비', '기타'] as const;

export interface CityRef {
  id: number;
  name_en: string;
  name_ko: string | null;
  country_code: string;
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
  trip_cities?: { sort: number; cities: CityRef }[];
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
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  tickets: number;
  like_coupons: number;
  free_trips_used: number;
  likes_received: number;
}

export interface Group {
  id: string;
  name: string;
  owner_id: string;
}
