import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TRIP_SELECT, tripCities } from '../lib/trips';
import { STAGES, companionLabel, type PrepItem, type Trip } from '../lib/types';
import { dayLabel, errorText, todayStr, won } from '../lib/format';
import { IconBack, IconX } from '../components/Icons';

export default function Finish() {
  const { id } = useParams();
  const nav = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [prep, setPrep] = useState<PrepItem[]>([]);
  const [pub, setPub] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('trips').select(TRIP_SELECT).eq('id', id!).maybeSingle(),
      supabase.from('prep_items').select('*').eq('trip_id', id!),
    ]).then(([t, p]) => {
      setTrip(t.data as Trip);
      setPrep((p.data as PrepItem[]) ?? []);
      if (t.data && (t.data as Trip).visibility === 'public') setPub(true);
    });
  }, [id]);

  if (!trip) return <div className="center-fill muted">불러오는 중</div>;
  const ended = !!trip.end_date && trip.end_date < todayStr();
  const total = prep.reduce((a, p) => a + (p.cost ?? 0), 0);

  const submit = async () => {
    setBusy(true);
    setErr('');
    const { error } = await supabase.rpc('publish_trip', { tid: trip.id, make_public: pub });
    setBusy(false);
    if (error) return setErr(errorText(error));
    nav(pub ? `/board/${trip.id}` : `/trips/${trip.id}`, { replace: true });
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><IconBack /></button>
      </div>
      <main className="page" style={{ paddingTop: 4 }}>
        <div className="stack gap4">
          <h1 className="title">여행을 마무리할게요</h1>
          <span className="small muted">{trip.title} · {trip.end_date ? `${dayLabel(trip.end_date)}에 끝나요` : ''}</span>
        </div>
        {!ended && <p className="notice">여행이 끝난 다음 날부터 게시판에 공개할 수 있어요. 지금은 정산만 확인할 수 있어요.</p>}

        <div className="soft-card stack gap8">
          <span className="small" style={{ fontWeight: 700 }}>최종 정산</span>
          {[1, 2, 3, 4, 5, 6].map((st) => {
            const sum = prep.filter((p) => p.stage === st).reduce((a, p) => a + (p.cost ?? 0), 0);
            return sum ? <div key={st} className="row between small"><span className="muted">{STAGES[st]}</span><span>{won(sum)}</span></div> : null;
          })}
          <div className="row between" style={{ paddingTop: 8, borderTop: '1px solid var(--land)', fontWeight: 700 }}><span>합계</span><span>{won(total)}</span></div>
          <div className="row between" style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
            <span className="small">1인당 ({trip.headcount}명)</span><b style={{ fontSize: 17 }}>{won(total / Math.max(1, trip.headcount))}</b>
          </div>
          {trip.budget ? <span className="xs muted">예산 {won(trip.budget)} 대비 {Math.round((total / trip.budget) * 100)}%</span> : null}
        </div>

        {ended && (
          <>
            <div className="field">
              <span>공개 범위</span>
              {[
                { v: false, t: trip.group_id ? '그룹만 보기' : '나만 보기', d: '지도와 기록은 그대로 남아요' },
                { v: true, t: '전체 공개', d: `${tripCities(trip).slice(0, 2).join(', ')} 게시판에 올라가요` },
              ].map((o) => (
                <button key={String(o.v)} className="sheet-option" aria-pressed={pub === o.v} onClick={() => setPub(o.v)}
                  style={{ justifyContent: 'space-between', border: pub === o.v ? '2px solid var(--brand)' : undefined }}>
                  <span className="stack gap4"><b style={{ fontWeight: pub === o.v ? 700 : 500 }}>{o.t}</b><span className="xs muted">{o.d}</span></span>
                  <span style={{ width: 20, height: 20, borderRadius: 10, border: pub === o.v ? '6px solid var(--brand)' : '2px solid #b9c3ca' }} />
                </button>
              ))}
            </div>
            {pub && (
              <div className="stack gap6 small">
                <span style={{ fontWeight: 700 }}>공개되는 정보</span>
                <span>· 일정, 숙소, 날짜, 비용, 준비 항목과 메모</span>
                <span>· 동행 유형: {companionLabel(trip.companion)} {trip.headcount}명</span>
                <span>· 작성자: 내 정보의 이름</span>
                <span className="row gap6 muted"><IconX s={16} />그룹 멤버 이름과 이메일은 공개되지 않아요</span>
                <span className="xs muted">준비 메모에 개인 정보가 있다면 공개 전에 지워주세요.</span>
              </div>
            )}
          </>
        )}
        {err && <p className="error" role="alert">{err}</p>}
      </main>
      {ended && (
        <div className="bottom-bar">
          <button className="btn block" disabled={busy} onClick={submit}>{pub ? '마무리하고 공개' : '마무리하기'}</button>
        </div>
      )}
    </div>
  );
}
