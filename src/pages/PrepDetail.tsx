import { useEffect, useRef, useState } from 'react';
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
import FlightsPanel from '../components/flights/FlightsPanel';
import { isFlightItem } from '../lib/flights';
import EntriesPanel from '../components/entries/EntriesPanel';
import SettlePanel from '../components/entries/SettlePanel';
import { isSettleItem, kindOf } from '../lib/entries';
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
  const kind = kindOf(item);
  const visaItem = isVisaItem(item);
  const arrivalItem = isArrivalItem(item);
  const settleItem = isSettleItem(item);
  const special = flightItem || !!kind || visaItem || arrivalItem || settleItem;
  const HINT: Record<string, string> = {
    flight: '후보를 넣으면 진행 중, 확정 항공편을 넣으면 완료로 자동으로 바뀌어요.',
    lodging: '후보를 넣으면 진행 중, 예약한 숙소를 넣으면 완료로 바뀌어요.',
    sight: '가볼 곳을 넣으면 진행 중, 모두 날짜를 정하면 완료예요.',
    food: '맛집을 넣으면 진행 중, 모두 날짜를 정하면 완료예요.',
    shopping: '살 것을 넣으면 진행 중, 모두 사면 완료예요.',
    roaming: '상품을 넣으면 진행 중, 구매 완료가 하나라도 있으면 완료예요.',
    insurance: '보험을 넣으면 진행 중, 가입 완료가 하나라도 있으면 완료예요.',
    transport: '교통편을 넣으면 진행 중, 모두 예약·구매하면 완료예요.',
    exchange: '환전 계획을 넣으면 진행 중, 모두 환전하면 완료예요.',
    packing: '목록을 만들면 진행 중, 모두 챙기면 완료예요.',
    visa: '필요한 비자·전자여행허가를 모두 받았다고 표시하면 완료예요.',
    arrival: '필요한 사전 등록을 모두 했다고 표시하면 완료예요.',
    settle: '비용을 확인하고 정산을 마쳤다고 표시하면 완료예요.',
  };
  const hintKey = flightItem ? 'flight' : kind ?? (visaItem ? 'visa' : arrivalItem ? 'arrival' : settleItem ? 'settle' : '');
  const [autoStatus, setAutoStatus] = useState<PrepStatus | null>(null);
  const [flightCost, setFlightCost] = useState<number | null>(item.cost);
  const shownStatus = autoStatus ?? status;
  const statusRef = useRef(item.status);
  const costRef = useRef(item.cost);
  const onFlightStatus = (st: PrepStatus) => {
    setAutoStatus(st);
    if (st !== statusRef.current) { statusRef.current = st; setStatus(st); supabase.from('prep_items').update({ status: st }).eq('id', item.id).then(() => {}); }
  };
  const onEntryCost = (n: number | null) => {
    if (n === costRef.current) return;
    costRef.current = n;
    supabase.from('prep_items').update({ cost: n, currency: 'KRW', amount: null }).eq('id', item.id).then(() => {});
  };

  const save = async () => {
    if (!title.trim()) return setErr('항목 이름을 적어주세요.');
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
          {special ? (
            <div className="row between" style={{ alignItems: 'center' }}>
              <h1 className="title">{item.title}</h1>
              <span className={`badge ${shownStatus}`}>{STATUS_LABEL[shownStatus]}</span>
            </div>
          ) : (
            <input className="title-input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} aria-label="항목 이름" placeholder="항목 이름 (예: 항공권 예매)" />
          )}
          {special && <span className="xs muted">{HINT[hintKey]}</span>}
        </div>

        {visaItem && <VisaInfo trip={trip} itemId={item.id} onStatus={onFlightStatus} />}
        {arrivalItem && <ArrivalInfo trip={trip} itemId={item.id} onStatus={onFlightStatus} />}
        {kind && <EntriesPanel trip={trip} itemId={item.id} kind={kind} onStatus={onFlightStatus} onCost={onEntryCost} />}
        {settleItem && <SettlePanel trip={trip} itemId={item.id} status={shownStatus} onStatus={onFlightStatus} />}

        {flightItem && <FlightsPanel trip={trip} itemId={item.id} cost={flightCost} onStatus={onFlightStatus} onCost={setFlightCost} />}
        {special && <NoteBlock itemId={item.id} note={note} onSaved={setNote} hint={flightItem ? '예약번호, 수하물 규정, 좌석 같은 걸 적어두세요' : '참고할 내용을 자유롭게 적어두세요'} />}

        {!special && (<>
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
        </>)}

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
      {!special && (
        <div className="bottom-bar">
          <button className="btn grow" disabled={busy} onClick={save}>저장</button>
        </div>
      )}
    </div>
  );
}

/** 메모: 평소에는 보기만, 누르면 시트에서 고친다 */
function NoteBlock({ itemId, note, onSaved, hint }: { itemId: string; note: string; onSaved: (s: string) => void; hint: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(note);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from('prep_items').update({ note: text.trim() }).eq('id', itemId);
    setBusy(false);
    if (error) return setErr(errorText(error));
    onSaved(text.trim());
    setOpen(false);
  };
  return (
    <section className="stack gap8">
      <b style={{ fontSize: 15 }}>메모</b>
      <button className="note-view" onClick={() => { setText(note); setErr(''); setOpen(true); }}>
        {note ? note : <span className="muted">{hint}</span>}
      </button>
      {open && (
        <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label="메모" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head"><b>메모</b><button className="link-btn" onClick={() => setOpen(false)}>닫기</button></div>
            <div className="sheet-body">
              <textarea className="input note-area" autoFocus value={text} onChange={(e) => setText(e.target.value)}
                placeholder={'예: 예약번호 AB1234\n수하물 23kg 1개 포함\n좌석 32A, 32B'} />
              {err && <p className="error" role="alert">{err}</p>}
            </div>
            <div className="sheet-foot"><button className="btn grow" disabled={busy} onClick={save}>저장</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
