import { useEffect, useState } from 'react';
import { dayLabel } from '../../lib/format';
import { loadAirports, durLabel } from '../../lib/airports';
import {
  CABINS, flightLabel, fetchCandidates, fetchJourneys, journeyLabel, journeysComplete, saveCandidate, saveJourneys,
  type Candidate, type Journey, type Segment,
} from '../../lib/flights';
import { supabase } from '../../lib/supabase';
import { errorText } from '../../lib/format';
import type { PrepStatus, Trip } from '../../lib/types';
import FlightTimeline, { journeyTotal } from './FlightTimeline';
import FlightSheet from './FlightSheet';

type Airports = Record<string, [string, string]>;
type Sheet =
  | { kind: 'confirmed'; index: number }
  | { kind: 'candidate'; cand: Candidate | null };

const segFilled = (s: Segment) => !!(s.flight_no || s.dep_airport || s.arr_airport || s.dep_at || s.arr_at);
const prune = (js: Journey[]) => js.map((j) => j.filter(segFilled));
const hm = (at: string) => (at.length >= 16 ? at.slice(11, 16) : '');
const md = (at: string) => (at.length >= 10 ? `${Number(at.slice(5, 7))}/${Number(at.slice(8, 10))}` : '');

/** 항공권 항목: 확정 항공편(보기 카드) + 후보(한 줄 요약), 입력은 시트에서 */
export default function FlightsPanel({ trip, onStatus }: { trip: Trip; onStatus: (s: PrepStatus) => void }) {
  const [airports, setAirports] = useState<Airports>({});
  const [confirmed, setConfirmed] = useState<Journey[] | null>(null);
  const [cands, setCands] = useState<Candidate[] | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [replaceAsk, setReplaceAsk] = useState(false);

  const reload = () => {
    fetchJourneys(trip.id).then(setConfirmed);
    fetchCandidates(trip.id).then(setCands);
  };
  useEffect(() => {
    loadAirports().then(setAirports);
    reload();
  }, [trip.id]);

  useEffect(() => {
    if (!confirmed || !cands) return;
    onStatus(journeysComplete(confirmed) ? 'done' : cands.length > 0 || confirmed.some((j) => j.some(segFilled)) ? 'doing' : 'todo');
  }, [confirmed, cands]);

  if (!confirmed || !cands) return <p className="small muted">항공편을 불러오는 중</p>;

  const slots = Math.max(2, confirmed.length);
  const labels = Array.from({ length: slots }, (_, i) => journeyLabel(i, slots));
  const prices = cands.map((c) => c.price ?? 0).filter((n) => n > 0);
  const min = prices.length > 1 ? Math.min(...prices) : null;

  const saveConfirmed = async (all: Journey[]) => {
    const { error } = await saveJourneys(trip.id, prune(all).filter((j, i, a) => j.length || a.slice(i + 1).some((x) => x.length)));
    if (error) return errorText(error);
    setSheet(null);
    setConfirmed(await fetchJourneys(trip.id));
    return null;
  };

  const sheetView = () => {
    if (!sheet) return null;
    if (sheet.kind === 'confirmed') {
      const i = sheet.index;
      return (
        <FlightSheet
          title={`확정 항공편 · ${labels[i] ?? `여정 ${i + 1}`}`}
          labels={[labels[i] ?? `여정 ${i + 1}`]}
          initial={[confirmed[i] ?? []]}
          airports={airports}
          onClose={() => setSheet(null)}
          onSave={(js) => { const all = [...confirmed]; while (all.length <= i) all.push([]); all[i] = js[0]; return saveConfirmed(all); }}
          footer={() => confirmed[i]?.length ? (
            <button className="link-btn" style={{ color: 'var(--red-ink)', alignSelf: 'flex-start' }}
              onClick={() => saveConfirmed(confirmed.filter((_, k) => k !== i))}>이 여정 지우기</button>
          ) : null}
        />
      );
    }
    const c = sheet.cand;
    return (
      <FlightSheet
        title={c ? '항공권 후보' : '항공권 후보 추가'}
        labels={['가는 편', '오는 편']}
        initial={c ? [c.journeys[0] ?? [], c.journeys[1] ?? []] : [[], []]}
        airports={airports}
        price={{ value: c?.price ?? null }}
        onClose={() => { setSheet(null); setReplaceAsk(false); }}
        onSave={async (js, price) => {
          const journeys = prune(js);
          if (!journeys.some((j) => j.length) && price == null) { setSheet(null); return null; }
          const { error } = await saveCandidate(trip.id, { id: c?.id, journeys, price, note: c?.note ?? '' });
          if (error) return errorText(error);
          setSheet(null);
          setCands(await fetchCandidates(trip.id));
          return null;
        }}
        footer={(cur) => c?.id ? (
          <div className="stack gap8" style={{ marginTop: 4 }}>
            {replaceAsk ? (
              <div className="warn-box">
                <b>지금 확정 항공편을 이 후보로 바꿀까요?</b>
                <span>원래 확정 항공편과 그 일정은 지워져요.</span>
                <div className="row gap8" style={{ marginTop: 6 }}>
                  <button className="btn secondary small" onClick={() => setReplaceAsk(false)}>취소</button>
                  <button className="btn small" onClick={async () => { await saveConfirmed(prune(cur.journeys)); setReplaceAsk(false); }}>바꾸기</button>
                </div>
              </div>
            ) : (
              <button className="btn secondary block" onClick={() => (confirmed.some((j) => j.length) ? setReplaceAsk(true) : saveConfirmed(prune(cur.journeys)))}>이 후보로 확정하기</button>
            )}
            <button className="link-btn" style={{ color: 'var(--red-ink)', alignSelf: 'flex-start' }}
              onClick={async () => { await supabase.from('flight_options').delete().eq('id', c.id!); setSheet(null); setCands(await fetchCandidates(trip.id)); }}>후보 지우기</button>
          </div>
        ) : null}
      />
    );
  };

  return (
    <>
      <section className="stack gap8">
        <div className="row between">
          <span className="row gap6" style={{ alignItems: 'center' }}><span className="chip-cand">후보</span><b style={{ fontSize: 15 }}>항공권 후보</b></span>
          <span className="xs muted">{cands.length ? `${cands.length}개 비교 중` : '왕복 한 세트씩 비교해요'}</span>
        </div>
        {cands.map((c, i) => {
          const go = c.journeys[0] ?? [];
          const back = c.journeys[1] ?? [];
          const from = go[0]?.dep_airport, to = go[go.length - 1]?.arr_airport;
          const line = (j: Journey, label: string) => j.length ? `${label} ${md(j[0].dep_at)} ${hm(j[0].dep_at)}${hm(j[j.length - 1].arr_at) ? `-${hm(j[j.length - 1].arr_at)}` : ''}${j.length > 1 ? ` · 환승 ${j.length - 1}회` : ''}` : '';
          return (
            <button key={c.id ?? i} className="cand-sum" onClick={() => setSheet({ kind: 'candidate', cand: c })}>
              <span className="row between" style={{ gap: 8 }}>
                <b>{from || '?'} → {to || '?'} <span className="xs muted" style={{ fontWeight: 500 }}>{back.length ? '왕복' : '편도'}</span></b>
                <span className="row gap6" style={{ alignItems: 'center' }}>
                  {min != null && c.price === min && <span className="tl-now" style={{ marginLeft: 0 }}>최저가</span>}
                  <b>{c.price != null ? `${c.price.toLocaleString('ko-KR')}원` : '가격 미정'}</b>
                </span>
              </span>
              <span className="xs muted">{[line(go, '가는 편'), line(back, '오는 편')].filter(Boolean).join(' · ')}</span>
              <span className="xs muted">{[go[0]?.flight_no ? flightLabel(go[0].flight_no) : '', go[0] ? CABINS[go[0].cabin] : ''].filter(Boolean).join(' · ')}</span>
            </button>
          );
        })}
        <button className="add-dashed" onClick={() => setSheet({ kind: 'candidate', cand: null })}>+ 후보 추가</button>
      </section>

      <section id="confirmed-flights" className="stack gap8">
        <span className="row gap6" style={{ alignItems: 'center' }}><span className="chip-fix">확정</span><b style={{ fontSize: 15 }}>확정 항공편</b></span>
        <p className="xs muted">예약을 마친 항공편이에요. 일정 탭에 자동으로 들어가요.</p>
        {labels.map((label, i) => {
          const j = confirmed[i];
          if (!j?.length) return <button key={i} className="add-dashed" onClick={() => setSheet({ kind: 'confirmed', index: i })}>+ {label} 추가</button>;
          const total = journeyTotal(j, airports);
          return (
            <div key={i} className="stack gap6">
              <div className="row between">
                <b style={{ fontSize: 14 }}>{label}{j[0].dep_at.length >= 10 ? ` · ${dayLabel(j[0].dep_at.slice(0, 10))}` : ''}</b>
                {total != null && total > 0 && <span className="xs muted">총 {durLabel(total)}</span>}
              </div>
              <button className="fix-card" onClick={() => setSheet({ kind: 'confirmed', index: i })} aria-label={`${label} 고치기`}>
                <FlightTimeline journey={j} airports={airports} />
              </button>
            </div>
          );
        })}
        {confirmed.length >= 2 && <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setSheet({ kind: 'confirmed', index: confirmed.length })}>+ 여정 추가 (다구간)</button>}
      </section>
      {sheetView()}
    </>
  );
}
