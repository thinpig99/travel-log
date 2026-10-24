import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TRIP_SELECT, tripCities } from '../lib/trips';
import { companionLabel, type Trip } from '../lib/types';
import { dayLabel, errorText, todayStr } from '../lib/format';
import { IconBack, IconX } from '../components/Icons';

/** 게시판에 공개하기. 공개해도 계속 고칠 수 있고, 언제든 공개를 취소할 수 있다 */
export default function Finish() {
  const { id } = useParams();
  const nav = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('trips').select(TRIP_SELECT).eq('id', id!).maybeSingle().then(({ data }) => setTrip(data as Trip));
  }, [id]);

  if (!trip) return <div className="center-fill muted">불러오는 중</div>;
  const ended = !!trip.end_date && trip.end_date < todayStr();
  const cities = tripCities(trip).slice(0, 2).join(', ');

  const submit = async () => {
    setBusy(true);
    setErr('');
    const { error } = await supabase.rpc('publish_trip', { tid: trip.id, make_public: true });
    setBusy(false);
    if (error) return setErr(errorText(error));
    nav(`/board/${trip.id}`, { replace: true });
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="뒤로" onClick={() => nav(-1)}><IconBack /></button>
      </div>
      <main className="page" style={{ paddingTop: 4 }}>
        <div className="stack gap4">
          <h1 className="title">게시판에 공개하기</h1>
          <span className="small muted">{trip.title}{trip.end_date ? ` · ${dayLabel(trip.end_date)}에 끝난 여행` : ''}</span>
        </div>
        {!ended && <p className="notice">여행이 끝난 다음 날부터 게시판에 공개할 수 있어요.</p>}

        <div className="soft-card stack gap8 small">
          <b>{cities} 게시판에 올라가요</b>
          <span>· 일정, 숙소, 날짜, 비용, 준비 항목</span>
          <span>· 동행 유형: {companionLabel(trip.companion)} {trip.headcount}명</span>
          <span>· 작성자: 내 정보의 닉네임</span>
          <span className="row gap6 muted"><IconX s={16} />메모는 공개되지 않아요. 나와 함께 보는 그룹만 볼 수 있어요</span>
          <span className="row gap6 muted"><IconX s={16} />그룹 멤버 이름과 이메일은 공개되지 않아요</span>
        </div>
        <p className="xs muted">공개한 뒤에도 일정과 준비 항목을 계속 고칠 수 있고, 고친 내용은 게시판에도 바로 반영돼요. 여행 화면에서 언제든 공개를 취소할 수 있어요.</p>
        {err && <p className="error" role="alert">{err}</p>}
      </main>
      {ended && (
        <div className="bottom-bar">
          <button className="btn block" disabled={busy} onClick={submit}>게시판에 공개하기</button>
        </div>
      )}
    </div>
  );
}
