import React from "react";
import { ShieldCheck, BrainCircuit, Globe, Lock } from "lucide-react";
import { motion } from "framer-motion";
import StarryBackground from "./StarryBackground";
import { Link as RouterLink } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function About() {
  return (
    <div className="min-h-screen w-full font-inter relative text-gray-200 bg-[#050505]">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <StarryBackground />
      </div>

     <Navbar onScanClick={() => window.location.href = "/"} />

      {/* CONTENT */}
      <div className="relative z-10 pt-32 pb-24">

        <div className="max-w-4xl mx-auto px-6 text-center">

          {/* TITLE */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <ShieldCheck className="w-20 h-20 mx-auto text-white mb-6" />

            <h1 className="text-5xl font-bold tracking-[0.25em] text-white">
              PHISH<span className="text-blue-500">X</span>
            </h1>

            <p className="mt-6 text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
              PhishX is an AI-powered phishing detection platform designed to
              protect users from malicious websites using machine learning
              and intelligent URL analysis.
            </p>
          </motion.div>

          {/* FEATURES */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">

            <Feature
              icon={<BrainCircuit className="text-blue-400 w-6 h-6" />}
              title="AI Detection"
              desc="BERT embeddings combined with XGBoost detect phishing patterns in real time."
            />

            <Feature
              icon={<Globe className="text-cyan-400 w-6 h-6" />}
              title="Real-Time Scanning"
              desc="Instantly analyze URLs and detect malicious websites before visiting them."
            />

            <Feature
              icon={<Lock className="text-emerald-400 w-6 h-6" />}
              title="Browser Protection"
              desc="Our Chrome extension protects users while browsing suspicious links."
            />

          </div>

          {/* TECH STACK */}
          <div className="mt-24">

            <h2 className="text-xl text-white font-bold mb-6">
              Technology Stack
            </h2>

            <div className="flex flex-wrap justify-center gap-3 text-xs">
              {[
                "React",
                "Flask",
                "BERT",
                "XGBoost",
                "Python",
                "TailwindCSS",
                "Render",
                "Netlify"
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-gray-300"
                >
                  {tech}
                </span>
              ))}
            </div>

          </div>

        </div>

      </div>
      <Footer />
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-[#0B0C10]/80 border border-white/10 rounded-xl p-6 backdrop-blur-xl"
    >
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </motion.div>
  );
}