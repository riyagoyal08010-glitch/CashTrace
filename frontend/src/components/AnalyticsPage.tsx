import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import {
  Activity, TrendingUp, AlertTriangle, IndianRupee, MapPin, Gauge,
  Filter, X, ChevronDown, BarChart3, PieChart as PieIcon, LineChart as LineIcon,
} from 'lucide-react';
import { useThreatFeed } from '@/hooks/useThreatFeed';
import { CATEGORIES, CATEGORY_COLORS, formatCurrency } from '@/lib/mockData';
import {
  computeCategoryBreakdown, computeCityBreakdown, computeRiskDistribution,
  computeTimeSeries, computeKPIs, computeTopCities,
} from '@/lib/analyticsData';
import type { CrimeCategory, Filters } from '@/lib/types';
import { CITIES } from '@/lib/mockData';

const DEFAULT_FILTERS: Filters = {
  city: 'all',
  minRiskScore: 0,
  category: 'all',
};

type ChartTab = 'time' | 'category' | 'geo';

const CHART_TABS: { key: ChartTab; label: string; icon: React.ReactNode }[] = [
  { key: 'time', label: 'Time Series', icon: <LineIcon className="h-4 w-4" /> },
  { key: 'category', label: 'Category Breakdown', icon: <PieIcon className="h-4 w-4" /> },
  { key: 'geo', label: 'Geographic', icon: <BarChart3 className="h-4 w-4" /> },
];

export function AnalyticsPage() {
  const { events } = useThreatFeed();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [chartTab, setChartTab] = useState<ChartTab>('time');

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filters.city !== 'all' && e.city !== filters.city) return false;
      if (e.riskScore < filters.minRiskScore) return false;
      if (filters.category !== 'all' && e.category !== filters.category) return false;
      return true;
    });
  }, [events, filters]);

  const kpis = useMemo(() => computeKPIs(filteredEvents), [filteredEvents]);
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(filteredEvents), [filteredEvents]);
  const cityBreakdown = useMemo(() => computeCityBreakdown(filteredEvents), [filteredEvents]);
  const riskDist = useMemo(() => computeRiskDistribution(filteredEvents), [filteredEvents]);
  const timeSeries = useMemo(() => computeTimeSeries(filteredEvents), [filteredEvents]);
  const topCities = useMemo(() => computeTopCities(filteredEvents), [filteredEvents]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#090D16] pt-16">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics & Insights</h1>
            <p className="mt-1 text-sm text-slate-400">Deep-dive into cybercrime patterns and predictive metrics</p>
          </div>
          <AnalyticsFilters filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard icon={<Activity />} label="Total Events" value={kpis.totalEvents.toLocaleString('en-IN')} color="cyan" delay={0} />
          <KPICard icon={<AlertTriangle />} label="Critical Risk" value={kpis.criticalCount.toLocaleString('en-IN')} color="red" delay={0.1} />
          <KPICard icon={<IndianRupee />} label="Total At Risk" value={formatCurrency(kpis.totalAmount)} color="orange" delay={0.2} />
          <KPICard icon={<Gauge />} label="Avg Risk Score" value={kpis.avgRisk.toFixed(2)} color="amber" delay={0.3} />
        </div>

        {/* Chart tab switcher */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {CHART_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setChartTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
                chartTab === tab.key
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'border border-white/5 bg-white/[0.02] text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main chart area */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          {chartTab === 'time' && <TimeSeriesChart data={timeSeries} />}
          {chartTab === 'category' && <CategoryCharts breakdown={categoryBreakdown} riskDist={riskDist} />}
          {chartTab === 'geo' && <GeoCharts cityBreakdown={cityBreakdown} topCities={topCities} />}
        </div>

        {/* Bottom row: radial + summary */}
        <div className="grid gap-4 lg:grid-cols-3">
          <RiskRadialChart riskDist={riskDist} />
          <CategoryAmountCard breakdown={categoryBreakdown} />
          <CityLeaderboard cityBreakdown={cityBreakdown} />
        </div>
      </div>
    </div>
  );
}

/* ─── KPI Card ─── */
const KPI_COLORS = {
  cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

function KPICard({ icon, label, value, color, delay }: {
  icon: React.ReactNode; label: string; value: string;
  color: keyof typeof KPI_COLORS; delay: number;
}) {
  const c = KPI_COLORS[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`rounded-2xl border ${c.border} bg-white/[0.02] p-5`}
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
    </motion.div>
  );
}

/* ─── Analytics Filters ─── */
function AnalyticsFilters({ filters, onChange, onReset }: {
  filters: Filters; onChange: (f: Filters) => void; onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Filter className="h-4 w-4 text-cyan-400" />
        <span>Filters:</span>
      </div>
      <div className="relative">
        <select
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
          className="appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-slate-200 outline-none transition focus:border-cyan-500"
        >
          <option value="all">All Cities</option>
          {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      <div className="relative">
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value as CrimeCategory | 'all' })}
          className="appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-slate-200 outline-none transition focus:border-cyan-500"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 transition hover:text-slate-200"
      >
        <X className="h-3.5 w-3.5" />
        Reset
      </button>
    </div>
  );
}

/* ─── Time Series Chart ─── */
function TimeSeriesChart({ data }: { data: ReturnType<typeof computeTimeSeries> }) {
  if (data.length === 0) {
    return <EmptyChart label="No time-series data for current filters" />;
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-bold text-white">Events Over Time (Last 60 min)</h3>
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="grad-atm" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2657a" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#e2657a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-upi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7cc4c1" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#7cc4c1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-phish" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#edbe7d" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#edbe7d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area type="monotone" dataKey="atmFraud" name="ATM Fraud" stroke="#e2657a" strokeWidth={2} fill="url(#grad-atm)" />
          <Area type="monotone" dataKey="upiFraud" name="UPI Fraud" stroke="#7cc4c1" strokeWidth={2} fill="url(#grad-upi)" />
          <Area type="monotone" dataKey="phishing" name="Phishing" stroke="#edbe7d" strokeWidth={2} fill="url(#grad-phish)" />
          <Area type="monotone" dataKey="cardSkimming" name="Card Skimming" stroke="#ed9b78" strokeWidth={1.5} fillOpacity={0} />
          <Area type="monotone" dataKey="identityTheft" name="Identity Theft" stroke="#ad97c9" strokeWidth={1.5} fillOpacity={0} />
          <Area type="monotone" dataKey="cryptoScam" name="Crypto Scam" stroke="#d994bd" strokeWidth={1.5} fillOpacity={0} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Category Charts ─── */
function CategoryCharts({ breakdown, riskDist }: {
  breakdown: ReturnType<typeof computeCategoryBreakdown>;
  riskDist: ReturnType<typeof computeRiskDistribution>;
}) {
  if (breakdown.every((b) => b.count === 0)) {
    return <EmptyChart label="No category data for current filters" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-4 text-sm font-bold text-white">Category Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={breakdown}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={55}
              paddingAngle={2}
              stroke="none"
            >
              {breakdown.map((entry) => (
                <Cell key={entry.category} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-bold text-white">Risk Score Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={riskDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {riskDist.map((entry) => (
                <Cell key={entry.range} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Geo Charts ─── */
function GeoCharts({ cityBreakdown, topCities }: {
  cityBreakdown: ReturnType<typeof computeCityBreakdown>;
  topCities: ReturnType<typeof computeTopCities>;
}) {
  if (cityBreakdown.length === 0) {
    return <EmptyChart label="No geographic data for current filters" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-4 text-sm font-bold text-white">Events by City</h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={cityBreakdown} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="city" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="events" fill="#7cc4c1" radius={[0, 6, 6, 0]} name="Total Events" />
            <Bar dataKey="criticalEvents" fill="#e2657a" radius={[0, 6, 6, 0]} name="Critical" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-bold text-white">Top Risk Hotspots</h3>
        <div className="flex flex-col gap-2">
          {topCities.slice(0, 10).map((city, i) => {
            const maxCount = topCities[0]?.count ?? 1;
            const pct = (city.count / maxCount) * 100;
            return (
              <motion.div
                key={city.city}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="w-5 text-xs font-bold text-slate-500">{i + 1}</span>
                <MapPin className="h-4 w-4 shrink-0 text-cyan-400" />
                <span className="w-24 shrink-0 text-xs font-semibold text-slate-300">{city.city}</span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-cyan-500/40 to-cyan-500/60 px-2"
                  >
                    <span className="text-[10px] font-bold text-white">{city.count}</span>
                  </motion.div>
                  {city.criticalCount > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-400">
                      {city.criticalCount} crit
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Risk Radial ─── */
function RiskRadialChart({ riskDist }: { riskDist: ReturnType<typeof computeRiskDistribution> }) {
  const total = riskDist.reduce((s, r) => s + r.count, 0);
  const highRiskCount = riskDist.filter((r) => r.range === '0.9–1.0')[0]?.count ?? 0;
  const highRiskPct = total > 0 ? Math.round((highRiskCount / total) * 100) : 0;

  const radialData = [{ name: 'Critical', value: highRiskPct, fill: '#e2657a' }];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="mb-2 text-sm font-bold text-white">Critical Risk Share</h3>
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart innerRadius="65%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
          <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="-mt-32 flex flex-col items-center">
        <span className="text-3xl font-bold text-red-400">{highRiskPct}%</span>
        <span className="text-xs text-slate-400">of all events</span>
      </div>
      <div className="mt-20 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Critical (0.9–1.0)
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-600" /> Other
        </span>
      </div>
    </div>
  );
}

/* ─── Category Amount ─── */
function CategoryAmountCard({ breakdown }: { breakdown: ReturnType<typeof computeCategoryBreakdown> }) {
  const sorted = [...breakdown].sort((a, b) => b.totalAmount - a.totalAmount);
  const maxAmount = sorted[0]?.totalAmount ?? 1;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
        <TrendingUp className="h-4 w-4 text-orange-400" />
        Amount at Risk by Category
      </h3>
      <div className="flex flex-col gap-3">
        {sorted.map((item) => (
          <div key={item.category} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.category}
              </span>
              <span className="font-semibold text-slate-200">{formatCurrency(item.totalAmount)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.totalAmount / maxAmount) * 100}%` }}
                transition={{ duration: 0.6 }}
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── City Leaderboard ─── */
function CityLeaderboard({ cityBreakdown }: { cityBreakdown: ReturnType<typeof computeCityBreakdown> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
        <MapPin className="h-4 w-4 text-cyan-400" />
        City Leaderboard
      </h3>
      <div className="flex flex-col gap-2">
        {cityBreakdown.slice(0, 8).map((city, i) => (
          <div key={city.city} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                i < 3 ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-slate-400'
              }`}>{i + 1}</span>
              <span className="text-xs font-semibold text-slate-300">{city.city}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400">{city.events} events</span>
              {city.criticalEvents > 0 && (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  {city.criticalEvents} critical
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
      <BarChart3 className="h-8 w-8 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
