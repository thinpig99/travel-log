import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { loadCountries, type CountryMap } from '../../lib/geo';
import { LANG_NAME, PHRASES, PHRASE_KO, WEATHER } from '../../lib/phrases';
import { dayLabel, todayStr } from '../../lib/format';
import type { Trip } from '../../lib/types';

interface CityInfo { id: number; name: string; country: string; lat: number; lng: number }
interface Daily { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[]; weather_code: number[] }

export default function Info({ trip }: { trip: Trip }) {
  const [cities, setCities] = useState<CityInfo[]>([]);
  const [countries, setCountries] = useState<CountryMap>({});
  const [cityId, setCityId] = useState<number | null>(null);
  const [daily, setDaily] = useState<Daily | null>(null);
  const [weatherErr, setWeatherErr] = useState(false);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [rateDate, setRateDate] = useState('');

  useEffect(() => {
    loadCountries().then(setCountries);
    supabase
      .from('trip_cities')
      .select('sort, cities(id, name_ko, name_en, country_code, lat, lng)')
      .eq('trip_id', trip.id)
      .order('sort')
      .then(({ data }) => {
        const list = ((data ?? []) as unknown as { cities: { id: number; name_ko: string | null; name_en: string; country_code: string; lat: number; lng: number } }[]).map((r) => ({
          id: r.cities.id, name: r.cities.name_ko || r.cities.name_en, country: r.cities.country_code, lat: r.cities.lat, lng: r.cities.lng,
        }));
        setCities(list);
        setCityId(list[0]?.id ?? null);
      });
    fetch('https://open.er-api.com/v6/latest/KRW')
      .then((r) => r.json())
      .then((j) => { setRates(j.rates); setRateDate((j.time_last_update_utc ?? '').slice(5, 16)); })
      .catch(() => setRates({}));
  }, [trip.id]);

  const city = cities.find((c) => c.id === cityId);

  useEffect(() => {
    if (!city) return;
    setDaily(null);
    setWeatherErr(false);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=16`)
      .then((r) => r.json())
      .then((j) => setDaily(j.daily))
      .catch(() => setWeatherErr(true));
  }, [city?.id, city]);

  const codes = [...new Set(cities.map((c) => c.country))];
  const start = trip.start_date ?? todayStr();
  const end = trip.end_date ?? start;
  const inTrip = daily ? daily.time.map((d, i) => ({ d, i })).filter((x) => x.d >= start && x.d <= end) : [];
  const shown = inTrip.length ? inTrip : daily ? daily.time.slice(0, 5).map((d, i) => ({ d, i })) : [];

  return (
    <div className="stack gap16">
      <section className="stack gap8">
        <div className="row between">
          <h2 className="h2">날씨</h2>
          {cities.length > 1 && (
            <select className="input" style={{ width: 'auto', height: 36, fontSize: 14 }} value={cityId ?? ''} onChange={(e) => setCityId(Number(e.target.value))} aria-label="도시 선택">
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        {!inTrip.length && daily && <p className="xs muted">여행 날짜가 예보 범위(16일)보다 멀어서 {city?.name}의 지금 날씨를 보여드려요.</p>}
        {weatherErr && <p className="notice">날씨를 불러오지 못했어요.</p>}
        {!daily && !weatherErr && <p className="small muted">불러오는 중</p>}
        <div className="stack">
          {shown.map(({ d, i }) => (
            <div key={d} className="list-row" style={{ minHeight: 44 }}>
              <span className="small" style={{ width: 92 }}>{dayLabel(d)}</span>
              <span className="small grow">{WEATHER[daily!.weather_code[i]] ?? '-'}</span>
              <span className="small muted" style={{ width: 56, textAlign: 'right' }}>{daily!.precipitation_probability_max[i] != null ? `비 ${daily!.precipitation_probability_max[i]}%` : ''}</span>
              <span className="small" style={{ width: 72, textAlign: 'right' }}>{Math.round(daily!.temperature_2m_min[i])}° / {Math.round(daily!.temperature_2m_max[i])}°</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap8">
        <h2 className="h2">환율</h2>
        {codes.map((code) => {
          const cur = countries[code]?.[3];
          if (!cur || cur === 'KRW') return <p key={code} className="small muted">{countries[code]?.[0] ?? code}는 원화를 써요.</p>;
          const rate = rates?.[cur];
          if (!rates) return <p key={code} className="small muted">불러오는 중</p>;
          if (!rate) return <p key={code} className="notice">{cur} 환율을 불러오지 못했어요.</p>;
          const won1 = 1 / rate;
          const unit = [1, 100, 1000, 10000].find((u) => u * won1 >= 50) ?? 10000;
          return (
            <div key={code} className="soft-card row between">
              <span className="small">{countries[code]?.[0]} · {unit.toLocaleString('ko-KR')} {cur}</span>
              <b>{Math.round(unit * won1).toLocaleString('ko-KR')}원</b>
            </div>
          );
        })}
        {rateDate && <span className="xs muted">기준 {rateDate} · 실제 환전 금액은 은행마다 달라요</span>}
      </section>

      <section className="stack gap8">
        <h2 className="h2">간단한 회화</h2>
        {[...new Set(codes.map((c) => countries[c]?.[4]).filter(Boolean))].map((lang) => {
          const list = PHRASES[lang!];
          if (lang === 'ko') return null;
          if (!list) return <p key={lang} className="notice">이 나라 언어의 회화는 아직 준비 중이에요. 영어 표현을 참고해 주세요.</p>;
          return (
            <div key={lang} className="stack">
              <span className="stage-title">{LANG_NAME[lang!]}</span>
              {list.map(([local, say], i) => (
                <div key={i} className="list-row" style={{ minHeight: 48 }}>
                  <span className="small muted" style={{ width: 112, flexShrink: 0 }}>{PHRASE_KO[i]}</span>
                  <span className="stack gap4 grow" style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 15 }}>{local}</span>
                    {say && <span className="xs muted">{say}</span>}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </div>
  );
}
