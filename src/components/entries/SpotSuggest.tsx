import { useEffect, useState } from 'react';
import { mapsLink, nearbySpots, type Spot } from '../../lib/suggest';

/** 한 도시의 추천 관광지. 누르면 바로 가볼 곳에 추가 */
export default function SpotSuggest({ city, lat, lng, added, onAdd }: {
  city: string; lat: number; lng: number; added: string[]; onAdd: (s: Spot) => Promise<void>;
}) {
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [err, setErr] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setSpots(null);
    setErr(false);
    nearbySpots(lat, lng, 'ko')
      .then(async (ko) => (ko.length >= 4 ? ko : [...ko, ...(await nearbySpots(lat, lng, 'en').catch(() => []))].slice(0, 10)))
      .then(setSpots)
      .catch(() => setErr(true));
  }, [lat, lng]);

  const list = (spots ?? []).filter((s) => !added.includes(s.title));
  return (
    <div className="suggest-box">
      <span className="xs" style={{ fontWeight: 700, color: 'var(--brand-ink)' }}>{city} 추천 관광지</span>
      {!spots && !err && <span className="xs muted">찾는 중</span>}
      {err && <span className="xs muted">추천을 불러오지 못했어요.</span>}
      {spots && list.length === 0 && <span className="xs muted">더 추천할 곳이 없어요.</span>}
      {list.slice(0, more ? 10 : 4).map((s) => (
        <div key={s.title} className="suggest-row">
          <span className="stack grow" style={{ minWidth: 0, gap: 1 }}>
            <span style={{ fontSize: 14 }}>{s.title}</span>
            {s.desc && <span className="xs muted ellipsis">{s.desc}</span>}
          </span>
          <a className="link-chip" href={mapsLink(s.title, city)} target="_blank" rel="noreferrer">지도</a>
          <button className="spot-add" onClick={() => onAdd(s)}>+ 추가</button>
        </div>
      ))}
      {list.length > 4 && <button className="link-btn" style={{ fontSize: 12, alignSelf: 'flex-start' }} onClick={() => setMore(!more)}>{more ? '접기' : '더 보기'}</button>}
    </div>
  );
}
