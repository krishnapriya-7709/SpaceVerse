import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  LaunchSequenceStatus,
  ROCKET_COMPONENTS,
  SAT_COMPONENTS,
} from '../data/spaceverseData';
import {
  buildLaunchpadEnvironment,
  buildDetailedRocketRig,
  LaunchpadEnvironmentHandle,
  RocketAssemblyRig,
} from '../three/rocketBuilder';
import { buildDetailedSatelliteRig, SatelliteAssemblyRig } from '../three/satelliteBuilder';
import { RocketLaunchAudioHandle, SFX } from '../utils/sfx';
import { SatelliteBuilderBadgeSVG, SatelliteIllustrationSVG } from './BadgesSVG';
import { Level1RewardResult } from './SatelliteAssemblyLab';

interface LaunchpadPayloadStageProps {
  mode: 'stage3' | 'stage4' | 'stage5';
  starCredits: number;
  alreadyCompleted: boolean;
  onCompleteStage3: () => void;
  onCompleteStage4: () => void;
  onLaunchStatusChange: (status: LaunchSequenceStatus) => void;
  onCompleteAllStages: () => Promise<Level1RewardResult>;
  onContinueToLevel2: () => void;
  onReplayLevel1: () => void;
  onBackToAcademy: () => void;
}

interface NotificationState {
  badgeLabel: string;
  text: string;
  type: 'neutral' | 'success' | 'error';
}

type Stage5Phase = 'prep' | 'countdown' | 'ignition' | 'liftoff' | 'ascent' | 'space' | 'completed';

const LAUNCH_DURATION_SEC = 11.5;

const ConfettiOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#4fe3d4', '#38bdf8', '#f2c14e', '#34d399', '#ffffff'];
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 240,
      vx: (Math.random() - 0.5) * 3.2,
      vy: 2.2 + Math.random() * 3.8,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.16,
      color: colors[Math.floor(Math.random() * colors.length)],
      isStar: Math.random() > 0.45,
    }));

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;
        if (p.y > canvas.height + 20) {
          p.y = -15;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.isStar) {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i * Math.PI * 2) / 5;
            ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
            ctx.lineTo(
              Math.cos(a + Math.PI / 5) * (p.size * 0.45),
              Math.sin(a + Math.PI / 5) * (p.size * 0.45)
            );
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        }
        ctx.restore();
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[5550]" />;
};

export const LaunchpadPayloadStage: React.FC<LaunchpadPayloadStageProps> = ({
  mode,
  starCredits,
  alreadyCompleted,
  onCompleteStage3,
  onCompleteStage4,
  onLaunchStatusChange,
  onCompleteAllStages,
  onContinueToLevel2,
  onReplayLevel1,
  onBackToAcademy,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const padRef = useRef<LaunchpadEnvironmentHandle | null>(null);
  const rocketRef = useRef<RocketAssemblyRig | null>(null);
  const payloadSatRef = useRef<SatelliteAssemblyRig | null>(null);
  const adapterHitboxRef = useRef<THREE.Mesh | null>(null);
  const wrongHitboxesRef = useRef<THREE.Mesh[]>([]);
  const rocketBaseYRef = useRef<number>(4.09);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Stage 3 cinematic camera sweep state (0 -> 1 over ~3.2s)
  const sweepProgressRef = useRef<number>(0);
  const [stage3Ready, setStage3Ready] = useState<boolean>(false);

  // Stage 4 fairing & satellite drag-and-drop state
  const fairingTargetOpenRef = useRef<number>(0);
  const fairingCurrentOpenRef = useRef<number>(0);
  const [satIntegrated, setSatIntegrated] = useState<boolean>(mode === 'stage5');
  const satIntegratedRef = useRef(satIntegrated);
  satIntegratedRef.current = satIntegrated;
  const [fairingSealed, setFairingSealed] = useState<boolean>(mode === 'stage5');
  const stage4CompletedRef = useRef<boolean>(mode === 'stage5');

  // Stage 5 Rocket Launch & Audio state
  const [launchPhase, setLaunchPhase] = useState<Stage5Phase>('prep');
  const launchPhaseRef = useRef<Stage5Phase>('prep');
  launchPhaseRef.current = launchPhase;
  const [countdownNum, setCountdownNum] = useState<3 | 2 | 1 | null>(null);
  const [flightTelemetry, setFlightTelemetry] = useState<{
    tPlus: number;
    altKm: number;
    velKmh: number;
    phaseLabel: string;
  }>({ tPlus: 0, altKm: 0, velKmh: 0, phaseLabel: 'LAUNCH VEHICLE ARMED' });
  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());
  const [volume, setVolume] = useState<number>(() => Math.round(SFX.getVolume() * 100));

  const launchStartedLockRef = useRef<boolean>(false);
  const launchElapsedRef = useRef<number>(0);
  const launchCompletionTriggeredRef = useRef<boolean>(false);
  const ascentStatusSentRef = useRef<boolean>(false);
  const launchAudioRef = useRef<RocketLaunchAudioHandle | null>(null);
  const timersRef = useRef<number[]>([]);

  const [showFinalCelebration, setShowFinalCelebration] = useState<boolean>(false);
  const [rewardOutcome, setRewardOutcome] = useState<Level1RewardResult | null>(null);

  const [draggingSat, setDraggingSat] = useState<boolean>(false);
  const [satSelected, setSatSelected] = useState<boolean>(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverZone, setHoverZone] = useState<'none' | 'adapter' | 'wrong'>('none');
  const hoverZoneRef = useRef<'none' | 'adapter' | 'wrong'>('none');
  hoverZoneRef.current = hoverZone;
  const [adapterScreenPos, setAdapterScreenPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const pointerDragRef = useRef<{ active: boolean; startX: number; startY: number; dragging: boolean }>({
    active: false,
    startX: 0,
    startY: 0,
    dragging: false,
  });

  const clearScheduledTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  // Stop all audio and timers if component unmounts or exits early
  useEffect(() => {
    return () => {
      clearScheduledTimers();
      launchAudioRef.current?.stop();
      launchAudioRef.current = null;
      SFX.stopAllLaunchAudio();
    };
  }, [clearScheduledTimers]);

  // React to mode changes across Stage 3 -> Stage 4 -> Stage 5
  useEffect(() => {
    if (mode === 'stage3') {
      sweepProgressRef.current = 0;
      setStage3Ready(false);
      fairingTargetOpenRef.current = 0;
      setNotification({
        badgeLabel: 'STAGE 3 // LAUNCHPAD POSITIONING',
        text: 'Rocket erected vertically on Launch Complex 39X. Performing structural inspection sweep from base to fairing.',
        type: 'neutral',
      });
    } else if (mode === 'stage4') {
      if (!satIntegratedRef.current) {
        fairingTargetOpenRef.current = 1;
        setNotification({
          badgeLabel: 'STAGE 4 // PAYLOAD INTEGRATION',
          text: 'Payload fairing opened! Drag your completed satellite into the glowing payload adapter inside the nose cone.',
          type: 'neutral',
        });
      }
    } else if (mode === 'stage5') {
      fairingTargetOpenRef.current = 0;
      fairingCurrentOpenRef.current = 0;
      satIntegratedRef.current = true;
      setSatIntegrated(true);
      setFairingSealed(true);
      if (payloadSatRef.current) {
        payloadSatRef.current.root.visible = true;
        payloadSatRef.current.root.scale.setScalar(0.28);
      }
      if (!launchStartedLockRef.current) {
        setLaunchPhase('prep');
        setNotification({
          badgeLabel: 'STAGE 5 // LAUNCH COMPLEX 39X ARMED',
          text: 'All assembly stages verified. Review pre-launch checklist and initiate rocket launch when ready!',
          type: 'success',
        });
      }
    }
  }, [mode]);

  const replayCameraSweep = useCallback(() => {
    SFX.click();
    sweepProgressRef.current = 0;
    setStage3Ready(false);
  }, []);

  // Raycast helper for Stage 4 fairing payload adapter drop zone
  const evaluateStage4DropTarget = useCallback((clientX: number, clientY: number): 'none' | 'adapter' | 'wrong' => {
    const canvas = canvasRef.current;
    const cam = cameraRef.current;
    const adapterMesh = adapterHitboxRef.current;
    if (!canvas || !cam || !adapterMesh) return 'none';

    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return 'none';
    }

    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, cam);

    if (ray.intersectObject(adapterMesh, false).length > 0) {
      return 'adapter';
    }

    // Screen-space proximity tolerance around projected fairing adapter (68px)
    const worldPos = new THREE.Vector3();
    adapterMesh.getWorldPosition(worldPos);
    worldPos.project(cam);
    if (worldPos.z <= 1) {
      const sx = rect.left + (worldPos.x * 0.5 + 0.5) * rect.width;
      const sy = rect.top + (-worldPos.y * 0.5 + 0.5) * rect.height;
      if (Math.hypot(clientX - sx, clientY - sy) < 68) {
        return 'adapter';
      }
    }

    if (ray.intersectObjects(wrongHitboxesRef.current, false).length > 0) {
      return 'wrong';
    }
    return 'wrong';
  }, []);

  const triggerPayloadSnap = useCallback(() => {
    if (satIntegratedRef.current || stage4CompletedRef.current) return;
    stage4CompletedRef.current = true;
    satIntegratedRef.current = true;
    setSatIntegrated(true);
    setDraggingSat(false);
    setSatSelected(false);
    setHoverZone('none');

    SFX.snapCorrect();
    if (payloadSatRef.current) {
      payloadSatRef.current.root.visible = true;
      payloadSatRef.current.root.scale.setScalar(0.05);
    }

    setNotification({
      badgeLabel: 'PERFECT PAYLOAD INTEGRATION! ✓',
      text: 'Satellite locked onto upper-stage payload adapter! Sealing nose fairing halves...',
      type: 'success',
    });

    // Smoothly close fairing halves around satellite, then advance to Stage 5 (NO rewards yet!)
    const t1 = window.setTimeout(() => {
      fairingTargetOpenRef.current = 0;
    }, 650);

    const t2 = window.setTimeout(() => {
      setFairingSealed(true);
      SFX.taskComplete();
      setNotification({
        badgeLabel: 'FAIRING SEALED ✓',
        text: 'SATELLITE PAYLOAD SUCCESSFULLY INTEGRATED! Advancing to Stage 5: Rocket Launch Preparation.',
        type: 'success',
      });
    }, 1850);

    const t3 = window.setTimeout(() => {
      onCompleteStage4();
    }, 2900);

    timersRef.current.push(t1, t2, t3);
  }, [onCompleteStage4]);

  const handleWrongPayloadDrop = useCallback(() => {
    SFX.snapWrong();
    setDraggingSat(false);
    setHoverZone('none');
    setNotification({
      badgeLabel: 'INCORRECT POSITION ✕',
      text: 'Incorrect position! Place the satellite directly onto the glowing payload mounting adapter inside the open nose fairing.',
      type: 'error',
    });
  }, []);

  const handleInitiateLaunch = useCallback(() => {
    if (launchStartedLockRef.current) return;
    launchStartedLockRef.current = true;
    launchElapsedRef.current = 0;
    launchCompletionTriggeredRef.current = false;
    ascentStatusSentRef.current = false;

    setNotification(null);
    setLaunchPhase('countdown');
    onLaunchStatusChange('countdown');

    // Dramatic 3 -> 2 -> 1 -> Ignition countdown (non-skippable)
    setCountdownNum(3);
    SFX.countdownBeep(3);

    const t2 = window.setTimeout(() => {
      setCountdownNum(2);
      SFX.countdownBeep(2);
    }, 1050);

    const t1 = window.setTimeout(() => {
      setCountdownNum(1);
      SFX.countdownBeep(1);
    }, 2100);

    const tGo = window.setTimeout(() => {
      setCountdownNum(null);
      launchElapsedRef.current = 0;
      setLaunchPhase('ignition');
      onLaunchStatusChange('ignition');
      SFX.playIgnitionBurst();
      launchAudioRef.current = SFX.createRocketLaunchAudio();
    }, 3150);

    timersRef.current.push(t2, t1, tGo);
  }, [onLaunchStatusChange]);

  const finishLaunchAndClaimRewards = useCallback(() => {
    if (launchCompletionTriggeredRef.current) return;
    launchCompletionTriggeredRef.current = true;
    setLaunchPhase('completed');
    launchAudioRef.current?.setPhase('space');
    const stopTimer = window.setTimeout(() => {
      launchAudioRef.current?.stop();
      launchAudioRef.current = null;
    }, 900);
    timersRef.current.push(stopTimer);

    onCompleteAllStages().then((result) => {
      setRewardOutcome(result);
      SFX.levelComplete();
      const badgeTimer = window.setTimeout(() => SFX.badgeUnlock(), 220);
      timersRef.current.push(badgeTimer);
      setShowFinalCelebration(true);
    });
  }, [onCompleteAllStages]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = SFX.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const nextPct = Number(e.target.value);
    setVolume(nextPct);
    SFX.setVolume(nextPct / 100);
    if (nextPct > 0 && SFX.isMuted()) {
      setMuted(SFX.setMuted(false));
    }
  }, []);

  // Three.js Coastal Launchpad -> Orbital Ascent Scene (Shared across Stage 3, Stage 4, Stage 5)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const skyLowColor = new THREE.Color(0x0b1f3f);
    const skyMidColor = new THREE.Color(0x050e24);
    const skySpaceColor = new THREE.Color(0x02040a);
    const activeSkyColor = new THREE.Color(0x0b1f3f);

    const scene = new THREE.Scene();
    scene.background = activeSkyColor;
    const fog = new THREE.FogExp2(0x0b1f3f, 0.0085);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 520);
    camera.position.set(5.2, 2.2, 11.2);
    camera.lookAt(0, 1.8, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const hemi = new THREE.HemisphereLight(0xc7e3ff, 0x16243b, 0.85);
    scene.add(hemi);
    const sunKey = new THREE.DirectionalLight(0xffe8c2, 1.75);
    sunKey.position.set(14, 18, 12);
    scene.add(sunKey);
    const skyRim = new THREE.DirectionalLight(0x38bdf8, 0.9);
    skyRim.position.set(-10, 9, -8);
    scene.add(skyRim);

    // Dynamic Exhaust Pad Illumination Light (lights up pad & clouds during launch!)
    const exhaustLight = new THREE.PointLight(0xf97316, 0, 38);
    exhaustLight.position.set(0, 1.2, 1.2);
    scene.add(exhaustLight);

    // Low-altitude zenith stars + dense deep-space starfield shell
    const starPositions = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 190;
      starPositions[i * 3 + 1] = 10 + Math.random() * 190;
      starPositions[i * 3 + 2] = -25 - Math.random() * 110;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.24, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Coastal Launchpad Environment + Curved Earth Sphere
    const padEnv = buildLaunchpadEnvironment();
    padRef.current = padEnv;
    scene.add(padEnv.group);

    // Completed 10-part Rocket erected vertically flush on launch ring mount
    const rocketRig = buildDetailedRocketRig();
    rocketRig.skeletonGuide.visible = false;
    ROCKET_COMPONENTS.forEach((c) => {
      rocketRig.parts[c.id].visible = true;
      rocketRig.dropSlots[c.id].ring.visible = false;
      rocketRig.dropSlots[c.id].ghost.visible = false;
    });
    const rocketBasePosY = padEnv.rocketMountY - rocketRig.baseBottomY; // ~4.09
    rocketBaseYRef.current = rocketBasePosY;
    rocketRig.root.position.set(0, rocketBasePosY, 0);
    rocketRef.current = rocketRig;
    scene.add(rocketRig.root);

    // Completed 9-part Satellite mounted inside nose cone fairing
    const satRig = buildDetailedSatelliteRig();
    satRig.skeletonGuide.visible = false;
    SAT_COMPONENTS.forEach((c) => {
      satRig.parts[c.id].visible = true;
      satRig.dropSlots[c.id].ring.visible = false;
      satRig.dropSlots[c.id].ghost.visible = false;
    });
    satRig.root.scale.setScalar(0.28);
    const satWorldMountY = rocketBasePosY + rocketRig.payloadMountY + 0.18;
    satRig.root.position.set(0, satWorldMountY, 0);
    satRig.root.visible = modeRef.current === 'stage5';
    payloadSatRef.current = satRig;
    scene.add(satRig.root);

    // Invisible Payload Adapter Hitbox & Wrong-Drop Proxy Hitboxes (Stage 4)
    const invisMat = new THREE.MeshBasicMaterial({ visible: false });
    const adapterHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.88, 12, 12), invisMat);
    adapterHitbox.position.set(0, satWorldMountY + 0.18, 0);
    adapterHitboxRef.current = adapterHitbox;
    scene.add(adapterHitbox);

    const wrongBodyHitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 5.2, 10), invisMat);
    wrongBodyHitbox.position.set(0, 3.2, 0);
    scene.add(wrongBodyHitbox);

    const wrongTowerHitbox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 10.5, 2.0), invisMat);
    wrongTowerHitbox.position.set(-2.9, 5.2, -0.2);
    scene.add(wrongTowerHitbox);
    wrongHitboxesRef.current = [wrongBodyHitbox, wrongTowerHitbox];

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

    // Reusable camera & telemetry throttling helpers
    const camPosTarget = new THREE.Vector3();
    const camLookCurrent = new THREE.Vector3(0, 1.8, 0);
    const camLookTarget = new THREE.Vector3();
    const adapterScreenProj = new THREE.Vector3();
    let lastTime = performance.now();
    let lastUiSync = 0;
    let rafId = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      const timeSec = now / 1000;
      lastTime = now;

      padEnv.update(timeSec, dt);

      // Animate fairing clamshells smoothly
      const openDiff = fairingTargetOpenRef.current - fairingCurrentOpenRef.current;
      fairingCurrentOpenRef.current += openDiff * Math.min(1, dt * 4.5);
      rocketRig.setFairingOpen(fairingCurrentOpenRef.current);

      // Keep integrated satellite anchored to rocket nose inside fairing
      if (satRig.root.visible) {
        if (satRig.root.scale.x < 0.28) {
          satRig.root.scale.setScalar(Math.min(0.28, satRig.root.scale.x + dt * 0.9));
        }
        satRig.root.position.y = rocketRig.root.position.y + rocketRig.payloadMountY + 0.18;
        satRig.root.rotation.y += dt * 0.45;
      }

      // Update glowing adapter ring color during Stage 4
      const adapterMat = rocketRig.payloadAdapterRing.material as THREE.MeshBasicMaterial;
      if (satIntegratedRef.current) {
        adapterMat.color.setHex(0x34d399);
        rocketRig.payloadAdapterRing.scale.setScalar(1.05);
      } else if (hoverZoneRef.current === 'adapter') {
        adapterMat.color.setHex(0x34d399);
        rocketRig.payloadAdapterRing.scale.setScalar(1.22);
      } else if (hoverZoneRef.current === 'wrong') {
        adapterMat.color.setHex(0xef4444);
        rocketRig.payloadAdapterRing.scale.setScalar(1.0);
      } else {
        const pulse = 1 + Math.sin(now * 0.006) * 0.12;
        adapterMat.color.setHex(0x4fe3d4);
        rocketRig.payloadAdapterRing.scale.setScalar(pulse);
      }

      // Reset launch transforms outside active launch flight
      let rocketY = rocketBasePosY;
      let camShake = 0;
      let skyMix = 0;

      if (modeRef.current === 'stage3') {
        if (sweepProgressRef.current < 1) {
          sweepProgressRef.current = Math.min(1, sweepProgressRef.current + dt / 3.2);
          if (sweepProgressRef.current >= 1) {
            setStage3Ready(true);
          }
        }
        const t = sweepProgressRef.current;
        const ease = 1 - Math.pow(1 - t, 3);
        const angle = -0.35 + ease * 0.55;
        const dist = 10.6 + Math.sin(ease * Math.PI) * 1.6;
        camPosTarget.set(Math.sin(angle) * dist, 1.4 + ease * 4.4, Math.cos(angle) * dist);
        camLookTarget.set(-0.4, 1.8 + ease * 2.5, 0);

        rocketRig.setExhaustIntensity(0, timeSec);
        padEnv.setLaunchSmokeIntensity(0);
        padEnv.setClampsReleased(0);
        padEnv.setUmbilicalRetracted(0);
        padEnv.earthGroup.visible = false;
        exhaustLight.intensity = 0;
      } else if (modeRef.current === 'stage4') {
        camPosTarget.set(0.35, 7.65, 5.1);
        camLookTarget.set(-0.25, 7.05, 0);

        rocketRig.setExhaustIntensity(0, timeSec);
        padEnv.setLaunchSmokeIntensity(0);
        padEnv.setClampsReleased(0);
        padEnv.setUmbilicalRetracted(0);
        padEnv.earthGroup.visible = false;
        exhaustLight.intensity = 0;
      } else {
        // STAGE 5: LAUNCH PREPARATION, COUNTDOWN, 4-PHASE LAUNCH & SPACE ORBIT
        const phase = launchPhaseRef.current;

        if (phase === 'prep') {
          rocketRig.setExhaustIntensity(0, timeSec);
          padEnv.setLaunchSmokeIntensity(0);
          padEnv.setClampsReleased(0);
          padEnv.setUmbilicalRetracted(0);
          padEnv.earthGroup.visible = false;
          exhaustLight.intensity = 0;
          camPosTarget.set(6.4, 4.4, 12.6);
          camLookTarget.set(-0.5, 4.1, 0);
        } else if (phase === 'countdown') {
          rocketRig.setExhaustIntensity(0, timeSec);
          padEnv.setLaunchSmokeIntensity(0.18);
          padEnv.setClampsReleased(0);
          padEnv.setUmbilicalRetracted(0.18);
          padEnv.earthGroup.visible = false;
          exhaustLight.intensity = 0;
          // Slight tension close-up sweep on pad base & tower
          camPosTarget.set(5.4, 2.8, 10.6);
          camLookTarget.set(-0.3, 3.8, 0);
          camShake = 0.015;
        } else if (phase !== 'completed') {
          launchElapsedRef.current += dt;
          const t = launchElapsedRef.current;

          if (t < 2.0) {
            // A. ENGINE IGNITION (0.0s - 2.0s)
            const u = t / 2.0;
            rocketY = rocketBasePosY;
            rocketRig.root.position.set(
              (Math.random() - 0.5) * 0.03 * u,
              rocketY,
              (Math.random() - 0.5) * 0.03 * u
            );
            rocketRig.setExhaustIntensity(0.35 + u * 0.8, timeSec);
            padEnv.setLaunchSmokeIntensity(0.35 + u * 0.65);
            padEnv.setUmbilicalRetracted(u * 0.45);
            padEnv.setClampsReleased(0);
            exhaustLight.intensity = 4.5 * u;
            exhaustLight.position.set(0, 1.2, 1.5);
            camShake = 0.055 * u;
            camPosTarget.set(5.6, 2.5, 11.4);
            camLookTarget.set(-0.3, 3.2, 0);
          } else if (t < 4.8) {
            // B. ROCKET THRUST AND LIFTOFF (2.0s - 4.8s)
            if (launchPhaseRef.current !== 'liftoff') {
              setLaunchPhase('liftoff');
              launchAudioRef.current?.setPhase('liftoff');
            }
            const u = (t - 2.0) / 2.8;
            const climb = u * u * 18.0;
            rocketY = rocketBasePosY + climb;
            rocketRig.root.position.set(
              (Math.random() - 0.5) * 0.025,
              rocketY,
              (Math.random() - 0.5) * 0.025
            );
            rocketRig.setExhaustIntensity(1.15, timeSec);
            padEnv.setClampsReleased(Math.min(1, u * 3.5));
            padEnv.setUmbilicalRetracted(Math.min(1, 0.45 + u * 1.4));
            padEnv.setLaunchSmokeIntensity(Math.max(0.15, 1.0 - u * 0.72));
            exhaustLight.intensity = 5.5;
            exhaustLight.position.set(0, rocketY - 3.6, 1.5);
            camShake = 0.075 * (1 - u * 0.3);
            camPosTarget.set(6.2 + u * 2.5, 2.6 + climb * 0.72, 11.8 + u * 3.5);
            camLookTarget.set(-0.2, rocketY - 0.5, 0);
          } else if (t < 8.5) {
            // C. ROCKET ASCENT (4.8s - 8.5s)
            if (launchPhaseRef.current !== 'ascent') {
              setLaunchPhase('ascent');
              if (!ascentStatusSentRef.current) {
                ascentStatusSentRef.current = true;
                onLaunchStatusChange('ascent');
              }
              launchAudioRef.current?.setPhase('ascent');
            }
            const u = (t - 4.8) / 3.7;
            const climb = 18.0 + u * 32.0 + u * u * 38.0; // climbs from +18 to +88
            rocketY = rocketBasePosY + climb;
            rocketRig.root.position.set(0, rocketY, 0);
            // Gentle gravity pitch tilt downrange as it climbs
            rocketRig.root.rotation.z = -u * 0.14;
            rocketRig.setExhaustIntensity(1.22, timeSec);
            padEnv.setLaunchSmokeIntensity(0);
            padEnv.setClampsReleased(1);
            padEnv.setUmbilicalRetracted(1);
            exhaustLight.intensity = 4.0;
            exhaustLight.position.set(0, rocketY - 3.8, 1.8);
            camShake = 0.028 * (1 - u);
            skyMix = u * 0.58;
            // Camera trails slightly behind & widens distance so rocket looks smaller ascending into sky
            camPosTarget.set(8.6 + u * 4.5, rocketY - 3.5 - u * 4.0, 15.2 + u * 9.5);
            camLookTarget.set(0, rocketY - 0.6, 0);
          } else if (t < LAUNCH_DURATION_SEC) {
            // D. SPACE TRANSITION (8.5s - 11.5s)
            if (launchPhaseRef.current !== 'space') {
              setLaunchPhase('space');
              launchAudioRef.current?.setPhase('space');
            }
            const u = (t - 8.5) / (LAUNCH_DURATION_SEC - 8.5);
            const climb = 88.0 + u * 54.0; // 88 -> 142
            rocketY = rocketBasePosY + climb;
            rocketRig.root.position.set(0, rocketY, 0);
            rocketRig.root.rotation.z = -0.14 - u * 0.28;
            rocketRig.setExhaustIntensity(0.95 - u * 0.2, timeSec);
            exhaustLight.intensity = 2.8;
            exhaustLight.position.set(0, rocketY - 3.5, 2.0);
            skyMix = 0.58 + u * 0.42;

            padEnv.earthGroup.visible = true;
            padEnv.earthGroup.position.set(0, rocketY - 87, -26);

            camPosTarget.set(11.5, rocketY - 3.2, 23.5);
            camLookTarget.set(-0.5, rocketY - 3.5, -4);
          } else {
            // Full launch animation finished!
            rocketY = rocketBasePosY + 142.0;
            rocketRig.root.position.set(0, rocketY, 0);
            rocketRig.root.rotation.z = -0.42;
            rocketRig.setExhaustIntensity(0.65, timeSec);
            skyMix = 1;
            padEnv.earthGroup.visible = true;
            padEnv.earthGroup.position.set(0, rocketY - 87, -26);
            camPosTarget.set(11.5, rocketY - 3.2, 23.5);
            camLookTarget.set(-0.5, rocketY - 3.5, -4);
            finishLaunchAndClaimRewards();
          }

          // Throttled live telemetry HUD update (~15 fps)
          if (now - lastUiSync > 70) {
            lastUiSync = now;
            const norm = Math.min(1, t / LAUNCH_DURATION_SEC);
            const altKm = Math.round(Math.pow(norm, 2.25) * 185 * 10) / 10;
            const velKmh = t < 2.0 ? 0 : Math.round(Math.pow((t - 2.0) / (LAUNCH_DURATION_SEC - 2.0), 1.6) * 26800);
            const phaseLabel =
              t < 2.0
                ? 'A // ENGINE IGNITION SEQUENCE'
                : t < 4.8
                ? 'B // LIFTOFF & TOWER CLEARANCE'
                : t < 8.5
                ? 'C // SUPERSONIC ATMOSPHERIC ASCENT'
                : 'D // KÁRMÁN LINE & SPACE INSERTION';
            setFlightTelemetry({
              tPlus: Math.round(t * 10) / 10,
              altKm,
              velKmh,
              phaseLabel,
            });
          }
        } else {
          // Completed: rocket gliding peacefully in orbit above curved Earth & deep space stars
          rocketY = rocketBasePosY + 142.0 + Math.sin(timeSec * 0.7) * 0.45;
          rocketRig.root.position.set(0, rocketY, 0);
          rocketRig.root.rotation.z = -0.44;
          rocketRig.setExhaustIntensity(0.55, timeSec);
          skyMix = 1;
          padEnv.earthGroup.visible = true;
          padEnv.earthGroup.position.set(0, rocketY - 87, -26);
          camPosTarget.set(11.2, rocketY - 2.8, 22.8);
          camLookTarget.set(-0.5, rocketY - 3.2, -4);
        }
      }

      // Smooth Sky & Atmospheric Fog Transition (Launchpad Twilight Blue -> Deep Black Space)
      if (skyMix <= 0.5) {
        activeSkyColor.copy(skyLowColor).lerp(skyMidColor, skyMix * 2);
      } else {
        activeSkyColor.copy(skyMidColor).lerp(skySpaceColor, (skyMix - 0.5) * 2);
      }
      fog.color.copy(activeSkyColor);
      fog.density = 0.0085 * (1 - skyMix * 0.94);
      starMat.opacity = 0.65 + skyMix * 0.35;

      const dampFactor = 1 - Math.exp(-5.0 * dt);
      camera.position.lerp(camPosTarget, dampFactor);
      if (camShake > 0) {
        camera.position.x += (Math.random() - 0.5) * camShake;
        camera.position.y += (Math.random() - 0.5) * camShake;
      }
      camLookCurrent.lerp(camLookTarget, dampFactor);
      camera.lookAt(camLookCurrent);

      // Project adapter drop coordinates for Stage 4 HUD marker
      if (modeRef.current === 'stage4') {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          adapterScreenProj.set(0, satWorldMountY + 0.16, 0).project(camera);
          setAdapterScreenPos({
            x: (adapterScreenProj.x * 0.5 + 0.5) * rect.width,
            y: (-adapterScreenProj.y * 0.5 + 0.5) * rect.height,
            visible: adapterScreenProj.z <= 1,
          });
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      padEnv.dispose();
      rocketRig.dispose();
      satRig.dispose();
      invisMat.dispose();
      adapterHitbox.geometry.dispose();
      wrongBodyHitbox.geometry.dispose();
      wrongTowerHitbox.geometry.dispose();
      starGeo.dispose();
      starMat.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [finishLaunchAndClaimRewards, onLaunchStatusChange]);

  // Unified pointer drag tracking for Stage 4 Satellite -> Fairing drop
  useEffect(() => {
    if (mode !== 'stage4') return;

    const handleMove = (e: PointerEvent) => {
      const pd = pointerDragRef.current;
      if (!pd.active || satIntegratedRef.current) return;
      const dist = Math.hypot(e.clientX - pd.startX, e.clientY - pd.startY);
      if (!pd.dragging && dist > 6) {
        pd.dragging = true;
        setDraggingSat(true);
        setSatSelected(true);
        SFX.select();
      }
      if (pd.dragging) {
        setDragPos({ x: e.clientX, y: e.clientY });
        setHoverZone(evaluateStage4DropTarget(e.clientX, e.clientY));
      }
    };

    const handleUp = (e: PointerEvent) => {
      const pd = pointerDragRef.current;
      if (!pd.active) return;
      const wasDragging = pd.dragging;
      pointerDragRef.current = { active: false, startX: 0, startY: 0, dragging: false };

      if (wasDragging && !satIntegratedRef.current) {
        const zone = evaluateStage4DropTarget(e.clientX, e.clientY);
        if (zone === 'adapter') {
          triggerPayloadSnap();
        } else {
          handleWrongPayloadDrop();
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
  }, [mode, evaluateStage4DropTarget, triggerPayloadSnap, handleWrongPayloadDrop]);

  const inFlightHud =
    mode === 'stage5' &&
    (launchPhase === 'ignition' ||
      launchPhase === 'liftoff' ||
      launchPhase === 'ascent' ||
      launchPhase === 'space');

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden bg-[#0b1f3f]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Countdown Cinematic Dark Vignette */}
      {mode === 'stage5' && launchPhase === 'countdown' && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-10 transition-opacity duration-500" />
      )}

      {/* Stage 5 Audio Control Bar (Always accessible during launch prep, countdown, and ascent) */}
      {mode === 'stage5' && !showFinalCelebration && (
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#07142b]/92 border border-cyan-400/35 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
          <button
            type="button"
            onClick={handleToggleMute}
            className="text-xs font-bold text-[#4fe3d4] hover:text-white transition cursor-pointer flex items-center gap-1"
            title={muted ? 'Unmute launch audio' : 'Mute launch audio'}
          >
            <span>{muted ? '🔇' : '🔊'}</span>
            <span className="hidden sm:inline">{muted ? 'Muted' : 'Audio'}</span>
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Launch audio volume"
            className="w-20 accent-[#4fe3d4] cursor-pointer"
          />
          <span className="text-[10px] font-mono-tech text-slate-300 tabular-nums w-8 text-right">
            {muted ? '0%' : `${volume}%`}
          </span>
        </div>
      )}

      {/* Dismissible Top Notification Banner */}
      {notification && !showFinalCelebration && launchPhase === 'prep' && (
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

      {/* STAGE 3 UI: Launchpad Vertical Positioning & Continue Overlay */}
      {mode === 'stage3' && (
        <>
          <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
            <div className="px-3 py-1.5 rounded-lg bg-[#07142b]/92 border border-cyan-400/35 text-[11px] font-mono-tech text-[#4fe3d4] font-bold">
              LAUNCH COMPLEX 39X // VERTICAL PAD STAGING
            </div>
            <button
              type="button"
              onClick={replayCameraSweep}
              className="px-3 py-1.5 rounded-lg bg-[#07142b]/92 hover:bg-[#0d1f3f] border border-white/20 text-[11px] font-bold text-slate-200 transition cursor-pointer"
            >
              Replay Camera Sweep ↺
            </button>
          </div>

          {stage3Ready && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(540px,92vw)] rounded-2xl bg-[#07142b]/96 border border-emerald-400/55 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-[popIn_0.3s_ease-out]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono-tech font-extrabold uppercase tracking-[2px] text-emerald-400">
                  STAGE 3 COMPLETE // PAD ALIGNMENT LOCKED
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                  VERTICAL READY ✓
                </span>
              </div>
              <h3 className="font-display text-lg md:text-xl font-extrabold text-white mt-1">
                ROCKET SUCCESSFULLY POSITIONED!
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Hold-down clamps secured, umbilical swing arm connected, and pad cryo venting stabilized. Next, open the nose fairing and integrate your completed satellite payload.
              </p>
              <button
                type="button"
                onClick={() => {
                  SFX.taskComplete();
                  onCompleteStage3();
                }}
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                CONTINUE TO PAYLOAD INTEGRATION ▶
              </button>
            </div>
          )}
        </>
      )}

      {/* STAGE 4 UI: Draggable Completed Satellite & Open Fairing Payload Adapter Marker */}
      {mode === 'stage4' && (
        <>
          {!satIntegrated && adapterScreenPos.visible && (
            <button
              type="button"
              style={{ left: `${adapterScreenPos.x}px`, top: `${adapterScreenPos.y}px` }}
              onClick={() => {
                if (satSelected) {
                  triggerPayloadSnap();
                } else {
                  setNotification({
                    badgeLabel: 'PAYLOAD ADAPTER TARGET',
                    text: 'Drag your completed satellite from the Payload Crane panel onto this open fairing adapter!',
                    type: 'neutral',
                  });
                }
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 px-3 py-1.5 rounded-full border-2 font-mono-tech text-[10px] font-extrabold tracking-wider uppercase transition cursor-pointer shadow-[0_0_22px_rgba(79,227,212,0.55)] ${
                hoverZone === 'adapter'
                  ? 'bg-emerald-500/90 border-white text-white scale-115'
                  : satSelected
                  ? 'bg-sky-500/80 border-cyan-100 text-white scale-110'
                  : 'bg-[#07142b]/92 border-[#4fe3d4] text-[#4fe3d4]'
              }`}
            >
              ⊕ DROP SATELLITE HERE
            </button>
          )}

          {/* Left Draggable Satellite Staging Hoist Card */}
          <div className="absolute top-4 left-4 z-30 w-[270px] rounded-2xl bg-[#061124]/95 border border-cyan-400/45 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.82)]">
            <div className="text-[10px] font-mono-tech font-bold uppercase tracking-widest text-[#4fe3d4]">
              STAGE 4 // PAYLOAD INTEGRATION
            </div>
            <h3 className="font-display text-sm font-extrabold text-white mt-1">
              {satIntegrated
                ? fairingSealed
                  ? 'FAIRING SEALED & READY'
                  : 'CLOSING PAYLOAD FAIRING...'
                : 'COMPLETED SATELLITE'}
            </h3>
            <p className="text-[11px] text-slate-300 mt-1 leading-snug">
              {satIntegrated
                ? 'Your 9-subsystem satellite is securely mounted inside the nose cone.'
                : 'Drag the completed satellite into the open nose cone (payload fairing) of the rocket.'}
            </p>

            {!satIntegrated ? (
              <div
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  pointerDragRef.current = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    dragging: false,
                  };
                }}
                onClick={() => {
                  SFX.select();
                  setSatSelected((prev) => !prev);
                }}
                className={`mt-3 p-3 rounded-xl border-2 transition touch-none flex flex-col items-center text-center cursor-grab active:cursor-grabbing ${
                  satSelected
                    ? 'bg-cyan-400/15 border-[#4fe3d4] shadow-[0_0_18px_rgba(79,227,212,0.35)]'
                    : 'bg-[#0a1a36] border-cyan-400/35 hover:border-[#4fe3d4]'
                }`}
              >
                <SatelliteIllustrationSVG className="w-36 h-24" />
                <div className="text-xs font-extrabold text-white mt-1">Earth Observation Satellite (9/9)</div>
                <div className="text-[10px] font-mono-tech text-[#4fe3d4] mt-0.5">
                  {satSelected ? 'NOW CLICK FAIRING TARGET ⊕' : 'DRAG INTO OPEN FAIRING →'}
                </div>
              </div>
            ) : (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-center">
                <div className="text-lg">✅</div>
                <div className="text-xs font-extrabold text-emerald-200 mt-1">
                  {fairingSealed
                    ? 'SATELLITE PAYLOAD SUCCESSFULLY INTEGRATED!'
                    : 'LOCKING CLAMSHELL HALVES...'}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* STAGE 5 UI A: LAUNCH PREPARATION SCREEN (Checklist + INITIATE ROCKET LAUNCH) */}
      {mode === 'stage5' && launchPhase === 'prep' && (
        <div className="absolute bottom-5 right-5 left-5 sm:left-auto z-30 w-auto sm:w-[400px] rounded-2xl bg-[#07142b]/96 border border-cyan-400/55 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.9)] animate-[popIn_0.3s_ease-out]">
          <div className="text-[10px] font-mono-tech font-extrabold uppercase tracking-[2px] text-emerald-400">
            STAGE 5 // LAUNCH COMPLEX 39X
          </div>
          <h3 className="font-display text-xl font-extrabold text-white mt-1">ALL SYSTEMS READY!</h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Your satellite is secured inside the rocket. The launch vehicle is standing tall on the launchpad. You are ready to begin your first space launch!
          </p>

          <div className="mt-3.5 rounded-xl bg-[#0a1834] border border-cyan-400/25 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-200">
              <span>Satellite assembly</span>
              <span className="font-mono-tech font-bold text-emerald-400">✓ PASSED</span>
            </div>
            <div className="flex items-center justify-between text-slate-200">
              <span>Rocket assembly</span>
              <span className="font-mono-tech font-bold text-emerald-400">✓ PASSED</span>
            </div>
            <div className="flex items-center justify-between text-slate-200">
              <span>Launchpad positioning</span>
              <span className="font-mono-tech font-bold text-emerald-400">✓ PASSED</span>
            </div>
            <div className="flex items-center justify-between text-slate-200">
              <span>Satellite payload integration</span>
              <span className="font-mono-tech font-bold text-emerald-400">✓ PASSED</span>
            </div>
            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-white font-semibold">
              <span>Launch system</span>
              <span className="font-mono-tech font-extrabold text-[#4fe3d4]">● READY</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInitiateLaunch}
            className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f59e0b] via-[#ef4444] to-[#f97316] text-white font-display font-extrabold text-xs md:text-sm tracking-wider uppercase shadow-[0_0_26px_rgba(249,115,22,0.55)] hover:brightness-110 transition cursor-pointer"
          >
            🚀 INITIATE ROCKET LAUNCH
          </button>
        </div>
      )}

      {/* STAGE 5 UI B: DRAMATIC COUNTDOWN (3 - 2 - 1) */}
      {mode === 'stage5' && launchPhase === 'countdown' && countdownNum !== null && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-xs md:text-sm font-mono-tech font-extrabold tracking-[4px] uppercase text-[#4fe3d4] mb-3">
            TERMINAL LAUNCH COUNTDOWN
          </div>
          <div
            key={countdownNum}
            className="font-display text-8xl md:text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(79,227,212,0.9)] animate-[popIn_0.4s_ease-out]"
          >
            {countdownNum}
          </div>
          <div className="mt-4 px-4 py-1.5 rounded-lg bg-[#07142b]/85 border border-cyan-400/40 text-xs font-mono-tech text-slate-200">
            Hold-down clamps pressurized • Ignition sequence armed
          </div>
        </div>
      )}

      {/* STAGE 5 UI C: LIVE IN-FLIGHT TELEMETRY HUD */}
      {inFlightHud && (
        <div className="absolute top-4 left-4 z-30 w-[300px] sm:w-[340px] rounded-xl bg-[#061124]/88 border border-cyan-400/40 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)] pointer-events-none">
          <div className="flex items-center justify-between text-[10px] font-mono-tech uppercase tracking-widest">
            <span className="text-amber-300 font-bold">{flightTelemetry.phaseLabel}</span>
            <span className="text-white font-bold tabular-nums">T+{flightTelemetry.tPlus.toFixed(1)}s</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono-tech">Altitude</div>
              <div className="text-lg font-mono-tech font-extrabold text-[#4fe3d4] tabular-nums">
                {flightTelemetry.altKm.toFixed(1)} <span className="text-[10px] text-slate-400">km</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono-tech">Velocity</div>
              <div className="text-lg font-mono-tech font-extrabold text-white tabular-nums">
                {flightTelemetry.velKmh.toLocaleString()} <span className="text-[10px] text-slate-400">km/h</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dragged Satellite Preview Under Cursor (Stage 4) */}
      {draggingSat && !satIntegrated && (
        <div
          style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}
          className="fixed z-[5500] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div
            className={`p-2.5 rounded-2xl border-2 shadow-[0_14px_34px_rgba(0,0,0,0.85)] transition-colors ${
              hoverZone === 'adapter'
                ? 'bg-emerald-500/30 border-emerald-400'
                : hoverZone === 'wrong'
                ? 'bg-red-500/30 border-red-400'
                : 'bg-[#081733]/92 border-[#4fe3d4]'
            }`}
          >
            <SatelliteIllustrationSVG className="w-28 h-20" />
          </div>
        </div>
      )}

      {/* FINAL LEVEL 1 COMPLETION CELEBRATION MODAL (Fires ONLY after ALL 5 Stages Complete!) */}
      {showFinalCelebration && (
        <>
          <ConfettiOverlay />
          <div className="fixed inset-0 z-[5600] bg-black/58 flex items-center justify-center p-4">
            <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[#07142b]/96 border border-amber-400/55 p-6 text-center shadow-[0_24px_64px_rgba(0,0,0,0.92)] animate-[popIn_0.35s_ease-out]">
              <div className="text-[11px] font-mono-tech font-extrabold uppercase tracking-[2.5px] text-emerald-400">
                🚀 LIFTOFF SUCCESSFUL! // MISSION 001 COMPLETED!
              </div>
              <h3 className="font-display text-xl md:text-2xl font-extrabold text-amber-300 mt-1">
                CONGRATULATIONS, ENGINEER!
              </h3>

              <div className="mt-3 rounded-xl bg-[#0b1b38]/90 border border-emerald-400/30 p-3 text-left text-xs space-y-1 text-slate-200">
                <div>
                  <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                  Assembled your satellite.
                </div>
                <div>
                  <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                  Built your launch vehicle.
                </div>
                <div>
                  <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                  Positioned your rocket on the launchpad.
                </div>
                <div>
                  <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                  Integrated your satellite inside the payload fairing.
                </div>
                <div>
                  <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                  Successfully launched your rocket into space!
                </div>
              </div>

              <p className="text-xs text-slate-200 mt-2.5 leading-relaxed">
                You have completed your first GALAXY-X space engineering mission. You are officially recognised as a:{' '}
                <strong className="text-[#4fe3d4]">SATELLITE BUILDER!</strong>
              </p>

              <div className="my-3 flex justify-center animate-[popIn_0.45s_ease-out]">
                <SatelliteBuilderBadgeSVG size={142} />
              </div>

              <div className="rounded-xl bg-[#0b1b38] border border-cyan-400/35 p-3.5 mb-4 text-xs space-y-1.5 text-left">
                <div className="text-[10px] font-mono-tech font-bold uppercase tracking-widest text-[#4fe3d4] text-center">
                  REWARDS UNLOCKED!
                </div>
                <div className="flex justify-between items-center text-slate-200">
                  <span>⭐ Star Credits Reward:</span>
                  <strong className="text-amber-300 font-mono-tech">
                    {rewardOutcome && !rewardOutcome.alreadyRewarded
                      ? '+1,000 STAR CREDITS'
                      : alreadyCompleted
                      ? 'Already Claimed (+0 SC Replay)'
                      : '+1,000 STAR CREDITS'}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-slate-200">
                  <span>🏅 Achievement Badge:</span>
                  <strong className="text-[#4fe3d4]">SATELLITE BUILDER BADGE</strong>
                </div>
                <div className="flex justify-between items-center text-slate-200">
                  <span>🚀 Campaign Progress:</span>
                  <strong className="text-emerald-300">Level 2 Unlocked!</strong>
                </div>
                <div className="pt-1.5 border-t border-white/10 flex justify-between items-center">
                  <span className="text-slate-400">New Star Credit Balance:</span>
                  <strong className="text-amber-300 font-mono-tech text-sm tabular-nums">
                    ★ {(rewardOutcome?.newStarBalance ?? starCredits).toLocaleString()} SC
                  </strong>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    SFX.click();
                    setShowFinalCelebration(false);
                    onContinueToLevel2();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase shadow-lg hover:brightness-110 transition cursor-pointer"
                >
                  CONTINUE TO LEVEL 2 ▶
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      setShowFinalCelebration(false);
                      onReplayLevel1();
                    }}
                    className="py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-bold text-xs tracking-wide uppercase transition cursor-pointer"
                  >
                    REPLAY LEVEL 1 ↺
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      SFX.click();
                      setShowFinalCelebration(false);
                      onBackToAcademy();
                    }}
                    className="py-2.5 rounded-xl bg-cyan-400/12 hover:bg-cyan-400/22 border border-cyan-400/40 text-[#4fe3d4] font-bold text-xs tracking-wide uppercase transition cursor-pointer"
                  >
                    BACK TO ACADEMY
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
