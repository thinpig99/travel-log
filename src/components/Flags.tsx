import { useEffect, useState } from 'react';
import { loadCountries } from '../lib/geo';

export default function Flags({ codes, size = 22 }: { codes: string[]; size?: number }) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    loadCountries().then((m) => setNames(Object.fromEntries(codes.map((c) => [c, m[c]?.[0] ?? c]))));
  }, [codes.join()]);
  if (!codes.length) return null;
  return (
    <span className="row gap6 wrap" style={{ alignItems: 'center', minHeight: size * 0.75 }}>
      {codes.map((c) => (
        <img key={c} src={`https://flagcdn.com/${c.toLowerCase()}.svg`} alt={names[c] ?? c} title={names[c] ?? c}
          width={size} height={Math.round(size * 0.75)}
          style={{ objectFit: 'cover', borderRadius: 3, boxShadow: '0 0 0 1px rgba(20,26,51,0.12)' }} />
      ))}
    </span>
  );
}
