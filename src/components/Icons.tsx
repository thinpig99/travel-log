const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconMap = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z" /><path d="M9 4v13M15 7v13" /></svg>
);
export const IconBoard = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>
);
export const IconTicket = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" /></svg>
);
export const IconUser = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const IconBack = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconX = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconPlus = ({ s = 24 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} strokeWidth={2.2} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
export const IconSearch = ({ s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
);
export const IconTemplate = ({ s = 24 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
);
export const IconPin = ({ s = 24 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
