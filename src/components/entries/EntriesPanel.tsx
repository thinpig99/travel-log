import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { errorText, loadRates } from '../../lib/format';
import { cityLabel } from '../../lib/geo';
import {
  KINDS, PACKING_DEFAULT, entryCost, entryStatus, fetchEntries, saveEntry, uncoveredNights, type Data, type Entry, type Kind,
} from '../../lib/entries';
import type { PrepStatus, Trip } from '../../lib/types';
import { useTripCurrencies } from '../CostInput';
import EntrySheet from './EntrySheet';

/** 준비 항목 공통 화면: 보기 카드 + 입력 시트, 상태와 비용은 내용으로 자동 */
export default function EntriesPanel({ trip, itemId, kind, onStatus, onCost }: {
  trip: Trip; itemId: string; kind: Kind; onStatus: (s: PrepStatus) => void; onCost: (n: number | null) => void;
}) {
  const def = KINDS[kind];
  const range = { start: trip.start_date, end: trip.end_date };
  const [es, setEs] = useState<Entry[] | null>(null);
  const [sheet, setSheet] = useState<{ entry: Entry | null; done: boolean } | null>(null);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [quick, setQuick] = useState('');
  const [err, setErr] = useState('');
  const currencies = useTripCurrencies(trip);
  const cities = [...(trip.trip_cities ?? [])].sort((a, b) => a.sort - b.sort).map((x) => cityLabel(x.cities));

  useEffect(() => {
    fetchEntries(itemId).then(setEs);
    if (kind === 'exchange') loadRates().then(setRates).catch(() => {});
  }, [itemId]);

  useEffect(() => {
    if (!es) return;
    onStatus(entryStatus(def, es, range));
    if (def.costDone) onCost(entryCost(def, es));
  }, [es]);

  if (!es) return <p className="small muted">불러오는 중</p>;

  const reload = async () => setEs(await fetchEntries(itemId));
  const save = async (entry: Entry | null, data: Data, done: boolean) => {
    const { error } = await saveEntry(def, { id: entry?.id, trip_id: trip.id, item_id: itemId, data, done, sort: entry?.sort ?? es.length });
    if (error) return errorText(error);
    setSheet(null);
    await reload();
    return null;
  };
  const toggle = async (e: Entry) => {
    setEs(es.map((x) => (x.id === e.id ? { ...x, done: !x.done } : x)));
    await saveEntry(def, { ...e, done: !e.done });
  };
  const remove = async (e: Entry) => {
    await supabase.from('prep_entries').delete().eq('id', e.id);
    setSheet(null);
    await reload();
  };
  const quickAdd = async (group?: string) => {
    const name = quick.trim();
    if (!name) return;
    setQuick('');
    const { error } = await saveEntry(def, { trip_id: trip.id, item_id: itemId, data: group ? { name, group } : { name }, done: false, sort: es.length });
    if (error) return setErr(errorText(error));
    await reload();
  };
  const loadDefaults = async () => {
    const rows = PACKING_DEFAULT.map(([group, name], i) => ({ trip_id: trip.id, item_id: itemId, kind, data: { group, name }, done: false, sort: i }));
    const { error } = await supabase.from('prep_entries').insert(rows);
    if (error) return setErr(errorText(error));
    await reload();
  };

  const ctx = { rates };
  const card = (e: Entry, fixed: boolean) => {
    const price = def.price?.(e.data);
    return (
      <div key={e.id} className={fixed ? 'ent-card fixed' : 'ent-card'} role="button" tabIndex={0}
        onClick={() => setSheet({ entry: e, done: e.done })} onKeyDown={(k) => k.key === 'Enter' && setSheet({ entry: e, done: e.done })}>
        <div className="stack grow" style={{ minWidth: 0, gap: 2 }}>
          <b className="ellipsis" style={{ fontSize: 15 }}>{def.title(e.data)}</b>
          {def.sub(e.data, ctx) && <span className="xs muted">{def.sub(e.data, ctx)}</span>}
        </div>
        <div className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
          {price != null && price > 0 && <b style={{ fontSize: 14 }}>{price.toLocaleString('ko-KR')}원</b>}
          {e.data.link && (
            <a className="link-chip" href={/^https?:\/\//.test(e.data.link) ? e.data.link : `https://${e.data.link}`} target="_blank" rel="noreferrer"
              onClick={(ev) => ev.stopPropagation()}>링크 열기</a>
          )}
          {!def.groups && (
            def.autoDone ? (
              <span className={`badge ${e.done ? 'done' : 'todo'}`}>{def.doneLabel[e.done ? 1 : 0]}</span>
            ) : (
              <button className={`badge ${e.done ? 'done' : 'todo'}`} onClick={(ev) => { ev.stopPropagation(); toggle(e); }}>{def.doneLabel[e.done ? 1 : 0]}</button>
            )
          )}
        </div>
      </div>
    );
  };

  const sheetEl = sheet && (
    <EntrySheet def={def} entry={sheet.entry} initialDone={sheet.done} cities={cities} currencies={currencies}
      trip={{ start: trip.start_date ?? '', end: trip.end_date ?? '' }}
      onSave={(data, done) => save(sheet.entry, data, done)} onDelete={sheet.entry ? () => remove(sheet.entry!) : undefined} onClose={() => setSheet(null)} />
  );

  // 체크리스트 (쇼핑, 짐 싸기)
  if (def.checklist) {
    const groups = kind === 'packing' ? [...new Set([...(def.fields[1].options ?? []), ...es.map((e) => e.data.group || '기타')])] : [''];
    return (
      <section className="stack gap12">
        {kind === 'packing' && es.length === 0 && <button className="add-dashed" onClick={loadDefaults}>기본 준비물 목록 불러오기</button>}
        {groups.map((g) => {
          const list = es.filter((e) => (kind === 'packing' ? (e.data.group || '기타') === g : true));
          if (kind === 'packing' && !list.length) return null;
          return (
            <div key={g || 'all'} className="stack gap6">
              {g && <span className="row between"><b style={{ fontSize: 14 }}>{g}</b><span className="xs muted">{list.filter((e) => e.done).length}/{list.length}</span></span>}
              <div className="check-list">
                {list.map((e) => (
                  <div key={e.id} className={`check-row ${e.done ? 'on' : ''}`}>
                    <button className="check-box" aria-pressed={e.done} aria-label={`${def.title(e.data)} ${def.doneLabel[1]}`} onClick={() => toggle(e)} />
                    <button className="check-text" onClick={() => setSheet({ entry: e, done: e.done })}>
                      <span>{def.title(e.data)}</span>
                      {def.sub(e.data, ctx) && <span className="xs muted">{def.sub(e.data, ctx)}</span>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="row gap8">
          <input className="input grow" value={quick} placeholder={def.fields[0].placeholder} onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && quickAdd(kind === 'packing' ? '기타' : undefined)} aria-label={def.fields[0].label} />
          <button className="btn small" onClick={() => quickAdd(kind === 'packing' ? '기타' : undefined)}>추가</button>
        </div>
        {kind === 'shopping' && es.length === 0 && <p className="xs muted">{def.empty}</p>}
        {err && <p className="error" role="alert">{err}</p>}
        {sheetEl}
      </section>
    );
  }

  // 후보 / 확정 두 묶음 (숙소)
  if (def.groups) {
    const off = es.filter((e) => !e.done), on = es.filter((e) => e.done);
    return (
      <>
        <section className="stack gap8">
          <div className="row between"><span className="row gap6" style={{ alignItems: 'center' }}><span className="chip-cand">후보</span><b style={{ fontSize: 15 }}>{def.groups.off}</b></span><span className="xs muted">{off.length ? `${off.length}개 비교 중` : def.groups.offHint}</span></div>
          {off.map((e) => card(e, false))}
          <button className="add-dashed" onClick={() => setSheet({ entry: null, done: false })}>+ 후보 추가</button>
        </section>
        <section className="stack gap8">
          <div className="row between"><span className="row gap6" style={{ alignItems: 'center' }}><span className="chip-fix">확정</span><b style={{ fontSize: 15 }}>{def.groups.on}</b></span>
            {(entryCost(def, es) ?? 0) > 0 && <b style={{ fontSize: 15 }}>{entryCost(def, es)!.toLocaleString('ko-KR')}원</b>}</div>
          <p className="xs muted">{def.groups.onHint}</p>
          {kind === 'lodging' && trip.start_date && trip.end_date && (() => {
            const left = uncoveredNights(es, range);
            const total = Math.round((Date.parse(trip.end_date) - Date.parse(trip.start_date)) / 864e5);
            if (total <= 0) return null;
            const md = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
            // 이어지는 날짜를 묶어서 보여준다
            const spans: string[] = [];
            let i = 0;
            while (i < left.length) {
              let j = i;
              while (j + 1 < left.length && Date.parse(left[j + 1]) - Date.parse(left[j]) === 864e5) j++;
              const endNext = new Date(Date.parse(left[j]) + 864e5).toISOString().slice(0, 10);
              spans.push(`${md(left[i])}~${md(endNext)}`);
              i = j + 1;
            }
            return left.length === 0
              ? <div className="ok-box"><b>여행 {total}박 숙소를 모두 예약했어요</b></div>
              : <div className="caution-box"><b>{total}박 중 {total - left.length}박 예약 · {left.length}박 남았어요</b><span>예약이 필요한 날: {spans.join(', ')}</span></div>;
          })()}
          {on.map((e) => card(e, true))}
          <button className="add-dashed" onClick={() => setSheet({ entry: null, done: true })}>+ 예약한 숙소 추가</button>
        </section>
        {sheetEl}
      </>
    );
  }

  // 일반 목록
  return (
    <section className="stack gap8">
      <div className="row between">
        <b style={{ fontSize: 15 }}>목록</b>
        {def.costDone && (entryCost(def, es) ?? 0) > 0 && <span className="small">완료 합계 <b>{entryCost(def, es)!.toLocaleString('ko-KR')}원</b></span>}
      </div>
      {es.length === 0 && <p className="xs muted">{def.empty}</p>}
      {es.map((e) => card(e, e.done))}
      <button className="add-dashed" onClick={() => setSheet({ entry: null, done: false })}>{def.add}</button>
      {sheetEl}
    </section>
  );
}
