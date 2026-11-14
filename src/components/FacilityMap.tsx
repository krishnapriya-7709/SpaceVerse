import React, { useEffect, useRef } from 'react';
import { FacilityLocation, getCurrentLocation, LOCATIONS } from '../data/spaceverseData';
import { SFX } from '../utils/sfx';

interface FacilityMapProps {
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
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
  const nx = (wx - -54) / 108;
  const ny = (wz - -38) / 60;
  return { x: nx * w, y: ny * h };
}

function mapToWorld(mx: number, my: number, w: number, h: number) {
  const wx = (mx / w) * 108 - 54;
  const wz = (my / h) * 60 - 38;
  return { x: wx, z: wz };
}

function drawFacilityRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  px: number,
  pz: number,
  isDetailed: boolean
) {
  ctx.fillStyle = '#050b18';
  ctx.fillRect(0, 0, width, height);

  // Subtle grid lines
  if (isDetailed) {
    ctx.strokeStyle = 'rgba(79, 227, 212, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // Central concourse corridor
  const c1 = worldToMap(-46, -6, width, height);
  const c2 = worldToMap(46, 2, width, height);
  ctx.fillStyle = 'rgba(79, 227, 212, 0.08)';
  ctx.fillRect(c1.x, c1.y, c2.x - c1.x, c2.y - c1.y);
  ctx.strokeStyle = 'rgba(79, 227, 212, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(c1.x, c1.y, c2.x - c1.x, c2.y - c1.y);

  const curLoc = getCurrentLocation(px, pz);
  LOCATIONS.forEach((loc) => {
    const p1 = worldToMap(loc.bounds.x1, loc.bounds.z1, width, height);
    const p2 = worldToMap(loc.bounds.x2, loc.bounds.z2, width, height);
    const rw = p2.x - p1.x;
    const rh = p2.y - p1.y;
    const isCurrent = curLoc.id === loc.id;

    ctx.fillStyle = isCurrent ? 'rgba(79, 227, 212, 0.22)' : 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(p1.x, p1.y, rw, rh);

    ctx.strokeStyle = isCurrent ? loc.badgeColor : 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.strokeRect(p1.x, p1.y, rw, rh);

    ctx.fillStyle = loc.badgeColor;
    ctx.font = isDetailed ? 'bold 12px "JetBrains Mono", monospace' : 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(loc.code, p1.x + rw / 2, p1.y + rh / 2 + (isDetailed ? 0 : 3));

    if (isDetailed) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      const shortName = loc.name
        .replace('Scientific Research ', '')
        .replace('Spacecraft ', '')
        .replace('NASA Space Center ', '');
      ctx.fillText(shortName, p1.x + rw / 2, p1.y + rh / 2 + 15);
    }
  });

  // Player dot
  const pCoord = worldToMap(px, pz, width, height);
  const pulse = (Math.sin(performance.now() / 200) + 1) * 2;
  ctx.strokeStyle = 'rgba(79, 227, 212, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pCoord.x, pCoord.y, 6 + pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#4fe3d4';
  ctx.beginPath();
  ctx.arc(pCoord.x, pCoord.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

export const FacilityMap: React.FC<FacilityMapProps> = ({
  playerPosRef,
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
    const render = () => {
      const px = playerPosRef.current.x;
      const pz = playerPosRef.current.z;

      if (miniCanvasRef.current) {
        const ctx = miniCanvasRef.current.getContext('2d');
        if (ctx) {
          drawFacilityRadar(ctx, miniCanvasRef.current.width, miniCanvasRef.current.height, px, pz, false);
        }
      }
      if (mapExpanded && expCanvasRef.current) {
        const ctx = expCanvasRef.current.getContext('2d');
        if (ctx) {
          drawFacilityRadar(ctx, expCanvasRef.current.width, expCanvasRef.current.height, px, pz, true);
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [mapExpanded, playerPosRef]);

  const highlightMini = !trainingCompleted && tutStep === 1;

  return (
    <>
      {/* Top-Right Compact Radar Minimap Card (positioned cleanly below Top Command Bar) */}
      <button
        type="button"
        onClick={() => {
          SFX.click();
          onOpenMap();
        }}
        title="Click to open expanded Facility Map (M)"
        className={`fixed top-[68px] right-3 z-20 w-[184px] rounded-xl bg-[#071022]/92 border p-2 text-left transition hover:scale-[1.02] cursor-pointer shadow-[0_10px_28px_rgba(0,0,0,0.6)] ${
          highlightMini
            ? 'border-2 border-[#f2c14e] shadow-[0_0_24px_rgba(242,193,78,0.65)] animate-[pulseTarget_1.2s_infinite]'
            : 'border-cyan-400/25 hover:border-cyan-400/60'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          <span>Facility Radar</span>
          <span className="text-[#4fe3d4] font-mono-tech">MAP [M]</span>
        </div>
        <canvas
          ref={miniCanvasRef}
          width={168}
          height={98}
          className="w-full h-[98px] rounded-lg border border-cyan-400/20 block"
        />
        <div
          className="mt-1.5 text-[11px] font-bold text-center truncate"
          style={{ color: currentLoc.badgeColor }}
        >
          {currentLoc.name}
        </div>
      </button>

      {/* Expanded Facility Map & Sector Directory Modal */}
      {mapExpanded && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              SFX.click();
              onCloseMap();
            }
          }}
          className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-4xl max-h-[88vh] rounded-2xl bg-[#071124] border border-cyan-400/35 p-5 md:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base md:text-lg font-extrabold text-[#4fe3d4] tracking-wide">
                  GALAXY-X FACILITY SECTOR MAP
                </h2>
                <p className="text-xs text-slate-400">
                  Click any sector on the radar blueprint or directory list to fast-navigate immediately.
                </p>
              </div>
              <button
                onClick={() => {
                  SFX.click();
                  onCloseMap();
                }}
                className="px-3.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/12 text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                Close [ESC]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 min-h-0 overflow-hidden">
              {/* Interactive Radar Blueprint */}
              <div className="flex flex-col gap-2">
                <canvas
                  ref={expCanvasRef}
                  width={540}
                  height={330}
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
                  className="w-full h-auto rounded-xl border border-cyan-400/30 cursor-crosshair bg-[#050b18]"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Current Sector: <strong style={{ color: currentLoc.badgeColor }}>{currentLoc.name}</strong></span>
                  <span>Live Telemetry Beacon Active</span>
                </div>
              </div>

              {/* Sector Directory List */}
              <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[360px]">
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
                          : 'bg-[#0b172e] border-white/10 hover:border-cyan-400/40'
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
