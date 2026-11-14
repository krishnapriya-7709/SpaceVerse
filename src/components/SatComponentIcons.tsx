import React from 'react';
import { SatSubsystemId } from '../data/spaceverseData';

interface SatComponentObjectSVGProps {
  id: SatSubsystemId;
  size?: number;
  className?: string;
}

export const SatComponentObjectSVG: React.FC<SatComponentObjectSVGProps> = ({
  id,
  size = 52,
  className = '',
}) => {
  switch (id) {
    case 'bus':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <linearGradient id="busGold" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="busAl" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          {/* Top collar ring */}
          <ellipse cx="32" cy="15" rx="18" ry="5.5" fill="url(#busAl)" stroke="#94a3b8" strokeWidth="1.2" />
          {/* Octagonal MLI Chassis Body */}
          <polygon points="15,17 24,13 40,13 49,17 49,47 40,51 24,51 15,47" fill="url(#busGold)" stroke="#f59e0b" strokeWidth="1.2" />
          {/* Vertical Longerons */}
          <rect x="22.5" y="13" width="2.5" height="38" fill="#cbd5e1" rx="1" />
          <rect x="39" y="13" width="2.5" height="38" fill="#cbd5e1" rx="1" />
          {/* Recessed Equipment Bays */}
          <rect x="27" y="21" width="10" height="8" rx="1.2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
          <rect x="27" y="33" width="10" height="7" rx="1.2" fill="#0f172a" stroke="#64748b" strokeWidth="0.9" />
          {/* Bottom adapter ring */}
          <ellipse cx="32" cy="49" rx="16" ry="4.5" fill="none" stroke="#e2e8f0" strokeWidth="2" />
        </svg>
      );

    case 'battery':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Housing tray */}
          <rect x="10" y="18" width="44" height="30" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="1.6" />
          {/* Cylindrical Li-Ion Cells */}
          {[16, 23, 30, 37, 44].map((cx) => (
            <g key={cx}>
              <rect x={cx - 2.5} y="22" width="5" height="22" rx="2" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.9" />
              <rect x={cx - 1.8} y="19.5" width="3.6" height="3" rx="0.8" fill="#f59e0b" />
            </g>
          ))}
          {/* High-voltage orange busbar */}
          <path d="M16 19 C24 12, 40 12, 46 19" stroke="#f97316" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="19" r="2.2" fill="#fb923c" />
          <circle cx="46" cy="19" r="2.2" fill="#fb923c" />
        </svg>
      );

    case 'computer':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Radiation-shielded aluminum/titanium enclosure */}
          <rect x="12" y="14" width="40" height="36" rx="3.5" fill="#475569" stroke="#cbd5e1" strokeWidth="1.6" />
          {/* Heat-sink cooling fins */}
          {[17, 22, 27, 32, 37, 42, 47].map((fx) => (
            <rect key={fx} x={fx - 1} y="17" width="2.2" height="22" rx="0.7" fill="#cbd5e1" />
          ))}
          {/* Copper backplane */}
          <rect x="17" y="41" width="30" height="5" rx="1.2" fill="#d97706" />
          {/* Telemetry status LEDs */}
          <circle cx="19" cy="19" r="2" fill="#38bdf8" />
          <circle cx="25" cy="19" r="2" fill="#34d399" />
          <circle cx="31" cy="19" r="2" fill="#4fe3d4" />
        </svg>
      );

    case 'solar':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Deployment Yoke */}
          <path d="M8 32 L18 22 M8 32 L18 42" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="8" cy="32" r="3.5" fill="#94a3b8" stroke="#e2e8f0" strokeWidth="1" />
          {/* 3-Segment Photovoltaic Wing */}
          {[18, 32, 46].map((px) => (
            <g key={px}>
              <rect x={px} y="16" width="12" height="32" rx="1.5" fill="#1e3a8a" stroke="#94a3b8" strokeWidth="1.4" />
              <line x1={px + 6} y1="17" x2={px + 6} y2="47" stroke="#60a5fa" strokeWidth="0.8" />
              <line x1={px + 1} y1="24" x2={px + 11} y2="24" stroke="#60a5fa" strokeWidth="0.7" />
              <line x1={px + 1} y1="32" x2={px + 11} y2="32" stroke="#60a5fa" strokeWidth="0.7" />
              <line x1={px + 1} y1="40" x2={px + 11} y2="40" stroke="#60a5fa" strokeWidth="0.7" />
            </g>
          ))}
          {/* Hinges */}
          <rect x="30" y="21" width="2" height="4" fill="#f59e0b" />
          <rect x="30" y="39" width="2" height="4" fill="#f59e0b" />
          <rect x="44" y="21" width="2" height="4" fill="#f59e0b" />
          <rect x="44" y="39" width="2" height="4" fill="#f59e0b" />
        </svg>
      );

    case 'camera':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Top mounting flange */}
          <rect x="18" y="10" width="28" height="6" rx="2" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.2" />
          {/* Carbon telescope barrel */}
          <polygon points="20,16 44,16 47,42 17,42" fill="#1e293b" stroke="#64748b" strokeWidth="1.4" />
          {/* Gold MLI thermal band */}
          <rect x="18.5" y="21" width="27" height="10" fill="#d97706" stroke="#fbbf24" strokeWidth="0.9" />
          {/* Aperture ring & sapphire objective lens */}
          <ellipse cx="32" cy="45" rx="16" ry="7" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
          <ellipse cx="32" cy="45" rx="12" ry="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
          {/* Secondary mirror spider vanes */}
          <line x1="20" y1="45" x2="44" y2="45" stroke="#1e293b" strokeWidth="1.6" />
          <line x1="32" y1="40" x2="32" y2="50" stroke="#1e293b" strokeWidth="1.6" />
          <circle cx="32" cy="45" r="3" fill="#94a3b8" />
        </svg>
      );

    case 'antenna':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Gimbal mast */}
          <rect x="29" y="42" width="6" height="14" rx="1.5" fill="#94a3b8" />
          <rect x="24" y="53" width="16" height="5" rx="2" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
          {/* Parabolic dish */}
          <path d="M12 29 C16 44, 48 44, 52 29 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <ellipse cx="32" cy="29" rx="20" ry="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.4" />
          {/* Feed struts + sub-reflector */}
          <line x1="17" y1="29" x2="32" y2="12" stroke="#64748b" strokeWidth="1.6" />
          <line x1="47" y1="29" x2="32" y2="12" stroke="#64748b" strokeWidth="1.6" />
          <line x1="32" y1="30" x2="32" y2="14" stroke="#d97706" strokeWidth="2.2" />
          <polygon points="27,12 37,12 32,16" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" />
        </svg>
      );

    case 'adcs':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Structural ADCS frame */}
          <rect x="12" y="14" width="40" height="36" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
          {/* 3 Reaction Flywheels */}
          <circle cx="24" cy="26" r="7.5" fill="#d97706" stroke="#fde68a" strokeWidth="1.4" />
          <circle cx="24" cy="26" r="2.6" fill="#e2e8f0" />
          <circle cx="40" cy="26" r="7.5" fill="#d97706" stroke="#fde68a" strokeWidth="1.4" />
          <circle cx="40" cy="26" r="2.6" fill="#e2e8f0" />
          <circle cx="28" cy="40" r="7" fill="#b45309" stroke="#fbbf24" strokeWidth="1.4" />
          <circle cx="28" cy="40" r="2.4" fill="#e2e8f0" />
          {/* Optical Star Tracker */}
          <polygon points="39,35 49,39 45,47 36,42" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.3" />
        </svg>
      );

    case 'thermal':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Radiator frame */}
          <rect x="14" y="11" width="36" height="42" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
          {/* Silver optical reflector louver blades */}
          {[16, 22, 28, 34, 40, 46].map((ly) => (
            <rect key={ly} x="18" y={ly} width="28" height="3.6" rx="1" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.6" />
          ))}
          {/* Copper heat-pipe manifold loop */}
          <rect x="20" y="14" width="24" height="36" rx="3" stroke="#f59e0b" strokeWidth="2.4" fill="none" />
        </svg>
      );

    case 'propulsion':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          {/* Aft manifold */}
          <rect x="14" y="14" width="36" height="22" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.3" />
          {/* Twin spherical titanium tanks */}
          <circle cx="24" cy="22" r="8" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
          <ellipse cx="24" cy="22" rx="8" ry="2.2" stroke="#d97706" strokeWidth="1.4" fill="none" />
          <circle cx="40" cy="22" r="8" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
          <ellipse cx="40" cy="22" rx="8" ry="2.2" stroke="#d97706" strokeWidth="1.4" fill="none" />
          {/* Feed pipes */}
          <path d="M24 30 L22 39 M40 30 L42 39" stroke="#f59e0b" strokeWidth="2" />
          {/* Bell thruster nozzles */}
          <polygon points="18,38 26,38 29,51 15,51" fill="#475569" stroke="#cbd5e1" strokeWidth="1.2" />
          <polygon points="38,38 46,38 49,51 35,51" fill="#475569" stroke="#cbd5e1" strokeWidth="1.2" />
          {/* Ion glow hints */}
          <polygon points="17,51 27,51 22,58" fill="#38bdf8" opacity="0.7" />
          <polygon points="37,51 47,51 42,58" fill="#38bdf8" opacity="0.7" />
        </svg>
      );
  }
};
