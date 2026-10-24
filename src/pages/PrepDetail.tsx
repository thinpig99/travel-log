import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TRIP_SELECT } from '../lib/trips';
import { errorText } from '../lib/format';
import { STAGES, STATUS_LABEL, type PrepItem, type PrepStatus, type Trip } from '../lib/types';
import { IconBack } from '../components/Icons';
import { CostInput, useCost, useTripCurrencies } from '../components/CostInput';
import PassportCheck from '../components/PassportCheck';
import VisaInfo, { isVisaItem } from '../components/VisaInfo';
import ArrivalInfo from '../components/ArrivalInfo';
import { isArrivalItem } from '../lib/entry';
import FlightEditor, { fitSegments } from '../components/FlightEditor';
import { fetchFlights, flightsComplete, flightsTouched, isFlightItem, saveFlights, type Flight, type FlightMode, type FlightOption } from '../lib/flights';
import FlightOptions from '../components/FlightOptions';
import { isPassportItem } from '../lib/passport';

export default function PrepDetail() {
  const { id, itemId } = useParams();
  const nav = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [item, setItem] = useState<PrepItem | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('trips').select(TRIP_SELECT).eq('id', id!).maybeSingle(),
      supabase.from('prep_items').select('*').eq('id', itemId!).maybeSingle(),
    ]).then(([t, p]) => {
      if (!t.data || !p.data) return setMissing(true);
      setTrip(t.data as Trip);
      setItem(p.data as PrepItem);
    });
  }, [id, itemId]);

  const back = () => (window.history.length > 1 ? nav(-1) : nav(`/trips/${id}?tab=prep`, { replace: true }));

  if (missing) return <div className="center-fill stack gap12"><span className="muted">항목을 찾을 수 없어요.</span><button className="btn secondary small" onClick={() => nav(`/trips/${id}?tab=prep`)}>준비 목록으로</button></div>;
  if (!trip || !item) return <div className="center-fill muted">불러오는 중</div>;
  if (isPassportItem(item)) {
    return (
      <div className="screen">
        <div className="topbar">
          <button className="icon-btn" aria-label="뒤로" onClick={back}><IconBack /></button>
          <span className="xs muted" style={{ paddingRight: 12 }}>{trip.title}</span>
        </div>
        <main className="page" style={{ paddingTop: 4 }}>
          <div className="stack gap8">
            <span className="small muted">{item.stage}단계 · {STAGES[item.stage]}</span>
            <h1 className="title">여권</h1>
          </div>
          <PassportCheck trip={trip} />
        </main>
      </div>
    );
  }
  return <Editor trip={trip} item={item} onBack={back} />;
}

function Editor({ trip, item, onBack }: { trip: Trip; item: PrepItem; onBack: () => void }) {
  const currencies = useTripCurrencies(trip);
  const c = useCost(item, currencies);
  const [title, setTitle] = useState(item.title);
  const [status, setStatus] = useState<PrepStatus>(item.status);
  const [note, setNote] = useState(item.note);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const setStatusNow = async (s: PrepStatus) => {
    setStatus(s);
    const { error } = await supabase.from('prep_items').update({ status: s }).eq('id', item.id);
    if (error) setErr(errorText(error));
  };

  const flightItem = isFlightItem(item);
  const start = trip.start_date ?? '';
  const end = trip.end_date ?? '';
  const [mode, setMode] = useState<FlightMode>((trip.flight_mode as FlightMode) ?? 'round');
  const [segs, setSegs] = useState<Flight[] | null>(flightItem ? null : []);
  useEffect(() => {
    if (!flightItem) return;
    fetchFlights(trip.id).then((f) => setSegs(fitSegments((trip.flight_mode as FlightMode) ?? 'round', f, start, end)));
  }, [trip.id]);

  const [optCount, setOptCount] = useState<number | null>(null);
  const autoStatus: PrepStatus | null = flightItem && segs && optCount != null
    ? flightsComplete(segs) ? 'done' : optCount > 0 || flightsTouched(segs) ? 'doing' : 'todo'
    : null;
  const shownStatus = autoStatus ?? status;
  const onOptCount = (n: number) => {
    setOptCount((prev) => {
      if (prev != null && segs && !flightsComplete(segs)) {
        const s: PrepStatus = n > 0 || flightsTouched(segs) ? 'doing' : 'todo';
        supabase.from('prep_items').update({ status: s }).eq('id', item.id).then(() => {});
      }
      return n;
    });
  };
  const pickOption = (o: FlightOption) => {
    if (!segs) return;
    const date = o.dep_date ?? '';
    const code = (o.airline.match(/^[A-Z0-9]{2}$/i) ? o.airline.toUpperCase() : '');
    const fill = (s: Flight): Flight => ({ ...s, dep_airport: o.dep_airport, arr_airport: o.arr_airport, dep_date: date || s.dep_date, arr_date: date || s.arr_date, dep_time: (o.dep_time ?? '').slice(0, 5) || s.dep_time, flight_no: s.flight_no || code });
    const idx = segs.findIndex((s) => !flightsComplete([s]));
    if (idx >= 0) setSegs(segs.map((s, i) => (i === idx ? fill(s) : s)));
    else if (mode === 'multi') setSegs([...segs, fill({ flight_no: '', dep_airport: '', dep_date: '', dep_time: '', arr_airport: '', arr_date: '', arr_time: '' })]);
    else return setErr('확정 항공편이 모두 채워져 있어요. 바꿀 항공편의 내용을 먼저 지워주세요.');
    setErr('');
    document.getElementById('confirmed-flights')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const save = async () => {
    if (!title.trim()) return setErr('항목 이름을 적어주세요.');
    if (flightItem && segs) {
      const bad = segs.find((s) => s.arr_date && s.dep_date && s.arr_date < s.dep_date);
      if (bad) return setErr('도착 날짜가 출발 날짜보다 빨라요.');
      const filled = segs.filter((s) => s.flight_no || s.dep_airport || s.arr_airport || s.dep_time);
      const { error: fe } = await saveFlights(trip.id, mode, filled);
      if (fe) return setErr(errorText(fe));
    }
    const v = c.value();
    if (!v) return setErr('환율을 불러오는 중이에요. 잠시 후 다시 눌러주세요.');
    setBusy(true);
    const { error } = await supabase.from('prep_items').update({ title: title.trim(), note: note.trim(), status: shownStatus, ...v }).eq('id', item.id);
    setBusy(false);
    if (error) return setErr(errorText(error));
    onBack();
  };

  const remove = async () => {
    const { error } = await supabase.from('prep_items').delete().eq('id', item.id);
    if (error) return setErr(errorText(error));
    onBack();
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" aria-label="뒤로" onClick={onBack}><IconBack /></button>
        <span className="xs muted" style={{ paddingRight: 12 }}>{trip.title}</span>
      </div>
      <main className="page" style={{ paddingTop: 4 }}>
        <div className="stack gap8">
          <span className="small muted">{item.stage}단계 · {STAGES[item.stage]}</span>
          <input className="title-input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} aria-label="항목 이름" placeholder="항목 이름 (예: 항공권 예매)" />
        </div>

        {isVisaItem(item) && <VisaInfo trip={trip} />}
        {isArrivalItem(item) && <ArrivalInfo trip={trip} />}

        <div className="field">
          <span>진행 상태</span>
          <div className="seg" role="radiogroup" aria-label="진행 상태">
            {(['todo', 'doing', 'done'] as PrepStatus[]).map((s) => (
              <button key={s} role="radio" aria-checked={shownStatus === s} className={`seg-btn ${s} ${shownStatus === s ? 'on' : ''}`}
                disabled={flightItem} onClick={() => setStatusNow(s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {flightItem && <p className="xs muted">후보를 넣으면 진행 중, 확정 항공편을 모두 채우면 완료로 자동으로 바뀌어요.</p>}
        </div>

        <div className="field">
          <span>비용</span>
          <CostInput c={c} example={350000} />
        </div>

        <label className="field">
          <span>메모</span>
          <textarea className="input note-area" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={'준비하면서 챙길 것들을 자유롭게 적어요\n예: 예약번호 AB1234, 체크인 15시, 취소는 3일 전까지'} />
        </label>

        {flightItem && <FlightOptions tripId={trip.id} onCount={onOptCount} onPick={pickOption} />}
        {flightItem && (
          <div id="confirmed-flights" className="stack gap8">
            <span className="row gap6" style={{ alignItems: 'center' }}><span className="chip-fix">확정</span><b style={{ fontSize: 15 }}>확정 항공편</b></span>
            <p className="xs muted">예약을 마친 항공편이에요. 저장하면 일정 탭에 자동으로 들어가요.</p>
            {segs ? <FlightEditor mode={mode} segs={segs} start={start} end={end} onMode={setMode} onChange={setSegs} /> : <p className="small muted">항공편을 불러오는 중</p>}
          </div>
        )}

        {err && <p className="error" role="alert">{err}</p>}

        {!confirmDel ? (
          <button className="link-btn" style={{ color: 'var(--red-ink)', alignSelf: 'flex-start' }} onClick={() => setConfirmDel(true)}>이 항목 지우기</button>
        ) : (
          <div className="notice stack gap8">
            <span>이 준비 항목을 지울까요? 되돌릴 수 없어요.</span>
            <div className="row gap8">
              <button className="btn secondary small" onClick={() => setConfirmDel(false)}>취소</button>
              <button className="btn danger small" onClick={remove}>지우기</button>
            </div>
          </div>
        )}
      </main>
      <div className="bottom-bar">
        <button className="btn grow" disabled={busy} onClick={save}>저장</button>
      </div>
    </div>
  );
}
