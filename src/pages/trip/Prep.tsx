import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { costLabel } from '../../lib/format';
import { NEXT_STATUS, STAGES, STATUS_LABEL, type PrepItem, type Trip } from '../../lib/types';
import { CostInput, useCost, useTripCurrencies } from '../../components/CostInput';

interface Props {
  trip: Trip;
  items: PrepItem[];
  setItems: (f: (prev: PrepItem[]) => PrepItem[]) => void;
}

export default function Prep({ trip, items, setItems }: Props) {
  const tripId = trip.id;
  const currencies = useTripCurrencies(trip);
  const [open, setOpen] = useState<string | null>(null);
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

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('prep_items').delete().eq('id', id);
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
                <div className="item-main" onClick={() => setOpen(open === i.id ? null : i.id)}>
                  <div className="stack grow">
                    <span style={{ fontSize: 15 }}>{i.title}</span>
                    {i.note && open !== i.id && <span className="xs muted">{i.note}</span>}
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
                  </div>
                </div>
                {open === i.id && (
                  <ItemEditor currencies={currencies} item={i} onSave={(p) => { patch(i.id, p); setOpen(null); }} onRemove={() => remove(i.id)} />
                )}
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

function ItemEditor({ currencies, item, onSave, onRemove }: { currencies: string[]; item: PrepItem; onSave: (p: Partial<PrepItem>) => void; onRemove: () => void }) {
  const [title, setTitle] = useState(item.title);
  const c = useCost(item, currencies);
  const [err, setErr] = useState('');
  const [note, setNote] = useState(item.note);
  return (
    <div className="item-edit">
      <input className="input" value={title} placeholder="항목 이름 (예: 항공권 예매)" onChange={(e) => setTitle(e.target.value)} aria-label="항목 이름" />
      <CostInput c={c} example={350000} />
      <input className="input" value={note} placeholder="메모 (예: 국제면허증 발급 완료)" aria-label="메모" onChange={(e) => setNote(e.target.value)} />
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row gap8">
        <button className="btn danger small" onClick={onRemove}>지우기</button>
        <button className="btn small grow" onClick={() => { const v = c.value(); if (!v) return setErr('환율을 불러오는 중이에요. 잠시 후 다시 눌러주세요.'); onSave({ title: title.trim() || item.title, note: note.trim(), ...v }); }}>저장</button>
      </div>
    </div>
  );
}
