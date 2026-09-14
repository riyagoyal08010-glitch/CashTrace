import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Brain, Radar, Zap, ArrowRight, ArrowDown,
  Database, Search, MapPin, AlertTriangle, Snowflake, Phone,
  ShieldCheck, CheckCircle2, Clock, Cpu, Network, Workflow,
} from 'lucide-react';
import type { ViewKey } from './Navbar';

interface WorkflowPageProps {
  onNavigate: (view: ViewKey) => void;
}

interface PipelineStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  details: string[];
  duration: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 1,
    title: 'Complaint Ingestion',
    subtitle: 'Data Collection & NLP Parsing',
    icon: <Database className="h-6 w-6" />,
    color: '#7cc4c1',
    duration: '< 30 sec',
    details: [
      'Complaint registered via I4C portal or citizen helpline',
      'NLP engine extracts: location, amount, modus operandi, entity names',
      'Structured event object created with geospatial coordinates',
      'Duplicate detection across existing complaint database',
    ],
  },
  {
    id: 2,
    title: 'ML Prediction Engine',
    subtitle: 'Pattern Analysis & Risk Scoring',
    icon: <Brain className="h-6 w-6" />,
    color: '#ad97c9',
    duration: '< 60 sec',
    details: [
      'Historical pattern matching against 10L+ resolved cases',
      'Spatial clustering identifies likely next withdrawal zones',
      'Temporal forecasting predicts active window (next 2–6 hours)',
      'Multi-factor risk score computed (0.00–1.00) across 12 parameters',
    ],
  },
  {
    id: 3,
    title: 'Intelligence Dashboard',
    subtitle: 'Visualization & Alert Generation',
    icon: <Radar className="h-6 w-6" />,
    color: '#ed9b78',
    duration: 'Real-time',
    details: [
      'Risk heatmap renders predicted hotspots on India map',
      'Live threat feed streams flagged events to operators',
      'Link analysis graph maps entity relationships (accounts, IPs, devices)',
      'Automated alerts dispatched for risk score ≥ 0.85',
    ],
  },
  {
    id: 4,
    title: 'Action & Intervention',
    subtitle: 'Automated Response Playbook',
    icon: <Zap className="h-6 w-6" />,
    color: '#e2657a',
    duration: '< 5 min',
    details: [
      'Fund freeze request sent to bank APIs (NPCI / RBI bridge)',
      'FIR draft auto-generated with case details and jurisdiction',
      'Direct dispatch alert to nearest cyber crime police station',
      'Quick Response Team (QRT) notified for critical-risk events',
    ],
  },
];

export function WorkflowPage({ onNavigate }: WorkflowPageProps) {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const currentStep = PIPELINE_STEPS.find((s) => s.id === activeStep)!;

  const handleStepClick = (id: number) => {
    setActiveStep(id);
    if (!completedSteps.includes(id)) {
      setCompletedSteps((prev) => [...prev, id].sort((a, b) => a - b));
    }
  };

  const handleRunPipeline = () => {
    setCompletedSteps([]);
    let step = 1;
    const interval = setInterval(() => {
      setCompletedSteps((prev) => [...prev, step].sort((a, b) => a - b));
      setActiveStep(step);
      step++;
      if (step > PIPELINE_STEPS.length) {
        clearInterval(interval);
      }
    }, 1200);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#090D16] pt-16">
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5">
            <Workflow className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">End-to-End Pipeline</span>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">From Complaint to Intervention</h1>
          <p className="mt-3 max-w-2xl mx-auto text-slate-400">
            Four stages transform a raw citizen complaint into an actionable police response —
            in under five minutes. Click each stage to explore, or run the full pipeline simulation.
          </p>
        </motion.div>

        {/* Run button */}
        <div className="mb-8 flex justify-center">
          <button
            onClick={handleRunPipeline}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-400/40 hover:brightness-110 active:scale-95"
          >
            <Cpu className="h-4 w-4 transition-transform group-hover:rotate-12" />
            Run Full Pipeline Simulation
          </button>
        </div>

        {/* Pipeline steps - horizontal on desktop */}
        <div className="mb-8 hidden md:block">
          <div className="flex items-center justify-between gap-2">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.id} className="flex flex-1 items-center gap-2">
                <button
                  onClick={() => handleStepClick(step.id)}
                  className="group relative flex flex-col items-center gap-2"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all ${
                      activeStep === step.id
                        ? 'scale-110 shadow-lg'
                        : completedSteps.includes(step.id)
                        ? 'opacity-80'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{
                      borderColor: step.color,
                      backgroundColor: `${step.color}15`,
                      color: step.color,
                      boxShadow: activeStep === step.id ? `0 0 20px ${step.color}40` : 'none',
                    }}
                  >
                    {step.icon}
                    {completedSteps.includes(step.id) && (
                      <CheckCircle2
                        className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-[#090D16] text-emerald-400"
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold transition-colors ${
                      activeStep === step.id ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[10px] text-slate-600">{step.duration}</span>
                </button>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="relative flex-1">
                    <div className="h-0.5 w-full rounded-full bg-white/10" />
                    <motion.div
                      className="absolute left-0 top-0 h-0.5 rounded-full"
                      style={{ backgroundColor: step.color }}
                      initial={{ width: 0 }}
                      animate={{ width: completedSteps.includes(step.id) ? '100%' : '0%' }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline steps - vertical on mobile */}
        <div className="mb-8 md:hidden">
          <div className="flex flex-col gap-3">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.id}>
                <button
                  onClick={() => handleStepClick(step.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                    activeStep === step.id ? 'scale-[0.98]' : 'opacity-70'
                  }`}
                  style={{
                    borderColor: step.color,
                    backgroundColor: `${step.color}10`,
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${step.color}20`, color: step.color }}
                  >
                    {step.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-white">{step.title}</span>
                    <span className="text-[10px] text-slate-400">{step.duration}</span>
                  </div>
                  {completedSteps.includes(step.id) && (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />
                  )}
                </button>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="ml-7 h-4 w-0.5 bg-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: step info */}
              <div className="lg:col-span-1">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${currentStep.color}15`, color: currentStep.color }}
                >
                  {currentStep.icon}
                </div>
                <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{currentStep.subtitle}</p>
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-slate-400">Processing time:</span>
                  <span className="text-xs font-bold" style={{ color: currentStep.color }}>
                    {currentStep.duration}
                  </span>
                </div>
              </div>

              {/* Right: details */}
              <div className="lg:col-span-2">
                <h3 className="mb-4 text-sm font-bold text-white">What happens in this stage</h3>
                <div className="flex flex-col gap-3">
                  {currentStep.details.map((detail, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08 }}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                        style={{ backgroundColor: `${currentStep.color}15`, color: currentStep.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-300">{detail}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tech stack badges */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
            <Network className="h-4 w-4 text-cyan-400" />
            Technology Stack
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'React + TypeScript', icon: <Cpu className="h-3.5 w-3.5" /> },
              { label: 'MapLibre GL', icon: <MapPin className="h-3.5 w-3.5" /> },
              { label: 'Recharts', icon: <Radar className="h-3.5 w-3.5" /> },
              { label: 'Framer Motion', icon: <Zap className="h-3.5 w-3.5" /> },
              { label: 'Tailwind CSS', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
              { label: 'Supabase', icon: <Database className="h-3.5 w-3.5" /> },
              { label: 'Python ML Pipeline', icon: <Brain className="h-3.5 w-3.5" /> },
              { label: 'NPCI / RBI Bank API Bridge', icon: <Snowflake className="h-3.5 w-3.5" /> },
              { label: 'Cyber Cell Dispatch Gateway', icon: <Phone className="h-3.5 w-3.5" /> },
            ].map((tech) => (
              <span
                key={tech.label}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300"
              >
                <span className="text-cyan-400">{tech.icon}</span>
                {tech.label}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-slate-400">Ready to see the pipeline in action?</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-bold text-[#090D16] shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-95"
          >
            Launch Live Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
