import { useEffect, useState } from 'react';
import { searchCities, searchPlaces, loadCountries, type City, type PlaceResult } from '../lib/geo';
import { IconSearch, IconX } from './Icons';

export default function CityPicker({ value, onChange }: { value: City[]; onChange: (v: City[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeErr, setPlaceErr] = useState('');
  const [countries, setCountries] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  useEffect(() => {
    let live = true;
    setPlaces(null);
    setPlaceErr('');
    const t = setTimeout(() => {
      searchCities(q).then((r) => live && setResults(r.filter((c) => !value.some((v) => v.id === c.id))));
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, value]);

  const add = (c: City) => {
    if (!value.some((v) => v.id === c.id)) onChange([...value, c]);
    setQ('');
    setResults([]);
    setPlaces(null);
  };

  const findMore = async () => {
    if (!q.trim() || placeBusy) return;
    setPlaceBusy(true);
    setPlaceErr('');
    try {
      const found = await searchPlaces(q);
      setPlaces(found.filter((p) => !value.some((v) => v.id === p.id)));
    } catch {
      setPlaceErr('지도 검색에 실패했어요. 잠시 후 다시 눌러주세요.');
    } finally {
      setPlaceBusy(false);
    }
  };

  const hasKorean = /[가-힣]/.test(q);

  return (
    <div className="stack gap8">
      {value.length > 0 && (
        <div className="row gap6 wrap">
          {value.map((c) => (
            <button key={c.id} type="button" className="chip" onClick={() => onChange(value.filter((v) => v.id !== c.id))} aria-label={`${c.nameKo || c.nameEn} 빼기`}>
              {c.nameKo || c.nameEn}
              <IconX s={14} />
            </button>
          ))}
        </div>
      )}
      <div className="search-box">
        <label className="row gap8" style={{ height: 48, padding: '0 14px', borderRadius: 14, background: 'var(--soft)' }}>
          <IconSearch />
          <span className="sr">도시 검색</span>
          <input
            className="grow"
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 16 }}
            placeholder="도시 이름 (한글 또는 영문)"
            value={q}
            enterKeyHint="search"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!results.length) findMore();
              }
            }}
          />
        </label>
        {q.trim() && (
          <div className="suggest" role="listbox">
            {results.map((c) => (
              <button key={c.id} type="button" onClick={() => add(c)}>
                <span>{c.nameKo || c.nameEn}{c.nameKo && <span className="muted small"> {c.nameEn}</span>}</span>
                <span className="muted small">{countries[c.country]?.[0] ?? c.country}</span>
              </button>
            ))}
            {places?.map((p) => (
              <button key={p.id} type="button" onClick={() => add(p)}>
                <span className="stack" style={{ minWidth: 0 }}>
                  <span>{p.nameKo || p.nameEn}{p.nameKo && <span className="muted small"> {p.nameEn}</span>}</span>
                  {p.detail && <span className="xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.detail}</span>}
                </span>
                <span className="muted small" style={{ flexShrink: 0, paddingLeft: 8 }}>{countries[p.country]?.[0] ?? p.country}</span>
              </button>
            ))}
            {places && places.length === 0 && (
              <div className="small muted" style={{ padding: '12px 14px' }}>
                지도에서도 찾지 못했어요.{hasKorean ? ' 영문 이름으로 다시 검색해 보세요.' : ' 철자를 확인해 주세요.'}
              </div>
            )}
            {placeErr && <div className="error" style={{ padding: '12px 14px' }}>{placeErr}</div>}
            {!places && (
              <button type="button" onClick={findMore} disabled={placeBusy} style={{ color: 'var(--brand)', fontWeight: 500 }}>
                <span>{placeBusy ? '지도에서 찾는 중' : results.length ? '찾는 곳이 없나요? 지도에서 더 찾기' : '목록에 없어요. 지도에서 찾기'}</span>
                <IconSearch s={16} />
              </button>
            )}
            {places && <div className="xs muted" style={{ padding: '8px 14px' }}>지도 검색 © OpenStreetMap</div>}
          </div>
        )}
      </div>
    </div>
  );
}
