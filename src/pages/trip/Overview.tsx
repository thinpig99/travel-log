import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { errorText, numOrNull, won } from '../../lib/format';
import type { Companion, Group, PrepItem, ScheduleItem, Trip } from '../../lib/types';
import CompanionPicker from '../../components/CompanionPicker';

interface Props {
  trip: Trip;
  prep: PrepItem[];
  sched: ScheduleItem[];
  groups: Group[];
  isOwner: boolean;
  onChange: () => void;
}

export default function Overview({ trip, prep, sched, groups, isOwner, onChange }: Props) {
  const nav = useNavigate();
  const full = trip.kind === 'full';
  const prepSum = prep.reduce((s, i) => s + (i.cost ?? 0), 0);
  const schedSum = sched.reduce((s, i) => s + (i.cost ?? 0), 0);
  const spent = prepSum;
  const ratio = trip.budget ? spent / trip.budget : 0;
  const done = prep.filter((i) => i.status === 'done').length;

  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [budget, setBudget] = useState(trip.budget ? trip.budget.toLocaleString('ko-KR') : '');
  const [headcount, setHeadcount] = useState(String(trip.headcount));
  const [companion, setCompanion] = useState<Companion>(trip.companion);
  const [groupId, setGroupId] = useState(trip.group_id ?? '');
  const [memo, setMemo] = useState(trip.memo);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const save = async () => {
    if (!title.trim()) return setErr('여행 이름을 적어주세요.');
    setBusy(true);
    setErr('');
    const patch: Partial<Trip> = { title: title.trim(), companion, memo: memo.trim() };
    if (full) {
      patch.budget = numOrNull(budget);
      patch.headcount = Math.max(1, Number(headcount) || 1);
      if (isOwner) {
        patch.group_id = groupId || null;
        patch.visibility = groupId ? 'group' : 'private';
      }
    }
    const { error } = await supabase.from('trips').update(patch).eq('id', trip.id);
    setBusy(false);
    if (error) return setErr(errorText(error));
    setEdit(false);
    onChange();
  };

  const remove = async () => {
    const { error } = await supabase.from('trips').delete().eq('id', trip.id);
    if (error) return setErr(errorText(error));
    nav('/', { replace: true });
  };

  return (
    <div className="stack gap16">
      {full && (
        <div className="soft-card stack gap8">
          <div className="row between">
            <span className="small muted">지출 / 예산</span>
            {trip.budget ? (
              <span className="xs" style={{ fontWeight: 700, color: ratio > 1 ? 'var(--over)' : 'var(--brand-ink)' }}>예산 {Math.round(ratio * 100)}%</span>
            ) : null}
          </div>
          <div className="row gap6" style={{ alignItems: 'baseline' }}>
            <b style={{ fontSize: 22 }}>{won(spent)}</b>
            <span className="small muted">/ {trip.budget ? won(trip.budget) : '예산 미정'}</span>
          </div>
          {trip.budget ? (
            <div className={`bar ${ratio > 1 ? 'over' : ''}`}><div style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
          ) : null}
          <div className="row between" style={{ marginTop: 4, padding: '10px 12px', borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
            <span className="small">1인당 ({trip.headcount}명)</span>
            <b>{won(spent / Math.max(1, trip.headcount))}</b>
          </div>
          <span className="xs muted">지출은 준비 항목 비용의 합계예요 · 일정에 적은 비용 합계 {won(schedSum)} · 준비 {done}/{prep.length} 완료</span>
        </div>
      )}

      {!edit ? (
        <div className="stack">
          {trip.memo && <p className="small" style={{ padding: '4px 0 12px' }}>{trip.memo}</p>}
          <button className="btn secondary block" onClick={() => setEdit(true)}>여행 정보 고치기</button>
        </div>
      ) : (
        <div className="stack gap12">
          <label className="field"><span>여행 이름</span><input className="input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} /></label>
          {full && (
            <div className="two">
              <label className="field"><span>총 예산 (원)</span><input className="input" inputMode="numeric" value={budget} onChange={(e) => { const n = numOrNull(e.target.value); setBudget(n == null ? '' : n.toLocaleString('ko-KR')); }} /></label>
              <label className="field"><span>인원</span><input className="input" inputMode="numeric" value={headcount} onChange={(e) => setHeadcount(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
            </div>
          )}
          <div className="field"><span>누구와</span><CompanionPicker value={companion} onChange={setCompanion} /></div>
          {full && isOwner && (
            <label className="field">
              <span>함께 볼 사람</span>
              <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">나만 보기</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name} 그룹과 공유</option>)}
              </select>
            </label>
          )}
          <label className="field"><span>메모</span><textarea className="input" value={memo} onChange={(e) => setMemo(e.target.value)} /></label>
          <div className="row gap8">
            <button className="btn secondary" onClick={() => setEdit(false)}>취소</button>
            <button className="btn grow" disabled={busy} onClick={save}>저장</button>
          </div>
        </div>
      )}
      {err && <p className="error" role="alert">{err}</p>}

      {isOwner && (
        <div className="stack gap8" style={{ marginTop: 8 }}>
          {!confirmDel ? (
            <button className="link-btn" style={{ color: 'var(--red-ink)', alignSelf: 'flex-start' }} onClick={() => setConfirmDel(true)}>이 여행 지우기</button>
          ) : (
            <div className="notice stack gap8">
              <span>이 여행과 준비, 일정이 모두 지워지고 되돌릴 수 없어요.</span>
              <div className="row gap8">
                <button className="btn secondary small" onClick={() => setConfirmDel(false)}>취소</button>
                <button className="btn danger small" onClick={remove}>지우기</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
