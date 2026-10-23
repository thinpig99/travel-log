import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { dayLabel, daysBetween, numOrNull, todayStr, won } from '../../lib/format';
import { CATEGORIES, type ScheduleItem, type Trip } from '../../lib/types';

interface Props {
  trip: Trip;
  items: ScheduleItem[];
  setItems: (f: (prev: ScheduleItem[]) => ScheduleItem[]) => void;
}

const byTime = (a: ScheduleItem, b: ScheduleItem) => (a.time ?? '').localeCompare(b.time ?? '');

export default function Schedule({ trip, items, setItems }: Props) {
  const days = daysBetween(trip.start_date!, trip.end_date!);
  const today = todayStr();
  const [day, setDay] = useState(days.includes(today) ? today : days[0]);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const list = items.filter((i) => i.day === day).sort(byTime);
  const daySum = list.reduce((s, i) => s + (i.cost ?? 0), 0);

  const create = async (p: Partial<ScheduleItem>) => {
    const { data, error } = await supabase.from('schedule_items').insert({ ...p, trip_id: trip.id, day }).select('*').single();
    if (error) return setErr('일정을 추가하지 못했어요.');
    setItems((prev) => [...prev, data as ScheduleItem]);
    setAdding(false);
  };
  const update = async (id: string, p: Partial<ScheduleItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
    setOpen(null);
    const { error } = await supabase.from('schedule_items').update(p).eq('id', id);
    if (error) setErr('저장하지 못했어요.');
  };
  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setOpen(null);
    await supabase.from('schedule_items').delete().eq('id', id);
  };

  return (
    <div className="stack gap12">
      <div className="row gap6" style={{ overflowX: 'auto', paddingBottom: 2 }}>
        {days.map((d, i) => (
          <button key={d} className={`pill ${d === day ? 'on' : ''}`} onClick={() => { setDay(d); setOpen(null); setAdding(false); }}>
            {i + 1}일차
          </button>
        ))}
      </div>
      <div className="row between">
        <span className="small" style={{ fontWeight: 700 }}>{dayLabel(day)}</span>
        <span className="small muted">합계 {won(daySum)}</span>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="stack">
        {list.length === 0 && !adding && <p className="notice">이날 일정이 아직 없어요.</p>}
        {list.map((i) => (
          <div key={i.id} className="item">
            <div className="sched" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === i.id ? null : i.id)}>
              <span className="small muted">{i.time ? i.time.slice(0, 5) : '-'}</span>
              <span className="stack gap4" style={{ minWidth: 0 }}>
                <span style={{ fontSize: 15 }}>{i.title}</span>
                <span className="row gap6"><span className="cat">{i.category}</span>{i.area && <span className="xs muted">{i.area}</span>}</span>
              </span>
              <span className="small muted">{i.cost != null ? won(i.cost) : ''}</span>
            </div>
            {open === i.id && <SchedForm item={i} onSave={(p) => update(i.id, p)} onRemove={() => remove(i.id)} onCancel={() => setOpen(null)} />}
          </div>
        ))}
        {adding ? (
          <SchedForm onSave={create} onCancel={() => setAdding(false)} />
        ) : (
          <button className="btn secondary block" style={{ marginTop: 12 }} onClick={() => { setAdding(true); setOpen(null); }}>일정 추가</button>
        )}
      </div>
    </div>
  );
}

function SchedForm({ item, onSave, onRemove, onCancel }: { item?: ScheduleItem; onSave: (p: Partial<ScheduleItem>) => void; onRemove?: () => void; onCancel: () => void }) {
  const [time, setTime] = useState(item?.time?.slice(0, 5) ?? '');
  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState(item?.category ?? '관광');
  const [area, setArea] = useState(item?.area ?? '');
  const [cost, setCost] = useState(item?.cost != null ? item.cost.toLocaleString('ko-KR') : '');
  const [note, setNote] = useState(item?.note ?? '');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!title.trim()) return setErr('일정 이름을 적어주세요.');
    onSave({ time: time || null, title: title.trim(), category, area: area.trim(), cost: numOrNull(cost), note: note.trim() });
  };

  return (
    <div className="item-edit">
      <div className="two">
        <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="시간" />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="구분">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <input className="input" value={title} placeholder="삿포로 맥주 박물관" onChange={(e) => { setTitle(e.target.value); setErr(''); }} aria-label="일정 이름" />
      <div className="two">
        <input className="input" value={area} placeholder="지역 (삿포로)" onChange={(e) => setArea(e.target.value)} aria-label="지역" />
        <input className="input" inputMode="numeric" value={cost} placeholder="비용 (원)" aria-label="비용" onChange={(e) => { const n = numOrNull(e.target.value); setCost(n == null ? '' : n.toLocaleString('ko-KR')); }} />
      </div>
      <input className="input" value={note} placeholder="메모" onChange={(e) => setNote(e.target.value)} aria-label="메모" />
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row gap8">
        {onRemove ? <button className="btn danger small" onClick={onRemove}>지우기</button> : <button className="btn secondary small" onClick={onCancel}>취소</button>}
        <button className="btn small grow" onClick={submit}>저장</button>
      </div>
    </div>
  );
}
