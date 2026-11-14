import React, { useEffect, useState } from 'react';
import { SFX } from '../utils/sfx';
import { SatComponentObjectSVG } from './SatComponentIcons';

/* ========================================================
   CUSTOM VISUAL HARDWARE & INSTRUMENT OBJECT SVGS
   ======================================================== */
export const SensorObjectSVG: React.FC<{ kind: 't' | 'b' | 'c'; size?: number }> = ({
  kind,
  size = 54,
}) => {
  if (kind === 't') {
    // Thermometer Cryo-Thermal Probe
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <rect x="16" y="34" width="32" height="18" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.4" />
        <rect x="20" y="38" width="24" height="10" rx="1.5" fill="#d97706" stroke="#fbbf24" strokeWidth="1" />
        <rect x="23" y="14" width="4.5" height="22" rx="2" fill="#cbd5e1" />
        <rect x="36.5" y="14" width="4.5" height="22" rx="2" fill="#cbd5e1" />
        <circle cx="25.25" cy="12" r="3.5" fill="#38bdf8" />
        <circle cx="38.75" cy="12" r="3.5" fill="#34d399" />
        <line x1="13" y1="40" x2="51" y2="40" stroke="#f59e0b" strokeWidth="1.5" />
        <line x1="13" y1="45" x2="51" y2="45" stroke="#f59e0b" strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 'b') {
    // Barometer Pressure Manifold
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <rect x="10" y="20" width="44" height="28" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="23" cy="34" r="9.5" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
        <circle cx="41" cy="34" r="9.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        <line x1="23" y1="34" x2="28" y2="28" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <line x1="41" y1="34" x2="46" y2="30" stroke="#4fe3d4" strokeWidth="2" strokeLinecap="round" />
        <circle cx="23" cy="34" r="2" fill="#e2e8f0" />
        <circle cx="41" cy="34" r="2" fill="#e2e8f0" />
        <rect x="27" y="13" width="10" height="7" rx="1.5" fill="#94a3b8" />
      </svg>
    );
  }
  // Multispectral Camera Payload
  return <SatComponentObjectSVG id="camera" size={size} />;
};

export const MotorObjectSVG: React.FC<{ tier: 's' | 'm' | 'x'; size?: number }> = ({
  tier,
  size = 54,
}) => {
  const accent = tier === 's' ? '#38bdf8' : tier === 'm' ? '#fbbf24' : '#f97316';
  const height = tier === 's' ? 22 : tier === 'm' ? 27 : 31;
  const topY = 44 - height;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Casing */}
      <rect x="22" y={topY} width="20" height={height} rx="3" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.4" />
      <rect x="22" y={topY + 5} width="20" height="5" fill={accent} />
      <rect x="22" y={topY + height - 6} width="20" height="4" fill="#334155" />
      {/* De Laval Nozzle */}
      <polygon points="26,44 38,44 43,55 21,55" fill="#475569" stroke="#cbd5e1" strokeWidth="1.3" />
      {/* Thrust Plume */}
      <polygon points="24,55 40,55 32,62" fill={accent} opacity="0.85" />
    </svg>
  );
};

/* ========================================================
   INTERACTIVE TUTORIAL LABS (TASKS 1, 2, 4, 5, 6)
   ======================================================== */
interface TutorialTaskModalProps {
  taskNum: number | null;
  onContinue: () => void;
}

export const TutorialTaskModal: React.FC<TutorialTaskModalProps> = ({ taskNum, onContinue }) => {
  // Task 1 state: click GSC node on visual radar
  const [t1Picked, setT1Picked] = useState<string | null>(null);
  // Task 2 state: align dish angle with orbiting satellite (target angle ~ 58 deg)
  const [dishAngle, setDishAngle] = useState<number>(22);
  // Task 4 state: interactive payload + motor mass-to-altitude tester
  const [t4Sensors, setT4Sensors] = useState<Set<'t' | 'b' | 'c'>>(() => new Set(['t']));
  const [t4Motor, setT4Motor] = useState<'s' | 'm' | 'x'>('s');
  // Task 5 state: interactive 3-switch launch readiness console
  const [t5Steps, setT5Steps] = useState<number>(0);
  // Task 6 state: interactive 60M budget optimizer
  const [t6Items, setT6Items] = useState<Set<'t' | 'b' | 'c'>>(() => new Set(['c', 'b']));
  const [t6Motor, setT6Motor] = useState<'s' | 'm'>('m');

  useEffect(() => {
    setT1Picked(null);
    setDishAngle(22);
    setT4Sensors(new Set(['t']));
    setT4Motor('s');
    setT5Steps(0);
    setT6Items(new Set(['c', 'b']));
    setT6Motor('m');
  }, [taskNum]);

  if (!taskNum || taskNum === 3) return null;

  // Derived Task Checks
  const t1Ready = t1Picked === 'gsc';

  const satTargetAngle = 62;
  const angleDiff = Math.abs(dishAngle - satTargetAngle);
  const signalPct = Math.max(8, Math.round(100 - angleDiff * 2.1));
  const t2Locked = signalPct >= 88;

  const t4Mass =
    20 +
    (t4Sensors.has('t') ? 3 : 0) +
    (t4Sensors.has('b') ? 4 : 0) +
    (t4Sensors.has('c') ? 8 : 0);
  const t4Imp = t4Motor === 's' ? 600 : t4Motor === 'm' ? 1500 : 2200;
  const t4Alt = Math.round((1.5 * t4Imp) / t4Mass);
  const t4Ready = t4Sensors.has('c') && t4Alt >= 90;

  const t5Ready = t5Steps >= 3;

  const t6Cost =
    (t6Items.has('t') ? 5 : 0) +
    (t6Items.has('b') ? 8 : 0) +
    (t6Items.has('c') ? 15 : 0) +
    (t6Motor === 's' ? 20 : 45);
  const t6Ready = t6Items.has('c') && t6Motor === 'm' && t6Cost <= 60;

  const isTaskReady =
    taskNum === 1
      ? t1Ready
      : taskNum === 2
      ? t2Locked
      : taskNum === 4
      ? t4Ready
      : taskNum === 5
      ? t5Ready
      : taskNum === 6
      ? t6Ready
      : true;

  const headerMeta: Record<number, { title: string; subtitle: string }> = {
    1: {
      title: 'Radar Navigation Practice',
      subtitle: 'Tap the Ground Station (GSC) node on the mini-blueprint to lock your next route.',
    },
    2: {
      title: 'Ground Antenna Signal Alignment',
      subtitle: 'Aim the parabolic dish toward the orbiting satellite until telemetry lock turns green.',
    },
    4: {
      title: 'Payload Mass vs. Rocket Impulse Lab',
      subtitle: 'Mount the Camera (8 kg), then pick a rocket motor strong enough to reach ≥ 90 km.',
    },
    5: {
      title: 'Mission Control Flight Sequence',
      subtitle: 'Engage all 3 live flight-director systems in order to clear the rocket for launch.',
    },
    6: {
      title: 'Mission Budget & Grant Simulator',
      subtitle: 'Keep the Camera + Ridge-M Motor inside the 60M Grant Budget by removing extra weight.',
    },
  };

  const meta = headerMeta[taskNum];
  if (!meta) return null;

  return (
    <div className="fixed inset-0 z-[2200] bg-black/82 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#07142b] border border-cyan-400/50 p-5 md:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.88)] animate-[popIn_0.25s_ease-out]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono-tech font-bold uppercase tracking-widest text-[#4fe3d4]">
            PRACTICE LAB // TASK {taskNum} OF 6
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold ${
              isTaskReady
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                : 'bg-amber-400/15 text-amber-300 border border-amber-400/35'
            }`}
          >
            {isTaskReady ? 'LAB VERIFIED ✔' : 'HANDS-ON PRACTICE'}
          </span>
        </div>

        <h3 className="font-display text-lg md:text-xl font-extrabold text-white mt-1">{meta.title}</h3>
        <p className="text-xs text-slate-300 mt-1">{meta.subtitle}</p>

        {/* =====================================================
            TASK 1: INTERACTIVE VISUAL SECTOR BLUEPRINT PRACTICE
            ===================================================== */}
        {taskNum === 1 && (
          <div className="mt-4 p-4 rounded-xl bg-[#040d1e] border border-cyan-400/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'mcc', code: 'MCC', name: 'Mission Control', icon: '🖥️', color: '#38bdf8' },
                { id: 'srl', code: 'SRL', name: 'Sensor Lab', icon: '🔬', color: '#34d399' },
                { id: 'sah', code: 'SAH', name: 'Assembly Hangar', icon: '🛰️', color: '#fbbf24' },
                { id: 'gsc', code: 'GSC', name: 'Ground Station', icon: '📡', color: '#38bdf8' },
              ].map((sec) => {
                const picked = t1Picked === sec.id;
                const isGoal = sec.id === 'gsc';
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setT1Picked(sec.id);
                      if (isGoal) SFX.snapCorrect();
                      else SFX.snapWrong();
                    }}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      picked && isGoal
                        ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.3)]'
                        : picked
                        ? 'bg-red-500/15 border-red-400/70'
                        : 'bg-[#0b1933] border-cyan-400/25 hover:border-cyan-300'
                    }`}
                  >
                    <div className="text-2xl">{sec.icon}</div>
                    <div className="font-mono-tech text-xs font-extrabold mt-1" style={{ color: sec.color }}>
                      {sec.code}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">{sec.name}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 px-3 py-2 rounded-lg bg-[#08152b] border border-white/10 text-xs flex items-center justify-between">
              <span className="text-slate-300">
                {t1Picked === 'gsc'
                  ? '📡 Waypoint locked to Ground Station (GSC)!'
                  : t1Picked
                  ? 'Try clicking the Ground Station (GSC) dish sector.'
                  : 'Select the Ground Station sector above.'}
              </span>
              <span className="font-mono-tech text-[11px] font-bold text-[#4fe3d4]">MAP [M]</span>
            </div>
          </div>
        )}

        {/* =====================================================
            TASK 2: INTERACTIVE DISH ALIGNMENT & SIGNAL LOCK
            ===================================================== */}
        {taskNum === 2 && (
          <div className="mt-4 p-4 rounded-xl bg-[#040d1e] border border-cyan-400/30">
            <div className="relative rounded-xl bg-[#030816] border border-cyan-400/20 p-3 flex flex-col items-center">
              <svg viewBox="0 0 320 140" className="w-full max-w-[340px] h-[140px]">
                {/* Orbit arc */}
                <path
                  d="M 40 95 Q 160 10 290 85"
                  stroke="rgba(56,189,248,0.28)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
                {/* Target Satellite at ~62 deg */}
                <g transform="translate(232, 32)">
                  <rect x="-14" y="-4" width="10" height="8" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                  <rect x="4" y="-4" width="10" height="8" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1" />
                  <rect x="-4" y="-5" width="8" height="10" rx="1.5" fill="#f59e0b" />
                  <circle cx="0" cy="0" r="14" stroke={t2Locked ? '#34d399' : '#fbbf24'} strokeWidth="1" strokeDasharray="3 2" fill="none" />
                </g>

                {/* Signal Beam from Dish (75, 110) rotating with dishAngle */}
                {(() => {
                  const rad = ((90 - dishAngle) * Math.PI) / 180;
                  const bx = 75 + Math.cos(rad) * 190;
                  const by = 108 - Math.sin(rad) * 190;
                  return (
                    <line
                      x1="75"
                      y1="108"
                      x2={bx}
                      y2={by}
                      stroke={t2Locked ? '#34d399' : '#38bdf8'}
                      strokeWidth={t2Locked ? '3' : '2'}
                      strokeDasharray={t2Locked ? 'none' : '5 5'}
                    />
                  );
                })()}

                {/* Parabolic Dish Base & Tilting Reflector */}
                <rect x="65" y="108" width="20" height="22" rx="2" fill="#475569" />
                <rect x="55" y="128" width="40" height="6" rx="2" fill="#94a3b8" />
                <g transform={`translate(75, 108) rotate(${dishAngle - 45})`}>
                  <path d="M -22 -6 Q 0 12 22 -6 Z" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="0" y1="2" x2="0" y2="-16" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="0" cy="-16" r="3" fill="#fbbf24" />
                </g>
              </svg>

              <div className="w-full mt-2 flex items-center gap-3">
                <span className="text-[11px] font-mono-tech text-slate-300 shrink-0">
                  AIM: <strong className="text-white">{dishAngle}°</strong>
                </span>
                <input
                  type="range"
                  min={10}
                  max={85}
                  value={dishAngle}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDishAngle(v);
                    if (Math.round(100 - Math.abs(v - satTargetAngle) * 2.1) >= 88) {
                      SFX.snapCorrect();
                    }
                  }}
                  className="flex-1 accent-[#4fe3d4] cursor-pointer"
                />
                <span
                  className={`font-mono-tech text-xs font-extrabold tabular-nums shrink-0 ${
                    t2Locked ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {signalPct}% SIGNAL
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TASK 4: VISUAL INSTRUMENT MASS vs. ROCKET IMPULSE LAB
            ===================================================== */}
        {taskNum === 4 && (
          <div className="mt-4 p-4 rounded-xl bg-[#040d1e] border border-cyan-400/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Visual Payload Instruments */}
              <div>
                <div className="text-[10px] font-mono-tech uppercase text-cyan-300 mb-1.5">
                  1. Pick Sensors (Mass)
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { k: 't', name: 'Thermo', mass: 3 },
                      { k: 'b', name: 'Baro', mass: 4 },
                      { k: 'c', name: 'Camera', mass: 8 },
                    ] as const
                  ).map((item) => {
                    const active = t4Sensors.has(item.k);
                    return (
                      <button
                        key={item.k}
                        type="button"
                        onClick={() => {
                          SFX.select();
                          setT4Sensors((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.k)) next.delete(item.k);
                            else next.add(item.k);
                            return next;
                          });
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center transition cursor-pointer ${
                          active
                            ? 'bg-cyan-500/20 border-cyan-400'
                            : 'bg-[#0b1933] border-white/10 hover:border-cyan-400/50'
                        }`}
                      >
                        <SensorObjectSVG kind={item.k} size={38} />
                        <span className="text-[10px] font-bold text-white mt-1">{item.name}</span>
                        <span className="text-[9px] font-mono-tech text-slate-300">{item.mass} kg</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Propulsion Motors */}
              <div>
                <div className="text-[10px] font-mono-tech uppercase text-amber-300 mb-1.5">
                  2. Pick Motor (Impulse)
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { k: 's', name: 'Spark-S', imp: '600' },
                      { k: 'm', name: 'Ridge-M', imp: '1500' },
                      { k: 'x', name: 'Crest-X', imp: '2200' },
                    ] as const
                  ).map((mot) => {
                    const active = t4Motor === mot.k;
                    return (
                      <button
                        key={mot.k}
                        type="button"
                        onClick={() => {
                          SFX.select();
                          setT4Motor(mot.k);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center transition cursor-pointer ${
                          active
                            ? 'bg-amber-500/20 border-amber-400'
                            : 'bg-[#0b1933] border-white/10 hover:border-amber-400/50'
                        }`}
                      >
                        <MotorObjectSVG tier={mot.k} size={38} />
                        <span className="text-[10px] font-bold text-white mt-1">{mot.name}</span>
                        <span className="text-[9px] font-mono-tech text-amber-300">{mot.imp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Visual Altitude Gauge */}
            <div className="p-3 rounded-xl bg-[#08152b] border border-white/10">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300">
                  Total Mass: <strong className="text-white font-mono-tech">{t4Mass} kg</strong>
                </span>
                <span className="text-slate-300">
                  Predicted Apogee:{' '}
                  <strong className={`font-mono-tech ${t4Alt >= 90 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {t4Alt} km / 90 km
                  </strong>
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    t4Alt >= 90 ? 'bg-gradient-to-r from-[#4fe3d4] to-[#34d399]' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, (t4Alt / 120) * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                {!t4Sensors.has('c')
                  ? 'Mount the Camera (8 kg) sensor first.'
                  : t4Alt < 90
                  ? 'Too heavy for this motor! Upgrade to Crest-X or reduce sensors.'
                  : 'Camera mounted & ≥ 90 km apogee achieved!'}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TASK 5: INTERACTIVE MCC LAUNCH SEQUENCE BOARD
            ===================================================== */}
        {taskNum === 5 && (
          <div className="mt-4 p-4 rounded-xl bg-[#040d1e] border border-cyan-400/30">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                {
                  idx: 1,
                  icon: '📋',
                  title: '1. MCC Briefing',
                  station: 'Mission Control',
                  sub: 'Lock target & budget',
                },
                {
                  idx: 2,
                  icon: '🧪',
                  title: '2. Build & Stage',
                  station: 'SRL + SAH + Pad',
                  sub: 'Sensors, motor, load pad',
                },
                {
                  idx: 3,
                  icon: '🚀',
                  title: '3. LCC Ignition',
                  station: 'Launch Control',
                  sub: 'Fire & debrief at MCC',
                },
              ].map((s) => {
                const active = t5Steps >= s.idx;
                const clickable = t5Steps === s.idx - 1;
                return (
                  <button
                    key={s.idx}
                    type="button"
                    onClick={() => {
                      if (!clickable) return;
                      SFX.snapCorrect();
                      setT5Steps(s.idx);
                    }}
                    className={`p-3 rounded-xl border text-center transition ${
                      active
                        ? 'bg-emerald-500/18 border-emerald-400 text-white'
                        : clickable
                        ? 'bg-cyan-500/15 border-cyan-400 animate-pulse cursor-pointer text-white'
                        : 'bg-[#0b1933]/70 border-white/10 opacity-60 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-2xl">{s.icon}</div>
                    <div className="text-xs font-extrabold mt-1.5">{s.title}</div>
                    <div className="text-[10px] font-mono-tech text-[#4fe3d4] mt-0.5">{s.station}</div>
                    <div className="text-[10px] text-slate-300 mt-1">{s.sub}</div>
                    <div className="mt-2 text-[10px] font-bold">
                      {active ? '✔ ONLINE' : clickable ? 'TAP TO ENGAGE' : 'LOCKED'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================
            TASK 6: INTERACTIVE GRANT & BUDGET OPTIMIZER
            ===================================================== */}
        {taskNum === 6 && (
          <div className="mt-4 p-4 rounded-xl bg-[#040d1e] border border-cyan-400/30 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { k: 't', label: 'Thermo', cost: 5, kind: 'sensor' as const },
                  { k: 'b', label: 'Baro', cost: 8, kind: 'sensor' as const },
                  { k: 'c', label: 'Camera', cost: 15, kind: 'sensor' as const },
                ] as const
              ).map((item) => {
                const active = t6Items.has(item.k);
                return (
                  <button
                    key={item.k}
                    type="button"
                    onClick={() => {
                      SFX.select();
                      setT6Items((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.k)) next.delete(item.k);
                        else next.add(item.k);
                        return next;
                      });
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center transition cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400'
                        : 'bg-[#0b1933] border-white/10 hover:border-cyan-400/50'
                    }`}
                  >
                    <SensorObjectSVG kind={item.k} size={36} />
                    <span className="text-[10px] font-bold text-white mt-1">{item.label}</span>
                    <span className="text-[10px] font-mono-tech text-[#4fe3d4]">{item.cost}M</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  SFX.select();
                  setT6Motor((m) => (m === 'm' ? 's' : 'm'));
                }}
                className="p-2 rounded-xl border bg-amber-500/18 border-amber-400 flex flex-col items-center cursor-pointer"
              >
                <MotorObjectSVG tier={t6Motor} size={36} />
                <span className="text-[10px] font-bold text-white mt-1">
                  {t6Motor === 'm' ? 'Ridge-M' : 'Spark-S'}
                </span>
                <span className="text-[10px] font-mono-tech text-amber-300">
                  {t6Motor === 'm' ? '45M' : '20M'}
                </span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#08152b] border border-white/10">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300">Target: Camera + Ridge-M (≤ 60M)</span>
                <span
                  className={`font-mono-tech font-extrabold ${
                    t6Cost > 60 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {t6Cost}M / 60M {t6Cost > 60 ? '(OVER!)' : '(NOMINAL)'}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    t6Cost > 60 ? 'bg-red-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (t6Cost / 75) * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-slate-400">
                {t6Cost > 60
                  ? 'Click Baro (8M) to remove extra payload cost and fit inside the 60M cap!'
                  : !t6Items.has('c') || t6Motor !== 'm'
                  ? 'Keep Camera (15M) and Ridge-M (45M) selected.'
                  : 'Perfect 60M vehicle! Grant Credits (₡) fund parts while Star Credits (★) mark career milestones.'}
              </div>
            </div>
          </div>
        )}

        <button
          disabled={!isTaskReady}
          onClick={() => {
            SFX.click();
            onContinue();
          }}
          className={`mt-5 w-full py-3 rounded-xl font-extrabold text-xs tracking-wide uppercase transition ${
            isTaskReady
              ? 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] hover:brightness-110 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isTaskReady ? 'COMPLETE & CONTINUE ❯' : 'COMPLETE PRACTICE LAB ABOVE TO CONTINUE'}
        </button>
      </div>
    </div>
  );
};

/* ========================================================
   INTERACTIVE TASK 3: VISUAL SATELLITE SUBSYSTEM MATCHING
   ======================================================== */
interface SubsystemExplorerModalProps {
  visible: boolean;
  onComplete: () => void;
  onClose?: () => void;
}

const CORE_SUBSYSTEMS = [
  {
    id: 1,
    svgId: 'bus' as const,
    title: 'Bus & Frame',
    slotLabel: 'Central Chassis',
    shortDesc: 'Octagonal core housing all hardware',
  },
  {
    id: 2,
    svgId: 'solar' as const,
    title: 'Solar Array',
    slotLabel: 'Power Wings',
    shortDesc: 'Generates electricity from sunlight',
  },
  {
    id: 3,
    svgId: 'computer' as const,
    title: 'Flight Avionics',
    slotLabel: 'Avionics Bay',
    shortDesc: 'Guides orientation & telemetry',
  },
  {
    id: 4,
    svgId: 'propulsion' as const,
    title: 'Propulsion',
    slotLabel: 'Aft Bulkhead',
    shortDesc: 'Fires thrusters for orbit maneuvers',
  },
];

export const SubsystemExplorerModal: React.FC<SubsystemExplorerModalProps> = ({
  visible,
  onComplete,
  onClose,
}) => {
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [draggedPart, setDraggedPart] = useState<number | null>(null);
  const [placedParts, setPlacedParts] = useState<Set<number>>(() => new Set());
  const [hintMsg, setHintMsg] = useState<string>('Drag or tap a hardware object on the left, then place it into its matching satellite bay.');

  useEffect(() => {
    if (visible) {
      setSelectedPart(null);
      setDraggedPart(null);
      setPlacedParts(new Set());
      setHintMsg('Drag or tap a hardware object on the left, then place it into its matching satellite bay.');
    }
  }, [visible]);

  if (!visible) return null;
  const allDone = placedParts.size >= 4;

  const tryPlaceInSlot = (partId: number | null, slotId: number) => {
    if (placedParts.has(slotId)) return;
    if (partId === null) {
      SFX.select();
      setHintMsg('First pick or drag a hardware component card on the left!');
      return;
    }
    if (partId === slotId) {
      SFX.snapCorrect();
      const matched = CORE_SUBSYSTEMS.find((s) => s.id === slotId);
      setPlacedParts((prev) => new Set([...prev, slotId]));
      setSelectedPart(null);
      setDraggedPart(null);
      setHintMsg(`${matched?.title} mounted! ${matched?.shortDesc}.`);
    } else {
      SFX.snapWrong();
      setDraggedPart(null);
      setHintMsg('Wrong mounting bay — match the component shape to its engineering bay!');
    }
  };

  return (
    <div className="fixed inset-0 z-[2200] bg-black/82 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#07142b] border border-cyan-400/50 p-5 md:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.88)] animate-[popIn_0.25s_ease-out]">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono-tech font-bold uppercase tracking-widest text-[#4fe3d4]">
            SPACECRAFT ASSEMBLY HANGAR // PRACTICE 3 OF 6
          </div>
          {onClose && (
            <button
              onClick={() => {
                SFX.click();
                onClose();
              }}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <h3 className="font-display text-lg md:text-xl font-extrabold text-white mt-1">
          Interactive Spacecraft Subsystem Practice
        </h3>
        <p className="text-xs text-slate-300 mt-1">{hintMsg}</p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-4 mt-4">
          {/* Left: Visual Component Cards (Draggable + Clickable) */}
          <div className="grid grid-cols-2 gap-2.5">
            {CORE_SUBSYSTEMS.map((sub) => {
              const placed = placedParts.has(sub.id);
              const active = selectedPart === sub.id || draggedPart === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  disabled={placed}
                  draggable={!placed}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(sub.id));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedPart(sub.id);
                    setSelectedPart(sub.id);
                  }}
                  onDragEnd={() => setDraggedPart(null)}
                  onClick={() => {
                    SFX.select();
                    setSelectedPart(sub.id);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition ${
                    placed
                      ? 'bg-emerald-500/12 border-emerald-400/50 opacity-55 cursor-default'
                      : active
                      ? 'bg-cyan-500/22 border-[#4fe3d4] shadow-[0_0_16px_rgba(79,227,212,0.35)] cursor-grab active:cursor-grabbing'
                      : 'bg-[#0b1b38] border-white/15 hover:border-cyan-400/60 cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <SatComponentObjectSVG id={sub.svgId} size={46} />
                  <div className="text-[11px] font-extrabold text-white mt-1.5">{sub.title}</div>
                  <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{sub.shortDesc}</div>
                </button>
              );
            })}
          </div>

          {/* Right: Visual Satellite Blueprint Mounting Bays (Drop + Tap Targets) */}
          <div className="rounded-xl bg-[#040d1e] border border-cyan-400/30 p-3 flex flex-col justify-between">
            <div className="text-[10px] font-mono-tech uppercase text-cyan-300 text-center mb-2">
              Satellite Blueprint Bays ({placedParts.size}/4 Mounted)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {CORE_SUBSYSTEMS.map((slot) => {
                const filled = placedParts.has(slot.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onDragOver={(e) => {
                      if (!filled) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const raw = Number(e.dataTransfer.getData('text/plain'));
                      const partId = Number.isFinite(raw) && raw > 0 ? raw : draggedPart ?? selectedPart;
                      tryPlaceInSlot(partId, slot.id);
                    }}
                    onClick={() => tryPlaceInSlot(selectedPart, slot.id)}
                    className={`p-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center min-h-[96px] transition ${
                      filled
                        ? 'bg-emerald-500/15 border-emerald-400 border-solid'
                        : selectedPart !== null || draggedPart !== null
                        ? 'bg-[#0a1934] border-amber-400/70 hover:bg-amber-400/10 cursor-pointer'
                        : 'bg-[#071228] border-cyan-400/30 cursor-pointer'
                    }`}
                  >
                    {filled ? (
                      <>
                        <SatComponentObjectSVG id={slot.svgId} size={40} />
                        <span className="text-[10px] font-bold text-emerald-300 mt-1">✔ {slot.slotLabel}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full border border-cyan-400/40 flex items-center justify-center text-xs font-mono-tech text-cyan-300">
                          {slot.id}
                        </div>
                        <span className="text-[11px] font-bold text-white mt-1.5">{slot.slotLabel}</span>
                        <span className="text-[9px] text-slate-400">Drop or tap</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          disabled={!allDone}
          onClick={() => {
            SFX.click();
            onComplete();
          }}
          className={`mt-5 w-full py-3 rounded-xl font-extrabold text-xs tracking-wide uppercase transition ${
            allDone
              ? 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] hover:brightness-110 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {allDone ? 'CONTINUE TO NEXT PRACTICE ❯' : `MOUNT ALL 4 SUBSYSTEMS (${placedParts.size}/4)`}
        </button>
      </div>
    </div>
  );
};
