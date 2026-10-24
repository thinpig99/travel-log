import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { todayStr } from '../../lib/format';
import { STAGES, type PrepStatus, type Trip } from '../../lib/types';

interface Row { stage: number; title: string; cost: number | null }

/** 정산: 준비 비용과 일정 비용을 모아 1인당 금액까지 보여준다 */
export default function SettlePanel({ trip, itemId, status, onStatus }: { trip: Trip; itemId: string; status: PrepStatus; onStatus: (s: PrepStatus) => void }) {
  const [prep, setPrep] = useState<Row[] | null>(null);
  const [sched, setSched] = useState<number>(0);

  useEffect(() => {
    supabase.from('prep_items').select('stage, title, cost').eq('trip_id', trip.id).then(({ data }) => setPrep((data as Row[]) ?? []));
    supabase.from('schedule_items').select('cost, flight_id, entry_id').eq('trip_id', trip.id).then(({ data }) =>
      setSched(((data ?? []) as { cost: number | null; flight_id: string | null; entry_id: string | null }[])
        .filter((r) => !r.flight_id && !r.entry_id).reduce((s, r) => s + (r.cost ?? 0), 0)));
  }, [trip.id, itemId]);

  if (!prep) return <p className="small muted">불러오는 중</p>;
  const items = prep.filter((r) => (r.cost ?? 0) > 0 && r.stage !== 6);
  const prepSum = items.reduce((s, r) => s + (r.cost ?? 0), 0);
  const total = prepSum + sched;
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
        <div className="check-row" style={{ justifyContent: 'space-between' }}>
          <span className="stack" style={{ gap: 2 }}><span>여행 중 쓴 돈</span><span className="xs muted">일정 탭에 적은 비용</span></span>
          <b>{sched.toLocaleString('ko-KR')}원</b>
        </div>
      </div>
      <p className="xs muted">준비 항목의 비용과 일정 탭에 적은 비용을 합쳤어요. 항공권·숙소처럼 일정에 자동으로 들어간 항목은 두 번 세지 않아요.</p>
      <button className={`done-toggle ${status === 'done' ? 'on' : ''}`} style={{ color: 'var(--brand-ink)' }}
        onClick={() => onStatus(status === 'done' ? (ended ? 'doing' : 'todo') : 'done')}>
        {status === 'done' ? '정산을 마쳤어요' : '정산을 마쳤으면 눌러주세요'}
      </button>
      {ended && <Link to={`/trips/${trip.id}/finish`} className="link-btn" style={{ alignSelf: 'flex-start' }}>여행 마무리하고 공개하기 ›</Link>}
    </section>
  );
}
