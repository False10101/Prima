import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AlertTriangle, Smartphone, Monitor } from 'lucide-react'; // Using Lucide icons to match Prima

import PrimaHomepage from './PrimaHomePage';
import AuditPage from './AuditPage'; 
import RecipePage from './RecipePage'; 
import CodePage from './CodePage';

// --- MOBILE LOCKOUT COMPONENT (PRIMA THEME) ---
const MobileLockout = () => (
    <div className="fixed inset-0 z-[9999] bg-[#050608] text-slate-300 font-sans flex flex-col items-center justify-center p-6 overflow-hidden">
        
        {/* Background FX (Same as Main App) */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        </div>

        {/* Lockout Card */}
        <div className="relative z-10 max-w-sm w-full bg-[#13161C]/90 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(244,63,94,0.15)] flex flex-col items-center text-center">
            
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                <AlertTriangle className="w-8 h-8 text-rose-500 animate-pulse" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">Platform Incompatible</h1>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-rose-500/30 to-transparent my-3"></div>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
                The <span className="text-rose-400 font-mono font-medium">Prima Data Refinery</span> requires a desktop environment for complex data visualization.
            </p>

            <div className="flex items-center justify-center gap-6 w-full opacity-80">
                <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                        <Smartphone className="w-6 h-6 text-rose-500/40" />
                        <div className="absolute inset-0 border-t border-rose-500/60 rotate-45 top-3"></div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-rose-500/40">Mobile</span>
                </div>
                
                <div className="h-8 w-px bg-white/10"></div>
                
                <div className="flex flex-col items-center gap-2">
                    <Monitor className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Desktop</span>
                </div>
            </div>

             <p className="mt-8 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                Error: VIEWPORT_RESTRICTED
            </p>
        </div>
    </div>
);

function App() {
  const [isRestricted, setIsRestricted] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const ua = navigator.userAgent;
      
      // 1. Mobile/Tablet User Agents
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      
      // 2. iPads (MacIntel + Touch)
      const isIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

      // 3. Width Check (Safety net for phones)
      // keeping it tight (< 768) to allow small laptops, 
      // but you can increase to 1024 if you want to block landscape tablets aggressively
      const isTooNarrow = width < 768; 

      if (isMobileUA || isIPad || isTooNarrow) {
        setIsRestricted(true);
      } else {
        setIsRestricted(false);
      }
      setChecking(false);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Prevent flash of content during check
  if (checking) return <div className="h-screen w-screen bg-[#050608]"></div>;

  // Show lockout if restricted
  if (isRestricted) return <MobileLockout />;

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Extraction Point */}
        <Route path="/" element={<PrimaHomepage />} />
        
        {/* 2. Audit Room */}
        <Route path="/audit/:sessionId" element={<AuditPage />} />

        {/* 3. Recipe / Pipeline Generator */}
        <Route path="/recipe/:sessionId" element={<RecipePage />} />

        <Route path="/code/" element={<CodePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;