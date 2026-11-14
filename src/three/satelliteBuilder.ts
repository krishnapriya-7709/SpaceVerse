import * as THREE from 'three';
import { SAT_COMPONENTS, SatSubsystemId } from '../data/spaceverseData';
import { makeGoldMLITexture, makeSolarCellTexture } from './proceduralTextures';

export interface DropSlotHandle {
  ring: THREE.Mesh;
  hitbox: THREE.Mesh;
  extraHitboxes: THREE.Mesh[];
  ghost: THREE.Group;
}

export interface SatelliteAssemblyRig {
  root: THREE.Group;
  skeletonGuide: THREE.Group;
  parts: Record<SatSubsystemId, THREE.Group>;
  dropSlots: Record<SatSubsystemId, DropSlotHandle>;
  animatedHandles: {
    solarWings: THREE.Group[];
    dishGimbal: THREE.Group | null;
    reactionWheels: THREE.Mesh[];
    thrusterPlumes: THREE.Mesh[];
    obcLeds: THREE.Mesh[];
    thermalLoops: THREE.Mesh[];
  };
  dispose: () => void;
}

/**
 * Builds an authentic, 9-part modular Earth Observation Satellite:
 * 1. bus        - Octagonal MLI-wrapped chassis + longeron ribs + adapter rings + bay recesses
 * 2. battery    - 6 Li-ion cells + thermal housing + HV orange busbars
 * 3. computer   - Radiation-hardened OBC chassis + cooling fins + status LEDs
 * 4. solar      - Dual articulated 3-segment photovoltaic wings
 * 5. camera     - Nadir Ritchey-Chretien optical telescope + spider vanes + sapphire lens
 * 6. antenna    - Zenith 2-axis parabolic dish + tripod feed struts
 * 7. adcs       - 3 orthogonal spinning brass reaction wheels + star tracker baffle
 * 8. thermal    - Gold/silver Kapton MLI louver panels + aluminum heat-pipe radiator fins
 * 9. propulsion - Twin spherical titanium hydrazine tanks + feed tubes + 4 bell nozzles + plumes
 */
export function buildDetailedSatelliteRig(): SatelliteAssemblyRig {
  const root = new THREE.Group();
  const { map: mliMap, bumpMap: mliBump } = makeGoldMLITexture();
  const solarTex = makeSolarCellTexture();

  // Shared PBR Materials
  const mliMat = new THREE.MeshStandardMaterial({
    map: mliMap,
    bumpMap: mliBump,
    bumpScale: 0.025,
    roughness: 0.34,
    metalness: 0.85,
  });
  const aluminumMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.24,
    metalness: 0.9,
  });
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.32,
    metalness: 0.88,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.42,
    metalness: 0.35,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.22,
    metalness: 0.92,
  });
  const solarCellMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.18,
    metalness: 0.55,
  });
  const dishWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.28,
    metalness: 0.35,
    side: THREE.DoubleSide,
  });
  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    roughness: 0.06,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    emissive: 0x0369a1,
    emissiveIntensity: 0.35,
  });

  // =====================================================
  // STRUCTURAL INNER SATELLITE BODY (Visible until outer MLI Bus mounts)
  // =====================================================
  const skeletonGuide = new THREE.Group();

  const innerBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.78,
  });
  const innerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 1.76, 8), innerBodyMat);
  innerCore.rotation.y = Math.PI / 8;
  skeletonGuide.add(innerCore);

  // Inner structural deck plates & mounting rings
  const innerTopCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.86, 0.1, 16), titaniumMat);
  innerTopCollar.position.y = 0.92;
  skeletonGuide.add(innerTopCollar);

  const innerBotCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.76, 0.1, 16), titaniumMat);
  innerBotCollar.position.y = -0.92;
  skeletonGuide.add(innerBotCollar);

  // Subtle cyan blueprint frame edges over the solid body
  const skelWireMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.28,
  });
  const skelCore = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 1.85, 8), skelWireMat);
  skelCore.rotation.y = Math.PI / 8;
  skeletonGuide.add(skelCore);

  const skelRingTop = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.02, 8, 24), skelWireMat);
  skelRingTop.rotation.x = Math.PI / 2;
  skelRingTop.position.y = 0.95;
  skeletonGuide.add(skelRingTop);

  const skelRingBot = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.02, 8, 24), skelWireMat);
  skelRingBot.rotation.x = Math.PI / 2;
  skelRingBot.position.y = -0.95;
  skeletonGuide.add(skelRingBot);
  root.add(skeletonGuide);

  // =====================================================
  // ALL 9 MODULAR SUBSYSTEMS
  // =====================================================
  const parts = {} as Record<SatSubsystemId, THREE.Group>;
  const solarWings: THREE.Group[] = [];
  const reactionWheels: THREE.Mesh[] = [];
  const thrusterPlumes: THREE.Mesh[] = [];
  const obcLeds: THREE.Mesh[] = [];
  const thermalLoops: THREE.Mesh[] = [];
  let dishGimbal: THREE.Group | null = null;

  // 1. SATELLITE BUS / STRUCTURAL FRAME
  const busGroup = new THREE.Group();
  const octCore = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 1.85, 8), mliMat);
  octCore.rotation.y = Math.PI / 8;
  busGroup.add(octCore);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.9, 0.075), aluminumMat);
    rib.position.set(Math.cos(angle) * 0.91, 0, Math.sin(angle) * 0.91);
    rib.rotation.y = -angle;
    busGroup.add(rib);
  }

  const topRing = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.94, 0.12, 16), titaniumMat);
  topRing.position.y = 0.96;
  busGroup.add(topRing);

  const botRing = new THREE.Mesh(new THREE.CylinderGeometry(0.94, 0.84, 0.12, 16), titaniumMat);
  botRing.position.y = -0.96;
  busGroup.add(botRing);

  const sepClamp = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 12, 32), aluminumMat);
  sepClamp.rotation.x = Math.PI / 2;
  sepClamp.position.y = -1.03;
  busGroup.add(sepClamp);

  const bayMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.5 });
  const centerBay = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.5, 0.08), bayMat);
  centerBay.position.set(0, 0.34, 0.85);
  busGroup.add(centerBay);

  const leftBay = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.08), bayMat);
  leftBay.position.set(-0.56, 0.25, 0.62);
  leftBay.rotation.y = -Math.PI / 4;
  busGroup.add(leftBay);

  const rightBay = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.08), bayMat);
  rightBay.position.set(0.56, -0.22, 0.62);
  rightBay.rotation.y = Math.PI / 4;
  busGroup.add(rightBay);

  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.45, 8), aluminumMat);
  whip.position.set(-0.52, 1.22, -0.35);
  busGroup.add(whip);
  const whipTip = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), copperMat);
  whipTip.position.set(-0.52, 1.45, -0.35);
  busGroup.add(whipTip);

  busGroup.visible = false;
  parts.bus = busGroup;
  root.add(busGroup);

  // 2. SOLAR PANELS (Articulated dual-wing 3-segment photovoltaic arrays)
  const solarGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const wing = new THREE.Group();
    wing.position.set(side * 0.92, 0.08, 0);

    const drive = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 16), titaniumMat);
    drive.rotation.z = Math.PI / 2;
    wing.add(drive);

    const yokeArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.52, 10), copperMat);
    yokeArm1.rotation.z = Math.PI / 2.6;
    yokeArm1.position.set(side * 0.32, 0.16, 0);
    wing.add(yokeArm1);

    const yokeArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.52, 10), copperMat);
    yokeArm2.rotation.z = -Math.PI / 2.6;
    yokeArm2.position.set(side * 0.32, -0.16, 0);
    wing.add(yokeArm2);

    for (let seg = 0; seg < 3; seg++) {
      const px = side * (0.98 + seg * 0.92);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.32, 0.04), titaniumMat);
      frame.position.set(px, 0, 0);
      wing.add(frame);

      const cellsFront = new THREE.Mesh(new THREE.PlaneGeometry(0.79, 1.24), solarCellMat);
      cellsFront.position.set(px, 0, 0.023);
      wing.add(cellsFront);

      const cellsBack = new THREE.Mesh(new THREE.PlaneGeometry(0.79, 1.24), carbonMat);
      cellsBack.rotation.y = Math.PI;
      cellsBack.position.set(px, 0, -0.023);
      wing.add(cellsBack);

      if (seg < 2) {
        [-0.45, 0.45].forEach((hy) => {
          const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), copperMat);
          hinge.position.set(px + side * 0.46, hy, 0);
          wing.add(hinge);
        });
      }
    }

    solarWings.push(wing);
    solarGroup.add(wing);
  });
  solarGroup.visible = false;
  parts.solar = solarGroup;
  root.add(solarGroup);

  // 3. BATTERY PACK (Thermal housing + 6 Li-ion cells + orange HV busbars)
  const batGroup = new THREE.Group();
  const batAnchor = new THREE.Group();
  batAnchor.position.set(0, 0.34, 0.9);

  const batBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 0.24), titaniumMat);
  batAnchor.add(batBox);

  const cellMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.78 });
  for (let i = -2; i <= 2; i++) {
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.34, 14), cellMat);
    cell.position.set(i * 0.12, 0, 0.12);
    batAnchor.add(cell);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), copperMat);
    cap.position.set(i * 0.12, 0.18, 0.12);
    batAnchor.add(cap);
  }

  const hvCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 0.18, 0.12),
    new THREE.Vector3(-0.1, 0.26, 0.16),
    new THREE.Vector3(0.28, 0.18, 0.12),
  ]);
  const hvCable = new THREE.Mesh(
    new THREE.TubeGeometry(hvCurve, 16, 0.018, 8, false),
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4, metalness: 0.2 })
  );
  batAnchor.add(hvCable);

  batGroup.add(batAnchor);
  batGroup.visible = false;
  parts.battery = batGroup;
  root.add(batGroup);

  // 4. COMMUNICATION ANTENNA (2-axis gimbal + Lathe parabolic dish + tripod feed horn)
  const antGroup = new THREE.Group();
  const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.14, 16), titaniumMat);
  mastBase.position.set(0, 1.07, 0);
  antGroup.add(mastBase);

  const mastTube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.42, 16), aluminumMat);
  mastTube.position.set(0, 1.32, 0);
  antGroup.add(mastTube);

  dishGimbal = new THREE.Group();
  dishGimbal.position.set(0, 1.56, 0);
  dishGimbal.rotation.x = -0.32;

  const dishPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const r = (i / 12) * 0.72;
    const y = r * r * 0.42;
    dishPoints.push(new THREE.Vector2(r, y));
  }
  const dishMesh = new THREE.Mesh(new THREE.LatheGeometry(dishPoints, 36), dishWhiteMat);
  dishGimbal.add(dishMesh);

  const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.02, 10, 36), aluminumMat);
  dishRim.rotation.x = Math.PI / 2;
  dishRim.position.y = 0.72 * 0.72 * 0.42;
  dishGimbal.add(dishRim);

  for (let s = 0; s < 3; s++) {
    const a = (s / 3) * Math.PI * 2;
    const strutCurve = new THREE.LineCurve3(
      new THREE.Vector3(Math.cos(a) * 0.56, 0.13, Math.sin(a) * 0.56),
      new THREE.Vector3(0, 0.46, 0)
    );
    const strut = new THREE.Mesh(new THREE.TubeGeometry(strutCurve, 4, 0.014, 8, false), titaniumMat);
    dishGimbal.add(strut);
  }

  const subRef = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.09, 16), copperMat);
  subRef.rotation.x = Math.PI;
  subRef.position.y = 0.46;
  dishGimbal.add(subRef);

  const feedWaveguide = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.24, 12), copperMat);
  feedWaveguide.position.y = 0.12;
  dishGimbal.add(feedWaveguide);

  antGroup.add(dishGimbal);
  antGroup.visible = false;
  parts.antenna = antGroup;
  root.add(antGroup);

  // 5. CAMERA / SCIENTIFIC PAYLOAD (Nadir telescope + sapphire lens + baffle)
  const camGroup = new THREE.Group();
  const camMount = new THREE.Group();
  camMount.position.set(0, -1.04, 0);

  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 24), titaniumMat);
  camMount.add(flange);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.41, 0.52, 24), carbonMat);
  barrel.position.y = -0.28;
  camMount.add(barrel);

  const mliWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.28, 24, 1, true), mliMat);
  mliWrap.position.y = -0.24;
  camMount.add(mliWrap);

  const apertureRing = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 12, 28), aluminumMat);
  apertureRing.rotation.x = Math.PI / 2;
  apertureRing.position.y = -0.54;
  camMount.add(apertureRing);

  const lensDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 24, 16, 0, Math.PI * 2, 0, Math.PI / 3.2),
    lensGlassMat
  );
  lensDome.rotation.x = Math.PI;
  lensDome.position.y = -0.45;
  camMount.add(lensDome);

  for (let v = 0; v < 4; v++) {
    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.012), carbonMat);
    vane.rotation.y = (v / 4) * Math.PI;
    vane.position.y = -0.52;
    camMount.add(vane);
  }
  const secCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), titaniumMat);
  secCap.position.y = -0.53;
  camMount.add(secCap);

  camGroup.add(camMount);
  camGroup.visible = false;
  parts.camera = camGroup;
  root.add(camGroup);

  // 6. ON-BOARD COMPUTER (Shielded avionics box + cooling fins + status LEDs)
  const compGroup = new THREE.Group();
  const compAnchor = new THREE.Group();
  compAnchor.position.set(-0.62, 0.25, 0.68);
  compAnchor.rotation.y = -Math.PI / 4;

  const obcBox = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.2), titaniumMat);
  compAnchor.add(obcBox);

  for (let f = -3; f <= 3; f++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.34, 0.06), aluminumMat);
    fin.position.set(f * 0.055, 0, 0.11);
    compAnchor.add(fin);
  }

  const backplane = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.04), copperMat);
  backplane.position.set(0, -0.14, 0.12);
  compAnchor.add(backplane);

  const ledColors = [0x38bdf8, 0x34d399, 0x4fe3d4];
  ledColors.forEach((col, idx) => {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
    led.position.set(-0.14 + idx * 0.06, 0.14, 0.12);
    obcLeds.push(led);
    compAnchor.add(led);
  });

  compGroup.add(compAnchor);
  compGroup.visible = false;
  parts.computer = compGroup;
  root.add(compGroup);

  // 7. ATTITUDE CONTROL SYSTEM (ADCS - 3 orthogonal brass flywheels + star tracker)
  const adcsGroup = new THREE.Group();
  const adcsAnchor = new THREE.Group();
  adcsAnchor.position.set(0.62, -0.22, 0.68);
  adcsAnchor.rotation.y = Math.PI / 4;

  const adcsFrame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.18), titaniumMat);
  adcsAnchor.add(adcsFrame);

  const wheelSpecs: [number, number, number, number, number][] = [
    [-0.1, 0.07, 0.12, Math.PI / 2, 0],
    [0.1, 0.07, 0.12, 0, Math.PI / 2],
    [0, -0.09, 0.12, Math.PI / 3, 0.4],
  ];
  wheelSpecs.forEach(([wx, wy, wz, rx, rz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.045, 20), copperMat);
    wheel.position.set(wx, wy, wz);
    wheel.rotation.set(rx, 0, rz);
    reactionWheels.push(wheel);
    adcsAnchor.add(wheel);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), aluminumMat);
    hub.position.set(wx, wy, wz);
    hub.rotation.set(rx, 0, rz);
    adcsAnchor.add(hub);
  });

  const starTracker = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.03, 0.16, 14), carbonMat);
  starTracker.rotation.x = Math.PI / 3;
  starTracker.position.set(0.14, -0.1, 0.15);
  adcsAnchor.add(starTracker);

  adcsGroup.add(adcsAnchor);
  adcsGroup.visible = false;
  parts.adcs = adcsGroup;
  root.add(adcsGroup);

  // 8. THERMAL CONTROL SYSTEM (MLI louver flank + silver optical reflectors + copper heat pipes)
  const thermalGroup = new THREE.Group();
  const thermalAnchor = new THREE.Group();
  thermalAnchor.position.set(0.95, -0.32, 0.0);

  const radBacking = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.88, 0.64), titaniumMat);
  thermalAnchor.add(radBacking);

  // Silver Optical Solar Reflector mirror tiles & louvered radiator blades
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.08,
    metalness: 0.96,
  });
  for (let r = -3; r <= 3; r++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.56), mirrorMat);
    blade.position.set(0.04, r * 0.11, 0);
    blade.rotation.z = 0.25;
    thermalAnchor.add(blade);
  }

  // Glowing copper heat-pipe manifold loop
  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.4, -0.22),
    new THREE.Vector3(0.12, 0.4, 0.22),
    new THREE.Vector3(0.12, -0.4, 0.22),
    new THREE.Vector3(0.08, -0.4, -0.22),
  ]);
  const heatPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 24, 0.022, 8, false), copperMat);
  thermalLoops.push(heatPipe);
  thermalAnchor.add(heatPipe);

  // Left-flank secondary thermal louver strips for visual balance
  const radLeft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.48), mirrorMat);
  radLeft.position.set(-1.86, -0.05, 0);
  thermalAnchor.add(radLeft);

  thermalGroup.add(thermalAnchor);
  thermalGroup.visible = false;
  parts.thermal = thermalGroup;
  root.add(thermalGroup);

  // 9. PROPULSION SYSTEM (Twin titanium hydrazine tanks + feed lines + 4 bell nozzles)
  const propGroup = new THREE.Group();
  const propAnchor = new THREE.Group();
  propAnchor.position.set(0, 0.05, -0.92);

  const manifold = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.14), titaniumMat);
  propAnchor.add(manifold);

  [-0.28, 0.28].forEach((tx) => {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), aluminumMat);
    tank.position.set(tx, 0.22, -0.14);
    propAnchor.add(tank);

    const band = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.016, 8, 28), copperMat);
    band.position.set(tx, 0.22, -0.14);
    propAnchor.add(band);

    const feedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tx, 0.02, -0.14),
      new THREE.Vector3(tx * 0.7, -0.18, -0.2),
      new THREE.Vector3(tx * 0.75, -0.32, -0.16),
    ]);
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(feedCurve, 12, 0.018, 8, false), copperMat);
    propAnchor.add(pipe);
  });

  const bellPts = [
    new THREE.Vector2(0.025, 0),
    new THREE.Vector2(0.04, 0.06),
    new THREE.Vector2(0.075, 0.16),
    new THREE.Vector2(0.11, 0.24),
  ];
  const bellGeo = new THREE.LatheGeometry(bellPts, 20);
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.28,
    metalness: 0.92,
    side: THREE.DoubleSide,
  });

  [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, -0.02],
    [0.25, -0.02],
  ].forEach(([nx, ny]) => {
    const nozzle = new THREE.Mesh(bellGeo, bellMat);
    nozzle.rotation.x = -Math.PI / 2;
    nozzle.position.set(nx, ny, -0.12);
    propAnchor.add(nozzle);

    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.45, 14),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
    );
    plume.rotation.x = -Math.PI / 2;
    plume.position.set(nx, ny, -0.52);
    plume.visible = false;
    thrusterPlumes.push(plume);
    propAnchor.add(plume);
  });

  propGroup.add(propAnchor);
  propGroup.visible = false;
  parts.propulsion = propGroup;
  root.add(propGroup);

  // =====================================================
  // INTERACTIVE 3D DROP SLOTS (RING + RAYCAST HITBOXES + GHOST)
  // =====================================================
  const dropSlots = {} as Record<SatSubsystemId, DropSlotHandle>;
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

  SAT_COMPONENTS.forEach((comp) => {
    const slotRingMat = new THREE.MeshBasicMaterial({
      color: 0x4fe3d4,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const ringRadius = comp.id === 'bus' ? 0.36 : 0.24;
    const ring = new THREE.Mesh(new THREE.RingGeometry(ringRadius, ringRadius + 0.07, 28), slotRingMat);
    ring.position.set(comp.anchorPos.x, comp.anchorPos.y, comp.anchorPos.z);
    if (comp.id === 'bus') {
      ring.lookAt(0, 0, 2);
    } else {
      ring.lookAt(comp.anchorPos.x * 2, comp.anchorPos.y * 2, comp.anchorPos.z * 2);
    }
    root.add(ring);

    const hitboxRadius = comp.id === 'bus' ? 0.72 : 0.56;
    const hitbox = new THREE.Mesh(new THREE.SphereGeometry(hitboxRadius, 12, 12), hitboxMat);
    hitbox.position.set(comp.anchorPos.x, comp.anchorPos.y, comp.anchorPos.z);
    hitbox.userData.compId = comp.id;
    root.add(hitbox);

    const extraHitboxes: THREE.Mesh[] = [];
    if (comp.id === 'solar') {
      // Allow dropping Solar Panels onto the +X wing side too
      const rightWingHit = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), hitboxMat);
      rightWingHit.position.set(1.68, 0.08, 0);
      rightWingHit.userData.compId = 'solar';
      root.add(rightWingHit);
      extraHitboxes.push(rightWingHit);
    }

    // Holographic wireframe ghost shown when dragging/selecting this subsystem
    const ghost = new THREE.Group();
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.48,
    });
    if (comp.id === 'bus') {
      const gBus = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.88, 8), wireMat);
      gBus.rotation.y = Math.PI / 8;
      ghost.add(gBus);
    } else if (comp.id === 'solar') {
      [-1, 1].forEach((s) => {
        const gWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.06), wireMat);
        gWing.position.set(s * 2.25, 0.08, 0);
        ghost.add(gWing);
      });
    } else if (comp.id === 'antenna') {
      const gDish = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.1, 0.3, 16, 1, true), wireMat);
      gDish.position.set(0, 1.56, 0);
      ghost.add(gDish);
    } else if (comp.id === 'camera') {
      const gCam = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.56, 16), wireMat);
      gCam.position.set(0, -1.32, 0);
      ghost.add(gCam);
    } else if (comp.id === 'thermal') {
      const gRad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 0.68), wireMat);
      gRad.position.set(1.02, -0.25, 0.0);
      ghost.add(gRad);
    } else {
      const gBox = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.36), wireMat);
      gBox.position.set(comp.anchorPos.x, comp.anchorPos.y, comp.anchorPos.z);
      ghost.add(gBox);
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
    mliMap.dispose();
    mliBump.dispose();
    solarTex.dispose();
  };

  return {
    root,
    skeletonGuide,
    parts,
    dropSlots,
    animatedHandles: {
      solarWings,
      dishGimbal,
      reactionWheels,
      thrusterPlumes,
      obcLeds,
      thermalLoops,
    },
    dispose,
  };
}
