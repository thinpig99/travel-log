import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { costLabel, parseDate, todayStr } from '../../lib/format';
import { checkPassport, fetchPassport, isPassportItem, loadRules, type PassportState } from '../../lib/passport';
import { NEXT_STATUS, STAGES, STAGE_WHEN, STATUS_LABEL, type PrepItem, type Trip } from '../../lib/types';

interface Props {
  trip: Trip;
  items: PrepItem[];
  setItems: (f: (prev: PrepItem[]) => PrepItem[]) => void;
}

export default function Prep({ trip, items, setItems }: Props) {
  const tripId = trip.id;
  const nav = useNavigate();
  const [adding, setAdding] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [err, setErr] = useState('');
  const [pState, setPState] = useState<PassportState | null>(null);
  const countries = (trip.trip_cities ?? []).map((x) => x.cities.country_code);

  // 여권 항목은 내 여권 정보로 자동 판단
  useEffect(() => {
    let alive = true;
    Promise.all([fetchPassport(), loadRules()]).then(([p, rules]) => {
      if (!alive) return;
      const { state } = checkPassport(p, countries, trip.end_date, rules);
      setPState(state);
      const want = state === 'ok' || state === 'domestic' ? 'done' : 'todo';
      items.filter((i) => isPassportItem(i) && i.status !== want).forEach((i) => patch(i.id, { status: want }));
    });
    return () => { alive = false; };
  }, [trip.id, countries.join(), trip.end_date, items.length]);

  const patch = async (id: string, p: Partial<PrepItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
    const { error } = await supabase.from('prep_items').update(p).eq('id', id);
    if (error) setErr('저장하지 못했어요. 연결을 확인해 주세요.');
  };

  const add = async (stage: number) => {
    const title = newTitle.trim();
    if (!title) return setAdding(null);
    const sort = Math.max(0, ...items.filter((i) => i.stage === stage).map((i) => i.sort)) + 1;
    const { data, error } = await supabase.from('prep_items').insert({ trip_id: tripId, stage, title, sort }).select('*').single();
    if (error) return setErr('항목을 추가하지 못했어요.');
    setItems((prev) => [...prev, data as PrepItem]);
    setNewTitle('');
    setAdding(null);
  };


  const today = todayStr();
  const dStart = trip.start_date ? Math.round((parseDate(trip.start_date).getTime() - parseDate(today).getTime()) / 864e5) : null;
  const isNow = (stage: number) => {
    if (dStart == null) return false;
    if (stage === 6) return !!trip.end_date && today > trip.end_date;
    const w = STAGE_WHEN[stage];
    return dStart <= w.from && dStart >= w.to;
  };
  const doneAll = items.filter((i) => i.status === 'done').length;
  const pct = items.length ? Math.round((doneAll / items.length) * 100) : 0;

  return (
    <div className="prep-wrap">
      <div className="prep-sum">
        <div className="row between small"><span>준비 진행률</span><b>{doneAll} / {items.length} 완료</b></div>
        <div className="prep-bar"><i style={{ width: `${pct}%` }} /></div>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      {[1, 2, 3, 4, 5, 6].map((stage) => {
        const list = items.filter((i) => i.stage === stage).sort((a, b) => a.sort - b.sort);
        const done = list.filter((i) => i.status === 'done').length;
        const complete = list.length > 0 && done === list.length;
        return (
          <section key={stage} className="tl-stage">
            <span className={`tl-num ${complete ? 'done' : ''}`}>{stage}</span>
            <div className="tl-head">
              <span className="tl-title">
                <b>{STAGES[stage]}</b>
                <span className="tl-when">{STAGE_WHEN[stage].label}</span>
                {isNow(stage) && <span className="tl-now">지금</span>}
              </span>
              <span className="xs muted">{done}/{list.length}</span>
            </div>
            {list.map((i) => (
              <div key={i.id} className={`tl-item ${i.status}`} role="link" tabIndex={0}
                onClick={() => nav(`/trips/${tripId}/prep/${i.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && nav(`/trips/${tripId}/prep/${i.id}`)}>
                <div className="stack grow" style={{ minWidth: 0, gap: 2 }}>
                  <span style={{ fontSize: 15 }}>{i.title}</span>
                  {i.cost != null && <span className="xs muted">{costLabel(i)}</span>}
                  {isPassportItem(i) && pState && <span className={`xs pass-hint ${pState}`}>{PASS_HINT[pState]}</span>}
                  {i.note && <span className="xs muted ellipsis">{i.note.split('\n')[0]}</span>}
                </div>
                {isPassportItem(i) ? (
                  <span className={`badge ${i.status}`} title="여권 정보로 자동으로 바뀌어요">{STATUS_LABEL[i.status]}</span>
                ) : (
                <button
                  className={`badge ${i.status}`}
                  aria-label={`상태 ${STATUS_LABEL[i.status]}, 눌러서 바꾸기`}
                  onClick={(e) => { e.stopPropagation(); patch(i.id, { status: NEXT_STATUS[i.status] }); }}
                >
                  {STATUS_LABEL[i.status]}
                </button>
                )}
              </div>
            ))}
            {adding === stage ? (
              <div className="row gap8" style={{ paddingTop: 8 }}>
                <input className="input grow" autoFocus value={newTitle} placeholder="항목 이름 (예: 항공권 예매)" onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(stage)} />
                <button className="btn small" onClick={() => add(stage)}>추가</button>
              </div>
            ) : (
              <button className="link-btn tl-add" onClick={() => { setAdding(stage); setNewTitle(''); }}>+ 항목 추가</button>
            )}
          </section>
        );
      })}
    </div>
  );
}

const PASS_HINT: Record<PassportState, string> = {
  domestic: '국내 여행이라 필요 없어요',
  none: '내 정보에서 여권을 등록해 주세요',
  bad: '유효기간이 부족해요 · 재발급 필요',
  ok: '유효기간 확인 완료',
};
