/** 도시 주변 유명한 곳: 한국어 위키백과 위치 검색 + 최근 30일 조회수 순 */
export interface Spot { title: string; desc: string; lat: number; lng: number; views: number }

// 관광지가 아닐 가능성이 큰 문서는 뺀다
const SKIP_TITLE = /(역|공항|학교|대학교|대학|병원|고속도로|국도|선$|노선|경기장|아파트|빌딩|은행|우체국|재판소|청사|본사|사무소|발전소|댐$|구$|시$|정$|동$|읍$|면$|군$|현$|마을$|교회$|선거구|지구$)/;
const SKIP_DESC = /(철도역|기차역|역사|기업|회사|정치|선수|가수|배우|학교|대학|병원|행정 구역|선거구|도로|노선|사람)/;

const cache = new Map<string, Spot[]>();

export const nearbySpots = async (lat: number, lng: number, lang: 'ko' | 'en' = 'ko'): Promise<Spot[]> => {
  const key = `${lang}:${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key)!;
  const q = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', generator: 'geosearch',
    ggscoord: `${lat}|${lng}`, ggsradius: '10000', ggslimit: '50',
    prop: 'pageviews|description|coordinates', pvipdays: '30',
  });
  const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?${q}`);
  const j = await r.json();
  const pages = Object.values((j?.query?.pages ?? {}) as Record<string, {
    title: string; description?: string; coordinates?: { lat: number; lon: number }[]; pageviews?: Record<string, number | null>;
  }>);
  const out = pages
    .filter((p) => !SKIP_TITLE.test(p.title) && !SKIP_DESC.test(p.description ?? ''))
    .map((p) => ({
      title: p.title.replace(/\s*\(.*\)$/, ''),
      desc: p.description ?? '',
      lat: p.coordinates?.[0]?.lat ?? lat,
      lng: p.coordinates?.[0]?.lon ?? lng,
      views: Object.values(p.pageviews ?? {}).reduce<number>((s, v) => s + (v ?? 0), 0),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  cache.set(key, out);
  return out;
};

export const mapsLink = (name: string, city?: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, city].filter(Boolean).join(' '))}`;
