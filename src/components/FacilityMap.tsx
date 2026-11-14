import React, { useEffect, useRef } from 'react';
import { FacilityLocation, getCurrentLocation, LOCATIONS } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';

export interface MapMissionTarget {
  x: number;
  z: number;
  label: string;
}

interface FacilityMapProps {
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
  playerYawRef: React.MutableRefObject<{ yaw: number; pitch: number }>;
  missionTargetRef: React.MutableRefObject<MapMissionTarget | null>;
  currentLoc: FacilityLocation;
  mapExpanded: boolean;
  tutStep: number;
  trainingCompleted: boolean;
  onOpenMap: () => void;
  onCloseMap: () => void;
  onNavigateToLocation: (locId: string) => void;
  onTeleportPoint: (wx: number, wz: number) => void;
}

function worldToMap(wx: number, wz: number, w: number, h: number) {
  const nx = (wx - -56) / 112;
  const ny = (wz - -38) / 60;
  return { x: nx * w, y: ny * h };
}

function mapToWorld(mx: number, my: number, w: number, h: number) {
  const wx = (mx / w) * 112 - 56;
  const wz = (my / h) * 60 - 38;
  return { x: wx, z: wz };
}

function getDoorwayPoints(wx: number, wz: number): { x: number; z: number }[] {
  // North wing (z < -5)
  if (wz < -5) {
    if (wx < -20) return [{ x: -34, z: -5 }]; // MCC doorway
    if (wx <= 4) return [{ x: -8, z: -5 }]; // SRL doorway
    return [{ x: 22, z: -5 }]; // SAH doorway
  }
  // South wing (z > -2)
  if (wz > -2) {
    if (wx < -20) return [{ x: -26, z: 0 }, { x: -26, z: -5 }]; // GSC / MPR west gap
    if (wx < 0) return [{ x: -1, z: 0 }, { x: -1, z: -5 }]; // SCE central opening
    return [{ x: 18, z: 0 }, { x: 18, z: -5 }]; // LCC east opening
  }
  return [{ x: wx, z: -5 }];
}

function computeConcourseRoute(
  px: number,
  pz: number,
  tx: number,
  tz: number
): { x: number; z: number }[] {
  const sameNorthSector =
    pz < -5 &&
    tz < -5 &&
    ((px < -20 && tx < -20) ||
      (px >= -20 && px <= 4 && tx >= -20 && tx <= 4) ||
      (px > 4 && tx > 4));
  const sameSouthSide =
    pz > -1 &&
    tz > -1 &&
    ((px < 0 && tx < 0) || (px >= 0 && tx >= 0));
  const inCentralHall = pz >= -7 && pz <= -2 && tz >= -7 && tz <= -2;

  if (sameNorthSector || sameSouthSide || inCentralHall) {
    return [
      { x: px, z: pz },
      { x: tx, z: tz },
    ];
  }

  const startExit = getDoorwayPoints(px, pz);
  const targetEntry = [...getDoorwayPoints(tx, tz)].reverse();
  const raw = [{ x: px, z: pz }, ...startExit, ...targetEntry, { x: tx, z: tz }];

  const cleaned: { x: number; z: number }[] = [];
  for (const pt of raw) {
    const prev = cleaned[cleaned.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.z - prev.z) > 1.2) {
      cleaned.push(pt);
    }
  }
  return cleaned;
}

// Connected architectural room polygons matching the 3D GALAXY-X layout
const ARCHITECTURAL_ROOMS: {
  id: string;
  code: string;
  label: string;
  color: string;
  poly: [number, number][];
  labelAt: [number, number];
}[] = [
  {
    id: 'mcc',
    code: 'MCC',
    label: 'Mission Control',
    color: '#38bdf8',
    poly: [
      [-55, -37],
      [-20, -37],
      [-20, -14],
      [-20, -2],
      [-30, -2],
      [-30, -7],
      [-38, -7],
      [-38, -2],
      [-55, -2],
    ],
    labelAt: [-37, -19],
  },
  {
    id: 'srl',
    code: 'SRL',
    label: 'Research Lab',
    color: '#34d399',
    poly: [
      [-20, -37],
      [4, -37],
      [4, -14],
      [4, -2],
      [-20, -2],
    ],
    labelAt: [-8, -18],
  },
  {
    id: 'sah',
    code: 'SAH',
    label: 'Assembly Hangar & Pad',
    color: '#fbbf24',
    poly: [
      [4, -37],
      [55, -37],
      [55, -2],
      [34, -2],
      [34, -7],
      [6, -7],
      [6, -2],
      [4, -2],
    ],
    labelAt: [29, -20],
  },
  {
    id: 'gsc',
    code: 'GSC',
    label: 'Ground Station',
    color: '#38bdf8',
    poly: [
      [-55, -2],
      [-30, -2],
      [-30, 21],
      [-55, 21],
    ],
    labelAt: [-42, 16.5],
  },
  {
    id: 'mpr',
    code: 'MPR',
    label: 'Mission Planning',
    color: '#818cf8',
    poly: [
      [-30, -2],
      [-14, -2],
      [-14, 18],
      [-30, 21],
    ],
    labelAt: [-22, 16.5],
  },
  {
    id: 'sce',
    code: 'SCE',
    label: 'Spaceport Entry',
    color: '#4fe3d4',
    poly: [
      [-14, -2],
      [0, -2],
      [0, 21],
      [-14, 21],
    ],
    labelAt: [-7, 16.5],
  },
  {
    id: 'lcc',
    code: 'LCC',
    label: 'Launch Control',
    color: '#f87171',
    poly: [
      [0, -2],
      [55, -2],
      [55, 21],
      [0, 21],
    ],
    labelAt: [24, 15.5],
  },
];

// Real interior & exterior structural wall lines (matching App.tsx colliders)
const WALL_SEGMENTS: [number, number, number, number][] = [
  // Outer facility hull
  [-55, -37, 55, -37],
  [55, -37, 55, 21],
  [55, 21, -55, 21],
  [-55, 21, -55, -37],
  // MCC | SRL north divider (doorway gap z=-14..-2)
  [-20, -37, -20, -14],
  // SRL | SAH north divider (doorway gap z=-14..-2)
  [4, -37, 4, -14],
  // South divider at x=0 (SCE/MPR | LCC)
  [0, 2, 0, 18],
  // Mid-corridor horizontal walls at z=-2 (doorway gaps at -30..-22 and -2..34)
  [-55, -2, -30, -2],
  [-22, -2, -2, -2],
  [34, -2, 46, -2],
  // Entrance alcove frame
  [-7, 20.6, 3, 20.6],
];

// Doorway / Airlock threshold bars (glowing pink-magenta markers like tactical blueprint)
const DOORWAY_THRESHOLDS: [number, number, number, number][] = [
  [-20, -13, -20, -6],
  [4, -13, 4, -6],
  [-29, -2, -23, -2],
  [-2, -2, 4, -2],
];

const PILLAR_POINTS: [number, number][] = [
  [-20, -5],
  [4, -5],
  [-20, -28],
  [4, -28],
  [-4, 10],
  [6, 10],
];

function drawFacilityRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  px: number,
  pz: number,
  yaw: number,
  target: MapMissionTarget | null,
  now: number,
  isDetailed: boolean
) {
  ctx.clearRect(0, 0, width, height);

  // Translucent tactical navy canvas background
  ctx.fillStyle = isDetailed ? 'rgba(6, 16, 36, 0.72)' : 'rgba(5, 13, 28, 0.92)';
  ctx.fillRect(0, 0, width, height);

  // Subtle blueprint sub-grid
  ctx.strokeStyle = isDetailed ? 'rgba(56, 189, 248, 0.08)' : 'rgba(56, 189, 248, 0.05)';
  ctx.lineWidth = 1;
  const step = isDetailed ? 28 : 16;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const curLoc = getCurrentLocation(px, pz);

  // 1. Filled translucent blueprint room chambers
  ARCHITECTURAL_ROOMS.forEach((room) => {
    const isCurrent = curLoc.id === room.id;
    ctx.beginPath();
    room.poly.forEach(([wx, wz], idx) => {
      const pt = worldToMap(wx, wz, width, height);
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();

    ctx.fillStyle = isCurrent
      ? 'rgba(20, 86, 146, 0.62)'
      : 'rgba(13, 44, 88, 0.52)';
    ctx.fill();

    // Inner blueprint tint border
    ctx.strokeStyle = isCurrent ? 'rgba(79, 227, 212, 0.55)' : 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = isCurrent ? 1.5 : 1;
    ctx.stroke();
  });

  // 2. Central Main Concourse Corridor Spine (z = -6 .. -2)
  const c1 = worldToMap(-52, -7, width, height);
  const c2 = worldToMap(48, -2, width, height);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.fillRect(c1.x, c1.y, c2.x - c1.x, c2.y - c1.y);

  // Hangar Apron Deck Outline
  const h1 = worldToMap(6, -31, width, height);
  const h2 = worldToMap(50, -1, width, height);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.26)';
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(h1.x, h1.y, h2.x - h1.x, h2.y - h1.y);
  ctx.setLineDash([]);

  // 3. Top-Down Equipment Blueprints
  ctx.save();
  // DSN Parabolic Dish (-40, 10)
  const dishPos = worldToMap(-40, 10, width, height);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(dishPos.x, dishPos.y, isDetailed ? 16 : 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(dishPos.x, dishPos.y, isDetailed ? 8 : 3, 0, Math.PI * 2);
  ctx.stroke();

  // MPR Orbital Holo-Table (-28, 10)
  const mprPos = worldToMap(-28, 10, width, height);
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.85)';
  ctx.beginPath();
  ctx.arc(mprPos.x, mprPos.y, isDetailed ? 13 : 5, 0, Math.PI * 2);
  ctx.stroke();
  if (isDetailed) {
    ctx.beginPath();
    ctx.ellipse(mprPos.x, mprPos.y, 17, 7, -0.4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.5)';
    ctx.stroke();
  }

  // MCC Curved Video Wall & Console (-34, -26)
  const mccPos = worldToMap(-34, -27, width, height);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
  ctx.lineWidth = isDetailed ? 2.2 : 1.4;
  ctx.beginPath();
  ctx.arc(mccPos.x, mccPos.y + (isDetailed ? 12 : 4), isDetailed ? 24 : 9, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // SRL Lab Bench (-8, -32) & Instrument Pedestals
  const srlBench1 = worldToMap(-14, -34, width, height);
  const srlBench2 = worldToMap(-2, -30, width, height);
  ctx.fillStyle = 'rgba(52, 211, 153, 0.25)';
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.fillRect(srlBench1.x, srlBench1.y, srlBench2.x - srlBench1.x, srlBench2.y - srlBench1.y);
  ctx.strokeRect(srlBench1.x, srlBench1.y, srlBench2.x - srlBench1.x, srlBench2.y - srlBench1.y);
  [-14, -9, -4].forEach((cx) => {
    const p = worldToMap(cx, -25, width, height);
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(p.x, p.y, isDetailed ? 3.5 : 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // SAH Motors & Showcase Satellite & Launch Pad
  [8, 14, 20, 26].forEach((cx) => {
    const p = worldToMap(cx, -25, width, height);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(p.x, p.y, isDetailed ? 3.5 : 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  const satPos = worldToMap(22, -6, width, height);
  ctx.strokeStyle = 'rgba(79, 227, 212, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(satPos.x - (isDetailed ? 9 : 3), satPos.y - (isDetailed ? 3 : 1.5), isDetailed ? 18 : 6, isDetailed ? 6 : 3);
  ctx.beginPath();
  ctx.arc(satPos.x, satPos.y, isDetailed ? 4 : 2, 0, Math.PI * 2);
  ctx.stroke();

  const padPos = worldToMap(36, -12, width, height);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(padPos.x, padPos.y, isDetailed ? 16 : 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(padPos.x, padPos.y, isDetailed ? 7 : 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // LCC Firing Console (24, 4)
  const lccPos = worldToMap(24, 4, width, height);
  ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
  ctx.beginPath();
  ctx.arc(lccPos.x, lccPos.y, isDetailed ? 11 : 4, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();

  // 4. Glowing Cyan Architectural Walls (with outer neon bloom)
  ctx.save();
  ctx.strokeStyle = '#67e8f9';
  ctx.shadowColor = '#0ea5e9';
  ctx.shadowBlur = isDetailed ? 10 : 4;
  ctx.lineWidth = isDetailed ? 2.4 : 1.5;
  ctx.lineCap = 'round';
  WALL_SEGMENTS.forEach(([x1, z1, x2, z2]) => {
    const p1 = worldToMap(x1, z1, width, height);
    const p2 = worldToMap(x2, z2, width, height);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });
  ctx.restore();

  // 5. Doorway / Airlock Threshold Bars (magenta-pink accents like tactical blueprint)
  ctx.save();
  ctx.strokeStyle = '#ec4899';
  ctx.shadowColor = '#ec4899';
  ctx.shadowBlur = isDetailed ? 7 : 3;
  ctx.lineWidth = isDetailed ? 3 : 1.8;
  DOORWAY_THRESHOLDS.forEach(([x1, z1, x2, z2]) => {
    const p1 = worldToMap(x1, z1, width, height);
    const p2 = worldToMap(x2, z2, width, height);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });
  ctx.restore();

  // Structural Pillars
  ctx.fillStyle = '#38bdf8';
  PILLAR_POINTS.forEach(([wx, wz]) => {
    const p = worldToMap(wx, wz, width, height);
    const s = isDetailed ? 4 : 2;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  });

  // 6. Animated Orange Mission Route Path + Target Marker
  if (target) {
    const route = computeConcourseRoute(px, pz, target.x, target.z);
    if (route.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = '#fb923c';
      ctx.shadowBlur = isDetailed ? 8 : 4;
      ctx.lineWidth = isDetailed ? 4 : 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(isDetailed ? [9, 7] : [5, 4]);
      ctx.lineDashOffset = -(now * 0.025);

      ctx.beginPath();
      route.forEach((pt, idx) => {
        const m = worldToMap(pt.x, pt.z, width, height);
        if (idx === 0) ctx.moveTo(m.x, m.y);
        else ctx.lineTo(m.x, m.y);
      });
      ctx.stroke();

      // Inner bright amber core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = isDetailed ? 1.5 : 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Directional arrowhead at destination
      const last = worldToMap(route[route.length - 1].x, route[route.length - 1].z, width, height);
      const prev = worldToMap(route[route.length - 2].x, route[route.length - 2].z, width, height);
      const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
      const hs = isDetailed ? 8 : 5;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - hs * Math.cos(ang - 0.55), last.y - hs * Math.sin(ang - 0.55));
      ctx.lineTo(last.x - hs * Math.cos(ang + 0.55), last.y - hs * Math.sin(ang + 0.55));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Pulsing Objective Diamond at target
    const tp = worldToMap(target.x, target.z, width, height);
    const pulse = (Math.sin(now * 0.006) + 1) * 0.5;
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = isDetailed ? 2 : 1.2;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, (isDetailed ? 9 : 4.5) + pulse * (isDetailed ? 5 : 2.5), 0, Math.PI * 2);
    ctx.stroke();

    if (isDetailed && target.label) {
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(5, 11, 24, 0.85)';
      const tw = ctx.measureText(target.label).width + 10;
      ctx.fillRect(tp.x - tw / 2, tp.y - 24, tw, 14);
      ctx.fillStyle = '#fde68a';
      ctx.fillText(target.label, tp.x, tp.y - 14);
    }
    ctx.restore();
  }

  // 7. Room Labels
  ARCHITECTURAL_ROOMS.forEach((room) => {
    const lp = worldToMap(room.labelAt[0], room.labelAt[1], width, height);
    ctx.save();
    ctx.textAlign = 'center';
    if (isDetailed) {
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(4, 11, 24, 0.78)';
      const codeW = ctx.measureText(room.code).width + 10;
      ctx.fillRect(lp.x - codeW / 2, lp.y - 10, codeW, 14);
      ctx.fillStyle = room.color;
      ctx.fillText(room.code, lp.x, lp.y + 1);

      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(room.label, lp.x, lp.y + 14);
    } else {
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillStyle = room.color;
      ctx.fillText(room.code, lp.x, lp.y + 3);
    }
    ctx.restore();
  });

  // 8. Explorer Position + Directional FOV Cone
  const pCoord = worldToMap(px, pz, width, height);
  // Forward in 3D is (-sin(yaw), -cos(yaw)); map X is +worldX, map Y is +worldZ
  const dirAngle = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));

  ctx.save();
  // Viewing cone
  const coneGrad = ctx.createRadialGradient(pCoord.x, pCoord.y, 1, pCoord.x, pCoord.y, isDetailed ? 28 : 14);
  coneGrad.addColorStop(0, 'rgba(79, 227, 212, 0.45)');
  coneGrad.addColorStop(1, 'rgba(79, 227, 212, 0)');
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(pCoord.x, pCoord.y);
  ctx.arc(pCoord.x, pCoord.y, isDetailed ? 28 : 14, dirAngle - 0.48, dirAngle + 0.48);
  ctx.closePath();
  ctx.fill();

  // Pulsing outer locator ring
  const pPulse = (Math.sin(now / 220) + 1) * 1.8;
  ctx.strokeStyle = 'rgba(79, 227, 212, 0.7)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(pCoord.x, pCoord.y, (isDetailed ? 6 : 4) + pPulse, 0, Math.PI * 2);
  ctx.stroke();

  // Crisp explorer arrow
  ctx.translate(pCoord.x, pCoord.y);
  ctx.rotate(dirAngle);
  ctx.fillStyle = '#4fe3d4';
  ctx.beginPath();
  const sz = isDetailed ? 6 : 4;
  ctx.moveTo(sz, 0);
  ctx.lineTo(-sz * 0.7, -sz * 0.65);
  ctx.lineTo(-sz * 0.35, 0);
  ctx.lineTo(-sz * 0.7, sz * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const FacilityMap: React.FC<FacilityMapProps> = ({
  playerPosRef,
  playerYawRef,
  missionTargetRef,
  currentLoc,
  mapExpanded,
  tutStep,
  trainingCompleted,
  onOpenMap,
  onCloseMap,
  onNavigateToLocation,
  onTeleportPoint,
}) => {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const expCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const render = (now: number) => {
      const px = playerPosRef.current.x;
      const pz = playerPosRef.current.z;
      const yaw = playerYawRef.current.yaw;
      const target = missionTargetRef.current;

      if (miniCanvasRef.current) {
        const ctx = miniCanvasRef.current.getContext('2d');
        if (ctx) {
          drawFacilityRadar(
            ctx,
            miniCanvasRef.current.width,
            miniCanvasRef.current.height,
            px,
            pz,
            yaw,
            target,
            now,
            false
          );
        }
      }
      if (mapExpanded && expCanvasRef.current) {
        const ctx = expCanvasRef.current.getContext('2d');
        if (ctx) {
          drawFacilityRadar(
            ctx,
            expCanvasRef.current.width,
            expCanvasRef.current.height,
            px,
            pz,
            yaw,
            target,
            now,
            true
          );
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [mapExpanded, missionTargetRef, playerPosRef, playerYawRef]);

  const highlightMini = !trainingCompleted && tutStep === 1;

  return (
    <>
      {/* Top-Right Compact Tactical Hologram Minimap */}
      <button
        type="button"
        onClick={() => {
          SFX.click();
          onOpenMap();
        }}
        title="Click to open Tactical Facility Blueprint (M)"
        className={`fixed top-[68px] right-3 z-20 w-[196px] rounded-xl bg-[#050e20]/88 backdrop-blur-md border p-2 text-left transition hover:scale-[1.02] cursor-pointer shadow-[0_10px_28px_rgba(0,0,0,0.65)] ${
          highlightMini
            ? 'border-2 border-[#f2c14e] shadow-[0_0_24px_rgba(242,193,78,0.65)] animate-[pulseTarget_1.2s_infinite]'
            : 'border-cyan-400/35 hover:border-cyan-400/75'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Tactical Radar
          </span>
          <span className="text-[#4fe3d4] font-mono-tech">MAP [M]</span>
        </div>
        <canvas
          ref={miniCanvasRef}
          width={180}
          height={102}
          className="w-full h-[102px] rounded-lg border border-cyan-400/30 block"
        />
        <div
          className="mt-1.5 text-[11px] font-bold text-center truncate"
          style={{ color: currentLoc.badgeColor }}
        >
          {currentLoc.name}
        </div>
      </button>

      {/* Expanded Holographic Tactical Facility Blueprint Overlay */}
      {mapExpanded && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              SFX.click();
              onCloseMap();
            }
          }}
          className="fixed inset-0 z-[2000] bg-[#020814]/65 backdrop-blur-sm flex items-center justify-center p-3 md:p-5"
        >
          <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-[#061226]/92 border border-cyan-400/45 p-4 md:p-6 shadow-[0_0_55px_rgba(14,165,233,0.28)] flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base md:text-lg font-extrabold text-[#67e8f9] tracking-wide flex items-center gap-2">
                  <span>GALAXY-X TACTICAL FACILITY BLUEPRINT</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Live architectural floorplan with mission routing. Click any room or point on the blueprint to deploy immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  onCloseMap();
                }}
                className="px-3.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 text-xs font-bold text-slate-200 transition cursor-pointer shrink-0"
              >
                Close [ESC]
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4 min-h-0 overflow-hidden">
              {/* Interactive Glowing Blueprint Canvas */}
              <div className="flex flex-col gap-2.5 min-h-0">
                <canvas
                  ref={expCanvasRef}
                  width={616}
                  height={348}
                  onClick={(e) => {
                    const canvas = expCanvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
                    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
                    const w = mapToWorld(mx, my, canvas.width, canvas.height);
                    const clickedLoc = getCurrentLocation(w.x, w.z);
                    if (clickedLoc && clickedLoc.id !== 'corridor') {
                      onNavigateToLocation(clickedLoc.id);
                    } else {
                      onTeleportPoint(
                        Math.max(-50, Math.min(48, w.x)),
                        Math.max(-32, Math.min(18, w.z))
                      );
                    }
                  }}
                  className="w-full h-auto rounded-xl border border-cyan-400/45 shadow-[inset_0_0_24px_rgba(56,189,248,0.18)] cursor-crosshair"
                />

                {/* Tactical Blueprint Legend */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#040c1b]/85 border border-cyan-400/20 text-[11px] text-slate-300">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_#fb923c]" />
                      <span>Active Mission Route</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-amber-400" />
                      <span>Station Objective</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-1 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" />
                      <span>Sector Threshold</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[#4fe3d4] font-bold">▶</span>
                      <span>Explorer Heading</span>
                    </span>
                  </div>
                  <span className="text-[11px]">
                    Sector: <strong style={{ color: currentLoc.badgeColor }}>{currentLoc.code}</strong>
                  </span>
                </div>
              </div>

              {/* Sector Directory List */}
              <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[395px]">
                {LOCATIONS.map((loc) => {
                  const isCurrent = currentLoc.id === loc.id;
                  const highlightGsc = !trainingCompleted && tutStep === 2 && loc.id === 'gsc';
                  return (
                    <div
                      key={loc.id}
                      onClick={() => onNavigateToLocation(loc.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        highlightGsc
                          ? 'bg-amber-400/15 border-2 border-[#f2c14e] animate-[pulseTarget_1.2s_infinite]'
                          : isCurrent
                          ? 'bg-cyan-400/15 border-cyan-400/60'
                          : 'bg-[#0b172e]/90 border-white/10 hover:border-cyan-400/45'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <span
                            className="px-1.5 py-0.5 rounded font-mono-tech text-[10px]"
                            style={{
                              backgroundColor: `${loc.badgeColor}22`,
                              color: loc.badgeColor,
                              border: `1px solid ${loc.badgeColor}66`,
                            }}
                          >
                            {loc.code}
                          </span>
                          <span className="truncate">{loc.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{loc.desc}</p>
                      </div>
                      <button
                        type="button"
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                          isCurrent
                            ? 'bg-[#4fe3d4] text-[#051022]'
                            : 'bg-white/10 text-slate-200 hover:bg-cyan-400/25 hover:text-cyan-200'
                        }`}
                      >
                        {isCurrent ? 'Here' : 'Go ▶'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
