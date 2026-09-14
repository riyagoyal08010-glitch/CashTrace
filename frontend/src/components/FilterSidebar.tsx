import { motion } from 'framer-motion';
import { Filter, MapPin, Gauge, Tag, X, ChevronDown } from 'lucide-react';
import type { CrimeCategory, Filters } from '@/lib/types';
import { CATEGORIES, CATEGORY_COLORS } from '@/lib/mockData';

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  cities: string[];
  resultCount: number;
  onReset: () => void;
}

export function FilterSidebar({ filters, onChange, cities, resultCount, onReset }: FilterSidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-5 border-r border-slate-800 bg-slate-950/60 p-5">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Filters</h2>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1 rounded text-xs text-slate-500 transition hover:text-slate-300"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-center"
      >
        <motion.span
          key={resultCount}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-bold text-white"
        >{resultCount}</motion.span>
        <span className="ml-1 text-xs text-slate-400">matching events</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
      <FilterSection icon={<MapPin className="h-4 w-4 text-cyan-400" />} title="City">
        <div className="relative">
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-9 text-sm text-slate-200 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      </FilterSection>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
      <FilterSection icon={<Gauge className="h-4 w-4 text-amber-400" />} title="Minimum Risk Score">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={filters.minRiskScore}
            onChange={(e) => onChange({ ...filters, minRiskScore: parseFloat(e.target.value) })}
            className="flex-1 accent-red-500"
          />
          <span className="min-w-[3rem] rounded bg-slate-800 px-2 py-1 text-center text-sm font-bold text-white">
            {filters.minRiskScore.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-500">
          <span>0.00</span>
          <span>0.85 (high risk)</span>
          <span>1.00</span>
        </div>
      </FilterSection>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
      <FilterSection icon={<Tag className="h-4 w-4 text-violet-400" />} title="Crime Category">
        <div className="flex flex-col gap-1">
          <CategoryButton
            label="All Categories"
            active={filters.category === 'all'}
            onClick={() => onChange({ ...filters, category: 'all' })}
          />
          {CATEGORIES.map((cat) => (
            <CategoryButton
              key={cat}
              label={cat}
              color={CATEGORY_COLORS[cat]}
              active={filters.category === cat}
              onClick={() => onChange({ ...filters, category: cat })}
            />
          ))}
        </div>
      </FilterSection>
      </motion.div>
    </aside>
  );
}

function FilterSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
      </div>
      {children}
    </div>
  );
}

function CategoryButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
        active
          ? 'border-cyan-500 bg-cyan-500/10 text-white'
          : 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      {color ? (
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <span className="h-3 w-3 rounded-full border border-slate-600" />
      )}
      {label}
    </button>
  );
}
