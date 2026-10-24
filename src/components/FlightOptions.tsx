import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CABINS, resolveAirline, type Cabin, type FlightOption } from '../lib/flights';
import AirlineLogo from './AirlineLogo';

let seq = 0;
const key = () => `k${++seq}`;
interface Draft { k: string; id?: string; dep_airport: string; arr_airport: string; dep_date: string; dep_time: string; airline: string; price: string; cabin: Cabin }

const blank = (): Draft => ({ k: key(), dep_airport: '', arr_airport: '', dep_date: '', dep_time: '', airline: '', price: '', cabin: 'economy' });
const filled = (d: Draft) => !!(d.dep_airport || d.arr_airport || d.dep_date || d.dep_time || d.airline || d.price);
const toDraft = (o: FlightOption): Draft => ({
  k: key(), id: o.id, dep_airport: o.dep_airport, arr_airport: o.arr_airport, dep_date: o.dep_date ?? '', dep_time: (o.dep_time ?? '').slice(0, 5),
  airline: o.airline, price: o.price != null ? Number(o.price).toLocaleString('ko-KR') : '', cabin: o.cabin,
});

/** 항공권 후보: 기본 3칸, 적는 대로 자동 저장 */
export default function FlightOptions({ tripId, onCount, onPick }: {
  tripId: string; onCount: (n: number) => void; onPick: (o: FlightOption) => void;
}) {
  const [rows, setRows] = useState<Draft[] | null>(null);

  useEffect(() => {
    supabase.from('flight_options').select('*').eq('trip_id', tripId).order('created_at').then(({ data }) => {
      const l = ((data as FlightOption[]) ?? []).map(toDraft);
      setRows([...l, ...Array.from({ length: Math.max(0, 3 - l.length) }, blank)]);
    });
  }, [tripId]);

  const count = rows ? rows.filter((r) => r.id).length : null;
  useEffect(() => { if (count != null) onCount(count); }, [count]);
  if (!rows) return null;
  const prices = rows.map((r) => Number(r.price.replace(/,/g, ''))).filter((n) => n > 0);
  const min = prices.length > 1 ? Math.min(...prices) : null;

  const setRow = (k: string, d: Draft) => setRows((rs) => rs!.map((r) => (r.k === k ? { ...d, k } : r)));
  const removeRow = async (i: number) => {
    const r = rows[i];
    const next = rows.filter((_, j) => j !== i);
    while (next.length < 3) next.push(blank());
    setRows(next);
    if (r.id) await supabase.from('flight_options').delete().eq('id', r.id);
  };

  return (
    <section className="stack gap8">
      <div className="row between">
        <span className="row gap6" style={{ alignItems: 'center' }}><span className="chip-cand">후보</span><b style={{ fontSize: 15 }}>항공권 후보</b></span>
        <span className="xs muted">{count ? `${count}개 비교 중` : '적는 대로 저장돼요'}</span>
      </div>
      {rows.map((r, i) => (
        <OptionRow key={r.k} tripId={tripId} n={i + 1} draft={r} cheapest={min != null && Number(r.price.replace(/,/g, '')) === min}
          onChange={(d) => setRow(r.k, d)} onSaved={(id) => setRows((rs) => rs!.map((x) => (x.k === r.k ? { ...x, id } : x)))}
          onRemove={() => removeRow(i)} onPick={onPick} />
      ))}
      <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setRows([...rows, blank()])}>+ 후보 추가</button>
    </section>
  );
}

function OptionRow({ tripId, n, draft, cheapest, onChange, onSaved, onRemove, onPick }: {
  tripId: string; n: number; draft: Draft; cheapest: boolean;
  onChange: (d: Draft) => void; onSaved: (id: string) => void; onRemove: () => void; onPick: (o: FlightOption) => void;
}) {
  const [d, setD] = useState(draft);
  const idRef = useRef(draft.id);
  const timer = useRef<number | undefined>(undefined);
  const busy = useRef<Promise<unknown>>(Promise.resolve());

  const payload = (x: Draft) => ({
    trip_id: tripId, dep_airport: x.dep_airport.trim().toUpperCase(), arr_airport: x.arr_airport.trim().toUpperCase(),
    dep_date: x.dep_date || null, dep_time: x.dep_time || null, airline: x.airline.trim(),
    price: x.price ? Number(x.price.replace(/,/g, '')) : null, currency: 'KRW', cabin: x.cabin,
  });

  const persist = (x: Draft) => {
    busy.current = busy.current.then(async () => {
      if (!filled(x) && !idRef.current) return;
      if (idRef.current) await supabase.from('flight_options').update(payload(x)).eq('id', idRef.current);
      else {
        const { data } = await supabase.from('flight_options').insert(payload(x)).select('id').single();
        if (data?.id) { idRef.current = data.id; onSaved(data.id); }
      }
    });
  };

  const change = (p: Partial<Draft>) => {
    const x = { ...d, ...p };
    setD(x);
    onChange({ ...x, id: idRef.current });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(x), 600);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const code = resolveAirline(d.airline);
  return (
    <div className="cand-card">
      <div className="cand-top">
        <span className="cand-n">{n}</span>
        <input className="input sm" value={d.dep_airport} maxLength={4} placeholder="ICN" aria-label={`후보 ${n} 출발 공항`} onChange={(e) => change({ dep_airport: e.target.value.toUpperCase() })} />
        <span className="muted" aria-hidden="true">→</span>
        <input className="input sm" value={d.arr_airport} maxLength={4} placeholder="HND" aria-label={`후보 ${n} 도착 공항`} onChange={(e) => change({ arr_airport: e.target.value.toUpperCase() })} />
        <select className="input sm" value={d.cabin} aria-label={`후보 ${n} 좌석 등급`} onChange={(e) => change({ cabin: e.target.value as Cabin })}>
          {(Object.keys(CABINS) as Cabin[]).map((k) => <option key={k} value={k}>{CABINS[k]}</option>)}
        </select>
      </div>
      <div className="cand-row2">
        <input className="input sm" type="date" value={d.dep_date} aria-label={`후보 ${n} 출발 날짜`} onChange={(e) => change({ dep_date: e.target.value })} />
        <input className="input sm" type="time" value={d.dep_time} aria-label={`후보 ${n} 출발 시간`} onChange={(e) => change({ dep_time: e.target.value })} />
      </div>
      <div className="cand-row3">
        <AirlineLogo flightNo={code ?? ''} size={30} />
        <input className="input sm" value={d.airline} placeholder="항공사 (KE, 대한항공)" aria-label={`후보 ${n} 항공사`} onChange={(e) => change({ airline: e.target.value })} />
        <input className="input sm" inputMode="numeric" value={d.price} placeholder="가격 (원)" aria-label={`후보 ${n} 가격`}
          onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); change({ price: v ? Number(v).toLocaleString('ko-KR') : '' }); }} />
      </div>
      {filled(d) && (
        <div className="row gap12" style={{ alignItems: 'center' }}>
          {cheapest && <span className="tl-now" style={{ marginLeft: 0 }}>최저가</span>}
          <button className="link-btn" style={{ fontSize: 12 }}
            onClick={() => onPick({ id: idRef.current ?? "", ...payload(d), price: payload(d).price, cabin: d.cabin, note: '' } as FlightOption)}>
            확정 항공편에 넣기
          </button>
          <button className="link-btn" style={{ fontSize: 12, color: 'var(--red-ink)', marginLeft: 'auto' }} onClick={onRemove}>지우기</button>
        </div>
      )}
    </div>
  );
}
