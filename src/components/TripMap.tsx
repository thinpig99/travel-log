import { useEffect, useRef } from 'react';
import maplibregl from '../lib/maplibre';
import type * as ML from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { loadWorld } from './WorldMap';
import type { CityRef } from '../lib/types';
import { cityLabel } from '../lib/geo';

const SEA = '#EEF2F8';
const LAND = '#CDD3E0';
const TRIP_LAND = '#C3CAEE';
const ROUTE = '#28347D';

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

// 오른쪽을 가리키는 화살촉 이미지
const arrowImage = () => {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = ROUTE;
  g.strokeStyle = '#FFFFFF';
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(26, 16);
  g.lineTo(8, 6);
  g.lineTo(12, 16);
  g.lineTo(8, 26);
  g.closePath();
  g.stroke();
  g.fill();
  return g.getImageData(0, 0, s, s);
};

/** 도시마다 경도를 정한다. 동선 순서대로 이전 도시와 180도 이내가 되도록 ±360 을 더해,
 *  태평양을 건너는 여행도 가까운 쪽으로 잇는다 */
const unwrapLngs = (cities: CityRef[], route: CityRef[]) => {
  const out = new Map<number, number>();
  const near = (lng: number, ref: number) => { let x = lng; while (x - ref > 180) x -= 360; while (ref - x > 180) x += 360; return x; };
  let prev: number | null = null;
  for (const c of [...route, ...cities]) {
    if (c.lng == null || out.has(c.id)) continue;
    const ref = prev ?? (out.size ? [...out.values()].reduce((s, v) => s + v, 0) / out.size : c.lng);
    const v = near(c.lng, ref);
    out.set(c.id, v);
    prev = v;
  }
  return out;
};

const unY = (y: number) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

// 도시 사이를 살짝 휜 곡선으로 잇는다. 진행 방향 오른쪽으로 휘므로 왕복 구간도 겹치지 않는다
const routeGeo = (route: CityRef[], lngs: Map<number, number>): { lines: FeatureCollection; arrows: FeatureCollection } => {
  const pts = route.filter((c) => c.lat != null && c.lng != null).map((c) => ({ ...c, lng: lngs.get(c.id) ?? c.lng }));
  const segs = pts.slice(1).map((b, i) => [pts[i], b] as const).filter(([a, b]) => a.id !== b.id);
  const lines: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const arrows: FeatureCollection = { type: 'FeatureCollection', features: [] };
  for (const [a, b] of segs) {
    const ax = (a.lng! * Math.PI) / 180, ay = mercY(a.lat!);
    let bl = b.lng!;
    while (bl - a.lng! > 180) bl -= 360;
    while (a.lng! - bl > 180) bl += 360;
    const bx = (bl * Math.PI) / 180, by = mercY(b.lat!);
    const dx = bx - ax, dy = by - ay;
    // 오른쪽 법선 방향으로 길이의 18% 만큼 제어점 이동
    const cx = (ax + bx) / 2 + dy * 0.18, cy = (ay + by) / 2 - dx * 0.18;
    const at = (t: number) => {
      const u = 1 - t;
      return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
    };
    const coords = Array.from({ length: 21 }, (_, i) => {
      const [x, y] = at(i / 20);
      return [(x * 180) / Math.PI, unY(y)];
    });
    lines.features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
    const [mx, my] = at(0.5);
    const tx = bx - ax, ty = by - ay; // 베지어 중간점의 접선은 시작-끝 방향과 같다
    const deg = (-Math.atan2(ty, tx) * 180) / Math.PI;
    arrows.features.push({ type: 'Feature', properties: { rot: deg }, geometry: { type: 'Point', coordinates: [(mx * 180) / Math.PI, unY(my)] } });
  }
  return { lines, arrows };
};

export default function TripMap({ cities, route, countries }: { cities: CityRef[]; route: CityRef[]; countries: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<ML.Map | null>(null);
  const markers = useRef<ML.Marker[]>([]);
  const key = cities.map((c) => c.id).join() + '|' + route.map((c) => c.id).join();
  const lngs = unwrapLngs(cities, route);

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: { version: 8, sources: {}, layers: [{ id: 'sea', type: 'background', paint: { 'background-color': SEA } }] },
      center: [127, 37],
      zoom: 3,
      maxZoom: 9,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;
    m.on('load', async () => {
      const world = await loadWorld();
      if (map.current !== m) return;
      m.addSource('world', { type: 'geojson', data: world });
      m.addLayer({
        id: 'land', type: 'fill', source: 'world',
        paint: { 'fill-color': ['match', ['get', 'c'], countries.length ? countries : ['__'], TRIP_LAND, LAND], 'fill-outline-color': '#FFFFFF' },
      });
      m.addImage('arrow', arrowImage(), { pixelRatio: 2 });
      const g = routeGeo(route, lngs);
      m.addSource('route', { type: 'geojson', data: g.lines });
      m.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round' }, paint: { 'line-color': ROUTE, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
      m.addSource('arrows', { type: 'geojson', data: g.arrows });
      m.addLayer({
        id: 'arrows', type: 'symbol', source: 'arrows',
        layout: { 'icon-image': 'arrow', 'icon-rotate': ['get', 'rot'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      });
    });
    return () => {
      map.current = null;
      m.remove();
    };
  }, [key, countries.join()]);

  // 도시 마커와 화면 맞추기
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    const pts = cities.filter((c) => c.lat != null && c.lng != null);
    markers.current = pts.map((c, i) => {
      const el = document.createElement('div');
      el.className = 'trip-pin';
      el.innerHTML = `<b>${i + 1}</b><span></span>`;
      el.querySelector('span')!.textContent = cityLabel(c);
      return new maplibregl.Marker({ element: el, anchor: 'left', offset: [-11, 0] }).setLngLat([lngs.get(c.id) ?? c.lng!, c.lat!]).addTo(m);
    });
    if (pts.length === 1) m.jumpTo({ center: [lngs.get(pts[0].id) ?? pts[0].lng!, pts[0].lat!], zoom: 6 });
    else if (pts.length > 1) {
      const b = new maplibregl.LngLatBounds();
      pts.forEach((c) => b.extend([lngs.get(c.id) ?? c.lng!, c.lat!]));
      const w = box.current?.clientWidth ?? 300;
      m.fitBounds(b, { padding: { top: 40, bottom: 40, left: 40, right: Math.min(110, w / 3) }, maxZoom: 6, duration: 0 });
    }
  }, [key]);

  return <div ref={box} className="map trip-map" aria-label="여행 도시 지도" />;
}
