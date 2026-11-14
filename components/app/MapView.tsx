"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Map as MapLibreMap, MapOptions, Marker } from "maplibre-gl";
import { useFeed, useHelp, useMissions, useReports } from "@/lib/app-state";
import { AskHelpDialog, HELP_KINDS, ago } from "./Help";
import { ISSUE_LABELS, MISSION_CATEGORIES, STATUS_LABELS } from "@/lib/app-data";
import { AQI_STATIONS, DHAKA_CENTER, FLOOD_ZONES, RECYCLING_SITES, aqiLevel, coordsFor } from "@/lib/geo";
import { useToast } from "./Toast";
import type { HelpRequest, LngLat } from "@/lib/types";

type MapLibreModule = typeof import("maplibre-gl");
type MapStyle = Exclude<MapOptions["style"], string | undefined>;

type LayerKey = "help" | "missions" | "reports" | "recycling" | "air" | "flood";

interface LayerDef {
  key: LayerKey;
  label: string;
  color: string;
  icon: string;
}

/** A row in the side list (help requests and map items). */
interface ListItem {
  id: string;
  kind: LayerKey;
  at: LngLat;
  kicker: string;
  title: string;
  color?: string;
  aqi?: number;
}

/** Text shown in a marker popup. */
interface PopupContent {
  kicker: string;
  title: string;
  sub: string;
  href?: string;
  cta?: string;
}

/** Anything with a marker on the map (except live help requests). */
interface MapItem extends ListItem, PopupContent {}

/** Category labels looked up by a mission's (free-form string) category. */
const CATEGORY_LABELS: Record<string, string> = MISSION_CATEGORIES;

const LAYERS: LayerDef[] = [
  { key: "help", label: "Help requests", color: "#d93025", icon: "🆘" },
  { key: "missions", label: "Missions", color: "#2c5a3d", icon: "⚑" },
  { key: "reports", label: "Reports", color: "#c4483d", icon: "!" },
  { key: "recycling", label: "Recycling", color: "#3d6fa8", icon: "♻" },
  { key: "air", label: "Air quality", color: "#e9874b", icon: "◉" },
  { key: "flood", label: "Flood zones", color: "#2f8fbf", icon: "≈" },
];

// Free OpenStreetMap raster tiles (attribution required). Swap for a hosted tile provider in production.
const STYLE: MapStyle = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** The layer definition for a kind (every LayerKey has one). */
function layerFor(key: LayerKey): LayerDef {
  const layer = LAYERS.find((l) => l.key === key);
  if (!layer) throw new Error(`Unknown map layer: ${key}`);
  return layer;
}

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Builds popup content with DOM APIs (textContent) so user-written text can't inject HTML. */
function popupNode(item: PopupContent, onOpen?: (href: string) => void) {
  const root = document.createElement("div");
  root.className = "mappop";
  const kicker = document.createElement("small");
  kicker.textContent = item.kicker;
  const title = document.createElement("strong");
  title.textContent = item.title;
  const sub = document.createElement("p");
  sub.textContent = item.sub;
  root.append(kicker, title, sub);
  const href = item.href;
  if (href) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.cta || "Open";
    btn.addEventListener("click", () => onOpen?.(href));
    root.append(btn);
  }
  return root;
}

/** Popup for a help request: who, what, live-location freshness, and respond / directions buttons. */
function helpPopupNode(h: HelpRequest, onRespond: (h: HelpRequest) => void) {
  const kind = HELP_KINDS[h.kind];
  const root = document.createElement("div");
  root.className = "mappop mappop--help";
  const kicker = document.createElement("small");
  kicker.textContent = `${kind.icon} ${kind.label} · ${h.people} ${h.people === 1 ? "person" : "people"}`;
  const title = document.createElement("strong");
  title.textContent = h.mine ? "Your help request" : `${h.user.name} needs help`;
  root.append(kicker, title);
  if (h.note) {
    const note = document.createElement("p");
    note.textContent = h.note;
    root.append(note);
  }
  const meta = document.createElement("p");
  meta.className = "mappop__meta";
  meta.textContent = `Live location updated ${ago(h.locatedAt)}${h.accuracy ? ` · ±${h.accuracy} m` : ""} · ${
    h.responders ? `${h.responders} on the way` : "no one responding yet"
  }`;
  root.append(meta);
  if (!h.mine) {
    const row = document.createElement("div");
    row.className = "mappop__row";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = h.responding ? "is-on" : "";
    btn.textContent = h.responding ? "✓ You’re on the way (undo)" : "I’m on my way";
    btn.addEventListener("click", () => onRespond(h));
    const dir = document.createElement("a");
    dir.href = `https://www.google.com/maps/dir/?api=1&destination=${h.at[1]},${h.at[0]}`;
    dir.target = "_blank";
    dir.rel = "noopener";
    dir.textContent = "Directions";
    row.append(btn, dir);
    root.append(row);
  }
  return root;
}

export default function MapView() {
  const router = useRouter();
  const toast = useToast();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibreModule | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const meRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [asking, setAsking] = useState(false);
  const help = useHelp(10_000); // poll live locations every 10s
  const helpMarkersRef = useRef(new Map<string, Marker>());
  const [on, setOn] = useState<Record<LayerKey, boolean>>({ help: true, missions: true, reports: true, recycling: true, air: true, flood: true });
  const [selected, setSelected] = useState<string | null>(null);

  const { missions } = useMissions();
  const { reports } = useReports();
  const { posts } = useFeed("all");

  // Everything that can appear on the map, as one list.
  const items = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const list: MapItem[] = [];
    for (const m of missions) {
      if (m.end < today) continue;
      list.push({
        id: `m-${m.id}`,
        kind: "missions",
        at: coordsFor(m.location, m.id),
        kicker: `${CATEGORY_LABELS[m.category]} · ${fmt(m.start)} – ${fmt(m.end)}`,
        title: m.title,
        sub: `${m.location} · ${m.joined.toLocaleString()}/${m.capacity.toLocaleString()} joined${m.isJoined ? " · You’re in" : ""}`,
        href: `/missions?open=${m.id}`,
        cta: m.isJoined ? "View mission" : "View & join",
      });
    }
    const seen = new Set<string>();
    for (const r of reports) {
      seen.add(r.id);
      list.push({
        id: `r-${r.id}`,
        kind: "reports",
        at: coordsFor(r.place, r.id),
        kicker: `Your report · ${STATUS_LABELS[r.status]}`,
        title: `${r.id} · ${ISSUE_LABELS[r.issue]}`,
        sub: r.place,
        href: "/reports",
        cta: "Open My reports",
      });
    }
    // Reports neighbours shared on the feed
    for (const p of posts) {
      const a = p.attachment;
      if (a?.kind !== "report") continue;
      const rid = a.title.split(" · ")[0];
      if (seen.has(rid)) continue;
      seen.add(rid);
      list.push({
        id: `p-${p.id}`,
        kind: "reports",
        at: coordsFor(a.sub || p.area, rid),
        kicker: `Community report · ${a.status ?? "Submitted"}`,
        title: a.title,
        sub: `${a.sub || p.area} · by ${p.author.name}`,
        href: `/feed?post=${p.id}`,
        cta: "View on feed",
      });
    }
    for (const s of RECYCLING_SITES) {
      list.push({ id: `c-${s.name}`, kind: "recycling", at: s.at, kicker: "Recycling point", title: s.name, sub: `${s.accepts} · ${s.hours}` });
    }
    for (const s of AQI_STATIONS) {
      const lvl = aqiLevel(s.aqi);
      list.push({ id: `a-${s.name}`, kind: "air", at: s.at, kicker: "Air quality (sample)", title: `${s.name}: AQI ${s.aqi}`, sub: lvl.label, aqi: s.aqi, color: lvl.color });
    }
    return list;
  }, [missions, reports, posts]);

  // Memoised so markers are only rebuilt when data or filters change (not on every re-render,
  // which would close an open popup).
  const visible = useMemo(() => items.filter((i) => on[i.kind]), [items, on]);

  // ---- create the map once ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // MapLibre v6 ships named exports (no default); older builds had a default export.
        const mod: MapLibreModule & { default?: MapLibreModule } = await import("maplibre-gl");
        const maplibregl = mod.default ?? mod;
        // The worker is served from /public (copied by scripts/copy-maplibre-worker.mjs).
        maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
        if (cancelled) return;
        libRef.current = maplibregl;
        const container = boxRef.current;
        if (!container) throw new Error("Map container is not mounted.");
        const map = new maplibregl.Map({
          container,
          style: STYLE,
          center: [90.38, 23.8],
          zoom: 11.6,
          attributionControl: { compact: true },
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          map.addSource("flood", { type: "geojson", data: FLOOD_ZONES });
          map.addLayer({
            id: "flood-fill",
            type: "fill",
            source: "flood",
            paint: { "fill-color": ["match", ["get", "risk"], "High", "#1d6fa5", "#4aa3d8"], "fill-opacity": 0.28 },
          });
          map.addLayer({ id: "flood-line", type: "line", source: "flood", paint: { "line-color": "#1d6fa5", "line-width": 1.5, "line-dasharray": [2, 1] } });
          map.on("click", "flood-fill", (e) => {
            const f = e.features?.[0];
            if (!f) return;
            new maplibregl.Popup({ offset: 8 })
              .setLngLat(e.lngLat)
              .setDOMContent(popupNode({ kicker: `Flood-prone area (sample) · ${f.properties.risk} risk`, title: f.properties.name, sub: "Keep drains clear and follow BWDB alerts during heavy rain." }))
              .addTo(map);
          });
          map.on("mouseenter", "flood-fill", () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", "flood-fill", () => (map.getCanvas().style.cursor = ""));
          setReady(true);
        });
        map.on("error", (e) => {
          const err: unknown = e?.error;
          const status = typeof err === "object" && err !== null && "status" in err ? err.status : undefined;
          if (status === 403 || status === 429) setMapError("Map tiles are temporarily unavailable.");
        });
        mapRef.current = map;
      } catch (e) {
        console.error(e);
        setMapError("The map couldn’t load in this browser.");
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- keep markers in sync with data + filters ----
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = libRef.current;
    if (!ready || !map || !maplibregl) return;
    map.setLayoutProperty("flood-fill", "visibility", on.flood ? "visible" : "none");
    map.setLayoutProperty("flood-line", "visibility", on.flood ? "visible" : "none");

    const markers = markersRef.current;
    markers.forEach((m) => m.remove());
    markers.clear();
    for (const item of visible) {
      const layer = layerFor(item.kind);
      const el = document.createElement("button");
      el.type = "button";
      el.className = `mapdot mapdot--${item.kind}`;
      el.style.setProperty("--c", item.color || layer.color);
      el.setAttribute("aria-label", `${layer.label}: ${item.title}`);
      el.textContent = item.kind === "air" ? String(item.aqi) : layer.icon;
      const popup = new maplibregl.Popup({ offset: 18, maxWidth: "260px" }).setDOMContent(popupNode(item, (href) => router.push(href)));
      const marker = new maplibregl.Marker({ element: el }).setLngLat(item.at).setPopup(popup).addTo(map);
      el.addEventListener("click", () => setSelected(item.id));
      markers.set(item.id, marker);
    }
  }, [ready, visible, on.flood, router]);

  // ---- live help markers: update in place so open popups stay open as locations move ----
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = libRef.current;
    if (!ready || !map || !maplibregl) return;
    const markers = helpMarkersRef.current;
    const show = on.help ? help.requests : [];
    const ids = new Set(show.map((h) => `h-${h.id}`));
    for (const [id, m] of markers) {
      if (!ids.has(id)) {
        m.remove();
        markers.delete(id);
      }
    }
    const onRespond = (h: HelpRequest) =>
      help.respond(h).then(
        (r) => toast(r.responding ? `Thanks! ${h.user.name} can see that you’re on the way.` : "Okay — removed you from the helpers."),
        (e) => toast(e.message),
      );
    for (const h of show) {
      const id = `h-${h.id}`;
      let m = markers.get(id);
      if (!m) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `mapdot mapdot--help${h.mine ? " is-mine" : ""}`;
        el.textContent = "SOS";
        el.addEventListener("click", () => setSelected(id));
        m = new maplibregl.Marker({ element: el }).setLngLat(h.at).setPopup(new maplibregl.Popup({ offset: 22, maxWidth: "280px" })).addTo(map);
        markers.set(id, m);
      }
      m.setLngLat(h.at);
      m.getElement().setAttribute("aria-label", `Help request: ${h.user.name}, ${HELP_KINDS[h.kind].label}`);
      m.getPopup().setDOMContent(helpPopupNode(h, onRespond));
    }
  }, [ready, help.requests, on.help, help, toast]);

  function focus(item: { id: string; at: LngLat }) {
    const map = mapRef.current;
    if (!map) return;
    setSelected(item.id);
    map.flyTo({ center: item.at, zoom: Math.max(map.getZoom(), 14), speed: 1.4 });
    const marker = markersRef.current.get(item.id) ?? helpMarkersRef.current.get(item.id);
    if (marker && !marker.getPopup().isOpen()) marker.togglePopup();
  }

  function locate() {
    if (!navigator.geolocation) return toast("Location isn’t available in this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const at: LngLat = [pos.coords.longitude, pos.coords.latitude];
        const map = mapRef.current;
        const maplibregl = libRef.current;
        if (!map || !maplibregl) return;
        meRef.current?.remove();
        const el = document.createElement("span");
        el.className = "mapme";
        meRef.current = new maplibregl.Marker({ element: el }).setLngLat(at).addTo(map);
        map.flyTo({ center: at, zoom: 14 });
      },
      () => toast("Couldn’t get your location. Check the browser’s location permission."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const counts = Object.fromEntries(
    LAYERS.map((l) => [
      l.key,
      l.key === "flood" ? FLOOD_ZONES.features.length : l.key === "help" ? help.requests.length : items.filter((i) => i.kind === l.key).length,
    ]),
  );
  const helpItems: ListItem[] = on.help
    ? help.requests.map((h) => ({
        id: `h-${h.id}`,
        kind: "help",
        at: h.at,
        title: h.mine ? "Your help request" : `${h.user.name} needs help`,
        kicker: `${HELP_KINDS[h.kind].icon} ${HELP_KINDS[h.kind].label} · ${h.responders} on the way · ${ago(h.locatedAt)}`,
      }))
    : [];
  const listed: ListItem[] = [...helpItems, ...visible];
  const myHelp = help.mine;

  return (
    <section className="mappage" aria-label="Map">
      <header className="page-head mappage__head">
        <div>
          <span className="eyebrow">LIVE MAP · DHAKA</span>
          <h1>See what’s happening around you</h1>
        </div>
        <div className="mappage__actions">
          <button type="button" className="btn-primary btn-primary--ghost" onClick={locate}>
            ◎ Locate me
          </button>
          {myHelp ? (
            <button type="button" className="btn-sos btn-sos--active" onClick={() => focus({ id: `h-${myHelp.id}`, at: myHelp.at })}>
              🆘 Your request is live
            </button>
          ) : (
            <button type="button" className="btn-sos" onClick={() => setAsking(true)}>
              🆘 Ask for help
            </button>
          )}
        </div>
      </header>

      <div className="chips" role="group" aria-label="Map layers">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            type="button"
            className={`chip maplayer${on[l.key] ? " chip--on" : ""}`}
            aria-pressed={on[l.key]}
            style={{ "--c": l.color } as CSSProperties}
            onClick={() => setOn((o) => ({ ...o, [l.key]: !o[l.key] }))}
          >
            <span className="maplayer__dot" aria-hidden="true" />
            {l.label} <span className="maplayer__n">{counts[l.key]}</span>
          </button>
        ))}
      </div>

      <div className="mappage__body">
        <div className="card mapbox">
          <div ref={boxRef} className="mapbox__map" role="application" aria-label="Map of Dhaka with missions, reports and services" />
          {!ready && !mapError && <p className="mapbox__msg">Loading map…</p>}
          {mapError && <p className="mapbox__msg mapbox__msg--err">{mapError}</p>}
        </div>

        <aside className="card maplist" aria-label="Places on the map">
          <h2>
            {listed.length} place{listed.length === 1 ? "" : "s"}
            {helpItems.length > 0 && <span className="maplist__sos"> · {helpItems.length} need help</span>}
          </h2>
          <ul>
            {listed.map((i) => {
              const layer = layerFor(i.kind);
              return (
                <li key={i.id}>
                  <button type="button" className={`${selected === i.id ? "on" : ""}${i.kind === "help" ? " is-help" : ""}`} onClick={() => focus(i)}>
                    <span className="maplist__dot" style={{ "--c": i.color || layer.color } as CSSProperties} aria-hidden="true">
                      {i.kind === "air" ? "" : i.kind === "help" ? "!" : layer.icon}
                    </span>
                    <span>
                      <strong>{i.title}</strong>
                      <small>{i.kicker}</small>
                    </span>
                  </button>
                </li>
              );
            })}
            {!listed.length && <li className="maplist__empty">Turn on a layer to see places.</li>}
          </ul>
        </aside>
      </div>
      {asking && <AskHelpDialog onClose={() => setAsking(false)} />}
      <p className="mappage__note">Air-quality stations and flood zones are sample data for the prototype. Follow official alerts from BWDB and the Department of Environment.</p>
    </section>
  );
}
