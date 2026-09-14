import { useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MapPin, TrendingUp, Clock, Pause, Play } from 'lucide-react';
import type { ThreatEvent } from '@/lib/types';
import { CATEGORY_COLORS, formatCurrency, formatRelative, getRiskLevel } from '@/lib/mockData';

interface ThreatFeedProps {
  events: ThreatEvent[];
  selectedId?: string;
  onSelect: (event: ThreatEvent) => void;
  isLive: boolean;
  onToggleLive: () => void;
}

export function ThreatFeed({ events, selectedId, onSelect, isLive, onToggleLive }: ThreatFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHoveringRef = useRef(false);
  const prevScrollHeightRef = useRef(0);

  // After new events render, preserve scroll position if user is hovering
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (isHoveringRef.current && prevScrollHeightRef.current > 0) {
      const delta = container.scrollHeight - prevScrollHeightRef.current;
      if (delta > 0) {
        container.scrollTop += delta;
      }
    }
    prevScrollHeightRef.current = container.scrollHeight;
  }, [events]);

  return (
    <div className="flex w-96 shrink-0 flex-col border-l border-slate-800 bg-slate-950/60">
      <div className="relative flex min-w-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Activity className="h-4 w-4 shrink-0 text-cyan-400" />
          <h2 className="truncate text-sm font-bold uppercase tracking-wider text-slate-300">Real-Time Threat Feed</h2>
        </div>
        <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
          Risk &gt; 0.85
        </span>

        <button
          onClick={onToggleLive}
          className={`group absolute left-1/2 top-full z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur transition-all ${
            isLive
              ? 'border-green-500/40 bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'border-amber-500/40 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          }`}
        >
          {isLive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isLive ? 'Pause Feed' : 'Resume Feed'}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onMouseEnter={() => {
          isHoveringRef.current = true;
          const container = scrollRef.current;
          if (container) prevScrollHeightRef.current = container.scrollHeight;
        }}
        onMouseLeave={() => {
          isHoveringRef.current = false;
        }}
      >
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="text-sm text-slate-500">No events match current filters</p>
          </div>
        ) : (
          <div className="flex w-full flex-col">
            <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
              <FeedCard
                event={event}
                selected={event.id === selectedId}
                onClick={() => onSelect(event)}
              />
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedCard({
  event,
  selected,
  onClick,
}: {
  event: ThreatEvent;
  selected: boolean;
  onClick: () => void;
}) {
  const level = getRiskLevel(event.riskScore);
  const levelColor =
    level === 'critical' ? 'text-red-400' : level === 'high' ? 'text-orange-400' : 'text-amber-400';
  const levelBg =
    level === 'critical' ? 'bg-red-500/10 border-red-500/30' : level === 'high' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-amber-500/10 border-amber-500/30';
  const categoryColor = CATEGORY_COLORS[event.category];

  return (
    <button
      onClick={onClick}
      className={`group flex w-full flex-col gap-2 border-b border-slate-800/60 px-4 py-3 text-left transition hover:bg-slate-800/40 ${
        selected ? 'bg-slate-800/60' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-2 w-2 rounded-full"
            style={{ backgroundColor: categoryColor, boxShadow: `0 0 6px ${categoryColor}` }}
          />
          <span className="text-xs font-bold text-slate-200">{event.category}</span>
        </div>
        <span className={`text-sm font-bold ${levelColor}`}>
          {event.riskScore.toFixed(2)}
        </span>
      </div>

      <p className="text-xs text-slate-400 line-clamp-2">{event.description}</p>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[11px] text-slate-500">
        <span className="flex min-w-0 items-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{event.city}, {event.state}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-slate-400">
          <TrendingUp className="h-3 w-3" />
          {formatCurrency(event.amount)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-slate-600">
          <Clock className="h-3 w-3" />
          {formatRelative(event.timestamp)}
        </span>
        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${levelBg} ${levelColor}`}>
          {event.status.toUpperCase()}
        </span>
      </div>
    </button>
  );
}
