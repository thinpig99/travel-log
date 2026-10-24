import { useState } from 'react';
import { AIRLINES, airlineCode } from '../lib/flights';

/** 편명으로 항공사 로고를 보여준다. 로고를 못 불러오면 항공사 코드 배지 */
export default function AirlineLogo({ flightNo, size = 32 }: { flightNo: string; size?: number }) {
  const code = airlineCode(flightNo);
  const [broken, setBroken] = useState<string | null>(null);
  if (!code) return <span className="air-logo empty" style={{ width: size, height: size }} aria-hidden="true" />;
  return broken === code ? (
    <span className="air-logo code" style={{ width: size, height: size, fontSize: size * 0.36 }} title={AIRLINES[code] ?? code}>{code}</span>
  ) : (
    <img className="air-logo" src={`https://images.kiwi.com/airlines/64/${code}.png`} alt={AIRLINES[code] ?? code} title={AIRLINES[code] ?? code}
      width={size} height={size} onError={() => setBroken(code)} />
  );
}
