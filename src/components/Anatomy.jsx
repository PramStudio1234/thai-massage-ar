import React from 'react';

export const samplePose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.25, z: 0, visibility: 1 }));
Object.assign(samplePose, {
  0: { x: 0.5, y: 0.16, z: 0, visibility: 1 },
  3: { x: 0.475, y: 0.145, z: 0, visibility: 1 },
  6: { x: 0.525, y: 0.145, z: 0, visibility: 1 },
  7: { x: 0.45, y: 0.16, z: 0, visibility: 1 },
  8: { x: 0.55, y: 0.16, z: 0, visibility: 1 },
  11: { x: 0.36, y: 0.32, z: 0, visibility: 1 },
  12: { x: 0.64, y: 0.32, z: 0, visibility: 1 },
  13: { x: 0.27, y: 0.49, z: 0, visibility: 1 },
  14: { x: 0.73, y: 0.49, z: 0, visibility: 1 },
  15: { x: 0.22, y: 0.64, z: 0, visibility: 1 },
  16: { x: 0.78, y: 0.64, z: 0, visibility: 1 },
  23: { x: 0.42, y: 0.59, z: 0, visibility: 1 },
  24: { x: 0.58, y: 0.59, z: 0, visibility: 1 },
  25: { x: 0.4, y: 0.77, z: 0, visibility: 1 },
  26: { x: 0.6, y: 0.77, z: 0, visibility: 1 },
  27: { x: 0.38, y: 0.94, z: 0, visibility: 1 },
  28: { x: 0.62, y: 0.94, z: 0, visibility: 1 },
  29: { x: 0.38, y: 0.955, z: 0, visibility: 1 },
  30: { x: 0.62, y: 0.955, z: 0, visibility: 1 },
  31: { x: 0.345, y: 0.975, z: 0, visibility: 1 },
  32: { x: 0.655, y: 0.975, z: 0, visibility: 1 }
});

export default function Anatomy({ region = 'upper', compact = false, className = '' }) {
  const ys = region === 'upper' ? [137, 145, 154] : region === 'middle' ? [175, 198, 225] : [251, 277, 312];

  return (
    <svg
      className={`${compact ? 'w-20 h-24' : 'w-64 h-80'} text-sky-400/80 transition-all ${className}`}
      viewBox="0 0 300 350"
      role="img"
      aria-label={`แผนผังจุดฝึกกายวิภาคศาสตร์ ${region}`}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        {/* Head */}
        <ellipse cx="150" cy="65" rx="28" ry="35" opacity="0.85" />
        
        {/* Left Arm / Torso / Right Arm */}
        <path d="M131 99v25l-60 22-29 105 16 6 35-92M169 99v25l60 22 29 105-16 6-35-92M91 150l7 82-13 101h27l23-94h30l23 94h27l-13-101 7-82M98 232h104M115 139l35 17 35-17M150 156v76" />
        
        {/* Thai Meridian lines (เส้นประธาน) */}
        <path d="M97 174q53 30 106 0M101 208q49 17 98 0M132 121l18 17 18-17" strokeDasharray="3 6" opacity="0.6" />
      </g>

      {/* Acupressure Nodes (จุดกดจุดกายวิภาค) */}
      {ys.flatMap((y, i) =>
        [115 + i * 5, 185 - i * 5].map((x, j) => (
          <g key={`${i}-${j}`}>
            <circle cx={x} cy={y} r="14" fill="currentColor" opacity="0.15" />
            <circle cx={x} cy={y} r="4.5" fill="currentColor" />
          </g>
        ))
      )}
    </svg>
  );
}
