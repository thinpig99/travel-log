import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { ensureCity, type City } from '../lib/geo';
import { errorText } from '../lib/format';
import type { Companion } from '../lib/types';
import CityPicker from '../components/CityPicker';
import CompanionPicker from '../components/CompanionPicker';
import { IconX } from '../components/Icons';

export default function PastTrip() {
  const nav = useNavigate();
  const { session } = useAuth();
  const thisYear = new Date().getFullYear();
  const [cities, setCities] = useState<City[]>([]);
  const [year, setYear] = useState(String(thisYear));
  const [month, setMonth] = useState('');
  const [companion, setCompanion] = useState<Companion>('couple');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    const y = Number(year);
    const m = month ? Number(month) : null;
    if (!cities.length) return setErr('다녀온 도시를 하나 이상 골라주세요.');
    if (!y || y < 1950 || y > thisYear) return setErr('연도를 확인해 주세요.');
    if (m != null && (m < 1 || m > 12)) return setErr('월은 1에서 12 사이로 적어주세요.');
    setBusy(true);
    try {
      await Promise.all(cities.map(ensureCity));
      const title = cities.slice(0, 3).map((c) => c.nameKo || c.nameEn).join(', ');
      const { data, error } = await supabase
        .from('trips')
        .insert({ owner_id: session!.user.id, kind: 'simple', title, companion, year: y, month: m, memo: memo.trim() })
        .select('id')
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase
        .from('trip_cities')
        .insert(cities.map((c, i) => ({ trip_id: data.id, city_id: c.id, sort: i })));
      if (e2) throw e2;
      nav('/', { replace: true });
    } catch (e) {
      setErr(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="닫기" onClick={() => nav(-1)}><IconX s={22} /></button>
        <span className="small" style={{ color: 'var(--brand)', fontWeight: 500, paddingRight: 12 }}>무료</span>
      </div>
      <main className="page" style={{ paddingTop: 8 }}>
        <div className="stack gap4">
          <h1 className="title">지난 여행 기록</h1>
          <p className="muted small">어디를, 언제, 누구와 다녀왔는지만 남겨요</p>
        </div>
        <div className="field">
          <span>다녀온 도시</span>
          <CityPicker value={cities} onChange={setCities} />
        </div>
        <div className="field">
          <span>시기</span>
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
        </div>
        <div className="field">
          <span>누구와</span>
          <CompanionPicker value={companion} onChange={setCompanion} />
        </div>
        <label className="field">
          <span>한 줄 메모 (선택)</span>
          <input className="input" value={memo} maxLength={80} onChange={(e) => setMemo(e.target.value)} placeholder="융프라우에서 본 눈 덮인 6월" />
        </label>
        {err && <p className="error" role="alert">{err}</p>}
      </main>
      <div className="bottom-bar">
        <button className="btn block" disabled={busy} onClick={save}>{busy ? '저장하는 중' : '지도에 추가'}</button>
      </div>
    </div>
  );
}
