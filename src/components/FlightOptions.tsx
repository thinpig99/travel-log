import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Cabin, FlightMode, FlightOption, OptionLeg } from '../lib/flights';

let seq = 0;
const key = () => `k${++seq}`;
const MODES: [FlightMode, string][] = [['round', '왕복'], ['oneway', '편도'], ['multi', '다구간']];
const CABIN_SHORT: Record<Cabin, string> = { economy: '이코노미', premium: '프리미엄', business: '비즈니스', first: '퍼스트' };
const MAX_LEGS = 6;

interface Draft { k: string; id?: string; mode: FlightMode; legs: OptionLeg[]; airline: string; price: string; cabin: Cabin }

const leg = (dep = ''): OptionLeg => ({ dep, arr: '', date: '', time: '' });
const blank = (): Draft => ({ k: key(), mode: 'round', legs: [leg(), leg()], airline: '', price: '', cabin: 'economy' });
const filled = (d: Draft) => !!(d.airline || d.price || d.legs.some((l) => l.dep || l.arr || l.date || l.time));

/** 모드에 맞게 구간 수를 맞춘다. 왕복의 오는 편 공항은 가는 편을 뒤집어 쓴다 */
const fit = (mode: FlightMode, legs: OptionLeg[]): OptionLeg[] => {
  const a = legs[0] ?? leg();
  if (mode === 'oneway') return [a];
  if (mode === 'round') { const b = legs[1] ?? leg(); return [a, { ...b, dep: a.arr, arr: a.dep }]; }
  return legs.length >= 2 ? legs : [a, legs[1] ?? leg(a.arr)];
};

const toDraft = (o: FlightOption): Draft => {
  const mode = o.trip_type ?? 'oneway';
  const legs = o.legs?.length ? o.legs : [{ dep: o.dep_airport, arr: o.arr_airport, date: o.dep_date ?? '', time: (o.dep_time ?? '').slice(0, 5) }];
  return {
    k: key(), id: o.id, mode, legs: fit(mode, legs), airline: o.airline,
    price: o.price != null ? Number(o.price).toLocaleString('ko-KR') : '', cabin: o.cabin,
  };
};

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

/** 비어 있을 때 안내 문구를 보여주는 날짜·시간 칸 (iOS는 빈 날짜 칸에 아무것도 안 보여서) */
function PhInput({ type, value, ph, label, onChange }: { type: 'date' | 'time'; value: string; ph: string; label: string; onChange: (v: string) => void }) {
  return (
    <label className="ph-wrap">
      <input className={`input sm ${value ? '' : 'is-empty'}`} type={type} value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} />
      {!value && <span className="ph" aria-hidden="true">{ph}</span>}
    </label>
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

  const payload = (x: Draft) => {
    const legs = fit(x.mode, x.legs).map((l) => ({ dep: l.dep.trim().toUpperCase(), arr: l.arr.trim().toUpperCase(), date: l.date, time: l.time }));
    const first = legs[0];
    return {
      trip_id: tripId, trip_type: x.mode, legs,
      dep_airport: first.dep, arr_airport: first.arr, dep_date: first.date || null, dep_time: first.time || null,
      airline: x.airline.trim(), price: x.price ? Number(x.price.replace(/,/g, '')) : null, currency: 'KRW', cabin: x.cabin,
    };
  };

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
    x.legs = fit(x.mode, x.legs);
    setD(x);
    onChange({ ...x, id: idRef.current });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(x), 600);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const setLeg = (i: number, p: Partial<OptionLeg>) => {
    const legs = d.legs.map((l, j) => (j === i ? { ...l, ...p } : l));
    // 다구간: 다음 구간 출발이 비어 있으면 이번 도착을 이어 받는다
    if (d.mode === 'multi' && p.arr !== undefined && legs[i + 1] && (!legs[i + 1].dep || legs[i + 1].dep === d.legs[i].arr)) legs[i + 1] = { ...legs[i + 1], dep: p.arr };
    change({ legs });
  };
  const code = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, '');
  const legLabel = (i: number) => (d.mode === 'round' ? (i === 0 ? '가는 날' : '오는 날') : d.mode === 'oneway' ? '출발 날짜' : `${i + 1}구간 날짜`);

  return (
    <div className="cand-card">
      <div className="cand-head">
        <span className="cand-n">{n}</span>
        <div className="mini-seg" role="radiogroup" aria-label={`후보 ${n} 여정 종류`}>
          {MODES.map(([m, l]) => (
            <button key={m} role="radio" aria-checked={d.mode === m} className={d.mode === m ? 'on' : ''} onClick={() => d.mode !== m && change({ mode: m })}>{l}</button>
          ))}
        </div>
        {filled(d) && <button className="link-btn" style={{ fontSize: 12, color: 'var(--red-ink)', marginLeft: 'auto' }} onClick={onRemove}>지우기</button>}
      </div>

      {d.legs.map((l, i) => {
        const roundBack = d.mode === 'round' && i === 1;
        return (
          <div key={i} className={`leg ${d.mode === 'multi' && d.legs.length > 2 ? 'has-x' : ''}`}>
            <div className="leg-route">
              {roundBack ? (
                <span className="leg-auto">{l.dep || '도착지'} → {l.arr || '출발지'}</span>
              ) : (
                <>
                  <input className="input sm" value={l.dep} maxLength={3} placeholder="ICN" aria-label={`후보 ${n} ${i + 1}구간 출발 공항`} onChange={(e) => setLeg(i, { dep: code(e.target.value) })} />
                  <span className="muted" aria-hidden="true">→</span>
                  <input className="input sm" value={l.arr} maxLength={3} placeholder="HND" aria-label={`후보 ${n} ${i + 1}구간 도착 공항`} onChange={(e) => setLeg(i, { arr: code(e.target.value) })} />
                </>
              )}
            </div>
            <div className="leg-when">
              <PhInput type="date" value={l.date} ph={legLabel(i)} label={`후보 ${n} ${legLabel(i)}`} onChange={(v) => setLeg(i, { date: v })} />
              <PhInput type="time" value={l.time} ph="시간" label={`후보 ${n} ${i + 1}구간 출발 시간`} onChange={(v) => setLeg(i, { time: v })} />
            </div>
            {d.mode === 'multi' && d.legs.length > 2 && (
                <button className="leg-x" aria-label={`${i + 1}구간 지우기`} onClick={() => change({ legs: d.legs.filter((_, j) => j !== i) })}>×</button>
              )}
          </div>
        );
      })}
      {d.mode === 'multi' && d.legs.length < MAX_LEGS && (
        <button className="link-btn" style={{ fontSize: 12, alignSelf: 'flex-start' }} onClick={() => change({ legs: [...d.legs, leg(d.legs[d.legs.length - 1].arr)] })}>+ 구간 추가</button>
      )}

      <div className="cand-bottom">
        <input className="input sm" value={d.airline} placeholder="항공사" aria-label={`후보 ${n} 항공사`} onChange={(e) => change({ airline: e.target.value })} />
        <select className="input sm" value={d.cabin} aria-label={`후보 ${n} 좌석 등급`} onChange={(e) => change({ cabin: e.target.value as Cabin })}>
          {(Object.keys(CABIN_SHORT) as Cabin[]).map((k) => <option key={k} value={k}>{CABIN_SHORT[k]}</option>)}
        </select>
        <input className="input sm" inputMode="numeric" value={d.price} placeholder="가격 (원)" aria-label={`후보 ${n} 가격`}
          onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); change({ price: v ? Number(v).toLocaleString('ko-KR') : '' }); }} />
      </div>

      {filled(d) && (
        <div className="row gap12" style={{ alignItems: 'center' }}>
          {cheapest && <span className="tl-now" style={{ marginLeft: 0 }}>최저가</span>}
          <button className="link-btn" style={{ fontSize: 12 }}
            onClick={() => onPick({ id: idRef.current ?? '', note: '', ...payload(d) } as FlightOption)}>
            확정 항공편에 넣기
          </button>
        </div>
      )}
    </div>
  );
}
