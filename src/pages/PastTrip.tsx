import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorText, hasTicket, ticketNotice } from '../lib/format';
import { syncTripCities } from '../lib/trips';
import PastTripForm, { type PastTripValues } from '../components/PastTripForm';
import { IconPin, IconTemplate, IconTicket, IconX } from '../components/Icons';

const EMPTY: PastTripValues = {
  title: '', cities: [], start_date: null, end_date: null, year: null, month: null, companion: 'couple', total_cost: null, memo: '', headcount: 2,
};

export default function PastTrip() {
  const nav = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const [detailed, setDetailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async (v: PastTripValues) => {
    setErr('');
    if (detailed && !hasTicket(profile)) return setErr('탑승권이 없어요. 간단히 기록하거나 지갑에서 탑승권을 확인해 주세요.');
    setBusy(true);
    let tripId = '';
    try {
      const { cities, ...fields } = v;
      const { data, error } = await supabase
        .from('trips')
        .insert({ ...fields, owner_id: session!.user.id, kind: 'simple' })
        .select('id')
        .single();
      if (error) throw error;
      tripId = data.id;
      await syncTripCities(tripId, [], cities);
      if (detailed) {
        const { error: e2 } = await supabase.rpc('upgrade_trip', { tid: tripId, p_start: v.start_date, p_end: v.end_date, p_headcount: v.headcount ?? 1 });
        if (e2) throw e2;
        await refreshProfile();
        nav(`/trips/${tripId}`, { replace: true });
        return;
      }
      nav('/', { replace: true });
    } catch (e) {
      setBusy(false);
      if (tripId && detailed) {
        setErr(`간단 기록으로는 저장됐어요. 자세히 기록으로 바꾸지 못했어요: ${errorText(e)}`);
        setTimeout(() => nav(`/trips/${tripId}`, { replace: true }), 1800);
        return;
      }
      setErr(errorText(e));
    }
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="닫기" onClick={() => nav(-1)}><IconX s={22} /></button>
      </div>
      <main className="page" style={{ paddingTop: 8 }}>
        <div className="stack gap4">
          <h1 className="title">지난 여행 기록</h1>
          <p className="muted small">다녀온 여행을 남겨요</p>
        </div>

        <div className="two" role="radiogroup" aria-label="기록 방식">
          {[
            { v: false, t: '간단히', d: '어디를, 언제, 누구와', icon: <IconPin s={22} /> },
            { v: true, t: '자세히', d: '준비, 일정, 정산까지', icon: <IconTemplate s={22} /> },
          ].map((o) => (
            <button key={String(o.v)} type="button" role="radio" aria-checked={detailed === o.v} onClick={() => setDetailed(o.v)}
              className="stack gap4"
              style={{ alignItems: 'flex-start', textAlign: 'left', padding: 14, borderRadius: 14, cursor: 'pointer',
                border: detailed === o.v ? '2px solid var(--brand)' : '1px solid var(--line-2)',
                background: detailed === o.v ? 'var(--brand-soft)' : '#fff', color: 'var(--ink)' }}>
              <span style={{ color: 'var(--brand)', display: 'flex' }}>{o.icon}</span>
              <b style={{ fontSize: 15 }}>{o.t}</b>
              <span className="xs muted">{o.d}</span>
            </button>
          ))}
        </div>
        {detailed && (
          <div className="notice row gap8">
            <span style={{ color: 'var(--brand)', display: 'flex' }}><IconTicket s={18} /></span>
            <span>
              새 여행처럼 준비·일정·정보 탭이 생겨요. 다녀온 여행이라 준비 항목은 완료 상태로 시작해요.
               {ticketNotice(profile)}
            </span>
          </div>
        )}

        <PastTripForm initial={EMPTY} detailed={detailed} onSubmit={save}>
          {(submit) => (
            <>
              {err && <p className="error" role="alert">{err}</p>}
              <div className="bottom-bar" style={{ margin: '0 -16px -24px' }}>
                <button className="btn block" disabled={busy} onClick={submit}>
                  {busy ? '저장하는 중' : detailed ? '자세히 기록 시작' : '지도에 추가'}
                </button>
              </div>
            </>
          )}
        </PastTripForm>
      </main>
    </div>
  );
}
