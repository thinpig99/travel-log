import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBoard, fetchTree, monthLabel, type BoardTrip, type TreeRow } from '../lib/board';
import { companionLabel } from '../lib/types';
import { nightsDays, won } from '../lib/format';
import TabBar from '../components/TabBar';
import WorldMap, { type Visit } from '../components/WorldMap';
import { IconSearch } from '../components/Icons';

type Mode = 'tree' | 'map';
interface Sel { continent?: string; country?: string; city?: number }

export default function Board() {
  const [tree, setTree] = useState<TreeRow[]>([]);
  const [mode, setMode] = useState<Mode>('tree');
  const [sel, setSel] = useState<Sel>({});
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [trips, setTrips] = useState<BoardTrip[] | null>(null);

  useEffect(() => {
    fetchTree().then(setTree);
  }, []);

  useEffect(() => {
    setTrips(null);
    fetchBoard({ country: sel.city ? null : sel.country, city: sel.city, sort }).then(setTrips).catch(() => setTrips([]));
  }, [sel.country, sel.city, sort]);

  const continents = useMemo(() => {
    const m = new Map<string, number>();
    tree.forEach((r) => m.set(r.continent, (m.get(r.continent) ?? 0) + r.trips));
    return [...m.entries()];
  }, [tree]);
  const countries = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    tree.filter((r) => r.continent === sel.continent).forEach((r) => {
      const e = m.get(r.country_code) ?? { name: r.country_name, n: 0 };
      e.n += r.trips;
      m.set(r.country_code, e);
    });
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [tree, sel.continent]);
  const cities = useMemo(() => tree.filter((r) => r.country_code === sel.country), [tree, sel.country]);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return tree.filter((r) => r.city_name.toLowerCase().includes(s) || r.country_name.includes(s)).slice(0, 8);
  }, [tree, q]);
  const mapPoints: Visit[] = useMemo(
    () => tree.map((r) => ({ city_id: r.city_id, name: r.city_name, country_code: r.country_code, lat: r.lat, lng: r.lng, visits: r.trips })),
    [tree]
  );

  const pickCity = (r: TreeRow) => {
    setSel({ continent: r.continent, country: r.country_code, city: r.city_id });
    setQ('');
  };
  const countryName = tree.find((r) => r.country_code === sel.country)?.country_name;
  const cityName = tree.find((r) => r.city_id === sel.city)?.city_name;

  return (
    <div className="screen">
      <main className="page with-tabs">
        <h1 className="title">게시판</h1>

        <div className="search-box">
          <label className="row gap8" style={{ height: 48, padding: '0 14px', borderRadius: 14, background: 'var(--soft)' }}>
            <IconSearch />
            <span className="sr">여행지 검색</span>
            <input className="grow" style={{ border: 'none', background: 'none', outline: 'none', fontSize: 16 }} placeholder="후쿠오카, 일본, 런던" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {q && (
            <div className="suggest">
              {matches.length === 0 && <div className="small muted" style={{ padding: 14 }}>아직 공개된 기록이 없는 여행지예요.</div>}
              {matches.map((r) => (
                <button key={r.city_id} onClick={() => pickCity(r)}>
                  <span>{r.city_name} <span className="small muted">{r.country_name}</span></span>
                  <span className="small muted">기록 {r.trips}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="two" style={{ padding: 4, borderRadius: 12, background: 'var(--soft)', gap: 4 }}>
          {(['tree', 'map'] as Mode[]).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}
              style={{ height: 36, borderRadius: 9, border: 'none', background: mode === m ? '#fff' : 'none', fontWeight: mode === m ? 700 : 400, color: mode === m ? 'var(--ink)' : 'var(--muted)', cursor: 'pointer' }}>
              {m === 'tree' ? '여행지 목록' : '지도'}
            </button>
          ))}
        </div>

        <div className="row gap6 wrap small muted">
          <button className="link-btn" style={{ padding: 0 }} onClick={() => setSel({})}>전체</button>
          {sel.continent && <><span aria-hidden="true">›</span><button className="link-btn" style={{ padding: 0 }} onClick={() => setSel({ continent: sel.continent })}>{sel.continent}</button></>}
          {sel.country && <><span aria-hidden="true">›</span><button className="link-btn" style={{ padding: 0 }} onClick={() => setSel({ continent: sel.continent, country: sel.country })}>{countryName}</button></>}
          {sel.city && <><span aria-hidden="true">›</span><b style={{ color: 'var(--ink)' }}>{cityName}</b></>}
        </div>

        {mode === 'map' ? (
          <div className="map-card">
            <WorldMap visits={mapPoints} suffix="개의 공개 기록" onCity={(id) => { const r = tree.find((x) => x.city_id === id); if (r) pickCity(r); }} />
          </div>
        ) : (
          !sel.city && (
            <div className="row gap6 wrap">
              {!sel.continent && continents.map(([c, n]) => (
                <button key={c} className="pill" onClick={() => setSel({ continent: c })}>{c} {n}</button>
              ))}
              {sel.continent && !sel.country && countries.map(([code, v]) => (
                <button key={code} className="pill" onClick={() => setSel({ continent: sel.continent, country: code })}>{v.name} {v.n}</button>
              ))}
              {sel.country && cities.map((r) => (
                <button key={r.city_id} className="pill" onClick={() => pickCity(r)}>{r.city_name} {r.trips}</button>
              ))}
              {tree.length === 0 && <p className="notice grow">아직 공개된 여행이 없어요. 끝난 여행을 마무리하면서 첫 기록을 공개해 보세요.</p>}
            </div>
          )
        )}

        <div className="row gap6">
          <button className={`pill ${sort === 'popular' ? 'on' : ''}`} onClick={() => setSort('popular')}>인기순</button>
          <button className={`pill ${sort === 'recent' ? 'on' : ''}`} onClick={() => setSort('recent')}>최신순</button>
        </div>

        <div className="stack gap8">
          {trips === null && <p className="small muted">불러오는 중</p>}
          {trips?.length === 0 && tree.length > 0 && <p className="notice">조건에 맞는 기록이 없어요.</p>}
          {trips?.map((t, i) => <TripCard key={t.id} t={t} rank={sort === 'popular' && !sel.continent && i < 3 ? i + 1 : 0} />)}
        </div>
      </main>
      <TabBar />
    </div>
  );
}

function TripCard({ t, rank }: { t: BoardTrip; rank: number }) {
  return (
    <Link to={`/board/${t.id}`} className="card stack gap8" style={{ color: 'var(--ink)' }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="stack gap4 grow">
          {rank > 0 && <span className="xs" style={{ fontWeight: 700, color: 'var(--brand)' }}>인기 {rank}위</span>}
          <b style={{ fontSize: 16 }}>{t.title}</b>
          <span className="xs muted">{monthLabel(t.start_date)} · {nightsDays(t.start_date, t.end_date)} · {companionLabel(t.companion)} {t.headcount}명 · {t.author}</span>
        </div>
        <span className="row gap4 small" style={{ fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={t.liked ? 'var(--brand)' : 'none'} stroke="var(--brand)" strokeWidth="2" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.5C1 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 23 7.5 21.5 11.5 19.5 16.4 12 21 12 21z" /></svg>
          {t.likes}
        </span>
      </div>
      <div className="row gap6 wrap">
        {t.city_names.map((c) => <span key={c} className="cat" style={{ fontSize: 12, padding: '2px 8px' }}>{c}</span>)}
      </div>
      <div className="row between" style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }}>
        <span className="small muted">총 {won(t.total_cost)} · 일정 {t.schedule_count}개{t.copies ? ` · 복제 ${t.copies}` : ''}</span>
        <span aria-hidden="true" className="muted" style={{ fontSize: 20 }}>›</span>
      </div>
    </Link>
  );
}
