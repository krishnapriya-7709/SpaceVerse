import React from 'react';

export const RecruitBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="50%" stopColor="#f2c14e" />
        <stop offset="100%" stopColor="#b8860b" />
      </linearGradient>
      <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <radialGradient id="navyBg" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#142c5c" />
        <stop offset="60%" stopColor="#081836" />
        <stop offset="100%" stopColor="#020919" />
      </radialGradient>
      <filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#goldGrad)" filter="url(#badgeGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#silverGrad)" />
    <polygon points="100,18 166,40 166,118 100,174 34,118 34,40" fill="url(#navyBg)" />
    <circle cx="60" cy="55" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="140" cy="58" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="48" cy="85" r="1.2" fill="#fff" opacity="0.7" />
    <circle cx="152" cy="88" r="1.2" fill="#fff" opacity="0.7" />
    <circle cx="70" cy="110" r="1.2" fill="#fff" opacity="0.8" />
    <circle cx="130" cy="112" r="1.2" fill="#fff" opacity="0.8" />
    <ellipse cx="100" cy="88" rx="55" ry="18" stroke="url(#goldGrad)" strokeWidth="2.5" fill="none" transform="rotate(-20, 100, 88)" opacity="0.85" />
    <g transform="translate(100, 84)">
      <path d="M-4,18 Q0,38 0,42 Q0,38 4,18 Z" fill="#4fe3d4" opacity="0.85" />
      <path d="M-2,18 Q0,30 0,34 Q0,30 2,18 Z" fill="#fff" />
      <path d="M0,-34 C6,-24 8,-2 8,16 L-8,16 C-8,-2 -6,-24 0,-34 Z" fill="url(#silverGrad)" />
      <path d="M0,-34 C4,-26 5,-16 5,-10 L-5,-10 C-5,-16 -4,-26 0,-34 Z" fill="url(#goldGrad)" />
      <circle cx="0" cy="-2" r="3.2" fill="#081836" stroke="url(#goldGrad)" strokeWidth="1.2" />
      <path d="M-8,6 L-16,18 L-8,17 Z" fill="url(#goldGrad)" />
      <path d="M8,6 L16,18 L8,17 Z" fill="url(#goldGrad)" />
    </g>
    <g transform="translate(100, 150)">
      <path d="M-68,-12 L68,-12 L62,12 L-62,12 Z" fill="#040e24" stroke="url(#goldGrad)" strokeWidth="2" />
      <text x="0" y="4" fill="#ffffff" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" letterSpacing="1.5" textAnchor="middle">
        NEW RECRUIT
      </text>
    </g>
    <text x="100" y="34" fill="url(#goldGrad)" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="9" letterSpacing="2" textAnchor="middle">
      GALAXY-X
    </text>
  </svg>
);

export const SatelliteBuilderBadgeSVG: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="satGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="satCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#4fe3d4" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
      <radialGradient id="satNavyGrad" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#142c5c" />
        <stop offset="60%" stopColor="#081836" />
        <stop offset="100%" stopColor="#020919" />
      </radialGradient>
      <filter id="satBadgeGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <polygon points="100,6 182,32 182,126 100,194 18,126 18,32" fill="url(#satCyanGrad)" filter="url(#satBadgeGlow)" />
    <polygon points="100,12 174,36 174,122 100,184 26,122 26,36" fill="url(#satGoldGrad)" />
    <polygon points="100,18 166,40 166,118 100,174 34,118 34,40" fill="url(#satNavyGrad)" />
    <circle cx="55" cy="52" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="145" cy="55" r="1.5" fill="#fff" opacity="0.9" />
    <circle cx="48" cy="82" r="1.2" fill="#4fe3d4" opacity="0.8" />
    <circle cx="152" cy="85" r="1.2" fill="#4fe3d4" opacity="0.8" />
    <circle cx="68" cy="112" r="1.2" fill="#fff" opacity="0.8" />
    <circle cx="132" cy="115" r="1.2" fill="#fff" opacity="0.8" />
    <ellipse cx="100" cy="88" rx="58" ry="18" stroke="url(#satCyanGrad)" strokeWidth="2" fill="none" transform="rotate(-18, 100, 88)" opacity="0.85" strokeDasharray="4 2" />
    <g transform="translate(100, 85)">
      <rect x="-54" y="-10" width="28" height="20" rx="2" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="1.5" />
      <line x1="-40" y1="-10" x2="-40" y2="10" stroke="#38bdf8" strokeWidth="1" />
      <line x1="-54" y1="0" x2="-26" y2="0" stroke="#38bdf8" strokeWidth="1" />
      <line x1="-26" y1="0" x2="-14" y2="0" stroke="#94a3b8" strokeWidth="2" />
      <rect x="26" y="-10" width="28" height="20" rx="2" fill="#1e3a8a" stroke="#38bdf8" strokeWidth="1.5" />
      <line x1="40" y1="-10" x2="40" y2="10" stroke="#38bdf8" strokeWidth="1" />
      <line x1="26" y1="0" x2="54" y2="0" stroke="#38bdf8" strokeWidth="1" />
      <line x1="14" y1="0" x2="26" y2="0" stroke="#94a3b8" strokeWidth="2" />
      <rect x="-14" y="-14" width="28" height="28" rx="3" fill="url(#satGoldGrad)" stroke="#ffffff" strokeWidth="1.5" />
      <rect x="-9" y="-9" width="18" height="18" fill="#0c1a38" stroke="#ffd700" strokeWidth="1" />
      <path d="M-8,-16 Q0,-24 8,-16" stroke="#ffffff" strokeWidth="2" fill="none" />
      <line x1="0" y1="-14" x2="0" y2="-20" stroke="#4fe3d4" strokeWidth="1.5" />
      <circle cx="0" cy="-21" r="1.8" fill="#ffd700" />
      <rect x="-5" y="14" width="10" height="6" fill="#334155" stroke="#4fe3d4" strokeWidth="1" />
      <circle cx="0" cy="18" r="2.5" fill="#38bdf8" />
      <polygon points="-3,21 3,21 7,32 -7,32" fill="url(#satCyanGrad)" opacity="0.4" />
    </g>
    <text x="100" y="34" fill="url(#satGoldGrad)" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="8.5" letterSpacing="1.8" textAnchor="middle">
      SPACEVERSE • GALAXY-X
    </text>
    <g transform="translate(100, 150)">
      <path d="M-72,-12 L72,-12 L65,12 L-65,12 Z" fill="#030b1c" stroke="url(#satCyanGrad)" strokeWidth="2" />
      <text x="0" y="4" fill="#ffffff" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="10" letterSpacing="1.2" textAnchor="middle">
        SATELLITE BUILDER
      </text>
    </g>
  </svg>
);

export const SatelliteIllustrationSVG: React.FC<{ className?: string }> = ({ className = 'w-20 h-14' }) => (
  <svg className={className} viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="illGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="illSolar" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    {/* Orbital arc */}
    <ellipse cx="80" cy="54" rx="70" ry="20" stroke="#4fe3d4" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 4" />
    {/* Left Solar Wing */}
    <rect x="12" y="38" width="38" height="24" rx="2" fill="url(#illSolar)" stroke="#38bdf8" strokeWidth="1.4" />
    <line x1="25" y1="38" x2="25" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="38" y1="38" x2="38" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="12" y1="50" x2="50" y2="50" stroke="#60a5fa" strokeWidth="1" />
    <line x1="50" y1="50" x2="64" y2="50" stroke="#cbd5e1" strokeWidth="2.5" />
    {/* Right Solar Wing */}
    <rect x="110" y="38" width="38" height="24" rx="2" fill="url(#illSolar)" stroke="#38bdf8" strokeWidth="1.4" />
    <line x1="122" y1="38" x2="122" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="135" y1="38" x2="135" y2="62" stroke="#60a5fa" strokeWidth="1" />
    <line x1="110" y1="50" x2="148" y2="50" stroke="#60a5fa" strokeWidth="1" />
    <line x1="96" y1="50" x2="110" y2="50" stroke="#cbd5e1" strokeWidth="2.5" />
    {/* Octagonal Gold MLI Core */}
    <rect x="64" y="32" width="32" height="36" rx="4" fill="url(#illGold)" stroke="#f8fafc" strokeWidth="1.5" />
    <rect x="70" y="39" width="20" height="12" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
    <circle cx="76" cy="45" r="2" fill="#4fe3d4" />
    <circle cx="84" cy="45" r="2" fill="#f2c14e" />
    {/* Zenith Comms Dish */}
    <path d="M70,22 Q80,12 90,22" stroke="#f8fafc" strokeWidth="2.2" fill="none" />
    <line x1="80" y1="32" x2="80" y2="21" stroke="#4fe3d4" strokeWidth="2" />
    <circle cx="80" cy="17" r="2.2" fill="#fde047" />
    {/* Nadir Optical Lens */}
    <rect x="73" y="68" width="14" height="8" rx="1.5" fill="#1e293b" stroke="#4fe3d4" strokeWidth="1.2" />
    <circle cx="80" cy="74" r="3" fill="#38bdf8" />
  </svg>
);
