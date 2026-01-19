import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Play, Plus, Trash2, ArrowDown, Settings2,
  Table2, Loader2,
  Wand2, Layers, AlertCircle, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- Types ---
interface Step {
  id: string;
  operation: string;
  column: string;
  params: Record<string, any>;
}

interface PreviewData {
  rows: number;
  columns: string[];
  data: Record<string, any>[];
}

interface OperationParam {
  name: string;
  type: 'text' | 'number' | 'select' | 'column_select';
  label: string;
  options?: string[];
  default?: any;
}

interface OperationDefinition {
  id: string;
  label: string;
  category: string;
  params: OperationParam[];
}

// --- Configuration ---
const API_URL = "http://localhost:8000/api";

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// --- Components ---

// 1. DATA PREVIEW TABLE
const PreviewTable = ({ data, loading, error }: { data: PreviewData | null, loading: boolean, error: string | null }) => {
  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center text-emerald-500 border border-white/5 rounded-2xl bg-[#0A0A0A]/60 backdrop-blur-xl shadow-inner">
      <Loader2 className="w-8 h-8 animate-spin mb-3 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      <span className="text-xs font-mono uppercase tracking-widest text-emerald-400/80 animate-pulse">Running Simulation...</span>
    </div>
  );

  if (error) return (
    <div className="h-full flex flex-col items-center justify-center text-red-400 border border-red-500/10 rounded-2xl bg-red-500/5 backdrop-blur-xl">
      <AlertCircle className="w-8 h-8 mb-2 opacity-80" />
      <span className="text-sm font-medium tracking-wide">{error}</span>
    </div>
  );

  if (!data) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-600 border border-dashed border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
      <Table2 className="w-10 h-10 mb-3 opacity-20" />
      <span className="text-xs font-mono uppercase tracking-wider opacity-50">Waiting for input...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full border border-white/10 rounded-2xl bg-[#0A0A0A]/70 backdrop-blur-2xl overflow-hidden shadow-2xl ring-1 ring-white/5 relative group">
      {/* Table Header / Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/10 rounded-md">
            <Table2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Live Preview</span>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-400 font-mono">
          <span className="text-emerald-400 font-bold">{data.rows.toLocaleString()}</span> rows <span className="text-slate-600">|</span> <span className="text-white">{data.columns.length}</span> cols
        </div>
      </div>

      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0A0A0A]/90 sticky top-0 z-10 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <tr>
              {data.columns.map((col) => (
                <th key={col} className="p-4 text-[10px] uppercase font-bold text-slate-500 border-b border-white/10 whitespace-nowrap min-w-[120px] tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs text-slate-300 font-mono divide-y divide-white/5">
            {data.data.map((row, idx) => (
              <tr key={idx} className="hover:bg-emerald-500/5 transition-colors group/row">
                {data.columns.map((col) => (
                  <td key={`${idx}-${col}`} className="p-4 whitespace-nowrap max-w-[200px] truncate text-slate-400 group-hover/row:text-slate-200 transition-colors">
                    {row[col] !== null ? String(row[col]) : <span className="text-slate-700 italic opacity-50">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 2. STEP CONFIGURATION FORM
const StepConfig = ({
  step,
  updateStep,
  columns = [],
  schema = []
}: {
  step: Step,
  updateStep: (s: Step) => void,
  columns: string[],
  schema: OperationDefinition[]
}) => {
  const definition = schema.find(op => op.id === step.operation);

  if (!step || !definition) return <div className="text-slate-500 text-sm p-4">Select a step to configure</div>;

  const handleParamChange = (key: string, val: any) => {
    updateStep({
      ...step,
      params: { ...step.params, [key]: val }
    });
  };

  const Label = ({ text }: { text: string }) => (
    <label className="text-[10px] uppercase text-emerald-500/70 font-bold block mb-2 tracking-widest">
      {text}
    </label>
  );

  // GLASS INPUT STYLE
  const inputClass = "w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 text-sm text-white focus:border-emerald-500/50 focus:bg-white/10 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none transition-all placeholder:text-slate-600 hover:border-white/20 hover:bg-white/[0.07]";

  return (
    <div className="p-8 space-y-8 h-full flex flex-col">
      <div className="flex items-center gap-5 border-b border-white/5 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <Settings2 className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-xl tracking-tight leading-none mb-1.5">
            {definition.label}
          </h3>
          <p className="text-xs text-slate-500 font-medium">Configure transformation parameters</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-8 flex-1 content-start">
        {definition.params.map((param) => (
          <div key={param.name}>
            <Label text={param.label} />
            
            {param.type === 'column_select' && (
              <div className="relative group">
                <select
                  value={step.params[param.name] || step.column || ''}
                  onChange={(e) => {
                    if (param.name === 'col') updateStep({ ...step, column: e.target.value });
                    handleParamChange(param.name, e.target.value);
                  }}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="" disabled className="bg-slate-900">Select column...</option>
                  {columns.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
                <ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-emerald-400 transition-colors" />
              </div>
            )}

            {param.type === 'select' && (
              <div className="relative group">
                <select
                  value={step.params[param.name] || param.default}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  {param.options?.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                </select>
                <ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-emerald-400 transition-colors" />
              </div>
            )}

            {param.type === 'number' && (
              <input
                type="number"
                step="0.1"
                value={step.params[param.name] || param.default}
                onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
                className={inputClass}
              />
            )}

            {param.type === 'text' && (
              <input
                type="text"
                value={step.params[param.name] || ''}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                className={inputClass}
              />
            )}
          </div>
        ))}

        {definition.params.length === 0 && (
          <div className="col-span-2 w-full h-24 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-500 italic bg-white/[0.02]">
             <CheckCircle2 className="w-5 h-5 mb-2 text-emerald-500/40" />
             <span className="text-xs">No configuration required.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. HIGHLIGHTER HELPER
const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <span className="text-slate-300 group-hover:text-white transition-colors">{text}</span>;
  }
  const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => (
        regex.test(part) ? (
          <span key={i} className="text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">{part}</span>
        ) : (
          <span key={i} className="text-slate-500 group-hover:text-slate-300 transition-colors">{part}</span>
        )
      ))}
    </span>
  );
};

// --- MAIN PAGE ---

export default function RecipePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // State
  const [steps, setSteps] = useState<Step[]>([
    { id: '1', operation: 'drop_column', column: 'Cabin', params: {} },
    { id: '2', operation: 'fill_na_median', column: 'Age', params: {} },
  ]);
  const [activeStepId, setActiveStepId] = useState<string | null>('2');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masterColumns, setMasterColumns] = useState<string[]>([]);
  const [schema, setSchema] = useState<OperationDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Data Fetching
  useEffect(() => {
    if (!sessionId) return;
    const fetchColumns = async () => {
      try {
        const res = await axios.get(`${API_URL}/analyze/${sessionId}`);
        const cols = res.data.columns.map((c: any) => c.name);
        setMasterColumns(cols);
      } catch (e) { console.error("Could not load original columns", e); }
    };
    fetchColumns();
  }, [sessionId]);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await axios.get(`${API_URL}/options`);
        setSchema(res.data.operations);
      } catch (e) { console.error("Failed to load pipeline options", e); }
    };
    fetchSchema();
  }, []);

  // API Preview Logic
  useEffect(() => {
    if (!sessionId) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = { session_id: sessionId, steps: steps };
        const res = await axios.post(`${API_URL}/preview`, payload);
        setPreview(res.data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to generate preview. Check column names.");
      } finally {
        setLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [steps, sessionId]);

  const groupedSchema = schema.reduce((acc, curr) => {
    (acc[curr.category] = acc[curr.category] || []).push(curr);
    return acc;
  }, {} as Record<string, OperationDefinition[]>);

  const availableColumns = useMemo(() => {
    const allCols = new Set([...masterColumns, ...(preview?.columns || [])]);
    return Array.from(allCols).sort();
  }, [masterColumns, preview?.columns]);

  // Handlers
  const addStep = (op: string) => {
    const newStep: Step = {
      id: crypto.randomUUID(),
      operation: op,
      column: 'select_column',
      params: {}
    };
    setSteps([...steps, newStep]);
    setActiveStepId(newStep.id);
  };

  const updateActiveStep = (updated: Step) => {
    setSteps(steps.map(s => s.id === updated.id ? updated : s));
  };

  const removeStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSteps = steps.filter(s => s.id !== id);
    setSteps(newSteps);
    if (activeStepId === id) setActiveStepId(null);
  };

  const activeStep = steps.find(s => s.id === activeStepId);

  return (
    // THEME UPGRADE: The "Main Stage"
    <div className="h-screen w-full bg-[#030304] text-slate-300 flex overflow-hidden font-sans relative selection:bg-emerald-500/30">
      
      {/* GLOBAL FX: Background Grid & Spotlights */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          {/* Top Spotlight */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
          {/* Bottom ambient glow */}
          <div className="absolute -bottom-32 right-0 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {/* 1. LEFT SIDEBAR: PIPELINE STACK */}
      <div className="w-80 flex-none border-r border-white/5 bg-[#030304]/80 backdrop-blur-2xl flex flex-col z-20 shadow-2xl relative">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-2">
            <button 
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Go Back"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-white font-bold text-lg tracking-tight">Pipeline Stack</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
             Active Sequence: <span className="text-emerald-400">{steps.length} Nodes</span>
          </p>
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              layout
              onClick={() => setActiveStepId(step.id)}
              className={`
                relative group p-4 rounded-2xl border cursor-pointer transition-all duration-300
                ${activeStepId === step.id
                  ? 'bg-gradient-to-br from-emerald-900/20 to-emerald-900/5 border-emerald-500/40 shadow-[0_0_25px_-5px_rgba(16,185,129,0.2)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all
                    ${activeStepId === step.id 
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                        : 'bg-white/5 text-slate-500 border border-white/5'}
                  `}>
                    {index + 1}
                  </div>
                  <span className={`text-sm font-bold capitalize transition-colors ${activeStepId === step.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                    {step.operation.replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={(e) => removeStep(step.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className={`ml-9 text-[10px] font-mono truncate transition-colors ${activeStepId === step.id ? 'text-emerald-400/80' : 'text-slate-600 group-hover:text-slate-500'}`}>
                {step.column} <span className="text-slate-700 opacity-50">→</span> {JSON.stringify(step.params).slice(0, 20)}
              </div>

              {/* Connecting Thread */}
              {index !== steps.length - 1 && (
                <div className="absolute left-[27px] -bottom-5 w-px h-5 bg-gradient-to-b from-white/10 to-transparent z-0" />
              )}
            </motion.div>
          ))}
          
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20">
          <button
            onClick={() => navigate('/code', { state: { sessionId, steps } })}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:to-emerald-300 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-black" /> Generate Code
          </button>
        </div>
      </div>

      {/* 2. CENTER: WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent z-10 relative">
        
        {/* Top: Configuration Deck (Glassmorphism) */}
        <div className="h-[45%] min-h-[350px] p-6 pb-2 overflow-y-auto">
          <div className="bg-[#0A0A0A]/60 backdrop-blur-2xl border border-white/10 rounded-2xl h-full shadow-2xl relative overflow-hidden ring-1 ring-white/5">
            {activeStep ? (
              <StepConfig step={activeStep} updateStep={updateActiveStep} columns={availableColumns} schema={schema} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600/50">
                <Layers className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a step to configure</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Table Preview */}
        <div className="flex-1 p-6 pt-2 min-h-0 flex flex-col">
          <PreviewTable data={preview} loading={loading} error={error} />
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR: QUICK ADD */}
      <div className="w-72 flex-none border-l border-white/5 bg-[#030304]/80 backdrop-blur-2xl flex flex-col z-20 shadow-2xl">
        <div className="p-5 border-b border-white/5 bg-white/[0.02]">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-xs text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none placeholder:text-slate-700 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-emerald-500 transition-colors">
                 <Wand2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {Object.entries(groupedSchema).map(([category, ops]) => (
            <div key={category} className="mb-6 last:mb-2">
              <h3 className="px-3 text-[9px] uppercase font-bold text-slate-600 mb-2 tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 bg-slate-600 rounded-full"></div> {category}
              </h3>
              <div className="space-y-1">
                {ops.map(op => (
                  <button
                    key={op.id}
                    onClick={() => addStep(op.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 flex justify-between items-center group transition-colors border border-transparent hover:border-white/5"
                  >
                    <span className="capitalize text-xs truncate pr-2 font-medium text-slate-400 group-hover:text-slate-200">
                      <HighlightedText text={op.label} highlight={searchQuery} />
                    </span>
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-500 flex-none transition-all transform group-hover:rotate-90" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {searchQuery && !Object.values(groupedSchema).flat().some(op => op.label.toLowerCase().includes(searchQuery.toLowerCase())) && (
             <div className="p-8 text-center opacity-50">
               <p className="text-[10px] text-slate-500">No operations found.</p>
             </div>
          )}
        </div>
      </div>

    </div>
  );
}