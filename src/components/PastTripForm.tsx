import { useState } from 'react';
import type { City } from '../lib/geo';
import type { Companion } from '../lib/types';
import { numOrNull, todayStr } from '../lib/format';
import CityPicker from './CityPicker';
import CompanionPicker from './CompanionPicker';

export interface PastTripValues {
  title: string;
  cities: City[];
  start_date: string | null;
  end_date: string | null;
  year: number | null;
  month: number | null;
  companion: Companion;
  total_cost: number | null;
  memo: string;
  headcount?: number;
}

export const autoTitle = (cities: City[]) => cities.slice(0, 3).map((c) => c.nameKo || c.nameEn).join(', ');

export default function PastTripForm({ initial, onSubmit, children, detailed = false }: {
  initial: PastTripValues;
  detailed?: boolean;
  onSubmit: (v: PastTripValues) => void;
  children: (submit: () => void) => React.ReactNode;
}) {
  const thisYear = new Date().getFullYear();
  const [title, setTitle] = useState(initial.title);
  const [cities, setCities] = useState<City[]>(initial.cities);
  const [exact, setExact] = useState(!!initial.start_date || !initial.year);
  const [start, setStart] = useState(initial.start_date ?? '');
  const [end, setEnd] = useState(initial.end_date ?? '');
  const [year, setYear] = useState(initial.year ? String(initial.year) : String(thisYear));
  const [month, setMonth] = useState(initial.month ? String(initial.month) : '');
  const [companion, setCompanion] = useState<Companion>(initial.companion);
  const [cost, setCost] = useState(initial.total_cost != null ? initial.total_cost.toLocaleString('ko-KR') : '');
  const [memo, setMemo] = useState(initial.memo);
  const [headcount, setHeadcount] = useState(String(initial.headcount ?? 2));
  const [err, setErr] = useState('');

  const submit = () => {
    setErr('');
    if (!cities.length) return setErr('다녀온 도시를 하나 이상 골라주세요.');
    let s: string | null = null, e: string | null = null, y: number | null = null, m: number | null = null;
    if (exact || detailed) {
      if (!start || !end) return setErr('다녀온 기간을 골라주세요.');
      if (end < start) return setErr('돌아온 날이 떠난 날보다 빨라요.');
      if (start > todayStr()) return setErr('앞으로 갈 여행은 "새 여행 준비"로 만들어 주세요.');
      s = start; e = end; y = Number(start.slice(0, 4)); m = Number(start.slice(5, 7));
    } else {
      y = Number(year);
      m = month ? Number(month) : null;
      if (!y || y < 1950 || y > thisYear) return setErr('연도를 확인해 주세요.');
      if (m != null && (m < 1 || m > 12)) return setErr('월은 1에서 12 사이로 적어주세요.');
    }
    onSubmit({
      title: title.trim() || autoTitle(cities),
      cities, start_date: s, end_date: e, year: y, month: m, companion,
      total_cost: numOrNull(cost), memo: memo.trim(),
      headcount: Math.max(1, Number(headcount) || 1),
    });
  };

  return (
    <>
      <div className="field">
        <span>다녀온 도시</span>
        <CityPicker value={cities} onChange={setCities} />
      </div>
      <label className="field">
        <span>여행 이름</span>
        <input className="input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder={autoTitle(cities) || '스위스와 런던, 신혼여행'} />
      </label>
      <div className="field">
        <div className="row between">
          <span style={{ fontSize: 14, fontWeight: 700 }}>다녀온 기간</span>
          {!detailed && (
            <button type="button" className="link-btn" style={{ padding: 0 }} onClick={() => setExact(!exact)}>
              {exact ? '날짜가 기억나지 않아요' : '날짜로 입력할게요'}
            </button>
          )}
        </div>
        {exact || detailed ? (
          <div className="two">
            <label className="stack gap4">
              <span className="xs muted">떠난 날</span>
              <input className="input" type="date" max={todayStr()} value={start} onChange={(e) => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} />
            </label>
            <label className="stack gap4">
              <span className="xs muted">돌아온 날</span>
              <input className="input" type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="two">
            <label className="stack gap4">
              <span className="xs muted">연도</span>
              <input className="input" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </label>
            <label className="stack gap4">
              <span className="xs muted">월 (선택)</span>
              <input className="input" inputMode="numeric" value={month} placeholder="6" onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </label>
          </div>
        )}
      </div>
      <div className="field">
        <span>누구와</span>
        <CompanionPicker value={companion} onChange={setCompanion} />
      </div>
      {detailed && (
        <label className="field">
          <span>인원</span>
          <input className="input" inputMode="numeric" value={headcount} onChange={(e) => setHeadcount(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
      )}
      <label className="field">
        <span>쓴 돈 (선택)</span>
        <input className="input" inputMode="numeric" value={cost} placeholder="3,000,000" onChange={(e) => { const n = numOrNull(e.target.value); setCost(n == null ? '' : n.toLocaleString('ko-KR')); }} />
      </label>
      <label className="field">
        <span>한 줄 메모 (선택)</span>
        <input className="input" value={memo} maxLength={80} onChange={(e) => setMemo(e.target.value)} placeholder="융프라우에서 본 눈 덮인 6월" />
      </label>
      {err && <p className="error" role="alert">{err}</p>}
      {children(submit)}
    </>
  );
}
