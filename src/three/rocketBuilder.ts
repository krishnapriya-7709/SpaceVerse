import * as THREE from 'three';
import { ROCKET_COMPONENTS, RocketPartId } from '../data/spaceverseData';
import { DropSlotHandle } from './satelliteBuilder';

export interface RocketAssemblyRig {
  root: THREE.Group;
  baseBottomY: number;
  payloadMountY: number;
  skeletonGuide: THREE.Group;
  parts: Record<RocketPartId, THREE.Group>;
  dropSlots: Record<RocketPartId, DropSlotHandle>;
  fairingHalves: {
    left: THREE.Group;
    right: THREE.Group;
  };
  payloadAdapterRing: THREE.Mesh;
  avionicsLeds: THREE.Mesh[];
  setFairingOpen: (openRatio: number) => void;
  setExhaustIntensity: (thrustRatio: number, timeSec: number) => void;
  dispose: () => void;
}

/**
 * Builds a detailed, simplified educational Falcon 9-inspired 2-stage launch vehicle.
 * Coordinates span approx. y = -3.65 (aft engine nozzles) to y = +4.12 (nose fairing tip).
 */
export function buildDetailedRocketRig(): RocketAssemblyRig {
  const root = new THREE.Group();

  const whiteHullMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.3,
    metalness: 0.18,
  });
  const satinWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.36,
    metalness: 0.15,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.48,
    metalness: 0.35,
  });
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.28,
    metalness: 0.88,
  });
  const cryoAlMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.2,
    metalness: 0.9,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.24,
    metalness: 0.9,
  });
  const engineDarkMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.26,
    metalness: 0.92,
    side: THREE.DoubleSide,
  });
  const cyanTrimMat = new THREE.MeshBasicMaterial({ color: 0x4fe3d4 });

  // =====================================================
  // STRUCTURAL ASSEMBLY GUIDE / STRONGBACK SPINE
  // =====================================================
  const skeletonGuide = new THREE.Group();
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.72,
  });
  const coreSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.45, 16), spineMat);
  coreSpine.position.y = 0.0;
  skeletonGuide.add(coreSpine);

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.22,
  });
  const guideStage1 = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 3.45, 16), wireMat);
  guideStage1.position.y = -1.32;
  skeletonGuide.add(guideStage1);

  const guideInterstage = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.86, 16), wireMat);
  guideInterstage.position.y = 0.65;
  skeletonGuide.add(guideInterstage);

  const guideStage2 = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 1.24, 16), wireMat);
  guideStage2.position.y = 1.68;
  skeletonGuide.add(guideStage2);

  const guideFairing = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.7, 16), wireMat);
  guideFairing.position.y = 3.22;
  skeletonGuide.add(guideFairing);

  root.add(skeletonGuide);

  // =====================================================
  // ALL 10 MODULAR ROCKET SUBSYSTEMS
  // =====================================================
  const parts = {} as Record<RocketPartId, THREE.Group>;
  const avionicsLeds: THREE.Mesh[] = [];

  // 1. FIRST-STAGE BOOSTER STRUCTURE
  const s1HullGroup = new THREE.Group();
  // Two half-arcs on sides/back + front structural longerons so internal tanks stay visible during Stage 2 assembly
  const hullCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 3.4, 28, 1, false),
    whiteHullMat
  );
  hullCylinder.position.y = -1.32;
  s1HullGroup.add(hullCylinder);

  // Vertical systems raceway & GALAXY-X stripe
  const raceway1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.36, 0.08), titaniumMat);
  raceway1.position.set(0, -1.32, -0.47);
  s1HullGroup.add(raceway1);

  const accentBand1 = new THREE.Mesh(new THREE.CylinderGeometry(0.486, 0.486, 0.16, 28), carbonMat);
  accentBand1.position.y = -0.15;
  s1HullGroup.add(accentBand1);

  const accentBand2 = new THREE.Mesh(new THREE.CylinderGeometry(0.486, 0.486, 0.12, 28), cyanTrimMat);
  accentBand2.position.y = -0.32;
  s1HullGroup.add(accentBand2);

  const aftSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.52, 0.24, 28), carbonMat);
  aftSkirt.position.y = -2.94;
  s1HullGroup.add(aftSkirt);

  s1HullGroup.visible = false;
  parts.first_stage_structure = s1HullGroup;
  root.add(s1HullGroup);

  // 2. FIRST-STAGE PROPELLANT TANKS (LOX + RP-1 Pressure Vessels + External Feed Pipe)
  const s1TanksGroup = new THREE.Group();
  const loxTank = new THREE.Mesh(new THREE.CapsuleGeometry(0.39, 0.85, 10, 22), cryoAlMat);
  loxTank.position.y = -0.95;
  s1TanksGroup.add(loxTank);

  const rp1Tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.39, 0.95, 10, 22), titaniumMat);
  rp1Tank.position.y = -2.18;
  s1TanksGroup.add(rp1Tank);

  // Visible external cryogenic LOX transfer downcomer + pressure rings
  const pipeCurve = new THREE.LineCurve3(new THREE.Vector3(0, -0.55, 0.49), new THREE.Vector3(0, -2.85, 0.49));
  const downcomer = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 8, 0.042, 10, false), cryoAlMat);
  s1TanksGroup.add(downcomer);

  [-0.78, -1.55, -2.35].forEach((ry) => {
    const tankRing = new THREE.Mesh(new THREE.TorusGeometry(0.495, 0.022, 8, 28), copperMat);
    tankRing.rotation.x = Math.PI / 2;
    tankRing.position.y = ry;
    s1TanksGroup.add(tankRing);
  });

  s1TanksGroup.visible = false;
  parts.first_stage_tanks = s1TanksGroup;
  root.add(s1TanksGroup);

  // 3. FIRST-STAGE ENGINE CLUSTER (Octaweb + 9 Sea-Level Bells)
  const s1EnginesGroup = new THREE.Group();
  const octaweb = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.47, 0.28, 16), carbonMat);
  octaweb.position.y = -3.14;
  s1EnginesGroup.add(octaweb);

  const seaPts = [
    new THREE.Vector2(0.032, 0),
    new THREE.Vector2(0.055, 0.11),
    new THREE.Vector2(0.095, 0.26),
    new THREE.Vector2(0.115, 0.36),
  ];
  const seaBellGeo = new THREE.LatheGeometry(seaPts, 18);

  const addSeaEngine = (ex: number, ez: number) => {
    const bell = new THREE.Mesh(seaBellGeo, engineDarkMat);
    bell.rotation.x = Math.PI;
    bell.position.set(ex, -3.26, ez);
    s1EnginesGroup.add(bell);
  };
  addSeaEngine(0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addSeaEngine(Math.cos(a) * 0.31, Math.sin(a) * 0.31);
  }

  s1EnginesGroup.visible = false;
  parts.first_stage_engines = s1EnginesGroup;
  root.add(s1EnginesGroup);

  // 4. INTERSTAGE (Carbon-Composite Junction Collar)
  const interstageGroup = new THREE.Group();
  const interCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.495, 0.495, 0.86, 28, 1, true),
    carbonMat
  );
  interCylinder.position.y = 0.65;
  interstageGroup.add(interCylinder);

  const interTopFlange = new THREE.Mesh(new THREE.TorusGeometry(0.495, 0.03, 10, 28), titaniumMat);
  interTopFlange.rotation.x = Math.PI / 2;
  interTopFlange.position.y = 1.07;
  interstageGroup.add(interTopFlange);

  const interBotFlange = new THREE.Mesh(new THREE.TorusGeometry(0.495, 0.03, 10, 28), titaniumMat);
  interBotFlange.rotation.x = Math.PI / 2;
  interBotFlange.position.y = 0.23;
  interstageGroup.add(interBotFlange);

  // Subtle translucent front cutaway frame on interstage so Vacuum Engine stays visible if installed after
  const sepClampBar = new THREE.Mesh(new THREE.TorusGeometry(0.502, 0.015, 8, 28), cyanTrimMat);
  sepClampBar.rotation.x = Math.PI / 2;
  sepClampBar.position.y = 0.65;
  interstageGroup.add(sepClampBar);

  interstageGroup.visible = false;
  parts.interstage = interstageGroup;
  root.add(interstageGroup);

  // 5. SECOND-STAGE VACUUM ENGINE (Large Niobium Vacuum Bell)
  const s2EngineGroup = new THREE.Group();
  const vacMount = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.16, 16), titaniumMat);
  vacMount.position.y = 1.02;
  s2EngineGroup.add(vacMount);

  const vacPts = [
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.14, 0.18),
    new THREE.Vector2(0.28, 0.44),
    new THREE.Vector2(0.36, 0.64),
  ];
  const vacBell = new THREE.Mesh(new THREE.LatheGeometry(vacPts, 28), engineDarkMat);
  vacBell.rotation.x = Math.PI;
  vacBell.position.y = 0.98;
  s2EngineGroup.add(vacBell);

  const vacRim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.02, 10, 28), copperMat);
  vacRim.rotation.x = Math.PI / 2;
  vacRim.position.y = 0.34;
  s2EngineGroup.add(vacRim);

  // Turbopump manifold visible on forward side
  const turboPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 12), copperMat);
  turboPipe.position.set(0.18, 0.72, 0.24);
  turboPipe.rotation.z = 0.32;
  s2EngineGroup.add(turboPipe);

  s2EngineGroup.visible = false;
  parts.second_stage_engine = s2EngineGroup;
  root.add(s2EngineGroup);

  // 6. SECOND-STAGE STRUCTURE AND PROPELLANT TANKS
  const s2BodyGroup = new THREE.Group();
  const s2Cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.485, 0.485, 1.18, 28), satinWhiteMat);
  s2Cylinder.position.y = 1.66;
  s2BodyGroup.add(s2Cylinder);

  const s2UpperCap = new THREE.Mesh(new THREE.CylinderGeometry(0.495, 0.485, 0.14, 28), titaniumMat);
  s2UpperCap.position.y = 2.26;
  s2BodyGroup.add(s2UpperCap);

  const s2LowerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.485, 0.495, 0.12, 28), carbonMat);
  s2LowerCollar.position.y = 1.1;
  s2BodyGroup.add(s2LowerCollar);

  const s2Raceway = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.12, 0.07), titaniumMat);
  s2Raceway.position.set(0, 1.66, -0.47);
  s2BodyGroup.add(s2Raceway);

  s2BodyGroup.visible = false;
  parts.second_stage_body = s2BodyGroup;
  root.add(s2BodyGroup);

  // 7. FLIGHT COMPUTER / AVIONICS (Guidance Ring & Telemetry Pods)
  const avionicsGroup = new THREE.Group();
  const avRing = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.24, 28), carbonMat);
  avRing.position.y = 2.34;
  avionicsGroup.add(avRing);

  const avGoldBand = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.02, 10, 28), copperMat);
  avGoldBand.rotation.x = Math.PI / 2;
  avGoldBand.position.y = 2.34;
  avionicsGroup.add(avGoldBand);

  const avBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.14), cryoAlMat);
  avBox.position.set(0, 2.34, 0.48);
  avionicsGroup.add(avBox);

  [0x38bdf8, 0x34d399, 0x4fe3d4].forEach((col, i) => {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
    led.position.set(-0.08 + i * 0.08, 2.34, 0.555);
    avionicsLeds.push(led);
    avionicsGroup.add(led);
  });

  avionicsGroup.visible = false;
  parts.avionics = avionicsGroup;
  root.add(avionicsGroup);

  // 8. GRID FINS (4 Hypersonic Titanium Waffle Fins around Upper Booster Collar)
  const gridFinsGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const finHolder = new THREE.Group();
    finHolder.rotation.y = (i / 4) * Math.PI * 2;
    finHolder.position.y = 0.08;

    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), carbonMat);
    hinge.position.set(0.52, 0, 0);
    finHolder.add(hinge);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.34), titaniumMat);
    frame.position.set(0.76, 0, 0);
    finHolder.add(frame);

    // Waffle lattice ribs
    for (let r = -1; r <= 1; r++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.025), cryoAlMat);
      bar.position.set(0.76, 0, r * 0.1);
      finHolder.add(bar);
    }
    gridFinsGroup.add(finHolder);
  }
  gridFinsGroup.visible = false;
  parts.grid_fins = gridFinsGroup;
  root.add(gridFinsGroup);

  // 9. LANDING LEGS (4 Folded Carbon-Fiber A-Frame Booster Legs)
  const legsGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const legHolder = new THREE.Group();
    legHolder.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;

    const legFairing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.38, 0.09), carbonMat);
    legFairing.position.set(0.53, -2.32, 0);
    legFairing.rotation.z = 0.06;
    legHolder.add(legFairing);

    const legFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.14), titaniumMat);
    legFoot.position.set(0.56, -2.98, 0);
    legHolder.add(legFoot);

    const legRib = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.25, 0.11), titaniumMat);
    legRib.position.set(0.54, -2.32, 0);
    legRib.rotation.z = 0.06;
    legHolder.add(legRib);

    legsGroup.add(legHolder);
  }
  legsGroup.visible = false;
  parts.landing_legs = legsGroup;
  root.add(legsGroup);

  // 10. PAYLOAD FAIRING / NOSE CONE (Split Clamshell Halves + Internal Payload Adapter)
  const fairingGroup = new THREE.Group();

  // Internal Payload Adapter Cone & Glowing Ring (exposed when fairing opens in Stage 4!)
  const adapterBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.24, 24), titaniumMat);
  adapterBase.position.y = 2.54;
  fairingGroup.add(adapterBase);

  const payloadAdapterRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.032, 12, 32),
    new THREE.MeshBasicMaterial({ color: 0x4fe3d4 })
  );
  payloadAdapterRing.rotation.x = Math.PI / 2;
  payloadAdapterRing.position.y = 2.67;
  fairingGroup.add(payloadAdapterRing);

  // Aerodynamic Ogive Fairing Profile (Lathe halves so left & right open cleanly!)
  const ogivePts: THREE.Vector2[] = [
    new THREE.Vector2(0.49, 0.0),
    new THREE.Vector2(0.58, 0.18),
    new THREE.Vector2(0.58, 0.92),
    new THREE.Vector2(0.51, 1.22),
    new THREE.Vector2(0.35, 1.48),
    new THREE.Vector2(0.16, 1.66),
    new THREE.Vector2(0.01, 1.74),
  ];

  const fairingLeft = new THREE.Group();
  fairingLeft.position.set(0, 2.45, 0);
  const leftShellGeo = new THREE.LatheGeometry(ogivePts, 24, Math.PI / 2, Math.PI);
  const leftShell = new THREE.Mesh(leftShellGeo, whiteHullMat);
  const leftInnerGeo = new THREE.LatheGeometry(
    ogivePts.map((p) => new THREE.Vector2(Math.max(0.01, p.x - 0.03), p.y)),
    20,
    Math.PI / 2,
    Math.PI
  );
  const leftInner = new THREE.Mesh(
    leftInnerGeo,
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.3, side: THREE.BackSide })
  );
  fairingLeft.add(leftShell, leftInner);
  fairingGroup.add(fairingLeft);

  const fairingRight = new THREE.Group();
  fairingRight.position.set(0, 2.45, 0);
  const rightShellGeo = new THREE.LatheGeometry(ogivePts, 24, -Math.PI / 2, Math.PI);
  const rightShell = new THREE.Mesh(rightShellGeo, whiteHullMat);
  const rightInnerGeo = new THREE.LatheGeometry(
    ogivePts.map((p) => new THREE.Vector2(Math.max(0.01, p.x - 0.03), p.y)),
    20,
    -Math.PI / 2,
    Math.PI
  );
  const rightInner = new THREE.Mesh(
    rightInnerGeo,
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.3, side: THREE.BackSide })
  );
  fairingRight.add(rightShell, rightInner);
  fairingGroup.add(fairingRight);

  fairingGroup.visible = false;
  parts.payload_fairing = fairingGroup;
  root.add(fairingGroup);

  const setFairingOpen = (openRatio: number) => {
    const t = Math.max(0, Math.min(1, openRatio));
    fairingLeft.position.x = -t * 0.64;
    fairingLeft.rotation.z = t * 0.44;
    fairingRight.position.x = t * 0.64;
    fairingRight.rotation.z = -t * 0.44;
  };

  // =====================================================
  // ENGINE IGNITION & ASCENT EXHAUST PLUME CLUSTER
  // =====================================================
  const exhaustGroup = new THREE.Group();
  exhaustGroup.position.set(0, -3.56, 0);
  exhaustGroup.visible = false;

  const coreFlameMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreFlame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.2, 20), coreFlameMat);
  coreFlame.rotation.x = Math.PI;
  coreFlame.position.y = -1.05;
  exhaustGroup.add(coreFlame);

  const midFlameMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const midFlame = new THREE.Mesh(new THREE.ConeGeometry(0.54, 4.1, 20), midFlameMat);
  midFlame.rotation.x = Math.PI;
  midFlame.position.y = -1.95;
  exhaustGroup.add(midFlame);

  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.82, 6.2, 20), outerFlameMat);
  outerFlame.rotation.x = Math.PI;
  outerFlame.position.y = -2.95;
  exhaustGroup.add(outerFlame);

  const nozzleGlowMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const nozzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), nozzleGlowMat);
  nozzleGlow.position.y = -0.15;
  nozzleGlow.scale.set(1.15, 0.72, 1.15);
  exhaustGroup.add(nozzleGlow);

  root.add(exhaustGroup);

  const setExhaustIntensity = (thrustRatio: number, timeSec: number) => {
    const clamped = Math.max(0, Math.min(1.4, thrustRatio));
    if (clamped <= 0.01) {
      exhaustGroup.visible = false;
      return;
    }
    exhaustGroup.visible = true;
    const flickerA = 0.9 + Math.sin(timeSec * 48) * 0.08 + Math.cos(timeSec * 73) * 0.05;
    const flickerB = 0.92 + Math.cos(timeSec * 57) * 0.09;
    exhaustGroup.scale.set(
      (0.75 + clamped * 0.35) * flickerB,
      (0.42 + clamped * 0.95) * flickerA,
      (0.75 + clamped * 0.35) * flickerB
    );
    coreFlameMat.opacity = Math.min(1, clamped * 0.95);
    midFlameMat.opacity = Math.min(0.92, clamped * 0.78);
    outerFlameMat.opacity = Math.min(0.68, clamped * 0.55);
    nozzleGlowMat.opacity = Math.min(0.95, clamped * 0.85);
  };

  // =====================================================
  // INTERACTIVE 3D DROP SLOTS (1..10)
  // =====================================================
  const dropSlots = {} as Record<RocketPartId, DropSlotHandle>;
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

  ROCKET_COMPONENTS.forEach((comp) => {
    const slotRingMat = new THREE.MeshBasicMaterial({
      color: 0x4fe3d4,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.31, 28), slotRingMat);
    ring.position.set(comp.anchorPos.x, comp.anchorPos.y, comp.anchorPos.z + (comp.anchorPos.z === 0 ? 0.52 : 0.14));
    ring.lookAt(comp.anchorPos.x * 2, comp.anchorPos.y, 4);
    root.add(ring);

    const hitRadius =
      comp.id === 'first_stage_structure' || comp.id === 'first_stage_tanks'
        ? 0.68
        : comp.id === 'payload_fairing'
        ? 0.72
        : 0.56;
    const hitbox = new THREE.Mesh(new THREE.SphereGeometry(hitRadius, 12, 12), hitboxMat);
    hitbox.position.set(comp.anchorPos.x, comp.anchorPos.y, comp.anchorPos.z);
    hitbox.userData.compId = comp.id;
    root.add(hitbox);

    const extraHitboxes: THREE.Mesh[] = [];
    if (comp.id === 'grid_fins') {
      const rightFinHit = new THREE.Mesh(new THREE.SphereGeometry(0.54, 10, 10), hitboxMat);
      rightFinHit.position.set(0.58, 0.12, 0);
      rightFinHit.userData.compId = 'grid_fins';
      root.add(rightFinHit);
      extraHitboxes.push(rightFinHit);
    }
    if (comp.id === 'landing_legs') {
      const leftLegHit = new THREE.Mesh(new THREE.SphereGeometry(0.58, 10, 10), hitboxMat);
      leftLegHit.position.set(-0.58, -2.45, 0);
      leftLegHit.userData.compId = 'landing_legs';
      root.add(leftLegHit);
      extraHitboxes.push(leftLegHit);
    }
    if (comp.id === 'first_stage_structure') {
      const lowerHullHit = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 10), hitboxMat);
      lowerHullHit.position.set(0, -0.72, 0.32);
      lowerHullHit.userData.compId = 'first_stage_structure';
      root.add(lowerHullHit);
      extraHitboxes.push(lowerHullHit);
    }

    const ghost = new THREE.Group();
    const gMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.46,
    });
    if (comp.id === 'first_stage_structure' || comp.id === 'first_stage_tanks') {
      const gCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 3.3, 14), gMat);
      gCyl.position.y = -1.32;
      ghost.add(gCyl);
    } else if (comp.id === 'first_stage_engines') {
      const gEng = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.44, 0.55, 14), gMat);
      gEng.position.y = -3.35;
      ghost.add(gEng);
    } else if (comp.id === 'interstage' || comp.id === 'second_stage_engine') {
      const gInt = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.85, 14), gMat);
      gInt.position.y = 0.65;
      ghost.add(gInt);
    } else if (comp.id === 'second_stage_body') {
      const gS2 = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 1.2, 14), gMat);
      gS2.position.y = 1.66;
      ghost.add(gS2);
    } else if (comp.id === 'avionics') {
      const gAv = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.28, 16), gMat);
      gAv.position.y = 2.34;
      ghost.add(gAv);
    } else if (comp.id === 'grid_fins') {
      [-0.75, 0.75].forEach((fx) => {
        const gf = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.36), gMat);
        gf.position.set(fx, 0.08, 0);
        ghost.add(gf);
      });
    } else if (comp.id === 'landing_legs') {
      [-0.55, 0.55].forEach((lx) => {
        const gl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.2), gMat);
        gl.position.set(lx, -2.35, 0);
        ghost.add(gl);
      });
    } else if (comp.id === 'payload_fairing') {
      const gCone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.72, 16), gMat);
      gCone.position.y = 3.3;
      ghost.add(gCone);
    }
    ghost.visible = false;
    root.add(ghost);

    dropSlots[comp.id] = { ring, hitbox, extraHitboxes, ghost };
  });

  const dispose = () => {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material?.dispose();
      }
    });
  };

  return {
    root,
    baseBottomY: -3.65,
    payloadMountY: 2.86,
    skeletonGuide,
    parts,
    dropSlots,
    fairingHalves: { left: fairingLeft, right: fairingRight },
    payloadAdapterRing,
    avionicsLeds,
    setFairingOpen,
    setExhaustIntensity,
    dispose,
  };
}

export interface LaunchpadEnvironmentHandle {
  group: THREE.Group;
  earthGroup: THREE.Group;
  rocketMountY: number;
  umbilicalArm: THREE.Group;
  setClampsReleased: (ratio: number) => void;
  setUmbilicalRetracted: (ratio: number) => void;
  setLaunchSmokeIntensity: (intensity: number) => void;
  update: (timeSec: number, dt: number) => void;
  dispose: () => void;
}

/**
 * Builds the outdoor SPACEVERSE Coastal Launchpad 39X environment:
 * - Launch pad concrete apron, steel flame deflector trench & hold-down clamps
 * - Tall lattice Launch Tower with elevator shaft, service levels, lightning spire & swing arm
 * - Ground Support Equipment (twin spherical cryo propellant tanks, transfer pipes, pad buildings)
 * - Sky dome horizon, stylized 3D clouds & animated rising pad cryogenic steam/smoke puffs
 */
export function buildLaunchpadEnvironment(): LaunchpadEnvironmentHandle {
  const group = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88, metalness: 0.1 });
  const padDeckMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.25 });
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1e2d3d, roughness: 0.94, metalness: 0.05 });
  const steelTowerMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45, metalness: 0.65 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
  const cryoTankMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.28, metalness: 0.35 });
  const accentAmberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.5 });

  // Vast coastal terrain horizon floor (extends far into atmospheric fog)
  const groundPlane = new THREE.Mesh(new THREE.CircleGeometry(140, 48), terrainMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.78;
  group.add(groundPlane);

  // Raised concrete launch complex apron & ramp
  const padBase = new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 14), concreteMat);
  padBase.position.set(0, -0.4, 0);
  group.add(padBase);

  const launchRingMount = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.8, 0.45, 24), padDeckMat);
  launchRingMount.position.set(0, 0.22, 0);
  group.add(launchRingMount);

  // 4 Articulated Steel Hold-Down Clamps around rocket base (hinged to open on liftoff)
  const clampPivots: { group: THREE.Group; angle: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 0.88, 0.36, Math.sin(a) * 0.88);
    pivot.rotation.y = -a;
    const clampJaw = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.48, 0.38), darkSteelMat);
    clampJaw.position.set(-0.1, 0.22, 0);
    pivot.add(clampJaw);
    group.add(pivot);
    clampPivots.push({ group: pivot, angle: a });
  }

  // Flame Deflector Trench channel
  const trenchPit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.25, 11.5), darkSteelMat);
  trenchPit.position.set(0, -0.05, 0);
  group.add(trenchPit);

  // TALL LAUNCH TOWER (Fixed Service Structure) on Left (-X)
  const towerGroup = new THREE.Group();
  towerGroup.position.set(-2.9, 0, -0.2);

  // 4 Vertical Corner Columns
  const towerH = 10.6;
  [
    [-0.65, -0.65],
    [0.65, -0.65],
    [-0.65, 0.65],
    [0.65, 0.65],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.16, towerH, 0.16), steelTowerMat);
    col.position.set(cx, towerH / 2, cz);
    towerGroup.add(col);
  });

  // Service Deck Levels + Cross Bracing
  for (let lvl = 1; lvl <= 6; lvl++) {
    const y = lvl * 1.6;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.5), darkSteelMat);
    deck.position.set(0, y, 0);
    towerGroup.add(deck);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.06, 1.54), accentAmberMat);
    rail.position.set(0, y + 0.22, 0);
    towerGroup.add(rail);
  }

  // Central Elevator Core + Lightning Spire
  const elevCore = new THREE.Mesh(new THREE.BoxGeometry(0.65, towerH - 0.6, 0.65), darkSteelMat);
  elevCore.position.set(0, (towerH - 0.6) / 2, 0);
  towerGroup.add(elevCore);

  const mastSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 2.2, 8), cryoTankMat);
  mastSpire.position.set(0, towerH + 1.1, 0);
  towerGroup.add(mastSpire);

  const beaconLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  beaconLight.position.set(0, towerH + 2.2, 0);
  towerGroup.add(beaconLight);

  // Articulated Umbilical / Crew & Cryo Swing Arm reaching toward Rocket Stage 2
  const umbilicalArm = new THREE.Group();
  umbilicalArm.position.set(0.68, 5.8, 0.2);
  const armBeam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 0.24), darkSteelMat);
  armBeam.position.set(0.88, 0, 0);
  umbilicalArm.add(armBeam);
  const armClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 12), accentAmberMat);
  armClamp.rotation.z = Math.PI / 2;
  armClamp.position.set(1.75, 0, 0);
  umbilicalArm.add(armClamp);
  towerGroup.add(umbilicalArm);

  group.add(towerGroup);

  // GROUND SUPPORT EQUIPMENT (Spherical Cryo Tanks, Piping & Space Centre Complex)
  [
    [6.2, -3.2],
    [8.6, -2.1],
  ].forEach(([tx, tz]) => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), cryoTankMat);
    sphere.position.set(tx, 0.65, tz);
    group.add(sphere);
    for (let s = 0; s < 3; s++) {
      const sa = (s / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.35, 8), darkSteelMat);
      leg.position.set(tx + Math.cos(sa) * 0.72, -0.05, tz + Math.sin(sa) * 0.72);
      group.add(leg);
    }
  });

  // Cryo Transfer Pipe from spheres to launch mount
  const supplyPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.2, 12), cryoTankMat);
  supplyPipe.rotation.z = Math.PI / 2;
  supplyPipe.position.set(3.4, 0.08, -1.8);
  group.add(supplyPipe);

  // Distant Space Center Assembly Building Silhouette
  const vabBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(10, 6.8, 7),
    new THREE.MeshStandardMaterial({ color: 0x1f304d, roughness: 0.7, metalness: 0.2 })
  );
  vabBuilding.position.set(-18, 2.6, -22);
  group.add(vabBuilding);

  const vabStripe = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.55, 7.1), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  vabStripe.position.set(-18, 5.2, -22);
  group.add(vabStripe);

  // Stylized Volumetric 3D Clouds
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.72,
  });
  const clouds: THREE.Group[] = [];
  const cloudConfigs: [number, number, number, number][] = [
    [-16, 13, -24, 1.4],
    [14, 15, -28, 1.7],
    [-8, 17, -34, 1.5],
    [22, 11, -18, 1.2],
  ];
  cloudConfigs.forEach(([cx, cy, cz, sc]) => {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    cGroup.scale.setScalar(sc);
    [
      [0, 0, 0, 1.6],
      [-1.5, -0.3, 0.3, 1.2],
      [1.6, -0.2, -0.2, 1.3],
      [0.4, 0.5, 0.4, 1.1],
    ].forEach(([px, py, pz, r]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      puff.position.set(px, py, pz);
      cGroup.add(puff);
    });
    clouds.push(cGroup);
    group.add(cGroup);
  });

  // High-Altitude Ascent Clouds (passed through during rocket climb)
  const ascentCloudConfigs: [number, number, number, number][] = [
    [-12, 24, -14, 1.8],
    [13, 30, -16, 2.0],
    [-10, 38, -20, 2.2],
    [11, 46, -15, 1.9],
    [0, 54, -26, 2.4],
  ];
  ascentCloudConfigs.forEach(([cx, cy, cz, sc]) => {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    cGroup.scale.setScalar(sc);
    [
      [0, 0, 0, 1.8],
      [-1.7, -0.25, 0.4, 1.3],
      [1.7, -0.15, -0.3, 1.4],
      [0.3, 0.55, 0.3, 1.2],
    ].forEach(([px, py, pz, r]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      puff.position.set(px, py, pz);
      cGroup.add(puff);
    });
    clouds.push(cGroup);
    group.add(cGroup);
  });

  // Curved Earth Horizon Planet Sphere (Revealed below rocket as it climbs into Deep Space)
  const earthGroup = new THREE.Group();
  earthGroup.position.set(0, -108, -28);

  const earthCanvas = document.createElement('canvas');
  earthCanvas.width = 512;
  earthCanvas.height = 256;
  const eCtx = earthCanvas.getContext('2d');
  if (eCtx) {
    const oceanGrad = eCtx.createLinearGradient(0, 0, 0, 256);
    oceanGrad.addColorStop(0, '#1d4ed8');
    oceanGrad.addColorStop(0.5, '#0284c7');
    oceanGrad.addColorStop(1, '#1e3a8a');
    eCtx.fillStyle = oceanGrad;
    eCtx.fillRect(0, 0, 512, 256);

    // Continents
    eCtx.fillStyle = '#15803d';
    const blobs: [number, number, number, number][] = [
      [110, 88, 52, 28],
      [148, 120, 38, 34],
      [270, 82, 65, 32],
      [310, 134, 48, 42],
      [415, 102, 54, 30],
      [210, 165, 42, 20],
    ];
    blobs.forEach(([bx, by, rx, ry]) => {
      eCtx.beginPath();
      eCtx.ellipse(bx, by, rx, ry, 0.25, 0, Math.PI * 2);
      eCtx.fill();
    });

    // Swirling white atmospheric cloud streaks
    eCtx.fillStyle = 'rgba(255,255,255,0.34)';
    for (let i = 0; i < 18; i++) {
      eCtx.beginPath();
      eCtx.ellipse((i * 73) % 512, 30 + ((i * 37) % 195), 42, 8, -0.15, 0, Math.PI * 2);
      eCtx.fill();
    }
  }
  const earthTex = new THREE.CanvasTexture(earthCanvas);
  earthTex.colorSpace = THREE.SRGBColorSpace;

  const earthSphere = new THREE.Mesh(
    new THREE.SphereGeometry(78, 48, 36),
    new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.72,
      metalness: 0.08,
    })
  );
  earthGroup.add(earthSphere);

  const earthAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(80.6, 48, 36),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      side: THREE.BackSide,
    })
  );
  earthGroup.add(earthAtmo);
  earthGroup.visible = false;
  group.add(earthGroup);

  // Animated Cryo Pad Steam & Venting Vapor Puffs
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const steamGeo = new THREE.SphereGeometry(0.45, 10, 8);
  interface SteamPuff {
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    vx: number;
    vy: number;
    vz: number;
    originX: number;
    originY: number;
    originZ: number;
  }
  const steamPuffs: SteamPuff[] = [];
  for (let i = 0; i < 22; i++) {
    const mesh = new THREE.Mesh(steamGeo, steamMat.clone());
    const fromVent = i % 3 === 0;
    const ox = fromVent ? -0.52 : (Math.random() - 0.5) * 1.4;
    const oy = fromVent ? 4.4 : 0.2;
    const oz = fromVent ? 0.35 : (Math.random() - 0.5) * 1.1;
    mesh.position.set(ox, oy, oz);
    group.add(mesh);
    steamPuffs.push({
      mesh,
      life: Math.random() * 2.8,
      maxLife: 2.2 + Math.random() * 1.2,
      vx: fromVent ? 0.45 + Math.random() * 0.25 : (Math.random() - 0.5) * 0.85,
      vy: fromVent ? -0.15 : 0.55 + Math.random() * 0.55,
      vz: (Math.random() - 0.5) * 0.5,
      originX: ox,
      originY: oy,
      originZ: oz,
    });
  }

  // Heavy Ignition & Liftoff Flame-Trench Exhaust Smoke Clouds
  interface LaunchSmokePuff {
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    vx: number;
    vy: number;
    vz: number;
    ox: number;
    oy: number;
    oz: number;
  }
  const launchSmokeGeo = new THREE.SphereGeometry(0.85, 12, 10);
  const launchSmokePuffs: LaunchSmokePuff[] = [];
  let launchSmokeIntensity = 0;

  for (let i = 0; i < 48; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const isLight = i % 3 !== 0;
    const sMat = new THREE.MeshBasicMaterial({
      color: isLight ? 0xf8fafc : 0xcbd5e1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(launchSmokeGeo, sMat);
    const ox = (Math.random() - 0.5) * 1.4;
    const oy = 0.25 + Math.random() * 0.45;
    const oz = side * (0.4 + Math.random() * 0.7);
    mesh.position.set(ox, oy, oz);
    mesh.visible = false;
    group.add(mesh);
    launchSmokePuffs.push({
      mesh,
      life: Math.random() * 1.6,
      maxLife: 1.3 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 4.4,
      vy: 0.9 + Math.random() * 1.9,
      vz: side * (3.6 + Math.random() * 4.6),
      ox,
      oy,
      oz,
    });
  }

  const setClampsReleased = (ratio: number) => {
    const t = Math.max(0, Math.min(1, ratio));
    clampPivots.forEach(({ group: pivot }) => {
      pivot.rotation.z = -t * 0.72;
    });
  };

  const setUmbilicalRetracted = (ratio: number) => {
    const t = Math.max(0, Math.min(1, ratio));
    umbilicalArm.rotation.y = t * 1.32;
  };

  const setLaunchSmokeIntensity = (intensity: number) => {
    launchSmokeIntensity = Math.max(0, Math.min(1, intensity));
  };

  const update = (timeSec: number, dt: number) => {
    const step = Math.min(dt, 0.05);
    beaconLight.visible = Math.sin(timeSec * 4.5) > 0;

    clouds.forEach((c, idx) => {
      c.position.x += step * (0.28 + idx * 0.06);
      if (c.position.x > 34) c.position.x = -34;
    });

    steamPuffs.forEach((p) => {
      p.life += step;
      if (p.life >= p.maxLife) {
        p.life = 0;
        p.mesh.position.set(p.originX, p.originY, p.originZ);
      }
      const u = p.life / p.maxLife;
      p.mesh.position.x += p.vx * step;
      p.mesh.position.y += p.vy * step;
      p.mesh.position.z += p.vz * step;
      const sc = 0.55 + u * 2.1;
      p.mesh.scale.setScalar(sc);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.26;
    });

    // Billowing Launch Smoke Burst update
    launchSmokePuffs.forEach((s) => {
      if (launchSmokeIntensity <= 0.01) {
        s.mesh.visible = false;
        return;
      }
      s.mesh.visible = true;
      s.life += step * (1.2 + launchSmokeIntensity * 0.9);
      if (s.life >= s.maxLife) {
        s.life = 0;
        s.mesh.position.set(s.ox, s.oy, s.oz);
      }
      const u = s.life / s.maxLife;
      s.mesh.position.x += s.vx * step * (1.1 + launchSmokeIntensity);
      s.mesh.position.y += s.vy * step * (0.9 + u * 0.6);
      s.mesh.position.z += s.vz * step * (1.1 + launchSmokeIntensity);
      const sc = 0.8 + u * 3.6;
      s.mesh.scale.setScalar(sc);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(u * Math.PI) * 0.68 * launchSmokeIntensity;
    });

    if (earthGroup.visible) {
      earthSphere.rotation.y += step * 0.025;
    }
  };

  const dispose = () => {
    earthTex.dispose();
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material?.dispose();
      }
    });
  };

  return {
    group,
    earthGroup,
    rocketMountY: 0.44,
    umbilicalArm,
    setClampsReleased,
    setUmbilicalRetracted,
    setLaunchSmokeIntensity,
    update,
    dispose,
  };
}
