import { useEffect, useRef, useState, type ReactNode } from 'react';

const IGNORE = '.maplibregl-map, input, textarea, select, .no-swipe';

/** 좌우로 밀어 이전/다음 탭으로 넘긴다. 손가락을 따라 움직이고 놓으면 부드럽게 넘어간다 */
export default function SwipeTabs<T extends string>({ tabs, tab, onChange, children }: { tabs: T[]; tab: T; onChange: (t: T) => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [enter, setEnter] = useState<'' | 'from-right' | 'from-left'>('');
  const st = useRef({ x: 0, y: 0, t: 0, lock: '' as '' | 'h' | 'v', skip: false });
  const idx = tabs.indexOf(tab);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      st.current = { x: t.clientX, y: t.clientY, t: Date.now(), lock: '', skip: e.touches.length > 1 || !!(e.target as Element).closest?.(IGNORE) };
    };
    const move = (e: TouchEvent) => {
      const s = st.current;
      if (s.skip) return;
      const t = e.touches[0];
      const mx = t.clientX - s.x;
      const my = t.clientY - s.y;
      if (!s.lock) {
        if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.3) s.lock = 'h';
        else if (Math.abs(my) > 10) s.lock = 'v';
      }
      if (s.lock !== 'h') return;
      e.preventDefault();
      const atEdge = (mx > 0 && idx === 0) || (mx < 0 && idx === tabs.length - 1);
      setDragging(true);
      setDx(atEdge ? mx * 0.25 : mx);
    };
    const end = (e: TouchEvent) => {
      const s = st.current;
      if (s.lock !== 'h') return;
      const mx = (e.changedTouches[0]?.clientX ?? s.x) - s.x;
      const fast = Math.abs(mx) / Math.max(1, Date.now() - s.t) > 0.5;
      const go = Math.abs(mx) > el.clientWidth * 0.25 || (fast && Math.abs(mx) > 30);
      setDragging(false);
      setDx(0);
      if (!go) return;
      const next = mx < 0 ? idx + 1 : idx - 1;
      if (next < 0 || next >= tabs.length) return;
      setEnter(mx < 0 ? 'from-right' : 'from-left');
      onChange(tabs[next]);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [idx, tabs.join(), onChange]);

  return (
    <div ref={box} className="swipe-box">
      <div
        key={tab}
        className={`swipe-pane ${enter}`}
        onAnimationEnd={() => setEnter('')}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? 'none' : 'transform .25s ease' }}
      >
        {children}
      </div>
    </div>
  );
}
