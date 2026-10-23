import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { errorText, parseDate, todayStr } from '../lib/format';

interface Passport { issued: string | null; expires: string | null }

const fmt = (s: string) => { const d = parseDate(s); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

/** 오늘부터 만료일까지 남은 기간 */
export const remaining = (expires: string) => {
  const a = parseDate(todayStr());
  const b = parseDate(expires);
  if (b < a) return { months: -1, text: '만료됐어요' };
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const text = months < 1 ? `${Math.round((b.getTime() - a.getTime()) / 864e5)}일 남았어요`
    : `${y ? `${y}년 ` : ''}${m ? `${m}개월 ` : ''}남았어요`;
  return { months, text };
};

export default function PassportCard() {
  const [p, setP] = useState<Passport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [issued, setIssued] = useState('');
  const [expires, setExpires] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('passports').select('issued, expires').maybeSingle().then(({ data }) => {
      setP(data as Passport | null);
      setLoaded(true);
    });
  }, []);

  const start = () => {
    setIssued(p?.issued ?? '');
    setExpires(p?.expires ?? '');
    setErr('');
    setEdit(true);
  };

  const onIssued = (v: string) => {
    setIssued(v);
    // 일반 여권은 보통 발급일로부터 10년에서 하루 전까지
    if (v && !expires) {
      const d = parseDate(v);
      d.setFullYear(d.getFullYear() + 10);
      d.setDate(d.getDate() - 1);
      setExpires(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  };

  const save = async () => {
    if (!issued || !expires) return setErr('발급일과 만료일을 모두 골라주세요.');
    if (expires <= issued) return setErr('만료일이 발급일보다 늦어야 해요.');
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('passports').upsert({ user_id: u.user?.id, issued, expires, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setErr(errorText(error));
    setP({ issued, expires });
    setEdit(false);
  };

  if (!loaded) return null;

  if (edit) {
    return (
      <div className="card stack gap12">
        <b>여권 정보</b>
        <div className="two">
          <label className="field"><span>발급일</span><input className="input" type="date" value={issued} max={todayStr()} onChange={(e) => onIssued(e.target.value)} /></label>
          <label className="field"><span>만료일</span><input className="input" type="date" value={expires} min={issued || undefined} onChange={(e) => setExpires(e.target.value)} /></label>
        </div>
        <span className="xs muted">여권번호나 이름 같은 개인정보는 저장하지 않아요. 날짜는 나만 볼 수 있어요.</span>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="row gap8">
          <button className="btn secondary small" onClick={() => setEdit(false)}>취소</button>
          <button className="btn small grow" disabled={busy} onClick={save}>저장</button>
        </div>
      </div>
    );
  }

  if (!p?.expires) {
    return (
      <button className="card stack gap4" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={start}>
        <b>여권 정보 넣기</b>
        <span className="xs muted">발급일과 만료일을 넣어두면, 여행 준비할 때 여권 유효기간을 함께 확인해 드려요.</span>
      </button>
    );
  }

  const r = remaining(p.expires);
  const warn = r.months < 6;
  return (
    <div className="passport stack gap12">
      <div className="row between">
        <b style={{ letterSpacing: 2, fontSize: 13 }}>PASSPORT</b>
        <button className="link-btn" style={{ color: '#fff' }} onClick={start}>고치기</button>
      </div>
      <div className="two">
        <div className="stack gap4"><span className="xs muted-w">발급일</span><b>{p.issued ? fmt(p.issued) : '-'}</b></div>
        <div className="stack gap4"><span className="xs muted-w">만료일</span><b>{fmt(p.expires)}</b></div>
      </div>
      <span className="small" style={{ color: warn ? 'var(--gold)' : '#fff', fontWeight: 700 }}>
        {r.text}{warn ? ' · 많은 나라가 입국 때 6개월 이상 남은 여권을 요구해요' : ''}
      </span>
    </div>
  );
}
