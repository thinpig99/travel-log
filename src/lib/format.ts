const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export const won = (n: number | null | undefined) =>
  n == null ? '-' : `${Math.round(n).toLocaleString('ko-KR')}원`;

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const dayLabel = (s: string) => {
  const d = parseDate(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEK[d.getDay()]})`;
};

export const rangeLabel = (a: string, b: string) => `${dayLabel(a)} ~ ${dayLabel(b)}`;

export const nightsDays = (a: string, b: string) => {
  const n = Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5);
  return n === 0 ? '당일' : `${n}박 ${n + 1}일`;
};

export const daysBetween = (a: string, b: string) => {
  const out: string[] = [];
  const d = parseDate(a);
  const end = parseDate(b);
  while (d <= end) {
    out.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

export const dday = (start: string) => {
  const n = Math.round((parseDate(start).getTime() - parseDate(todayStr()).getTime()) / 864e5);
  if (n > 0) return `D-${n}`;
  if (n === 0) return 'D-DAY';
  return '여행 중';
};

export const numOrNull = (s: string) => {
  const v = s.replace(/[^0-9]/g, '');
  return v === '' ? null : Number(v);
};

export const errorText = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e);
  if (m.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (m.includes('Email not confirmed')) return '메일함에서 가입 확인 메일의 링크를 먼저 눌러주세요.';
  if (m.includes('User already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (m.includes('Password should be')) return '비밀번호는 6자 이상이어야 해요.';
  if (m.includes('NO_TICKET')) return '탑승권이 없어요. 지갑에서 탑승권을 확인해 주세요.';
  if (m.includes('NO_COUPON')) return '찍을 수 있는 스탬프가 없어요. 탑승권을 구매하면 스탬프가 함께 생겨요.';
  if (m.includes('ALREADY_LIKED')) return '이미 스탬프를 찍었어요.';
  if (m.includes('LIKE_FIRST')) return '스탬프를 찍은 기록만 복제할 수 있어요.';
  if (m.includes('OWN_TRIP')) return '내 기록에는 스탬프를 찍을 수 없어요.';
  if (m.includes('NOT_FINISHED')) return '여행이 끝난 다음 날부터 공개할 수 있어요.';
  if (m.includes('USE_PUBLISH')) return '공개 설정은 여행 마무리 화면에서 바꿔주세요.';
  if (m.includes('ALREADY_FULL')) return '이미 자세히 기록 중인 여행이에요.';
  if (m.includes('END_IN_PAST')) return '이미 끝난 날짜예요. 여행이 오늘 이후에 끝나도록 골라주세요.';
  if (m.includes('DATES_REQUIRED')) return '다녀온 기간을 골라주세요.';
  if (m.includes('NICKNAME_TAKEN')) return '이미 쓰고 있는 닉네임이에요.';
  if (m.includes('NICKNAME_INVALID')) return '닉네임은 한글, 영문, 숫자, _ 로 2~16자예요.';
  if (m.includes('rate limit')) return '잠시 후 다시 시도해 주세요.';
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
};

export const ticketNotice = (p: { tickets: number; is_admin: boolean } | null) =>
  p?.is_admin ? '관리자 계정이라 탑승권이 차감되지 않아요' : `탑승권 1장을 사용해요 · 보유 ${p?.tickets ?? 0}장`;
export const hasTicket = (p: { tickets: number; is_admin: boolean } | null) => !!p && (p.is_admin || p.tickets > 0);
export const ticketCount = (p: { tickets: number; is_admin: boolean } | null) => (p?.is_admin ? '무제한' : String(p?.tickets ?? 0));

export const money = (n: number, cur: string) => {
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toLocaleString('ko-KR')} ${cur}`;
  }
};
export const costLabel = (i: { cost: number | null; currency?: string; amount?: number | null }) => {
  if (i.cost == null) return '';
  if (i.currency && i.currency !== 'KRW' && i.amount != null) return `${money(i.amount, i.currency)} · ${won(i.cost)}`;
  return won(i.cost);
};

let ratesP: Promise<Record<string, number>> | null = null;
/** KRW 기준 환율 (1원 = x 외화) */
export const loadRates = () =>
  (ratesP ??= fetch('https://open.er-api.com/v6/latest/KRW')
    .then((r) => r.json())
    .then((j) => j.rates as Record<string, number>)
    .catch((e) => { ratesP = null; throw e; }));
