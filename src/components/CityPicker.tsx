import { useEffect, useState } from 'react';
import { searchCities, loadCountries, type City } from '../lib/geo';
import { IconSearch, IconX } from './Icons';

export default function CityPicker({ value, onChange }: { value: City[]; onChange: (v: City[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<City[]>([]);
  const [countries, setCountries] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      searchCities(q).then((r) => live && setResults(r.filter((c) => !value.some((v) => v.id === c.id))));
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, value]);

  const add = (c: City) => {
    onChange([...value, c]);
    setQ('');
    setResults([]);
  };

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
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        {results.length > 0 && q && (
          <div className="suggest" role="listbox">
            {results.map((c) => (
              <button key={c.id} type="button" onClick={() => add(c)}>
                <span>{c.nameKo || c.nameEn}{c.nameKo && <span className="muted small"> {c.nameEn}</span>}</span>
                <span className="muted small">{countries[c.country]?.[0] ?? c.country}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
