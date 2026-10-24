import type { Flight, FlightMode } from '../lib/flights';
import { AIRLINES, airlineCode, emptyFlight } from '../lib/flights';
import AirlineLogo from './AirlineLogo';

const MODES: [FlightMode, string][] = [['round', '왕복'], ['oneway', '편도'], ['multi', '다구간']];

/** 모드에 맞게 구간 수를 맞춘다 */
export const fitSegments = (mode: FlightMode, segs: Flight[], start: string, end: string) => {
  if (mode === 'oneway') return [segs[0] ?? emptyFlight(start)];
  if (mode === 'round') return [segs[0] ?? emptyFlight(start), segs[1] ?? emptyFlight(end)];
  return segs.length ? segs : [emptyFlight(start)];
};

export default function FlightEditor({ mode, segs, start, end, onMode, onChange }: {
  mode: FlightMode; segs: Flight[]; start: string; end: string;
  onMode: (m: FlightMode) => void; onChange: (s: Flight[]) => void;
}) {
  const set = (i: number, p: Partial<Flight>) => onChange(segs.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const label = (i: number) => (mode === 'round' ? (i === 0 ? '가는 편' : '오는 편') : mode === 'oneway' ? '항공편' : `구간 ${i + 1}`);

  return (
    <section className="stack gap12">
      <div className="seg" role="radiogroup" aria-label="여정 종류">
        {MODES.map(([m, l]) => (
          <button key={m} role="radio" aria-checked={mode === m} className={`seg-btn ${mode === m ? 'on done' : ''}`}
            onClick={() => { onMode(m); onChange(fitSegments(m, segs, start, end)); }}>{l}</button>
        ))}
      </div>

      {segs.map((s, i) => {
        const code = airlineCode(s.flight_no);
        return (
          <div key={i} className="flight-card">
            <div className="row between">
              <b style={{ fontSize: 14 }}>{label(i)}</b>
              {mode === 'multi' && segs.length > 1 && (
                <button className="link-btn" style={{ color: 'var(--red-ink)', fontSize: 13 }} onClick={() => onChange(segs.filter((_, j) => j !== i))}>구간 지우기</button>
              )}
            </div>
            <div className="flight-no">
              <AirlineLogo flightNo={s.flight_no} size={36} />
              <input className="input" value={s.flight_no} maxLength={8} placeholder="편명 (예: KE703)" aria-label="편명" autoCapitalize="characters"
                onChange={(e) => set(i, { flight_no: e.target.value.toUpperCase().replace(/\s/g, '') })} />
            </div>
            {code && <span className="xs muted" style={{ marginTop: -4 }}>{AIRLINES[code] ?? `항공사 코드 ${code}`}</span>}
            <div className="flight-leg">
              <span className="leg-label">출발</span>
              <input className="input" value={s.dep_airport} maxLength={4} placeholder="ICN" aria-label="출발 공항" autoCapitalize="characters"
                onChange={(e) => set(i, { dep_airport: e.target.value.toUpperCase() })} />
              <input className="input" type="time" value={s.dep_time} aria-label="출발 시간" onChange={(e) => set(i, { dep_time: e.target.value })} />
              <input className="input leg-date" type="date" value={s.dep_date} aria-label="출발 날짜"
                onChange={(e) => set(i, { dep_date: e.target.value, arr_date: !s.arr_date || s.arr_date < e.target.value ? e.target.value : s.arr_date })} />
            </div>
            <div className="flight-leg">
              <span className="leg-label">도착</span>
              <input className="input" value={s.arr_airport} maxLength={4} placeholder="NRT" aria-label="도착 공항" autoCapitalize="characters"
                onChange={(e) => set(i, { arr_airport: e.target.value.toUpperCase() })} />
              <input className="input" type="time" value={s.arr_time} aria-label="도착 시간" onChange={(e) => set(i, { arr_time: e.target.value })} />
              <input className="input leg-date" type="date" value={s.arr_date} aria-label="도착 날짜" onChange={(e) => set(i, { arr_date: e.target.value })} />
            </div>
          </div>
        );
      })}

      {mode === 'multi' && (
        <button className="btn secondary block" onClick={() => onChange([...segs, emptyFlight(segs[segs.length - 1]?.arr_date || start)])}>+ 구간 추가</button>
      )}
      <span className="xs muted">공항은 세 글자 코드로 적어요 (인천 ICN, 김포 GMP, 나리타 NRT). 저장하면 일정 탭에 항공 일정이 자동으로 들어가요.</span>
    </section>
  );
}
