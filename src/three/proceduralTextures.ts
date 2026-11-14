import * as THREE from 'three';

export function makeFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#141b29';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle brushed metal panel variation
  ctx.fillStyle = '#182132';
  ctx.fillRect(6, 6, 244, 244);
  ctx.fillRect(262, 262, 244, 244);

  ctx.strokeStyle = '#28354d';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.strokeRect(260, 4, 248, 248);
  ctx.strokeRect(4, 260, 248, 248);
  ctx.strokeRect(260, 260, 248, 248);

  // Inner panel seam
  ctx.strokeStyle = 'rgba(79, 227, 212, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, 220, 220);
  ctx.strokeRect(274, 18, 220, 220);
  ctx.strokeRect(18, 274, 220, 220);
  ctx.strokeRect(274, 274, 220, 220);

  // Rivets
  ctx.fillStyle = '#475978';
  [16, 240, 272, 496].forEach((x) => {
    [16, 240, 272, 496].forEach((y) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 18);
  return tex;
}

export function makeHangarFloorTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#151b26';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#253042';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle yellow industrial markings on edges
  ctx.fillStyle = 'rgba(242, 193, 78, 0.14)';
  ctx.fillRect(0, 0, 512, 8);
  ctx.fillRect(0, 504, 512, 8);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}

export function makeSolarCellTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Deep photovoltaic blue-indigo base
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#0f2557');
  grad.addColorStop(0.5, '#173a8a');
  grad.addColorStop(1, '#0d1f4d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const cols = 4;
  const rows = 8;
  const cw = 512 / cols;
  const ch = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw;
      const y = r * ch;

      // Cell border
      ctx.strokeStyle = '#091536';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4);

      // Silver busbars inside each cell
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.25, y + 4);
      ctx.lineTo(x + cw * 0.25, y + ch - 4);
      ctx.moveTo(x + cw * 0.75, y + 4);
      ctx.lineTo(x + cw * 0.75, y + ch - 4);
      ctx.stroke();

      // Fine horizontal collector fingers
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.2)';
      ctx.lineWidth = 1;
      for (let fy = y + 10; fy < y + ch - 6; fy += 10) {
        ctx.beginPath();
        ctx.moveTo(x + 6, fy);
        ctx.lineTo(x + cw - 6, fy);
        ctx.stroke();
      }

      // Corner chamfer dots
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(x + 3, y + 3, 4, 4);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeGoldMLITexture(): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const b = document.createElement('canvas');
  b.width = 256;
  b.height = 256;
  const bctx = b.getContext('2d')!;

  ctx.fillStyle = '#d9910e';
  ctx.fillRect(0, 0, 256, 256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);

  // Crinkled Kapton foil facets
  for (let i = 0; i < 240; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
    const px = Math.abs(x) * 256;
    const py = Math.abs(y) * 256;
    const size = 12 + (i % 18);
    const bright = 0.75 + ((i % 7) / 7) * 0.45;

    ctx.fillStyle = i % 2 === 0 ? `rgba(255, 215, 80, ${0.22 * bright})` : `rgba(146, 84, 6, ${0.28 * bright})`;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + size, py + (i % 9) - 4);
    ctx.lineTo(px + size * 0.4, py + size);
    ctx.closePath();
    ctx.fill();

    const gVal = i % 2 === 0 ? 190 : 75;
    bctx.fillStyle = `rgb(${gVal},${gVal},${gVal})`;
    bctx.beginPath();
    bctx.moveTo(px, py);
    bctx.lineTo(px + size, py + (i % 9) - 4);
    bctx.lineTo(px + size * 0.4, py + size);
    bctx.closePath();
    bctx.fill();
  }

  // Thermal blanket seam grid
  ctx.strokeStyle = 'rgba(120, 62, 4, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 124, 124);
  ctx.strokeRect(130, 2, 124, 124);
  ctx.strokeRect(2, 130, 124, 124);
  ctx.strokeRect(130, 130, 124, 124);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(b);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

export function makeGaugeDialTexture(label = 'kPa'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#071326';
  ctx.beginPath();
  ctx.arc(128, 128, 122, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Ticks
  for (let i = 0; i <= 24; i++) {
    const a = (-Math.PI * 0.75) + (i / 24) * (Math.PI * 1.5);
    const r1 = i % 4 === 0 ? 84 : 96;
    const r2 = 108;
    ctx.strokeStyle = i > 18 ? '#f87171' : '#94a3b8';
    ctx.lineWidth = i % 4 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
    ctx.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2);
    ctx.stroke();
  }

  // Needle
  ctx.strokeStyle = '#4fe3d4';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(185, 78);
  ctx.stroke();

  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(128, 128, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 195);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeMotorCasingTexture(accentHex: string, code: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  // Dark upper/lower collar bands
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillRect(0, 448, 512, 64);

  // Accent stripe
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 82, 512, 42);
  ctx.fillRect(0, 390, 512, 24);

  // Vertical panel lines
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.lineWidth = 3;
  for (let x = 64; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x, 448);
    ctx.stroke();
  }

  // Stencil code
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, 256, 260);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('GALAXY-X PROPULSION', 256, 305);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeServerRackTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0c1322';
  ctx.fillRect(0, 0, 256, 512);

  for (let y = 16; y < 490; y += 36) {
    ctx.fillStyle = '#182235';
    ctx.fillRect(14, y, 228, 28);
    ctx.strokeStyle = '#2a3954';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, y, 228, 28);

    for (let x = 26; x < 160; x += 14) {
      const active = ((x * 7 + y * 3) % 5) === 0;
      ctx.fillStyle = active ? '#4fe3d4' : ((x + y) % 11 === 0 ? '#f2c14e' : '#1e3a5f');
      ctx.fillRect(x, y + 10, 7, 7);
    }
    // Vent slots
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(175, y + 7, 56, 14);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeEarthHologramTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#07244d';
  ctx.fillRect(0, 0, 512, 256);

  // Grid lines
  ctx.strokeStyle = 'rgba(79, 227, 212, 0.2)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Stylized continent silhouettes
  ctx.fillStyle = 'rgba(52, 211, 153, 0.65)';
  const blobs = [
    [95, 78, 38, 26],
    [130, 145, 24, 42],
    [245, 72, 46, 28],
    [265, 132, 34, 48],
    [350, 82, 58, 36],
    [400, 165, 30, 22],
  ];
  blobs.forEach(([bx, by, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(bx, by, rx, ry, 0.25, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeContactShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
