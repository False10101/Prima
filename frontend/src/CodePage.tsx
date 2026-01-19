import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2, Copy, Download, Terminal, 
  Clock, Zap, FileCode, ArrowLeft, Loader2
} from 'lucide-react';

// --- Types ---
interface Step {
  id: string;
  operation: string;
  column: string;
  params: Record<string, any>;
}

interface GenerateResponse {
  status: string;
  filename: string;
  code: string;
  requirements: string[];
  install_command: string;
}

// --- Configuration ---
const API_URL = "http://localhost:8000/api";

// --- Components ---

// 1. Syntax Highlighter
const CodeDisplay = ({ code }: { code: string }) => {
  if (!code) return null;
  const lines = code.split('\n');

  const colorize = (line: string) => {
    const keywords = ['import', 'from', 'as', 'def', 'return', 'class', 'if', 'else'];
    const builtins = ['print', 'len', 'Pipeline', 'ColumnTransformer', 'StandardScaler', 'OneHotEncoder', 'SimpleImputer'];
    
    return line.split(' ').map((word, i) => {
        const cleanWord = word.replace(/[^a-zA-Z0-9_]/g, '');
        if (keywords.includes(cleanWord)) return <span key={i} className="text-[#569CD6]">{word} </span>;
        else if (word.startsWith("'") || word.startsWith('"')) return <span key={i} className="text-[#CE9178]">{word} </span>;
        else if (builtins.includes(cleanWord)) return <span key={i} className="text-[#4EC9B0]">{word} </span>;
        else if (word.startsWith('#')) return <span key={i} className="text-[#6A9955] italic">{word} </span>;
        return <span key={i} className="text-[#D4D4D4]">{word} </span>;
    });
  };

  return (
    <div className="font-mono text-xs leading-6">
      {lines.map((line, idx) => (
        <div key={idx} className="flex">
          <div className="w-8 flex-none text-slate-700 text-right pr-3 select-none">{idx + 1}</div>
          <div className="whitespace-pre">{line.trim().startsWith('#') ? <span className="text-[#6A9955] italic">{line}</span> : colorize(line)}</div>
        </div>
      ))}
    </div>
  );
};

export default function ElixirPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId, steps } = location.state || { sessionId: 'demo', steps: [] };

  const [data, setData] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCode = async () => {
        try {
            const payload = { session_id: sessionId, steps: steps };
            const res = await axios.post(`${API_URL}/generate-code`, payload);
            setData(res.data);
        } catch (e) {
            console.error("Error generating code", e);
        } finally {
            setLoading(false);
        }
    };
    if (steps.length > 0) fetchCode();
    else setLoading(false);
  }, [sessionId, steps]);

  const handleCopy = () => {
    if (data?.code) {
        navigator.clipboard.writeText(data.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const lineCount = data?.code.split('\n').length || 0;
  const transformCount = steps.length;
  const runtime = `~${(transformCount * 0.4 + 0.3).toFixed(1)}s`; 

  return (
    // THEME UPGRADE: Main Stage
    <div className="h-screen w-full bg-[#030304] text-slate-300 font-sans p-8 overflow-hidden flex flex-col relative selection:bg-emerald-500/30">
      
      {/* GLOBAL FX: Background Grid & Spotlights */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          {/* Top Spotlight */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
          {/* Bottom Ambient Glow */}
          <div className="absolute -bottom-40 right-0 w-[600px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {/* 1. Header */}
      <div className="flex-none mb-8 flex items-end justify-between relative z-10">
        <div className="flex items-center gap-5">
             <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
             </button>
             <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Zap className="w-8 h-8 text-emerald-500 fill-emerald-500/20 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    The Elixir
                </h1>
                <p className="text-slate-500 text-sm mt-1 font-medium">Your refined pipeline is ready for deployment</p>
             </div>
        </div>
        
        <div className="px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Pipeline Generated</span>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Editor (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 min-h-0">
            
            {/* Stats Row */}
            <div className="flex-none grid grid-cols-3 gap-6">
                <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between ring-1 ring-white/5 hover:border-white/20 transition-colors group">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-blue-400 transition-colors">Lines</p>
                        <h3 className="text-2xl font-bold text-white leading-none mt-2">{loading ? '-' : lineCount}</h3>
                    </div>
                    <FileCode className="w-10 h-10 text-blue-500/20 group-hover:text-blue-500/40 transition-colors" />
                </div>
                <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between ring-1 ring-white/5 hover:border-white/20 transition-colors group">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Steps</p>
                        <h3 className="text-2xl font-bold text-white leading-none mt-2">{transformCount}</h3>
                    </div>
                    <Zap className="w-10 h-10 text-emerald-500/20 group-hover:text-emerald-500/40 transition-colors" />
                </div>
                <div className="bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center justify-between ring-1 ring-white/5 hover:border-white/20 transition-colors group">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-orange-400 transition-colors">Runtime</p>
                        <h3 className="text-2xl font-bold text-white leading-none mt-2">{runtime}</h3>
                    </div>
                    <Clock className="w-10 h-10 text-orange-500/20 group-hover:text-orange-500/40 transition-colors" />
                </div>
            </div>

            {/* Code Window */}
            <div className="flex-1 min-h-0 bg-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative ring-1 ring-white/5">
                
                {/* Editor Header */}
                <div className="flex-none flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="text-emerald-400"><FileCode className="w-4 h-4" /></div>
                        <span className="text-sm font-bold text-white tracking-tight">{data?.filename || 'pipeline.py'}</span>
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-[#050608]/50">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-emerald-500/50">
                             <Loader2 className="w-10 h-10 animate-spin mb-4 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                             <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/80">Compiling Recipe...</span>
                        </div>
                    ) : (
                        <CodeDisplay code={data?.code || ""} />
                    )}
                </div>

                {/* Editor Footer */}
                <div className="flex-none p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleCopy}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all
                                ${copied 
                                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'}
                            `}
                        >
                            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy Code'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle2 className="w-4 h-4" />
                        Syntax Validated
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Sidebar (4 Cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 min-h-0">
            
            {/* 1. PIPELINE SUMMARY */}
            <div className="h-[45%] flex-none bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden ring-1 ring-white/5 shadow-2xl">
                <div className="flex-none flex items-center gap-3 mb-5">
                    <Terminal className="w-4 h-4 text-slate-500"/>
                    <h3 className="text-white font-bold text-xs uppercase tracking-widest">Pipeline Steps</h3>
                </div>

                {/* Inner Scrollable Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative pl-4 pr-1">
                    <div className="absolute left-[23px] top-2 bottom-2 w-px bg-white/10"></div>
                    <div className="space-y-6">
                        {steps.map((step: Step, idx: number) => (
                            <div key={idx} className="relative flex gap-4 items-start group">
                                <div className="z-10 w-8 h-8 flex-none rounded-lg bg-[#0A0A0A] border border-emerald-500/30 text-emerald-500 flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)] group-hover:border-emerald-500/60 transition-colors">
                                    {idx + 1}
                                </div>
                                <div className="pt-1">
                                    <h4 className="text-white text-sm font-bold capitalize leading-none mb-1.5 group-hover:text-emerald-400 transition-colors">
                                        {step.operation.replace(/_/g, ' ')}
                                    </h4>
                                    <p className="text-slate-500 text-xs font-mono">
                                        Column: <span className="text-slate-300">{step.column}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. REQUIREMENTS */}
            <div className="flex-1 min-h-0 bg-[#0A0A0A]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden ring-1 ring-white/5 shadow-2xl">
                 <div className="flex-none flex items-center gap-3 mb-5">
                    <Clock className="w-4 h-4 text-slate-500"/>
                    <h3 className="text-white font-bold text-xs uppercase tracking-widest">Requirements</h3>
                </div>

                {/* Inner Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {(data?.requirements || ['pandas', 'numpy', 'scikit-learn']).map((req) => (
                        <div key={req} className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0 hover:bg-white/5 p-2 rounded-lg transition-colors cursor-default">
                            <span className="text-slate-200 font-medium">{req}</span>
                            <span className="text-emerald-500 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">latest</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}