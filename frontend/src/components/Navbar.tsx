import { Shield, Activity, Menu, X } from 'lucide-react';
import { useState } from 'react';

export type ViewKey = 'landing' | 'dashboard' | 'analytics' | 'workflow' | 'judge';

interface NavbarProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}

const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: 'landing', label: 'Home' },
  { key: 'dashboard', label: 'Live Dashboard' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'workflow', label: 'Workflow' },
  { key: 'judge', label: 'About Us' },
];

export function Navbar({ activeView, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (view: ViewKey) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#090D16]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button onClick={() => handleNav('landing')} className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg shadow-red-900/40">
            <Shield className="h-5 w-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#090D16] bg-emerald-400" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">CyberGuard AI</span>
            <span className="text-[10px] text-slate-400">I4C Predictive Intelligence</span>
          </div>
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeView === item.key
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
              {activeView === item.key && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold text-emerald-300">System Active</span>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-[#090D16]/95 px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeView === item.key
                    ? 'bg-white/5 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            <div className="mt-2 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 self-start">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-emerald-300">System Active</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
