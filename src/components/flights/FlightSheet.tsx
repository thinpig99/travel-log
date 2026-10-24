import { useEffect, useState, type ReactNode } from 'react';
import { AIRLINES, CABINS, airlineCode, emptySeg, type Cabin, type Journey, type Segment } from '../../lib/flights';
import { durLabel, minutesBetween } from '../../lib/airports';
import DateTime24 from './DateTime24';

type Airports = Record<string, [string, string]>;

/** 아래에서 올라오는 입력 시트. 여정 여러 개(후보는 가는 편+오는 편)를 한 번에 고친다 */
export default function FlightSheet({ title, labels, initial, airports, price, onSave, onClose, footer }: {
  title: string;
  labels: string[];
  initial: Journey[];
  airports: Airports;
  price?: { value: number | null; label?: string };
  onSave: (journeys: Journey[], price: number | null) => Promise<string | null> | string | null;
  onClose: () => void;
  footer?: (current: { journeys: Journey[]; price: number | null }) => ReactNode;
}) {
  const [js, setJs] = useState<Journey[]>(initial.map((j) => (j.length ? j.map((s) => ({ ...s })) : [emptySeg()])));
  const [priceText, setPriceText] = useState(price?.value != null ? price.value.toLocaleString('ko-KR') : '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const priceNum = priceText ? Number(priceText.replace(/,/g, '')) : null;
  const set = (ji: number, si: number, p: Partial<Segment>) =>
    setJs(js.map((j, a) => (a === ji ? j.map((s, b) => (b === si ? { ...s, ...p } : s)) : j)));
  const addSeg = (ji: number) => {
    const last = js[ji][js[ji].length - 1];
    setJs(js.map((j, a) => (a === ji ? [...j, { ...emptySeg(), dep_airport: last?.arr_airport ?? '', cabin: last?.cabin ?? 'economy' }] : j)));
  };
  const delSeg = (ji: number, si: number) => setJs(js.map((j, a) => (a === ji ? (j.length > 1 ? j.filter((_, b) => b !== si) : [emptySeg()]) : j)));

  const save = async () => {
    for (const j of js) for (const s of j) {
      if (s.dep_at.length >= 16 && s.arr_at.length >= 16) {
        const m = minutesBetween(s.dep_at, airports[s.dep_airport]?.[1], s.arr_at, airports[s.arr_airport]?.[1]);
        if (m != null && m <= 0) return setErr(`${s.dep_airport || '출발'} → ${s.arr_airport || '도착'} 도착 시각이 출발보다 빨라요. 날짜를 확인해 주세요.`);
      }
    }
    setBusy(true);
    const e = await onSave(js, priceNum);
    setBusy(false);
    if (e) setErr(e);
  };

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <b>{title}</b>
          <button className="link-btn" onClick={onClose}>닫기</button>
        </div>
        <div className="sheet-body">
          {js.map((j, ji) => (
            <section key={ji} className="stack gap8">
              <b className="sheet-sec">{labels[ji] ?? `여정 ${ji + 1}`}</b>
              {j.map((s, si) => {
                const code = airlineCode(s.flight_no);
                const fly = s.dep_at.length >= 16 && s.arr_at.length >= 16 ? minutesBetween(s.dep_at, airports[s.dep_airport]?.[1], s.arr_at, airports[s.arr_airport]?.[1]) : null;
                return (
                  <div key={si} className="seg-form">
                    {j.length > 1 && (
                      <div className="row between">
                        <span className="xs muted">구간 {si + 1}</span>
                        <button className="link-btn" style={{ fontSize: 12, color: 'var(--red-ink)' }} onClick={() => delSeg(ji, si)}>구간 지우기</button>
                      </div>
                    )}
                    <label className="ff">
                      <span>편명</span>
                      <input value={s.flight_no} placeholder="KE703" maxLength={10} onChange={(e) => set(ji, si, { flight_no: e.target.value.toUpperCase().replace(/\s/g, '') })} />
                      {code && <em>{AIRLINES[code] ?? `항공사 ${code}`}</em>}
                    </label>
                    <div className="ff2">
                      <label className="ff"><span>출발 공항</span>
                        <input value={s.dep_airport} placeholder="ICN" maxLength={3} onChange={(e) => set(ji, si, { dep_airport: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} />
                        {airports[s.dep_airport] && <em>{airports[s.dep_airport][0]}</em>}
                      </label>
                      <label className="ff"><span>도착 공항</span>
                        <input value={s.arr_airport} placeholder="NRT" maxLength={3} onChange={(e) => set(ji, si, { arr_airport: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} />
                        {airports[s.arr_airport] && <em>{airports[s.arr_airport][0]}</em>}
                      </label>
                    </div>
                    <div className="ff"><span>출발 (현지 시각, 24시간)</span>
                      <DateTime24 label="출발" value={s.dep_at.replace(/T$/, '')} onChange={(v) => set(ji, si, { dep_at: v })} />
                    </div>
                    <div className="ff"><span>도착 (현지 시각, 24시간)</span>
                      <DateTime24 label="도착" value={s.arr_at.replace(/T$/, '')} onChange={(v) => set(ji, si, { arr_at: v })}
                        onFocusEmpty={() => { if (s.dep_at.length >= 10) set(ji, si, { arr_at: s.dep_at.slice(0, 10) }); }} />
                      {fly != null && fly > 0 && <em>비행 {durLabel(fly)}</em>}
                    </div>
                    <label className="ff"><span>좌석 등급</span>
                      <select value={s.cabin} onChange={(e) => set(ji, si, { cabin: e.target.value as Cabin })}>
                        {(Object.keys(CABINS) as Cabin[]).map((k) => <option key={k} value={k}>{CABINS[k]}</option>)}
                      </select>
                    </label>
                  </div>
                );
              })}
              <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => addSeg(ji)}>+ 환승 구간 추가</button>
            </section>
          ))}
          {price && (
            <label className="ff"><span>{price.label ?? '가격 (원, 왕복 총액)'}</span>
              <input inputMode="numeric" value={priceText} placeholder="520,000"
                onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setPriceText(v ? Number(v).toLocaleString('ko-KR') : ''); }} />
            </label>
          )}
          <p className="xs muted">공항은 세 글자 코드로 적어요. 시각은 그 공항의 현지 시각이고, 비행 시간은 시차를 반영해 계산해요.</p>
          {err && <p className="error" role="alert">{err}</p>}
          {footer?.({ journeys: js, price: priceNum })}
        </div>
        <div className="sheet-foot">
          <button className="btn grow" disabled={busy} onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
