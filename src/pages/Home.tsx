import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { fetchTrips, isUpcoming, sortKey, tripCities, whenLabel } from '../lib/trips';
import { companionLabel, type Trip } from '../lib/types';
import { dday, rangeLabel, ticketCount } from '../lib/format';
import WorldMap, { type Visit } from '../components/WorldMap';
import TabBar from '../components/TabBar';
import { IconPin, IconPlus, IconTemplate, IconTicket } from '../components/Icons';

const PAGE = 5;

export default function Home() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [countryVisits, setCountryVisits] = useState<Record<string, number>>({});
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [cityFilter, setCityFilter] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([supabase.rpc('my_city_visits'), fetchTrips(), supabase.rpc('my_country_visits')]).then(([v, t, c]) => {
      setVisits((v.data as Visit[]) ?? []);
      setCountryVisits(Object.fromEntries(((c.data ?? []) as { country_code: string; visits: number }[]).map((r) => [r.country_code, r.visits])));
      setTrips(t);
      setLoaded(true);
    });
  }, []);

  const upcoming = useMemo(() => trips.filter(isUpcoming).sort((a, b) => sortKey(a).localeCompare(sortKey(b))), [trips]);
  const [limit, setLimit] = useState(PAGE);
  const past = useMemo(
    () =>
      trips
        .filter((t) => !isUpcoming(t))
        .filter((t) => cityFilter == null || t.trip_cities?.some((c) => c.cities.id === cityFilter))
        .sort((a, b) => sortKey(b).localeCompare(sortKey(a))),
    [trips, cityFilter]
  );
  const countryCount = new Set(visits.map((v) => v.country_code)).size;
  const filterName = visits.find((v) => v.city_id === cityFilter)?.name;

  return (
    <div className="screen">
      <main className="page with-tabs">
        <div className="row between">
          <div className="stack gap4">
            <span className="small muted">{profile?.display_name ? `안녕하세요, ${profile.display_name}님` : '안녕하세요'}</span>
            <h1 className="title">내 여행 지도</h1>
          </div>
          <Link to="/wallet" className="pill" style={{ height: 36, gap: 6, color: 'var(--ink)', fontWeight: 500 }} aria-label={`보유 탑승권 ${ticketCount(profile)}`}>
            <span style={{ color: 'var(--gold)', display: 'flex' }}><IconTicket s={16} /></span>
            탑승권 {ticketCount(profile)}
          </Link>
        </div>

        <div className="map-card">
          <WorldMap visits={visits} countries={countryVisits} onCity={setCityFilter} />
          <div className="legend">
            {[['1회', 'var(--c1)', 'var(--v1)'], ['2회', 'var(--c2)', 'var(--v2)'], ['3회 이상', 'var(--c3)', 'var(--v3)']].map(([l, land, dot]) => (
              <span key={l} className="row gap4">
                <i aria-hidden="true" style={{ width: 16, height: 12, borderRadius: 3, background: land, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i style={{ width: 6, height: 6, borderRadius: 3, background: dot, boxShadow: '0 0 0 1.5px #fff' }} />
                </i>
                {l}
              </span>
            ))}
            <span className="xs" style={{ marginLeft: 'auto' }}>나라는 면, 도시는 점</span>
          </div>
        </div>

        <div className="stats">
          <div className="stat"><span className="xs muted">도시</span><b>{visits.length}</b></div>
          <div className="stat"><span className="xs muted">나라</span><b>{countryCount}</b></div>
          <div className="stat"><span className="xs muted">여행</span><b>{trips.length}</b></div>
        </div>

        {upcoming.length > 0 && (
          <section className="stack gap8">
            <h2 className="h2">준비 중인 여행</h2>
            {upcoming.map((t) => {
              const items = t.prep_items ?? [];
              const done = items.filter((i) => i.status === 'done').length;
              return (
                <Link key={t.id} to={`/trips/${t.id}`} className="trip-hero">
                  <div className="row between">
                    <b style={{ fontSize: 17 }}>{t.title}</b>
                    <span className="dday">{dday(t.start_date!)}</span>
                  </div>
                  <span className="sub">
                    {rangeLabel(t.start_date!, t.end_date!)} · {companionLabel(t.companion)}
                    {t.group_id ? ' · 그룹 공유 중' : ''}
                  </span>
                  <div className="row gap8">
                    <div className="bar grow"><div style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} /></div>
                    <span className="sub xs">준비 {done}/{items.length}</span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        <section className="stack">
          <div className="row between">
            <h2 className="h2">지난 여행</h2>
            {cityFilter != null && (
              <button className="link-btn" onClick={() => setCityFilter(null)}>{filterName} 필터 해제</button>
            )}
          </div>
          {loaded && trips.length === 0 && (
            <div className="notice" style={{ marginTop: 8 }}>
              아래 버튼으로 다녀온 여행을 남기면 지도에 색이 칠해져요.
            </div>
          )}
          {(cityFilter != null ? past : past.slice(0, limit)).map((t) => (
            <Link key={t.id} to={`/trips/${t.id}`} className="list-row">
              <div className="stack gap4 grow">
                <span style={{ fontSize: 15, fontWeight: 500 }}>{t.title}</span>
                <span className="xs muted">
                  {[whenLabel(t), companionLabel(t.companion), tripCities(t).join(', ')].filter(Boolean).join(' · ')}
                </span>
              </div>
              <span className="xs muted">{t.kind === 'simple' ? '간단 기록' : t.visibility === 'public' ? <b style={{ color: 'var(--brand)' }}>공개</b> : t.group_id ? '그룹' : '나만 보기'}</span>
            </Link>
          ))}
          {cityFilter == null && past.length > limit && (
            <button className="more-btn" onClick={() => setLimit(limit + 10)}>
              더 보기 <span className="muted">({past.length - limit}개 남음)</span>
            </button>
          )}
          {cityFilter == null && limit > PAGE && past.length <= limit && past.length > PAGE && (
            <button className="more-btn" onClick={() => setLimit(PAGE)}>접기</button>
          )}
        </section>
      </main>

      <button className="fab" aria-label="여행 추가" onClick={() => setSheet(true)}><IconPlus s={26} /></button>

      {sheet && (
        <div className="sheet-back" onClick={() => setSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="여행 추가">
            <h2 className="h2" style={{ marginBottom: 4 }}>무엇을 추가할까요?</h2>
            <button className="sheet-option" onClick={() => nav('/trips/new')}>
              <span style={{ color: 'var(--brand)' }}><IconTemplate /></span>
              <span className="stack gap4">
                <b>새 여행 준비</b>
                <span className="xs muted">템플릿으로 준비와 일정을 정리해요</span>
              </span>
            </button>
            <button className="sheet-option" onClick={() => nav('/past/new')}>
              <span style={{ color: 'var(--brand)' }}><IconPin /></span>
              <span className="stack gap4">
                <b>지난 여행 기록</b>
                <span className="xs muted">어디를, 언제, 누구와 다녀왔는지 남겨요</span>
              </span>
            </button>
          </div>
        </div>
      )}
      <TabBar />
    </div>
  );
}
