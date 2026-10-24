import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { parseDate } from '../lib/format';
import { loadCountries } from '../lib/geo';
import { checkPassport, fetchPassport, loadRules, type Passport, type Rules } from '../lib/passport';
import type { Trip } from '../lib/types';
import { remaining } from './PassportCard';

const fmt = (s: string) => { const d = parseDate(s); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

export default function PassportCheck({ trip }: { trip: Trip }) {
  const [p, setP] = useState<Passport | null | undefined>(undefined);
  const [names, setNames] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<Rules | null>(null);
  const countries = (trip.trip_cities ?? []).map((x) => x.cities.country_code);

  useEffect(() => {
    fetchPassport().then(setP);
    loadRules().then(setRules);
    loadCountries().then((m) => setNames(Object.fromEntries(Object.keys(m).map((k) => [k, m[k][0]]))));
  }, []);

  if (p === undefined || !rules) return <p className="muted small">여권 정보를 확인하는 중</p>;
  const { state, checks, need } = checkPassport(p, countries, trip.end_date, rules);

  return (
    <div className="stack gap16">
      {state === 'domestic' && (
        <div className="ok-box"><b>여권이 필요 없어요</b><span>국내 여행이라 여권 없이 다녀올 수 있어요.</span></div>
      )}
      {state === 'none' && (
        <div className="warn-box">
          <b>등록된 여권 정보가 없어요</b>
          <span>내 정보에서 여권 발급일과 만료일을 넣으면, 이번 여행에 쓸 수 있는지 자동으로 확인해 드려요.</span>
          <Link to="/me" className="btn small" style={{ marginTop: 6, alignSelf: 'flex-start' }}>내 정보에서 여권 등록하기</Link>
        </div>
      )}
      {state === 'bad' && p?.expires && (
        <div className="warn-box">
          <b>여권 재발급이 필요해요</b>
          <span>지금 여권은 {fmt(p.expires)}에 만료돼요. 이번 여행 나라 기준으로 {need ? fmt(need) : ''} 이후까지 유효해야 입국할 수 있어요.</span>
          <span>재발급은 시·군·구청 여권 민원실에서 신청할 수 있어요. 발급까지 며칠 걸리니 일찍 신청해 주세요.</span>
          <Link to="/me" className="link-btn" style={{ alignSelf: 'flex-start', color: 'var(--red-ink)' }}>새 여권 받으면 내 정보에서 날짜 고치기 ›</Link>
        </div>
      )}
      {state === 'ok' && p?.expires && (
        <div className="ok-box">
          <b>이번 여행에 쓸 수 있어요</b>
          <span>만료일 {fmt(p.expires)} · {remaining(p.expires).text}</span>
          <span>여행 나라들의 입국 조건을 모두 채워요.</span>
        </div>
      )}

      {checks.length > 0 && (
        <section className="stack gap8">
          <b style={{ fontSize: 15 }}>나라별 입국 조건</b>
          {checks.map((c) => (
            <div key={c.cc} className="pass-row">
              <img src={`https://flagcdn.com/${c.cc.toLowerCase()}.svg`} alt="" width={24} height={18} style={{ objectFit: 'cover', borderRadius: 3, boxShadow: '0 0 0 1px rgba(20,26,51,0.12)' }} />
              <span className="stack gap4 grow" style={{ minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{names[c.cc] ?? c.cc}</b>
                <span className="xs muted">
                  {c.months === 0 ? '여행 기간 동안 유효해야 해요' : `귀국일 기준 ${c.months}개월 이상 남아야 해요`}
                  {!c.known ? ' (정보가 없어 일반 기준으로 안내해요)' : ''}
                </span>
                {c.note && <span className="xs muted">{c.note}</span>}
                {c.checked_on && <span className="xs muted">기준 확인일 {fmt(c.checked_on)}</span>}
              </span>
              {p?.expires && <span className={`badge ${c.ok ? 'done' : 'todo'}`}>{c.ok ? '충족' : '부족'}</span>}
            </div>
          ))}
        </section>
      )}

      <p className="xs muted">
        상태는 여권 정보로 자동으로 바뀌어요. 나라별 기준은 매달 점검하지만 바뀔 수 있으니, 출국 전에{' '}
        <a href="https://www.0404.go.kr" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-ink)', textDecoration: 'underline' }}>외교부 해외안전여행</a>
        {' '}사이트나 항공사에서 한 번 더 확인해 주세요.
      </p>
    </div>
  );
}
