import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ROCKET_COMPONENTS, RocketComponentSpec, RocketPartId } from '../data/spaceverseData';
import { buildDetailedRocketRig, RocketAssemblyRig } from '../three/rocketBuilder';
import { SFX } from '../utils/sfx';
import { RocketComponentObjectSVG } from './RocketComponentIcons';

interface RocketAssemblyStageProps {
  initialInstalledParts: RocketPartId[];
  onProgressChange: (parts: RocketPartId[]) => void;
  onCompleteStage2: (parts: RocketPartId[]) => void;
}

interface FeedbackState {
  badgeLabel: string;
  text: string;
  type: 'neutral' | 'success' | 'error';
}

interface ProjectedPort {
  id: RocketPartId;
  x: number;
  y: number;
  visible: boolean;
}

export const RocketAssemblyStage: React.FC<RocketAssemblyStageProps> = ({
  initialInstalledParts,
  onProgressChange,
  onCompleteStage2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rigRef = useRef<RocketAssemblyRig | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [installed, setInstalled] = useState<Set<RocketPartId>>(() => new Set(initialInstalledParts));
  const [selectedId, setSelectedId] = useState<RocketPartId | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<RocketComponentSpec | null>(null);
  const [draggingId, setDraggingId] = useState<RocketPartId | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredPortId, setHoveredPortId] = useState<RocketPartId | null>(null);
  const [portFlash, setPortFlash] = useState<{ id: RocketPartId; kind: 'correct' | 'wrong' } | null>(null);
  const [shakingId, setShakingId] = useState<RocketPartId | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [stage2DoneModal, setStage2DoneModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<FeedbackState | null>({
    badgeLabel: 'STAGE 2 BRIEFING',
    text: 'Assemble all 10 Falcon-9-inspired launch vehicle components onto their matching numbered slots (1–10).',
    type: 'neutral',
  });
  const [lastStatusKind, setLastStatusKind] = useState<'neutral' | 'success' | 'error'>('neutral');

  const [portCoords, setPortCoords] = useState<Record<RocketPartId, ProjectedPort>>(() => {
    const init = {} as Record<RocketPartId, ProjectedPort>;
    ROCKET_COMPONENTS.forEach((c) => {
      init[c.id] = { id: c.id, x: 0, y: 0, visible: false };
    });
    return init;
  });

  const rotRef = useRef({
    yaw: 0.35,
    pitch: 0.06,
    targetYaw: null as number | null,
    targetPitch: null as number | null,
    zoom: 10.6,
  });
  const orbitDragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: false });
  const installedRef = useRef(installed);
  installedRef.current = installed;
  const activeCompRef = useRef<RocketPartId | null>(null);
  activeCompRef.current = draggingId ?? selectedId;
  const hoveredPortRef = useRef<RocketPartId | null>(null);
  hoveredPortRef.current = hoveredPortId;
  const portFlashRef = useRef<{ id: RocketPartId; kind: 'correct' | 'wrong' } | null>(null);
  portFlashRef.current = portFlash;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const stageDoneRef = useRef(stage2DoneModal);
  stageDoneRef.current = stage2DoneModal;

  const touchHoldTimerRef = useRef<number | null>(null);
  const pointerDragRef = useRef<{
    id: RocketPartId | null;
    startX: number;
    startY: number;
    isDragging: boolean;
  }>({ id: null, startX: 0, startY: 0, isDragging: false });
  const popAnimRef = useRef<Partial<Record<RocketPartId, number>>>({});
  const completionTriggeredRef = useRef(false);

  const orderedComponents = useMemo(
    () => [...ROCKET_COMPONENTS].sort((a, b) => a.sequenceStep - b.sequenceStep),
    []
  );

  const progressStats = useMemo(() => {
    const count = installed.size;
    const total = ROCKET_COMPONENTS.length;
    const pct = Math.round((count / total) * 100);
    let totalMass = 0;
    ROCKET_COMPONENTS.forEach((c) => {
      if (installed.has(c.id)) totalMass += c.massKg;
    });
    return { count, total, pct, totalMass };
  }, [installed]);

  // Trigger stage completion modal if opened with all 10 parts already saved
  useEffect(() => {
    if (installed.size === ROCKET_COMPONENTS.length && !completionTriggeredRef.current) {
      completionTriggeredRef.current = true;
      setStage2DoneModal(true);
    }
  }, [installed]);

  const handleInstall = useCallback(
    (compId: RocketPartId) => {
      if (installedRef.current.has(compId)) return;
      const comp = ROCKET_COMPONENTS.find((c) => c.id === compId);
      if (!comp) return;

      const next = new Set(installedRef.current);
      next.add(compId);
      setInstalled(next);
      setSelectedId(null);
      setDraggingId(null);
      setHoveredPortId(null);

      const list = Array.from(next);
      onProgressChange(list);

      setPortFlash({ id: compId, kind: 'correct' });
      window.setTimeout(() => setPortFlash((cur) => (cur?.id === compId ? null : cur)), 950);

      const rig = rigRef.current;
      if (rig && rig.parts[compId]) {
        rig.parts[compId].visible = true;
        rig.parts[compId].scale.setScalar(0.12);
        popAnimRef.current[compId] = 0.12;
      }

      SFX.snapCorrect();
      setLastStatusKind('success');
      setNotification({
        badgeLabel: `#${comp.sequenceStep} LOCKED IN ✓`,
        text: comp.correctNote,
        type: 'success',
      });

      if (next.size === ROCKET_COMPONENTS.length && !completionTriggeredRef.current) {
        completionTriggeredRef.current = true;
        SFX.taskComplete();
        setNotification({
          badgeLabel: 'ROCKET STACK VERIFIED ✓',
          text: 'All 10 launch vehicle components are assembled! Preparing launchpad transporter.',
          type: 'success',
        });
        window.setTimeout(() => {
          setStage2DoneModal(true);
        }, 900);
      }
    },
    [onProgressChange]
  );

  const handleReject = useCallback((dragged: RocketPartId, attemptedTarget: RocketPartId) => {
    const comp = ROCKET_COMPONENTS.find((c) => c.id === dragged);
    const targetComp = ROCKET_COMPONENTS.find((c) => c.id === attemptedTarget);
    if (!comp) return;

    SFX.snapWrong();
    setShakingId(dragged);
    window.setTimeout(() => setShakingId(null), 480);

    setPortFlash({ id: attemptedTarget, kind: 'wrong' });
    window.setTimeout(() => setPortFlash((cur) => (cur?.id === attemptedTarget ? null : cur)), 1100);

    const reason =
      comp.wrongNotes[attemptedTarget] ||
      `Incorrect position! #${comp.sequenceStep} ${comp.name} does not attach to slot #${targetComp?.sequenceStep ?? '?'}. Returned to component tray.`;

    setLastStatusKind('error');
    setNotification({
      badgeLabel: 'INCORRECT POSITION ✕',
      text: reason,
      type: 'error',
    });
  }, []);

  const handleResetRocket = useCallback(() => {
    SFX.click();
    completionTriggeredRef.current = false;
    setInstalled(new Set());
    onProgressChange([]);
    setSelectedId(null);
    setDraggingId(null);
    setPortFlash(null);
    setStage2DoneModal(false);
    setLastStatusKind('neutral');
    const rig = rigRef.current;
    if (rig) {
      ROCKET_COMPONENTS.forEach((c) => {
        rig.parts[c.id].visible = false;
      });
    }
    setNotification({
      badgeLabel: 'ROCKET STACK RESET',
      text: 'Drag each numbered rocket component (1–10) onto its matching position on the launch vehicle.',
      type: 'neutral',
    });
  }, [onProgressChange]);

  const raycastDropSlot = useCallback((clientX: number, clientY: number): RocketPartId | null => {
    const canvas = canvasRef.current;
    const cam = cameraRef.current;
    const rig = rigRef.current;
    if (!canvas || !cam || !rig) return null;

    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }

    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, cam);

    const hitboxes: THREE.Object3D[] = [];
    ROCKET_COMPONENTS.forEach((c) => {
      if (!installedRef.current.has(c.id)) {
        hitboxes.push(rig.dropSlots[c.id].hitbox);
        rig.dropSlots[c.id].extraHitboxes.forEach((eh) => hitboxes.push(eh));
      }
    });
    const hits = ray.intersectObjects(hitboxes, false);
    if (hits.length > 0 && hits[0].object.userData.compId) {
      return hits[0].object.userData.compId as RocketPartId;
    }

    // Screen-space proximity snap (54px radius)
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    let bestId: RocketPartId | null = null;
    let bestDist = 54;
    const tempVec = new THREE.Vector3();
    ROCKET_COMPONENTS.forEach((c) => {
      if (installedRef.current.has(c.id)) return;
      tempVec.set(c.anchorPos.x, c.anchorPos.y, c.anchorPos.z);
      tempVec.applyEuler(rig.root.rotation);
      tempVec.add(rig.root.position);
      tempVec.project(cam);
      if (tempVec.z > 1) return;
      const sx = (tempVec.x * 0.5 + 0.5) * rect.width;
      const sy = (-tempVec.y * 0.5 + 0.5) * rect.height;
      const d = Math.hypot(lx - sx, ly - sy);
      if (d < bestDist) {
        bestDist = d;
        bestId = c.id;
      }
    });

    return bestId;
  }, []);

  // Three.js Vertical Rocket Integration Bay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b18);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 0.25, 10.6);
    camera.lookAt(0, 0.05, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const hemi = new THREE.HemisphereLight(0xd5ecff, 0x0a162c, 0.72);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.45);
    keyLight.position.set(6, 9, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Starfield Backdrop
    const starPositions = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      const r = 22 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 8;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.1, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Integration Cradle Ring Floor under the 9-engine mount
    const cradleBaseMat = new THREE.MeshStandardMaterial({ color: 0x162033, roughness: 0.38, metalness: 0.85 });
    const cradleBase = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.55, 0.28, 36), cradleBaseMat);
    cradleBase.position.y = -3.86;
    scene.add(cradleBase);

    const cradleRingMat = new THREE.MeshBasicMaterial({ color: 0x4fe3d4 });
    const cradleRing = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.045, 14, 48), cradleRingMat);
    cradleRing.rotation.x = Math.PI / 2;
    cradleRing.position.y = -3.71;
    scene.add(cradleRing);

    const rig = buildDetailedRocketRig();
    rig.root.position.set(0, 0.02, 0);
    // Sync any already-installed parts from restored progress
    ROCKET_COMPONENTS.forEach((c) => {
      if (installedRef.current.has(c.id)) {
        rig.parts[c.id].visible = true;
      }
    });
    rigRef.current = rig;
    scene.add(rig.root);

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height, false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const projVec = new THREE.Vector3();
    let rafId = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);

      const rState = rotRef.current;
      if (rState.targetYaw !== null && rState.targetPitch !== null) {
        const dy = rState.targetYaw - rState.yaw;
        const dp = rState.targetPitch - rState.pitch;
        rState.yaw += dy * 0.12;
        rState.pitch += dp * 0.12;
        if (Math.abs(dy) < 0.01 && Math.abs(dp) < 0.01) {
          rState.targetYaw = null;
          rState.targetPitch = null;
        }
      } else if (stageDoneRef.current) {
        rState.yaw += 0.012;
      } else if (
        autoRotateRef.current &&
        !orbitDragRef.current.active &&
        !activeCompRef.current &&
        !hoveredPortRef.current
      ) {
        rState.yaw += 0.0022;
      }

      rig.root.rotation.y = rState.yaw;
      rig.root.rotation.x = rState.pitch;
      camera.position.z += (rState.zoom - camera.position.z) * 0.12;
      camera.lookAt(0, 0.05, 0);

      cradleRingMat.color.setHex(stageDoneRef.current ? 0x34d399 : 0x4fe3d4);

      rig.avionicsLeds.forEach((led, idx) => {
        led.visible = Math.sin(now * 0.007 + idx * 1.8) > -0.25;
      });

      (Object.keys(popAnimRef.current) as RocketPartId[]).forEach((k) => {
        const s = popAnimRef.current[k];
        if (s !== undefined && s < 1) {
          const nextS = Math.min(1, s + 0.12);
          popAnimRef.current[k] = nextS;
          rig.parts[k].scale.setScalar(nextS);
          if (nextS >= 1) delete popAnimRef.current[k];
        }
      });

      const activeId = activeCompRef.current;
      const hoverId = hoveredPortRef.current;
      const flash = portFlashRef.current;
      const pulse = 0.92 + Math.sin(now * 0.006) * 0.16;

      ROCKET_COMPONENTS.forEach((c) => {
        const slot = rig.dropSlots[c.id];
        const isDone = installedRef.current.has(c.id);
        const isFlashing = flash && flash.id === c.id;
        slot.ring.visible = !isDone || Boolean(isFlashing);
        slot.ghost.visible = !isDone && activeId === c.id;

        const mat = slot.ring.material as THREE.MeshBasicMaterial;
        if (isFlashing && flash) {
          mat.color.setHex(flash.kind === 'correct' ? 0x34d399 : 0xef4444);
          slot.ring.scale.setScalar(1.42);
        } else if (!isDone) {
          if (hoverId === c.id) {
            mat.color.setHex(activeId === c.id ? 0x34d399 : 0xef4444);
            slot.ring.scale.setScalar(1.32);
          } else if (activeId === c.id) {
            mat.color.setHex(0x38bdf8);
            slot.ring.scale.setScalar(1.22 * pulse);
          } else {
            mat.color.setHex(0x4fe3d4);
            slot.ring.scale.setScalar(pulse);
          }
        }
      });

      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nextCoords = {} as Record<RocketPartId, ProjectedPort>;
        ROCKET_COMPONENTS.forEach((c) => {
          projVec.set(c.anchorPos.x, c.anchorPos.y, c.anchorPos.z + (c.anchorPos.z === 0 ? 0.54 : 0.14));
          projVec.applyEuler(rig.root.rotation);
          projVec.add(rig.root.position);
          projVec.project(camera);
          nextCoords[c.id] = {
            id: c.id,
            x: (projVec.x * 0.5 + 0.5) * rect.width,
            y: (-projVec.y * 0.5 + 0.5) * rect.height,
            visible: projVec.z <= 1.0,
          };
        });
        setPortCoords(nextCoords);
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      rig.dispose();
      starGeo.dispose();
      starMat.dispose();
      cradleBase.geometry.dispose();
      cradleBaseMat.dispose();
      cradleRing.geometry.dispose();
      cradleRingMat.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  // Pointer Drag-and-Drop tracking across viewport
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const pd = pointerDragRef.current;
      if (!pd.id) return;
      const dist = Math.hypot(e.clientX - pd.startX, e.clientY - pd.startY);
      if (!pd.isDragging && dist > 6) {
        if (touchHoldTimerRef.current) {
          clearTimeout(touchHoldTimerRef.current);
          touchHoldTimerRef.current = null;
        }
        pd.isDragging = true;
        setDraggingId(pd.id);
        setSelectedId(pd.id);
        SFX.select();
      }
      if (pd.isDragging) {
        setDragPos({ x: e.clientX, y: e.clientY });
        const hit = raycastDropSlot(e.clientX, e.clientY);
        setHoveredPortId(hit);
      }
    };

    const handleUp = (e: PointerEvent) => {
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }
      const pd = pointerDragRef.current;
      if (!pd.id) return;
      const draggedCompId = pd.id;
      const wasDragging = pd.isDragging;
      pointerDragRef.current = { id: null, startX: 0, startY: 0, isDragging: false };
      setDraggingId(null);
      setHoveredPortId(null);

      if (wasDragging) {
        const hitTarget = raycastDropSlot(e.clientX, e.clientY);
        if (hitTarget) {
          if (hitTarget === draggedCompId) {
            handleInstall(draggedCompId);
          } else {
            handleReject(draggedCompId, hitTarget);
          }
        } else {
          setLastStatusKind('neutral');
          setNotification({
            badgeLabel: 'RETURNED TO TRAY',
            text: 'Drop the rocket component directly onto one of the numbered target rings (1–10).',
            type: 'neutral',
          });
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [raycastDropSlot, handleInstall, handleReject]);

  const draggedComp = draggingId ? ROCKET_COMPONENTS.find((c) => c.id === draggingId) : null;
  const activeInspectComp =
    draggedComp ?? hoveredComponent ?? (selectedId ? ROCKET_COMPONENTS.find((c) => c.id === selectedId) ?? null : null);

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Dismissible Top Notification Banner */}
      {notification && (
        <div
          className={`fixed top-[108px] left-1/2 -translate-x-1/2 z-[5400] w-[min(560px,92vw)] rounded-xl border px-4 py-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.78)] flex items-start justify-between gap-3 animate-[popIn_0.2s_ease-out] ${
            notification.type === 'success'
              ? 'bg-[#06241b]/95 border-emerald-400 text-emerald-100'
              : notification.type === 'error'
              ? 'bg-[#2a0910]/95 border-red-400 text-red-100'
              : 'bg-[#081733]/95 border-cyan-400/55 text-slate-100'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div
              className={`text-[10px] font-mono-tech font-extrabold tracking-widest uppercase ${
                notification.type === 'success'
                  ? 'text-emerald-300'
                  : notification.type === 'error'
                  ? 'text-red-300'
                  : 'text-[#4fe3d4]'
              }`}
            >
              {notification.badgeLabel}
            </div>
            <div className="text-xs leading-snug mt-0.5">{notification.text}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              SFX.click();
              setNotification(null);
            }}
            aria-label="Close notification"
            className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center justify-center shrink-0 cursor-pointer transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 3-Section Engineering Workshop */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_290px] min-h-0 overflow-hidden">
        {/* LEFT PANEL: 10 ROCKET COMPONENT OBJECTS */}
        <div className="bg-[#060f20] border-r border-cyan-400/20 p-3.5 flex flex-col gap-3 overflow-y-auto">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#4fe3d4]">
              Rocket Components ({ROCKET_COMPONENTS.length - progressStats.count} Left)
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Drag each numbered launch vehicle module (1–10) onto its matching slot.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-2 gap-2">
            {orderedComponents.map((comp) => {
              const isInstalled = installed.has(comp.id);
              const isSelected = selectedId === comp.id;
              const isShaking = shakingId === comp.id;

              return (
                <div
                  key={comp.id}
                  draggable={false}
                  title={`${comp.sequenceStep}. ${comp.name} — ${comp.func}`}
                  onMouseEnter={() => setHoveredComponent(comp)}
                  onMouseLeave={() => setHoveredComponent((prev) => (prev?.id === comp.id ? null : prev))}
                  onTouchStart={() => {
                    touchHoldTimerRef.current = window.setTimeout(() => {
                      setHoveredComponent(comp);
                    }, 260);
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  onPointerDown={(e) => {
                    if (isInstalled) return;
                    pointerDragRef.current = {
                      id: comp.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      isDragging: false,
                    };
                  }}
                  onClick={() => {
                    if (isInstalled) return;
                    SFX.select();
                    setHoveredComponent(comp);
                    setSelectedId((prev) => {
                      const next = prev === comp.id ? null : comp.id;
                      if (next) {
                        rotRef.current.targetYaw = comp.idealYaw;
                        rotRef.current.targetPitch = comp.idealPitch;
                      }
                      return next;
                    });
                  }}
                  className={`group relative p-2 rounded-xl border transition touch-none flex flex-col items-center text-center ${
                    isShaking ? 'animate-[satShake_0.45s]' : ''
                  } ${
                    isInstalled
                      ? 'bg-emerald-500/12 border-emerald-400/50 cursor-default opacity-75'
                      : isSelected
                      ? 'bg-cyan-400/15 border-[#4fe3d4] shadow-[0_0_16px_rgba(79,227,212,0.28)] cursor-grab active:cursor-grabbing'
                      : 'bg-[#0a1730] border-cyan-400/25 hover:border-cyan-400/75 hover:bg-[#0d1f3f] cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <span
                    className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full text-[10px] font-mono-tech font-extrabold flex items-center justify-center border ${
                      isInstalled
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                        : 'bg-[#050d1d] border-cyan-400/60 text-[#4fe3d4]'
                    }`}
                  >
                    {comp.sequenceStep}
                  </span>

                  {isInstalled && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-emerald-400">✓</span>
                  )}

                  <div className="my-1 flex items-center justify-center transition-transform group-hover:scale-105">
                    <RocketComponentObjectSVG id={comp.id} size={46} />
                  </div>

                  <div className="text-[11px] font-bold text-white leading-tight line-clamp-1 w-full">
                    {comp.shortName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dedicated Component Inspector */}
          <div className="mt-auto p-3 rounded-xl bg-[#091833] border border-cyan-400/40 shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
            {activeInspectComp ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 font-display text-xs font-extrabold text-[#4fe3d4] uppercase min-w-0">
                    <RocketComponentObjectSVG id={activeInspectComp.id} size={24} className="shrink-0" />
                    <span className="truncate">{activeInspectComp.name}</span>
                  </div>
                  <span className="text-[10px] font-mono-tech text-amber-300 font-bold shrink-0">
                    #{activeInspectComp.sequenceStep}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 leading-snug">
                  <strong className="text-white">Function:</strong> {activeInspectComp.func}
                </p>
              </>
            ) : (
              <div className="text-[11px] text-slate-400 leading-snug">
                <strong className="text-[#4fe3d4] block mb-0.5">ROCKET INSPECTOR</strong>
                Hover over any rocket component (or tap on mobile) to inspect its aerospace function.
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: CENTRAL 3D ROCKET ASSEMBLY MODEL */}
        <div
          className="relative min-h-[360px] overflow-hidden bg-[#040b18]"
          onDragOver={(e) => {
            e.preventDefault();
            const hit = raycastDropSlot(e.clientX, e.clientY);
            if (hit !== hoveredPortId) setHoveredPortId(hit);
          }}
          onDrop={(e) => {
            e.preventDefault();
            const droppedId = (e.dataTransfer.getData('text/plain') || draggingId || selectedId) as
              | RocketPartId
              | '';
            setHoveredPortId(null);
            setDraggingId(null);
            if (!droppedId) return;
            const hit = raycastDropSlot(e.clientX, e.clientY);
            if (!hit) return;
            if (hit === droppedId) handleInstall(droppedId);
            else handleReject(droppedId, hit);
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              orbitDragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false };
              rotRef.current.targetYaw = null;
              rotRef.current.targetPitch = null;
            }}
            onPointerMove={(e) => {
              const od = orbitDragRef.current;
              if (od.active) {
                const dx = e.clientX - od.lastX;
                const dy = e.clientY - od.lastY;
                if (Math.hypot(dx, dy) > 4) od.moved = true;
                rotRef.current.yaw += dx * 0.009;
                rotRef.current.pitch = Math.max(-0.55, Math.min(0.65, rotRef.current.pitch + dy * 0.008));
                od.lastX = e.clientX;
                od.lastY = e.clientY;
              } else if (!draggingId) {
                const hit = raycastDropSlot(e.clientX, e.clientY);
                if (hit !== hoveredPortId) setHoveredPortId(hit);
              }
            }}
            onPointerUp={(e) => {
              const od = orbitDragRef.current;
              const wasClick = od.active && !od.moved;
              od.active = false;
              if (wasClick && !draggingId) {
                const hit = raycastDropSlot(e.clientX, e.clientY);
                if (hit) {
                  if (!selectedId) {
                    const targetComp = ROCKET_COMPONENTS.find((c) => c.id === hit);
                    if (targetComp) {
                      setLastStatusKind('neutral');
                      setNotification({
                        badgeLabel: `SLOT #${targetComp.sequenceStep}`,
                        text: `Mount zone #${targetComp.sequenceStep} (${targetComp.targetName}). Drag component #${targetComp.sequenceStep} here.`,
                        type: 'neutral',
                      });
                    }
                  } else if (selectedId === hit) {
                    handleInstall(hit);
                  } else {
                    handleReject(selectedId, hit);
                  }
                }
              }
            }}
            onPointerLeave={() => {
              orbitDragRef.current.active = false;
              if (!draggingId) setHoveredPortId(null);
            }}
            onWheel={(e) => {
              rotRef.current.zoom = Math.max(6.8, Math.min(15.0, rotRef.current.zoom + e.deltaY * 0.005));
            }}
          />

          {/* Viewport Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1.5 rounded-lg bg-[#071124]/92 border border-cyan-400/25 text-[11px] font-semibold text-slate-300 pointer-events-auto">
              Drag workspace to rotate 360° • Scroll to zoom
            </div>
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  setAutoRotate((v) => !v);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  autoRotate
                    ? 'bg-cyan-400/15 border-cyan-400/45 text-[#4fe3d4]'
                    : 'bg-[#071124]/92 border-white/15 text-slate-400'
                }`}
              >
                {autoRotate ? 'Auto-Rotate: ON' : 'Auto-Rotate: OFF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  rotRef.current.targetYaw = 0.35;
                  rotRef.current.targetPitch = 0.06;
                  rotRef.current.zoom = 10.6;
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#071124]/92 border border-white/15 hover:border-cyan-400/40 text-slate-300 transition cursor-pointer"
              >
                Reset View
              </button>
            </div>
          </div>

          {/* Numbered Target Markers (1..10) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {ROCKET_COMPONENTS.map((comp) => {
              const p = portCoords[comp.id];
              if (!p || !p.visible) return null;
              const isInstalled = installed.has(comp.id);
              const isNeeded = (draggingId ?? selectedId) === comp.id;
              const isHovered = hoveredPortId === comp.id;
              const isFlashingWrong = portFlash?.id === comp.id && portFlash.kind === 'wrong';
              const isFlashingRight = portFlash?.id === comp.id && portFlash.kind === 'correct';

              return (
                <button
                  type="button"
                  key={comp.id}
                  style={{ left: `${p.x}px`, top: `${p.y}px` }}
                  onClick={() => {
                    if (isInstalled) return;
                    if (!selectedId) {
                      setLastStatusKind('neutral');
                      setNotification({
                        badgeLabel: `SLOT #${comp.sequenceStep}`,
                        text: `Mount zone #${comp.sequenceStep} (${comp.targetName}). Drag component #${comp.sequenceStep} here.`,
                        type: 'neutral',
                      });
                    } else if (selectedId === comp.id) {
                      handleInstall(comp.id);
                    } else {
                      handleReject(selectedId, comp.id);
                    }
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer w-7 h-7 rounded-full font-mono-tech text-xs font-extrabold flex items-center justify-center transition-transform ${
                    isFlashingWrong
                      ? 'bg-red-500/90 border-2 border-red-200 text-white scale-125 shadow-[0_0_20px_rgba(239,68,68,0.9)]'
                      : isFlashingRight
                      ? 'bg-emerald-500/90 border-2 border-emerald-200 text-white scale-125 shadow-[0_0_20px_rgba(52,211,153,0.9)]'
                      : isInstalled
                      ? 'bg-emerald-500/35 border border-emerald-400/80 text-emerald-200 scale-90 opacity-85'
                      : isHovered
                      ? 'bg-cyan-400/45 border-2 border-white text-white scale-120 shadow-[0_0_16px_rgba(79,227,212,0.85)]'
                      : isNeeded
                      ? 'bg-sky-500/50 border-2 border-sky-200 text-white scale-115 shadow-[0_0_14px_rgba(56,189,248,0.75)]'
                      : 'bg-[#071328]/90 border-2 border-[#4fe3d4]/80 text-[#4fe3d4] hover:scale-110 shadow-[0_0_10px_rgba(79,227,212,0.35)]'
                  }`}
                >
                  {isFlashingWrong ? '✕' : isInstalled ? '✓' : comp.sequenceStep}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: ROCKET ENGINEERING PANEL */}
        <div className="bg-[#060f20] border-l border-cyan-400/20 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#4fe3d4]">
                Rocket Engineering Panel
              </span>
              <span
                className={`text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded ${
                  stage2DoneModal
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/45'
                    : lastStatusKind === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-400/45'
                    : 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/35'
                }`}
              >
                {stage2DoneModal
                  ? 'COMPLETE ✓'
                  : lastStatusKind === 'error'
                  ? 'CHECK SLOT'
                  : progressStats.count > 0
                  ? 'STACKING'
                  : 'READY'}
              </span>
            </div>
            <h3 className="font-display text-sm font-extrabold text-white mt-1.5">
              STAGE 2: ROCKET ENGINEERING WORKSHOP
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Integrate all 10 major stages and subsystems of your launch vehicle before rolling out to the launchpad.
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5 italic">
              Simplified educational two-stage launch vehicle configuration inspired by reusable orbital boosters.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#09162e] border border-cyan-400/30">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#4fe3d4] mb-2">
              ROCKET ASSEMBLY PROGRESS
            </div>
            <div className="flex items-center justify-between text-xs text-slate-200 mb-1.5">
              <span>Components installed:</span>
              <strong className="font-mono-tech text-white tabular-nums">
                {progressStats.count}/{progressStats.total}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-200 mb-2.5">
              <span>Progress:</span>
              <strong className="font-mono-tech text-[#4fe3d4] tabular-nums">{progressStats.pct}%</strong>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#38bdf8] via-[#4fe3d4] to-[#34d399] transition-all duration-300"
                style={{ width: `${progressStats.pct}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-between text-[11px] font-mono-tech text-slate-400">
              <span>Dry Mass: {(progressStats.totalMass / 1000).toFixed(1)} t</span>
              <span>Stages: 2</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#081327] border border-white/10 text-[11px] text-slate-300 space-y-1">
            <div className="font-bold text-[#4fe3d4] uppercase tracking-wider text-[10px]">
              Mission Instructions
            </div>
            <div>1. Hover any component to inspect its engineering role.</div>
            <div>2. Drag it onto its matching numbered point (1–10) on the rocket.</div>
            <div>3. Complete all 10 components to unlock Launchpad Positioning.</div>
          </div>

          <button
            type="button"
            onClick={handleResetRocket}
            className="mt-auto w-full py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition cursor-pointer shrink-0"
          >
            Reset Rocket Stack ↺
          </button>
        </div>
      </div>

      {/* Floating Actual Rocket Component Under Cursor */}
      {draggedComp && (
        <div
          style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}
          className="fixed z-[5500] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
        >
          <div
            className={`relative p-2 rounded-2xl border-2 shadow-[0_12px_30px_rgba(0,0,0,0.75)] transition-colors ${
              hoveredPortId
                ? hoveredPortId === draggedComp.id
                  ? 'bg-emerald-500/25 border-emerald-400'
                  : 'bg-red-500/25 border-red-400'
                : 'bg-[#081733]/92 border-[#4fe3d4]'
            }`}
          >
            <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#050d1d] border border-[#4fe3d4] text-[#4fe3d4] font-mono-tech text-[10px] font-extrabold flex items-center justify-center">
              {draggedComp.sequenceStep}
            </span>
            <RocketComponentObjectSVG id={draggedComp.id} size={58} />
          </div>
        </div>
      )}

      {/* Stage 2 Completion Modal (NO Star Credits / Badge Awarded Yet!) */}
      {stage2DoneModal && (
        <div className="fixed inset-0 z-[5600] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-emerald-400/55 p-6 md:p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.9)] animate-[popIn_0.3s_ease-out]">
            <div className="text-[11px] font-mono-tech font-extrabold uppercase tracking-[2.5px] text-emerald-400">
              STAGE 2 COMPLETE // 10 / 10 VERIFIED
            </div>
            <h3 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1.5">
              ROCKET ASSEMBLY SUCCESSFUL!
            </h3>
            <p className="text-xs md:text-sm text-slate-300 mt-3 leading-relaxed">
              Your two-stage orbital launch vehicle is structurally complete and cleared for transport to Launch Complex 39X.
            </p>

            <div className="my-5 p-3.5 rounded-xl bg-[#0b1b38] border border-cyan-400/30 text-xs text-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Next Operation:</span>
                <strong className="text-[#4fe3d4]">Stage 3 – Launchpad Positioning</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Stages:</span>
                <strong className="text-amber-300">2 Stages to Level 1 Rewards</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                SFX.click();
                onCompleteStage2(Array.from(installed));
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase shadow-lg hover:brightness-110 transition cursor-pointer"
            >
              CONTINUE ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
