import * as THREE from 'three';
import { SupplyCrate } from '../data/spaceverseData';
import {
  makeContactShadowTexture,
  makeEarthHologramTexture,
  makeGaugeDialTexture,
  makeGoldMLITexture,
  makeMotorCasingTexture,
  makeServerRackTexture,
} from './proceduralTextures';
import { buildDetailedSatelliteRig } from './satelliteBuilder';

export interface ColliderCircle {
  x: number;
  z: number;
  r: number;
}

export interface CrateVisualHandle {
  crate: SupplyCrate;
  group: THREE.Group;
  pedestalRing: THREE.Mesh;
  hitMesh: THREE.Mesh;
  setSelected: (selected: boolean) => void;
}

export interface RocketVisualHandle {
  group: THREE.Group;
  flame: THREE.Group;
  payloadBay: THREE.Group;
  motorStage: THREE.Group;
  updateConfiguration: (items: Set<string>, motorKey: string | null) => void;
}

export function createSectorSignSprite(
  title: string,
  x: number,
  y: number,
  z: number,
  width = 7,
  color = '#e8eefc',
  bg = 'rgba(6,12,26,0.88)'
): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 80;
  const k = c.getContext('2d')!;
  k.fillStyle = bg;
  k.fillRect(0, 0, 640, 80);
  k.strokeStyle = color;
  k.lineWidth = 4;
  k.strokeRect(2, 2, 636, 76);

  // Subtle corner ticks
  k.fillStyle = color;
  k.fillRect(2, 2, 14, 14);
  k.fillRect(624, 64, 14, 14);

  k.fillStyle = color;
  k.font = 'bold 28px system-ui, sans-serif';
  k.textAlign = 'center';
  k.textBaseline = 'middle';
  k.fillText(title, 320, 41);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(width, width / 8, 1);
  s.position.set(x, y, z);
  return s;
}

export function buildSupplyCrateModel(crate: SupplyCrate): CrateVisualHandle {
  const group = new THREE.Group();
  group.position.set(crate.x, 0, -25);

  const shadowTex = makeContactShadowTexture();
  const baseShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(crate.mot ? 4.2 : 3.4, crate.mot ? 4.2 : 3.4),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  baseShadow.rotation.x = -Math.PI / 2;
  baseShadow.position.y = 0.015;
  group.add(baseShadow);

  // Cleanroom Pedestal / Cradle
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.9 });
  const pedW = crate.mot ? 2.7 : 2.2;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(pedW * 0.48, pedW * 0.54, 0.44, 8), pedestalMat);
  ped.position.y = 0.22;
  group.add(ped);

  const pedPlate = new THREE.Mesh(new THREE.CylinderGeometry(pedW * 0.44, pedW * 0.44, 0.08, 16), trimMat);
  pedPlate.position.y = 0.48;
  group.add(pedPlate);

  const ringMat = new THREE.MeshBasicMaterial({ color: crate.mot ? 0xf59e0b : 0x38bdf8 });
  const pedestalRing = new THREE.Mesh(new THREE.RingGeometry(pedW * 0.47, pedW * 0.53, 32), ringMat);
  pedestalRing.rotation.x = -Math.PI / 2;
  pedestalRing.position.y = 0.45;
  group.add(pedestalRing);

  const aluminumMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.25, metalness: 0.9 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.85 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.22, metalness: 0.92 });
  const { map: mliMap, bumpMap: mliBump } = makeGoldMLITexture();
  const goldMliMat = new THREE.MeshStandardMaterial({ map: mliMap, bumpMap: mliBump, bumpScale: 0.02, roughness: 0.32, metalness: 0.85 });

  // Detailed model per crate
  const modelRoot = new THREE.Group();
  modelRoot.position.y = 0.52;

  if (crate.k === 't') {
    // THERMOMETER: Cryo-Thermal Atmospheric Probe
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 1.05), darkMetalMat);
    chassis.position.y = 0.38;
    modelRoot.add(chassis);

    const mliPanel = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.56, 1.08), goldMliMat);
    mliPanel.position.y = 0.38;
    modelRoot.add(mliPanel);

    // Copper heat-sink cooling fins on sides
    for (let i = -3; i <= 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 0.78), copperMat);
      fin.position.set(0, 0.18 + (i + 3) * 0.075, 0);
      modelRoot.add(fin);
    }

    // Dual vertical platinum RTD thermal probe masts
    [-0.3, 0.3].forEach((px, idx) => {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.35, 16), aluminumMat);
      mast.position.set(px, 1.32, 0);
      modelRoot.add(mast);

      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 20), copperMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(px, 1.65, 0);
      modelRoot.add(coil);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: idx === 0 ? 0x38bdf8 : 0x34d399 })
      );
      bulb.position.set(px, 2.04, 0);
      modelRoot.add(bulb);
    });
  } else if (crate.k === 'b') {
    // BAROMETER: MEMS Pressure Manifold with Dual Analog/Digital Dials
    const manifold = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.85, 1.0), darkMetalMat);
    manifold.position.y = 0.45;
    modelRoot.add(manifold);

    const dialTex = makeGaugeDialTexture('kPa');
    const dialMat = new THREE.MeshBasicMaterial({ map: dialTex });

    [-0.36, 0.36].forEach((dx) => {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24), copperMat);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(dx, 0.55, 0.52);
      modelRoot.add(bezel);

      const face = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), dialMat);
      face.position.set(dx, 0.55, 0.6);
      modelRoot.add(face);
    });

    // Brass pitot static intake dome & coiled pressure tubing
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.65, 20), aluminumMat);
    dome.position.set(0, 1.15, 0);
    modelRoot.add(dome);

    const pitotTip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 0.6, 14), copperMat);
    pitotTip.position.set(0, 1.72, 0);
    modelRoot.add(pitotTip);

    const pipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.45, 0.85, 0.2),
      new THREE.Vector3(-0.55, 1.25, 0.35),
      new THREE.Vector3(-0.18, 1.32, 0.15),
    ]);
    modelRoot.add(new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 14, 0.04, 8, false), copperMat));
  } else if (crate.k === 'c') {
    // CAMERA: Multispectral Telescope Payload on Pan-Tilt Yoke
    const yokeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.28, 20), darkMetalMat);
    yokeBase.position.y = 0.15;
    modelRoot.add(yokeBase);

    [-0.58, 0.58].forEach((ax) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 0.28), aluminumMat);
      arm.position.set(ax, 0.72, 0);
      modelRoot.add(arm);
    });

    const camBody = new THREE.Group();
    camBody.position.set(0, 1.15, 0);
    camBody.rotation.x = -0.35;

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.18, 24), darkMetalMat);
    tube.rotation.x = Math.PI / 2;
    camBody.add(tube);

    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.55, 24), goldMliMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.z = -0.15;
    camBody.add(shroud);

    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 12, 28), aluminumMat);
    lensRing.position.z = 0.6;
    camBody.add(lensRing);

    const sapphireLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.37, 24, 16, 0, Math.PI * 2, 0, Math.PI / 3),
      new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        roughness: 0.05,
        metalness: 0.15,
        clearcoat: 1.0,
        emissive: 0x0369a1,
        emissiveIntensity: 0.4,
      })
    );
    sapphireLens.rotation.x = Math.PI / 2;
    sapphireLens.position.z = 0.42;
    camBody.add(sapphireLens);

    modelRoot.add(camBody);
  } else {
    // ROCKET MOTORS ('s', 'm', 'x', 'l')
    const cfgMap: Record<string, { rad: number; h: number; accent: string; bells: number }> = {
      s: { rad: 0.52, h: 1.8, accent: '#38bdf8', bells: 1 },
      m: { rad: 0.65, h: 2.25, accent: '#34d399', bells: 1 },
      x: { rad: 0.78, h: 2.6, accent: '#f59e0b', bells: 2 },
      l: { rad: 0.92, h: 3.0, accent: '#ef4444', bells: 4 },
    };
    const cfg = cfgMap[crate.k] || cfgMap.m;

    const casingTex = makeMotorCasingTexture(cfg.accent, crate.k.toUpperCase() + '-PWR');
    const casingMat = new THREE.MeshStandardMaterial({ map: casingTex, roughness: 0.3, metalness: 0.55 });

    // Lower Engine Mount Frame / Thrust Structure
    const thrustSkirt = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.rad * 0.92, cfg.rad * 1.08, 0.48, 24),
      darkMetalMat
    );
    thrustSkirt.position.y = 0.24;
    modelRoot.add(thrustSkirt);

    // Main Propellant Casing
    const core = new THREE.Mesh(new THREE.CylinderGeometry(cfg.rad, cfg.rad, cfg.h, 28), casingMat);
    core.position.y = 0.48 + cfg.h / 2 + 0.35;
    modelRoot.add(core);

    // Interstage Collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.rad * 1.04, cfg.rad * 1.04, 0.2, 28),
      aluminumMat
    );
    collar.position.y = 0.48 + cfg.h + 0.38;
    modelRoot.add(collar);

    // External propellant feed lines along outside of casing
    [-1, 1].forEach((side) => {
      const pipeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (cfg.rad + 0.08), 0.48 + cfg.h + 0.2, 0),
        new THREE.Vector3(side * (cfg.rad + 0.12), 0.48 + cfg.h * 0.5, 0),
        new THREE.Vector3(side * (cfg.rad * 0.65), 0.55, 0),
      ]);
      modelRoot.add(new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 12, 0.045, 8, false), copperMat));
    });

    // Machined Parabolic De Laval Nozzle Bell(s)
    const bellPts = [
      new THREE.Vector2(0.08, 0.45),
      new THREE.Vector2(0.14, 0.32),
      new THREE.Vector2(0.28, 0.12),
      new THREE.Vector2(0.36, 0),
    ];
    const bellGeo = new THREE.LatheGeometry(bellPts, 24);
    const bellMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.92,
      side: THREE.DoubleSide,
    });

    const bellOffsets: [number, number][] =
      cfg.bells === 1
        ? [[0, 0]]
        : cfg.bells === 2
        ? [
            [-0.28, 0],
            [0.28, 0],
          ]
        : [
            [-0.3, -0.3],
            [0.3, -0.3],
            [-0.3, 0.3],
            [0.3, 0.3],
          ];

    const nozzleScale = cfg.bells === 1 ? cfg.rad * 1.15 : cfg.rad * 0.72;
    bellOffsets.forEach(([bx, bz]) => {
      const bell = new THREE.Mesh(bellGeo, bellMat);
      bell.scale.setScalar(nozzleScale);
      bell.position.set(bx, 0.36, bz);
      modelRoot.add(bell);
    });
  }

  group.add(modelRoot);

  // Invisible clean raycast box around entire crate/pedestal for reliable click-picking
  const hitH = crate.mot ? 4.2 : 3.2;
  const hitMesh = new THREE.Mesh(
    new THREE.BoxGeometry(crate.mot ? 2.6 : 2.2, hitH, crate.mot ? 2.6 : 2.2),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitMesh.position.y = hitH / 2;
  hitMesh.userData.crateKey = crate.k;
  group.add(hitMesh);

  const setSelected = (selected: boolean) => {
    ringMat.color.setHex(selected ? 0x34d399 : crate.mot ? 0xf59e0b : 0x38bdf8);
    pedestalRing.scale.setScalar(selected ? 1.12 : 1.0);
  };

  return { crate, group, pedestalRing, hitMesh, setSelected };
}

export function buildDSNGroundStation(): {
  group: THREE.Group;
  dishElevation: THREE.Group;
  dishAzimuth: THREE.Group;
  commScreenMat: THREE.MeshBasicMaterial;
} {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75, metalness: 0.15 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.85 });
  const whiteDishMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.4,
    side: THREE.DoubleSide,
  });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.9 });

  // Dish Pedestal & Azimuth Turntable at (-40, 0, 10)
  const dishBase = new THREE.Group();
  dishBase.position.set(-40, 0, 10);

  const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.0, 2.2, 16), concreteMat);
  pier.position.y = 1.1;
  dishBase.add(pier);

  const dishAzimuth = new THREE.Group();
  dishAzimuth.position.y = 2.2;

  const yokeBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.5, 16), steelMat);
  yokeBase.position.y = 0.25;
  dishAzimuth.add(yokeBase);

  // Twin Yoke Arms
  [-0.95, 0.95].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.8, 0.65), steelMat);
    arm.position.set(side, 1.15, 0);
    dishAzimuth.add(arm);
  });

  const dishElevation = new THREE.Group();
  dishElevation.position.y = 1.85;
  dishElevation.rotation.x = 0.65;

  // Parabolic Dish via LatheGeometry
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const r = (i / 16) * 3.1;
    const y = r * r * 0.14;
    pts.push(new THREE.Vector2(r, y));
  }
  const dishMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), whiteDishMat);
  dishElevation.add(dishMesh);

  // Backing structural ribs
  for (let r = 0; r < 8; r++) {
    const ang = (r / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 2.9), steelMat);
    rib.position.set(Math.cos(ang) * 1.4, 0.35, Math.sin(ang) * 1.4);
    rib.rotation.y = -ang + Math.PI / 2;
    dishElevation.add(rib);
  }

  // Quad-pod feed horn struts & apex sub-reflector
  for (let q = 0; q < 4; q++) {
    const ang = (q / 4) * Math.PI * 2 + Math.PI / 4;
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(Math.cos(ang) * 2.4, 0.78, Math.sin(ang) * 2.4),
      new THREE.Vector3(0, 2.35, 0)
    );
    dishElevation.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 4, 0.05, 8, false), steelMat));
  }
  const feedHorn = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.45, 16), copperMat);
  feedHorn.rotation.x = Math.PI;
  feedHorn.position.y = 2.35;
  dishElevation.add(feedHorn);

  dishAzimuth.add(dishElevation);
  dishBase.add(dishAzimuth);
  group.add(dishBase);

  // DSN Telemetry Operator Desk & Server Racks at (-36, 0, 8)
  const rackTex = makeServerRackTexture();
  const rackMat = new THREE.MeshStandardMaterial({ map: rackTex, roughness: 0.4, metalness: 0.6 });
  [-32.5, -31.1].forEach((rx) => {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 1.0), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.7 }));
    rack.position.set(rx, 1.6, 10.5);
    group.add(rack);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 3.0), rackMat);
    front.position.set(rx, 1.6, 9.99);
    front.rotation.y = Math.PI;
    group.add(front);
  });

  // Console desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.15, 1.6), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 }));
  desk.position.set(-36, 0.58, 8);
  group.add(desk);

  const monitorHousing = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.45, 0.22), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 }));
  monitorHousing.position.set(-36, 1.85, 7.6);
  monitorHousing.rotation.x = 0.14;
  group.add(monitorHousing);

  const commScreenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const commScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 1.2), commScreenMat);
  commScreen.position.set(-36, 1.85, 7.48);
  commScreen.rotation.y = Math.PI;
  commScreen.rotation.x = -0.14;
  group.add(commScreen);

  return { group, dishElevation, dishAzimuth, commScreenMat };
}

export function buildMissionControlCenter(): {
  group: THREE.Group;
  screenMesh: THREE.Mesh;
  updateScreen: (timeMs: number) => void;
} {
  const group = new THREE.Group();
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x1b2332, roughness: 0.45, metalness: 0.65 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.85 });

  // Main Flight Director Wall Frame
  const wallFrame = new THREE.Mesh(new THREE.BoxGeometry(19, 8.0, 2.8), housingMat);
  wallFrame.position.set(-34, 4.0, -34);
  group.add(wallFrame);

  // Side Telemetry Server Towers
  const rackTex = makeServerRackTexture();
  const rackFaceMat = new THREE.MeshStandardMaterial({ map: rackTex, roughness: 0.35, metalness: 0.5 });
  [-42.2, -25.8].forEach((tx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.8, 7.6, 2.2), trimMat);
    col.position.set(tx, 3.8, -33.2);
    group.add(col);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 7.0), rackFaceMat);
    face.position.set(tx, 3.8, -32.08);
    group.add(face);
  });

  // Live Animated MCC CanvasTexture
  const cScr = document.createElement('canvas');
  cScr.width = 768;
  cScr.height = 384;
  const xScr = cScr.getContext('2d')!;
  const scrTex = new THREE.CanvasTexture(cScr);
  scrTex.colorSpace = THREE.SRGBColorSpace;

  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(14.5, 5.8),
    new THREE.MeshBasicMaterial({ map: scrTex })
  );
  screenMesh.position.set(-34, 4.3, -32.5);
  group.add(screenMesh);

  // Two Tiers of Flight Controller Consoles
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x263348, roughness: 0.45, metalness: 0.6 });
  const monFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
  const monGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  for (let r = 0; r < 2; r++) {
    const zDesk = -24 - r * 4.5;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(13, 1.15, 1.75), deskMat);
    desk.position.set(-34, 0.58, zDesk);
    group.add(desk);

    // Angled desktop monitors & controller chairs
    for (let s = -4.5; s <= 4.5; s += 3.0) {
      const monBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.98, 0.1), monFrameMat);
      monBack.position.set(-34 + s, 1.62, zDesk - 0.35);
      monBack.rotation.x = -0.18;
      group.add(monBack);

      const monScr = new THREE.Mesh(new THREE.PlaneGeometry(1.64, 0.82), monGlowMat);
      monScr.position.set(-34 + s, 1.62, zDesk - 0.29);
      monScr.rotation.x = -0.18;
      group.add(monScr);

      // Controller chair seat
      const chair = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 14), trimMat);
      chair.position.set(-34 + s, 0.58, zDesk + 1.35);
      group.add(chair);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.85, 0.12), trimMat);
      back.position.set(-34 + s, 1.05, zDesk + 1.72);
      group.add(back);
    }
  }

  let lastDraw = 0;
  const updateScreen = (timeMs: number) => {
    if (timeMs - lastDraw < 50) return;
    lastDraw = timeMs;

    xScr.fillStyle = '#061325';
    xScr.fillRect(0, 0, 768, 384);
    xScr.strokeStyle = '#38bdf8';
    xScr.lineWidth = 4;
    xScr.strokeRect(12, 12, 744, 360);

    // Header
    xScr.fillStyle = '#4fe3d4';
    xScr.font = 'bold 26px monospace';
    xScr.fillText('SPACEVERSE // GALAXY-X FLIGHT TELEMETRY WALL', 28, 50);

    // Sub-panels
    xScr.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    xScr.lineWidth = 2;
    xScr.strokeRect(28, 72, 460, 220);
    xScr.strokeRect(504, 72, 236, 220);

    // Orbital sine trajectory track
    xScr.strokeStyle = '#38bdf8';
    xScr.lineWidth = 3;
    xScr.beginPath();
    for (let px = 40; px <= 476; px += 6) {
      const py = 182 + Math.sin(px * 0.025 + timeMs * 0.0025) * 62 + Math.cos(px * 0.05 - timeMs * 0.002) * 16;
      if (px === 40) xScr.moveTo(px, py);
      else xScr.lineTo(px, py);
    }
    xScr.stroke();

    // Orbiting dot
    const dotX = 40 + ((timeMs * 0.08) % 436);
    const dotY = 182 + Math.sin(dotX * 0.025 + timeMs * 0.0025) * 62 + Math.cos(dotX * 0.05 - timeMs * 0.002) * 16;
    xScr.fillStyle = '#f2c14e';
    xScr.beginPath();
    xScr.arc(dotX, dotY, 6, 0, Math.PI * 2);
    xScr.fill();

    // Right column telemetry metrics
    xScr.fillStyle = '#94a3b8';
    xScr.font = 'bold 16px monospace';
    xScr.fillText('DSN DOWNLINK: LOCKED', 520, 108);
    xScr.fillStyle = '#34d399';
    xScr.fillText('BUS VOLTAGE: 28.4 V', 520, 144);
    xScr.fillStyle = '#4fe3d4';
    xScr.fillText('GUIDANCE:    3-AXIS', 520, 180);
    xScr.fillStyle = '#f2c14e';
    xScr.fillText('PROPULSION:  ARMED', 520, 216);
    xScr.fillStyle = '#38bdf8';
    xScr.fillText('RANGE SAFETY: GREEN', 520, 252);

    // Bottom bar
    xScr.fillStyle = '#e8eefc';
    xScr.font = '18px monospace';
    xScr.fillText('FACILITY STATUS: NOMINAL // ALL CLEANROOMS ACTIVE', 28, 336);
    scrTex.needsUpdate = true;
  };

  return { group, screenMesh, updateScreen };
}

export function buildResearchLabBench(): THREE.Group {
  const group = new THREE.Group();
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.35, metalness: 0.7 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 });

  // Cleanroom work bench against North Wall (-8, 0, -32)
  const bench = new THREE.Mesh(new THREE.BoxGeometry(20, 1.35, 3.8), benchMat);
  bench.position.set(-8, 0.68, -32);
  group.add(bench);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.14, 4.0), trimMat);
  counter.position.set(-8, 1.4, -32);
  group.add(counter);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x4fe3d4,
    transparent: true,
    opacity: 0.32,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.4,
  });

  // 3 Pressurized Containment Chambers with miniature sensor cores inside
  [-14, -8, -2].forEach((px, idx) => {
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.25, 24), trimMat);
    baseRing.position.set(px, 1.58, -32);
    group.add(baseRing);

    const glassCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 2.4, 24), glassMat);
    glassCyl.position.set(px, 2.9, -32);
    group.add(glassCyl);

    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.98, 0.24, 24), trimMat);
    topCap.position.set(px, 4.2, -32);
    group.add(topCap);

    // Floating holographic/cleanroom test core inside each glass pod
    const core = new THREE.Mesh(
      idx === 0 ? new THREE.OctahedronGeometry(0.38) : idx === 1 ? new THREE.DodecahedronGeometry(0.35) : new THREE.TorusKnotGeometry(0.28, 0.08, 48, 8),
      new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.8 })
    );
    core.position.set(px, 2.85, -32);
    group.add(core);
  });

  return group;
}

export function buildMissionPlanningHoloTable(): {
  group: THREE.Group;
  earthGlobe: THREE.Mesh;
  orbitRing: THREE.Mesh;
  orbitSat: THREE.Mesh;
} {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x4f46e5, emissiveIntensity: 0.35 });

  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.0, 1.15, 32), baseMat);
  tableBase.position.set(-28, 0.58, 10);
  group.add(tableBase);

  const emitterRing = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.08, 12, 48), rimMat);
  emitterRing.rotation.x = Math.PI / 2;
  emitterRing.position.set(-28, 1.18, 10);
  group.add(emitterRing);

  const earthTex = makeEarthHologramTexture();
  const earthGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(1.48, 32, 24),
    new THREE.MeshBasicMaterial({ map: earthTex, transparent: true, opacity: 0.92 })
  );
  earthGlobe.position.set(-28, 2.75, 10);
  group.add(earthGlobe);

  const wireAtmos = new THREE.Mesh(
    new THREE.SphereGeometry(1.56, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x4fe3d4, wireframe: true, transparent: true, opacity: 0.22 })
  );
  wireAtmos.position.set(-28, 2.75, 10);
  group.add(wireAtmos);

  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.45, 0.04, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x4fe3d4 })
  );
  orbitRing.rotation.x = 1.1;
  orbitRing.rotation.y = 0.35;
  orbitRing.position.set(-28, 2.75, 10);
  group.add(orbitRing);

  const orbitSat = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e })
  );
  orbitSat.position.set(-28 + 2.45, 2.75, 10);
  group.add(orbitSat);

  return { group, earthGlobe, orbitRing, orbitSat };
}

export function buildLaunchControlComplex(): THREE.Group {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1d2636, roughness: 0.5, metalness: 0.4 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.85 });

  // Observation Bunker Wall with reinforced window frame
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 1.6), wallMat);
  wallLeft.position.set(14, 7, -2);
  group.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 1.6), wallMat);
  wallRight.position.set(34, 7, -2);
  group.add(wallRight);

  const wallBottom = new THREE.Mesh(new THREE.BoxGeometry(16, 2.5, 1.6), wallMat);
  wallBottom.position.set(24, 1.25, -2);
  group.add(wallBottom);

  const wallTop = new THREE.Mesh(new THREE.BoxGeometry(16, 6.2, 1.6), wallMat);
  wallTop.position.set(24, 10.9, -2);
  group.add(wallTop);

  // Observation window glass
  const winGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 5.3),
    new THREE.MeshPhysicalMaterial({
      color: 0x4fe3d4,
      transparent: true,
      opacity: 0.25,
      roughness: 0.08,
      metalness: 0.1,
    })
  );
  winGlass.position.set(24, 5.15, -2.0);
  group.add(winGlass);

  // Launch Firing Console at (24, 0, 4)
  const consoleBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.25, 1.85), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 }));
  consoleBody.position.set(24, 0.63, 4);
  group.add(consoleBody);

  const slopedTop = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 1.2), steelMat);
  slopedTop.position.set(24, 1.45, 3.85);
  slopedTop.rotation.x = 0.3;
  group.add(slopedTop);

  // Illuminated Launch Sequencer Screen + Red Firing Guard Cover
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.8), new THREE.MeshBasicMaterial({ color: 0xf2c14e }));
  cs.position.set(24, 1.88, 3.35);
  group.add(cs);

  const fireBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.12, 16),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  fireBtn.position.set(25.4, 1.4, 4.4);
  group.add(fireBtn);

  return group;
}

export function buildLaunchPadAndDetailedRocket(): {
  padGroup: THREE.Group;
  rocket: RocketVisualHandle;
  gantryHoist: THREE.Group;
  craneHoistCable: THREE.Mesh;
  hoistBeacon: THREE.Mesh;
} {
  const padGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x454d5d, roughness: 0.75, metalness: 0.2 });
  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.82 });
  const craneYellowMat = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.3, metalness: 0.65 });

  // Launch Pad Deck at (36, 0, -12)
  const padHazard = new THREE.Mesh(
    new THREE.RingGeometry(9.8, 11.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xf2c14e })
  );
  padHazard.rotation.x = -Math.PI / 2;
  padHazard.position.set(36, 0.03, -12);
  padGroup.add(padHazard);

  const padBase = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.6, 0.52, 40), concreteMat);
  padBase.position.set(36, 0.26, -12);
  padGroup.add(padBase);

  // Flame Trench Grate Center
  const trenchRing = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 3.0, 0.62, 24),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6, metalness: 0.8 })
  );
  trenchRing.position.set(36, 0.28, -12);
  padGroup.add(trenchRing);

  // Umbilical Launch Tower Lattice at (30, 0, -12)
  const tower = new THREE.Group();
  tower.position.set(30, 0, -12);
  [
    [-0.65, -0.65],
    [0.65, -0.65],
    [-0.65, 0.65],
    [0.65, 0.65],
  ].forEach(([cx, cz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 20, 0.26), gantryMat);
    leg.position.set(cx, 10, cz);
    tower.add(leg);
  });

  // Horizontal tower platforms & X-bracing
  for (let y = 2.5; y <= 18; y += 3.1) {
    const levelRing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 1.6), gantryMat);
    levelRing.position.y = y;
    tower.add(levelRing);
  }

  // Retractable Umbilical Arms extending toward rocket at X=+6
  [5.8, 10.6].forEach((armY) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.32, 0.38), gantryMat);
    arm.position.set(2.8, armY, 0);
    tower.add(arm);
  });
  padGroup.add(tower);

  // Overhead Traveling Bridge Crane Rails
  const rail1 = new THREE.Mesh(new THREE.BoxGeometry(40, 1.1, 1.1), craneYellowMat);
  rail1.position.set(30, 13, -2);
  padGroup.add(rail1);

  const rail2 = new THREE.Mesh(new THREE.BoxGeometry(40, 1.1, 1.1), craneYellowMat);
  rail2.position.set(30, 13, -22);
  padGroup.add(rail2);

  const gantryHoist = new THREE.Group();
  gantryHoist.position.set(30, 12.4, -12);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 2.6), craneYellowMat);
  gantryHoist.add(trolley);
  padGroup.add(gantryHoist);

  const craneHoistCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 3.5, 10),
    gantryMat
  );
  craneHoistCable.position.set(30, 10.2, -12);
  padGroup.add(craneHoistCable);

  const hoistBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0x4fe3d4 })
  );
  hoistBeacon.position.set(30, 8.2, -12);
  padGroup.add(hoistBeacon);

  // =====================================
  // MULTI-STAGE DETAILED ROCKET ON PAD
  // =====================================
  const rocketGroup = new THREE.Group();
  rocketGroup.position.set(36, 0.52, -12);
  rocketGroup.visible = false;

  const whiteHullMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.28, metalness: 0.35 });
  const redAccentMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.35 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.88 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.85 });

  const motorStage = new THREE.Group();
  // Core stage body
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.96, 6.2, 28), whiteHullMat);
  stage1.position.y = 3.5;
  motorStage.add(stage1);

  // Interstage black & gold band
  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.93, 0.9, 28), darkMetalMat);
  interstage.position.y = 6.95;
  motorStage.add(interstage);

  // Upper tank
  const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.92, 2.2, 28), whiteHullMat);
  stage2.position.y = 8.5;
  motorStage.add(stage2);

  // Red swept aerodynamic delta fins (3 fins)
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 1.55), redAccentMat);
    fin.position.set(Math.cos(a) * 1.15, 1.5, Math.sin(a) * 1.15);
    fin.rotation.y = -a;
    motorStage.add(fin);
  }

  // Main Engine Bell Cluster
  const bellPts = [
    new THREE.Vector2(0.15, 0.65),
    new THREE.Vector2(0.28, 0.4),
    new THREE.Vector2(0.55, 0),
  ];
  const bellMesh = new THREE.Mesh(
    new THREE.LatheGeometry(bellPts, 24),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.25, metalness: 0.9, side: THREE.DoubleSide })
  );
  bellMesh.position.y = -0.1;
  motorStage.add(bellMesh);

  rocketGroup.add(motorStage);

  // Payload Fairing + Dynamic Instrument Markers
  const payloadBay = new THREE.Group();
  payloadBay.position.y = 9.6;

  const fairingBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.88, 1.3, 28), whiteHullMat);
  fairingBase.position.y = 0.65;
  payloadBay.add(fairingBase);

  const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.3, 28), redAccentMat);
  noseCone.position.y = 2.45;
  payloadBay.add(noseCone);

  const escapeTower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 1.1, 12), whiteHullMat);
  escapeTower.position.y = 3.95;
  payloadBay.add(escapeTower);

  // Dynamic attached external instrument pods on fairing (updated when crates selected)
  const thermPod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 12), goldMat);
  thermPod.position.set(0.95, 0.6, 0);
  thermPod.visible = false;
  payloadBay.add(thermPod);

  const baroPod = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 }));
  baroPod.position.set(-0.92, 0.6, 0);
  baroPod.visible = false;
  payloadBay.add(baroPod);

  const camWindow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.22, 18),
    new THREE.MeshPhysicalMaterial({ color: 0x0284c7, roughness: 0.05, clearcoat: 1.0, emissive: 0x0369a1, emissiveIntensity: 0.45 })
  );
  camWindow.rotation.x = Math.PI / 2;
  camWindow.position.set(0, 0.75, 0.9);
  camWindow.visible = false;
  payloadBay.add(camWindow);

  rocketGroup.add(payloadBay);

  // Exhaust Plume Group (inner white-hot core + outer orange cone)
  const flame = new THREE.Group();
  flame.position.y = -0.15;
  const outerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 5.2, 20),
    new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.85 })
  );
  outerFlame.rotation.x = Math.PI;
  outerFlame.position.y = -2.6;
  flame.add(outerFlame);

  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 3.2, 16),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  innerFlame.rotation.x = Math.PI;
  innerFlame.position.y = -1.6;
  flame.add(innerFlame);

  flame.visible = false;
  rocketGroup.add(flame);

  const updateConfiguration = (items: Set<string>, motorKey: string | null) => {
    thermPod.visible = items.has('t');
    baroPod.visible = items.has('b');
    camWindow.visible = items.has('c');
    const scaleY = motorKey ? ({ s: 0.85, m: 1.0, x: 1.18, l: 1.38 }[motorKey] ?? 1.0) : 1.0;
    rocketGroup.scale.set(motorKey === 'l' ? 1.15 : 1, scaleY, motorKey === 'l' ? 1.15 : 1);
  };

  return {
    padGroup,
    rocket: { group: rocketGroup, flame, payloadBay, motorStage, updateConfiguration },
    gantryHoist,
    craneHoistCable,
    hoistBeacon,
  };
}

export function buildHangarShowcaseSatellite(): THREE.Group {
  const standGroup = new THREE.Group();
  standGroup.position.set(22, 0, -6);

  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.75, 1.15, 24),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.85 })
  );
  ped.position.y = 0.58;
  standGroup.add(ped);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.05, 12, 36),
    new THREE.MeshBasicMaterial({ color: 0x4fe3d4 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.16;
  standGroup.add(ring);

  const rig = buildDetailedSatelliteRig();
  rig.skeletonGuide.visible = false;
  // Show full assembled satellite on hangar showcase pedestal
  Object.values(rig.parts).forEach((p) => {
    p.visible = true;
  });
  Object.values(rig.dropSlots).forEach((s) => {
    s.ring.visible = false;
    s.ghost.visible = false;
  });
  rig.root.scale.setScalar(0.88);
  rig.root.position.y = 2.65;
  standGroup.add(rig.root);

  return standGroup;
}
