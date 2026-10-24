import { useEffect, useState } from 'react';
import type { Data, Entry, FieldDef, KindDef } from '../../lib/entries';

const fmtNum = (s: string) => (s ? Number(s).toLocaleString('ko-KR') : '');
const timeFmt = (raw: string) => { const d = raw.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d; };

/** 항목 하나를 고치는 아래 시트 */
export default function EntrySheet({ def, entry, initialDone, cities, currencies, trip, onSave, onDelete, onClose }: {
  def: KindDef; entry: Entry | null; initialDone: boolean; cities: string[]; currencies: string[];
  trip: { start: string; end: string };
  onSave: (data: Data, done: boolean) => Promise<string | null>; onDelete?: () => void; onClose: () => void;
}) {
  const [d, setD] = useState<Data>({ ...(entry?.data ?? {}) });
  const [done, setDone] = useState(entry?.done ?? initialDone);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [askDel, setAskDel] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const set = (k: string, v: string) => setD({ ...d, [k]: v });

  const field = (f: FieldDef) => {
    const v = d[f.key] ?? '';
    switch (f.type) {
      case 'date':
        return <input type="date" value={v} min={f.key === 'checkout' ? d.checkin : undefined} onChange={(e) => set(f.key, e.target.value)} />;
      case 'time':
        return <input inputMode="numeric" value={v} placeholder="00:00" maxLength={5} onChange={(e) => set(f.key, timeFmt(e.target.value))} />;
      case 'price':
      case 'amount':
        return <input inputMode="numeric" value={fmtNum(v)} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value.replace(/\D/g, ''))} />;
      case 'select':
        return (
          <select value={v} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">고르기</option>
            {f.options!.map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case 'currency':
        return (
          <select value={v} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">고르기</option>
            {[...new Set([...currencies, 'USD', 'EUR', 'JPY'])].map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case 'city':
        return (
          <div className="stack gap6" style={{ paddingTop: 4 }}>
            {cities.length > 0 && (
              <div className="row gap6 wrap">
                {cities.map((c) => <button key={c} type="button" className={`pill ${v === c ? 'on' : ''}`} onClick={() => set(f.key, v === c ? '' : c)}>{c}</button>)}
              </div>
            )}
            <input value={cities.includes(v) ? '' : v} placeholder={cities.length ? '목록에 없으면 직접 입력' : '도시 이름'} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        );
      default:
        return <input value={v} placeholder={f.placeholder} inputMode={f.type === 'url' ? 'url' : undefined} onChange={(e) => set(f.key, e.target.value)} />;
    }
  };

  const save = async () => {
    if (d.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) return setErr('시각은 24시간제로 적어주세요 (예: 14:30).');
    if (d.date && trip.start && trip.end && (d.date < trip.start || d.date > trip.end)) return setErr('여행 기간 안의 날짜로 골라주세요.');
    if (d.checkin && d.checkout && d.checkout < d.checkin) return setErr('체크아웃이 체크인보다 빨라요.');
    setBusy(true);
    const e = await onSave(d, done);
    setBusy(false);
    if (e) setErr(e);
  };

  // 반씩 쓰는 칸은 두 개씩 묶는다
  const rows: FieldDef[][] = [];
  for (const f of def.fields) {
    const last = rows[rows.length - 1];
    if (f.half && last && last.length === 1 && last[0].half) last.push(f);
    else rows.push([f]);
  }

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><b>{entry ? def.title(entry.data) : def.add.replace('+ ', '')}</b><button className="link-btn" onClick={onClose}>닫기</button></div>
        <div className="sheet-body">
          {!def.autoDone && (
            <div className="seg" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup">
              {[false, true].map((on) => (
                <button key={String(on)} role="radio" aria-checked={done === on} className={`seg-btn ${done === on ? `on ${on ? 'done' : 'doing'}` : ''}`} onClick={() => setDone(on)}>
                  {def.doneLabel[on ? 1 : 0]}
                </button>
              ))}
            </div>
          )}
          <div className="stack gap8">
            {rows.map((r, i) => (
              <div key={i} className={r.length > 1 ? 'ff2' : ''}>
                {r.map((f) => (
                  <label key={f.key} className="ff"><span>{f.label}</span>{field(f)}</label>
                ))}
              </div>
            ))}
          </div>
          {def.autoDone && <p className="xs muted">날짜를 정하면 일정 탭의 그날에 자동으로 들어가요.</p>}
          {err && <p className="error" role="alert">{err}</p>}
          {entry && onDelete && (askDel ? (
            <div className="warn-box">
              <b>지울까요?</b>
              <div className="row gap8" style={{ marginTop: 6 }}>
                <button className="btn secondary small" onClick={() => setAskDel(false)}>취소</button>
                <button className="btn danger small" onClick={onDelete}>지우기</button>
              </div>
            </div>
          ) : (
            <button className="link-btn" style={{ color: 'var(--red-ink)', alignSelf: 'flex-start' }} onClick={() => setAskDel(true)}>지우기</button>
          ))}
        </div>
        <div className="sheet-foot"><button className="btn grow" disabled={busy} onClick={save}>저장</button></div>
      </div>
    </div>
  );
}
