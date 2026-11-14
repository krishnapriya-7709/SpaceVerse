import React from 'react';
import { RocketPartId } from '../data/spaceverseData';

interface RocketComponentObjectSVGProps {
  id: RocketPartId;
  size?: number;
  className?: string;
}

export const RocketComponentObjectSVG: React.FC<RocketComponentObjectSVGProps> = ({
  id,
  size = 52,
  className = '',
}) => {
  switch (id) {
    case 'first_stage_structure':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="21" y="7" width="22" height="50" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.6" />
          <rect x="21" y="13" width="22" height="4" fill="#0f172a" />
          <rect x="29.5" y="17" width="5" height="36" rx="1" fill="#334155" />
          <rect x="21" y="51" width="22" height="4" fill="#475569" />
          <line x1="25" y1="22" x2="25" y2="48" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
          <line x1="39" y1="22" x2="39" y2="48" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
        </svg>
      );

    case 'first_stage_tanks':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Upper LOX Cryo Tank */}
          <rect x="19" y="8" width="26" height="21" rx="8" fill="#cbd5e1" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="19" y1="18" x2="45" y2="18" stroke="#0284c7" strokeWidth="2" />
          {/* Lower RP-1 Fuel Tank */}
          <rect x="19" y="34" width="26" height="22" rx="8" fill="#94a3b8" stroke="#f59e0b" strokeWidth="1.5" />
          <line x1="19" y1="45" x2="45" y2="45" stroke="#d97706" strokeWidth="2" />
          {/* Cryo Transfer Downcomer Pipe */}
          <rect x="29.5" y="26" width="5" height="12" rx="1.5" fill="#f59e0b" stroke="#fde68a" strokeWidth="0.9" />
        </svg>
      );

    case 'first_stage_engines':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Octaweb Base Heatshield */}
          <rect x="12" y="16" width="40" height="14" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1.6" />
          {/* 5 visible nozzles representing 9-engine cluster */}
          {[17, 24.5, 32, 39.5, 47].map((cx, idx) => (
            <polygon
              key={cx}
              points={`${cx - 2.6},30 ${cx + 2.6},30 ${cx + 4.2},46 ${cx - 4.2},46`}
              fill={idx === 2 ? '#475569' : '#334155'}
              stroke="#cbd5e1"
              strokeWidth="1.1"
            />
          ))}
          <ellipse cx="32" cy="49" rx="16" ry="3.5" fill="#38bdf8" opacity="0.35" />
        </svg>
      );

    case 'interstage':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="16" y="15" width="32" height="34" rx="3" fill="#111827" stroke="#64748b" strokeWidth="1.8" />
          <rect x="16" y="21" width="32" height="3.5" fill="#4fe3d4" opacity="0.85" />
          <rect x="16" y="40" width="32" height="3.5" fill="#94a3b8" opacity="0.65" />
          {[22, 32, 42].map((rx) => (
            <line key={rx} x1={rx} y1="16" x2={rx} y2="48" stroke="#334155" strokeWidth="1.6" />
          ))}
        </svg>
      );

    case 'second_stage_body':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <rect x="18" y="10" width="28" height="42" rx="3" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.6" />
          <rect x="18" y="10" width="28" height="6" rx="2" fill="#334155" />
          <rect x="18" y="44" width="28" height="5" fill="#1e293b" />
          {/* Internal cryo pressure lines */}
          <line x1="24" y1="20" x2="40" y2="20" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="24" y1="30" x2="40" y2="30" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="29.5" y="16" width="5" height="28" fill="#64748b" opacity="0.45" />
        </svg>
      );

    case 'second_stage_engine':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Gimbal Mount */}
          <rect x="24" y="10" width="16" height="8" rx="2" fill="#475569" stroke="#cbd5e1" strokeWidth="1.2" />
          <path d="M26 18 L22 25 L42 25 L38 18 Z" fill="#d97706" stroke="#fde68a" strokeWidth="1" />
          {/* Wide Niobium Vacuum Bell Nozzle */}
          <path d="M23 25 C20 33, 14 43, 13 52 L51 52 C50 43, 44 33, 41 25 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.6" />
          <ellipse cx="32" cy="52" rx="19" ry="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          <line x1="21" y1="36" x2="43" y2="36" stroke="#475569" strokeWidth="1.2" />
          <line x1="17" y1="44" x2="47" y2="44" stroke="#475569" strokeWidth="1.2" />
        </svg>
      );

    case 'avionics':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Guidance Collar Ring */}
          <ellipse cx="32" cy="32" rx="22" ry="11" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
          <ellipse cx="32" cy="32" rx="14" ry="6.5" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />
          {/* Telemetry Flight Computer Chips */}
          <rect x="20" y="25" width="9" height="7" rx="1" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.9" />
          <rect x="35" y="25" width="9" height="7" rx="1" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.9" />
          <circle cx="24" cy="36" r="2" fill="#4fe3d4" />
          <circle cx="32" cy="37" r="2" fill="#34d399" />
          <circle cx="40" cy="36" r="2" fill="#fbbf24" />
        </svg>
      );

    case 'grid_fins':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Hinge Bracket */}
          <rect x="10" y="24" width="10" height="16" rx="2" fill="#475569" stroke="#cbd5e1" strokeWidth="1.3" />
          {/* Titanium Waffle Lattice Fin */}
          <rect x="20" y="14" width="34" height="36" rx="3" fill="#334155" stroke="#e2e8f0" strokeWidth="1.8" />
          {[28, 37, 45].map((gx) => (
            <line key={gx} x1={gx} y1="15" x2={gx} y2="49" stroke="#94a3b8" strokeWidth="1.4" />
          ))}
          {[23, 32, 41].map((gy) => (
            <line key={gy} x1="21" y1={gy} x2="53" y2={gy} stroke="#94a3b8" strokeWidth="1.4" />
          ))}
        </svg>
      );

    case 'landing_legs':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Booster base bracket */}
          <rect x="24" y="16" width="16" height="34" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.2" />
          {/* Folded/Deployed Carbon-Fiber A-Frame Legs */}
          <polygon points="24,48 8,54 22,19 26,21" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.4" />
          <polygon points="40,48 56,54 42,19 38,21" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.4" />
          {/* Hydraulic Telescoping Struts */}
          <line x1="24" y1="30" x2="14" y2="49" stroke="#e2e8f0" strokeWidth="1.6" />
          <line x1="40" y1="30" x2="50" y2="49" stroke="#e2e8f0" strokeWidth="1.6" />
        </svg>
      );

    case 'payload_fairing':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Split Clamshell Aerodynamic Nose Cone */}
          <path
            d="M17 54 L17 31 C17 17, 25 8, 31 6 L31 54 Z"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <path
            d="M47 54 L47 31 C47 17, 39 8, 33 6 L33 54 Z"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          {/* Clamshell Seam & Latches */}
          <line x1="32" y1="7" x2="32" y2="54" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 2" />
          <rect x="16" y="48" width="32" height="6" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
        </svg>
      );
  }
};
