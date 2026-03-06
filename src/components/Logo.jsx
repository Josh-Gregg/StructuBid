import React from 'react';

export default function Logo({ className = '', imageClassName = 'h-40' }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a49e445c93e63bbac9f11c/9a2840302_GW_BluewTransparentBackground.png" 
        alt="Great White Construction Logo" 
        className={`${imageClassName} object-contain`}
      />
    </div>
  );
}