import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 group ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
          : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
      } ${className}`}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon — shown in dark mode (clicking switches to light) */}
        <Sun
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
          }`}
        />
        {/* Moon icon — shown in light mode (clicking switches to dark) */}
        <Moon
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            !isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
      </div>
    </button>
  );
}