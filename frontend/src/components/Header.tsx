import { motion } from 'framer-motion';
import { Shield, Activity, AlertTriangle, Radio, Zap } from 'lucide-react';

interface HeaderProps {
  totalEvents: number;
  criticalCount: number;
  liveCount: number;
  isLive: boolean;
  onSimulate: () => void;
}

export function Header({ totalEvents, criticalCount, liveCount, isLive, onSimulate }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-3 backdrop-blur">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 shadow-lg shadow-red-900/50">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-white">
            I4C — National Cybercrime Reporting Portal
          </h1>
          <p className="text-xs text-slate-400">Indian Cybercrime Coordination Centre · Intelligence Dashboard</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-6">
        <div className="hidden items-center gap-5 lg:flex">
          <StatChip
            icon={<Activity className="h-4 w-4" />}
            label="Total Events"
            value={totalEvents.toLocaleString('en-IN')}
            color="text-cyan-400"
          />
          <StatChip
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Critical Risk"
            value={criticalCount.toLocaleString('en-IN')}
            color="text-red-400"
          />
          <StatChip
            icon={<Radio className="h-4 w-4" />}
            label="Live Feed"
            value={isLive ? 'Active' : 'Paused'}
            color={isLive ? 'text-green-400' : 'text-slate-500'}
            pulse={isLive}
          />
          {liveCount > 0 && (
            <StatChip
              icon={<Zap className="h-4 w-4" />}
              label="New"
              value={`+${liveCount}`}
              color="text-amber-400"
            />
          )}
        </div>

        <button
          onClick={onSimulate}
          className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/40 transition-all hover:shadow-red-700/60 hover:brightness-110 active:scale-95"
        >
          <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
          Simulate Fraud Event
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
      </motion.div>
    </header>
  );
}

function StatChip({
  icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${color} ${pulse ? 'animate-pulse' : ''}`}>{icon}</span>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}</span>
      </div>
    </div>
  );
}
