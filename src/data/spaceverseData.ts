export interface FacilityLocation {
  id: string;
  code: string;
  name: string;
  desc: string;
  badgeColor: string;
  target: { x: number; z: number };
  bounds: { x1: number; x2: number; z1: number; z2: number };
  yaw: number;
}

export type BriefingStationId = 'sah' | 'mcc' | 'srl' | 'mpr' | 'gsc';

export interface CampaignLevel {
  lvl: number;
  title: string;
  tag: string;
  sector: string;
  orbit: string;
  briefingStationId: BriefingStationId;
  briefingStationName: string;
  stationRoute: string[];
  t: number | string;
  b: number;
  credB: number;
  req: string[];
  displayReq: string[];
  goal: string;
  isLab?: boolean;
  rewardText: string;
  icon: string;
  difficulty: string;
}

export interface SupplyCrate {
  k: string;
  n: string;
  m?: number;
  imp?: number;
  c: number;
  cred: number;
  x: number;
  mot?: boolean;
  subtitle: string;
}

export type SatSubsystemId =
  | 'bus'
  | 'solar'
  | 'battery'
  | 'antenna'
  | 'camera'
  | 'propulsion'
  | 'computer'
  | 'adcs'
  | 'thermal';

export interface SatComponentSpec {
  id: SatSubsystemId;
  sequenceStep: number;
  name: string;
  shortName: string;
  icon: string;
  targetId: string;
  targetName: string;
  anchorPos: { x: number; y: number; z: number };
  idealYaw: number;
  idealPitch: number;
  func: string;
  massKg: number;
  powerW: string;
  telemetryTag: string;
  correctNote: string;
  wrongNotes: Record<string, string>;
}

export type RocketPartId =
  | 'first_stage_structure'
  | 'first_stage_tanks'
  | 'first_stage_engines'
  | 'interstage'
  | 'second_stage_body'
  | 'second_stage_engine'
  | 'avionics'
  | 'grid_fins'
  | 'landing_legs'
  | 'payload_fairing';

export interface RocketComponentSpec {
  id: RocketPartId;
  sequenceStep: number;
  name: string;
  shortName: string;
  targetName: string;
  anchorPos: { x: number; y: number; z: number };
  idealYaw: number;
  idealPitch: number;
  func: string;
  massKg: number;
  telemetryTag: string;
  correctNote: string;
  wrongNotes: Record<string, string>;
}

export type LaunchSequenceStatus =
  | 'not_started'
  | 'countdown'
  | 'ignition'
  | 'ascent'
  | 'completed';

export interface Level1Progress {
  stage: 1 | 2 | 3 | 4 | 5;
  satParts: SatSubsystemId[];
  rocketParts: RocketPartId[];
  stage1Done: boolean;
  stage2Done: boolean;
  stage3Done: boolean;
  stage4Done: boolean;
  stage5Done: boolean;
  launchStatus: LaunchSequenceStatus;
}

export const DEFAULT_LEVEL1_PROGRESS: Level1Progress = {
  stage: 1,
  satParts: [],
  rocketParts: [],
  stage1Done: false,
  stage2Done: false,
  stage3Done: false,
  stage4Done: false,
  stage5Done: false,
  launchStatus: 'not_started',
};

export interface PlayerTransaction {
  id: string;
  key: string;
  type: string;
  amountStarCredits: number;
  amountGrantCredits: number;
  badge?: string;
  note: string;
  timestamp: string;
}

export interface PlayerState {
  userId: string;
  callsign: string;
  joined: boolean;
  trainingCompleted: boolean;
  currentCampaignLevel: number;
  completedLevels: number[];
  levelScores: Record<number, number>;
  grantCredits: number;
  starCredits: number;
  badges: string[];
  transactions?: PlayerTransaction[];
  level1Progress?: Level1Progress;
}

export const STORAGE_KEY = 'galaxy_x_player_save_v3';

export const DEFAULT_PLAYER_STATE: PlayerState = {
  userId: 'explorer-default',
  callsign: 'Explorer-01',
  joined: false,
  trainingCompleted: false,
  currentCampaignLevel: 1,
  completedLevels: [],
  levelScores: {},
  grantCredits: 10000,
  starCredits: 0,
  badges: [],
  transactions: [],
  level1Progress: { ...DEFAULT_LEVEL1_PROGRESS },
};

export function getSavedUserId(): string {
  try {
    return localStorage.getItem('galaxy_x_active_user_id') || 'explorer-default';
  } catch {
    return 'explorer-default';
  }
}

export function setSavedUserId(userId: string): void {
  try {
    localStorage.setItem('galaxy_x_active_user_id', userId);
  } catch {
    // ignore storage errors
  }
}

export function loadPlayerData(): PlayerState {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${getSavedUserId()}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerState>;
      return {
        ...DEFAULT_PLAYER_STATE,
        ...parsed,
        level1Progress: {
          ...DEFAULT_LEVEL1_PROGRESS,
          ...(parsed.level1Progress || {}),
        },
      };
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_PLAYER_STATE, userId: getSavedUserId() };
}

export function savePlayerData(state: PlayerState): void {
  try {
    setSavedUserId(state.userId || 'explorer-default');
    localStorage.setItem(`${STORAGE_KEY}:${state.userId || 'explorer-default'}`, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export const WELCOME_MESSAGES = [
  {
    tag: 'SYSTEM INITIALIZATION // CADET REGISTRATION',
    main: 'Welcome to SPACEVERSE, Explorer!',
    sub: 'Your credentials have been authenticated for entrance into the GALAXY-X Research Facility.',
  },
  {
    tag: 'SELECTION CONFIRMED // MISSION DIRECTIVE',
    main: "You've been selected to join GALAXY-X.",
    sub: 'An elite scientific organization dedicated to discovering the deepest mysteries of the universe.',
  },
  {
    tag: 'AEROSPACE CURRICULUM // FLIGHT CANDIDATE',
    main: 'Your journey into space mission engineering begins here.',
    sub: 'You will master ground telemetry, spacecraft bus systems, scientific payloads, and launch operations.',
  },
  {
    tag: 'COMMISSIONING CLEARANCE // FINAL STEP',
    main: 'Ready to build your legacy among the stars?',
    sub: 'Accept your recruitment commission, claim your starting grant credits, and take your first step into the facility.',
  },
];

export const LOCATIONS: FacilityLocation[] = [
  {
    id: 'sce',
    code: 'SCE',
    name: 'NASA Space Center Entrance',
    desc: 'Where the player enters GALAXY-X and begins training.',
    badgeColor: '#4fe3d4',
    target: { x: -2, z: 12 },
    bounds: { x1: -16, x2: 12, z1: 6, z2: 20 },
    yaw: Math.PI,
  },
  {
    id: 'gsc',
    code: 'GSC',
    name: 'Ground Station',
    desc: 'Where spacecraft communications and telemetry are tracked.',
    badgeColor: '#38bdf8',
    target: { x: -40, z: 4 },
    bounds: { x1: -52, x2: -24, z1: 2, z2: 20 },
    yaw: Math.PI,
  },
  {
    id: 'mcc',
    code: 'MCC',
    name: 'Mission Control Center',
    desc: 'Where the player monitors and manages active space missions.',
    badgeColor: '#38bdf8',
    target: { x: -34, z: -18 },
    bounds: { x1: -52, x2: -20, z1: -36, z2: -8 },
    yaw: 0,
  },
  {
    id: 'srl',
    code: 'SRL',
    name: 'Scientific Research Laboratory',
    desc: 'Where scientific payload instruments are selected and tested.',
    badgeColor: '#34d399',
    target: { x: -8, z: -18 },
    bounds: { x1: -20, x2: 4, z1: -36, z2: -8 },
    yaw: 0,
  },
  {
    id: 'sah',
    code: 'SAH',
    name: 'Spacecraft Assembly Hangar',
    desc: 'Where the player designs, builds, and stages spacecraft.',
    badgeColor: '#fbbf24',
    target: { x: 22, z: -11.5 },
    bounds: { x1: 4, x2: 52, z1: -36, z2: -2 },
    yaw: Math.PI,
  },
  {
    id: 'mpr',
    code: 'MPR',
    name: 'Mission Planning Room',
    desc: 'Where mission planning and orbital trajectory review take place.',
    badgeColor: '#818cf8',
    target: { x: -24, z: 6 },
    bounds: { x1: -42, x2: -4, z1: -2, z2: 16 },
    yaw: Math.PI / 2,
  },
  {
    id: 'lcc',
    code: 'LCC',
    name: 'Launch Control Complex',
    desc: 'Where the player prepares, sequences, and launches rockets.',
    badgeColor: '#f87171',
    target: { x: 24, z: 10 },
    bounds: { x1: 6, x2: 46, z1: -2, z2: 18 },
    yaw: 0,
  },
];

export function getCurrentLocation(x: number, z: number): FacilityLocation {
  for (const loc of LOCATIONS) {
    const b = loc.bounds;
    if (x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2) return loc;
  }
  return {
    id: 'corridor',
    code: 'HALL',
    name: 'Central Concourse',
    desc: 'Inter-facility corridor connecting all research sectors.',
    badgeColor: '#94a3b8',
    target: { x: 0, z: -5 },
    bounds: { x1: -54, x2: 54, z1: -36, z2: 20 },
    yaw: 0,
  };
}

export const CRATES: SupplyCrate[] = [
  { k: 't', n: 'Thermometer', m: 3, c: 5, cred: 500, x: -14, subtitle: 'Cryo-Thermal Probe' },
  { k: 'b', n: 'Barometer', m: 4, c: 8, cred: 800, x: -9, subtitle: 'MEMS Pressure Manifold' },
  { k: 'c', n: 'Camera', m: 8, c: 15, cred: 1500, x: -4, subtitle: 'Multispectral Imager' },
  { k: 's', n: 'Spark-S', imp: 600, c: 20, cred: 2000, x: 8, mot: true, subtitle: 'Light Solid Stage' },
  { k: 'm', n: 'Ridge-M', imp: 1500, c: 45, cred: 4500, x: 14, mot: true, subtitle: 'Medium Booster Stage' },
  { k: 'x', n: 'Crest-X', imp: 2200, c: 65, cred: 6500, x: 20, mot: true, subtitle: 'High-Impulse Core' },
  { k: 'l', n: 'Titan-L', imp: 3000, c: 90, cred: 9000, x: 26, mot: true, subtitle: 'Heavy-Lift Cluster' },
];

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    lvl: 1,
    title: 'LEVEL 1 – SATELLITE & ROCKET ASSEMBLY',
    tag: 'SPACECRAFT ASSEMBLY HANGAR',
    sector: 'SAH Cleanroom & Pad 39X',
    orbit: 'Earth Observation Orbit',
    briefingStationId: 'sah',
    briefingStationName: 'Spacecraft Assembly Hangar (SAH)',
    stationRoute: [
      'SAH Briefing (Press E)',
      'Stage 1: Satellite Assembly',
      'Stage 2: Rocket Assembly',
      'Stage 3: Launchpad Positioning',
      'Stage 4: Payload Integration',
      'Stage 5: Rocket Launching',
    ],
    t: 'Orbit',
    b: 60,
    credB: 6000,
    req: ['t'],
    displayReq: [
      '9-Part Observation Satellite',
      '10-Part 2-Stage Launch Vehicle',
      'Launchpad Staging, Payload Fairing & Orbital Launch',
    ],
    goal: 'Report to the Spacecraft Assembly Hangar (SAH), build your 9-part satellite, assemble the 10-part launch vehicle, stage it on the launchpad, seal the satellite inside the payload fairing, and launch the rocket into space.',
    isLab: true,
    rewardText: '★ 1,000 Star Credits + Satellite Builder Badge',
    icon: '🛰️',
    difficulty: '5-Stage Engineering Lab',
  },
  {
    lvl: 2,
    title: 'Stratospheric Sky Imaging',
    tag: 'UPPER ATMOSPHERE FLIGHT',
    sector: 'Stratosphere (70 km)',
    orbit: 'Altitude: 70 km',
    briefingStationId: 'mcc',
    briefingStationName: 'Mission Control Center (MCC)',
    stationRoute: ['MCC Briefing (E)', 'SRL Lab', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 70,
    b: 80,
    credB: 8000,
    req: ['t', 'c'],
    displayReq: ['Thermometer (Temp)', 'Multispectral Camera'],
    goal: 'Photograph upper cloud layers and record stratospheric thermal inversion layers.',
    rewardText: '₡ 8,000 Grants + Flight Points',
    icon: '🌤️',
    difficulty: 'Standard Flight',
  },
  {
    lvl: 3,
    title: 'Full Atmospheric Survey',
    tag: 'MESOSPHERE SOUNDING',
    sector: 'Mesosphere (85 km)',
    orbit: 'Altitude: 85 km',
    briefingStationId: 'srl',
    briefingStationName: 'Scientific Research Lab (SRL)',
    stationRoute: ['SRL Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 85,
    b: 100,
    credB: 10000,
    req: ['t', 'b', 'c'],
    displayReq: ['Thermometer', 'Barometer (Pressure)', 'Camera'],
    goal: 'Conduct a synchronized triple-sensor survey of temperature, barometric pressure, and sky optical density.',
    rewardText: '₡ 10,000 Grants + Mission Architect Score',
    icon: '🌐',
    difficulty: 'Multi-Payload',
  },
  {
    lvl: 4,
    title: 'Mesosphere Upper Boundary',
    tag: 'EDGE OF SPACE TRANSITION',
    sector: 'Mesopause Threshold (100 km)',
    orbit: 'Altitude: 100 km',
    briefingStationId: 'mpr',
    briefingStationName: 'Mission Planning Room (MPR)',
    stationRoute: ['MPR Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 100,
    b: 110,
    credB: 11000,
    req: ['t', 'b'],
    displayReq: ['Thermometer', 'Barometer'],
    goal: 'Reach the mesopause altitude to map near-vacuum atmospheric dissipation before space entry.',
    rewardText: '₡ 11,000 Grants + High-Altitude Certification',
    icon: '⚡',
    difficulty: 'High Altitude',
  },
  {
    lvl: 5,
    title: 'Kármán Line Crossing',
    tag: 'OUTER SPACE COMMISSION',
    sector: 'Official Space (125 km)',
    orbit: 'Altitude: 125 km',
    briefingStationId: 'mcc',
    briefingStationName: 'Mission Control Center (MCC)',
    stationRoute: ['MCC Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 125,
    b: 125,
    credB: 12500,
    req: ['b', 'c'],
    displayReq: ['Barometer', 'Horizon Camera'],
    goal: 'Cross the internationally recognized threshold of space and capture Earth limb horizon curvature.',
    rewardText: '₡ 12,500 Grants + Astronautical Flight Honors',
    icon: '🚀',
    difficulty: 'Space Boundary',
  },
  {
    lvl: 6,
    title: 'Thermosphere Telemetry Probe',
    tag: 'IONIZED THERMOSPHERE',
    sector: 'Thermosphere (150 km)',
    orbit: 'Altitude: 150 km',
    briefingStationId: 'gsc',
    briefingStationName: 'Ground Station (GSC)',
    stationRoute: ['GSC Dish Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 150,
    b: 140,
    credB: 14000,
    req: ['t', 'b', 'c'],
    displayReq: ['Thermometer', 'Barometer', 'Camera'],
    goal: 'Deploy sounding sensor cluster to record extreme solar radiation and residual atmospheric drag.',
    rewardText: '₡ 14,000 Grants + Orbital Division Clearance',
    icon: '🛰️',
    difficulty: 'Advanced Sounding',
  },
  {
    lvl: 7,
    title: 'Ionospheric Sounding Array',
    tag: 'SPACE PLASMA PHYSICS',
    sector: 'Ionosphere F-Layer (180 km)',
    orbit: 'Altitude: 180 km',
    briefingStationId: 'srl',
    briefingStationName: 'Scientific Research Lab (SRL)',
    stationRoute: ['SRL Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 180,
    b: 165,
    credB: 16500,
    req: ['t', 'b'],
    displayReq: ['Thermometer', 'Barometer'],
    goal: 'Gather high-altitude plasma density fluctuations and ionospheric thermal gradient telemetry.',
    rewardText: '₡ 16,500 Grants + Senior Scientist Accolades',
    icon: '📡',
    difficulty: 'Space Physics',
  },
  {
    lvl: 8,
    title: 'Orbital Velocity Staging',
    tag: 'MULTI-STAGE LAUNCH TEST',
    sector: 'Low Earth Orbit (220 km)',
    orbit: 'Altitude: 220 km',
    briefingStationId: 'mpr',
    briefingStationName: 'Mission Planning Room (MPR)',
    stationRoute: ['MPR Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 220,
    b: 190,
    credB: 19000,
    req: ['t', 'c'],
    displayReq: ['Thermometer', 'Optical Payload'],
    goal: 'Execute vehicle mass optimization and engine staging to attain orbital apogee altitudes.',
    rewardText: '₡ 19,000 Grants + Master Propulsion Specialist',
    icon: '🔥',
    difficulty: 'Heavy Propulsion',
  },
  {
    lvl: 9,
    title: 'Deep Orbit Weather Observatory',
    tag: 'ORBITAL OBSERVATORY',
    sector: 'Deep LEO (260 km)',
    orbit: 'Altitude: 260 km',
    briefingStationId: 'gsc',
    briefingStationName: 'Ground Station (GSC)',
    stationRoute: ['GSC Dish Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 260,
    b: 220,
    credB: 22000,
    req: ['t', 'b', 'c'],
    displayReq: ['Thermometer', 'Barometer', 'Camera'],
    goal: 'Stage long-range planetary observation package with full telemetry relay to NASA ground station.',
    rewardText: '₡ 22,000 Grants + Orbital Command Commendation',
    icon: '🌌',
    difficulty: 'Orbital Observatory',
  },
  {
    lvl: 10,
    title: 'Lunar Trajectory Test Vehicle',
    tag: 'DEEP SPACE EXPLORATION',
    sector: 'Trans-Lunar Apogee (300 km)',
    orbit: 'Altitude: 300+ km',
    briefingStationId: 'mcc',
    briefingStationName: 'Mission Control Center (MCC)',
    stationRoute: ['MCC Final Briefing (E)', 'SRL Sensors', 'SAH Pad', 'LCC Launch', 'MCC Debrief'],
    t: 300,
    b: 250,
    credB: 25000,
    req: ['t', 'b', 'c'],
    displayReq: ['Thermometer', 'Barometer', 'Camera'],
    goal: 'Fire heavy propulsion stage to attain maximum apogee test trajectory toward cislunar space.',
    rewardText: '₡ 25,000 Grants + GALAXY-X Master Architect',
    icon: '🌕',
    difficulty: 'Maximum Challenge',
  },
];

export const SAT_COMPONENTS: SatComponentSpec[] = [
  {
    id: 'bus',
    sequenceStep: 1,
    name: 'Satellite Bus / Structural Frame',
    shortName: 'Bus Frame',
    icon: '🛸',
    targetId: 'target-bus',
    targetName: 'Central Chassis Core',
    anchorPos: { x: 0.0, y: -0.05, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.2,
    func: 'Provides the main structural chassis that houses internal avionics and supports every mounted subsystem.',
    massKg: 125,
    powerW: '0 W',
    telemetryTag: 'CORE STRUCTURE',
    correctNote:
      'Correct placement! The octagonal Satellite Bus & Structural Frame is locked to the assembly stand core, ready to support all subsystems.',
    wrongNotes: {
      solar: 'Incorrect position! The structural bus belongs at the central assembly stand core, not on an external wing yoke.',
      battery: 'Incorrect position! The main bus chassis is the central frame itself, not just the forward battery recess.',
      antenna: 'Incorrect position! The heavy spacecraft bus anchors at the center, not on top of the communications mast.',
      camera: 'Incorrect position! The structural core must seat directly onto the assembly adapter ring.',
      computer: 'Incorrect position! The main chassis spans the central core, while the avionics slot holds the computer.',
      adcs: 'Incorrect position! Mount the primary Satellite Bus at the central core ring.',
      thermal: 'Incorrect position! The structural bus belongs at the central chassis core before side radiators.',
      propulsion: 'Incorrect position! The aft bulkhead is reserved for thrusters; seat the main bus at the center.',
    },
  },
  {
    id: 'solar',
    sequenceStep: 4,
    name: 'Solar Panels',
    shortName: 'Solar Panels',
    icon: '🔆',
    targetId: 'target-solar',
    targetName: 'Lateral Solar Wing Yoke',
    anchorPos: { x: -1.68, y: 0.08, z: 0.0 },
    idealYaw: 0.3,
    idealPitch: 0.22,
    func: 'Converts sunlight into electrical energy to power the satellite throughout its orbit.',
    massKg: 42,
    powerW: '+1,450 W',
    telemetryTag: 'EPS SOLAR BUS',
    correctNote:
      'Correct placement! Solar panels are successfully installed on the lateral wing yokes to generate 1.45 kW of orbital power.',
    wrongNotes: {
      bus: 'Incorrect position! Solar wings must deploy outward from the lateral side yokes to catch sunlight cleanly.',
      battery: 'Incorrect position! Solar panels need external exposure to sunlight — they cannot operate inside the internal power bay.',
      antenna: 'Incorrect position! Placing solar wings on the zenith comms mast would block radio links and unbalance the spacecraft.',
      camera: 'Incorrect position! Solar panels cannot obstruct the Earth-facing nadir optical telescope aperture.',
      computer: 'Incorrect position! Solar wings mount on external lateral deployer yokes, not inside the shielded avionics bay.',
      adcs: 'Incorrect position! Solar wings require external articulation arms, not the internal reaction wheel bay.',
      thermal: 'Incorrect position! That flank bay houses thermal louvers; mount solar panels on the lateral wing yoke.',
      propulsion: 'Incorrect position! Thruster exhaust plumes would scorch solar cells. Mount them on the lateral wing yokes.',
    },
  },
  {
    id: 'battery',
    sequenceStep: 2,
    name: 'Battery',
    shortName: 'Battery Pack',
    icon: '🔋',
    targetId: 'target-battery',
    targetName: 'Internal Power Storage Bay',
    anchorPos: { x: 0.0, y: 0.34, z: 0.92 },
    idealYaw: 0.08,
    idealPitch: 0.16,
    func: 'Stores electrical energy so the satellite can continue operating when sunlight is unavailable.',
    massKg: 28,
    powerW: '840 Wh',
    telemetryTag: 'ECLIPSE RESERVE',
    correctNote:
      'Correct placement! The Li-ion battery pack is secured inside the internal power storage bay for orbital eclipse power.',
    wrongNotes: {
      bus: 'Incorrect position! Seat the battery specifically inside the forward internal power storage bay.',
      solar: 'Incorrect position! Batteries need thermal regulation inside the bus — mounting them on external wings exposes them to extreme cold.',
      antenna: 'Incorrect position! Heavy Li-ion packs belong near the center of mass, not suspended on the upper comms mast.',
      camera: 'Incorrect position! The nadir optical deck is reserved for the telescope aperture, not chemical battery cells.',
      computer: 'Incorrect position! That bay houses radiation-hardened flight processors — place the battery in the central power bay.',
      adcs: 'Incorrect position! The reaction wheel bay is calibrated for flywheels, not high-voltage battery packs.',
      thermal: 'Incorrect position! The side louver deck radiates waste heat; the battery fits inside the forward power bay.',
      propulsion: 'Incorrect position! Mounting batteries next to hydrazine thrusters risks thermal runaway.',
    },
  },
  {
    id: 'antenna',
    sequenceStep: 6,
    name: 'Communication Antenna',
    shortName: 'Comms Antenna',
    icon: '📡',
    targetId: 'target-antenna',
    targetName: 'Zenith Communication Mast',
    anchorPos: { x: 0.0, y: 1.48, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.32,
    func: 'Receives commands and sends telemetry and scientific information between the satellite and ground stations.',
    massKg: 18,
    powerW: '-85 W',
    telemetryTag: 'X-BAND LINK',
    correctNote:
      'Correct placement! The communication antenna is mounted on the zenith mast for clear ground station telemetry.',
    wrongNotes: {
      bus: 'Incorrect position! The antenna must be installed high on its designated zenith communication mounting point.',
      solar: 'Incorrect position! The antenna must be installed at its designated zenith communication mast, not on solar array rails.',
      battery: 'Incorrect position! RF signals cannot radiate efficiently from inside the internal power bay.',
      camera: 'Incorrect position! The nadir port aims downward at Earth imagery; the communication antenna mounts on top.',
      computer: 'Incorrect position! Placing high-power RF transmitters in the avionics bay causes electromagnetic interference.',
      adcs: 'Incorrect position! The parabolic dish needs unobstructed skyward clearance on the top zenith mast.',
      thermal: 'Incorrect position! Side thermal louvers block line-of-sight; place the dish on the zenith communication mast.',
      propulsion: 'Incorrect position! Rocket exhaust on the aft bulkhead would destroy the antenna feed horn.',
    },
  },
  {
    id: 'camera',
    sequenceStep: 5,
    name: 'Camera / Scientific Payload',
    shortName: 'Science Camera',
    icon: '📷',
    targetId: 'target-camera',
    targetName: 'Nadir Earth Observation Port',
    anchorPos: { x: 0.0, y: -1.32, z: 0.0 },
    idealYaw: 0.25,
    idealPitch: -0.25,
    func: 'Captures images of Earth and gathers scientific data for environmental and planetary observation.',
    massKg: 35,
    powerW: '-140 W',
    telemetryTag: 'OPTICAL PAYLOAD',
    correctNote:
      'Correct placement! The scientific camera is aligned along the downward Earth observation port.',
    wrongNotes: {
      bus: 'Incorrect position! Align the optical telescope cleanly on the bottom nadir observation port.',
      solar: 'Incorrect position! Precision optics require a rigid structural nadir mount, not flexible solar wings.',
      battery: 'Incorrect position! A camera lens cannot observe Earth from inside the enclosed battery bay.',
      antenna: 'Incorrect position! Mounting the telescope on the top mast aims it into deep space instead of toward Earth.',
      computer: 'Incorrect position! Optical trains require an unobstructed nadir baffle window, not an avionics enclosure.',
      adcs: 'Incorrect position! The camera must face directly downward along the nadir Earth-pointing axis.',
      thermal: 'Incorrect position! Side radiator plates do not point along the nadir Earth-imaging axis.',
      propulsion: 'Incorrect position! Thruster combustion residue would contaminate and blind the sapphire lens.',
    },
  },
  {
    id: 'propulsion',
    sequenceStep: 9,
    name: 'Propulsion System',
    shortName: 'Propulsion',
    icon: '🚀',
    targetId: 'target-propulsion',
    targetName: 'Aft Propulsion Bulkhead',
    anchorPos: { x: 0.0, y: 0.05, z: -0.98 },
    idealYaw: 2.75,
    idealPitch: 0.2,
    func: 'Generates controlled thrust to adjust the satellite orbit, perform maneuvers, and maintain altitude.',
    massKg: 46,
    powerW: '-40 W',
    telemetryTag: 'ΔV 420 m/s',
    correctNote:
      'Correct placement! The propulsion tanks and thruster nozzles are locked to the aft propulsion bulkhead.',
    wrongNotes: {
      bus: 'Incorrect position! Propulsion thrusters must exhaust cleanly off the rear aft bulkhead.',
      solar: 'Incorrect position! Firing thrusters on solar wings would shear off the panels and spin the satellite.',
      battery: 'Incorrect position! Rocket nozzles must exhaust into open space, not inside the battery compartment.',
      antenna: 'Incorrect position! Exhaust plumes on the zenith mast would melt the communication dish.',
      camera: 'Incorrect position! Firing thrusters across the optical telescope would destroy the lens.',
      computer: 'Incorrect position! High thruster heat must remain isolated on the aft bulkhead away from avionics.',
      adcs: 'Incorrect position! Main thrusters mount on the rear aft bulkhead aligned with the center of mass.',
      thermal: 'Incorrect position! Place propulsion nozzles on the aft bulkhead, not over the side thermal radiator.',
    },
  },
  {
    id: 'computer',
    sequenceStep: 3,
    name: 'On-board Computer',
    shortName: 'On-board CPU',
    icon: '💻',
    targetId: 'target-computer',
    targetName: 'Shielded Avionics Bay',
    anchorPos: { x: -0.72, y: 0.28, z: 0.68 },
    idealYaw: -0.52,
    idealPitch: 0.2,
    func: 'Executes flight software, processes sensor telemetry, and coordinates all onboard satellite operations.',
    massKg: 14,
    powerW: '-65 W',
    telemetryTag: 'FLIGHT OBC',
    correctNote:
      'Correct placement! The radiation-hardened on-board computer is seated inside the shielded avionics bay.',
    wrongNotes: {
      bus: 'Incorrect position! Route the flight processor into the dedicated shielded avionics bay.',
      solar: 'Incorrect position! Sensitive avionics silicon needs aluminum shielding, not external solar rails.',
      battery: 'Incorrect position! That compartment holds power storage cells, not flight processing boards.',
      antenna: 'Incorrect position! Exposing the flight computer on the top mast leaves it vulnerable to cosmic radiation.',
      camera: 'Incorrect position! The bottom nadir optical deck must remain clear for the Earth camera.',
      adcs: 'Incorrect position! High-RPM reaction wheel vibrations can fatigue solder joints — use the shielded avionics bay.',
      thermal: 'Incorrect position! Mount the OBC in the shielded avionics bay, not externally on the side radiator.',
      propulsion: 'Incorrect position! Thruster soak-back heat would exceed processor thermal limits.',
    },
  },
  {
    id: 'adcs',
    sequenceStep: 7,
    name: 'Attitude Control System',
    shortName: 'ADCS System',
    icon: '🔄',
    targetId: 'target-adcs',
    targetName: 'ADCS Reaction Wheel Bay',
    anchorPos: { x: 0.72, y: -0.22, z: 0.68 },
    idealYaw: 0.58,
    idealPitch: 0.16,
    func: 'Uses reaction wheels and star trackers to orient and stabilize the satellite accurately in space.',
    massKg: 21,
    powerW: '-95 W',
    telemetryTag: '3-AXIS ADCS',
    correctNote:
      'Correct placement! 3-axis ADCS reaction wheels and star tracker are locked into the attitude control bay.',
    wrongNotes: {
      bus: 'Incorrect position! Install the reaction wheel assembly in the right-forward ADCS bay.',
      solar: 'Incorrect position! Spinning momentum wheels on flexible solar wings would induce severe oscillation.',
      battery: 'Incorrect position! The battery bay lacks rigid torque mounts needed for 3-axis flywheels.',
      antenna: 'Incorrect position! Placing high-speed gyroscopes on the comms mast would shear the gimbal.',
      camera: 'Incorrect position! The nadir optical port is exclusively for Earth-observation optics.',
      computer: 'Incorrect position! The avionics bay is for low-vibration electronics, not spinning momentum wheels.',
      thermal: 'Incorrect position! Reaction wheels mount internally near the center of mass, not on the exterior radiator.',
      propulsion: 'Incorrect position! Isolate precision ADCS flywheels from aft thruster vibrations and heat.',
    },
  },
  {
    id: 'thermal',
    sequenceStep: 8,
    name: 'Thermal Control System',
    shortName: 'Thermal Control',
    icon: '🌡️',
    targetId: 'target-thermal',
    targetName: 'Thermal Radiator Flank',
    anchorPos: { x: 1.02, y: -0.25, z: 0.15 },
    idealYaw: -1.35,
    idealPitch: 0.18,
    func: 'Regulates satellite temperatures with MLI blankets and radiator louvers against extreme solar heat and deep-space cold.',
    massKg: 16,
    powerW: '-25 W',
    telemetryTag: 'TCS LOUVERS',
    correctNote:
      'Correct placement! Thermal radiator louvers and heat pipes are mounted to reject excess avionics heat safely into space.',
    wrongNotes: {
      bus: 'Incorrect position! Radiator louvers must face clear open space along the side thermal flank.',
      solar: 'Incorrect position! Thermal radiators require a fixed shadowed flank, not rotating solar array rails.',
      battery: 'Incorrect position! Radiators need external deep-space exposure to reject heat, not inside the closed battery bay.',
      antenna: 'Incorrect position! Do not mount heat-pipe louvers on top of the zenith communication mast.',
      camera: 'Incorrect position! Thermal louvers must never obstruct the downward nadir optical lens.',
      computer: 'Incorrect position! Mount the external radiator panel on the side thermal flank to vent avionics heat.',
      adcs: 'Incorrect position! That bay holds reaction wheels; thermal control louvers mount on the side radiator flank.',
      propulsion: 'Incorrect position! Placing delicate radiator louvers directly behind thrusters risks exhaust damage.',
    },
  },
];

// Simplified educational Falcon 9-inspired two-stage orbital launch vehicle configuration
export const ROCKET_COMPONENTS: RocketComponentSpec[] = [
  {
    id: 'first_stage_structure',
    sequenceStep: 1,
    name: 'First-Stage Booster Structure',
    shortName: 'Booster Hull',
    targetName: 'Lower Booster Core',
    anchorPos: { x: 0.0, y: -1.45, z: 0.42 },
    idealYaw: 0.3,
    idealPitch: 0.06,
    func: 'Primary cylindrical aluminum-lithium airframe that transfers launch thrust loads from the engines through the first stage.',
    massKg: 14800,
    telemetryTag: 'STAGE 1 HULL',
    correctNote:
      'Correct placement! The First-Stage Booster Structure is locked onto the strongback assembly spine.',
    wrongNotes: {
      first_stage_tanks: 'Incorrect position! Mount the outer booster airframe shell around the lower stage core, not just the internal tank bay.',
      first_stage_engines: 'Incorrect position! The booster structure sits above the aft thrust mount, while engine bells attach at the bottom.',
      interstage: 'Incorrect position! The lower booster hull spans the main lower section beneath the carbon interstage collar.',
      second_stage_body: 'Incorrect position! The massive first-stage hull belongs on the lower section, not the smaller upper stage.',
      payload_fairing: 'Incorrect position! The heavy booster airframe supports the base of the rocket, not the nose cone.',
    },
  },
  {
    id: 'first_stage_tanks',
    sequenceStep: 2,
    name: 'First-Stage Propellant Tanks',
    shortName: 'Stage 1 Tanks',
    targetName: 'Lower Cryo Tank Bay',
    anchorPos: { x: 0.0, y: -2.05, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.05,
    func: 'Stores supercooled liquid oxygen and rocket-grade kerosene fuel for the nine first-stage main engines.',
    massKg: 6400,
    telemetryTag: 'LOX / RP-1 BAY',
    correctNote:
      'Correct placement! Dual first-stage LOX and kerosene propellant tanks are secured inside the booster bay.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! Internal propellant tanks mount inside the lower booster bay above the engine manifold.',
      second_stage_body: 'Incorrect position! First-stage propellant tanks belong in the lower booster section, not in the upper second stage.',
      payload_fairing: 'Incorrect position! The nose cone houses spacecraft payload, never main booster fuel tanks.',
    },
  },
  {
    id: 'first_stage_engines',
    sequenceStep: 3,
    name: 'First-Stage Engine Cluster',
    shortName: '9-Engine Cluster',
    targetName: 'Aft Octaweb Mount',
    anchorPos: { x: 0.0, y: -3.28, z: 0.0 },
    idealYaw: 0.3,
    idealPitch: 0.14,
    func: 'Nine sea-level rocket engine bells arranged in an octagonal cluster to lift the launch vehicle off the pad.',
    massKg: 4200,
    telemetryTag: '9x LIFTOFF THRUST',
    correctNote:
      'Correct placement! The 9-engine cluster and Octaweb heat shield are bolted cleanly to the base of the first stage.',
    wrongNotes: {
      interstage: 'Incorrect position! Liftoff engines must exhaust downward from the very bottom of the first stage.',
      second_stage_engine: 'Incorrect position! The upper interstage houses the single vacuum nozzle; the 9-engine cluster bolts to the bottom aft bulkhead.',
      payload_fairing: 'Incorrect position! Mounting engines at the nose cone would fire downward into the rocket body.',
    },
  },
  {
    id: 'interstage',
    sequenceStep: 4,
    name: 'Interstage',
    shortName: 'Interstage',
    targetName: 'Stage 1–2 Junction',
    anchorPos: { x: 0.0, y: 0.56, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: 0.04,
    func: 'Hollow carbon-composite cylinder connecting the first and second stages and shielding the upper-stage engine until separation.',
    massKg: 1100,
    telemetryTag: 'STAGE SEP RING',
    correctNote:
      'Correct placement! The carbon-composite Interstage bridges the first and second stages with pneumatic pushers.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! The interstage joins the top of Stage 1 to Stage 2 in the middle of the rocket.',
      second_stage_body: 'Incorrect position! Place the black interstage collar at the junction just below the second stage.',
      payload_fairing: 'Incorrect position! The interstage belongs between stages in the middle, not on top as a nose fairing.',
    },
  },
  {
    id: 'second_stage_engine',
    sequenceStep: 5,
    name: 'Second-Stage Vacuum Engine',
    shortName: 'Vacuum Engine',
    targetName: 'Interstage Vacuum Bay',
    anchorPos: { x: 0.0, y: 0.68, z: 0.44 },
    idealYaw: 0.1,
    idealPitch: 0.05,
    func: 'Single wide-bell engine optimized for near-vacuum flight to push the satellite all the way into target orbit.',
    massKg: 750,
    telemetryTag: 'VACUUM NOZZLE',
    correctNote:
      'Correct placement! The Second-Stage Vacuum Engine is suspended inside the interstage cavity ready for stage separation.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! The wide vacuum bell nozzle operates on the second stage above the interstage, not on the sea-level aft pad mount.',
      avionics: 'Incorrect position! The vacuum engine bell mounts under the second-stage tank bulkhead, not in the forward avionics ring.',
      payload_fairing: 'Incorrect position! Exhaust nozzles never mount inside the satellite payload fairing.',
    },
  },
  {
    id: 'second_stage_body',
    sequenceStep: 6,
    name: 'Second-Stage Structure & Propellant Tanks',
    shortName: 'Stage 2 Body',
    targetName: 'Upper Stage Section',
    anchorPos: { x: 0.0, y: 1.56, z: 0.0 },
    idealYaw: 0.3,
    idealPitch: 0.02,
    func: 'Upper rocket stage airframe and pressurized propellant tanks that carry the payload after first-stage separation.',
    massKg: 4100,
    telemetryTag: 'STAGE 2 TANKS',
    correctNote:
      'Correct placement! The Second-Stage Structure and Propellant Tanks are stacked directly onto the interstage collar.',
    wrongNotes: {
      first_stage_structure: 'Incorrect position! The upper second-stage section stacks above the middle interstage, not down on the lower booster.',
      first_stage_tanks: 'Incorrect position! That lower bay holds first-stage booster tanks; mount the second stage above the interstage.',
      payload_fairing: 'Incorrect position! The second-stage propellant section sits directly below the fairing, not at the pointed tip.',
    },
  },
  {
    id: 'avionics',
    sequenceStep: 7,
    name: 'Flight Computer / Avionics',
    shortName: 'Flight Avionics',
    targetName: 'Upper Guidance Ring',
    anchorPos: { x: 0.0, y: 2.26, z: 0.38 },
    idealYaw: 0.12,
    idealPitch: -0.05,
    func: 'Triple-redundant guidance computer, inertial navigation unit, and flight telemetry controller guiding ascent.',
    massKg: 140,
    telemetryTag: 'GNC AVIONICS',
    correctNote:
      'Correct placement! Flight Computer and inertial guidance avionics are integrated into the upper guidance collar.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! Sensitive guidance computers must be mounted in the upper avionics ring away from engine exhaust heat.',
      landing_legs: 'Incorrect position! Avionics mount cleanly inside the upper guidance collar near the payload adapter.',
    },
  },
  {
    id: 'grid_fins',
    sequenceStep: 8,
    name: 'Grid Fins',
    shortName: 'Grid Fins',
    targetName: 'Upper Booster Collar',
    anchorPos: { x: -0.58, y: 0.12, z: 0.0 },
    idealYaw: 0.45,
    idealPitch: 0.08,
    func: 'Deployable titanium lattice aerodynamic fins mounted near the top of the first stage to steer the booster during atmospheric reentry.',
    massKg: 320,
    telemetryTag: 'REENTRY STEERING',
    correctNote:
      'Correct placement! Four titanium Grid Fins are hinged around the upper collar of the first-stage booster.',
    wrongNotes: {
      landing_legs: 'Incorrect position! Grid fins belong near the TOP of the first stage for aerodynamic steering, while landing legs mount at the bottom.',
      payload_fairing: 'Incorrect position! Grid fins steer the returning booster stage, not the orbital nose fairing.',
    },
  },
  {
    id: 'landing_legs',
    sequenceStep: 9,
    name: 'Landing Legs',
    shortName: 'Landing Legs',
    targetName: 'Lower Booster Flanks',
    anchorPos: { x: 0.58, y: -2.45, z: 0.0 },
    idealYaw: -0.4,
    idealPitch: 0.12,
    func: 'Four folded carbon-fiber telescopic legs around the base of the first stage that deploy right before vertical booster touchdown.',
    massKg: 1850,
    telemetryTag: 'RECOVERY GEAR',
    correctNote:
      'Correct placement! Four stowed Landing Legs are locked along the lower flanks of the first-stage booster.',
    wrongNotes: {
      grid_fins: 'Incorrect position! Landing legs must mount at the BOTTOM flanks of the booster to support touchdown, not at the upper collar.',
      second_stage_body: 'Incorrect position! Only the reusable first-stage booster carries landing legs; the second stage stays in space.',
    },
  },
  {
    id: 'payload_fairing',
    sequenceStep: 10,
    name: 'Payload Fairing / Nose Cone',
    shortName: 'Nose Fairing',
    targetName: 'Top Nose Fairing Mount',
    anchorPos: { x: 0.0, y: 3.15, z: 0.0 },
    idealYaw: 0.35,
    idealPitch: -0.08,
    func: 'Aerodynamic split clamshell nose cone that shields the satellite from air drag, acoustic vibration, and atmospheric heating during liftoff.',
    massKg: 1900,
    telemetryTag: 'CLAMSHELL FAIRING',
    correctNote:
      'Correct placement! The split clamshell Payload Fairing / Nose Cone caps the second stage, ready for satellite payload integration.',
    wrongNotes: {
      first_stage_engines: 'Incorrect position! The aerodynamic nose cone caps the very top of the rocket, not the bottom aft engines.',
      interstage: 'Incorrect position! Place the clamshell nose fairing at the very top above the second stage and avionics ring.',
    },
  },
];

