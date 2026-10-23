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
  if (m.includes('NO_TICKET')) return '티켓이 없어요. 지갑에서 티켓을 확인해 주세요.';
  if (m.includes('rate limit')) return '잠시 후 다시 시도해 주세요.';
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
};
