import { CABINS, flightLabel, type Journey } from '../../lib/flights';
import { durLabel, minutesBetween } from '../../lib/airports';

type Airports = Record<string, [string, string]>;

const time = (at: string) => (at.length >= 16 ? at.slice(11, 16) : '--:--');
const md = (at: string) => (at.length >= 10 ? `${Number(at.slice(5, 7))}/${Number(at.slice(8, 10))}` : '');

/** 참고 이미지처럼: 왼쪽 시각, 가운데 선, 오른쪽 공항과 항공편, 구간 사이 환승 시간 */
export default function FlightTimeline({ journey, airports }: { journey: Journey; airports: Airports }) {
  const tz = (c: string) => airports[c]?.[1];
  const name = (c: string) => airports[c]?.[0] ?? '';
  return (
    <div className="ftl">
      {journey.map((s, i) => {
        const fly = s.dep_at.length >= 16 && s.arr_at.length >= 16 ? minutesBetween(s.dep_at, tz(s.dep_airport), s.arr_at, tz(s.arr_airport)) : null;
        const next = journey[i + 1];
        const lay = next && s.arr_at.length >= 16 && next.dep_at.length >= 16 ? minutesBetween(s.arr_at, tz(s.arr_airport), next.dep_at, tz(next.dep_airport)) : null;
        const nextDay = s.dep_at.slice(0, 10) && s.arr_at.slice(0, 10) && s.arr_at.slice(0, 10) !== s.dep_at.slice(0, 10);
        return (
          <div key={i}>
            <div className="ftl-row">
              <b className="ftl-time">{time(s.dep_at)}</b>
              <span className="ftl-dot" />
              <span className="ftl-ap"><b>{s.dep_airport || '???'}</b> <span className="muted">{name(s.dep_airport)}</span></span>
            </div>
            <div className="ftl-row mid">
              <span className="xs muted ftl-time">{durLabel(fly)}</span>
              <span className="ftl-line" />
              <span className="xs ftl-info">{[s.flight_no ? flightLabel(s.flight_no) : '항공편 미정', CABINS[s.cabin]].join(' · ')}</span>
            </div>
            <div className="ftl-row">
              <b className="ftl-time">{time(s.arr_at)}{nextDay && <sup className="ftl-plus">{md(s.arr_at)}</sup>}</b>
              <span className="ftl-dot" />
              <span className="ftl-ap"><b>{s.arr_airport || '???'}</b> <span className="muted">{name(s.arr_airport)}</span></span>
            </div>
            {next && <div className="ftl-lay">{name(s.arr_airport) || s.arr_airport} 환승{lay != null && lay > 0 ? ` ${durLabel(lay)}` : ''}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** 여정 전체 소요 시간 (첫 출발 ~ 마지막 도착) */
export const journeyTotal = (j: Journey, airports: Airports) => {
  const a = j[0], b = j[j.length - 1];
  if (!a || !b || a.dep_at.length < 16 || b.arr_at.length < 16) return null;
  return minutesBetween(a.dep_at, airports[a.dep_airport]?.[1], b.arr_at, airports[b.arr_airport]?.[1]);
};
