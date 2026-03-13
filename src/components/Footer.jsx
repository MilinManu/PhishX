import { Github, Linkedin, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#020202] py-14 mt-auto relative z-20">

      <div className="max-w-7xl mx-auto px-8 flex flex-col items-center justify-center space-y-6 text-center">

        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-gray-500" />
          <span className="text-sm font-bold text-gray-400 tracking-widest">
            PHISHX SECURITY LABS
          </span>
        </div>

        <p className="text-xs text-gray-500 tracking-wide">
          © {new Date().getFullYear()} PhishX • AI Phishing Detection System
        </p>

        <div className="flex space-x-8">

          <a
            href="https://linkedin.com/in/milin-manu"
            target="_blank"
          >
            <Linkedin className="w-5 h-5 text-gray-500 hover:text-blue-400 transition" />
          </a>

          <a
            href="https://github.com/MilinManu/PhishX"
            target="_blank"
          >
            <Github className="w-5 h-5 text-gray-500 hover:text-white transition" />
          </a>

        </div>

      </div>

    </footer>
  );
}