import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FlaskConical, AlertTriangle, CheckCircle2,
  Copy, Database, Search, Loader2, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, Tooltip, Cell
} from 'recharts';
import { motion } from 'framer-motion';

// --- Configuration ---
const API_URL = import.meta.env.BASE_URL;

// --- Types ---
interface BackendColumnData {
  name: string;
  type: string;
  missing: number;
  missing_pct: number;
  unique: number;
  mean?: number;
  median?: number;
  std_dev?: number;
  min?: number;
  max?: number;
  top_value?: string;
  freq?: number;
  distribution: { label: string; value: number }[];
}

interface DatasetStats {
  filename: string;
  total_rows: number;
  total_cols: number;
  memory_usage: number;
  duplicate_rows: number;
  columns: BackendColumnData[];
}

// --- Helper Components ---
function LazyRender({ children, height = 300 }: { children: React.ReactNode; height?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight: height }} className="transition-all duration-700 ease-in-out">
      {isVisible ? children : <div className="animate-pulse bg-white/5 rounded-xl w-full h-full border border-white/5" />}
    </div>
  );
}

const StatBadge = ({ label, value, color = "text-slate-200" }: any) => (
  <div className="flex flex-col border-l border-white/5 pl-3">
    <span className="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-semibold">{label}</span>
    <span className={`font-mono text-sm font-medium truncate ${color}`}>{value !== undefined ? value : '-'}</span>
  </div>
);

// THEME UPGRADE: Glassmorphism Card with Glow
const KPICard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
  <div className="bg-[#0F1116]/80 backdrop-blur-md border border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300 ring-1 ring-white/5">
    {/* Ambient Glow on Hover */}
    <div className={`absolute -right-10 -top-10 w-32 h-32 bg-current opacity-0 group-hover:opacity-10 blur-[60px] transition-opacity duration-500 pointer-events-none ${colorClass}`} />
    
    <div className={`absolute top-0 right-0 p-4 opacity-10 ${colorClass} group-hover:opacity-20 transition-opacity duration-300`}>
      <Icon className="w-16 h-16 transform translate-x-4 -translate-y-4" />
    </div>
    
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</h3>
        <div className={`p-1.5 rounded-lg bg-opacity-10 ${colorClass} bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/5`}>
          <Icon className={`w-4 h-4 ${colorClass.replace('text-', '')}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 font-mono">{subtext}</div>
    </div>
  </div>
);

const ColumnCard = ({ data }: { data: BackendColumnData }) => {
  const isHighMissing = data.missing_pct > 50;
  const isNumeric = data.type === 'numeric';

  const originalData = data.distribution.map(d => ({ name: d.label, value: d.value }));
  const isTruncated = !isNumeric && data.unique > 20;

  const MIN_SLOTS = 8;
  const chartData = useMemo(() => {
    if (originalData.length >= MIN_SLOTS) return originalData;
    const padded = [...originalData];
    while (padded.length < MIN_SLOTS) {
      padded.push({ name: `__ghost_${padded.length}`, value: 0, isGhost: true } as any);
    }
    return padded;
  }, [originalData]);

  const getBarColor = (index: number) => {
    if (isHighMissing) return "#F59E0B";
    return index % 2 === 0 ? "#10B981" : "#34D399";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (payload[0].payload.isGhost) return null;
      return (
        <div className="bg-[#050608]/90 backdrop-blur border border-white/10 p-2.5 rounded-lg shadow-2xl text-xs ring-1 ring-white/10">
          <p className="text-slate-400 mb-1">{label}</p>
          <p className="text-emerald-400 font-mono font-bold">
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      // THEME UPGRADE: Darker glass card with ring
      className={`
        bg-[#0F1116]/60 backdrop-blur-xl border rounded-2xl p-6 mb-4 relative overflow-hidden transition-all duration-300 group
        ${isHighMissing 
          ? 'border-amber-500/20 shadow-[inset_0_0_40px_rgba(245,158,11,0.05)] ring-1 ring-amber-500/10' 
          : 'border-white/5 hover:border-white/10 ring-1 ring-white/5 hover:ring-white/10'}
      `}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4 mb-1">
          <div className={`p-2 rounded-lg border border-white/5 ${isNumeric ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
             <BarChart3 className={`w-4 h-4 ${isNumeric ? 'text-blue-400' : 'text-orange-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white max-w-[200px] truncate leading-none" title={data.name}>{data.name}</h3>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${isNumeric ? 'text-blue-400/80' : 'text-orange-400/80'}`}>
                {data.type}
            </span>
          </div>
          
          {data.missing_pct > 0 && (
            <span className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1.5 ml-2 ${data.missing_pct > 20 ? 'border-amber-500/20 text-amber-400 bg-amber-500/5' : 'border-slate-700/50 text-slate-400 bg-slate-800/20'}`}>
              <AlertTriangle className="w-3 h-3" />
              {data.missing_pct}% Missing
            </span>
          )}
        </div>
      </div>

      {/* THEME UPGRADE: Darker inner container for stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-2 mb-6 p-5 bg-[#050608]/50 rounded-xl border border-white/5 shadow-inner">
        {isNumeric ? (
          <>
            <StatBadge label="Mean" value={data.mean} />
            <StatBadge label="Median" value={data.median} />
            <StatBadge label="Std Dev" value={data.std_dev} />
            <StatBadge label="Min" value={data.min} />
            <StatBadge label="Max" value={data.max} />
          </>
        ) : (
          <>
            <StatBadge label="Unique" value={data.unique} />
            <StatBadge label="Top Value" value={data.top_value} color="text-emerald-400" />
            <StatBadge label="Freq" value={data.freq} />
            <StatBadge label="Missing" value={data.missing} color={isHighMissing ? "text-amber-500" : "text-slate-400"} />
            <StatBadge label="Valid %" value={`${(100 - data.missing_pct).toFixed(1)}%`} />
          </>
        )}
      </div>

      <div className="h-32 w-full relative">
        <div className="flex justify-between items-end mb-2">
          <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">Distribution</p>
          {isTruncated && (
            <p className="text-[10px] text-slate-500 italic">Top 20 of {data.unique}</p>
          )}
        </div>

        <div className="w-full h-full opacity-80 hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={60} animationDuration={1000}>
                {chartData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isGhost ? 'transparent' : getBarColor(index)}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

// --- MAIN PAGE ---

export default function AuditPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'All' | 'Numeric' | 'Categorical' | 'Missing'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) return;
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/analyze/${sessionId}`);
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load dataset analysis.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // --- Filter Logic ---
  const filteredColumns = useMemo(() => {
    if (!stats) return [];
    return stats.columns.filter(col => {
      const matchesSearch = col.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        filter === 'All' ? true :
          filter === 'Numeric' ? col.type === 'numeric' :
            filter === 'Categorical' ? col.type === 'categorical' :
              filter === 'Missing' ? col.missing_pct > 0 : true;
      return matchesSearch && matchesType;
    });
  }, [filter, searchTerm, stats]);

  // --- Helpers for Display ---
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center relative overflow-hidden">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
       <div className="relative z-10 flex flex-col items-center">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
            <p className="font-mono text-sm text-emerald-500/80 animate-pulse tracking-widest uppercase">Running Analysis Protocols...</p>
       </div>
    </div>
  );

  if (error || !stats) return (
    <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center text-red-400">
      <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
      <p className="font-medium tracking-tight text-lg">{error || "Session not found"}</p>
      <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">Return Home</button>
    </div>
  );

  return (
    // THEME UPGRADE: Deep black bg with grid pattern
    <div className="min-h-screen bg-[#050608] text-slate-300 font-sans p-8 relative selection:bg-emerald-500/30">
      
      {/* Background FX */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* HEADER: Sticky glass effect */}
        <header className="flex items-center justify-between mb-8 sticky top-4 bg-[#050608]/80 backdrop-blur-xl z-40 py-4 px-6 rounded-2xl border border-white/5 shadow-2xl ring-1 ring-white/5">
            <div className="flex items-center gap-5">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white border border-transparent hover:border-white/5">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
                The Raw Matter
                <span className="text-[10px] font-mono font-normal text-emerald-500/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded max-w-[200px] truncate uppercase tracking-widest">{stats.filename}</span>
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Analysis Complete</span>
                </div>
            </div>
            </div>

            <div className="flex items-center gap-3">
            <button
                onClick={() => navigate(`/recipe/${sessionId}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all uppercase tracking-wide">
                <FlaskConical className="w-4 h-4 fill-black/20" /> Start Recipe
            </button>
            </div>
        </header>

        {/* KPI STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
            <KPICard title="Total Rows" value={stats.total_rows.toLocaleString()} subtext={`${stats.total_cols} columns`} icon={Database} colorClass="text-emerald-400" />
            <KPICard title="Memory Usage" value={formatBytes(stats.memory_usage)} subtext="Uncompressed" icon={Database} colorClass="text-purple-400" />
            <KPICard title="Duplicates" value={stats.duplicate_rows} subtext={stats.duplicate_rows === 0 ? "Dataset is clean" : "Rows repeated"} icon={Copy} colorClass="text-blue-400" />
            <KPICard title="Missing Cells" value={stats.columns.reduce((acc, col) => acc + col.missing, 0).toLocaleString()} subtext="Across all columns" icon={AlertTriangle} colorClass="text-amber-400" />
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-1 bg-[#0F1116]/80 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
            {['All', 'Numeric', 'Categorical', 'Missing'].map((f) => (
                <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wide ${filter === f ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'}`}
                >
                {f}
                </button>
            ))}
            </div>
            <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input
                type="text" placeholder="Search columns..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0F1116]/80 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 w-64 transition-all placeholder:text-slate-600"
            />
            </div>
        </div>

        {/* COLUMNS */}
        <div className="space-y-4">
            {filteredColumns.map((col, idx) => (
            <LazyRender key={idx} height={350}>
                <ColumnCard data={col} />
            </LazyRender>
            ))}
        </div>
      </div>
    </div>
  );
}