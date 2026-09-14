import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import type { ViewKey } from '@/components/Navbar';
import { LandingPage } from '@/components/LandingPage';
import { Dashboard } from '@/components/Dashboard';
import { AnalyticsPage } from '@/components/AnalyticsPage';
import { WorkflowPage } from '@/components/WorkflowPage';
import { JudgeMode } from '@/components/JudgeMode';

export default function App() {
  const [view, setView] = useState<ViewKey>('landing');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100">
      <Navbar activeView={view} onNavigate={setView} />

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {view === 'landing' && <LandingPage onNavigate={setView} />}
          {view === 'dashboard' && <Dashboard />}
          {view === 'analytics' && <AnalyticsPage />}
          {view === 'workflow' && <WorkflowPage onNavigate={setView} />}
          {view === 'judge' && <JudgeMode onNavigate={setView} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
