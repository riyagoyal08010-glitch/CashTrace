import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.d.ts';
import {
  Building2, Shield, Phone, Copy, Check, Radio, FileText, X, MapPin, Loader2,
} from 'lucide-react';
import type { ThreatEvent } from '@/lib/types';

interface LocationPreviewPopoverProps {
  event: ThreatEvent;
  visible: boolean;
  onClose: () => void;
}

type ToastType = 'dispatch' | 'fir' | 'copied';

interface ToastState {
  type: ToastType;
  message: string;
}

export function LocationPreviewPopover({ event, visible, onClose }: LocationPreviewPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [firModalOpen, setFirModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const { bankDetails, nearestPoliceStation } = event;

  const midLat = (bankDetails.lat + nearestPoliceStation.lat) / 2;
  const midLng = (bankDetails.lng + nearestPoliceStation.lng) / 2;

  useEffect(() => {
    if (!visible || !containerRef.current || mapRef.current) return;

    setMapReady(false);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'dark-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OSM &copy; CARTO',
          },
        },
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#0a1420' } },
          { id: 'tiles', type: 'raster', source: 'dark-tiles', minzoom: 0, maxzoom: 19 },
        ],
      },
      center: [midLng, midLat],
      zoom: 14,
      interactive: false,
      attributionControl: false,
    });

    map.on('load', () => {
      // Dashed line connecting bank to police station
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [bankDetails.lng, bankDetails.lat],
              [nearestPoliceStation.lng, nearestPoliceStation.lat],
            ],
          },
          properties: {},
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#7cc4c1',
          'line-width': 2,
          'line-dasharray': [3, 2],
          'line-opacity': 0.6,
        },
      });

      // Bank marker (red/orange)
      const bankEl = document.createElement('div');
      bankEl.innerHTML = `
        <div style="
          width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
          background: #ed9b78; border: 2px solid #fff;
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        ">
          <div style="transform: rotate(45deg); color: #fff; font-size: 14px; font-weight: bold;">B</div>
        </div>
      `;
      new maplibregl.Marker({ element: bankEl, anchor: 'bottom' })
        .setLngLat([bankDetails.lng, bankDetails.lat])
        .addTo(map);

      // Police marker (cyan/blue shield)
      const policeEl = document.createElement('div');
      policeEl.innerHTML = `
        <div style="
          width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
          background: #7cc4c1; border: 2px solid #fff;
          transform: rotate(-45deg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        ">
          <div style="transform: rotate(45deg); color: #fff; font-size: 14px; font-weight: bold;">P</div>
        </div>
      `;
      new maplibregl.Marker({ element: policeEl, anchor: 'bottom' })
        .setLngLat([nearestPoliceStation.lng, nearestPoliceStation.lat])
        .addTo(map);

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [visible]);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDispatch = () => {
    showToast('dispatch', `Dispatch alert broadcast to ${nearestPoliceStation.name}`);
  };

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(nearestPoliceStation.phone).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('copied', `Copied ${nearestPoliceStation.phone} to clipboard`);
  };

  if (!visible) return null;

  return (
    <>
      {/* Popover card */}
      <div
        className="absolute bottom-full left-0 z-30 mb-2 w-80 rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur-lg"
      >
        {/* Arrow */}
        <div className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-slate-700 bg-slate-900" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">Location Preview</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mini-map */}
        <div className="relative h-40 w-full overflow-hidden">
          <div ref={containerRef} className="h-full w-full" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          )}
          {/* Distance badge */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/50 bg-slate-950/90 px-2.5 py-1 text-[10px] font-bold text-cyan-300 shadow-lg backdrop-blur">
            {nearestPoliceStation.distanceKm} km away
          </div>
        </div>

        {/* Summary section */}
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 border border-orange-500/30">
              <Building2 className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">{bankDetails.name}</span>
              <span className="text-[10px] text-slate-500">{bankDetails.branch}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30">
              <Shield className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-xs font-bold text-slate-200">{nearestPoliceStation.name}</span>
              <span className="text-[10px] text-slate-500">{nearestPoliceStation.jurisdiction}</span>
              <div className="mt-1 flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-slate-500" />
                <span className="font-mono text-[10px] text-slate-400">{nearestPoliceStation.phone}</span>
                <button
                  onClick={handleCopyPhone}
                  className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 transition hover:bg-slate-700"
                >
                  {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-800 px-4 py-3">
          <button
            onClick={handleDispatch}
            className="flex flex-col items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-[9px] font-bold text-red-300 transition hover:bg-red-500/20"
          >
            <Radio className="h-4 w-4" />
            Direct Dispatch Alert
          </button>
          <button
            onClick={() => setFirModalOpen(true)}
            className="flex flex-col items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-2 text-[9px] font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            <FileText className="h-4 w-4" />
            Draft Local FIR
          </button>
          <button
            onClick={handleCopyPhone}
            className="flex flex-col items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-2 text-[9px] font-bold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            <Phone className="h-4 w-4" />
            Call Cyber Cell
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 shadow-2xl">
          {toast.type === 'dispatch' && <Radio className="h-4 w-4 text-red-400" />}
          {toast.type === 'fir' && <FileText className="h-4 w-4 text-amber-400" />}
          {toast.type === 'copied' && <Check className="h-4 w-4 text-emerald-400" />}
          <span className="text-xs font-semibold text-slate-200">{toast.message}</span>
        </div>
      )}

      {/* FIR Modal */}
      {firModalOpen && (
        <FirModal
          event={event}
          onClose={() => setFirModalOpen(false)}
          onFile={() => {
            setFirModalOpen(false);
            showToast('fir', `FIR draft filed with ${nearestPoliceStation.name}`);
          }}
        />
      )}
    </>
  );
}

function FirModal({
  event,
  onClose,
  onFile,
}: {
  event: ThreatEvent;
  onClose: () => void;
  onFile: () => void;
}) {
  const firId = `FIR-${event.id.slice(-6)}`;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-[34rem] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Draft First Information Report</h3>
              <p className="text-[10px] text-slate-500">{firId} · Pre-filled from event {event.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <FirField label="FIR Number" value={firId} />
            <FirField label="Date of Filing" value={today} />
            <FirField label="Police Station" value={event.nearestPoliceStation.name} />
            <FirField label="Jurisdiction" value={event.nearestPoliceStation.jurisdiction} />
            <FirField label="Incident Location" value={`${event.city}, ${event.state}`} />
            <FirField label="Incident Time" value={new Date(event.timestamp).toLocaleString('en-IN')} />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Nature of Offense</span>
            <p className="mt-1 text-sm text-slate-200">{event.category}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Incident Description</span>
            <p className="mt-1 text-sm text-slate-300">{event.description}</p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Amount Involved</span>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(event.amount)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onFile}
              className="flex-1 rounded-lg bg-amber-600/90 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-500"
            >
              File FIR Draft
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FirField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-200">{value}</span>
    </div>
  );
}
