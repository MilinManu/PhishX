import React, { useState, useEffect, useRef } from 'react';
import { 
  Link, Loader2, History, AlertTriangle, CheckCircle, 
  Shield, Trash2, Zap, Globe, Lock, ShieldCheck, 
  CreditCard, Eye, Menu, Chrome, Twitter, Github, Linkedin,
  BrainCircuit, ThumbsUp, FileKey, MousePointer2, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; 
import StarryBackground from './StarryBackground';
import { ReactLenis } from 'lenis/react';
import { Link as RouterLink } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";


export default function App() {
  // === STATE ===
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [safetyRatings, setSafetyRatings] = useState({}); 
  const scannerRef = useRef(null);

  // History State
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('phishingScanHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('phishingScanHistory', JSON.stringify(history));
  }, [history]);

  // === LOGIC ===
  const scrollToScanner = () => {
    scannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const analyzeUrl = async (urlToAnalyze) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      const response = await fetch('https://phishing-website-backend-5sjv.onrender.com/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToAnalyze }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { error: errorData.error || 'Server returned an error.' };
      }
      return await response.json(); 
    } catch (err) {
      console.error('Fetch error:', err);
      return { error: 'Connection to security server failed.' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!url.trim() || !url.includes('.')) {
      setError('Please enter a valid URL.');
      return;
    }

    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    setIsLoading(true);
    const analysisResult = await analyzeUrl(fullUrl);

    if (analysisResult.error) {
      setError(analysisResult.error);
      setResult({ status: 'Error', score: 0, url: fullUrl });
    } else {
      setResult(analysisResult);
      setHistory((prevHistory) => {
        const newHistory = [
          analysisResult,
          ...prevHistory.filter((item) => item.url !== analysisResult.url),
        ];
        return newHistory.slice(0, 8);
      });
    }
    setIsLoading(false);
    setUrl(''); 
  };

  const handleRating = (url, rating) => {
    setSafetyRatings((prev) => ({ ...prev, [url]: rating }));
    submitSafetyRating(url, rating);
  };

  const submitSafetyRating = async (urlToRate, rating) => {
    try {
      await fetch('https://phishing-website-backend-5sjv.onrender.com/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToRate, user_rating: rating }),
      });
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('phishingScanHistory');
  };

  // === RENDER ===
  return (
    <ReactLenis root>
      <div className="min-h-screen w-full font-inter relative text-gray-200 bg-[#050505] selection:bg-blue-500/30">
        
        {/* FIXED BACKGROUND (Z-INDEX 0) */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <StarryBackground />
        </div>

        {/* NAVBAR (Z-INDEX 50) */}
        <Navbar onScanClick={scrollToScanner} />

        {/* MAIN CONTENT (Z-INDEX 10) - RELATIVE TO FLOW WITH LENIS */}
        <div className="relative z-10 pt-24 pb-12">
          
          <div className="w-full max-w-4xl mx-auto px-4 flex flex-col items-center">
            
            {/* === SECTION 1: HERO === */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="min-h-[80vh] flex flex-col items-center justify-center text-center mb-20"
            >
               <PhishXLogo large />
               <p className="mt-6 text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
                 The next generation of URL threat detection. Secure your digital footprint with our 
                 AI-powered heuristic analysis engine.
               </p>
               
               <motion.button 
                 onClick={scrollToScanner}
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className="mt-10 bg-white text-black hover:bg-gray-200 font-bold py-3 px-8 rounded-full shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all flex items-center mx-auto"
               >
                 START SCANNING <ShieldCheck className="ml-2 w-4 h-4" />
               </motion.button>

               <motion.div 
                 animate={{ y: [0, 10, 0] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute bottom-10 text-gray-600"
               >
                 <ChevronDown className="w-8 h-8" />
               </motion.div>
            </motion.div>

            <SectionDivider />

            {/* === SECTION 2: SCANNER === */}
            <div ref={scannerRef} className="w-full py-32 relative">
               {/* Glow Effect */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

               {/* Section Title */}
               <motion.div 
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: false, amount: 0.5 }}
                 className="mb-12 text-center"
               >
                  <span className="text-blue-500 font-mono text-xs tracking-[0.2em] uppercase">Security Console</span>
                  <h2 className="text-3xl font-bold text-white mt-2">Live Threat Analysis</h2>
               </motion.div>

               {/* SCANNER CARD */}
               <motion.div 
                 layout 
                 initial={{ opacity: 0, scale: 0.95 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: false, amount: 0.3 }}
                 className="w-full bg-[#0B0C10]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-2xl relative overflow-hidden z-20"
               >
                  <div className="bg-[#0B0C10] rounded-xl p-6 sm:p-10 border border-white/5 relative overflow-hidden">
                    <div className="w-full flex flex-col items-center justify-center space-y-8">
                      
                      <AnimatePresence mode='wait'>
                        {error && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full bg-red-950/30 border border-red-500/30 rounded-lg p-3 flex items-center text-red-400 text-sm overflow-hidden"
                          >
                            <AlertTriangle className="w-4 h-4 mr-3 flex-shrink-0" />
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence mode="wait">
                        {!result && !isLoading && (
                          <motion.div 
                            key="input-section"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                          >
                             <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/40 to-cyan-500/40 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                <div className="relative flex items-center bg-[#121212] border border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all h-16">
                                  <div className="pl-5 text-gray-500">
                                    <Globe className="w-6 h-6" />
                                  </div>
                                  <input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="Paste URL here to scan..."
                                    className="w-full bg-transparent text-white text-lg px-4 focus:outline-none placeholder-gray-600 font-mono h-full"
                                    spellCheck="false"
                                  />
                                  <div className="pr-2 h-full py-2">
                                    <button
                                      onClick={handleSubmit}
                                      className="h-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 rounded-lg transition-colors shadow-lg flex items-center"
                                    >
                                      SCAN
                                    </button>
                                  </div>
                                </div>
                             </div>
                             
                             <div className="flex justify-between items-center mt-3 px-2">
                               <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Secure Connection</p>
                               <div className="flex items-center space-x-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Engine Ready</span>
                               </div>
                             </div>
                          </motion.div>
                        )}

                        {isLoading && (
                          <motion.div 
                            key="loading-section"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-10"
                          >
                              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                              <p className="text-gray-400 text-sm font-mono tracking-widest animate-pulse">ANALYZING THREAT VECTORS...</p>
                          </motion.div>
                        )}

                        {result && !isLoading && (
                          <motion.div
                            key="result-section"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full"
                          >
                            <ResultCard result={result} onRating={handleRating} currentRating={safetyRatings[result.url]} onReset={() => setResult(null)} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>
               </motion.div>

               {/* HISTORY */}
               {history.length > 0 && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   whileInView={{ opacity: 1 }}
                   viewport={{ once: false }}
                   className="mt-8 w-full"
                 >
                   <div className="flex items-center justify-between mb-4 px-2 border-b border-white/5 pb-2">
                      <div className="flex items-center text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">
                        <History className="h-3 w-3 mr-2" /> Session Logs
                      </div>
                      <button onClick={clearHistory} className="text-xs text-gray-600 hover:text-red-400 transition-colors cursor-pointer">
                        CLEAR
                      </button>
                   </div>

                   <div className="grid grid-cols-1 gap-2">
                     <AnimatePresence>
                       {history.map((item, idx) => (
                         <motion.div 
                           key={`${item.url}-${idx}`}
                           initial={{ opacity: 0, x: -10 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: 10 }}
                           transition={{ delay: idx * 0.05 }}
                           className="flex justify-between items-center text-xs text-gray-400 bg-[#0B0C10] border border-white/5 px-4 py-3 rounded-lg hover:border-white/10 transition-colors"
                         >
                           <div className="flex items-center space-x-3 overflow-hidden">
                             <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'Safe' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                             <span className="truncate max-w-[250px] font-mono text-gray-300">{item.url}</span>
                           </div>
                           <span className={`font-bold ${item.status === 'Safe' ? 'text-emerald-500' : 'text-red-500'}`}>
                             {item.status.toUpperCase()}
                           </span>
                         </motion.div>
                       ))}
                     </AnimatePresence>
                   </div>
                 </motion.div>
               )}
            </div>

            <SectionDivider />

            {/* === SECTION 3: EXTENSION === */}
            <div className="py-32 relative w-full">
               <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
               <ScrollFeatures />
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <Footer />
        
      </div>
    </ReactLenis>
  );
}

// ... [KEEP ALL SUB-COMPONENTS (Navbar, Footer, ResultCard, etc.) EXACTLY AS THEY WERE] ...
// I will repaste them below for convenience to ensure nothing is missing.

function SectionDivider() {
  return (
    <div className="w-full flex justify-center items-center py-10 opacity-50">
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mx-2 shadow-[0_0_10px_currentColor]"></div>
      <div className="h-px w-24 bg-gradient-to-l from-transparent via-blue-500/50 to-transparent"></div>
    </div>
  );
}

function ScrollFeatures() {
  const features = [
    { 
      icon: <BrainCircuit className="w-6 h-6 text-blue-400" />, 
      title: "Machine Learning Engine", 
      desc: "Deep learning neural networks analyze page structure, images, and content in real-time to detect zero-day phishing patterns that blocklists miss.",
      align: 'left'
    },
    { 
      icon: <FileKey className="w-6 h-6 text-cyan-400" />, 
      title: "SSL Handshake Verification", 
      desc: "We perform a deep cryptographic handshake to verify certificate authenticity, ensuring you are connected to the legitimate entity.",
      align: 'right'
    },
    { 
      icon: <ThumbsUp className="w-6 h-6 text-amber-400" />, 
      title: "Community Trust Ratings", 
      desc: "Aggregated reputation scores from millions of users worldwide. See instantly if a domain has been flagged by the security community.",
      align: 'left'
    },
    { 
      icon: <MousePointer2 className="w-6 h-6 text-emerald-400" />, 
      title: "Proactive Click Guard", 
      desc: "The extension intercepts malicious redirects and prevents you from landing on dangerous pages before they even load.",
      align: 'right'
    },
  ];

  return (
    <div className="w-full flex flex-col items-center justify-center">
       <motion.div 
         initial={{ opacity: 0, y: 30 }}
         whileInView={{ opacity: 1, y: 0 }}
         viewport={{ once: false, margin: "-100px" }} 
         className="text-center mb-24 max-w-2xl px-4"
       >
         <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-900/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-widest uppercase mb-4">
           <Chrome className="w-3 h-3" />
           <span>Browser Extension</span>
         </div>
         <h3 className="text-4xl font-bold text-white mb-4 tracking-tight">
           Total Browser Security
         </h3>
         <p className="text-slate-400 text-sm font-light">
           Continuous, real-time protection directly in your browser toolbar.
         </p>
       </motion.div>

       <div className="w-full max-w-5xl px-4 space-y-24">
         {features.map((item, index) => (
           <motion.div 
             key={index}
             initial={{ opacity: 0, x: item.align === 'left' ? -100 : 100 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: false, margin: "-100px" }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className={`flex flex-col ${item.align === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16`}
           >
              <div className="w-24 h-24 bg-[#0E0F13] border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl flex-shrink-0 relative group hover:border-blue-500/30 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {item.icon}
              </div>
              <div className={`text-center ${item.align === 'right' ? 'md:text-right' : 'md:text-left'}`}>
                <h4 className="text-2xl font-bold text-white mb-3">{item.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed max-w-lg">{item.desc}</p>
              </div>
           </motion.div>
         ))}
       </div>

       <motion.div 
         initial={{ opacity: 0, y: 30 }}
         whileInView={{ opacity: 1, y: 0 }}
         viewport={{ once: false, margin: "-50px" }}
         className="mt-32 w-full max-w-md px-4"
       >
      <a
        href="/phishx-extension.zip"
        download
        className="w-full bg-white text-black hover:bg-gray-200 font-bold py-4 px-6 rounded-lg shadow-xl transition-all flex items-center justify-center mx-auto text-sm tracking-wide">
        <Chrome className="w-5 h-5 mr-3" /> ADD TO CHROME FOR FREE
      </a>
       </motion.div>
    </div>
  );
}

// function Navbar({ onScanClick }) {
//   return (
//     <nav className="fixed top-0 left-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 h-16">
//       <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
//         <div className="flex items-center space-x-2">
//           <ShieldCheck className="w-5 h-5 text-blue-500" />
//           <span className="text-sm font-bold tracking-widest text-white">PHISH<span className="text-blue-500">X</span></span>
//         </div>
//         <div className="flex items-center space-x-6 text-xs font-medium text-gray-400">

//           <button
//             onClick={onScanClick}
//             className="hover:text-white transition-colors">
//             Scanner
//           </button>

//           {/* <a href="#" className="hover:text-white transition-colors">
//             API
//           </a> */}

//           <RouterLink
//             to="/about"
//             className="hover:text-white transition-colors">
//             About
//           </RouterLink>

//           {/* ADD EXTENSION BUTTON */}
//           <a
//             href="/phishx-extension.zip"
//             download
//             className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-bold transition">
//             Add Extension
//           </a>

//         </div>
//       </div>
//     </nav>
//   );
// }

// function Footer() {
//   return (
//     <footer className="w-full border-t border-white/5 bg-[#020202] py-14 mt-auto relative z-20">

//       <div className="max-w-7xl mx-auto px-8 flex flex-col items-center justify-center space-y-6 text-center">

//         {/* LOGO */}
//         <div className="flex items-center space-x-2">
//           <ShieldCheck className="w-6 h-6 text-gray-500" />
//           <span className="text-sm font-bold text-gray-400 tracking-widest">
//             PHISHX SECURITY LABS
//           </span>
//         </div>

//         {/* COPYRIGHT */}
//         <p className="text-xs text-gray-500 tracking-wide">
//           © {new Date().getFullYear()} PhishX • AI Phishing Website Detector
//         </p>

//         {/* SOCIAL LINKS */}
//         <div className="flex space-x-8">

//           <a
//             href="https://linkedin.com/in/milin-manu"
//             target="_blank"
//           >
//             <Linkedin className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
//           </a>

//           <a
//             href="https://github.com/MilinManu/PhishX"
//             target="_blank"
//           >
//             <Github className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
//           </a>

//         </div>

//       </div>

//     </footer>
//   );
// }

function ResultCard({ result, onRating, currentRating, onReset }) {
  const { status, score, url } = result;
  const isSafe = status === 'Safe';
  const statusColor = isSafe ? 'text-emerald-400' : 'text-red-400';
  const barColor = isSafe ? 'bg-emerald-500' : 'bg-red-500';

  return (
    <div className="text-left w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 p-4 rounded-xl border border-white/5 bg-white/5">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             {isSafe ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
             <h2 className={`text-2xl font-bold ${statusColor} tracking-tight`}>{status.toUpperCase()}</h2>
          </div>
          <p className="text-gray-400 text-xs font-mono break-all">{url}</p>
        </div>
        <div className="mt-4 sm:mt-0 text-right">
          <span className="text-3xl font-bold text-white tracking-tighter">{score}%</span>
          <span className="text-[10px] block text-gray-500 uppercase tracking-widest">Confidence</span>
        </div>
      </div>
      <div className="w-full bg-[#15161A] rounded-sm h-1.5 mb-6 overflow-hidden relative">
        <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${score}%` }}
           transition={{ duration: 1, ease: "circOut" }}
           className={`h-full ${barColor} shadow-[0_0_15px_currentColor]`} 
        />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Feedback</span>
        <button onClick={onReset} className="flex items-center text-xs text-gray-400 hover:text-white transition-colors">
           <History className="w-3 h-3 mr-1.5" /> Check Another
        </button>
      </div>
    </div>
  );
}

function PhishXLogo({ large }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative group cursor-default">
        <div className={`absolute -inset-4 bg-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-700`}></div>
        <div className="relative">
           <ShieldCheck className={`${large ? 'w-24 h-24' : 'w-16 h-16'} text-white stroke-[1.5] transition-all`} />
        </div>
      </div>
      <div className="text-center">
         <h1 className={`${large ? 'text-5xl' : 'text-3xl'} font-bold tracking-[0.2em] uppercase text-white transition-all`}>
           PHISH<span className="text-blue-500">X</span>
         </h1>
      </div>
    </div>
  );
}