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

  const save = async () => {
    if (!title.trim()) return setErr('항목 이름을 적어주세요.');
    const v = c.value();
    if (!v) return setErr('환율을 불러오는 중이에요. 잠시 후 다시 눌러주세요.');
    setBusy(true);
    const { error } = await supabase.from('prep_items').update({ title: title.trim(), note: note.trim(), status, ...v }).eq('id', item.id);
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

        <div className="field">
          <span>진행 상태</span>
          <div className="seg" role="radiogroup" aria-label="진행 상태">
            {(['todo', 'doing', 'done'] as PrepStatus[]).map((s) => (
              <button key={s} role="radio" aria-checked={status === s} className={`seg-btn ${s} ${status === s ? 'on' : ''}`} onClick={() => setStatusNow(s)}>
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
