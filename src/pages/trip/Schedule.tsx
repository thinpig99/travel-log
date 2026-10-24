import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { costLabel, dayLabel, daysBetween, todayStr, won } from '../../lib/format';
import { CostInput, useCost, useTripCurrencies } from '../../components/CostInput';
import { CATEGORIES, catStyle, type ScheduleItem, type Trip } from '../../lib/types';
import { cityLabel } from '../../lib/geo';
import AirlineLogo from '../../components/AirlineLogo';

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

  const cityNames = [...(trip.trip_cities ?? [])].sort((a, b) => a.sort - b.sort).map((x) => cityLabel(x.cities));
  const currencies = useTripCurrencies(trip);
  const ctx = { cities: cityNames, currencies };

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
      <div className="row gap6 no-swipe" style={{ overflowX: 'auto', paddingBottom: 2 }}>
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
                <span className="row gap6" style={{ fontSize: 15, alignItems: 'center' }}>{i.flight_id && <AirlineLogo flightNo={i.title.split(' ')[0]} size={20} />}{i.title}</span>
                {i.flight_id && i.note && <span className="xs muted">{i.note}</span>}
                <span className="row gap6"><span className="cat" style={catStyle(i.category)}>{i.category}</span>{i.area && <span className="xs muted">{i.area}</span>}</span>
              </span>
              <span className="small muted" style={{ textAlign: 'right' }}>{costLabel(i)}</span>
            </div>
            {open === i.id && i.flight_id && <p className="notice small" style={{ marginTop: 8 }}>항공편 일정은 준비 탭의 항공권에서 고칠 수 있어요.</p>}
            {open === i.id && !i.flight_id && <SchedForm ctx={ctx} item={i} onSave={(p) => update(i.id, p)} onRemove={() => remove(i.id)} onCancel={() => setOpen(null)} />}
          </div>
        ))}
        {adding ? (
          <SchedForm ctx={ctx} lastArea={list[list.length - 1]?.area} onSave={create} onCancel={() => setAdding(false)} />
        ) : (
          <button className="btn secondary block" style={{ marginTop: 12 }} onClick={() => { setAdding(true); setOpen(null); }}>일정 추가</button>
        )}
      </div>
    </div>
  );
}

function SchedForm({ ctx, item, lastArea, onSave, onRemove, onCancel }: { ctx: { cities: string[]; currencies: string[] }; item?: ScheduleItem; lastArea?: string; onSave: (p: Partial<ScheduleItem>) => void; onRemove?: () => void; onCancel: () => void }) {
  const initArea = item?.area ?? lastArea ?? ctx.cities[0] ?? '';
  const [time, setTime] = useState(item?.time?.slice(0, 5) ?? '');
  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState(item?.category ?? '관광');
  const [area, setArea] = useState(initArea);
  const [custom, setCustom] = useState(!!initArea && !ctx.cities.includes(initArea));
  const c = useCost(item, ctx.currencies);
  const [note, setNote] = useState(item?.note ?? '');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!title.trim()) return setErr('방문 장소나 일정 이름을 적어주세요.');
    const v = c.value();
    if (!v) return setErr('환율을 불러오는 중이에요. 잠시 후 다시 눌러주세요.');
    onSave({
      time: time || null, title: title.trim(), category, area: area.trim(), note: note.trim(),
      ...v,
    });
  };

  return (
    <div className="item-edit">
      <div className="two">
        <label className="field"><span>시간</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field"><span>구분</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <input className="input" value={title} placeholder="방문 장소 (예: 삿포로 맥주 박물관)" onChange={(e) => { setTitle(e.target.value); setErr(''); }} aria-label="방문 장소" />
      {ctx.cities.length > 0 && (
        <div className="row gap6 wrap" role="group" aria-label="도시">
          {ctx.cities.map((c) => (
            <button key={c} type="button" className={`pill ${!custom && area === c ? 'on' : ''}`} onClick={() => { setArea(c); setCustom(false); }}>{c}</button>
          ))}
          <button type="button" className={`pill ${custom ? 'on' : ''}`} onClick={() => { setCustom(true); setArea(''); }}>직접 입력</button>
        </div>
      )}
      {(custom || ctx.cities.length === 0) && (
        <input className="input" value={area} placeholder="지역 (예: 비에이, 신치토세 공항)" onChange={(e) => setArea(e.target.value)} aria-label="지역" />
      )}
      <CostInput c={c} />
      <input className="input" value={note} placeholder="메모 (예: 예약번호, 운영시간)" onChange={(e) => setNote(e.target.value)} aria-label="메모" />
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row gap8">
        {onRemove ? <button className="btn danger small" onClick={onRemove}>지우기</button> : <button className="btn secondary small" onClick={onCancel}>취소</button>}
        <button className="btn small grow" onClick={submit}>저장</button>
      </div>
    </div>
  );
}
