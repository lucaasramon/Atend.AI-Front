// Mapa dos bairros (OpenStreetMap): um círculo por bairro, maior onde mora mais gente
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint { label: string; n: number; lat: number; lng: number }

const FORTALEZA: L.LatLngTuple = [-3.7319, -38.5267];

export default function NeighborhoodMap({ points }: { points: MapPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    map.current = L.map(el.current!, { scrollWheelZoom: false, attributionControl: true }).setView(FORTALEZA, 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const max = Math.max(1, ...points.map((p) => p.n));
    // Área do círculo proporcional ao número de pessoas; os maiores ficam por baixo
    [...points].sort((a, b) => b.n - a.n).forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 6 + 18 * Math.sqrt(p.n / max),
        color: "#ffffff",
        weight: 2,
        fillColor: "hsl(42, 98%, 49%)",
        fillOpacity: 0.8,
      })
        .bindTooltip(`<b>${escapeHtml(p.label)}</b><br>${p.n} pessoa${p.n > 1 ? "s" : ""}`, { direction: "top" })
        .addTo(layer.current!);
    });
    if (points.length) map.current.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [30, 30], maxZoom: 13 });
    else map.current.setView(FORTALEZA, 11);
  }, [points]);

  // isolate: os painéis do Leaflet (z-index 400+) não passam por cima de menus e janelas
  return <div ref={el} className="isolate h-72 w-full rounded-md border border-border" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
