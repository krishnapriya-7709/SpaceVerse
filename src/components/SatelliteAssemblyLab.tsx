import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  DEFAULT_LEVEL1_PROGRESS,
  LaunchSequenceStatus,
  Level1Progress,
  ROCKET_COMPONENTS,
  RocketPartId,
  SAT_COMPONENTS,
  SatComponentSpec,
  SatSubsystemId,
} from '../data/spaceverseData';
import { buildDetailedSatelliteRig, SatelliteAssemblyRig } from '../three/satelliteBuilder';
import { SFX } from '../utils/sfx';
import { LaunchpadPayloadStage } from './LaunchpadPayloadStage';
import { RocketAssemblyStage } from './RocketAssemblyStage';
import { SatComponentObjectSVG } from './SatComponentIcons';

export interface Level1RewardResult {
  alreadyRewarded: boolean;
  rewardAwarded: number;
  newStarBalance: number;
}

export interface Level1CompletionPayload {
  installedSatParts: SatSubsystemId[];
  installedRocketParts: RocketPartId[];
  stage3LaunchpadDone: boolean;
  stage4PayloadDone: boolean;
  stage5LaunchDone: boolean;
  launchStatus: LaunchSequenceStatus;
}

interface SatelliteAssemblyLabProps {
  visible: boolean;
  starCredits: number;
  alreadyCompleted: boolean;
  initialProgress?: Level1Progress;
  onSaveProgress: (progress: Level1Progress) => void;
  onReplayReset: () => void;
  onCompleteMission: (payload: Level1CompletionPayload) => Promise<Level1RewardResult>;
  onContinueToLevel2: () => void;
  onBackToAcademy: () => void;
  onExit: () => void;
}

interface FeedbackState {
  badgeLabel: string;
  text: string;
  type: 'neutral' | 'success' | 'error';
}

interface ProjectedPort {
  id: SatSubsystemId;
  x: number;
  y: number;
  visible: boolean;
}

const STAGE_TRACKER_ITEMS: { num: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { num: 1, label: 'Stage 1: Satellite Assembly' },
  { num: 2, label: 'Stage 2: Rocket Assembly' },
  { num: 3, label: 'Stage 3: Launchpad Positioning' },
  { num: 4, label: 'Stage 4: Payload Integration' },
  { num: 5, label: 'Stage 5: Rocket Launching' },
];

export const SatelliteAssemblyLab: React.FC<SatelliteAssemblyLabProps> = ({
  visible,
  starCredits,
  alreadyCompleted,
  initialProgress,
  onSaveProgress,
  onReplayReset,
  onCompleteMission,
  onContinueToLevel2,
  onBackToAcademy,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rigRef = useRef<SatelliteAssemblyRig | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [level1Progress, setLevel1Progress] = useState<Level1Progress>(() => ({
    ...DEFAULT_LEVEL1_PROGRESS,
    ...(initialProgress || {}),
  }));
  const progressRef = useRef(level1Progress);
  progressRef.current = level1Progress;

  const [installed, setInstalled] = useState<Set<SatSubsystemId>>(
    () => new Set(initialProgress?.satParts || [])
  );
  const [selectedId, setSelectedId] = useState<SatSubsystemId | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<SatComponentSpec | null>(null);
  const [draggingId, setDraggingId] = useState<SatSubsystemId | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredPortId, setHoveredPortId] = useState<SatSubsystemId | null>(null);
  const [portFlash, setPortFlash] = useState<{ id: SatSubsystemId; kind: 'correct' | 'wrong' } | null>(null);
  const [shakingId, setShakingId] = useState<SatSubsystemId | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [spinningComplete, setSpinningComplete] = useState<boolean>(false);
  const [showStage1SuccessModal, setShowStage1SuccessModal] = useState<boolean>(false);

  const [notification, setNotification] = useState<FeedbackState | null>(null);
  const [lastStatusKind, setLastStatusKind] = useState<'neutral' | 'success' | 'error'>('neutral');

  const [portCoords, setPortCoords] = useState<Record<SatSubsystemId, ProjectedPort>>(() => {
    const init = {} as Record<SatSubsystemId, ProjectedPort>;
    SAT_COMPONENTS.forEach((c) => {
      init[c.id] = { id: c.id, x: 0, y: 0, visible: false };
    });
    return init;
  });

  // Smooth orbital camera & interaction state refs
  const rotRef = useRef({
    yaw: 0.42,
    pitch: 0.2,
    targetYaw: null as number | null,
    targetPitch: null as number | null,
    zoom: 6.4,
  });
  const orbitDragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: false });
  const installedRef = useRef(installed);
  installedRef.current = installed;
  const activeCompRef = useRef<SatSubsystemId | null>(null);
  activeCompRef.current = draggingId ?? selectedId;
  const hoveredPortRef = useRef<SatSubsystemId | null>(null);
  hoveredPortRef.current = hoveredPortId;
  const portFlashRef = useRef<{ id: SatSubsystemId; kind: 'correct' | 'wrong' } | null>(null);
  portFlashRef.current = portFlash;
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const spinningCompleteRef = useRef(spinningComplete);
  spinningCompleteRef.current = spinningComplete;

  const touchHoldTimerRef = useRef<number | null>(null);
  const pointerDragRef = useRef<{
    id: SatSubsystemId | null;
    startX: number;
    startY: number;
    isDragging: boolean;
  }>({ id: null, startX: 0, startY: 0, isDragging: false });
  const popAnimRef = useRef<Partial<Record<SatSubsystemId, number>>>({});
  const completionTriggeredRef = useRef(false);

  // Components ordered 1..9 matching the numbered indicators on the 3D satellite
  const orderedComponents = useMemo(
    () => [...SAT_COMPONENTS].sort((a, b) => a.sequenceStep - b.sequenceStep),
    []
  );

  // Live telemetry & progress
  const progressStats = useMemo(() => {
    const count = installed.size;
    const total = SAT_COMPONENTS.length;
    const pct = Math.round((count / total) * 100);
    let totalMass = 0;
    let netPower = 0;
    SAT_COMPONENTS.forEach((c) => {
      if (installed.has(c.id)) {
        totalMass += c.massKg;
        if (c.id === 'solar') netPower += 1450;
        else if (c.id !== 'battery' && c.id !== 'bus') {
          netPower -= Math.abs(parseInt(c.powerW.replace(/[^0-9-]/g, ''), 10)) || 0;
        }
      }
    });
    return { count, total, pct, totalMass, netPower };
  }, [installed]);

  const handleInstall = useCallback(
    (compId: SatSubsystemId) => {
      if (installedRef.current.has(compId)) return;
      const comp = SAT_COMPONENTS.find((c) => c.id === compId);
      if (!comp) return;

      const next = new Set(installedRef.current);
      next.add(compId);
      setInstalled(next);
      setSelectedId(null);
      setDraggingId(null);
      setHoveredPortId(null);

      const satList = Array.from(next);
      const nextProgress: Level1Progress = {
        ...progressRef.current,
        satParts: satList,
      };
      setLevel1Progress(nextProgress);
      onSaveProgress(nextProgress);

      // Green flash indicator on port
      setPortFlash({ id: compId, kind: 'correct' });
      window.setTimeout(() => setPortFlash((cur) => (cur?.id === compId ? null : cur)), 950);

      const rig = rigRef.current;
      if (rig) {
        if (compId === 'bus') rig.skeletonGuide.visible = false;
        if (rig.parts[compId]) {
          rig.parts[compId].visible = true;
          rig.parts[compId].scale.setScalar(0.08);
          popAnimRef.current[compId] = 0.08;
        }
      }

      SFX.snapCorrect();
      setLastStatusKind('success');
      setNotification({
        badgeLabel: `#${comp.sequenceStep} INSTALLED ✓`,
        text: comp.correctNote,
        type: 'success',
      });

      // Stage 1 completion -> advance to Stage 2 (NO rewards yet!)
      if (next.size === SAT_COMPONENTS.length && !completionTriggeredRef.current) {
        completionTriggeredRef.current = true;
        SFX.taskComplete();
        setSpinningComplete(true);
        if (rig) {
          rig.animatedHandles.thrusterPlumes.forEach((plume) => {
            plume.visible = true;
          });
        }
        setNotification({
          badgeLabel: 'SATELLITE ASSEMBLY SUCCESSFUL ✓',
          text: 'All 9 satellite subsystems are verified! Proceed to Stage 2 to build the launch rocket.',
          type: 'success',
        });

        window.setTimeout(() => {
          setShowStage1SuccessModal(true);
        }, 900);
      }
    },
    [onSaveProgress]
  );

  const handleReject = useCallback((dragged: SatSubsystemId, attemptedTarget: SatSubsystemId) => {
    const comp = SAT_COMPONENTS.find((c) => c.id === dragged);
    const targetComp = SAT_COMPONENTS.find((c) => c.id === attemptedTarget);
    if (!comp) return;

    SFX.snapWrong();
    setShakingId(dragged);
    window.setTimeout(() => setShakingId(null), 480);

    setPortFlash({ id: attemptedTarget, kind: 'wrong' });
    window.setTimeout(() => setPortFlash((cur) => (cur?.id === attemptedTarget ? null : cur)), 1100);

    const reason =
      comp.wrongNotes[attemptedTarget] ||
      `Incorrect position! #${comp.sequenceStep} ${comp.name} does not fit on slot #${targetComp?.sequenceStep ?? '?'}.`;

    setLastStatusKind('error');
    setNotification({
      badgeLabel: 'INCORRECT POSITION ✕',
      text: reason,
      type: 'error',
    });
  }, []);

  const handleResetAssembly = useCallback(() => {
    SFX.click();
    completionTriggeredRef.current = false;
    setInstalled(new Set());
    setSelectedId(null);
    setDraggingId(null);
    setPortFlash(null);
    setSpinningComplete(false);
    setShowStage1SuccessModal(false);
    setLastStatusKind('neutral');
    const nextProgress: Level1Progress = {
      ...progressRef.current,
      satParts: [],
      stage1Done: false,
    };
    setLevel1Progress(nextProgress);
    onSaveProgress(nextProgress);
    const rig = rigRef.current;
    if (rig) {
      rig.skeletonGuide.visible = true;
      SAT_COMPONENTS.forEach((c) => {
        rig.parts[c.id].visible = false;
      });
      rig.animatedHandles.thrusterPlumes.forEach((p) => {
        p.visible = false;
      });
    }
    setNotification({
      badgeLabel: 'ASSEMBLY RESET',
      text: 'Drag each numbered component object (1–9) onto its matching numbered point on the satellite.',
      type: 'neutral',
    });
  }, [onSaveProgress]);

  const handleFullReplayLevel1 = useCallback(() => {
    completionTriggeredRef.current = false;
    const fresh: Level1Progress = { ...DEFAULT_LEVEL1_PROGRESS };
    setLevel1Progress(fresh);
    setInstalled(new Set());
    setSelectedId(null);
    setDraggingId(null);
    setPortFlash(null);
    setSpinningComplete(false);
    setShowStage1SuccessModal(false);
    setLastStatusKind('neutral');
    setNotification(null);
    onReplayReset();
  }, [onReplayReset]);

  // Restore saved progress cleanly whenever the lab opens
  useEffect(() => {
    if (visible) {
      const saved = initialProgress ? { ...DEFAULT_LEVEL1_PROGRESS, ...initialProgress } : { ...DEFAULT_LEVEL1_PROGRESS };
      // If all 5 stages including Rocket Launch completed in a prior run, start replay cleanly at Stage 1
      let effectiveProgress: Level1Progress =
        saved.stage5Done && saved.launchStatus === 'completed'
          ? { ...DEFAULT_LEVEL1_PROGRESS }
          : saved;

      // If interrupted mid-countdown/ignition/ascent, reset launchStatus to 'not_started' so player restarts launch safely
      if (effectiveProgress.stage === 5 && effectiveProgress.launchStatus !== 'completed') {
        const prereqsOk =
          effectiveProgress.stage1Done &&
          effectiveProgress.stage2Done &&
          effectiveProgress.stage3Done &&
          effectiveProgress.stage4Done;
        effectiveProgress = prereqsOk
          ? { ...effectiveProgress, launchStatus: 'not_started' }
          : { ...DEFAULT_LEVEL1_PROGRESS };
      }

      setLevel1Progress(effectiveProgress);
      const restoredSat = new Set<SatSubsystemId>(effectiveProgress.satParts || []);
      setInstalled(restoredSat);
      completionTriggeredRef.current = restoredSat.size === SAT_COMPONENTS.length;
      setSelectedId(null);
      setDraggingId(null);
      setPortFlash(null);
      setSpinningComplete(restoredSat.size === SAT_COMPONENTS.length);
      setShowStage1SuccessModal(
        effectiveProgress.stage === 1 && restoredSat.size === SAT_COMPONENTS.length
      );
      setLastStatusKind('neutral');
      setNotification(null);
    }
  }, [visible, initialProgress]);

  const raycastDropSlot = useCallback((clientX: number, clientY: number): SatSubsystemId | null => {
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
    SAT_COMPONENTS.forEach((c) => {
      if (!installedRef.current.has(c.id)) {
        hitboxes.push(rig.dropSlots[c.id].hitbox);
        rig.dropSlots[c.id].extraHitboxes.forEach((eh) => hitboxes.push(eh));
      }
    });
    const hits = ray.intersectObjects(hitboxes, false);
    if (hits.length > 0 && hits[0].object.userData.compId) {
      return hits[0].object.userData.compId as SatSubsystemId;
    }

    // Fallback screen-space proximity snap (54px radius)
    const lx = clientX - rect.left;
    const ly = clientY - rect.top;
    let bestId: SatSubsystemId | null = null;
    let bestDist = 54;
    SAT_COMPONENTS.forEach((c) => {
      if (installedRef.current.has(c.id)) return;
      const slotPos = new THREE.Vector3(c.anchorPos.x, c.anchorPos.y, c.anchorPos.z);
      slotPos.applyEuler(rig.root.rotation);
      slotPos.add(rig.root.position);
      slotPos.project(cam);
      if (slotPos.z > 1) return;
      const sx = (slotPos.x * 0.5 + 0.5) * rect.width;
      const sy = (-slotPos.y * 0.5 + 0.5) * rect.height;
      const d = Math.hypot(lx - sx, ly - sy);
      if (d < bestDist) {
        bestDist = d;
        bestId = c.id;
      }
    });

    return bestId;
  }, []);

  // Three.js Workshop Viewport Setup (Active during Stage 1)
  useEffect(() => {
    if (!visible || level1Progress.stage !== 1 || !canvasRef.current) return;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b18);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 0.72, 6.4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const hemi = new THREE.HemisphereLight(0xd5ecff, 0x0a162c, 0.7);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.5);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    // Space Starfield Backdrop
    const starPositions = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      const r = 18 + Math.random() * 26;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 8;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.1, transparent: true, opacity: 0.65 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Futuristic Cleanroom Assembly Stand
    const standGroup = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x162033, roughness: 0.35, metalness: 0.85 });
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, 0.28, 36), baseMat);
    standBase.position.y = -2.02;
    standGroup.add(standBase);

    const standRingMat = new THREE.MeshBasicMaterial({ color: 0x4fe3d4 });
    const standRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.045, 16, 48), standRingMat);
    standRing.rotation.x = Math.PI / 2;
    standRing.position.y = -1.87;
    standGroup.add(standRing);

    const standShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 0.82, 24),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.92 })
    );
    standShaft.position.y = -1.48;
    standGroup.add(standShaft);
    scene.add(standGroup);

    const rig = buildDetailedSatelliteRig();
    rig.root.position.set(0, 0.06, 0);
    if (installedRef.current.has('bus')) {
      rig.skeletonGuide.visible = false;
    }
    SAT_COMPONENTS.forEach((c) => {
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
      } else if (spinningCompleteRef.current) {
        rState.yaw += 0.014;
      } else if (
        autoRotateRef.current &&
        !orbitDragRef.current.active &&
        !activeCompRef.current &&
        !hoveredPortRef.current
      ) {
        rState.yaw += 0.0025;
      }

      rig.root.rotation.y = rState.yaw;
      rig.root.rotation.x = rState.pitch;
      camera.position.z += (rState.zoom - camera.position.z) * 0.12;
      camera.lookAt(0, 0, 0);

      // Stand ring glows emerald green on completion!
      if (spinningCompleteRef.current) {
        standRingMat.color.setHex(0x34d399);
      } else {
        standRingMat.color.setHex(0x4fe3d4);
      }

      // Live subsystem animations
      rig.animatedHandles.reactionWheels.forEach((w, idx) => {
        w.rotation.y += 0.08 + idx * 0.03;
      });
      if (rig.animatedHandles.dishGimbal && installedRef.current.has('antenna')) {
        rig.animatedHandles.dishGimbal.rotation.z = Math.sin(now * 0.0012) * 0.12;
      }
      rig.animatedHandles.obcLeds.forEach((led, idx) => {
        led.visible = Math.sin(now * 0.008 + idx * 2) > -0.3;
      });
      if (spinningCompleteRef.current) {
        rig.animatedHandles.thrusterPlumes.forEach((p, idx) => {
          p.scale.y = 0.8 + Math.sin(now * 0.03 + idx) * 0.25;
        });
      }

      // Pop-in scale for newly mounted subsystems
      (Object.keys(popAnimRef.current) as SatSubsystemId[]).forEach((k) => {
        const s = popAnimRef.current[k];
        if (s !== undefined && s < 1) {
          const nextS = Math.min(1, s + 0.12);
          popAnimRef.current[k] = nextS;
          rig.parts[k].scale.setScalar(nextS);
          if (nextS >= 1) delete popAnimRef.current[k];
        }
      });

      // Drop rings, green/red flash rings, & ghost holograms
      const activeId = activeCompRef.current;
      const hoverId = hoveredPortRef.current;
      const flash = portFlashRef.current;
      const pulse = 0.92 + Math.sin(now * 0.006) * 0.16;

      SAT_COMPONENTS.forEach((c) => {
        const slot = rig.dropSlots[c.id];
        const isDone = installedRef.current.has(c.id);
        const isFlashing = flash && flash.id === c.id;
        slot.ring.visible = !isDone || Boolean(isFlashing);
        slot.ghost.visible = !isDone && activeId === c.id;

        const mat = slot.ring.material as THREE.MeshBasicMaterial;
        if (isFlashing && flash) {
          mat.color.setHex(flash.kind === 'correct' ? 0x34d399 : 0xef4444);
          slot.ring.scale.setScalar(1.45);
        } else if (!isDone) {
          if (hoverId === c.id) {
            mat.color.setHex(activeId === c.id ? 0x34d399 : 0xef4444);
            slot.ring.scale.setScalar(1.34);
          } else if (activeId === c.id) {
            mat.color.setHex(0x38bdf8);
            slot.ring.scale.setScalar(1.22 * pulse);
          } else {
            mat.color.setHex(0x4fe3d4);
            slot.ring.scale.setScalar(pulse);
          }
        }
      });

      // Project 2D port coordinates
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const nextCoords = {} as Record<SatSubsystemId, ProjectedPort>;
        SAT_COMPONENTS.forEach((c) => {
          projVec.set(c.anchorPos.x, c.anchorPos.y, c.anchorPos.z);
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
      standBase.geometry.dispose();
      baseMat.dispose();
      standRing.geometry.dispose();
      standShaft.geometry.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [visible, level1Progress.stage]);

  // Unified Pointer Drag-and-Drop tracking across viewport (Stage 1)
  useEffect(() => {
    if (!visible || level1Progress.stage !== 1) return;

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
            text: 'Drop the component directly onto one of the numbered target rings (1–9) on the satellite.',
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
  }, [visible, level1Progress.stage, raycastDropSlot, handleInstall, handleReject]);

  if (!visible) return null;

  const draggedComp = draggingId ? SAT_COMPONENTS.find((c) => c.id === draggingId) : null;
  const activeInspectComp = draggedComp ?? hoveredComponent ?? (selectedId ? SAT_COMPONENTS.find((c) => c.id === selectedId) ?? null : null);
  const activeStage = level1Progress.stage;

  return (
    <div className="fixed inset-0 z-[5000] flex flex-col bg-[#030816] text-[#e8eefc] select-none">
      {/* Top Workshop Bar */}
      <div className="h-[56px] px-4 md:px-6 bg-[#071124] border-b border-cyan-400/30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded bg-cyan-400/15 border border-cyan-400/45 text-[#4fe3d4] text-[11px] font-bold tracking-wider uppercase shrink-0">
            LEVEL 01
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-sm md:text-base font-extrabold tracking-wide text-white truncate">
              LEVEL 1 – SATELLITE &amp; ROCKET ASSEMBLY
            </h2>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              SPACEVERSE // GALAXY-X 5-Stage Aerospace Engineering Mission
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-[#0b1933] border border-amber-400/30 px-3 py-1.5 rounded-lg">
            <span className="text-amber-300 text-sm">⭐</span>
            <span className="font-mono-tech font-bold text-amber-300 text-xs tabular-nums">
              {starCredits.toLocaleString()} SC
            </span>
          </div>

          <button
            onClick={() => {
              SFX.stopAllLaunchAudio();
              SFX.click();
              onBackToAcademy();
            }}
            className="px-3 py-1.5 rounded-lg border border-cyan-400/35 bg-cyan-400/10 hover:bg-cyan-400/20 text-[#4fe3d4] text-xs font-bold transition cursor-pointer hidden sm:inline-flex"
          >
            Back to Academy
          </button>

          <button
            onClick={() => {
              SFX.stopAllLaunchAudio();
              SFX.click();
              onExit();
            }}
            className="px-3 py-1.5 rounded-lg border border-red-400/40 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold transition cursor-pointer"
          >
            Exit ✕
          </button>
        </div>
      </div>

      {/* Persistent 5-Stage Progress Tracker Header */}
      <div className="bg-[#050d1d] border-b border-cyan-400/20 px-3 md:px-6 py-2 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 max-w-7xl mx-auto">
          {STAGE_TRACKER_ITEMS.map((item) => {
            const isCompleted =
              (item.num === 1 && level1Progress.stage1Done) ||
              (item.num === 2 && level1Progress.stage2Done) ||
              (item.num === 3 && level1Progress.stage3Done) ||
              (item.num === 4 && level1Progress.stage4Done) ||
              (item.num === 5 && level1Progress.stage5Done);
            const isCurrent = activeStage === item.num && !isCompleted;

            return (
              <div
                key={item.num}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-2 transition ${
                  isCompleted
                    ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
                    : isCurrent
                    ? 'bg-cyan-400/15 border-[#4fe3d4] text-white shadow-[0_0_14px_rgba(79,227,212,0.22)]'
                    : 'bg-[#081326] border-white/10 text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-mono-tech font-extrabold flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500 text-[#03120b]'
                      : isCurrent
                      ? 'bg-[#4fe3d4] text-[#041022]'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : item.num}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conditional Stage Views */}
      {activeStage === 2 ? (
        <RocketAssemblyStage
          initialInstalledParts={level1Progress.rocketParts}
          onProgressChange={(parts) => {
            const nextProgress: Level1Progress = {
              ...progressRef.current,
              rocketParts: parts,
            };
            setLevel1Progress(nextProgress);
            onSaveProgress(nextProgress);
          }}
          onCompleteStage2={(parts) => {
            const nextProgress: Level1Progress = {
              ...progressRef.current,
              stage: 3,
              rocketParts: parts,
              stage1Done: true,
              stage2Done: true,
            };
            setLevel1Progress(nextProgress);
            onSaveProgress(nextProgress);
          }}
        />
      ) : activeStage === 3 || activeStage === 4 || activeStage === 5 ? (
        <LaunchpadPayloadStage
          mode={activeStage === 3 ? 'stage3' : activeStage === 4 ? 'stage4' : 'stage5'}
          starCredits={starCredits}
          alreadyCompleted={alreadyCompleted}
          onCompleteStage3={() => {
            const nextProgress: Level1Progress = {
              ...progressRef.current,
              stage: 4,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
            };
            setLevel1Progress(nextProgress);
            onSaveProgress(nextProgress);
          }}
          onCompleteStage4={() => {
            const nextProgress: Level1Progress = {
              ...progressRef.current,
              stage: 5,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
              stage4Done: true,
              stage5Done: false,
              launchStatus: 'not_started',
            };
            setLevel1Progress(nextProgress);
            onSaveProgress(nextProgress);
          }}
          onLaunchStatusChange={(status) => {
            const nextProgress: Level1Progress = {
              ...progressRef.current,
              stage: 5,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
              stage4Done: true,
              stage5Done: status === 'completed',
              launchStatus: status,
            };
            setLevel1Progress(nextProgress);
            onSaveProgress(nextProgress);
          }}
          onCompleteAllStages={async () => {
            const allSat =
              progressRef.current.satParts.length === SAT_COMPONENTS.length
                ? progressRef.current.satParts
                : SAT_COMPONENTS.map((c) => c.id);
            const allRocket =
              progressRef.current.rocketParts.length === ROCKET_COMPONENTS.length
                ? progressRef.current.rocketParts
                : ROCKET_COMPONENTS.map((c) => c.id);
            const doneProgress: Level1Progress = {
              stage: 5,
              satParts: allSat,
              rocketParts: allRocket,
              stage1Done: true,
              stage2Done: true,
              stage3Done: true,
              stage4Done: true,
              stage5Done: true,
              launchStatus: 'completed',
            };
            setLevel1Progress(doneProgress);
            return onCompleteMission({
              installedSatParts: allSat,
              installedRocketParts: allRocket,
              stage3LaunchpadDone: true,
              stage4PayloadDone: true,
              stage5LaunchDone: true,
              launchStatus: 'completed',
            });
          }}
          onContinueToLevel2={() => {
            SFX.stopAllLaunchAudio();
            onContinueToLevel2();
          }}
          onReplayLevel1={() => {
            SFX.stopAllLaunchAudio();
            handleFullReplayLevel1();
          }}
          onBackToAcademy={() => {
            SFX.stopAllLaunchAudio();
            onBackToAcademy();
          }}
        />
      ) : (
        <>

      {/* Dismissible Top Notification Banner (Replaces inline right-panel feedback) */}
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

      {/* Main 3-Section Engineering Workshop: LEFT Object Tray | MIDDLE 3D Assembly | RIGHT Mission Info */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_290px] min-h-0 overflow-hidden">
        {/* LEFT SECTION: SATELLITE COMPONENT OBJECTS (1..9 + Hover Function Inspector) */}
        <div className="bg-[#060f20] border-r border-cyan-400/20 p-3.5 flex flex-col gap-3 overflow-y-auto">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#4fe3d4]">
              Satellite Components ({SAT_COMPONENTS.length - progressStats.count} Left)
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Match number (1–9) &amp; drag each subsystem object onto the satellite.
            </p>
          </div>

          {/* 9 Visual Object Cards (Ordered 1..9 to match Satellite Numbers) */}
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
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
                  {/* Matching Number Badge (1..9) */}
                  <span
                    className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full text-[10px] font-mono-tech font-extrabold flex items-center justify-center border ${
                      isInstalled
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                        : 'bg-[#050d1d] border-cyan-400/60 text-[#4fe3d4]'
                    }`}
                  >
                    {comp.sequenceStep}
                  </span>

                  {/* Status Checkmark */}
                  {isInstalled && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-emerald-400">
                      ✓
                    </span>
                  )}

                  {/* Realistic 3D-Styled Object Graphic */}
                  <div className="my-1 flex items-center justify-center transition-transform group-hover:scale-105">
                    <SatComponentObjectSVG id={comp.id} size={50} />
                  </div>

                  <div className="text-[11px] font-bold text-white leading-tight line-clamp-1 w-full">
                    {comp.shortName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dedicated Component Inspector / Hover Info Card */}
          <div className="mt-auto p-3 rounded-xl bg-[#091833] border border-cyan-400/40 shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
            {activeInspectComp ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 font-display text-xs font-extrabold text-[#4fe3d4] uppercase min-w-0">
                    <SatComponentObjectSVG id={activeInspectComp.id} size={24} className="shrink-0" />
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
                <strong className="text-[#4fe3d4] block mb-0.5">COMPONENT INSPECTOR</strong>
                Hover over any component object (or touch &amp; hold on mobile) to view its name &amp; function.
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE SECTION: CENTRAL 3D SATELLITE ASSEMBLY AREA */}
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
              | SatSubsystemId
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
                rotRef.current.pitch = Math.max(-0.85, Math.min(0.95, rotRef.current.pitch + dy * 0.009));
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
                    const targetComp = SAT_COMPONENTS.find((c) => c.id === hit);
                    if (targetComp) {
                      setLastStatusKind('neutral');
                      setNotification({
                        badgeLabel: `SLOT #${targetComp.sequenceStep}`,
                        text: `Mounting point #${targetComp.sequenceStep}. Drag component #${targetComp.sequenceStep} here from the left panel.`,
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
              rotRef.current.zoom = Math.max(4.0, Math.min(9.5, rotRef.current.zoom + e.deltaY * 0.004));
            }}
          />

          {/* Viewport Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1.5 rounded-lg bg-[#071124]/92 border border-cyan-400/25 text-[11px] font-semibold text-slate-300 pointer-events-auto">
              Drag workspace to rotate 360° • Scroll to zoom
            </div>
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
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
                onClick={() => {
                  SFX.click();
                  rotRef.current.targetYaw = 0.42;
                  rotRef.current.targetPitch = 0.2;
                  rotRef.current.zoom = 6.4;
                }}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#071124]/92 border border-white/15 hover:border-cyan-400/40 text-slate-300 transition cursor-pointer"
              >
                Reset View
              </button>
            </div>
          </div>

          {/* Compact Numbered Markers (1..9) Only — Zero Obstructing Text */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {SAT_COMPONENTS.map((comp) => {
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
                        text: `Mounting point #${comp.sequenceStep}. Drag component #${comp.sequenceStep} here from the left tray.`,
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
                      ? 'bg-red-500/85 border-2 border-red-200 text-white scale-125 shadow-[0_0_20px_rgba(239,68,68,0.9)]'
                      : isFlashingRight
                      ? 'bg-emerald-500/85 border-2 border-emerald-200 text-white scale-125 shadow-[0_0_20px_rgba(52,211,153,0.9)]'
                      : isInstalled
                      ? 'bg-emerald-500/35 border border-emerald-400/80 text-emerald-200 scale-90 opacity-85'
                      : isHovered
                      ? 'bg-cyan-400/40 border-2 border-white text-white scale-120 shadow-[0_0_16px_rgba(79,227,212,0.85)]'
                      : isNeeded
                      ? 'bg-sky-500/45 border-2 border-sky-200 text-white animate-[pulseTarget_1.1s_infinite]'
                      : 'bg-[#071328]/90 border-2 border-[#4fe3d4]/80 text-[#4fe3d4] hover:scale-110 shadow-[0_0_10px_rgba(79,227,212,0.35)]'
                  }`}
                >
                  {isFlashingWrong ? '✕' : isInstalled ? '✓' : comp.sequenceStep}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT SECTION: CLEAN MISSION INFORMATION PANEL */}
        <div className="bg-[#060f20] border-l border-cyan-400/20 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#4fe3d4]">
                Mission Information
              </span>
              <span
                className={`text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded ${
                  spinningComplete
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/45'
                    : lastStatusKind === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-400/45'
                    : 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/35'
                }`}
              >
                {spinningComplete
                  ? 'COMPLETE ✓'
                  : lastStatusKind === 'error'
                  ? 'CHECK SLOT'
                  : progressStats.count > 0
                  ? 'ASSEMBLING'
                  : 'READY'}
              </span>
            </div>
            <h3 className="font-display text-sm font-extrabold text-white mt-1.5">
              LEVEL 1 – SATELLITE ASSEMBLY
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Mission Objective: Construct a functional Earth observation satellite by installing all 9 essential subsystems onto their matching numbered positions (1–9).
            </p>
          </div>

          {/* Animated Assembly Progress */}
          <div className="p-3.5 rounded-xl bg-[#09162e] border border-cyan-400/30">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#4fe3d4] mb-2">
              ASSEMBLY PROGRESS
            </div>
            <div className="flex items-center justify-between text-xs text-slate-200 mb-1.5">
              <span>Components installed:</span>
              <strong className="font-mono-tech text-white tabular-nums">
                {progressStats.count}/{progressStats.total}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-200 mb-2.5">
              <span>Progress:</span>
              <strong className="font-mono-tech text-[#4fe3d4] tabular-nums">
                {progressStats.pct}%
              </strong>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#38bdf8] via-[#4fe3d4] to-[#34d399] transition-all duration-300"
                style={{ width: `${progressStats.pct}%` }}
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex justify-between text-[11px] font-mono-tech text-slate-400">
              <span>Mass: {progressStats.totalMass} kg</span>
              <span>
                Power: {progressStats.netPower >= 0 ? `+${progressStats.netPower} W` : `${progressStats.netPower} W`}
              </span>
            </div>
          </div>

          <button
            onClick={handleResetAssembly}
            className="mt-auto w-full py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition cursor-pointer shrink-0"
          >
            Reset Assembly ↺
          </button>
        </div>
      </div>

      {/* Floating Actual Object Dragged Under Cursor */}
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
            <SatComponentObjectSVG id={draggedComp.id} size={62} />
          </div>
        </div>
      )}

      {/* Stage 1 Completion Modal (Advances to Stage 2 — NO Star Credits / Badge Awarded Yet!) */}
      {showStage1SuccessModal && (
        <div className="fixed inset-0 z-[5600] bg-black/82 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-emerald-400/55 p-6 md:p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.9)] animate-[popIn_0.3s_ease-out]">
            <div className="text-[11px] font-mono-tech font-extrabold uppercase tracking-[2.5px] text-emerald-400">
              STAGE 1 COMPLETE // 9 / 9 VERIFIED
            </div>
            <h3 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1.5">
              SATELLITE ASSEMBLY SUCCESSFUL!
            </h3>
            <p className="text-xs md:text-sm text-slate-300 mt-3 leading-relaxed">
              Your Earth observation satellite is fully integrated and checked out! Next, assemble the two-stage launch vehicle required to lift it into orbit.
            </p>

            <div className="my-5 p-3.5 rounded-xl bg-[#0b1b38] border border-cyan-400/30 text-xs text-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Next Operation:</span>
                <strong className="text-[#4fe3d4]">Stage 2 – Rocket Assembly</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mission Status:</span>
                <strong className="text-amber-300">Complete All 5 Stages for Rewards</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                SFX.click();
                setShowStage1SuccessModal(false);
                const nextProgress: Level1Progress = {
                  ...progressRef.current,
                  stage: 2,
                  satParts: Array.from(installed),
                  stage1Done: true,
                };
                setLevel1Progress(nextProgress);
                onSaveProgress(nextProgress);
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase shadow-lg hover:brightness-110 transition cursor-pointer"
            >
              CONTINUE TO ROCKET ASSEMBLY ▶
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
