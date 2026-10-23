import { useEffect, useState } from 'react';
import { loadRates, money, won } from '../lib/format';
import { loadCountries } from '../lib/geo';
import type { Trip } from '../lib/types';

/** 여행 도시들의 나라 화폐 (원화 제외) */
export function useTripCurrencies(trip: Pick<Trip, 'id' | 'trip_cities'>) {
  const [currencies, setCurrencies] = useState<string[]>([]);
  useEffect(() => {
    const ccs = [...new Set((trip.trip_cities ?? []).map((x) => x.cities.country_code))];
    loadCountries().then((m) =>
      setCurrencies([...new Set(ccs.map((c) => m[c]?.[3]).filter((c): c is string => !!c && c !== 'KRW'))]),
    );
  }, [trip.id]);
  return currencies;
}

type Costed = { cost: number | null; currency?: string; amount?: number | null };

/** 비용 입력 상태: 원화 또는 여행지 화폐 */
export function useCost(item: Costed | undefined, currencies: string[]) {
  const [cur, setCur] = useState(item?.currency ?? 'KRW');
  const init = item ? (item.currency && item.currency !== 'KRW' ? item.amount : item.cost) : null;
  const [text, setText] = useState(init != null ? init.toLocaleString('ko-KR') : '');
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [rateErr, setRateErr] = useState(false);

  useEffect(() => {
    if (cur !== 'KRW' && !rates) loadRates().then(setRates).catch(() => setRateErr(true));
  }, [cur]);

  const amt = text === '' ? null : Number(text.replace(/,/g, ''));
  const rate = cur === 'KRW' ? 1 : rates?.[cur];
  const krw = amt != null && rate ? Math.round(amt / rate) : null;
  const curs = ['KRW', ...currencies, ...(cur !== 'KRW' && !currencies.includes(cur) ? [cur] : [])];

  /** 저장할 값. 환율이 아직 없으면 null */
  const value = (): Pick<Costed, 'cost' | 'currency' | 'amount'> | null => {
    if (amt != null && cur !== 'KRW' && !rate) return null;
    return { currency: cur, amount: cur === 'KRW' ? null : amt, cost: amt == null ? null : cur === 'KRW' ? amt : krw };
  };

  const onText = (raw: string) => {
    const v = raw.replace(/[^0-9.]/g, '');
    if (v === '') return setText('');
    const [a, b] = v.split('.');
    setText(Number(a).toLocaleString('ko-KR') + (b !== undefined ? '.' + b.slice(0, 2) : ''));
  };

  return { cur, setCur, text, onText, krw, curs, rateErr, value };
}

export function CostInput({ c, example = 25000 }: { c: ReturnType<typeof useCost>; example?: number }) {
  return (
    <>
      <div className="cost-row">
        {c.curs.length > 1 && (
          <select className="input" value={c.cur} onChange={(e) => c.setCur(e.target.value)} aria-label="화폐">
            {c.curs.map((x) => <option key={x} value={x}>{x === 'KRW' ? '원' : x}</option>)}
          </select>
        )}
        <input className="input" inputMode="decimal" value={c.text} aria-label="비용"
          placeholder={c.cur === 'KRW' ? `비용 (예: ${example.toLocaleString('ko-KR')})` : `비용 (예: ${money(3000, c.cur)})`}
          onChange={(e) => c.onText(e.target.value)} />
      </div>
      {c.cur !== 'KRW' && c.krw != null && <span className="xs muted">약 {won(c.krw)} (오늘 환율 기준)</span>}
      {c.cur !== 'KRW' && c.rateErr && <span className="xs" style={{ color: 'var(--red-ink)' }}>환율을 불러오지 못했어요. 원화로 적어주세요.</span>}
    </>
  );
}
