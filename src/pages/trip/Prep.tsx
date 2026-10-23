import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { costLabel } from '../../lib/format';
import { NEXT_STATUS, STAGES, STATUS_LABEL, type PrepItem, type Trip } from '../../lib/types';

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


  return (
    <div className="stack gap12">
      {err && <p className="error" role="alert">{err}</p>}
      {[1, 2, 3, 4, 5, 6].map((stage) => {
        const list = items.filter((i) => i.stage === stage).sort((a, b) => a.sort - b.sort);
        return (
          <section key={stage} className="stack">
            <span className="stage-title">{stage}단계 · {STAGES[stage]}</span>
            {list.map((i) => (
              <div key={i.id} className="item">
                <div className="item-main" role="link" onClick={() => nav(`/trips/${tripId}/prep/${i.id}`)}>
                  <div className="stack grow" style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 15 }}>{i.title}</span>
                    {i.note && <span className="xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{i.note.split('\n')[0]}</span>}
                  </div>
                  <div className="row gap8">
                    {i.cost != null && <span className="small muted">{costLabel(i)}</span>}
                    <button
                      className={`badge ${i.status}`}
                      aria-label={`상태 ${STATUS_LABEL[i.status]}, 눌러서 바꾸기`}
                      onClick={(e) => { e.stopPropagation(); patch(i.id, { status: NEXT_STATUS[i.status] }); }}
                    >
                      {STATUS_LABEL[i.status]}
                    </button>
                    <span aria-hidden="true" className="muted">›</span>
                  </div>
                </div>
              </div>
            ))}
            {adding === stage ? (
              <div className="row gap8" style={{ paddingTop: 8 }}>
                <input className="input grow" autoFocus value={newTitle} placeholder="항목 이름 (예: 항공권 예매)" onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(stage)} />
                <button className="btn small" onClick={() => add(stage)}>추가</button>
              </div>
            ) : (
              <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { setAdding(stage); setNewTitle(''); }}>+ 항목 추가</button>
            )}
          </section>
        );
      })}
    </div>
  );
}

