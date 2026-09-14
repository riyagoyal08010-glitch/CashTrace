import { useEffect, useRef, useState } from 'react';
import {
  X, MapPin, Tag, Gauge, IndianRupee, Clock, ShieldAlert, FileText,
  Fingerprint, Share2, Play, CheckCircle2, Loader2, Snowflake, ScrollText, Bell,
} from 'lucide-react';
import type { ThreatEvent } from '@/lib/types';
import { CATEGORY_COLORS, formatCurrency, formatTime, getRiskLevel } from '@/lib/mockData';
import { LocationPreviewPopover } from '@/components/LocationPreviewPopover';

interface EventDetailPanelProps {
  event: ThreatEvent | null;
  onClose: () => void;
  onShowLinkAnalysis: () => void;
}

interface PlaybookStep {
  label: string;
  icon: React.ReactNode;
}

const PLAYBOOK_STEPS: PlaybookStep[] = [
  { label: 'Freezing Funds', icon: <Snowflake className="h-4 w-4" /> },
  { label: 'Generating FIR Draft', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Notifying QRT', icon: <Bell className="h-4 w-4" /> },
];

const STEP_DURATION = 1800;

type PlaybookStatus = 'idle' | 'running' | 'complete';

export function EventDetailPanel({ event, onClose, onShowLinkAnalysis }: EventDetailPanelProps) {
  if (!event) return null;

  const level = getRiskLevel(event.riskScore);
  const levelColor =
    level === 'critical' ? 'text-red-400' : level === 'high' ? 'text-orange-400' : 'text-amber-400';
  const levelBg =
    level === 'critical' ? 'bg-red-500/15 border-red-500/40' : level === 'high' ? 'bg-orange-500/15 border-orange-500/40' : 'bg-amber-500/15 border-amber-500/40';
  const categoryColor = CATEGORY_COLORS[event.category];

  return (
    <div className="absolute bottom-6 left-1/2 z-20 w-[28rem] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur-lg">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-400" />
          <h3 className="text-sm font-bold text-white">Event Details</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-3 w-3 rounded-full"
              style={{ backgroundColor: categoryColor, boxShadow: `0 0 8px ${categoryColor}` }}
            />
            <span className="text-sm font-bold text-slate-200">{event.category}</span>
          </div>
          <span className={`rounded border px-2 py-0.5 text-xs font-bold ${levelBg} ${levelColor}`}>
            Risk: {event.riskScore.toFixed(2)} · {level.toUpperCase()}
          </span>
        </div>

        <p className="text-sm text-slate-300">{event.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <LocationDetailItem event={event} />
          <DetailItem icon={<Tag className="h-4 w-4" />} label="Category" value={event.category} />
          <DetailItem icon={<Gauge className="h-4 w-4" />} label="Risk Score" value={event.riskScore.toFixed(2)} />
          <DetailItem icon={<IndianRupee className="h-4 w-4" />} label="Amount" value={formatCurrency(event.amount)} />
          <DetailItem icon={<Clock className="h-4 w-4" />} label="Timestamp" value={formatTime(event.timestamp)} />
          <DetailItem icon={<FileText className="h-4 w-4" />} label="Status" value={event.status} />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
          <Fingerprint className="h-4 w-4 text-slate-500" />
          <span className="font-mono text-xs text-slate-400">{event.id}</span>
        </div>

        <PlaybookRunner event={event} />

        <button
          onClick={onShowLinkAnalysis}
          className="flex items-center justify-center gap-2 rounded-lg border border-cyan-700/50 bg-cyan-900/30 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-800/40"
        >
          <Share2 className="h-3.5 w-3.5" />
          Open Link Analysis Graph
        </button>
      </div>
    </div>
  );
}

function PlaybookRunner({ event }: { event: ThreatEvent }) {
  const [status, setStatus] = useState<PlaybookStatus>('idle');
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('idle');
    setActiveStep(0);
    setCompletedSteps([]);
  };

  const runStep = (step: number) => {
    if (step >= PLAYBOOK_STEPS.length) {
      setStatus('complete');
      return;
    }

    setActiveStep(step);
    timerRef.current = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, step]);
      runStep(step + 1);
    }, STEP_DURATION);
  };

  const handleExecute = () => {
    if (status === 'running') return;
    if (status === 'complete') {
      reset();
      return;
    }
    setStatus('running');
    setCompletedSteps([]);
    runStep(0);
  };

  const buttonLabel =
    status === 'idle' ? 'Execute Playbook'
    : status === 'running' ? 'Running…'
    : 'Playbook Complete · Run Again';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={handleExecute}
          disabled={status === 'running'}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
            status === 'running'
              ? 'cursor-not-allowed bg-slate-700 text-slate-400'
              : status === 'complete'
              ? 'bg-emerald-600/90 text-white hover:bg-emerald-500'
              : 'bg-red-600/90 text-white hover:bg-red-500'
          }`}
        >
          {status === 'running' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === 'complete' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {buttonLabel}
        </button>
        <button
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
        >
          Assign Investigator
        </button>
      </div>

      {(status === 'running' || status === 'complete') && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          {PLAYBOOK_STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i);
            const isActive = status === 'running' && activeStep === i;
            const isPending = status === 'running' && i > activeStep;

            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                  isActive ? 'bg-slate-800/80' : 'bg-transparent'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors"
                  style={{
                    borderColor: isDone ? '#84c794' : isActive ? '#ed9b78' : '#334155',
                    backgroundColor: isDone ? 'rgba(132,199,148,0.15)' : isActive ? 'rgba(237,155,120,0.15)' : 'transparent',
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                  ) : (
                    <span className="text-slate-500" style={{ filter: isPending ? 'opacity(0.4)' : 'none' }}>
                      {step.icon}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      isDone ? 'text-emerald-300' : isActive ? 'text-orange-300' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {isDone ? 'Completed' : isActive ? 'In progress…' : 'Queued'}
                  </span>
                </div>
                {isDone && (
                  <span className="font-mono text-[10px] text-emerald-500/70">
                    ✓ {((i + 1) / PLAYBOOK_STEPS.length * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            );
          })}

          {status === 'complete' && (
            <div className="mt-1 flex items-center gap-2 border-t border-slate-800 pt-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-300">
                All actions executed for {event.id}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationDetailItem({ event }: { event: ThreatEvent }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!popoverOpen) {
      openTimerRef.current = setTimeout(() => setPopoverOpen(true), 200);
    }
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => setPopoverOpen(false), 300);
  };

  const handlePopoverMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className={`flex flex-col gap-1 rounded-lg border px-3 py-2 transition-colors ${
          popoverOpen
            ? 'border-cyan-500/50 bg-slate-800/60'
            : 'border-slate-800 bg-slate-950/50 hover:border-slate-600'
        }`}
      >
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
          <MapPin className="h-4 w-4" />
          Location
          <span className="ml-auto rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-bold text-cyan-300">
            Hover to preview map
          </span>
        </span>
        <span className="text-sm font-semibold capitalize text-slate-200">
          {event.city}, {event.state}
        </span>
      </div>

      <div onMouseEnter={handlePopoverMouseEnter} onMouseLeave={handleMouseLeave}>
        <LocationPreviewPopover
          event={event}
          visible={popoverOpen}
          onClose={() => setPopoverOpen(false)}
        />
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold capitalize text-slate-200">{value}</span>
    </div>
  );
}
