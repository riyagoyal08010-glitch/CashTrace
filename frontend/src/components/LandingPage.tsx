import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Zap, ArrowRight, Activity, MapPin, Brain, TrendingDown,
  Lock, Cpu, Radar, AlertTriangle, Phone, FileText, Snowflake, Share2,
} from 'lucide-react';
import type { ViewKey } from './Navbar';

interface LandingPageProps {
  onNavigate: (view: ViewKey) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="relative min-h-screen bg-[#090D16] pt-16">
      <ParticleBackground />
      <HeroSection onNavigate={onNavigate} />
      <StatsStrip />
      <ProblemSolutionSection onNavigate={onNavigate} />
      <FeatureGrid />
      <ArchitectureSection />
      <ImpactSection />
      <FooterSection />
    </div>
  );
}

/* ─── Particle Background ─── */
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 14000), 120);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (distToMouse < 120) {
          const force = (120 - distToMouse) / 120;
          p.x += (p.x - mouse.x) / distToMouse * force * 2;
          p.y += (p.y - mouse.y) / distToMouse * force * 2;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124, 196, 193, 0.4)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(124, 196, 193, ${(1 - dist / 130) * 0.15})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouse = { x: -1000, y: -1000 };
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

/* ─── Hero Section ─── */
function HeroSection({ onNavigate }: { onNavigate: (view: ViewKey) => void }) {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex max-w-4xl flex-col items-center gap-6"
      >
        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Predictive Intelligence for
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Proactive Cybercrime Intervention
          </span>
        </h1>

        <p className="max-w-2xl text-base text-slate-400 sm:text-lg">
          A predictive analytics framework that forecasts likely cash withdrawal locations
          from cybercrime complaint patterns — generating actionable intelligence for
          timely, proactive intervention before fraudsters strike.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => onNavigate('dashboard')}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-bold text-[#090D16] shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-400/40 hover:brightness-110 active:scale-95"
          >
            Explore Live Demo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => onNavigate('workflow')}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-200 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 active:scale-95"
          >
            <Cpu className="h-4 w-4" />
            View Architecture
          </button>
        </div>

        {/* Hero visual widget */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-8 w-full max-w-3xl"
        >
          <HeroVisualWidget />
        </motion.div>
      </motion.div>
    </section>
  );
}

function HeroVisualWidget() {
  const items = [
    { icon: <MapPin />, label: 'Mumbai', risk: 0.92, color: '#e2657a', delay: 0 },
    { icon: <AlertTriangle />, label: 'Delhi', risk: 0.87, color: '#ed9b78', delay: 0.1 },
    { icon: <Activity />, label: 'Bangalore', risk: 0.78, color: '#ed9b78', delay: 0.2 },
    { icon: <Radar />, label: 'Hyderabad', risk: 0.71, color: '#edbe7d', delay: 0.3 },
    { icon: <TrendingDown />, label: 'Chennai', risk: 0.65, color: '#edbe7d', delay: 0.4 },
    { icon: <Shield />, label: 'Kolkata', risk: 0.58, color: '#a3d9b0', delay: 0.5 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 + item.delay }}
          className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${item.color}20`, color: item.color }}
          >
            {item.icon}
          </div>
          <span className="text-xs font-semibold text-slate-300">{item.label}</span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.risk * 100}%` }}
              transition={{ duration: 0.8, delay: 0.7 + item.delay }}
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
            />
          </div>
          <span className="text-[10px] font-bold" style={{ color: item.color }}>
            {item.risk.toFixed(2)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Stats Strip ─── */
function StatsStrip() {
  const stats = [
    { value: '28', suffix: '+', label: 'Cities Monitored' },
    { value: '6', label: 'Crime Categories' },
    { value: '<5', suffix: 'min', label: 'Detection to Alert' },
    { value: '94', suffix: '%', label: 'Prediction Accuracy' },
  ];

  return (
    <section className="relative z-10 border-y border-white/5 bg-white/[0.02] py-8">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex flex-col items-center text-center"
          >
            <span className="text-3xl font-bold text-white sm:text-4xl">
              {stat.value}
              {stat.suffix && <span className="text-cyan-400">{stat.suffix}</span>}
            </span>
            <span className="mt-1 text-xs text-slate-400">{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── Problem / Solution ─── */
function ProblemSolutionSection({ onNavigate }: { onNavigate: (view: ViewKey) => void }) {
  return (
    <section className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl">The Problem</h2>
          <p className="mt-3 max-w-2xl mx-auto text-slate-400">
            Cybercriminals move faster than traditional reporting. By the time a complaint
            is filed, funds are already withdrawn. We flip the paradigm — predict where
            the money will move next.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Reactive Today</h3>
            </div>
            <ul className="flex flex-col gap-3 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                Complaints filed after funds are already withdrawn
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                No spatial prediction of next likely ATM/bank target
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                Delayed coordination between banks and police
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                Manual FIR drafting and dispatch workflows
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Brain className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Predictive Tomorrow</h3>
            </div>
            <ul className="flex flex-col gap-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                ML-based forecasting of withdrawal locations from patterns
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                Real-time risk heatmap across 28+ Indian cities
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                Automated bank fund-freeze + police dispatch alerts
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                One-click FIR drafting and link-analysis graph
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            See It In Action
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Feature Grid ─── */
function FeatureGrid() {
  const features = [
    {
      icon: <Radar className="h-5 w-5" />,
      title: 'Predictive Risk Heatmap',
      desc: 'Interactive map with clustering and heatmap layers showing real-time risk concentration across India.',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: 'Live Threat Feed',
      desc: 'Streaming event feed with risk scoring, auto-scroll, pause/resume, and category-color-coded alerts.',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      icon: <Share2 className="h-5 w-5" />,
      title: 'Link Analysis Graph',
      desc: 'Entity-relationship visualization connecting flagged events to suspect accounts, IPs, and shared devices.',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      title: 'Location Intelligence',
      desc: 'Hover-to-preview mini-maps showing bank-ATM and nearest police station with distance and dispatch tools.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      icon: <Snowflake className="h-5 w-5" />,
      title: 'Automated Playbook',
      desc: 'One-click response: freeze funds, generate FIR draft, and notify Quick Response Teams — step by step.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Instant FIR Drafting',
      desc: 'Pre-filled First Information Report with event data, jurisdiction, and one-click filing to local cyber cell.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
  ];

  return (
    <section className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Platform Capabilities</h2>
          <p className="mt-3 text-slate-400">Six interconnected modules forming a complete intervention pipeline</p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className={`group rounded-2xl border ${feature.border} bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]`}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} ${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="mb-2 text-base font-bold text-white">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Architecture Section ─── */
function ArchitectureSection() {
  const layers = [
    { label: 'Data Ingestion', desc: 'Complaint intake · NLP parsing · Entity extraction', icon: <Activity className="h-4 w-4" />, color: '#7cc4c1' },
    { label: 'ML Prediction Engine', desc: 'Pattern matching · Spatial forecasting · Risk scoring', icon: <Brain className="h-4 w-4" />, color: '#ad97c9' },
    { label: 'Intelligence Dashboard', desc: 'Real-time map · Threat feed · Link analysis', icon: <Radar className="h-4 w-4" />, color: '#ed9b78' },
    { label: 'Action Layer', desc: 'Fund freeze · FIR draft · Police dispatch · QRT notify', icon: <Zap className="h-4 w-4" />, color: '#e2657a' },
  ];

  return (
    <section className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold text-white sm:text-4xl">System Architecture</h2>
          <p className="mt-3 text-slate-400">Four-layer pipeline from complaint to intervention</p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${layer.color}15`, color: layer.color }}
              >
                {layer.icon}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-white">{layer.label}</span>
                <span className="text-xs text-slate-400">{layer.desc}</span>
              </div>
              <span
                className="hidden h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:flex"
                style={{ backgroundColor: `${layer.color}15`, color: layer.color }}
              >
                {i + 1}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Impact Section ─── */
function ImpactSection() {
  return (
    <section className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 p-8 sm:p-12"
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500">
              <Lock className="h-7 w-7 text-[#090D16]" />
            </div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Stopping fraud before the cash leaves the ATM
            </h2>
            <p className="max-w-2xl text-slate-300">
              By shifting from reactive investigation to predictive intervention, CyberGuard AI
              empowers law enforcement to pre-position resources at likely withdrawal locations —
              turning intelligence into prevention.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3">
                <Phone className="mx-auto mb-1 h-5 w-5 text-cyan-400" />
                <span className="text-xs text-slate-400">Direct dispatch to nearest cyber cell</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3">
                <Snowflake className="mx-auto mb-1 h-5 w-5 text-blue-400" />
                <span className="text-xs text-slate-400">Instant fund freeze playbook</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3">
                <FileText className="mx-auto mb-1 h-5 w-5 text-amber-400" />
                <span className="text-xs text-slate-400">Auto-drafted FIR ready to file</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function FooterSection() {
  return (
    <footer className="relative z-10 border-t border-white/5 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-300">CyberGuard AI</span>
          <span className="text-xs text-slate-600">· I4C Predictive Intelligence Framework</span>
        </div>
        <span className="text-xs text-slate-600">SIH 2025 · Smart India Hackathon</span>
      </div>
    </footer>
  );
}
