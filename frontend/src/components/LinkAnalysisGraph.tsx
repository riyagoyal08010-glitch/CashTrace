import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Globe,
  KeyRound,
  Lock,
  Network,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { ThreatEvent } from '@/lib/types';

interface LinkAnalysisGraphProps {
  event: ThreatEvent | null;
  open: boolean;
  onClose: () => void;
}

type NodeType = 'event' | 'person' | 'ip' | 'account';
type NodeStatus = 'flagged' | 'suspect' | 'clean';

type GraphNode = {
  id: string;
  label: string;
  sublabel: string;
  explanation: string;
  type: NodeType;
  status: NodeStatus;
  x: number;
  y: number;
};

type GraphEdge = {
  from: string;
  to: string;
  label: string;
  description: string;
  flow?: boolean;
};

const SVG_WIDTH = 620;
const SVG_HEIGHT = 440;
const NODE_RADIUS = 31;

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function buildGraph(event: ThreatEvent): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const seed = event.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const random = seededRandom(seed);
  const accountNames = ['A/c ****4471', 'A/c ****8829', 'A/c ****1503', 'A/c ****9967'];
  const ipAddresses = ['182.71.33.45', '49.36.82.107', '103.21.244.18'];
  const accountStatuses: NodeStatus[] = ['suspect', 'clean', 'clean', 'suspect'];
  const nodes: GraphNode[] = [
    {
      id: 'event',
      label: event.category,
      sublabel: 'Reported crime',
      explanation: `This complaint is the starting point. The ${event.category.toLowerCase()} report triggered the investigation.`,
      type: 'event',
      status: 'flagged',
      x: 310,
      y: 220,
    },
    {
      id: 'person-victim',
      label: 'Victim / complainant',
      sublabel: 'Reported the incident',
      explanation: 'The person who reported the suspicious activity or loss of money.',
      type: 'person',
      status: 'clean',
      x: 90,
      y: 220,
    },
    {
      id: 'person-suspect',
      label: 'Suspected operator',
      sublabel: 'Controls the fraud activity',
      explanation: 'A person or group connected to the suspicious accounts and internet activity.',
      type: 'person',
      status: 'suspect',
      x: 530,
      y: 120,
    },
  ];

  ipAddresses.forEach((address, index) => {
    nodes.push({
      id: `ip-${index}`,
      label: address,
      sublabel: index === 0 ? 'VPN / Tor exit' : 'Login source',
      explanation: index === 0
        ? 'This internet address was used to hide the operator’s real location.'
        : 'This internet address was recorded during a login or transaction.',
      type: 'ip',
      status: index === 0 ? 'suspect' : 'clean',
      x: 110 + index * 150,
      y: 55,
    });
  });

  accountNames.forEach((account, index) => {
    const status = accountStatuses[index];
    nodes.push({
      id: `account-${index}`,
      label: account,
      sublabel: index === 3 ? 'Money currently held here' : index === 0 ? 'Received funds' : 'Transfer trail',
      explanation: index === 3
        ? 'This is the latest known account holding the money in the transaction chain.'
        : index === 0
        ? 'This account received money from the reported transaction.'
        : 'This account appears in the money movement trail and helps investigators follow the funds.',
      type: 'account',
      status,
      x: 135 + index * 120,
      y: 375,
    });
  });

  const edges: GraphEdge[] = [
    { from: 'person-victim', to: 'event', label: 'reported', description: 'Victim reported the suspicious activity.' },
    { from: 'event', to: 'person-suspect', label: 'linked to', description: 'Investigation links the activity to this suspected operator.' },
    { from: 'person-suspect', to: 'ip-0', label: 'used IP', description: 'The suspected operator used this internet address.' },
    { from: 'ip-0', to: 'event', label: 'login source', description: 'The address was recorded during access to the fraud activity.' },
    { from: 'event', to: 'account-0', label: 'money sent', description: 'Money moved from the reported transaction into this account.', flow: true },
    { from: 'account-0', to: 'account-1', label: 'transferred to', description: 'The funds were moved onward to another account.', flow: true },
    { from: 'account-1', to: 'account-2', label: 'transferred to', description: 'The transaction trail continues through this account.', flow: true },
    { from: 'account-2', to: 'account-3', label: 'currently held', description: 'This account is the latest known location of the money.', flow: true },
    { from: 'person-suspect', to: 'ip-1', label: 'also used', description: 'Another internet address connected to the suspected operator.' },
    { from: 'person-suspect', to: 'account-3', label: 'controls', description: 'The suspected operator is connected to the account currently holding the money.' },
  ];

  random();
  return { nodes, edges };
}

const STATUS_COLORS: Record<NodeStatus, { fill: string; stroke: string; text: string }> = {
  flagged: { fill: 'rgba(226,101,122,0.18)', stroke: '#e2657a', text: '#f4a8b1' },
  suspect: { fill: 'rgba(237,155,120,0.16)', stroke: '#ed9b78', text: '#f5b896' },
  clean: { fill: 'rgba(132,199,148,0.13)', stroke: '#84c794', text: '#a3d9b0' },
};

const NODE_ICONS: Record<NodeType, typeof ShieldAlert> = {
  event: ShieldAlert,
  person: User,
  ip: Globe,
  account: Banknote,
};

export function LinkAnalysisGraph({ event, open, onClose }: LinkAnalysisGraphProps) {
  const [visible, setVisible] = useState(false);
  const [selectedId, setSelectedId] = useState('event');

  useEffect(() => {
    if (open) {
      setVisible(true);
      setSelectedId('event');
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const graph = useMemo(() => (event ? buildGraph(event) : { nodes: [], edges: [] }), [event]);
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);
  const selectedNode = nodeMap.get(selectedId) ?? graph.nodes[0];
  const selectedConnections = graph.edges.filter((edge) => edge.from === selectedId || edge.to === selectedId);

  if (!visible || !event || !selectedNode) return null;

  return (
    <>
      <div className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-[42rem] flex-col border-l border-slate-700 bg-slate-950 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400"><Network className="h-5 w-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-white">How the money moved</h3>
              <p className="text-[10px] text-slate-500">Click any circle to see what it means</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"><X className="h-4 w-4" /></button>
        </div>

        <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-slate-400">
            <LegendItem icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Reported crime" color="#ef4444" />
            <LegendItem icon={<User className="h-3.5 w-3.5" />} label="Person" color="#f97316" />
            <LegendItem icon={<Globe className="h-3.5 w-3.5" />} label="Internet address" color="#38bdf8" />
            <LegendItem icon={<Banknote className="h-3.5 w-3.5" />} label="Bank account" color="#22c55e" />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-300"><ArrowRight className="h-3 w-3" /> Solid arrows show the order money moved. Dashed arrows show a supporting connection.</p>
        </div>

        <div className="relative flex-1 overflow-auto bg-[#0b1324] p-3">
          <div className="mb-2 flex items-center justify-between px-2 text-[10px] uppercase tracking-wider text-slate-500">
            <span>Who / what is connected</span><span>{graph.edges.filter((edge) => edge.flow).length} money movements mapped</span>
          </div>
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="h-auto min-h-[24rem] w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#edbe7d" /></marker>
              <marker id="link-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#64748b" /></marker>
            </defs>
            {graph.edges.map((edge, index) => {
              const from = nodeMap.get(edge.from);
              const to = nodeMap.get(edge.to);
              if (!from || !to) return null;
              const active = edge.from === selectedId || edge.to === selectedId;
              const lineColor = edge.flow ? '#edbe7d' : '#64748b';
              return (
                <g key={`${edge.from}-${edge.to}-${index}`} opacity={active ? 1 : 0.62}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={lineColor} strokeWidth={active ? 2.5 : 1.5} strokeDasharray={edge.flow ? undefined : '6 5'} markerEnd={`url(#${edge.flow ? 'flow-arrow' : 'link-arrow'})`} />
                  <rect x={(from.x + to.x) / 2 - 38} y={(from.y + to.y) / 2 - 11} width="76" height="16" rx="5" fill="#0b1324" opacity="0.95" />
                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2} fill={edge.flow ? '#f3cd6a' : '#94a3b8'} fontSize="9" textAnchor="middle" className="select-none">{edge.label}</text>
                </g>
              );
            })}
            {graph.nodes.map((node) => {
              const colors = STATUS_COLORS[node.status];
              const Icon = NODE_ICONS[node.type];
              const isSelected = node.id === selectedId;
              const radius = node.type === 'event' ? 38 : NODE_RADIUS;
              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedId(node.id)} className="cursor-pointer">
                  {isSelected && <circle r={radius + 9} fill="none" stroke="#67e8f9" strokeWidth="2" strokeDasharray="4 4"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" /></circle>}
                  <circle r={radius + 5} fill={colors.stroke} opacity={node.status === 'clean' ? 0.04 : 0.1} />
                  <circle r={radius} fill={colors.fill} stroke={colors.stroke} strokeWidth={isSelected ? 3 : 2} />
                  <foreignObject x={-12} y={-18} width="24" height="24"><Icon size={22} color={colors.text} /></foreignObject>
                  <text y={radius + 15} fill={colors.text} fontSize="10" fontWeight="bold" textAnchor="middle" className="select-none">{node.label}</text>
                  <text y={radius + 29} fill="#64748b" fontSize="8" textAnchor="middle" className="select-none">{node.sublabel}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="border-t border-slate-800 bg-slate-900/70 px-5 py-4">
          <div className="mb-3 flex items-center gap-2"><KeyRound className="h-4 w-4 text-cyan-400" /><span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Selected connection</span></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2"><NodeBadge node={selectedNode} /><span className="text-sm font-bold text-white">{selectedNode.label}</span></div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{selectedNode.explanation}</p>
            {selectedConnections.length > 0 && <div className="mt-3 flex flex-col gap-1.5">{selectedConnections.map((edge, index) => <div key={`${edge.label}-${index}`} className="flex items-start gap-2 text-[10px] text-slate-400"><ArrowDown className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" /><span><b className="text-slate-200">{edge.label}</b> — {edge.description}</span></div>)}</div>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center"><SummaryStat label="Accounts" value={graph.nodes.filter((node) => node.type === 'account').length} /><SummaryStat label="Internet addresses" value={graph.nodes.filter((node) => node.type === 'ip').length} /><SummaryStat label="Money moves" value={graph.edges.filter((edge) => edge.flow).length} /></div>
        </div>
      </div>
    </>
  );
}

function NodeBadge({ node }: { node: GraphNode }) {
  const Icon = NODE_ICONS[node.type];
  const colors = STATUS_COLORS[node.status];
  return <span className="flex h-7 w-7 items-center justify-center rounded-full border" style={{ color: colors.text, borderColor: colors.stroke, backgroundColor: colors.fill }}><Icon className="h-3.5 w-3.5" /></span>;
}

function LegendItem({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return <div className="flex items-center gap-1.5"><span style={{ color }}>{icon}</span><span>{label}</span></div>;
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-white/5 bg-white/[0.03] px-2 py-2"><span className="block text-[9px] uppercase tracking-wider text-slate-500">{label}</span><span className="text-lg font-bold text-white">{value}</span></div>;
}
