import { NextResponse } from "next/server";

const FT = 3.280839895;
const M_LAT = 111320;

type Pin = { lat: number; lng: number };
type Pt = [number, number];

function allowed(raw: string) {
  try {
    const host = new URL(raw).hostname;
    const name = host.replace(/^www\./, "");
    return (
      name === "maps.app.goo.gl" ||
      name === "goo.gl" ||
      name === "google.com" ||
      name.endsWith(".google.com") ||
      name === "apple.com" ||
      name.endsWith(".apple.com") ||
      name === "bing.com" ||
      name.endsWith(".bing.com") ||
      name === "openstreetmap.org" ||
      name.endsWith(".openstreetmap.org")
    );
  } catch {
    return false;
  }
}

function coords(text: string): Pin[] {
  const found: Pin[] = [];
  for (const match of text.matchAll(/(-?\d{1,2}\.\d{4,})\s*[~,]\s*\+?\s*(-?\d{1,3}\.\d{4,})/g)) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) found.push({ lat, lng });
  }
  for (const match of text.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)) {
    found.push({ lat: Number(match[1]), lng: Number(match[2]) });
  }
  return found;
}

function dedupe(pins: Pin[]) {
  const out: Pin[] = [];
  for (const pin of pins) {
    if (out.some((other) => Math.hypot(other.lat - pin.lat, other.lng - pin.lng) < 0.00012)) continue;
    out.push(pin);
  }
  return out;
}

function toFeet(pins: Pin[]): Pt[] {
  const lat0 = pins.reduce((sum, pin) => sum + pin.lat, 0) / pins.length;
  const lng0 = pins.reduce((sum, pin) => sum + pin.lng, 0) / pins.length;
  const mx = M_LAT * Math.cos((lat0 * Math.PI) / 180) * FT;
  const my = M_LAT * FT;
  return pins.map((pin) => [(pin.lng - lng0) * mx, (pin.lat - lat0) * my]);
}

function center(pts: Pt[]): Pt[] {
  const cx = pts.reduce((sum, pt) => sum + pt[0], 0) / pts.length;
  const cy = pts.reduce((sum, pt) => sum + pt[1], 0) / pts.length;
  return pts.map(([x, y]) => [x - cx, y - cy]);
}

function area(pts: Pt[]) {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(sum) / 2;
}

function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list: Pt[]) => {
    const ring: Pt[] = [];
    for (const pt of list) {
      while (ring.length >= 2 && cross(ring[ring.length - 2], ring[ring.length - 1], pt) <= 0) ring.pop();
      ring.push(pt);
    }
    return ring;
  };
  const lower = build(pts);
  const upper = build([...pts].reverse());
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function placeName(raw: string) {
  try {
    const url = new URL(raw);
    const path = decodeURIComponent(url.pathname);
    const place = path.match(/\/(?:search|place)\/([^/@]+)/);
    const fromPath = place?.[1]?.replace(/\+/g, " ").split(",")[0]?.trim() ?? "";
    if (fromPath && !/^-?\d+\.\d+/.test(fromPath)) return fromPath;
    const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
    const fromQuery = query.replace(/\+/g, " ").split(",")[0].trim();
    if (fromQuery && !/^-?\d+\.\d+/.test(fromQuery)) return fromQuery;
  } catch {
    return "";
  }
  return "";
}

function addressLike(raw: string) {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\b(STREET|AVENUE|ROAD|DRIVE|BOULEVARD|LANE|COURT|PLACE|ST|AVE|RD|DR|BLVD|LN|CT|PL)\b/g, " ")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\s+/g, " ")
    .trim();
  const match = cleaned.match(/^(\d{1,6})(?:\s+([NSEW]))?\s+([A-Z0-9]+)/);
  if (!match) return "";
  return `${match[1]} ${match[2] ? `${match[2]} ` : ""}${match[3]}%`;
}

function prettyAddress(raw: string) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

async function lotByAddress(address: string) {
  const like = addressLike(address);
  if (!like) return null;
  const url = new URL("https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query");
  url.searchParams.set("where", `PHYSICAL_ADDRESS LIKE '${like}'`);
  url.searchParams.set("outFields", "PHYSICAL_ADDRESS,LATITUDE,LONGITUDE");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = (await res.json()) as {
    features?: Array<{ attributes?: { PHYSICAL_ADDRESS?: string; LATITUDE?: number; LONGITUDE?: number } }>;
  };
  const hit = data.features?.find((feature) => feature.attributes?.LATITUDE && feature.attributes.LONGITUDE)?.attributes;
  if (!hit?.LATITUDE || !hit.LONGITUDE) return null;
  return {
    pin: { lat: hit.LATITUDE, lng: hit.LONGITUDE },
    name: prettyAddress(String(hit.PHYSICAL_ADDRESS ?? "")),
  };
}

async function pinFor(address: string): Promise<Pin | null> {
  const query = /,\s*[A-Za-z]/.test(address) ? address : `${address}, Phoenix, AZ`;
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", query);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = (await res.json()) as { result?: { addressMatches?: Array<{ coordinates?: { x?: number; y?: number } }> } };
  const point = data.result?.addressMatches?.[0]?.coordinates;
  if (!point?.x || !point.y) return null;
  return { lat: point.y, lng: point.x };
}

function contains(ring: number[][], lng: number, lat: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function lotAt(pin: Pin): Promise<{ outline: Pt[]; name: string }> {
  const url = new URL("https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0/query");
  url.searchParams.set("geometry", `${pin.lng},${pin.lat}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("distance", "30");
  url.searchParams.set("units", "esriSRUnit_Meter");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "json");
  url.searchParams.set("outFields", "LAND_SIZE,PHYSICAL_ADDRESS");
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = (await res.json()) as {
    features?: Array<{ attributes?: { PHYSICAL_ADDRESS?: string }; geometry?: { rings?: number[][][] } }>;
  };
  const hit = data.features?.find((feature) => {
    const ring = feature.geometry?.rings?.[0];
    return ring && contains(ring, pin.lng, pin.lat);
  });
  const ring = hit?.geometry?.rings?.[0];
  if (!ring || ring.length < 4) return { outline: [], name: "" };
  const pins = ring.map(([lng, lat]) => ({ lat, lng }));
  const last = pins[pins.length - 1];
  const open =
    Math.hypot(last.lat - pins[0].lat, last.lng - pins[0].lng) < 0.00001 ? pins.slice(0, -1) : pins;
  const feet = center(toFeet(open));
  return {
    outline: area(feet) > 200 ? feet : [],
    name: prettyAddress(String(hit?.attributes?.PHYSICAL_ADDRESS ?? "")),
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as { links?: string };
  const text = String(body.links ?? "");
  const urls = [...text.matchAll(/https?:\/\/\S+/g)].map((match) => match[0]).slice(0, 4);
  let place = urls.map(placeName).find(Boolean) ?? "";
  let pins = coords(text);
  for (const url of urls) {
    if (pins.length > 0 || (placeName(url) && coords(url).length === 0)) continue;
    if (!allowed(url)) continue;
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (allowed(res.url)) pins = pins.concat(coords(res.url));
    } catch {
      continue;
    }
  }
  pins = dedupe(pins);
  if (pins.length === 0 && place) {
    const found = await lotByAddress(place).catch(() => null);
    if (found) {
      pins = [found.pin];
      if (found.name) place = found.name;
    } else {
      const pin = await pinFor(place).catch(() => null);
      if (pin) pins = [pin];
    }
  }
  const send = (outline: Pt[], span: number, points: number) =>
    NextResponse.json({ outline, span, points, name: place });
  if (pins.length >= 3) {
    const outline = center(hull(toFeet(pins)));
    if (area(outline) > 200) return send(outline, 0, pins.length);
  }
  if (pins.length === 2) {
    const [a, b] = toFeet(pins);
    return send([], Math.hypot(a[0] - b[0], a[1] - b[1]), 2);
  }
  if (pins.length === 1) {
    const lot = await lotAt(pins[0]).catch(() => ({ outline: [] as Pt[], name: "" }));
    if (!place && lot.name) place = lot.name;
    return send(lot.outline, 0, 1);
  }
  return send([], 0, 0);
}
