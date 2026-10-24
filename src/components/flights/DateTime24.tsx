import { useEffect, useState } from 'react';

const fmt = (digits: string) => (digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2, 4)}` : digits);
const valid = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** 날짜 + 24시간제 시각. 값은 "YYYY-MM-DDTHH:MM" (시각이 없으면 "YYYY-MM-DD") */
export default function DateTime24({ value, onChange, onFocusEmpty, label }: {
  value: string; onChange: (v: string) => void; onFocusEmpty?: () => void; label: string;
}) {
  const date = value.slice(0, 10);
  const [time, setTime] = useState(value.length >= 16 ? value.slice(11, 16) : '');
  useEffect(() => { setTime(value.length >= 16 ? value.slice(11, 16) : ''); }, [value.length >= 16 ? value.slice(11, 16) : '']);
  const bad = time.length > 0 && time.length === 5 && !valid(time);

  const emit = (d: string, t: string) => onChange(d ? (valid(t) ? `${d}T${t}` : d) : '');

  return (
    <div className="dt24">
      <input type="date" value={date} aria-label={`${label} 날짜`} onFocus={() => !value && onFocusEmpty?.()}
        onChange={(e) => emit(e.target.value, time)} />
      <input className={bad ? 'bad' : ''} inputMode="numeric" value={time} placeholder="00:00" maxLength={5} aria-label={`${label} 시각 (24시간)`}
        onFocus={() => !value && onFocusEmpty?.()}
        onChange={(e) => {
          const t = fmt(e.target.value.replace(/\D/g, '').slice(0, 4));
          setTime(t);
          if (t.length === 5 || t === '') emit(date, t);
        }} />
    </div>
  );
}
