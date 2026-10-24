import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { todayStr } from '../../lib/format';
import { STAGES, type Trip } from '../../lib/types';

interface Row { stage: number; title: string; cost: number | null }

/** 정산: 준비 비용과 일정 비용을 모아 1인당 금액까지 보여준다 */
export default function SettlePanel({ trip, onChange }: { trip: Trip; onChange: () => void }) {
  const [settled, setSettled] = useState(!!trip.settled);
  const toggleSettled = async () => {
    setSettled(!settled);
    await supabase.from('trips').update({ settled: !settled }).eq('id', trip.id);
    onChange();
  };
  const [prep, setPrep] = useState<Row[] | null>(null);
  const [sched, setSched] = useState<number>(0);
  const [paid, setPaid] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from('prep_items').select('stage, title, cost').eq('trip_id', trip.id).then(({ data }) => setPrep((data as Row[]) ?? []));
    supabase.from('schedule_items').select('cost, flight_id, entry_id, payer').eq('trip_id', trip.id).then(({ data }) => {
      const rows = ((data ?? []) as { cost: number | null; flight_id: string | null; entry_id: string | null; payer: string }[]).filter((r) => !r.flight_id && !r.entry_id);
      setSched(rows.reduce((s, r) => s + (r.cost ?? 0), 0));
      const p: Record<string, number> = {};
      for (const r of rows) if (r.payer && r.cost) p[r.payer] = (p[r.payer] ?? 0) + r.cost;
      setPaid(p);
    });
  }, [trip.id]);

  if (!prep) return <p className="small muted">불러오는 중</p>;
  const items = prep.filter((r) => (r.cost ?? 0) > 0 && r.stage !== 6);
  const prepSum = items.reduce((s, r) => s + (r.cost ?? 0), 0);
  // 간단 기록에서 자세히 기록으로 바꾼 여행: 예전에 적은 총비용
  const legacy = prepSum === 0 && sched === 0 ? (prep.find((r) => r.stage === 6)?.cost ?? trip.total_cost ?? 0) : 0;
  const total = prepSum + sched + legacy;
  const head = Math.max(1, trip.headcount);
  const ended = !!trip.end_date && trip.end_date < todayStr();

  return (
    <section className="stack gap12">
      <div className="settle-total">
        <span className="small">여행 전체 비용</span>
        <b style={{ fontSize: 26 }}>{total.toLocaleString('ko-KR')}원</b>
        <span className="small">1인당 {Math.round(total / head).toLocaleString('ko-KR')}원 · {head}명</span>
        {trip.budget ? <span className="xs">예산 {trip.budget.toLocaleString('ko-KR')}원 대비 {Math.round((total / trip.budget) * 100)}%</span> : null}
      </div>
      <div className="check-list">
        {items.map((r, i) => (
          <div key={i} className="check-row" style={{ justifyContent: 'space-between' }}>
            <span className="stack" style={{ gap: 2 }}><span>{r.title}</span><span className="xs muted">{r.stage}단계 · {STAGES[r.stage]}</span></span>
            <b>{(r.cost ?? 0).toLocaleString('ko-KR')}원</b>
          </div>
        ))}
        {legacy > 0 && (
          <div className="check-row" style={{ justifyContent: 'space-between' }}>
            <span className="stack" style={{ gap: 2 }}><span>기록해 둔 총비용</span><span className="xs muted">간단 기록 때 적은 금액</span></span>
            <b>{legacy.toLocaleString('ko-KR')}원</b>
          </div>
        )}
        <div className="check-row" style={{ justifyContent: 'space-between' }}>
          <span className="stack" style={{ gap: 2 }}><span>여행 중 쓴 돈</span><span className="xs muted">일정 탭에 적은 비용</span></span>
          <b>{sched.toLocaleString('ko-KR')}원</b>
        </div>
      </div>
      {(() => {
        const people = [...new Set([...(trip.members ?? []), ...Object.keys(paid)])];
        if (people.length < 2 || !Object.keys(paid).length) {
          return <p className="xs muted">일정 탭에서 비용을 적을 때 "낸 사람"을 고르면, 여기서 누가 누구에게 얼마를 보내면 되는지 계산해 드려요.</p>;
        }
        const sum = people.reduce((s, m) => s + (paid[m] ?? 0), 0);
        const share = sum / people.length;
        const bal = people.map((m) => ({ m, v: Math.round((paid[m] ?? 0) - share) }));
        const give = bal.filter((b) => b.v < 0).map((b) => ({ ...b, v: -b.v }));
        const get = bal.filter((b) => b.v > 0).map((b) => ({ ...b }));
        const moves: string[] = [];
        for (const g of give) {
          for (const r of get) {
            if (g.v <= 0) break;
            if (r.v <= 0) continue;
            const x = Math.min(g.v, r.v);
            if (x >= 1) moves.push(`${g.m} → ${r.m} ${x.toLocaleString('ko-KR')}원`);
            g.v -= x; r.v -= x;
          }
        }
        return (
          <div className="stack gap8">
            <b style={{ fontSize: 15 }}>여행 중 쓴 돈 나누기</b>
            <div className="check-list">
              {people.map((m) => (
                <div key={m} className="check-row" style={{ justifyContent: 'space-between' }}>
                  <span>{m}</span><span className="small">낸 돈 <b>{(paid[m] ?? 0).toLocaleString('ko-KR')}원</b></span>
                </div>
              ))}
            </div>
            <div className={moves.length ? 'caution-box' : 'ok-box'}>
              <b>{moves.length ? `한 사람당 ${Math.round(share).toLocaleString('ko-KR')}원씩이에요` : '서로 보낼 돈이 없어요'}</b>
              {moves.map((x) => <span key={x}>{x}</span>)}
            </div>
            <p className="xs muted">낸 사람을 고른 일정 비용만 {people.length}명이 똑같이 나눠요.</p>
          </div>
        );
      })()}
      <p className="xs muted">준비 항목의 비용과 일정 탭에 적은 비용을 합쳤어요. 항공권·숙소처럼 일정에 자동으로 들어간 항목은 두 번 세지 않아요.</p>
      <button className={`done-toggle ${settled ? 'on' : ''}`} style={{ color: 'var(--brand-ink)' }} onClick={toggleSettled}>
        {settled ? '정산을 마쳤어요' : '정산을 마쳤으면 눌러주세요'}
      </button>
      {ended && <Link to={`/trips/${trip.id}/finish`} className="link-btn" style={{ alignSelf: 'flex-start' }}>여행 마무리하고 공개하기 ›</Link>}
    </section>
  );
}
