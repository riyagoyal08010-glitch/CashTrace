import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Target, TrendingUp, Users, MapPin, Cpu,
  CheckCircle2, ArrowRight, BarChart3, Zap, Brain, Globe,
} from 'lucide-react';
import { useThreatFeed } from '@/hooks/useThreatFeed';
import { computeKPIs, computeCategoryBreakdown, computeTopCities } from '@/lib/analyticsData';
import { formatCurrency } from '@/lib/mockData';
import type { ViewKey } from './Navbar';

interface JudgeModeProps {
  onNavigate: (view: ViewKey) => void;
}

export function JudgeMode({ onNavigate }: JudgeModeProps) {
  const { events } = useThreatFeed();

  const kpis = useMemo(() => computeKPIs(events), [events]);
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(events), [events]);
  const topCities = useMemo(() => computeTopCities(events), [events]);
  const totalCategoryAmount = categoryBreakdown.reduce((s, c) => s + c.totalAmount, 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#090D16] pt-16">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            CyberGuard AI — Executive Summary
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Predictive Analytics Framework for Cybercrime Complaint Intelligence
          </p>
        </motion.div>

        {/* Problem Statement badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.03] p-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300">Problem Statement</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Development of a Predictive Analytics Framework for Cybercrime Complaints to Forecast
            Likely Cash Withdrawal Locations in Advance, Enabling Generation of Actionable
            Intelligence for Timely and Proactive Cybercrime Intervention.
          </p>
        </motion.div>

        {/* Key Metrics - large animated numbers */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <BigMetric
            icon={<BarChart3 className="h-6 w-6" />}
            label="Events Tracked"
            value={kpis.totalEvents}
            suffix=""
            color="cyan"
            delay={0}
          />
          <BigMetric
            icon={<Shield className="h-6 w-6" />}
            label="Funds at Risk"
            value={Math.round(kpis.totalAmount / 100000)}
            suffix="L"
            color="orange"
            delay={0.1}
            format="currency"
          />
          <BigMetric
            icon={<Zap className="h-6 w-6" />}
            label="Critical Alerts"
            value={kpis.criticalCount}
            suffix=""
            color="red"
            delay={0.2}
          />
          <BigMetric
            icon={<Globe className="h-6 w-6" />}
            label="Cities Covered"
            value={kpis.uniqueCities}
            suffix="+"
            color="emerald"
            delay={0.3}
          />
        </div>

        {/* Two-column: Solution Impact + Innovation Highlights */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Solution Impact */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Solution Impact</h3>
            </div>
            <div className="flex flex-col gap-3">
              <ImpactRow text="Reactive investigation → Predictive intervention" />
              <ImpactRow text="Hours of manual FIR drafting → One-click auto-generated" />
              <ImpactRow text="Delayed police coordination → Direct dispatch to nearest cyber cell" />
              <ImpactRow text="Post-fraud fund tracing → Pre-emptive fund freeze at source" />
              <ImpactRow text="Static crime reports → Live risk heatmap across 28+ cities" />
            </div>
          </motion.div>

          {/* Innovation Highlights */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Innovation Highlights</h3>
            </div>
            <div className="flex flex-col gap-3">
              <ImpactRow text="ML-based spatial forecasting of withdrawal locations" color="violet" />
              <ImpactRow text="Real-time entity link analysis graph (accounts, IPs, devices)" color="violet" />
              <ImpactRow text="Multi-factor risk scoring across 12+ parameters" color="violet" />
              <ImpactRow text="Interactive location intelligence with bank-police mapping" color="violet" />
              <ImpactRow text="Automated 3-step response playbook (freeze, FIR, dispatch)" color="violet" />
            </div>
          </motion.div>
        </div>

        {/* Category breakdown mini-chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Crime Category Distribution (Live)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categoryBreakdown.map((cat, i) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.05 }}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center"
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-2xl font-bold text-white">{cat.count}</span>
                <span className="text-[10px] font-medium text-slate-400">{cat.category}</span>
                <span className="text-[9px] text-slate-600">{formatCurrency(cat.totalAmount)}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <span className="text-xs text-slate-500">
              Total funds at risk across all categories: {formatCurrency(totalCategoryAmount)}
            </span>
          </div>
        </motion.div>

        {/* Top hotspots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
            <MapPin className="h-4 w-4 text-cyan-400" />
            Top Predicted Hotspots (Live)
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {topCities.slice(0, 6).map((city, i) => (
              <div key={city.city} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <span className={`text-xs font-bold ${i < 3 ? 'text-red-400' : 'text-slate-400'}`}>
                  #{i + 1}
                </span>
                <p className="mt-1 text-sm font-semibold text-white">{city.city}</p>
                <p className="text-[10px] text-slate-500">{city.count} events</p>
                {city.criticalCount > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-[9px] font-bold text-red-400">
                    {city.criticalCount} critical
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scalability & Deployment Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Scalability & Deployment Roadmap</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <RoadmapCard
              phase="Phase 1"
              title="Pilot Deployment"
              timeline="0–3 months"
              items={['5 metro cities', '3 bank integrations', 'Single cyber cell dispatch']}
            />
            <RoadmapCard
              phase="Phase 2"
              title="National Rollout"
              timeline="3–9 months"
              items={['28+ state capitals', 'All major bank APIs', 'State-wide QRT network']}
            />
            <RoadmapCard
              phase="Phase 3"
              title="AI Enhancement"
              timeline="9–18 months"
              items={['Deep learning forecasting', 'Cross-state pattern detection', 'International cooperation API']}
            />
          </div>
        </motion.div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 pb-8 text-center">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-bold text-[#090D16] shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-95"
            >
              <Cpu className="h-4 w-4" />
              Launch Live Dashboard
            </button>
            <button
              onClick={() => onNavigate('analytics')}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-white/10 active:scale-95"
            >
              <BarChart3 className="h-4 w-4" />
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Big Metric ─── */
const BIG_COLORS = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

function BigMetric({ icon, label, value, suffix, color, delay, format }: {
  icon: React.ReactNode; label: string; value: number; suffix: string;
  color: keyof typeof BIG_COLORS; delay: number; format?: 'currency';
}) {
  const c = BIG_COLORS[color];
  const displayValue = format === 'currency'
    ? `${value.toLocaleString('en-IN')}`
    : value.toLocaleString('en-IN');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className={`rounded-2xl border ${c.border} bg-white/[0.02] p-6 text-center`}
    >
      <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
        {icon}
      </div>
      <div className="flex items-baseline justify-center gap-0.5">
        <span className="text-3xl font-bold text-white sm:text-4xl">{displayValue}</span>
        {suffix && <span className={`text-xl font-bold ${c.text}`}>{suffix}</span>}
      </div>
      <span className="mt-1 block text-xs text-slate-400">{label}</span>
    </motion.div>
  );
}

/* ─── Impact Row ─── */
function ImpactRow({ text, color = 'emerald' }: { text: string; color?: 'emerald' | 'violet' }) {
  const dotColor = color === 'violet' ? 'bg-violet-400' : 'bg-emerald-400';
  const iconColor = color === 'violet' ? 'text-violet-400' : 'text-emerald-400';
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <span className="text-sm text-slate-300">{text}</span>
    </div>
  );
}

/* ─── Roadmap Card ─── */
function RoadmapCard({ phase, title, timeline, items }: {
  phase: string; title: string; timeline: string; items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{phase}</span>
      <h4 className="mt-1 text-base font-bold text-white">{title}</h4>
      <span className="mt-1 block text-xs text-slate-500">{timeline}</span>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
