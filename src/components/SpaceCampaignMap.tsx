import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CAMPAIGN_LEVELS, CampaignLevel, PlayerState } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';
import { RecruitBadgeSVG, SatelliteBuilderBadgeSVG, SatelliteIllustrationSVG } from './BadgesSVG';

interface SpaceCampaignMapProps {
  playerState: PlayerState;
  activeLevelIdx: number;
  tutStep: number;
  onClose: () => void;
  onStartTraining: () => void;
  onSelectLevel: (idx: number) => void;
}

interface NodeCoord {
  lvl: CampaignLevel;
  idx: number;
  xPct: number; // 0..100 inside SVG viewBox 800px wide
  yPx: number;  // 0..1240 inside SVG viewBox 1240px tall
}

// Compute winding S-curve orbital path coordinates from Level 1 (bottom, near Earth) up to Level 10 (top horizon)
const MAP_W = 800;
const MAP_H = 1240;

function computeSpacePathNodes(): NodeCoord[] {
  // Subtle perspective taper toward upper horizon + smooth Candy-Saga S-curve
  const raw: { x: number; y: number }[] = [
    { x: 50, y: 1125 }, // Lvl 1 - LEO Assembly Pad
    { x: 36, y: 1015 }, // Lvl 2 - Stratosphere
    { x: 58, y: 905 },  // Lvl 3 - Mesosphere
    { x: 40, y: 795 },  // Lvl 4 - Mesopause
    { x: 60, y: 685 },  // Lvl 5 - Karman Line
    { x: 38, y: 575 },  // Lvl 6 - Thermosphere
    { x: 57, y: 465 },  // Lvl 7 - Ionosphere
    { x: 42, y: 355 },  // Lvl 8 - LEO Staging
    { x: 56, y: 245 },  // Lvl 9 - Deep Orbit
    { x: 48, y: 130 },  // Lvl 10 - Trans-Lunar Horizon Summit
  ];

  return CAMPAIGN_LEVELS.map((lvl, idx) => ({
    lvl,
    idx,
    xPct: raw[idx]?.x ?? 50,
    yPx: raw[idx]?.y ?? 1100 - idx * 100,
  }));
}

function buildSmoothOrbitalPathD(nodes: NodeCoord[]): string {
  if (nodes.length === 0) return '';
  const pts = nodes.map((n) => ({ x: (n.xPct / 100) * MAP_W, y: n.yPx }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midY = (p0.y + p1.y) / 2;
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export const SpaceCampaignMap: React.FC<SpaceCampaignMapProps> = ({
  playerState,
  activeLevelIdx,
  tutStep,
  onClose,
  onStartTraining,
  onSelectLevel,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const nodes = useMemo(() => computeSpacePathNodes(), []);
  const pathD = useMemo(() => buildSmoothOrbitalPathD(nodes), []);

  // Highest unlocked level index (default frontier)
  const frontierIdx = useMemo(() => {
    let highestUnlocked = 0;
    for (let i = 0; i < CAMPAIGN_LEVELS.length; i++) {
      const lvlNum = CAMPAIGN_LEVELS[i].lvl;
      if (i === 0 || playerState.completedLevels.includes(lvlNum - 1)) {
        highestUnlocked = i;
      }
    }
    return highestUnlocked;
  }, [playerState.completedLevels]);

  const [selectedIdx, setSelectedIdx] = useState<number>(() =>
    Math.min(frontierIdx, Math.max(0, activeLevelIdx))
  );

  // Focus active/frontier node & scroll it cleanly into view on open
  useEffect(() => {
    const target = Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, frontierIdx));
    setSelectedIdx(target);
    const sc = scrollContainerRef.current;
    if (sc && nodes[target]) {
      window.setTimeout(() => {
        const containerH = sc.clientHeight;
        const targetScrollTop = Math.max(0, nodes[target].yPx - containerH * 0.58);
        sc.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }, 60);
    }
  }, [frontierIdx, nodes]);

  const selectedLevel = CAMPAIGN_LEVELS[selectedIdx] || CAMPAIGN_LEVELS[0];
  const isSelCompleted = playerState.completedLevels.includes(selectedLevel.lvl);
  const isSelUnlocked = selectedIdx === 0 || playerState.completedLevels.includes(selectedLevel.lvl - 1);
  const selStatusLabel = isSelCompleted ? 'COMPLETED ✓' : isSelUnlocked ? 'UNLOCKED' : 'LOCKED 🔒';
  const selScore = playerState.levelScores[selectedLevel.lvl] ?? 0;

  return (
    <div className="w-full max-w-5xl h-[92vh] rounded-3xl bg-[#050c1c] border border-cyan-400/40 shadow-[0_28px_80px_rgba(0,0,0,0.92)] flex flex-col overflow-hidden">
      {/* TOP BAR (Candy-Saga Style Status Header adapted for GALAXY-X Space Command) */}
      <div className="h-16 px-4 md:px-6 bg-gradient-to-r from-[#0a1936] via-[#0e2348] to-[#0a1936] border-b border-cyan-400/35 flex items-center justify-between gap-3 shrink-0 shadow-[0_6px_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="px-3 py-1 rounded-full bg-[#061126] border border-cyan-400/45 flex items-center gap-1.5 text-xs font-mono-tech font-bold text-[#4fe3d4] shadow-inner">
            <span>₡</span>
            <span className="tabular-nums">{playerState.grantCredits.toLocaleString()}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#061126] border border-amber-400/45 flex items-center gap-1.5 text-xs font-mono-tech font-bold text-amber-300 shadow-inner">
            <span>★</span>
            <span className="tabular-nums">{playerState.starCredits.toLocaleString()} SC</span>
          </div>
        </div>

        {/* Center Cadet Emblem & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-[#061126] border-2 border-[#4fe3d4] flex items-center justify-center shadow-[0_0_16px_rgba(79,227,212,0.35)] shrink-0">
            {playerState.badges.includes('SATELLITE_BUILDER') ? (
              <SatelliteBuilderBadgeSVG size={36} />
            ) : (
              <RecruitBadgeSVG size={36} />
            )}
          </div>
          <div className="hidden sm:block">
            <div className="text-[10px] font-mono-tech uppercase tracking-[2px] text-[#4fe3d4]">
              GALAXY-X ORBITAL CAMPAIGN
            </div>
            <div className="font-display text-sm md:text-base font-extrabold text-white leading-tight">
              SPACE MISSION ROADMAP
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[11px] font-mono-tech font-bold text-emerald-300">
            {playerState.completedLevels.length} / 10
          </div>
          <button
            onClick={() => {
              SFX.click();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/20 text-xs font-bold text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* MAIN BODY: Winding Space Saga Trail + Sticky Right/Bottom Selected Mission Deck */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_340px] overflow-hidden">
        {/* WINDING S-CURVE SPACE & SATELLITE TRAIL */}
        <div
          ref={scrollContainerRef}
          className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[#040a17]"
          style={{
            background:
              'linear-gradient(180deg, #1a1238 0%, #101e4a 20%, #091738 55%, #06132c 82%, #0a254d 100%)',
          }}
        >
          <div className="relative w-full max-w-[780px] mx-auto" style={{ height: `${MAP_H}px` }}>
            {/* Cosmic Scenery + Glowing Orbital Road SVG */}
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <defs>
                {/* Upper Horizon Solar Nebula Glow (like warm golden sky at top of saga map) */}
                <radialGradient id="topHorizonGlow" cx="50%" cy="6%" r="55%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.42" />
                  <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#040a17" stopOpacity="0" />
                </radialGradient>

                {/* Bottom Earth Atmosphere Limb Glow */}
                <radialGradient id="earthGlow" cx="50%" cy="106%" r="52%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
                  <stop offset="55%" stopColor="#0ea5e9" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#040a17" stopOpacity="0" />
                </radialGradient>

                {/* Luminous Orbital Ribbon */}
                <linearGradient id="orbitRibbonGrad" x1="0" y1="1240" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#4fe3d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.55" />
                </linearGradient>

                {/* Flank Nebula Belts */}
                <linearGradient id="nebulaFlankLeft" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0f254d" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#071329" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              <rect width={MAP_W} height={MAP_H} fill="url(#topHorizonGlow)" />
              <rect width={MAP_W} height={MAP_H} fill="url(#earthGlow)" />

              {/* Twinkling Deep Space Starfield */}
              {[
                [72, 95, 2.2], [185, 62, 1.5], [640, 88, 2.4], [735, 165, 1.7],
                [110, 260, 1.8], [690, 295, 2.1], [85, 420, 2.5], [715, 455, 1.6],
                [140, 560, 1.9], [655, 610, 2.3], [95, 740, 2.1], [725, 780, 1.8],
                [160, 895, 1.6], [670, 945, 2.4], [105, 1055, 2.0], [705, 1095, 1.8],
                [265, 190, 1.3], [540, 320, 1.4], [240, 510, 1.5], [565, 715, 1.3],
                [250, 860, 1.5], [530, 1020, 1.4],
              ].map(([sx, sy, sr], idx) => (
                <circle
                  key={idx}
                  cx={sx}
                  cy={sy}
                  r={sr}
                  fill={idx % 3 === 0 ? '#fde68a' : idx % 2 === 0 ? '#bae6fd' : '#ffffff'}
                  opacity={0.75}
                />
              ))}

              {/* Subtle Cosmic Dust Banks Flanking the Trajectory (Space analogue to side terrain) */}
              <path
                d="M0 0 L215 0 C235 280, 155 560, 210 850 C245 1030, 180 1160, 195 1240 L0 1240 Z"
                fill="url(#nebulaFlankLeft)"
                opacity="0.45"
              />
              <path
                d="M800 0 L585 0 C560 260, 645 550, 595 830 C560 1020, 620 1150, 605 1240 L800 1240 Z"
                fill="url(#nebulaFlankLeft)"
                opacity="0.45"
              />

              {/* SCENERY OBJECTS: Planets, Moons, Space Stations & Relay Satellites */}
              {/* Top Summit Crescent Moon / Lunar Target near Level 10 */}
              <g transform="translate(392, 62)">
                <circle cx="0" cy="0" r="38" fill="#cbd5e1" opacity="0.24" />
                <circle cx="0" cy="0" r="30" fill="#e2e8f0" />
                <circle cx="-10" cy="-7" r="6" fill="#94a3b8" opacity="0.55" />
                <circle cx="11" cy="9" r="8" fill="#94a3b8" opacity="0.45" />
                <circle cx="8" cy="-14" r="4" fill="#94a3b8" opacity="0.5" />
              </g>

              {/* Left Scenery #1: Ringed Exoplanet near top-left */}
              <g transform="translate(115, 225) rotate(-14)">
                <ellipse cx="0" cy="0" rx="76" ry="18" fill="none" stroke="#fbbf24" strokeWidth="5" opacity="0.45" />
                <circle cx="0" cy="0" r="36" fill="#f59e0b" />
                <path d="M-34 -8 Q0 -2 34 -8" stroke="#fde68a" strokeWidth="4" fill="none" opacity="0.7" />
                <path d="M-32 10 Q0 16 32 10" stroke="#b45309" strokeWidth="4" fill="none" opacity="0.7" />
                <ellipse cx="0" cy="0" rx="76" ry="18" fill="none" stroke="#fde68a" strokeWidth="2.5" strokeDasharray="120 140" />
              </g>

              {/* Right Scenery #1: Orbiting Relay Satellite near Levels 8-9 */}
              <g transform="translate(682, 290) rotate(18)">
                <rect x="-46" y="-12" width="32" height="24" rx="2" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1.5" />
                <rect x="14" y="-12" width="32" height="24" rx="2" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1.5" />
                <rect x="-12" y="-14" width="24" height="28" rx="3" fill="#f59e0b" stroke="#fde68a" strokeWidth="1.5" />
                <path d="M-9 -20 C-4 -30, 4 -30, 9 -20 Z" fill="#e2e8f0" />
              </g>

              {/* Left Scenery #2: Deep Space Telescope / Observatory Satellite near Levels 5-6 */}
              <g transform="translate(112, 600) rotate(-18)">
                <rect x="-48" y="-10" width="34" height="20" rx="2" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.4" />
                <rect x="14" y="-10" width="34" height="20" rx="2" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.4" />
                <rect x="-11" y="-18" width="22" height="36" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="1.6" />
                <circle cx="0" cy="18" r="7" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1.5" />
              </g>

              {/* Right Scenery #2: Blue-Teal Ice Planet & Asteroid Belt near Levels 4-6 */}
              <g transform="translate(685, 560)">
                <circle cx="0" cy="0" r="42" fill="#0ea5e9" />
                <path d="M-38 -12 Q-5 -20 38 -8" stroke="#7dd3fc" strokeWidth="5" fill="none" opacity="0.6" />
                <path d="M-36 14 Q4 6 36 16" stroke="#0369a1" strokeWidth="6" fill="none" opacity="0.65" />
                <circle cx="-55" cy="48" r="7" fill="#64748b" />
                <circle cx="-72" cy="30" r="4.5" fill="#94a3b8" />
              </g>

              {/* Left Scenery #3: Launch Booster / Sounding Rocket near Levels 2-3 */}
              <g transform="translate(108, 920) rotate(22)">
                <polygon points="0,-32 11,-8 11,24 -11,24 -11,-8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                <polygon points="-11,10 -20,28 -11,24" fill="#ef4444" />
                <polygon points="11,10 20,28 11,24" fill="#ef4444" />
                <circle cx="0" cy="-2" r="5" fill="#38bdf8" />
                <polygon points="-7,24 7,24 0,44" fill="#fbbf24" opacity="0.85" />
              </g>

              {/* Right Scenery #3: Communications Satellite near Levels 1-3 */}
              <g transform="translate(680, 910) rotate(-14)">
                <rect x="-44" y="-11" width="30" height="22" rx="2" fill="#1e40af" stroke="#60a5fa" strokeWidth="1.5" />
                <rect x="14" y="-11" width="30" height="22" rx="2" fill="#1e40af" stroke="#60a5fa" strokeWidth="1.5" />
                <polygon points="-12,-14 12,-14 15,14 -15,14" fill="#d97706" stroke="#fde68a" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="5" fill="#4fe3d4" />
              </g>

              {/* Earth Blue Horizon Curve at Bottom */}
              <ellipse cx="400" cy="1275" rx="520" ry="125" fill="#0369a1" opacity="0.5" />
              <ellipse cx="400" cy="1280" rx="520" ry="120" fill="none" stroke="#4fe3d4" strokeWidth="3.5" opacity="0.7" />

              {/* Outer Glowing Winding Orbital Highway */}
              <path
                d={pathD}
                fill="none"
                stroke="#0ea5e9"
                strokeOpacity="0.22"
                strokeWidth="76"
                strokeLinecap="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="url(#orbitRibbonGrad)"
                strokeWidth="54"
                strokeLinecap="round"
              />
              {/* Crisp Center Orbital Trajectory Dash Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#e0f2fe"
                strokeOpacity="0.65"
                strokeWidth="4"
                strokeDasharray="12 12"
                strokeLinecap="round"
              />
            </svg>

            {/* Interactive Level Medallion Nodes (1 at bottom -> 10 at top summit) */}
            {nodes.map(({ lvl, idx, xPct, yPx }) => {
              const isCompleted = playerState.completedLevels.includes(lvl.lvl);
              const isAvailable = idx === 0 || playerState.completedLevels.includes(lvl.lvl - 1);
              const isSelected = selectedIdx === idx;
              const isFrontier = frontierIdx === idx;
              const isSummit = lvl.lvl === 10;

              return (
                <div
                  key={lvl.lvl}
                  style={{ left: `${xPct}%`, top: `${yPx}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
                >
                  {/* Milestone Crown / Satellite Crest on Top of Completed or Level 1 / Level 10 */}
                  {(isCompleted || isSummit || lvl.isLab) && (
                    <div className="mb-0.5 text-sm drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] pointer-events-none">
                      {isSummit ? '🌕' : lvl.isLab ? '🛰️' : '👑'}
                    </div>
                  )}

                  {/* Explorer Avatar Card Beside Current Frontier Node (just like the avatar beside the active node in the reference!) */}
                  {isFrontier && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 ${
                        xPct > 50 ? 'right-[72px]' : 'left-[72px]'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#07152e] border-2 border-[#4fe3d4] shadow-[0_0_20px_rgba(79,227,212,0.55)] flex items-center justify-center animate-bounce">
                        <RecruitBadgeSVG size={34} />
                      </div>
                    </div>
                  )}

                  {/* Circular Level Medallion Button */}
                  <button
                    type="button"
                    onClick={() => {
                      SFX.select();
                      setSelectedIdx(idx);
                    }}
                    onDoubleClick={() => {
                      if (!isAvailable) return;
                      SFX.click();
                      onSelectLevel(idx);
                    }}
                    className={`relative rounded-full font-display font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                      isSummit ? 'w-[70px] h-[70px] text-lg' : 'w-[58px] h-[58px] text-base'
                    } ${
                      isCompleted
                        ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 text-[#2b1400] border-[3px] border-amber-100 shadow-[0_6px_0_#9a3412,0_10px_24px_rgba(251,191,36,0.45)] hover:scale-110'
                        : isAvailable
                        ? 'bg-gradient-to-b from-[#4fe3d4] via-[#0ea5e9] to-[#0369a1] text-[#041022] border-[3px] border-cyan-100 shadow-[0_6px_0_#075985,0_0_28px_rgba(79,227,212,0.65)] hover:scale-110'
                        : 'bg-gradient-to-b from-slate-700 to-slate-900 text-slate-400 border-[3px] border-slate-500/60 shadow-[0_5px_0_#0f172a] opacity-85 hover:opacity-100'
                    } ${isSelected ? 'ring-4 ring-white/85 scale-110' : ''}`}
                  >
                    <span>{lvl.lvl}</span>
                    {!isAvailable && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#091224] border border-slate-500 text-[10px] flex items-center justify-center">
                        🔒
                      </span>
                    )}
                  </button>

                  {/* Station Code + 3-Star Cluster Under Nodes */}
                  <div className="mt-1 flex flex-col items-center gap-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] pointer-events-none">
                    {isCompleted ? (
                      <div className="flex items-center gap-0.5 text-xs">
                        <span className="text-[#4fe3d4]">★</span>
                        <span className="text-amber-300 text-sm -mt-0.5">★</span>
                        <span className="text-[#4fe3d4]">★</span>
                      </div>
                    ) : isAvailable ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#061124]/90 border border-cyan-400/50 text-[9px] font-mono-tech font-bold text-[#4fe3d4] whitespace-nowrap">
                        {lvl.isLab ? 'SAH • START' : `${lvl.briefingStationId.toUpperCase()} • NEXT`}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-[#061124]/75 text-slate-500 text-[9px] font-mono-tech">
                        {lvl.briefingStationId.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT MISSION LAUNCH DECK (Shows full details + Satellite illustration + Rules + Start button for clicked Level) */}
        <div className="bg-[#071124] border-t lg:border-t-0 lg:border-l border-cyan-400/30 p-4 md:p-5 flex flex-col justify-between gap-4 overflow-y-auto">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/45 text-[#4fe3d4] text-[10px] font-mono-tech font-bold">
                LEVEL 0{selectedLevel.lvl}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isSelCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/45'
                    : isSelUnlocked
                    ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/45'
                    : 'bg-slate-800 text-slate-400 border border-white/10'
                }`}
              >
                {selStatusLabel}
              </span>
            </div>

            {/* Illustration / Visual Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0b1b38] to-[#061022] border border-cyan-400/30 flex flex-col items-center text-center">
              {selectedLevel.isLab ? (
                <SatelliteIllustrationSVG className="w-32 h-22 mb-1" />
              ) : (
                <div className="text-4xl my-2">{selectedLevel.icon}</div>
              )}
              <h3 className="font-display text-base font-extrabold text-white mt-1">
                {selectedLevel.isLab
                  ? 'LEVEL 1 – SATELLITE & ROCKET ASSEMBLY'
                  : `LEVEL ${selectedLevel.lvl} – ${selectedLevel.title.toUpperCase()}`}
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {selectedLevel.isLab
                  ? 'Build a 9-part satellite, assemble a 10-part launch vehicle, stage it on the launchpad, and load the satellite inside the fairing.'
                  : selectedLevel.goal}
              </p>
            </div>

            {/* Briefing Station & Facility Route Card */}
            <div className="p-3 rounded-xl bg-[#0a1a36] border border-cyan-400/35 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono-tech font-bold uppercase tracking-wider text-[#4fe3d4]">
                  Briefing Station (Press E)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-[10px] font-mono-tech font-bold text-amber-300">
                  {selectedLevel.briefingStationId.toUpperCase()}
                </span>
              </div>
              <div className="font-bold text-white">{selectedLevel.briefingStationName}</div>
              <div className="text-[11px] text-slate-400 leading-snug">
                Route: <span className="text-cyan-200">{selectedLevel.stationRoute.join(' → ')}</span>
              </div>
            </div>

            {/* Rules & Telemetry Details */}
            {selectedLevel.isLab ? (
              <div className="p-3 rounded-xl bg-[#09162d] border border-white/10 text-xs text-slate-300 space-y-2">
                <div>
                  <strong className="text-[#4fe3d4] block text-[11px] uppercase tracking-wider mb-0.5">
                    5-Stage Mission Rules
                  </strong>
                  Report to Spacecraft Assembly Hangar (SAH), press E for briefing, then complete Stage 1 (Satellite), Stage 2 (Rocket), Stage 3 (Launchpad), Stage 4 (Payload Fairing), and Stage 5 (Rocket Launch) to earn rewards.
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-[11px]">
                  <span className="text-slate-400">Reward:</span>
                  <strong className="text-amber-300">★ 1,000 SC + Badge</strong>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#09162d] border border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Apogee:</span>
                  <strong className="text-white font-mono-tech">{selectedLevel.t} km</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Budget Ceiling:</span>
                  <strong className="text-[#4fe3d4] font-mono-tech">{selectedLevel.b}M Grant</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isSelCompleted ? 'Best Score:' : 'Reward:'}</span>
                  <strong className="text-amber-300 truncate ml-2">
                    {isSelCompleted ? `${selScore} pts` : selectedLevel.rewardText}
                  </strong>
                </div>
                <div className="pt-1.5 border-t border-white/10 text-[11px] text-slate-400">
                  Requisites: <span className="text-cyan-200">{selectedLevel.displayReq.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              disabled={!isSelUnlocked}
              onClick={() => {
                if (!isSelUnlocked) return;
                SFX.click();
                onSelectLevel(selectedIdx);
              }}
              className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs md:text-sm tracking-wide uppercase transition ${
                !isSelUnlocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/10'
                  : 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] shadow-[0_8px_24px_rgba(79,227,212,0.35)] hover:brightness-110 cursor-pointer'
              }`}
            >
              {!isSelUnlocked
                ? `COMPLETE LEVEL ${selectedLevel.lvl - 1} TO UNLOCK 🔒`
                : isSelCompleted
                ? `PLAY LEVEL ${selectedLevel.lvl} AGAIN ▶`
                : `START LEVEL ${selectedLevel.lvl} ▶`}
            </button>

            <button
              onClick={() => {
                SFX.click();
                onClose();
                onStartTraining();
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/35 text-[#4fe3d4] text-xs font-bold uppercase tracking-wide transition cursor-pointer"
            >
              {playerState.trainingCompleted
                ? '🎓 Replay Cadet Training ↺'
                : tutStep > 0
                ? `🎓 Resume Training (${tutStep}/6) ▶`
                : '🎓 Start Cadet Training ▶'}
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM COMMAND DOCK (Space Analogue to the Candy-Saga 5-Icon Bottom Toolbar) */}
      <div className="h-14 px-4 bg-gradient-to-r from-[#0a1936] via-[#0d2144] to-[#0a1936] border-t border-cyan-400/35 flex items-center justify-around shrink-0">
        <button
          type="button"
          onClick={() => {
            SFX.select();
            setSelectedIdx(0);
            scrollContainerRef.current?.scrollTo({ top: MAP_H, behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-400/15 border border-cyan-400/25 text-xs font-bold text-cyan-200 transition cursor-pointer"
        >
          <span>🛰️</span>
          <span className="hidden sm:inline">Level 1 Lab</span>
        </button>

        <button
          type="button"
          onClick={() => {
            SFX.select();
            setSelectedIdx(frontierIdx);
            const sc = scrollContainerRef.current;
            if (sc && nodes[frontierIdx]) {
              sc.scrollTo({
                top: Math.max(0, nodes[frontierIdx].yPx - sc.clientHeight * 0.55),
                behavior: 'smooth',
              });
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/45 text-xs font-bold text-[#4fe3d4] transition cursor-pointer"
        >
          <span>🧭</span>
          <span className="hidden sm:inline">Current Frontier</span>
        </button>

        <button
          type="button"
          onClick={() => {
            SFX.select();
            setSelectedIdx(CAMPAIGN_LEVELS.length - 1);
            scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/15 border border-amber-400/25 text-xs font-bold text-amber-200 transition cursor-pointer"
        >
          <span>🌕</span>
          <span className="hidden sm:inline">Lunar Summit</span>
        </button>
      </div>
    </div>
  );
};
