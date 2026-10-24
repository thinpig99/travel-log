import { useEffect, useState } from 'react';
import { fetchEntryAuth, type EntryAuth } from '../lib/entry';
import { loadCountries } from '../lib/geo';
import type { PrepStatus, Trip } from '../lib/types';
import { useCountryDone } from '../lib/countryDone';
import { tripCountries } from './VisaInfo';

export default function ArrivalInfo({ trip, itemId, onStatus }: { trip: Trip; itemId?: string; onStatus?: (s: PrepStatus) => void }) {
  const cd = useCountryDone(trip.id, itemId, 'arrival');
  const ccs = tripCountries(trip);
  const [rows, setRows] = useState<EntryAuth[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEntryAuth(ccs).then((a) => setRows(a.filter((x) => x.kind === 'arrival')));
    loadCountries().then((m) => setNames(Object.fromEntries(Object.keys(m).map((k) => [k, m[k][0]]))));
  }, [ccs.join()]);

  const required = rows ? ccs.filter((cc) => rows.some((x) => x.cc === cc)) : null;
  useEffect(() => {
    if (!onStatus || !required || !cd.loaded) return;
    const n = required.filter((cc) => cd.isDone(cc)).length;
    onStatus(required.length === 0 || n === required.length ? 'done' : n > 0 ? 'doing' : 'todo');
  }, [required?.join(), cd.loaded, required?.map((cc) => cd.isDone(cc)).join()]);

  if (!ccs.length) return <div className="ok-box"><b>등록할 게 없어요</b><span>국내 여행이에요.</span></div>;
  if (!rows) return <p className="small muted">불러오는 중</p>;

  return (
    <section className="stack gap8">
      {ccs.map((cc) => {
        const r = rows.find((x) => x.cc === cc);
        if (!r) return (
          <div key={cc} className="visa-box unknown">
            <b>{names[cc] ?? cc} · 등록된 사전 등록 정보가 없어요</b>
            <span>온라인 입국 신고가 필요한지 항공사나 대사관 안내를 확인해 주세요. 기내에서 종이 입국신고서를 쓰는 나라도 있어요.</span>
          </div>
        );
        return (
          <div key={cc} className="info-box">
            <b>{names[cc] ?? cc} · {r.name}</b>
            <span>등록 시기: {r.timing}</span>
            {r.note && <span>{r.note}</span>}
            <a href={r.url} target="_blank" rel="noreferrer" className="box-link">공식 사이트에서 등록하기 ›</a>
            {itemId && (
              <button className={`done-toggle ${cd.isDone(cc) ? 'on' : ''}`} onClick={() => cd.toggle(cc)}>
                {cd.isDone(cc) ? '등록했어요' : '등록했으면 눌러주세요'}
              </button>
            )}
          </div>
        );
      })}
      <span className="xs muted">대행 사이트는 수수료를 받을 수 있어요. 꼭 공식 사이트에서 등록해 주세요. 자료는 매달 점검하지만 출국 전 한 번 더 확인해 주세요.</span>
    </section>
  );
}
