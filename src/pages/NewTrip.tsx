import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { ensureCity, type City } from '../lib/geo';
import { errorText, numOrNull, ticketNotice, todayStr } from '../lib/format';
import type { Companion, Group } from '../lib/types';
import CityPicker from '../components/CityPicker';
import CompanionPicker from '../components/CompanionPicker';
import { IconTicket, IconX } from '../components/Icons';

export default function NewTrip() {
  const nav = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [budget, setBudget] = useState('');
  const [headcount, setHeadcount] = useState('2');
  const [companion, setCompanion] = useState<Companion>('couple');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [noTicket, setNoTicket] = useState(false);

  useEffect(() => {
    supabase.from('groups').select('*').order('created_at').then(({ data }) => setGroups((data as Group[]) ?? []));
  }, []);

  const autoTitle = cities.length ? `${cities.slice(0, 2).map((c) => c.nameKo || c.nameEn).join(', ')} 여행` : '';

  const save = async () => {
    setErr('');
    setNoTicket(false);
    if (!cities.length) return setErr('여행할 도시를 하나 이상 골라주세요.');
    if (!start || !end) return setErr('출발일과 도착일을 골라주세요.');
    if (end < start) return setErr('도착일이 출발일보다 빨라요.');
    if (end < todayStr()) return setErr('이미 끝난 여행은 홈의 "지난 여행 기록"으로 남겨주세요. 도착일은 오늘 이후로 골라주세요.');
    setBusy(true);
    try {
      await Promise.all(cities.map(ensureCity));
      const { data, error } = await supabase.rpc('create_full_trip', {
        p_title: title.trim() || autoTitle,
        p_companion: companion,
        p_start: start,
        p_end: end,
        p_budget: numOrNull(budget),
        p_headcount: Math.max(1, Number(headcount) || 1),
        p_city_ids: cities.map((c) => c.id),
        p_group_id: groupId || null,
      });
      if (error) throw error;
      await refreshProfile();
      nav(`/trips/${data}`, { replace: true });
    } catch (e) {
      const m = errorText(e);
      if ((e as { message?: string }).message?.includes('NO_TICKET')) setNoTicket(true);
      setErr(m);
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="닫기" onClick={() => nav(-1)}><IconX s={22} /></button>
      </div>
      <main className="page" style={{ paddingTop: 8 }}>
        <div className="stack gap4">
          <h1 className="title">새 여행 준비</h1>
          <p className="muted small">준비 6단계 템플릿이 채워진 상태로 시작해요</p>
        </div>
        <div className="field">
          <span>여행할 도시</span>
          <CityPicker value={cities} onChange={setCities} />
        </div>
        <label className="field">
          <span>여행 이름</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={autoTitle || '후쿠오카, 늦가을'} maxLength={40} />
        </label>
        <div className="two">
          <label className="field">
            <span>출발</span>
            <input className="input" type="date" value={start} onChange={(e) => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} />
          </label>
          <label className="field">
            <span>도착</span>
            <input className="input" type="date" value={end} min={start && start > todayStr() ? start : todayStr()} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <div className="two">
          <label className="field">
            <span>총 예산 (원)</span>
            <input className="input" inputMode="numeric" value={budget} onChange={(e) => { const n = numOrNull(e.target.value); setBudget(n == null ? '' : n.toLocaleString('ko-KR')); }} placeholder="2,000,000" />
          </label>
          <label className="field">
            <span>인원</span>
            <input className="input" inputMode="numeric" value={headcount} onChange={(e) => setHeadcount(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </label>
        </div>
        <div className="field">
          <span>누구와</span>
          <CompanionPicker value={companion} onChange={setCompanion} />
        </div>
        <label className="field">
          <span>함께 볼 사람</span>
          <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">나만 보기</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name} 그룹과 공유</option>)}
          </select>
          {groups.length === 0 && <span className="xs muted">함께 준비하려면 내 정보에서 그룹을 만들어 주세요.</span>}
        </label>
        {err && (
          <p className="error" role="alert">
            {err} {noTicket && <Link to="/wallet">지갑 보기</Link>}
          </p>
        )}
      </main>
      <div className="stack gap8" style={{ padding: '12px 16px calc(16px + var(--safe-bottom))', borderTop: '1px solid var(--line)' }}>
                  <div className="notice row gap8">
            <span style={{ color: 'var(--brand)', display: 'flex' }}><IconTicket s={18} /></span>
            {ticketNotice(profile)}
          </div>
        <button className="btn block" disabled={busy} onClick={save}>{busy ? '만드는 중' : '여행 만들기'}</button>
      </div>
    </div>
  );
}
