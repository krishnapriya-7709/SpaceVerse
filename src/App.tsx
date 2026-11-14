import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CAMPAIGN_LEVELS,
  CampaignLevel,
  CRATES,
  FacilityLocation,
  getCurrentLocation,
  getSavedUserId,
  loadPlayerData,
  LOCATIONS,
  PlayerState,
  SatSubsystemId,
  savePlayerData,
  SupplyCrate,
} from './data/spaceverseData';
import {
  buildDSNGroundStation,
  buildHangarShowcaseSatellite,
  buildLaunchControlComplex,
  buildLaunchPadAndDetailedRocket,
  buildMissionControlCenter,
  buildMissionPlanningHoloTable,
  buildResearchLabBench,
  buildSupplyCrateModel,
  ColliderCircle,
  CrateVisualHandle,
  createSectorSignSprite,
  RocketVisualHandle,
} from './three/facilityModels';
import { makeFloorTexture, makeHangarFloorTexture } from './three/proceduralTextures';
import { SFX } from './utils/sfx';
import { FacilityMap } from './components/FacilityMap';
import {
  CampaignDirectoryModal,
  ExplorerDossierModal,
  IntroSplash,
  Level2IntroModal,
  MissionBriefingModal,
  RecruitBadgeModal,
  SubsystemExplorerModal,
  TrainingCompleteModal,
  TrainingIntroModal,
  TutorialTaskModal,
  WelcomeOverlay,
} from './components/Modals';
import { Level1RewardResult, SatelliteAssemblyLab } from './components/SatelliteAssemblyLab';

interface InteractableZone {
  x: number;
  z: number;
  r: number;
  text: () => string | null;
  act: () => void;
}

const TUT_TASK_META: Record<number, { instr: string; hint: string }> = {
  1: {
    instr: 'TASK 1: Click the Facility Radar map in the top-right corner (or press M).',
    hint: 'Expands the GALAXY-X complex blueprint and sector fast-travel directory.',
  },
  2: {
    instr: 'TASK 2: Travel to Ground Station and inspect the Parabolic Antenna.',
    hint: 'Open Map (M) → Ground Station → click the dish or walk close and press E.',
  },
  3: {
    instr: 'TASK 3: Visit Spacecraft Assembly Hangar and inspect the Showcase Satellite.',
    hint: 'Click the detailed satellite on the pedestal or press E next to it.',
  },
  4: {
    instr: 'TASK 4: Visit Scientific Research Lab and click any Instrument Pedestal.',
    hint: 'Inspect Thermometer, Barometer, or Camera in the SRL cleanroom.',
  },
  5: {
    instr: 'TASK 5: Visit Mission Control Center and inspect the Telemetry Wall.',
    hint: 'Click the central live telemetry screen or press E at the console.',
  },
  6: {
    instr: 'TASK 6: Click the Grant Credits (₡) & Star Credits (★) readout in the top bar.',
    hint: 'Review operational funding and payload mass vs. propulsion trade-offs.',
  },
};

function crateDisplayName(k: string): string {
  const found = CRATES.find((c) => c.k === k);
  return found ? found.n : k;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Persistent Player State
  const [playerState, setPlayerState] = useState<PlayerState>(() => loadPlayerData());
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;

  // Onboarding & Modals State
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(started);
  startedRef.current = started;

  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTrainingIntro, setShowTrainingIntro] = useState(false);
  const [showTrainingComplete, setShowTrainingComplete] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const mapExpandedRef = useRef(mapExpanded);
  mapExpandedRef.current = mapExpanded;

  const [completedTaskModal, setCompletedTaskModal] = useState<number | null>(null);
  const [showSubsystemExplorer, setShowSubsystemExplorer] = useState(false);
  const [showLevel2Intro, setShowLevel2Intro] = useState(false);
  const [briefingModalLevel, setBriefingModalLevel] = useState<CampaignLevel | null>(null);
  const briefingModalOpenRef = useRef(false);
  briefingModalOpenRef.current = briefingModalLevel !== null;
  const [satLabOpen, setSatLabOpen] = useState(false);
  const satLabOpenRef = useRef(satLabOpen);
  satLabOpenRef.current = satLabOpen;

  // Tutorial & Campaign Gameplay React State (for clean HUD re-renders)
  const [tutStep, setTutStep] = useState<number>(0);
  const tutStepRef = useRef(tutStep);
  tutStepRef.current = tutStep;

  const [activeLevelIdx, setActiveLevelIdx] = useState<number>(() =>
    Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, (loadPlayerData().currentCampaignLevel || 1) - 1))
  );
  const [missionPhase, setMissionPhase] = useState<number>(0); // 0: briefing, 1: assembly, 2: on pad, 3: debrief
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set());
  const [selectedMotor, setSelectedMotor] = useState<string | null>(null);
  const [flightScore, setFlightScore] = useState<number>(0);
  const [isFlying, setIsFlying] = useState<boolean>(false);

  const [currentLoc, setCurrentLoc] = useState<FacilityLocation>(() => getCurrentLocation(-2, 12));
  const [promptText, setPromptText] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<{ text: string; until: number }>({ text: '', until: 0 });
  const [muted, setMuted] = useState<boolean>(() => SFX.isMuted());

  // Mutable Simulation Refs
  const playerPosRef = useRef<{ x: number; z: number }>({ x: -2, z: 12 });
  const lookRef = useRef<{ yaw: number; pitch: number }>({ yaw: Math.PI, pitch: 0 });
  const simRef = useRef<{
    n: number;
    phase: number;
    items: Set<string>;
    mot: string | null;
    flying: boolean;
    score: number;
    t0: number;
    altTarget: number;
    flightAlt: number;
    flightMass: number;
    flightCost: number;
    extraCount: number;
  }>({
    n: activeLevelIdx,
    phase: 0,
    items: new Set(),
    mot: null,
    flying: false,
    score: 0,
    t0: 0,
    altTarget: 70,
    flightAlt: 0,
    flightMass: 20,
    flightCost: 0,
    extraCount: 0,
  });

  // Three.js Object Refs accessed by callbacks
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const crateHandlesRef = useRef<CrateVisualHandle[]>([]);
  const rocketHandleRef = useRef<RocketVisualHandle | null>(null);
  const targetRingRef = useRef<THREE.Mesh | null>(null);
  const tutBeaconRef = useRef<THREE.Group | null>(null);
  const currentInteractRef = useRef<InteractableZone | null>(null);
  const joyDotRef = useRef<HTMLDivElement | null>(null);
  const joyWrapRef = useRef<HTMLDivElement | null>(null);

  const updatePlayer = useCallback((updater: (prev: PlayerState) => PlayerState) => {
    setPlayerState((prev) => {
      const next = updater(prev);
      savePlayerData(next);
      return next;
    });
  }, []);

  const applyServerPlayer = useCallback((serverPlayer: PlayerState) => {
    setPlayerState((prev) => {
      const merged: PlayerState = {
        ...prev,
        ...serverPlayer,
      };
      savePlayerData(merged);
      return merged;
    });
  }, []);

  const syncWithServer = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        const res = await fetch('/api/player/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: playerStateRef.current.userId,
            ...payload,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) applyServerPlayer(data.player);
        }
      } catch {
        // Offline / localStorage cache retains state
      }
    },
    [applyServerPlayer]
  );

  // Hydrate persistent account state from backend database on mount
  useEffect(() => {
    let active = true;
    const userId = getSavedUserId();
    fetch(`/api/player/session?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.player) return;
        applyServerPlayer(data.player);
        const lvlIdx = Math.max(
          0,
          Math.min(CAMPAIGN_LEVELS.length - 1, (data.player.currentCampaignLevel || 1) - 1)
        );
        setActiveLevelIdx(lvlIdx);
        simRef.current.n = lvlIdx;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [applyServerPlayer]);

  const say = useCallback((text: string, ms = 3600) => {
    setToastMsg({ text, until: performance.now() + ms });
  }, []);

  useEffect(() => {
    if (!toastMsg.text) return;
    const remaining = Math.max(0, toastMsg.until - performance.now());
    const id = window.setTimeout(() => {
      setToastMsg((prev) => (performance.now() >= prev.until ? { text: '', until: 0 } : prev));
    }, remaining + 20);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const syncCrateColors = useCallback(() => {
    const { items, mot } = simRef.current;
    crateHandlesRef.current.forEach((h) => {
      const active = h.crate.mot ? mot === h.crate.k : items.has(h.crate.k);
      h.setSelected(active);
    });
    rocketHandleRef.current?.updateConfiguration(items, mot);
  }, []);

  const calcVehicle = useCallback(() => {
    const items = [...simRef.current.items].map((k) => CRATES.find((c) => c.k === k)).filter(Boolean) as SupplyCrate[];
    const motor = CRATES.find((c) => c.k === simRef.current.mot) ?? null;
    const mass = 20 + items.reduce((acc, x) => acc + (x.m || 0), 0);
    const cost = items.reduce((acc, x) => acc + x.c, 0) + (motor ? motor.c : 0);
    const alt = motor && motor.imp ? (1.5 * motor.imp) / mass : 0;
    return { p: items, m: motor, mass, cost, alt };
  }, []);

  // ========================================================
  // CADET TRAINING STATE MACHINE
  // ========================================================
  const updateBeaconForStep = useCallback((step: number, completed: boolean) => {
    const beacon = tutBeaconRef.current;
    if (!beacon) return;
    if (completed || step <= 0) {
      beacon.visible = false;
      return;
    }
    if (step === 2) {
      beacon.position.set(-40, 6.4, 10);
      beacon.userData.baseY = 6.4;
      beacon.visible = true;
    } else if (step === 3) {
      beacon.position.set(22, 5.2, -6);
      beacon.userData.baseY = 5.2;
      beacon.visible = true;
    } else if (step === 4) {
      beacon.position.set(-9, 4.4, -25);
      beacon.userData.baseY = 4.4;
      beacon.visible = true;
    } else if (step === 5) {
      beacon.position.set(-34, 6.0, -24);
      beacon.userData.baseY = 6.0;
      beacon.visible = true;
    } else {
      beacon.visible = false;
    }
  }, []);

  const startCadetTraining = useCallback(() => {
    updatePlayer((p) => ({ ...p, trainingCompleted: false }));
    setTutStep(1);
    updateBeaconForStep(1, false);
    say('Cadet Orientation Started: Follow the highlighted Academy objective!', 4000);
  }, [say, updateBeaconForStep, updatePlayer]);

  const completeTutTask = useCallback(
    (taskNum: number) => {
      if (tutStepRef.current !== taskNum) return;
      if (tutBeaconRef.current) tutBeaconRef.current.visible = false;
      setTimeout(() => SFX.taskComplete(), 80);
      if (taskNum === 3) {
        setShowSubsystemExplorer(true);
      } else {
        setCompletedTaskModal(taskNum);
      }
    },
    []
  );

  const finishAllTraining = useCallback(() => {
    setTutStep(0);
    updateBeaconForStep(0, true);
    updatePlayer((p) => ({ ...p, trainingCompleted: true }));
    fetch('/api/player/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: playerStateRef.current.userId, trainingCompleted: true }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.player) applyServerPlayer(data.player);
      })
      .catch(() => {});
    SFX.badgeUnlock();
    setShowTrainingComplete(true);
  }, [applyServerPlayer, updateBeaconForStep, updatePlayer]);

  const skipTutorial = useCallback(() => {
    setShowTrainingIntro(false);
    setCompletedTaskModal(null);
    setShowSubsystemExplorer(false);
    setTutStep(0);
    updateBeaconForStep(0, true);
    updatePlayer((p) => ({ ...p, trainingCompleted: true }));
    fetch('/api/player/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: playerStateRef.current.userId, trainingCompleted: true }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.player) applyServerPlayer(data.player);
      })
      .catch(() => {});
    say('Orientation skipped. Mission Campaign Directory unlocked!', 4000);
    setShowCampaignModal(true);
  }, [applyServerPlayer, say, updateBeaconForStep, updatePlayer]);

  // ========================================================
  // MAP & NAVIGATION
  // ========================================================
  const closeMap = useCallback(() => {
    setMapExpanded(false);
  }, []);

  const openMap = useCallback(() => {
    setMapExpanded(true);
    if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 1) {
      completeTutTask(1);
    }
  }, [completeTutTask]);

  const navigateToLocation = useCallback(
    (locId: string) => {
      const loc = LOCATIONS.find((l) => l.id === locId);
      if (!loc) return;
      SFX.navigate();
      playerPosRef.current = { x: loc.target.x, z: loc.target.z };
      lookRef.current = { yaw: loc.yaw, pitch: 0 };
      if (cameraRef.current) {
        cameraRef.current.position.set(loc.target.x, 1.7, loc.target.z);
      }
      setCurrentLoc(loc);
      setMapExpanded(false);
      say(`Navigated to ${loc.name}`);
      if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 2 && locId === 'gsc') {
        say('Ground Station reached! Click the high-gain dish or press E near it.', 4200);
      }
    },
    [say]
  );

  const teleportPoint = useCallback(
    (wx: number, wz: number) => {
      SFX.navigate();
      playerPosRef.current = { x: wx, z: wz };
      if (cameraRef.current) {
        cameraRef.current.position.set(wx, 1.7, wz);
      }
      const loc = getCurrentLocation(wx, wz);
      setCurrentLoc(loc);
      setMapExpanded(false);
      say(`Navigated to ${loc.name}`);
    },
    [say]
  );

  // ========================================================
  // GAMEPLAY ACTIONS (CRATES, PAD LOAD, LAUNCH, MCC)
  // ========================================================
  const takeCrate = useCallback(
    (crate: SupplyCrate) => {
      if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 4) {
        completeTutTask(4);
      }
      const s = simRef.current;
      const isTaking = crate.mot ? s.mot !== crate.k : !s.items.has(crate.k);

      let nextGrantCredits = playerStateRef.current.grantCredits;
      if (isTaking) {
        if (playerStateRef.current.grantCredits < crate.cred) {
          say(
            `Insufficient Grant Credits! Need ₡${crate.cred.toLocaleString()} (Available: ₡${playerStateRef.current.grantCredits.toLocaleString()})`,
            4000
          );
          SFX.snapWrong();
          return;
        }
        nextGrantCredits -= crate.cred;
        updatePlayer((p) => ({ ...p, grantCredits: Math.max(0, p.grantCredits - crate.cred) }));
      } else {
        nextGrantCredits += crate.cred;
        updatePlayer((p) => ({ ...p, grantCredits: p.grantCredits + crate.cred }));
      }
      void syncWithServer({ grantCredits: Math.max(0, nextGrantCredits) });

      if (crate.mot) {
        s.mot = s.mot === crate.k ? null : crate.k;
        setSelectedMotor(s.mot);
      } else {
        if (s.items.has(crate.k)) s.items.delete(crate.k);
        else s.items.add(crate.k);
        setSelectedItems(new Set(s.items));
      }

      SFX.select();
      syncCrateColors();
      const nowSelected = crate.mot ? s.mot === crate.k : s.items.has(crate.k);
      say(
        nowSelected
          ? `${crate.n} acquired (-₡${crate.cred.toLocaleString()})`
          : `${crate.n} returned (+₡${crate.cred.toLocaleString()})`
      );
    },
    [completeTutTask, say, syncCrateColors, syncWithServer, updatePlayer]
  );

  const loadRocketOnPad = useCallback(() => {
    const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
    if (M.isLab) {
      setSatLabOpen(true);
      return;
    }
    const r = calcVehicle();
    const missing = M.req.filter((k) => !simRef.current.items.has(k));
    if (missing.length > 0) {
      SFX.snapWrong();
      say(`Missing required payload: ${missing.map(crateDisplayName).join(', ')}`, 4000);
      return;
    }
    if (!simRef.current.mot) {
      SFX.snapWrong();
      say('Select a rocket propulsion motor in the Assembly Hangar first.', 3800);
      return;
    }
    if (r.cost > M.b) {
      SFX.snapWrong();
      say(`Over mission budget by ${r.cost - M.b}M! Return a component.`, 4200);
      return;
    }

    simRef.current.phase = 2;
    setMissionPhase(2);
    if (rocketHandleRef.current) {
      rocketHandleRef.current.group.visible = true;
      rocketHandleRef.current.updateConfiguration(simRef.current.items, simRef.current.mot);
    }
    SFX.snapCorrect();
    say('Rocket staged on Launch Pad! Proceed to Launch Control Complex (LCC) console.', 4500);
  }, [calcVehicle, say]);

  const initiateLaunch = useCallback(() => {
    const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
    const r = calcVehicle();
    simRef.current.flying = true;
    simRef.current.t0 = performance.now();
    simRef.current.flightAlt = r.alt;
    simRef.current.flightMass = r.mass;
    simRef.current.flightCost = r.cost;
    simRef.current.altTarget = typeof M.t === 'number' ? M.t : 70;
    simRef.current.extraCount = r.p.filter((x) => !M.req.includes(x.k)).length;
    setIsFlying(true);
    SFX.navigate();
  }, [calcVehicle]);

  const handleSelectCampaignLevel = useCallback(
    (idx: number) => {
      const lvl = CAMPAIGN_LEVELS[idx];
      if (!lvl) return;
      simRef.current.n = idx;
      simRef.current.items.clear();
      simRef.current.mot = null;
      simRef.current.phase = 0;
      setActiveLevelIdx(idx);
      setSelectedItems(new Set());
      setSelectedMotor(null);
      setMissionPhase(0);
      setBriefingModalLevel(null);
      if (rocketHandleRef.current) rocketHandleRef.current.group.visible = false;
      syncCrateColors();
      updatePlayer((p) => ({ ...p, currentCampaignLevel: lvl.lvl }));
      void syncWithServer({ currentCampaignLevel: lvl.lvl });
      setShowCampaignModal(false);
      say(
        `Level 0${lvl.lvl}: ${lvl.title} selected! Go to ${lvl.briefingStationName} and press E for mission briefing.`,
        5200
      );
    },
    [say, syncCrateColors, syncWithServer, updatePlayer]
  );

  const handleCompleteLevel1 = useCallback(
    async (installedIds: SatSubsystemId[]): Promise<Level1RewardResult> => {
      const current = playerStateRef.current;
      try {
        const res = await fetch('/api/levels/1/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: current.userId,
            installedParts: installedIds,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player);
            return {
              alreadyRewarded: Boolean(data.alreadyRewarded),
              rewardAwarded: Number(data.rewardAwarded || 0),
              newStarBalance: Number(data.player.starCredits),
            };
          }
        }
      } catch {
        // Fallback cleanly to local state validation if API is unreachable
      }

      const firstTime = !current.completedLevels.includes(1);
      const rewardAwarded = firstTime ? 1000 : 0;
      const nextStarBalance = current.starCredits + rewardAwarded;

      if (firstTime) {
        updatePlayer((p) => {
          if (p.completedLevels.includes(1)) return p;
          return {
            ...p,
            starCredits: p.starCredits + 1000,
            completedLevels: [...p.completedLevels, 1],
            levelScores: { ...p.levelScores, 1: 1000 },
            badges: p.badges.includes('SATELLITE_BUILDER')
              ? p.badges
              : [...p.badges, 'SATELLITE_BUILDER'],
            currentCampaignLevel: Math.max(p.currentCampaignLevel, 2),
          };
        });
      }

      return {
        alreadyRewarded: !firstTime,
        rewardAwarded,
        newStarBalance: nextStarBalance,
      };
    },
    [applyServerPlayer, updatePlayer]
  );

  const handleSwitchAccount = useCallback(
    async (callsign: string) => {
      const cleaned = callsign.trim() || 'Explorer-01';
      try {
        const res = await fetch('/api/player/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callsign: cleaned }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.player) {
            applyServerPlayer(data.player);
            const lvlIdx = Math.max(
              0,
              Math.min(CAMPAIGN_LEVELS.length - 1, (data.player.currentCampaignLevel || 1) - 1)
            );
            simRef.current.n = lvlIdx;
            simRef.current.items.clear();
            simRef.current.mot = null;
            simRef.current.phase = 0;
            setActiveLevelIdx(lvlIdx);
            setSelectedItems(new Set());
            setSelectedMotor(null);
            setMissionPhase(0);
            syncCrateColors();
            say(`Loaded explorer dossier for ${data.player.callsign} (★ ${data.player.starCredits.toLocaleString()} SC)`, 4200);
          }
        }
      } catch {
        say('Unable to reach database session service.', 3500);
      }
    },
    [applyServerPlayer, say, syncCrateColors]
  );

  // ========================================================
  // INTRO SPLASH TIMER (2.6s)
  // ========================================================
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
      setShowWelcome(true);
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  // ========================================================
  // THREE.JS FACILITY SCENE & ANIMATION LOOP
  // ========================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0x0b1322);
    sc.fog = new THREE.FogExp2(0x0b1322, 0.0085);

    const cam = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    cam.position.set(-2, 1.7, 12);
    cameraRef.current = cam;

    const ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    ren.setSize(window.innerWidth, window.innerHeight);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.toneMapping = THREE.ACESFilmicToneMapping;
    ren.toneMappingExposure = 1.05;
    container.appendChild(ren.domElement);

    const pmrem = new THREE.PMREMGenerator(ren);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    sc.environment = envTex;

    const SOL: ColliderCircle[] = [];
    const INT: InteractableZone[] = [];

    const addBoxCollider = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35 })
      );
      mesh.position.set(x, y, z);
      sc.add(mesh);
      return mesh;
    };

    // Lighting
    const hemi = new THREE.HemisphereLight(0xd9eeff, 0x162238, 0.65);
    sc.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff4e0, 1.15);
    dir.position.set(20, 42, 18);
    sc.add(dir);

    const hangarGlow = new THREE.PointLight(0x4fe3d4, 1.0, 28);
    hangarGlow.position.set(22, 7, -6);
    sc.add(hangarGlow);

    // Facility Floor & Color Sector Guidance Paths
    const floorMat = new THREE.MeshStandardMaterial({
      map: makeFloorTexture(),
      roughness: 0.48,
      metalness: 0.35,
    });
    const facilityFloor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), floorMat);
    facilityFloor.rotation.x = -Math.PI / 2;
    facilityFloor.position.set(0, 0, -8);
    sc.add(facilityFloor);

    const addFloorPath = (x: number, z: number, w: number, d: number, color: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ color })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      sc.add(m);
    };
    addFloorPath(-2, -5, 96, 1.4, 0x4fe3d4);
    addFloorPath(-34, -13, 1.2, 16, 0x38bdf8);
    addFloorPath(-8, -13, 1.2, 16, 0x34d399);
    addFloorPath(24, -13, 1.2, 16, 0xfbbf24);
    addFloorPath(-28, 2, 1.2, 14, 0x818cf8);
    addFloorPath(24, 0, 1.2, 10, 0xf87171);
    addFloorPath(-2, 8, 1.2, 14, 0x4fe3d4);
    addFloorPath(-40, 2, 1.2, 14, 0x38bdf8);

    // Ceiling & Overhead Light Panels (with Silo cutout over pad at x=36, z=-12)
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 80),
      new THREE.MeshStandardMaterial({ color: 0x131a28, roughness: 0.85 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 14, -8);
    sc.add(ceiling);

    const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xdff6ff });
    for (let x = -44; x <= 44; x += 22) {
      for (let z = -30; z <= 14; z += 22) {
        if (x >= 20 && z <= -8) continue;
        const lp = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), lightPanelMat);
        lp.rotation.x = Math.PI / 2;
        lp.position.set(x, 13.9, z);
        sc.add(lp);
        const pl = new THREE.PointLight(0xdff6ff, 0.45, 32);
        pl.position.set(x, 12.5, z);
        sc.add(pl);
      }
    }

    const siloRing = new THREE.Mesh(
      new THREE.RingGeometry(10, 16, 36),
      new THREE.MeshStandardMaterial({ color: 0x30394a, roughness: 0.5, metalness: 0.6 })
    );
    siloRing.rotation.x = Math.PI / 2;
    siloRing.position.set(36, 13.92, -12);
    sc.add(siloRing);

    // Exterior Facility Walls & Structural Partitions
    addBoxCollider(120, 14, 2, 0x202838, 0, 7, -38);
    addBoxCollider(120, 14, 2, 0x202838, 0, 7, 22);
    addBoxCollider(2, 14, 62, 0x202838, -56, 7, -8);
    addBoxCollider(2, 14, 62, 0x202838, 56, 7, -8);

    const addPillar = (x: number, z: number) => {
      addBoxCollider(2.5, 14, 2.5, 0x2e394e, x, 7, z);
      addBoxCollider(2.62, 1.5, 2.62, 0xf2c14e, x, 2, z);
      SOL.push({ x, z, r: 2.2 });
    };
    addPillar(-20, -5);
    addPillar(4, -5);
    addPillar(-20, -28);
    addPillar(4, -28);
    addPillar(-4, 10);
    addPillar(6, 10);

    // Sector divider walls
    addBoxCollider(1.6, 14, 16, 0x252e40, -20, 7, -26);
    addBoxCollider(1.6, 6, 14, 0x252e40, -20, 11, -11);
    SOL.push({ x: -20, z: -26, r: 8.5 });

    addBoxCollider(1.6, 14, 16, 0x252e40, 4, 7, -26);
    addBoxCollider(1.6, 6, 14, 0x252e40, 4, 11, -11);
    SOL.push({ x: 4, z: -26, r: 8.5 });

    addBoxCollider(24, 14, 1.6, 0x252e40, -42, 7, -2);
    addBoxCollider(20, 14, 1.6, 0x252e40, -12, 7, -2);
    addBoxCollider(12, 14, 1.6, 0x252e40, 40, 7, -2);
    SOL.push({ x: -42, z: -2, r: 12 });
    SOL.push({ x: -12, z: -2, r: 10 });
    SOL.push({ x: 40, z: -2, r: 6 });

    addBoxCollider(2, 14, 16, 0x252e40, 0, 7, 10);
    SOL.push({ x: 0, z: 10, r: 8.5 });

    // Tutorial 3D Waypoint Beacon
    const tutBeacon = new THREE.Group();
    const beaconCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.6, 16),
      new THREE.MeshBasicMaterial({ color: 0x4fe3d4 })
    );
    beaconCone.rotation.x = Math.PI;
    const beaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    beaconRing.rotation.x = Math.PI / 2;
    tutBeacon.add(beaconCone, beaconRing);
    tutBeacon.visible = false;
    sc.add(tutBeacon);
    tutBeaconRef.current = tutBeacon;

    // SECTOR 1: ENTRANCE
    addBoxCollider(10, 6, 0.8, 0x1e283c, -2, 3, 20.6);
    addBoxCollider(6, 1.15, 2, 0x27344c, -2, 0.58, 12);
    SOL.push({ x: -2, z: 12, r: 3 });
    sc.add(createSectorSignSprite('NASA SPACE CENTER ENTRANCE', -2, 8.5, 20.6, 12, '#4fe3d4'));

    // SECTOR 2: GROUND STATION
    const dsn = buildDSNGroundStation();
    sc.add(dsn.group);
    SOL.push({ x: -40, z: 10, r: 3.5 });
    SOL.push({ x: -36, z: 8, r: 2.5 });
    sc.add(createSectorSignSprite('GROUND STATION COMMUNICATIONS', -40, 8.5, 20.6, 12, '#38bdf8'));

    // SECTOR 3: MISSION CONTROL CENTER
    const mcc = buildMissionControlCenter();
    sc.add(mcc.group);
    SOL.push({ x: -34, z: -24, r: 4 });
    SOL.push({ x: -34, z: -28.5, r: 4 });
    sc.add(createSectorSignSprite('MISSION CONTROL CENTER', -34, 8.5, -32, 12, '#38bdf8'));

    // SECTOR 4: SCIENTIFIC RESEARCH LAB
    const srlBench = buildResearchLabBench();
    sc.add(srlBench);
    SOL.push({ x: -8, z: -32, r: 8 });
    sc.add(createSectorSignSprite('SCIENTIFIC RESEARCH LABORATORY', -8, 8.5, -34, 13, '#34d399'));

    // SECTOR 5: SPACECRAFT ASSEMBLY HANGAR & LAUNCH PAD
    const hgrPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(44, 30),
      new THREE.MeshStandardMaterial({ map: makeHangarFloorTexture(), roughness: 0.35, metalness: 0.45 })
    );
    hgrPlate.rotation.x = -Math.PI / 2;
    hgrPlate.position.set(28, 0.01, -16);
    sc.add(hgrPlate);

    const padData = buildLaunchPadAndDetailedRocket();
    sc.add(padData.padGroup);
    sc.add(padData.rocket.group);
    rocketHandleRef.current = padData.rocket;
    SOL.push({ x: 30, z: -12, r: 1.5 });
    SOL.push({ x: 36, z: -12, r: 2.2 });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.15, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(36, 40, -12);
    ring.visible = false;
    sc.add(ring);
    targetRingRef.current = ring;

    const showcaseSat = buildHangarShowcaseSatellite();
    sc.add(showcaseSat);
    SOL.push({ x: 22, z: -6, r: 2.2 });
    sc.add(createSectorSignSprite('SPACECRAFT ASSEMBLY HANGAR', 24, 9, -34, 14, '#fbbf24'));

    // SECTOR 6: MISSION PLANNING ROOM
    const mpr = buildMissionPlanningHoloTable();
    sc.add(mpr.group);
    SOL.push({ x: -28, z: 10, r: 4.5 });
    sc.add(createSectorSignSprite('MISSION PLANNING ROOM', -28, 8, 20.8, 12, '#818cf8'));

    // SECTOR 7: LAUNCH CONTROL COMPLEX
    const lcc = buildLaunchControlComplex();
    sc.add(lcc);
    SOL.push({ x: 24, z: 4, r: 2.8 });
    sc.add(createSectorSignSprite('LAUNCH CONTROL COMPLEX', 24, 6.8, 4.8, 9, '#f87171'));

    // SUPPLY CRATES & MOTORS (Detailed multi-part instruments & De Laval nozzle motors)
    const crateHandles: CrateVisualHandle[] = [];
    CRATES.forEach((crate) => {
      const handle = buildSupplyCrateModel(crate);
      sc.add(handle.group);
      crateHandles.push(handle);

      const labelText = crate.mot
        ? `${crate.n}  •  ${crate.imp} thrust  •  ₡${crate.cred.toLocaleString()}`
        : `${crate.n}  •  ${crate.m} kg  •  ₡${crate.cred.toLocaleString()}`;
      sc.add(
        createSectorSignSprite(labelText, crate.x, crate.mot ? 4.9 : 3.7, -25, 6.4, crate.mot ? '#fbbf24' : '#38bdf8')
      );

      SOL.push({ x: crate.x, z: -25, r: 1.6 });
      INT.push({
        x: crate.x,
        z: -25,
        r: 4.4,
        text: () => {
          if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 4) {
            return `Press E: inspect ${crate.n}`;
          }
          if (simRef.current.phase === 1) {
            const active = crate.mot ? simRef.current.mot === crate.k : simRef.current.items.has(crate.k);
            return `${active ? 'Press E: return ' : 'Press E: requisition '}${crate.n}`;
          }
          return null;
        },
        act: () => takeCrate(crate),
      });
    });
    crateHandlesRef.current = crateHandles;

    // PROXIMITY INTERACTION ZONES
    // 1. Mission Control Center (MCC)
    INT.push({
      x: -34,
      z: -20,
      r: 12,
      text: () => {
        if (!playerStateRef.current.trainingCompleted) {
          return tutStepRef.current === 5 ? 'Press E: Inspect Mission Monitoring Screens' : null;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
        if (simRef.current.phase === 0 && M.briefingStationId === 'mcc') {
          return `Press E: Level 0${M.lvl} Briefing (MCC)`;
        }
        if (simRef.current.phase === 3 && !M.isLab) {
          return 'Press E: Debrief & Advance Campaign';
        }
        return null;
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted) {
          if (tutStepRef.current === 5) completeTutTask(5);
          return;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
        if (simRef.current.phase === 0 && M.briefingStationId === 'mcc') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (simRef.current.phase === 3 && !M.isLab) {
          const completedLvl = simRef.current.n + 1;
          const nextLvl =
            simRef.current.n < CAMPAIGN_LEVELS.length - 1
              ? simRef.current.n + 2
              : playerStateRef.current.currentCampaignLevel;
          updatePlayer((p) => {
            const nextCompleted = p.completedLevels.includes(completedLvl)
              ? p.completedLevels
              : [...p.completedLevels, completedLvl];
            return { ...p, completedLevels: nextCompleted, currentCampaignLevel: nextLvl };
          });
          void syncWithServer({ completedLevel: completedLvl, currentCampaignLevel: nextLvl });
          if (simRef.current.n < CAMPAIGN_LEVELS.length - 1) {
            simRef.current.n += 1;
            setActiveLevelIdx(simRef.current.n);
          }
          simRef.current.items.clear();
          simRef.current.mot = null;
          simRef.current.phase = 0;
          setSelectedItems(new Set());
          setSelectedMotor(null);
          setMissionPhase(0);
          syncCrateColors();
          SFX.levelComplete();
          const upcoming = CAMPAIGN_LEVELS[simRef.current.n];
          say(
            upcoming
              ? `Level 0${completedLvl} Debrief complete! Level 0${upcoming.lvl} briefing ready at ${upcoming.briefingStationName}.`
              : `Level 0${completedLvl} Debrief complete!`,
            5400
          );
        }
      },
    });

    // 2. Launch Pad Staging Trigger
    INT.push({
      x: 36,
      z: -12,
      r: 12,
      text: () => {
        const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
        if (M.isLab || simRef.current.phase === 0) return null;
        if (simRef.current.phase === 1) return 'Press E: Stage Rocket on Launch Pad';
        if (simRef.current.phase === 2 && !simRef.current.flying) return 'Press E: Unload Rocket';
        return null;
      },
      act: () => {
        if (simRef.current.phase === 1) loadRocketOnPad();
        else if (simRef.current.phase === 2) {
          simRef.current.phase = 1;
          setMissionPhase(1);
          if (rocketHandleRef.current) rocketHandleRef.current.group.visible = false;
          say('Rocket returned to hangar staging.');
        }
      },
    });

    // 3. Launch Control Console Trigger
    INT.push({
      x: 24,
      z: 4,
      r: 7.5,
      text: () => (simRef.current.phase === 2 && !simRef.current.flying ? 'Press E: INITIATE LAUNCH' : null),
      act: initiateLaunch,
    });

    // 4. Ground Station Dish Trigger (GSC Briefing + Telemetry)
    INT.push({
      x: -38,
      z: 8,
      r: 8.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 2) {
          return 'Press E: Explore Communication Antenna';
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'gsc') {
          return `Press E: Level 0${M.lvl} Briefing (GSC Dish)`;
        }
        return 'Press E: Inspect Antenna Telemetry';
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 2) {
          completeTutTask(2);
          return;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'gsc') {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        SFX.select();
        say('Ground Station DSN Antenna: S/X-Band Uplink & Downlink nominal.');
      },
    });

    // 5. Hangar Test Spacecraft Trigger (SAH Briefing + Level 1 Lab Entry)
    INT.push({
      x: 22,
      z: -6,
      r: 7.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 3) {
          return 'Press E: Inspect Spacecraft Subsystems';
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'sah') {
          return `Press E: Level 0${M.lvl} Briefing (SAH Hangar)`;
        }
        if (M?.isLab && simRef.current.phase >= 1) {
          return 'Press E: Enter Level 01 Satellite Assembly Lab';
        }
        return 'Press E: Inspect Spacecraft Architecture';
      },
      act: () => {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 3) {
          completeTutTask(3);
          return;
        }
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'sah') {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        if (M?.isLab && simRef.current.phase >= 1) {
          setSatLabOpen(true);
        } else {
          setShowSubsystemExplorer(true);
        }
      },
    });

    // 6. Scientific Research Lab (SRL) Briefing Station Trigger
    INT.push({
      x: -8,
      z: -22,
      r: 9.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted) return null;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'srl') {
          return `Press E: Level 0${M.lvl} Briefing (SRL Lab)`;
        }
        return null;
      },
      act: () => {
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'srl') {
          SFX.select();
          setBriefingModalLevel(M);
        }
      },
    });

    // 7. Mission Planning Room (MPR) Holo-Table Briefing & Inspection Trigger
    INT.push({
      x: -28,
      z: 10,
      r: 8.5,
      text: () => {
        if (!playerStateRef.current.trainingCompleted) return null;
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (simRef.current.phase === 0 && M?.briefingStationId === 'mpr') {
          return `Press E: Level 0${M.lvl} Briefing (MPR Holo-Table)`;
        }
        return 'Press E: Inspect Orbital Trajectory Holo-Table';
      },
      act: () => {
        const M = CAMPAIGN_LEVELS[simRef.current.n];
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'mpr') {
          SFX.select();
          setBriefingModalLevel(M);
          return;
        }
        SFX.select();
        say(`Mission Planning Room: Target ${M?.t} km — ${M?.sector}`);
      },
    });

    // ========================================================
    // INPUT, RAYCASTING & CAMERA CONTROLS
    // ========================================================
    const keys: Record<string, boolean> = {};
    let jx = 0;
    let jz = 0;
    let jid: number | null = null;
    let lid: number | null = null;
    let jo: [number, number] = [0, 0];
    let lp: [number, number] = [0, 0];
    let downPt: [number, number] = [0, 0];

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    const cv = ren.domElement;

    const isUiBlocking3D = () =>
      !startedRef.current || mapExpandedRef.current || satLabOpenRef.current || briefingModalOpenRef.current;

    const handle3DObjectClick = () => {
      if (isUiBlocking3D() || simRef.current.flying) return;
      const M = CAMPAIGN_LEVELS[simRef.current.n];

      if (raycaster.intersectObjects(dsn.group.children, true).length > 0) {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 2) {
          completeTutTask(2);
        } else if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'gsc') {
          SFX.select();
          setBriefingModalLevel(M);
        } else {
          SFX.select();
          say('Ground Station Telemetry Antenna: Tracking active.');
        }
        return;
      }

      if (raycaster.intersectObjects(showcaseSat.children, true).length > 0) {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 3) {
          completeTutTask(3);
        } else if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'sah') {
          SFX.select();
          setBriefingModalLevel(M);
        } else if (M?.isLab && simRef.current.phase >= 1) {
          setSatLabOpen(true);
        } else {
          setShowSubsystemExplorer(true);
        }
        return;
      }

      for (const h of crateHandles) {
        if (raycaster.intersectObject(h.hitMesh, false).length > 0) {
          takeCrate(h.crate);
          return;
        }
      }

      if (raycaster.intersectObjects(srlBench.children, true).length > 0) {
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'srl') {
          SFX.select();
          setBriefingModalLevel(M);
        } else {
          SFX.select();
          say('Scientific Research Lab: Cleanroom sensor calibration bench.');
        }
        return;
      }

      if (raycaster.intersectObjects(mpr.group.children, true).length > 0) {
        if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'mpr') {
          SFX.select();
          setBriefingModalLevel(M);
        } else {
          SFX.select();
          say(`Mission Planning Room: Target ${M?.t} km — ${M?.sector}`);
        }
        return;
      }

      if (raycaster.intersectObject(mcc.screenMesh, false).length > 0) {
        if (!playerStateRef.current.trainingCompleted && tutStepRef.current === 5) {
          completeTutTask(5);
        } else if (playerStateRef.current.trainingCompleted && simRef.current.phase === 0 && M?.briefingStationId === 'mcc') {
          SFX.select();
          setBriefingModalLevel(M);
        } else {
          SFX.select();
          say('Mission Control Video Wall: Live orbital telemetry streaming.');
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isUiBlocking3D()) return;
      cv.setPointerCapture(e.pointerId);
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.45) {
        jid = e.pointerId;
        jo = [e.clientX, e.clientY];
        if (joyWrapRef.current) {
          joyWrapRef.current.style.display = 'block';
          joyWrapRef.current.style.left = `${e.clientX - 45}px`;
          joyWrapRef.current.style.top = `${e.clientY - 45}px`;
        }
      } else {
        lid = e.pointerId;
        lp = [e.clientX, e.clientY];
        downPt = [e.clientX, e.clientY];
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isUiBlocking3D()) return;
      if (e.pointerId === jid) {
        const dx = e.clientX - jo[0];
        const dy = e.clientY - jo[1];
        const m = Math.min(1, Math.hypot(dx, dy) / 45);
        const a = Math.atan2(dy, dx);
        jx = Math.cos(a) * m;
        jz = Math.sin(a) * m;
        if (joyDotRef.current) {
          joyDotRef.current.style.transform = `translate(${jx * 30}px, ${jz * 30}px)`;
        }
      } else if (e.pointerId === lid) {
        lookRef.current.yaw -= (e.clientX - lp[0]) * 0.005;
        lookRef.current.pitch = Math.max(-1.3, Math.min(1.3, lookRef.current.pitch - (e.clientY - lp[1]) * 0.005));
        lp = [e.clientX, e.clientY];
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === jid) {
        jid = null;
        jx = 0;
        jz = 0;
        if (joyWrapRef.current) joyWrapRef.current.style.display = 'none';
      }
      if (e.pointerId === lid) {
        if (Math.hypot(e.clientX - downPt[0], e.clientY - downPt[1]) < 8) {
          mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
          mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
          raycaster.setFromCamera(mouseVec, cam);
          handle3DObjectClick();
        }
        lid = null;
      }
    };

    cv.addEventListener('pointerdown', onPointerDown);
    cv.addEventListener('pointermove', onPointerMove);
    cv.addEventListener('pointerup', onPointerUp);
    cv.addEventListener('pointercancel', onPointerUp);

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === 'escape') {
        closeMap();
        setShowCampaignModal(false);
        setShowProfileModal(false);
        setCompletedTaskModal(null);
        setBriefingModalLevel(null);
        return;
      }
      if (satLabOpenRef.current || briefingModalOpenRef.current) return;
      if (k === 'e' && startedRef.current && !simRef.current.flying && currentInteractRef.current) {
        currentInteractRef.current.act();
      }
      if (k === 'm' && startedRef.current) {
        if (mapExpandedRef.current) closeMap();
        else openMap();
      }
      if (k === 'c' && startedRef.current) {
        setShowCampaignModal((v) => !v);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      ren.setSize(window.innerWidth, window.innerHeight, false);
    };
    window.addEventListener('resize', onResize);

    // ========================================================
    // MAIN RENDER & FLIGHT SIMULATION LOOP
    // ========================================================
    let last = performance.now();
    let lastLocUpdate = 0;
    let rafId = 0;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Ambient animated facility machinery
      mcc.updateScreen(now);
      mpr.earthGlobe.rotation.y += 0.008;
      mpr.orbitRing.rotation.z += 0.015;
      const orbAng = now * 0.0014;
      mpr.orbitSat.position.set(-28 + Math.cos(orbAng) * 2.45, 2.75 + Math.sin(orbAng) * 1.1, 10 + Math.sin(orbAng) * 1.9);

      const craneZ = -12 + Math.sin(now * 0.0006) * 5;
      padData.gantryHoist.position.z = craneZ;
      padData.craneHoistCable.position.z = craneZ;
      padData.hoistBeacon.position.z = craneZ;
      (padData.hoistBeacon.material as THREE.MeshBasicMaterial).color.setHex(
        Math.sin(now * 0.005) > 0 ? 0x4fe3d4 : 0x0ea5e9
      );

      dsn.dishElevation.rotation.x = 0.65 + Math.sin(now * 0.0005) * 0.14;
      dsn.dishAzimuth.rotation.y = Math.sin(now * 0.0003) * 0.3;
      showcaseSat.rotation.y += 0.007;
      hangarGlow.intensity = 0.75 + Math.sin(now * 0.003) * 0.25;

      const M = CAMPAIGN_LEVELS[simRef.current.n] || CAMPAIGN_LEVELS[0];
      const s = simRef.current;

      // Dynamic 3D Waypoint Beacon: Cadet Training OR Active Mission Station
      if (!playerStateRef.current.trainingCompleted && tutStepRef.current > 0) {
        if (tutBeacon.visible) {
          const baseY = typeof tutBeacon.userData.baseY === 'number' ? tutBeacon.userData.baseY : 5.2;
          tutBeacon.position.y = baseY + Math.sin(now * 0.005) * 0.22;
          tutBeacon.rotation.y += 0.025;
        }
      } else if (
        playerStateRef.current.trainingCompleted &&
        startedRef.current &&
        !s.flying &&
        !satLabOpenRef.current &&
        !briefingModalOpenRef.current
      ) {
        let bx = 22;
        let by = 5.2;
        let bz = -6;
        let showBeacon = true;

        if (s.phase === 0) {
          if (M.briefingStationId === 'sah') {
            bx = 22; by = 5.2; bz = -6;
          } else if (M.briefingStationId === 'mcc') {
            bx = -34; by = 6.0; bz = -24;
          } else if (M.briefingStationId === 'srl') {
            bx = -8; by = 5.2; bz = -26;
          } else if (M.briefingStationId === 'mpr') {
            bx = -28; by = 5.4; bz = 10;
          } else if (M.briefingStationId === 'gsc') {
            bx = -40; by = 6.4; bz = 10;
          }
        } else if (s.phase === 1 && M.isLab) {
          bx = 22; by = 5.2; bz = -6;
        } else if (s.phase === 1 && !M.isLab) {
          if (M.req.some((k) => !s.items.has(k))) {
            bx = -8; by = 5.2; bz = -26;
          } else if (!s.mot) {
            bx = 17; by = 5.2; bz = -25;
          } else {
            bx = 36; by = 7.2; bz = -12;
          }
        } else if (s.phase === 2) {
          bx = 24; by = 4.8; bz = 4;
        } else if (s.phase === 3) {
          bx = -34; by = 6.0; bz = -24;
        } else {
          showBeacon = false;
        }

        tutBeacon.visible = showBeacon;
        if (showBeacon) {
          tutBeacon.position.set(bx, by + Math.sin(now * 0.005) * 0.25, bz);
          tutBeacon.rotation.y += 0.025;
        }
      } else {
        tutBeacon.visible = false;
      }

      // Target altitude ring visibility
      const showRing =
        !M.isLab &&
        (playerStateRef.current.trainingCompleted || tutStepRef.current === 0) &&
        (simRef.current.phase === 1 || simRef.current.phase === 2);
      ring.visible = showRing;
      ring.position.y = typeof M.t === 'number' ? M.t * 1.2 : 40;

      // Player Movement vs Showcase Camera
      if (startedRef.current && !s.flying && !satLabOpenRef.current && !briefingModalOpenRef.current) {
        let f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - jz;
        let r = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + jx;
        const len = Math.hypot(f, r);
        if (len > 1) {
          f /= len;
          r /= len;
        }

        const P = playerPosRef.current;
        const yaw = lookRef.current.yaw;
        P.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * 7.8 * dt;
        P.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * 7.8 * dt;

        for (const o of SOL) {
          const dx = P.x - o.x;
          const dz = P.z - o.z;
          const d = Math.hypot(dx, dz) || 0.01;
          if (d < o.r + 0.7) {
            P.x = o.x + (dx / d) * (o.r + 0.7);
            P.z = o.z + (dz / d) * (o.r + 0.7);
          }
        }
        P.x = Math.max(-53, Math.min(53, P.x));
        P.z = Math.max(-35, Math.min(19, P.z));

        cam.position.set(P.x, 1.7, P.z);
        cam.rotation.order = 'YXZ';
        cam.rotation.set(lookRef.current.pitch, lookRef.current.yaw, 0);

        if (now - lastLocUpdate > 160) {
          lastLocUpdate = now;
          const loc = getCurrentLocation(P.x, P.z);
          setCurrentLoc((prev) => (prev.id === loc.id ? prev : loc));
        }
      } else if (!startedRef.current) {
        const t = now * 0.00035;
        cam.position.set(Math.sin(t) * 16 - 4, 3.6 + Math.sin(t * 0.7) * 0.8, Math.cos(t) * 14 - 2);
        cam.lookAt(Math.sin(t + 0.5) * 6 + 6, 2.8, Math.cos(t + 0.5) * 8 - 14);
      }

      // Rocket Flight Ascent Physics
      if (s.flying) {
        const e = (now - s.t0) / 1000;
        if (e < 3) {
          setToastMsg({ text: `T-MINUS ${Math.ceil(3 - e)}`, until: now + 350 });
          padData.rocket.flame.visible = e > 2.3;
        } else {
          const k = Math.min(1, (e - 3) / 4.5);
          const curAlt = s.flightAlt * (1 - Math.pow(1 - k, 3));
          padData.rocket.group.position.y = 0.52 + curAlt * 1.2;
          padData.rocket.flame.visible = k < 1;
          padData.rocket.flame.scale.set(1, 0.85 + Math.sin(now * 0.04) * 0.2, 1);
          setToastMsg({ text: `ALTITUDE: ${curAlt.toFixed(0)} km`, until: now + 350 });
          cam.lookAt(36, padData.rocket.group.position.y + 5, -12);

          if (k >= 1) {
            s.flying = false;
            padData.rocket.flame.visible = false;
            setIsFlying(false);
            const ok = s.flightAlt >= s.altTarget;
            const curMission = CAMPAIGN_LEVELS[s.n] || CAMPAIGN_LEVELS[0];
            if (ok) {
              const left = Math.max(0, curMission.b - s.flightCost);
              const pts = 100 + s.extraCount * 25 + left * 2;
              const earnGrant = 2500 + pts * 10;
              const earnStar = 20;
              s.score += pts;
              setFlightScore(s.score);
              s.phase = 3;
              setMissionPhase(3);
              SFX.levelComplete();
              const nextGrant = playerStateRef.current.grantCredits + earnGrant;
              updatePlayer((p) => ({
                ...p,
                grantCredits: p.grantCredits + earnGrant,
                starCredits: p.starCredits + earnStar,
                levelScores: {
                  ...p.levelScores,
                  [curMission.lvl]: Math.max(p.levelScores[curMission.lvl] || 0, pts),
                },
              }));
              void syncWithServer({
                grantCredits: nextGrant,
                flightRewardStar: earnStar,
                flightRewardGrant: earnGrant,
                flightTxKey: `flight:${curMission.lvl}:${Math.round(s.t0)}`,
                levelScores: { [curMission.lvl]: pts },
                note: `Level ${curMission.lvl} Launch Completion`,
              });
              setToastMsg({
                text: `Mission Success! ${s.flightAlt.toFixed(0)} km reached. +${pts} pts (+₡${earnGrant.toLocaleString()}, +★${earnStar})`,
                until: now + 6200,
              });
            } else {
              s.phase = 1;
              setMissionPhase(1);
              SFX.snapWrong();
              setToastMsg({
                text: `Apogee fell short: ${s.flightAlt.toFixed(0)} km of ${s.altTarget} km. Upgrade motor impulse or reduce mass.`,
                until: now + 7000,
              });
            }

            window.setTimeout(() => {
              padData.rocket.group.position.y = 0.52;
              padData.rocket.group.visible = false;
            }, 3400);
          }
        }
      }

      // Check proximity interactables
      let bestZone: InteractableZone | null = null;
      let bestDist = 1e9;
      let nextPrompt = '';
      if (startedRef.current && !s.flying && !satLabOpenRef.current && !briefingModalOpenRef.current) {
        const P = playerPosRef.current;
        for (const z of INT) {
          const t = z.text();
          if (!t) continue;
          const d = Math.hypot(P.x - z.x, P.z - z.z);
          if (d < z.r && d < bestDist) {
            bestDist = d;
            bestZone = z;
            nextPrompt = t;
          }
        }
      }
      currentInteractRef.current = bestZone;
      setPromptText((prev) => (prev === nextPrompt ? prev : nextPrompt));

      ren.render(sc, cam);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cv.removeEventListener('pointerdown', onPointerDown);
      cv.removeEventListener('pointermove', onPointerMove);
      cv.removeEventListener('pointerup', onPointerUp);
      cv.removeEventListener('pointercancel', onPointerUp);
      sc.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
      envTex.dispose();
      pmrem.dispose();
      ren.dispose();
      if (container.contains(ren.domElement)) {
        container.removeChild(ren.domElement);
      }
    };
  }, [closeMap, completeTutTask, initiateLaunch, loadRocketOnPad, openMap, say, syncCrateColors, syncWithServer, takeCrate, updatePlayer]);

  // Derived HUD metrics
  const activeMission = CAMPAIGN_LEVELS[activeLevelIdx] || CAMPAIGN_LEVELS[0];
  const vehicleCalc = (() => {
    const items = [...selectedItems].map((k) => CRATES.find((c) => c.k === k)).filter(Boolean) as SupplyCrate[];
    const motor = CRATES.find((c) => c.k === selectedMotor) ?? null;
    const mass = 20 + items.reduce((a, x) => a + (x.m || 0), 0);
    const cost = items.reduce((a, x) => a + x.c, 0) + (motor ? motor.c : 0);
    return { items, motor, mass, cost, alt: motor && motor.imp ? (1.5 * motor.imp) / mass : 0 };
  })();

  const inStagingSector =
    currentLoc.id === 'sah' ||
    currentLoc.id === 'srl' ||
    currentLoc.id === 'lcc' ||
    selectedItems.size > 0 ||
    selectedMotor !== null;
  const trainingActive = !playerState.trainingCompleted && tutStep > 0;
  const showToast = toastMsg.text && performance.now() < toastMsg.until;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020612] text-[#e8eefc]">
      {/* 3D WebGL Facility Canvas */}
      <div ref={mountRef} className="fixed inset-0 z-0" />

      {/* Top Aerospace Command Bar */}
      {started && (
        <header className="fixed top-2.5 left-3 right-3 z-30 h-12 px-3.5 rounded-xl bg-[#071124]/92 border border-cyan-400/25 shadow-[0_10px_28px_rgba(0,0,0,0.65)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-extrabold text-xs sm:text-sm tracking-wider text-[#4fe3d4] truncate">
              SPACEVERSE <span className="text-slate-500 hidden sm:inline">//</span>{' '}
              <span className="text-slate-200 hidden sm:inline">GALAXY-X</span>
            </span>

            <button
              onClick={() => {
                SFX.click();
                setShowCampaignModal(true);
              }}
              className="ml-1 sm:ml-3 px-2.5 py-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/28 border border-cyan-400/45 text-[#4fe3d4] text-[11px] font-bold transition cursor-pointer shrink-0"
            >
              🚀 Missions
            </button>

            <button
              onClick={() => {
                SFX.click();
                startCadetTraining();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-400/12 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 text-[11px] font-bold transition cursor-pointer hidden md:inline-flex items-center gap-1 shrink-0"
            >
              🎓 Cadet Training
            </button>

            <button
              onClick={() => {
                SFX.click();
                if (mapExpanded) closeMap();
                else openMap();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/15 text-slate-200 text-[11px] font-bold transition cursor-pointer hidden lg:inline-flex items-center gap-1 shrink-0"
            >
              🗺 Map
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Clickable Currency Readout (Task 6 target) */}
            <button
              type="button"
              onClick={() => {
                SFX.click();
                if (!playerState.trainingCompleted && tutStep === 6) {
                  completeTutTask(6);
                } else {
                  setShowProfileModal(true);
                }
              }}
              title="Grant Credits & Star Credits"
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0b1933] border text-xs font-mono-tech font-bold transition cursor-pointer ${
                tutStep === 6 && !playerState.trainingCompleted
                  ? 'border-2 border-[#f2c14e] animate-[pulseTarget_1.2s_infinite]'
                  : 'border-cyan-400/30 hover:border-cyan-400/60'
              }`}
            >
              <span className="text-[#4fe3d4] tabular-nums">₡ {playerState.grantCredits.toLocaleString()}</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-300 tabular-nums">★ {playerState.starCredits.toLocaleString()}</span>
            </button>

            <button
              onClick={() => {
                SFX.click();
                setShowProfileModal(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/15 text-slate-200 text-[11px] font-bold transition cursor-pointer hidden sm:inline-flex"
            >
              👤 Dossier
            </button>

            <button
              onClick={() => {
                const next = SFX.toggleMute();
                setMuted(next);
              }}
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition cursor-pointer ${
                muted
                  ? 'bg-red-500/15 border-red-400/40 text-red-300'
                  : 'bg-[#0b1933] border-cyan-400/30 text-[#4fe3d4]'
              }`}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </header>
      )}

      {/* Facility Radar Minimap + Expanded Map Modal */}
      {started && (
        <FacilityMap
          playerPosRef={playerPosRef}
          currentLoc={currentLoc}
          mapExpanded={mapExpanded}
          tutStep={tutStep}
          trainingCompleted={playerState.trainingCompleted}
          onOpenMap={openMap}
          onCloseMap={closeMap}
          onNavigateToLocation={navigateToLocation}
          onTeleportPoint={teleportPoint}
        />
      )}

      {/* Cadet Training Progress HUD (Top-Center during training) */}
      {started && trainingActive && (
        <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 w-[min(460px,92vw)] rounded-xl bg-[#071124]/95 border border-cyan-400/50 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.75)]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-mono-tech text-[11px] font-bold uppercase tracking-wider text-[#4fe3d4]">
              FLIGHT ACADEMY // TRAINING {tutStep - 1}/6
            </span>
            <button
              onClick={() => {
                SFX.click();
                skipTutorial();
              }}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold text-slate-300 cursor-pointer"
            >
              Skip ✕
            </button>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-white/10 mb-2">
            <div
              className="h-full bg-gradient-to-r from-[#4fe3d4] to-[#34d399] transition-all duration-300"
              style={{ width: `${((tutStep - 1) / 6) * 100}%` }}
            />
          </div>
          <div className="text-xs font-bold text-white leading-snug">
            {TUT_TASK_META[tutStep]?.instr}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{TUT_TASK_META[tutStep]?.hint}</div>
        </div>
      )}

      {/* Left Mission Directive HUD (Hidden during Cadet Training for clean UI) */}
      {started && !trainingActive && (
        <aside className="fixed top-[68px] left-3 z-20 w-[min(335px,calc(100vw-24px))] rounded-xl bg-[#071124]/92 border border-cyan-400/25 shadow-[0_10px_28px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="px-3.5 py-2 bg-[#0b1830] border-b border-cyan-400/20 flex items-center justify-between text-[11px] font-mono-tech">
            <span className="font-bold text-[#4fe3d4] tracking-wider">MISSION DIRECTIVE</span>
            <span className="font-bold text-amber-300">LEVEL 0{activeMission.lvl}</span>
          </div>
          <div className="p-3.5">
            <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{activeMission.icon}</span>
              <span>{activeMission.title}</span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#050d1d] border border-white/10 text-[10px]">
              <span className="text-slate-400 uppercase font-mono-tech">
                {missionPhase === 0 ? 'Briefing Station' : 'Active Station'}
              </span>
              <span className="font-bold text-amber-300 truncate">
                📍 {activeMission.briefingStationName}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {missionPhase === 0
                ? `Go to ${activeMission.briefingStationName} and press E to receive your Level 0${activeMission.lvl} mission briefing.`
                : activeMission.isLab
                ? 'Briefing accepted! Press E at the SAH showcase satellite or click below to enter the Satellite Assembly Lab.'
                : [
                    '',
                    'Select required sensors in Research Lab (SRL), pick a motor in Hangar (SAH), and stage at Launch Pad.',
                    'Rocket staged on pad! Proceed to Launch Control Complex (LCC) console and press E to launch.',
                    'Mission Flight Complete! Return to Mission Control Center (MCC) for debriefing rewards.',
                  ][missionPhase]}
            </p>

            {missionPhase === 0 && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  navigateToLocation(activeMission.briefingStationId);
                }}
                className="mt-3 w-full py-2 rounded-lg bg-amber-400/18 hover:bg-amber-400/30 border border-amber-400/50 text-amber-200 font-extrabold text-xs tracking-wide uppercase transition cursor-pointer"
              >
                📍 Go to {activeMission.briefingStationId.toUpperCase()} Station
              </button>
            )}

            {activeMission.isLab && missionPhase >= 1 && (
              <button
                type="button"
                onClick={() => {
                  SFX.click();
                  setSatLabOpen(true);
                }}
                className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
              >
                Open Satellite Assembly Lab ▶
              </button>
            )}

            {!activeMission.isLab && (
              <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-slate-400 text-[10px]">Target</div>
                  <strong className="text-white font-mono-tech">{activeMission.t} km</strong>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Budget</div>
                  <strong className="text-[#4fe3d4] font-mono-tech">{activeMission.b}M</strong>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Requisites</div>
                  <strong className="text-amber-300 truncate block">
                    {activeMission.req.map(crateDisplayName).join(', ')}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Right Rocket Manifest Card (Positioned cleanly below Minimap, never overlaps) */}
      {started && !trainingActive && inStagingSector && !activeMission.isLab && (
        <aside className="fixed top-[242px] right-3 z-20 w-[212px] rounded-xl bg-[#071124]/92 border border-cyan-400/25 p-3 shadow-[0_10px_28px_rgba(0,0,0,0.6)] text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
            <span className="font-bold text-white">🚀 Rocket Manifest</span>
            <span
              className={`text-[10px] font-mono-tech font-bold ${
                vehicleCalc.cost > activeMission.b ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {vehicleCalc.cost > activeMission.b ? 'OVER' : 'NOMINAL'}
            </span>
          </div>
          <div className="space-y-1 text-[11px] font-mono-tech">
            <div className="flex justify-between text-slate-300">
              <span>Dry Mass:</span>
              <b className="text-white tabular-nums">{vehicleCalc.mass} kg</b>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cost:</span>
              <b
                className={`tabular-nums ${
                  vehicleCalc.cost > activeMission.b ? 'text-red-400' : 'text-[#4fe3d4]'
                }`}
              >
                {vehicleCalc.cost}M / {activeMission.b}M
              </b>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Apogee:</span>
              <b className="text-white tabular-nums">
                {vehicleCalc.motor ? `${vehicleCalc.alt.toFixed(0)} km` : 'No Motor'}
              </b>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Score:</span>
              <b className="text-amber-300 tabular-nums">{flightScore} pts</b>
            </div>
          </div>
        </aside>
      )}

      {/* Center Status Toast */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-25 px-4 py-2 rounded-xl bg-[#061124]/95 border border-cyan-400/45 text-xs sm:text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.75)] text-center max-w-[90vw]">
          {toastMsg.text}
        </div>
      )}

      {/* Proximity Action Prompt [E] */}
      {started && promptText && !satLabOpen && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-25 px-4 py-2 rounded-xl bg-amber-400/18 border border-[#f2c14e] text-amber-200 text-xs sm:text-sm font-extrabold tracking-wide shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
          {promptText}
        </div>
      )}

      {/* Bottom Controls Hint + Action & Fullscreen Buttons */}
      {started && !satLabOpen && (
        <>
          <div className="fixed bottom-3 left-3 z-20 hidden sm:block px-3 py-1.5 rounded-lg bg-[#071022]/85 border border-white/10 text-[11px] text-slate-400">
            WASD Move • Drag Look • Click 3D Objects or press <kbd className="text-[#4fe3d4]">E</kbd> • Map{' '}
            <kbd className="text-[#4fe3d4]">M</kbd>
          </div>

          <div className="fixed bottom-3 right-3 z-20 flex items-center gap-2">
            <button
              onClick={() => {
                if (started && !isFlying && currentInteractRef.current) {
                  SFX.click();
                  currentInteractRef.current.act();
                }
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                promptText
                  ? 'bg-[#4fe3d4] text-[#041022] border-[#4fe3d4]'
                  : 'bg-[#071124]/85 text-slate-400 border-white/15 opacity-50'
              }`}
            >
              Interact [E]
            </button>
            <button
              onClick={() => {
                SFX.click();
                if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                else document.documentElement.requestFullscreen?.().catch(() => {});
              }}
              className="px-3 py-2 rounded-xl bg-[#071124]/85 border border-white/15 hover:border-cyan-400/45 text-xs font-bold text-slate-300 transition cursor-pointer"
            >
              ⛶
            </button>
          </div>
        </>
      )}

      {/* Touch Virtual Joystick */}
      <div
        ref={joyWrapRef}
        className="fixed hidden z-20 w-[90px] h-[90px] rounded-full border-2 border-cyan-400/45 bg-cyan-400/10 pointer-events-none"
      >
        <div
          ref={joyDotRef}
          className="w-8 h-8 rounded-full bg-[#4fe3d4]/80 absolute top-1/2 left-1/2 -mt-4 -ml-4"
        />
      </div>

      {/* ONBOARDING & CAMPAIGN MODALS */}
      <IntroSplash visible={showSplash} />

      <WelcomeOverlay
        visible={showWelcome}
        onAccept={async () => {
          setShowWelcome(false);
          setStarted(true);
          const wasJoined = playerStateRef.current.joined;
          try {
            const res = await fetch('/api/player/recruit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: playerStateRef.current.userId,
                callsign: playerStateRef.current.callsign,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.player) {
                applyServerPlayer(data.player);
                if (!data.alreadyAwarded || !wasJoined) {
                  SFX.badgeUnlock();
                  setShowBadgeModal(true);
                } else if (!data.player.trainingCompleted) {
                  setShowTrainingIntro(true);
                } else {
                  say(`Welcome back to GALAXY-X, ${data.player.callsign}!`, 3800);
                }
                return;
              }
            }
          } catch {
            // Offline fallback
          }

          if (!wasJoined) {
            updatePlayer((p) => ({
              ...p,
              joined: true,
              grantCredits: Math.max(p.grantCredits, 10000),
              starCredits: p.joined ? p.starCredits : p.starCredits + 500,
              badges: p.badges.includes('NEW_RECRUIT') ? p.badges : [...p.badges, 'NEW_RECRUIT'],
            }));
            SFX.badgeUnlock();
            setShowBadgeModal(true);
          } else if (!playerStateRef.current.trainingCompleted) {
            setShowTrainingIntro(true);
          } else {
            say('Welcome back to GALAXY-X Research Facility, Explorer!', 3800);
          }
        }}
      />

      <RecruitBadgeModal
        visible={showBadgeModal}
        onClaim={() => {
          setShowBadgeModal(false);
          if (!playerState.trainingCompleted) setShowTrainingIntro(true);
          else setShowCampaignModal(true);
        }}
      />

      <TrainingIntroModal
        visible={showTrainingIntro}
        onBegin={() => {
          setShowTrainingIntro(false);
          startCadetTraining();
        }}
        onSkip={skipTutorial}
      />

      <TutorialTaskModal
        taskNum={completedTaskModal}
        onContinue={() => {
          const doneNum = completedTaskModal;
          setCompletedTaskModal(null);
          if (doneNum && doneNum < 6) {
            const next = doneNum + 1;
            setTutStep(next);
            updateBeaconForStep(next, false);
          } else if (doneNum === 6) {
            finishAllTraining();
          }
        }}
      />

      <SubsystemExplorerModal
        visible={showSubsystemExplorer}
        onClose={!playerState.trainingCompleted && tutStep === 3 ? undefined : () => setShowSubsystemExplorer(false)}
        onComplete={() => {
          setShowSubsystemExplorer(false);
          if (!playerState.trainingCompleted && tutStep === 3) {
            setTutStep(4);
            updateBeaconForStep(4, false);
          }
        }}
      />

      <TrainingCompleteModal
        visible={showTrainingComplete}
        onViewCampaign={() => {
          setShowTrainingComplete(false);
          setShowCampaignModal(true);
        }}
      />

      <CampaignDirectoryModal
        visible={showCampaignModal}
        playerState={playerState}
        activeLevelIdx={activeLevelIdx}
        tutStep={tutStep}
        onClose={() => setShowCampaignModal(false)}
        onStartTraining={startCadetTraining}
        onSelectLevel={handleSelectCampaignLevel}
      />

      <Level2IntroModal
        visible={showLevel2Intro}
        onStartLevel2={() => {
          setShowLevel2Intro(false);
          handleSelectCampaignLevel(1);
        }}
        onBackToAcademy={() => {
          setShowLevel2Intro(false);
          setShowCampaignModal(true);
        }}
      />

      <ExplorerDossierModal
        visible={showProfileModal}
        playerState={playerState}
        onClose={() => setShowProfileModal(false)}
        onSwitchAccount={handleSwitchAccount}
      />

      {/* STATION MISSION BRIEFING MODAL (Press E at Station) */}
      <MissionBriefingModal
        level={briefingModalLevel}
        onClose={() => setBriefingModalLevel(null)}
        onAccept={() => {
          const lvl = briefingModalLevel;
          setBriefingModalLevel(null);
          if (!lvl) return;
          simRef.current.phase = 1;
          setMissionPhase(1);
          if (lvl.isLab) {
            setSatLabOpen(true);
          } else {
            say(
              `Briefing accepted for Level 0${lvl.lvl}! Acquire ${lvl.displayReq.join(' + ')} in SRL, pick a motor in SAH, then stage at Launch Pad.`,
              5500
            );
          }
        }}
      />

      {/* LEVEL 1: 3D SATELLITE ASSEMBLY LAB */}
      <SatelliteAssemblyLab
        visible={satLabOpen}
        starCredits={playerState.starCredits}
        alreadyCompleted={playerState.completedLevels.includes(1)}
        onCompleteMission={handleCompleteLevel1}
        onContinueToLevel2={() => {
          setSatLabOpen(false);
          setShowLevel2Intro(true);
        }}
        onBackToAcademy={() => {
          setSatLabOpen(false);
          setShowCampaignModal(true);
        }}
        onExit={() => setSatLabOpen(false)}
      />
    </div>
  );
}
