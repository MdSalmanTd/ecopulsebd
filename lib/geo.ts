// Approximate coordinates for Dhaka areas used by the map (sample data for the prototype).
// [lng, lat] order, as MapLibre expects.

import type { FeatureCollection, Polygon } from "geojson";
import type { LngLat } from "@/lib/types";

export type { LngLat };

export interface RecyclingSite {
  name: string;
  accepts: string;
  hours: string;
  at: LngLat;
}

export interface AqiStation {
  name: string;
  aqi: number;
  at: LngLat;
}

export interface AqiLevel {
  label: string;
  color: string;
}

export interface FloodZoneProps {
  name: string;
  risk: string;
}

export const DHAKA_CENTER: LngLat = [90.385, 23.79];

// More specific keywords first: the first match wins.
const AREAS: [keyword: string, at: LngLat][] = [
  ["road 12", [90.372, 23.7445]],
  ["dhanmondi lake", [90.379, 23.747]],
  ["rabindra sarobar", [90.3795, 23.7468]],
  ["dhanmondi", [90.3742, 23.7461]],
  ["shewrapara", [90.3757, 23.7905]],
  ["kazipara", [90.373, 23.7975]],
  ["agargaon", [90.3804, 23.7779]],
  ["kailshi", [90.379, 23.821]],
  ["kalshi", [90.379, 23.821]],
  ["mirpur 10", [90.3687, 23.8069]],
  ["mirpur 2", [90.357, 23.805]],
  ["mirpur", [90.366, 23.8105]],
  ["sector 7", [90.397, 23.871]],
  ["uttara", [90.3795, 23.8759]],
  ["mohammadpur", [90.3589, 23.7662]],
  ["gulshan", [90.4078, 23.7925]],
  ["banani", [90.4043, 23.794]],
  ["old dhaka", [90.4074, 23.7104]],
  ["citywide", DHAKA_CENTER],
  ["dhaka", DHAKA_CENTER],
];

/** Small, stable offset so items in the same area don't sit exactly on top of each other. */
function jitter(seed: unknown): [number, number] {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) | 0;
  const a = ((h & 0xffff) / 0xffff - 0.5) * 0.006;
  const b = (((h >>> 16) & 0xffff) / 0xffff - 0.5) * 0.006;
  return [a, b];
}

/** Best-guess coordinates for a free-text place ("Road 12/A, Dhanmondi"). */
export function coordsFor(text: string | null | undefined, seed: unknown = text): LngLat {
  const t = String(text || "").toLowerCase();
  const hit = AREAS.find(([k]) => t.includes(k));
  const [lng, lat] = hit ? hit[1] : DHAKA_CENTER;
  const [dx, dy] = jitter(seed);
  return [lng + dx, lat + dy];
}

export const RECYCLING_SITES: RecyclingSite[] = [
  { name: "Mirpur 10 roundabout drop-off", accepts: "plastic, paper, cans", hours: "8am–8pm", at: [90.3685, 23.8072] },
  { name: "Shewrapara community bin", accepts: "plastic bottles, glass", hours: "24 h", at: [90.3762, 23.791] },
  { name: "Agargaon e-waste point", accepts: "batteries, phones, small electronics", hours: "10am–6pm (closed Fri)", at: [90.38, 23.7785] },
];

// Sample air-quality stations.
export const AQI_STATIONS: AqiStation[] = [
  { name: "Mirpur 10", aqi: 142, at: [90.3687, 23.8069] },
  { name: "Dhanmondi", aqi: 128, at: [90.3742, 23.7461] },
  { name: "Gulshan", aqi: 156, at: [90.4078, 23.7925] },
  { name: "Uttara", aqi: 118, at: [90.3795, 23.8759] },
  { name: "Old Dhaka", aqi: 171, at: [90.4074, 23.7104] },
];

export function aqiLevel(aqi: number): AqiLevel {
  if (aqi <= 50) return { label: "Good", color: "#2fb64a" };
  if (aqi <= 100) return { label: "Moderate", color: "#e8b64a" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", color: "#e9874b" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#c4483d" };
  return { label: "Very unhealthy", color: "#8a3fa0" };
}

// Sample low-lying, flood-prone areas (rough outlines for illustration only).
export const FLOOD_ZONES: FeatureCollection<Polygon, FloodZoneProps> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Kalshi – Mirpur 12 low ground", risk: "Moderate" },
      geometry: { type: "Polygon", coordinates: [[[90.372, 23.826], [90.39, 23.828], [90.392, 23.816], [90.375, 23.813], [90.372, 23.826]]] },
    },
    {
      type: "Feature",
      properties: { name: "Mirpur Beribadh (river edge)", risk: "High" },
      geometry: { type: "Polygon", coordinates: [[[90.335, 23.82], [90.348, 23.822], [90.35, 23.795], [90.338, 23.79], [90.335, 23.82]]] },
    },
    {
      type: "Feature",
      properties: { name: "Rampura – Badda canal belt", risk: "Moderate" },
      geometry: { type: "Polygon", coordinates: [[[90.418, 23.775], [90.432, 23.778], [90.434, 23.758], [90.42, 23.755], [90.418, 23.775]]] },
    },
  ],
};
