import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { errorText } from '../lib/format';
import { syncTripCities } from '../lib/trips';
import PastTripForm, { type PastTripValues } from '../components/PastTripForm';
import { IconX } from '../components/Icons';

const EMPTY: PastTripValues = {
  title: '', cities: [], start_date: null, end_date: null, year: null, month: null, companion: 'couple', total_cost: null, memo: '',
};

export default function PastTrip() {
  const nav = useNavigate();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async (v: PastTripValues) => {
    setErr('');
    setBusy(true);
    try {
      const { cities, ...fields } = v;
      const { data, error } = await supabase
        .from('trips')
        .insert({ ...fields, owner_id: session!.user.id, kind: 'simple' })
        .select('id')
        .single();
      if (error) throw error;
      await syncTripCities(data.id, [], cities);
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
      </div>
      <main className="page" style={{ paddingTop: 8 }}>
        <div className="stack gap4">
          <h1 className="title">지난 여행 기록</h1>
          <p className="muted small">어디를, 언제, 누구와 다녀왔는지 남겨요</p>
        </div>
        <PastTripForm initial={EMPTY} onSubmit={save}>
          {(submit) => (
            <>
              {err && <p className="error" role="alert">{err}</p>}
              <div className="bottom-bar" style={{ margin: '0 -16px -24px' }}>
                <button className="btn block" disabled={busy} onClick={submit}>{busy ? '저장하는 중' : '지도에 추가'}</button>
              </div>
            </>
          )}
        </PastTripForm>
      </main>
    </div>
  );
}
