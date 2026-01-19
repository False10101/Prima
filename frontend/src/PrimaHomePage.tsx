import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Database,
    Activity,
    Loader2,
    ArrowRight,
    Code2,
    HelpCircle,
    Terminal,
    X,
    ShieldCheck,
    Cpu,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface UploadResponse {
    status: string;
    rows_processed: number;
    session_id: string;
    message: string;
}

// --- Configuration ---
const API_URL = "http://localhost:8000";
const STORAGE_KEY = "prima_active_session"; 
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; 

export default function PrimaHomepage() {
    // --- State ---
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- 1. RESTORE SESSION ON LOAD ---
    useEffect(() => {
        const savedSession = localStorage.getItem(STORAGE_KEY);
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                const now = Date.now();
                if (parsed._timestamp && (now - parsed._timestamp > SESSION_EXPIRY_MS)) {
                    console.log("Session expired. Clearing storage.");
                    localStorage.removeItem(STORAGE_KEY);
                    setUploadResult(null);
                } else {
                    setUploadResult(parsed);
                }
            } catch (e) {
                console.error("Failed to parse saved session", e);
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, []);

    // --- Handlers ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile: File) => {
        setError(null);
        setUploadResult(null);
        if (!selectedFile.name.endsWith('.csv')) {
            setError("Only .csv files are supported.");
            return;
        }
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        const sessionId = crypto.randomUUID();
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post<UploadResponse>(
                `${API_URL}/api/upload/${sessionId}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            const data = response.data;
            const sessionToStore = { ...data, _timestamp: Date.now() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionToStore));
            setUploadResult(data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to upload dataset.");
        } finally {
            setUploading(false);
        }
    };

    const resetSession = () => {
        localStorage.removeItem(STORAGE_KEY);
        setFile(null);
        setUploadResult(null);
        setError(null);
    };

    return (
        // THEME UPGRADE: Added a radial gradient background and a subtle grid pattern
        <div className="h-screen w-full bg-[#050608] text-slate-300 font-sans selection:bg-emerald-500/30 flex flex-col overflow-hidden relative">
            
            {/* BACKGROUND FX: Deep Grid & Ambient Glow */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
            </div>

            {/* --- Navbar --- */}
            {/* THEME UPGRADE: Glassmorphism (backdrop-blur) and softer border */}
            <nav className="flex-none flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#050608]/60 backdrop-blur-xl z-50 sticky top-0">
                <div className="flex items-center gap-3 w-48 group cursor-pointer">
                    <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 group-hover:border-emerald-500/50 transition-colors">
                        <Database className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Prima</h1>
                        <p className="text-[10px] text-emerald-500/60 font-mono tracking-widest uppercase group-hover:text-emerald-400 transition-colors">Data Refinery</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center justify-center gap-10 text-sm font-medium text-slate-500">
                    <span className="text-emerald-400 cursor-default drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">Extraction</span>
                    <button disabled={!uploadResult} onClick={() => uploadResult?.session_id && navigate(`/audit/${uploadResult?.session_id}`)} className={`${uploadResult ? 'text-slate-300 hover:text-white cursor-pointer' : 'cursor-not-allowed opacity-30'} transition-colors`}>Audit</button>
                    <button disabled={!uploadResult} onClick={() => uploadResult?.session_id && navigate(`/recipe/${uploadResult?.session_id}`)} className={`${uploadResult ? 'text-slate-300 hover:text-white cursor-pointer' : 'cursor-not-allowed opacity-30'} transition-colors`}>Recipe</button>
                    <button disabled className="hover:text-slate-300 cursor-not-allowed transition-colors opacity-30">Preview</button>
                </div>

                <div className="flex items-center justify-end gap-4 w-48">
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 hover:border-emerald-500/30 transition-colors group">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">v2.1 Online</span>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden lg:block"></div>

                    <button
                        onClick={() => setShowHelp(true)}
                        className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            {/* --- Main Content --- */}
            <main className="flex-1 flex flex-col items-center justify-center relative overflow-y-auto w-full z-10">
                <div className="w-full max-w-2xl px-6 py-12 flex flex-col items-center">

                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] mb-6 border border-emerald-500/30 backdrop-blur-md"
                        >
                            <Activity className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                        </motion.div>
                        {/* THEME UPGRADE: Gradient Text */}
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">Extraction</span> Point
                        </h1>
                        <p className="text-slate-400 max-w-lg mx-auto text-base leading-relaxed font-light">
                            Upload your raw CSV. We create a lightweight session and generate your pipeline immediately.
                        </p>
                    </div>

                    <div className="w-full relative group perspective-1000">
                        {/* Glow Effect behind the card */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-600/20 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-1000 pointer-events-none" />

                        {/* Card Container - Added Glassmorphism and inner light */}
                        <div className="relative bg-[#13161C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden ring-1 ring-white/5">
                            <AnimatePresence mode="wait">
                                {uploadResult ? (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-center"
                                    >
                                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                        </div>

                                        <h2 className="text-xl font-bold text-white mb-1">Extraction Complete</h2>
                                        <p className="text-slate-400 mb-6 text-sm">
                                            Session <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{uploadResult.session_id.slice(0, 8)}</span> is active.
                                        </p>

                                        <div className="bg-[#0B0E14]/50 rounded-xl border border-white/5 p-5 mb-6 text-left grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                                <p className="text-white text-sm font-medium flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></span>
                                                    Active
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Rows Sampled</p>
                                                <p className="text-white text-sm font-medium font-mono">{uploadResult.rows_processed.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 justify-center">
                                            <button onClick={resetSession} className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-sm hover:bg-white/10 hover:text-white transition-all">
                                                Close Session
                                            </button>
                                            <button
                                                onClick={() => navigate(`/audit/${uploadResult?.session_id}`)}
                                                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2"
                                            >
                                                Enter Audit Room <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="upload"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`
                          group/drop relative h-64 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                          ${isDragging ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01] shadow-[inset_0_0_40px_rgba(16,185,129,0.1)]' : 'border-slate-700 bg-[#0B0E14]/50 hover:border-emerald-500/50 hover:bg-[#0B0E14]/80'}
                          ${file ? 'border-emerald-500/50 bg-emerald-900/10' : ''}
                          `}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".csv"
                                                onChange={handleFileSelect}
                                            />

                                            {uploading ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="relative">
                                                        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                                                        <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse"></div>
                                                    </div>
                                                    <p className="text-emerald-400 font-medium mt-4 animate-pulse">Transmuting...</p>
                                                </div>
                                            ) : file ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                                        <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
                                                    </div>
                                                    <p className="text-white font-medium mb-1 text-lg">{file.name}</p>
                                                    <p className="text-slate-500 text-xs font-mono mb-4 px-2 py-1 bg-white/5 rounded">{(file.size / 1024).toFixed(1)} KB</p>
                                                    <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest hover:text-emerald-400 transition-colors">Click to change</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center group-hover/drop:scale-105 transition-transform duration-300">
                                                    <div className="w-14 h-14 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-white/5 group-hover/drop:border-emerald-500/30 group-hover/drop:bg-emerald-500/10 transition-colors">
                                                        <Upload className="w-7 h-7 text-slate-400 group-hover/drop:text-emerald-400 transition-colors" />
                                                    </div>
                                                    <p className="text-slate-300 font-medium mb-1.5 text-lg">Drop CSV here</p>
                                                    <p className="text-slate-500 text-sm">or click to browse</p>
                                                </div>
                                            )}
                                        </div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                                className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                            >
                                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                <span className="text-xs font-medium">{error}</span>
                                            </motion.div>
                                        )}

                                        <div className="mt-6">
                                            <button
                                                onClick={handleUpload}
                                                disabled={!file || uploading}
                                                className={`
                                w-full py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2
                                ${file && !uploading
                                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-black hover:to-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transform hover:-translate-y-0.5'
                                                        : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5'}
                            `}
                                            >
                                                {uploading ? 'Processing...' : 'Initialize Session'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {!uploadResult && (
                            <div className="mt-8 flex justify-center gap-8 text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                                <span className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div> System Ready</span>
                                <span className="flex items-center gap-2"><Activity className="w-3 h-3 text-slate-500" /> Auto-Sample: 1k</span>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- HELP MODAL --- */}
            <AnimatePresence>
                {showHelp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowHelp(false)}
                            className="absolute inset-0 bg-[#050608]/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#0F1116] border border-white/10 rounded-2xl p-6 shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/5"
                        >
                            <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                    <Code2 className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white tracking-tight">System Specifications</h3>
                            </div>

                            <div className="space-y-5">
                                <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500/80 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Anonymous Sessions</h4>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            Prima operates on ephemeral session IDs. Your data environment is isolated.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <Clock className="w-5 h-5 text-emerald-500/80 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Data Lifecycle</h4>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            Data persists in the session until you click "Close Session" or the backend prunes it.
                                            <span className="text-emerald-500 block mt-1 font-medium">Refreshes are safe (Local Storage).</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}