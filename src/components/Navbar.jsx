import { ShieldCheck } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

export default function Navbar({ onScanClick }) {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

        <RouterLink to="/" className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-bold tracking-widest text-white">
            PHISH<span className="text-blue-500">X</span>
          </span>
        </RouterLink>

        <div className="flex items-center space-x-6 text-xs font-medium text-gray-400">

          <button
            onClick={onScanClick}
            className="hover:text-white transition-colors"
          >
            Scanner
          </button>

          {/* <a href="#" className="hover:text-white transition-colors">
            API
          </a> */}

          <RouterLink
            to="/about"
            className="hover:text-white transition-colors"
          >
            About
          </RouterLink>

          <a
            href="/phishx-extension.zip"
            download
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-bold transition"
          >
            Add Extension
          </a>

        </div>

      </div>
    </nav>
  );
}