import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDate } from '../lib/format';
import type { Trip } from '../lib/types';

interface Visa { cc: string; name_ko: string; general_period: string; basis: string; remark: string; synced_at: string }

export const isVisaItem = (i: { stage: number; title: string }) => i.stage === 1 && ['비자', '입국 서류'].includes(i.title.trim());

const clean = (s: string) => s.replace(/\\n/g, '\n').split('\n').map((x) => x.trim()).filter(Boolean);
/** "일반여권 소지자 : ..." 부분만 */
const general = (s: string) => clean(s).filter((l) => l.startsWith('일반여권')).map((l) => l.replace(/^일반여권 소지자\s*:\s*/, '').replace(/^[·*\s]+/, ''));

export default function VisaInfo({ trip }: { trip: Trip }) {
  const ccs = [...new Set((trip.trip_cities ?? []).map((x) => x.cities.country_code))].filter((c) => c !== 'KR');
  const [rows, setRows] = useState<Visa[] | null>(null);

  useEffect(() => {
    if (!ccs.length) return setRows([]);
    supabase.from('entrance_visa').select('cc, name_ko, general_period, basis, remark, synced_at').in('cc', ccs)
      .then(({ data }) => setRows((data as Visa[]) ?? []));
  }, [ccs.join()]);

  if (!ccs.length) return <div className="ok-box"><b>비자가 필요 없어요</b><span>국내 여행이에요.</span></div>;
  if (!rows) return <p className="small muted">외교부 비자 정보를 불러오는 중</p>;

  const synced = rows[0]?.synced_at;
  return (
    <section className="stack gap8">
      {ccs.map((cc) => {
        const v = rows.find((r) => r.cc === cc);
        if (!v) return (
          <div key={cc} className="visa-box unknown"><b>외교부 자료에 없는 나라예요 ({cc})</b><span>해당 나라 대사관이나 항공사에서 비자 필요 여부를 확인해 주세요.</span></div>
        );
        const need = v.general_period.trim().toUpperCase() === 'X' || !v.general_period.trim();
        const notes = general(v.remark);
        const remarkLines = notes.length ? notes : clean(v.remark).filter((l) => !/^(외교관|관용)/.test(l));
        return (
          <div key={cc} className={need ? 'warn-box' : 'ok-box'}>
            <b>{v.name_ko} · {need ? '비자가 필요해요' : `무비자 ${v.general_period}`}</b>
            <span>{need ? '출국 전에 비자를 받아야 입국할 수 있어요.' : '일반 여권으로 비자 없이 머물 수 있는 기간이에요.'}</span>
            {remarkLines.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        );
      })}
      <span className="xs muted">
        외교부 국가·지역별 입국허가요건 자료예요{synced ? ` · ${parseDate(synced.slice(0, 10)).getMonth() + 1}월 ${parseDate(synced.slice(0, 10)).getDate()}일 업데이트` : ''}. 무비자여도 미국 ESTA, 캐나다 eTA처럼 사전 등록이 필요한 나라가 있으니 꼭 확인해 주세요.
      </span>
    </section>
  );
}
