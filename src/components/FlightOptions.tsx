import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { dayLabel, errorText, money } from '../lib/format';
import { AIRLINES, CABINS, resolveAirline, type Cabin, type FlightOption } from '../lib/flights';
import AirlineLogo from './AirlineLogo';

const empty = (date: string) => ({ dep_airport: '', arr_airport: '', dep_date: date, airline: '', price: '', currency: 'KRW', cabin: 'economy' as Cabin, note: '' });

/** 항공권 후보 목록. 추가와 삭제는 바로 저장된다 */
export default function FlightOptions({ tripId, start, currencies, onCount, onPick }: {
  tripId: string; start: string; currencies: string[];
  onCount: (n: number) => void; onPick: (o: FlightOption) => void;
}) {
  const [list, setList] = useState<FlightOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(empty(start));
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.from('flight_options').select('*').eq('trip_id', tripId).order('created_at').then(({ data }) => {
      const l = (data as FlightOption[]) ?? [];
      setList(l);
      onCount(l.length);
    });
  }, [tripId]);

  const add = async () => {
    if (!f.dep_airport.trim() || !f.arr_airport.trim()) return setErr('출발 공항과 도착 공항을 적어주세요.');
    const price = f.price ? Number(f.price.replace(/,/g, '')) : null;
    const { data, error } = await supabase.from('flight_options').insert({
      trip_id: tripId, dep_airport: f.dep_airport.trim().toUpperCase(), arr_airport: f.arr_airport.trim().toUpperCase(),
      dep_date: f.dep_date || null, airline: f.airline.trim(), price, currency: f.currency, cabin: f.cabin, note: f.note.trim(),
    }).select('*').single();
    if (error) return setErr(errorText(error));
    const l = [...list, data as FlightOption];
    setList(l);
    onCount(l.length);
    setF(empty(f.dep_date));
    setAdding(false);
    setErr('');
  };

  const remove = async (id: string) => {
    const l = list.filter((o) => o.id !== id);
    setList(l);
    onCount(l.length);
    await supabase.from('flight_options').delete().eq('id', id);
  };

  const curs = ['KRW', ...currencies.filter((c) => c !== 'KRW')];
  const code = resolveAirline(f.airline);
  const cheapest = list.reduce<number | null>((m, o) => (o.price != null && o.currency === 'KRW' && (m == null || o.price < m) ? o.price : m), null);

  return (
    <section className="stack gap8">
      <div className="row between">
        <b style={{ fontSize: 15 }}>항공권 후보</b>
        <span className="xs muted">{list.length ? `${list.length}개` : '비교할 항공편을 모아두세요'}</span>
      </div>

      {list.map((o) => {
        const c = resolveAirline(o.airline);
        return (
          <div key={o.id} className="opt-card">
            <AirlineLogo flightNo={c ?? ''} size={36} />
            <div className="stack grow" style={{ minWidth: 0, gap: 2 }}>
              <b style={{ fontSize: 15 }}>{o.dep_airport} → {o.arr_airport}</b>
              <span className="xs muted">
                {[o.airline ? (c && AIRLINES[c] && o.airline.length <= 3 ? AIRLINES[c] : o.airline) : '', CABINS[o.cabin], o.dep_date ? dayLabel(o.dep_date) : ''].filter(Boolean).join(' · ')}
              </span>
              {o.note && <span className="xs muted ellipsis">{o.note}</span>}
              <div className="row gap12" style={{ marginTop: 4 }}>
                <button className="link-btn" style={{ fontSize: 12 }} onClick={() => onPick(o)}>확정 항공편에 넣기</button>
                <button className="link-btn" style={{ fontSize: 12, color: 'var(--red-ink)' }} onClick={() => remove(o.id)}>지우기</button>
              </div>
            </div>
            <div className="stack" style={{ alignItems: 'flex-end', gap: 2 }}>
              <b style={{ fontSize: 15 }}>{o.price != null ? money(Number(o.price), o.currency) : '-'}</b>
              {cheapest != null && o.price === cheapest && list.length > 1 && <span className="tl-now" style={{ marginLeft: 0 }}>최저가</span>}
            </div>
          </div>
        );
      })}

      {adding ? (
        <div className="flight-card">
          <div className="opt-grid">
            <input className="input" value={f.dep_airport} maxLength={4} placeholder="출발 ICN" aria-label="출발 공항" onChange={(e) => setF({ ...f, dep_airport: e.target.value.toUpperCase() })} />
            <input className="input" value={f.arr_airport} maxLength={4} placeholder="도착 HND" aria-label="도착 공항" onChange={(e) => setF({ ...f, arr_airport: e.target.value.toUpperCase() })} />
          </div>
          <input className="input" type="date" value={f.dep_date} aria-label="출발 날짜" onChange={(e) => setF({ ...f, dep_date: e.target.value })} />
          <div className="flight-no">
            <AirlineLogo flightNo={code ?? ''} size={36} />
            <input className="input" value={f.airline} placeholder="항공사 (예: KE 또는 대한항공)" aria-label="항공사" onChange={(e) => setF({ ...f, airline: e.target.value })} />
          </div>
          <div className="seg" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }} role="radiogroup" aria-label="좌석 등급">
            {(Object.keys(CABINS) as Cabin[]).map((k) => (
              <button key={k} role="radio" aria-checked={f.cabin === k} className={`seg-btn ${f.cabin === k ? 'on done' : ''}`} style={{ fontSize: 12, padding: 0 }}
                onClick={() => setF({ ...f, cabin: k })}>{k === 'premium' ? '프리미엄' : CABINS[k]}</button>
            ))}
          </div>
          <div className="cost-row">
            <select className="input" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} aria-label="화폐">
              {curs.map((x) => <option key={x} value={x}>{x === 'KRW' ? '원' : x}</option>)}
            </select>
            <input className="input" inputMode="decimal" value={f.price} placeholder="가격 (예: 420,000)" aria-label="가격"
              onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setF({ ...f, price: v ? Number(v).toLocaleString('ko-KR') : '' }); }} />
          </div>
          <input className="input" value={f.note} placeholder="메모 (예: 수하물 포함, 오전 출발)" aria-label="메모" onChange={(e) => setF({ ...f, note: e.target.value })} />
          {err && <p className="error" role="alert">{err}</p>}
          <div className="row gap8">
            <button className="btn secondary small" onClick={() => { setAdding(false); setErr(''); }}>취소</button>
            <button className="btn small grow" onClick={add}>후보 추가</button>
          </div>
        </div>
      ) : (
        <button className="btn secondary block" onClick={() => setAdding(true)}>+ 후보 추가</button>
      )}
    </section>
  );
}
