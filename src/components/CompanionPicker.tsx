import { COMPANIONS, type Companion } from '../lib/types';

export default function CompanionPicker({ value, onChange }: { value: Companion; onChange: (v: Companion) => void }) {
  return (
    <div className="three">
      {COMPANIONS.map((c) => (
        <button key={c.value} type="button" className={`choice ${value === c.value ? 'on' : ''}`} aria-pressed={value === c.value} onClick={() => onChange(c.value)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
