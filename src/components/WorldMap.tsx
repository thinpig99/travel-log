import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';

export interface Visit {
  city_id: number;
  name: string;
  country_code: string;
  lat: number;
  lng: number;
  visits: number;
}

const STYLE = 'https://tiles.openfreemap.org/styles/positron';

const toGeo = (v: Visit[]) => ({
  type: 'FeatureCollection' as const,
  features: v.map((x) => ({
    type: 'Feature' as const,
    properties: { name: x.name, visits: x.visits, id: x.city_id },
    geometry: { type: 'Point' as const, coordinates: [x.lng, x.lat] },
  })),
});

export default function WorldMap({ visits, onCity }: { visits: Visit[]; onCity?: (id: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const latest = useRef(visits);
  const onCityRef = useRef(onCity);
  latest.current = visits;
  onCityRef.current = onCity;

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: [127, 25],
      zoom: 0.4,
      minZoom: 0,
      maxZoom: 12,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: true,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;

    m.on('load', () => {
      for (const layer of m.getStyle().layers ?? []) {
        if (layer.type === 'symbol' && m.getLayoutProperty(layer.id, 'text-field')) {
          m.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:ko'], ['get', 'name']]);
        }
      }
      m.addSource('visits', { type: 'geojson', data: toGeo(latest.current) });
      m.addLayer({
        id: 'visits-halo',
        type: 'circle',
        source: 'visits',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 4, 8, 8, 12],
          'circle-color': '#ffffff',
        },
      });
      m.addLayer({
        id: 'visits',
        type: 'circle',
        source: 'visits',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3.5, 4, 6, 8, 10],
          'circle-color': ['step', ['get', 'visits'], '#7CC6BA', 2, '#2A9D8F', 3, '#0B5D53'],
        },
      });
      m.on('click', 'visits', (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { name: string; visits: number; id: number };
        new maplibregl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:inherit;font-size:13px"><b>${p.name.replace(/</g, '&lt;')}</b><br/>${p.visits}번 다녀왔어요</div>`)
          .addTo(m);
        onCityRef.current?.(Number(p.id));
      });
      m.on('mouseenter', 'visits', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'visits', () => (m.getCanvas().style.cursor = ''));
      ready.current = true;
      fit(m, latest.current);
    });
    return () => {
      ready.current = false;
      m.remove();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    (m.getSource('visits') as maplibregl.GeoJSONSource | undefined)?.setData(toGeo(visits));
    fit(m, visits);
  }, [visits]);

  return <div ref={box} className="map" role="region" aria-label="다녀온 도시 지도" />;
}

function fit(m: maplibregl.Map, v: Visit[]) {
  if (v.length < 2) {
    if (v.length === 1) m.jumpTo({ center: [v[0].lng, v[0].lat], zoom: 3 });
    return;
  }
  const b = new maplibregl.LngLatBounds();
  v.forEach((x) => b.extend([x.lng, x.lat]));
  m.fitBounds(b, { padding: 40, maxZoom: 5, duration: 0 });
}
