import { useEffect, useRef } from 'react';
import maplibregl from '../lib/maplibre';
import type * as ML from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

export interface Visit {
  city_id: number;
  name: string;
  country_code: string;
  lat: number;
  lng: number;
  visits: number;
}

let worldP: Promise<FeatureCollection> | null = null;
const loadWorld = () => (worldP ??= fetch('/data/world.json').then((r) => r.json()));

const toGeo = (v: Visit[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: v.map((x) => ({
    type: 'Feature',
    properties: { name: x.name, visits: x.visits, id: x.city_id },
    geometry: { type: 'Point', coordinates: [x.lng, x.lat] },
  })),
});

const countryFilter = (v: Visit[]): ML.FilterSpecification =>
  ['in', ['get', 'c'], ['literal', [...new Set(v.map((x) => x.country_code))]]];

const worldZoom = (w: number) => Math.log2(Math.max(w, 200) / 512) + 0.15;

export default function WorldMap({ visits, onCity, suffix = '번 다녀왔어요' }: { visits: Visit[]; onCity?: (id: number) => void; suffix?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<ML.Map | null>(null);
  const ready = useRef(false);
  const latest = useRef(visits);
  const onCityRef = useRef(onCity);
  const suffixRef = useRef(suffix);
  latest.current = visits;
  onCityRef.current = onCity;
  suffixRef.current = suffix;

  useEffect(() => {
    if (!box.current) return;
    const z = worldZoom(box.current.clientWidth);
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'sea', type: 'background', paint: { 'background-color': '#F4F7F8' } }],
      },
      center: [15, 28],
      zoom: z,
      minZoom: z - 0.2,
      maxZoom: 9,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: true,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;

    m.on('load', async () => {
      const world = await loadWorld();
      if (!map.current) return;
      m.addSource('world', { type: 'geojson', data: world });
      m.addLayer({ id: 'land', type: 'fill', source: 'world', paint: { 'fill-color': '#DCE3E7', 'fill-outline-color': '#FFFFFF' } });
      m.addLayer({ id: 'land-visited', type: 'fill', source: 'world', filter: countryFilter(latest.current), paint: { 'fill-color': '#B3DDD3', 'fill-outline-color': '#FFFFFF' } });
      m.addSource('visits', { type: 'geojson', data: toGeo(latest.current) });
      m.addLayer({
        id: 'visits-halo',
        type: 'circle',
        source: 'visits',
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], -1, 4, 4, 8, 8, 12], 'circle-color': '#FFFFFF' },
      });
      m.addLayer({
        id: 'visits',
        type: 'circle',
        source: 'visits',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], -1, 2.8, 4, 6, 8, 10],
          'circle-color': ['step', ['get', 'visits'], '#7CC6BA', 2, '#2A9D8F', 3, '#0B5D53'],
        },
      });
      m.on('click', 'visits', (e: ML.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { name: string; visits: number; id: number };
        new maplibregl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:inherit;font-size:13px"><b>${String(p.name).replace(/</g, '&lt;')}</b><br/>${p.visits}${suffixRef.current}</div>`)
          .addTo(m);
        onCityRef.current?.(Number(p.id));
      });
      m.on('mouseenter', 'visits', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'visits', () => (m.getCanvas().style.cursor = ''));
      ready.current = true;
    });

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => {
      ready.current = false;
      ro.disconnect();
      map.current = null;
      m.remove();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    (m.getSource('visits') as ML.GeoJSONSource | undefined)?.setData(toGeo(visits));
    m.setFilter('land-visited', countryFilter(visits));
  }, [visits]);

  const reset = () => {
    const m = map.current;
    if (m && box.current) m.easeTo({ center: [15, 28], zoom: worldZoom(box.current.clientWidth), duration: 400 });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div ref={box} className="map" role="region" aria-label="다녀온 도시 지도" />
      <button className="map-reset" onClick={reset} aria-label="세계 전체 보기">전체</button>
    </div>
  );
}
