import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Crosshair, LocateFixed, Radio, ScanLine,
} from 'lucide-react';
import type { ThreatEvent } from '@/lib/types';
import { formatCurrency, getRiskLevel } from '@/lib/mockData';

interface ThreatMapProps {
  events: ThreatEvent[];
  selectedId?: string;
  onSelect: (event: ThreatEvent) => void;
}

const RISK_COLORS: Record<string, string> = {
  critical: '#e2657a',
  high: '#ed9b78',
  moderate: '#edbe7d',
};

const INDIA_BOUNDS = { west: 68, east: 97, south: 7, north: 36 };

function getMarkerPosition(event: ThreatEvent) {
  const left = ((event.lng - INDIA_BOUNDS.west) / (INDIA_BOUNDS.east - INDIA_BOUNDS.west)) * 100;
  const top = ((INDIA_BOUNDS.north - event.lat) / (INDIA_BOUNDS.north - INDIA_BOUNDS.south)) * 100;
  return {
    left: `${Math.min(95, Math.max(5, left))}%`,
    top: `${Math.min(90, Math.max(10, top))}%`,
  };
}

const INDIA_OUTLINE =
  'M 30 18 L 38 15 L 45 14 L 52 12 L 58 15 L 62 20 L 66 25 L 70 30 L 74 38 L 76 45 L 74 52 L 70 58 L 66 62 L 62 66 L 58 70 L 52 72 L 46 70 L 42 66 L 38 60 L 34 54 L 30 48 L 26 40 L 24 32 L 27 24 Z';

export function ThreatMap({ events, selectedId, onSelect }: ThreatMapProps) {
  const visibleEvents = events.slice(0, 24);
  const criticalEvents = events.filter((e) => e.riskScore >= 0.9).length;
  const highRiskEvents = events.filter((e) => e.riskScore >= 0.75).length;
  const selectedEvent = events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="relative h-full min-h-[480px] min-w-0 flex-1 overflow-hidden bg-[#07111d]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_46%,rgba(124,196,193,0.14),transparent_38%),linear-gradient(135deg,#0a1420_0%,#0b1a2a_48%,#070f18_100%)]" />

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(124,196,193,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,196,193,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

      {/* SVG India outline */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="india-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(124,196,193,0.06)" />
            <stop offset="100%" stopColor="rgba(124,196,193,0.02)" />
          </linearGradient>
        </defs>
        <motion.path
          d={INDIA_OUTLINE}
          fill="url(#india-fill)"
          stroke="rgba(124,196,193,0.18)"
          strokeWidth="0.3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
      </svg>

      {/* Radar rings */}
      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        <div className="absolute left-[20%] top-[20%] h-[60%] w-[60%] rounded-[48%] border border-cyan-400/10" />
        <div className="absolute left-[30%] top-[30%] h-[40%] w-[40%] rounded-[48%] border border-cyan-400/[0.08]" />
        <div className="absolute left-[40%] top-[40%] h-[20%] w-[20%] rounded-[48%] border border-cyan-400/[0.06]" />
      </div>

      {/* Scanning line */}
      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        <motion.div
          animate={{ y: ['-10%', '110%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent shadow-[0_0_18px_rgba(124,196,193,0.5)]"
        />
      </div>

      {/* Heatmap glow blobs for high-risk areas */}
      <div className="pointer-events-none absolute inset-0 z-[2]">
        {visibleEvents.slice(0, 8).map((event, i) => {
          const level = getRiskLevel(event.riskScore);
          const color = RISK_COLORS[level];
          const pos = getMarkerPosition(event);
          return (
            <motion.div
              key={`glow-${event.id}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.15, scale: 1 }}
              transition={{ duration: 1, delay: i * 0.05 }}
              style={{ ...pos, backgroundColor: color }}
              className="absolute h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            />
          );
        })}
      </div>

      {/* Threat markers */}
      <div className="pointer-events-none absolute inset-0 z-[3]">
        {visibleEvents.map((event, index) => {
          const level = getRiskLevel(event.riskScore);
          const color = RISK_COLORS[level];
          const position = getMarkerPosition(event);
          const selected = event.id === selectedId;

          return (
            <motion.button
              key={event.id}
              type="button"
              onClick={() => onSelect(event)}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: selected ? 1.4 : 1 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
              style={{ ...position, color }}
              className="pointer-events-auto absolute -ml-2.5 -mt-2.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-slate-950/80 shadow-[0_0_14px_currentColor] transition-transform hover:scale-150"
              aria-label={`Select ${event.category} event in ${event.city}`}
            >
              {level === 'critical' && (
                <motion.span
                  animate={{ scale: [1, 2.8], opacity: [0.7, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.08 }}
                  className="absolute inset-0 rounded-full border border-current"
                />
              )}
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </motion.button>
          );
        })}
      </div>

      {/* Selected event tooltip */}
      <AnimatePresence>
        {selectedEvent && (() => {
          const pos = getMarkerPosition(selectedEvent);
          const level = getRiskLevel(selectedEvent.riskScore);
          const color = RISK_COLORS[level];
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              style={{ ...pos }}
              className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-[130%] rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-bold text-white">{selectedEvent.category}</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{selectedEvent.city}, {selectedEvent.state}</p>
              <p className="text-[10px] font-semibold" style={{ color }}>{formatCurrency(selectedEvent.amount)} · Risk {selectedEvent.riskScore.toFixed(2)}</p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Top-left overlay */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
        <div className="rounded-xl border border-cyan-400/20 bg-slate-950/85 px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-cyan-300" />
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-100">ATM Withdrawal Hotspots</h3>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Predictive risk heatmap · India</p>
          <div className="mt-3 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5 text-cyan-300"><Radio className="h-3 w-3 animate-pulse" /> LIVE</span>
            <span className="text-slate-500">{visibleEvents.length} plotted nodes</span>
          </div>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-slate-950/75 px-3 py-2 text-[10px] text-slate-400 backdrop-blur-md">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span><strong className="text-white">{highRiskEvents}</strong> high-risk signals</span>
          <span className="h-3 w-px bg-white/10" />
          <span><strong className="text-red-400">{criticalEvents}</strong> critical</span>
        </div>
      </div>

      {/* Top-right overlay */}
      <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-slate-950/80 px-3 py-2 text-[10px] text-cyan-200 backdrop-blur-md">
        <LocateFixed className="h-3.5 w-3.5" /> Spatial model active
      </div>

      {/* Bottom-left hint */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] text-slate-500 backdrop-blur-md">
        <ScanLine className="h-3.5 w-3.5 text-cyan-400" /> Click a signal to inspect the event
      </div>

      {/* Bottom-right risk scale */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 backdrop-blur">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Risk Scale</span>
        <div className="flex items-center gap-1">
          <span className="h-2 w-12 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Moderate</span>
          <span>High</span>
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
}
