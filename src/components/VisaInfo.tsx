import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDate } from '../lib/format';
import { fetchEntryAuth, type EntryAuth } from '../lib/entry';
import type { PrepStatus, Trip } from '../lib/types';
import { useCountryDone } from '../lib/countryDone';

interface Visa { cc: string; name_ko: string; general_period: string; basis: string; remark: string; synced_at: string }

export const isVisaItem = (i: { stage: number; title: string }) => i.stage === 1 && ['비자', '입국 서류'].includes(i.title.trim());

const clean = (s: string) => s.replace(/\\n/g, '\n').split('\n').map((x) => x.trim()).filter(Boolean);
/** "일반여권 소지자 : ..." 부분만 */
const general = (s: string) => clean(s).filter((l) => l.startsWith('일반여권')).map((l) => l.replace(/^일반여권 소지자\s*:\s*/, '').replace(/^[·*\s]+/, ''));
const md = (s: string) => { const d = parseDate(s.slice(0, 10)); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };

export const tripCountries = (trip: Trip) => [...new Set((trip.trip_cities ?? []).map((x) => x.cities.country_code))].filter((c) => c !== 'KR');

export default function VisaInfo({ trip, itemId, onStatus }: { trip: Trip; itemId?: string; onStatus?: (s: PrepStatus) => void }) {
  const cd = useCountryDone(trip.id, itemId, 'visa');
  const ccs = tripCountries(trip);
  const [rows, setRows] = useState<Visa[] | null>(null);
  const [auth, setAuth] = useState<EntryAuth[]>([]);

  useEffect(() => {
    if (!ccs.length) return setRows([]);
    supabase.from('entrance_visa').select('cc, name_ko, general_period, basis, remark, synced_at').in('cc', ccs)
      .then(({ data }) => setRows((data as Visa[]) ?? []));
    fetchEntryAuth(ccs).then((a) => setAuth(a.filter((x) => x.kind === 'eta')));
  }, [ccs.join()]);

  const required = rows ? ccs.filter((cc) => {
    const v = rows.find((r) => r.cc === cc);
    if (!v) return false;
    const need = v.general_period.trim().toUpperCase() === 'X' || !v.general_period.trim();
    return need || auth.some((a) => a.cc === cc && a.status === 'active');
  }) : null;
  useEffect(() => {
    if (!onStatus || !required || !cd.loaded) return;
    const n = required.filter((cc) => cd.isDone(cc)).length;
    onStatus(required.length === 0 || n === required.length ? 'done' : n > 0 ? 'doing' : 'todo');
  }, [required?.join(), cd.loaded, required?.map((cc) => cd.isDone(cc)).join()]);

  if (!ccs.length) return <div className="ok-box"><b>비자가 필요 없어요</b><span>국내 여행이에요.</span></div>;
  if (!rows) return <p className="small muted">외교부 비자 정보를 불러오는 중</p>;

  const synced = rows[0]?.synced_at;
  return (
    <section className="stack gap8">
      {ccs.map((cc) => {
        const v = rows.find((r) => r.cc === cc);
        const eta = auth.find((a) => a.cc === cc);
        if (!v) return (
          <div key={cc} className="visa-box unknown">
            <b>외교부 자료에 없는 나라예요 ({cc})</b>
            <span>해당 나라 대사관이나 항공사에서 비자와 사전 허가가 필요한지 확인해 주세요.</span>
            {eta?.status === 'active' && <span>{eta.name} 신청이 필요해요 · {eta.timing}</span>}
          </div>
        );
        const need = v.general_period.trim().toUpperCase() === 'X' || !v.general_period.trim();
        const lines = general(v.remark).length ? general(v.remark) : clean(v.remark).filter((l) => !/^(외교관|관용)/.test(l));
        const etaActive = !need && eta?.status === 'active';
        const cls = need ? 'warn-box' : etaActive ? 'caution-box' : 'ok-box';
        const title = need ? '비자가 필요해요' : etaActive ? `무비자 ${v.general_period} · ${eta!.name} 필요` : `무비자 ${v.general_period}`;
        return (
          <div key={cc} className={cls}>
            <b>{v.name_ko} · {title}</b>
            {need && <span>출국 전에 비자를 받아야 입국할 수 있어요.</span>}
            {etaActive && (
              <>
                <span>비자는 없어도 되지만, 출국 전에 온라인으로 {eta!.name}(전자여행허가)를 받아야 비행기를 탈 수 있어요.</span>
                <span>신청 시기: {eta!.timing}{eta!.note ? ` · ${eta!.note}` : ''}</span>
                <a href={eta!.url} target="_blank" rel="noreferrer" className="box-link">{eta!.name} 공식 사이트에서 신청하기 ›</a>
              </>
            )}
            {!need && !etaActive && <span>비자 없이 이 기간 동안 머물 수 있어요.</span>}
            {!need && eta?.status === 'upcoming' && <span>{eta.name}: {eta.note}</span>}
            {lines.filter((l) => !(etaActive && /eTA|ESTA|ETA/i.test(l))).map((l, i) => <span key={i}>{l}</span>)}
            {itemId && (need || etaActive) && (
              <button className={`done-toggle ${cd.isDone(cc) ? 'on' : ''}`} onClick={() => cd.toggle(cc)}>
                {cd.isDone(cc) ? `${need ? '비자' : eta!.name} 받았어요` : `${need ? '비자' : eta!.name}를 받았으면 눌러주세요`}
              </button>
            )}
          </div>
        );
      })}
      <span className="xs muted">
        비자는 외교부 입국허가요건 자료{synced ? `(${md(synced)} 업데이트)` : ''}, 전자여행허가는 따로 모아 매달 점검하는 자료예요. 출국 전에 공식 사이트에서 한 번 더 확인해 주세요.
      </span>
    </section>
  );
}
