import React from 'react';

export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center text-white font-black italic text-2xl shadow-md border border-blue-400">
        GW
      </div>
      <div className="flex flex-col">
        <span className="text-blue-900 font-black leading-none text-xl tracking-tight">Great White</span>
        <span className="text-gray-500 font-bold leading-none text-xs tracking-[0.2em] uppercase mt-1">Construction</span>
      </div>
    </div>
  );
}