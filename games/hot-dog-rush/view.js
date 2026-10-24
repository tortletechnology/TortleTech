import * as THREE from "./vendor/three.module.min.js";
import { LAYOUT } from "./layout.js";

const PI = Math.PI;
const matCache = new Map();
const G = {};
const PINK = new THREE.Color("#f0a0b0");
const BROWN = new THREE.Color("#8a3e18");
const BLACK = new THREE.Color("#241c18");
const GOLD = new THREE.Color("#ffd56a");
const AMBER = new THREE.Color("#8a7048");

function geos() {
  if (G.ready) return;
  G.sphere = new THREE.SphereGeometry(1, 22, 16);
  G.head = new THREE.SphereGeometry(1, 48, 36);
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.cyl = new THREE.CylinderGeometry(1, 1, 1, 18);
  G.cone = new THREE.ConeGeometry(1, 1, 12);
  G.sausage = new THREE.CapsuleGeometry(0.075, 0.28, 4, 10);
  G.plane = new THREE.PlaneGeometry(1, 1);
  G.ready = true;
}

function colorOf(value) {
  if (value instanceof THREE.Color) return value.getHex();
  if (typeof value === "string") return new THREE.Color(value).getHex();
  return value;
}

function M(color, rough = 0.62, metal = 0.02, opts = {}) {
  const hex = colorOf(color);
  const key = [hex, rough, metal, opts.opacity ?? 1, opts.emissive ?? 0, opts.emissiveIntensity ?? 0].join("|");
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: rough,
        metalness: metal,
        transparent: (opts.opacity ?? 1) < 1,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? (opts.emissive ? 0.7 : 0),
      }),
    );
  }
  return matCache.get(key);
}

function uniqueMat(color, rough = 0.5, metal = 0.04, opts = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: colorOf(color),
    roughness: rough,
    metalness: metal,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    map: opts.map ?? null,
  });
  material.userData.unique = true;
  return material;
}

function darken(color, amount) {
  const next = new THREE.Color(color);
  next.multiplyScalar(1 - amount);
  return next.getHex();
}

function part(geo, material, parent, x, y, z, sx = 1, sy = sx, sz = sy) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

function skinMat(color) {
  const hex = colorOf(color);
  const key = `basic|${hex}`;
  if (!matCache.has(key)) {
    const material = new THREE.MeshBasicMaterial({ color: hex });
    material.toneMapped = false;
    matCache.set(key, material);
  }
  return matCache.get(key);
}

function rgba(color, alpha) {
  const next = new THREE.Color(color);
  return `rgba(${Math.round(next.r * 255)}, ${Math.round(next.g * 255)}, ${Math.round(next.b * 255)}, ${alpha})`;
}

// Eyes sit on the painted head. 3D glasses and blink lids use the same spot.
const FACE_EYE = { px: 86, py: 214 };

function eyeAnchor(scale) {
  const around = (FACE_EYE.px / 1024) * Math.PI * 2;
  const theta = (FACE_EYE.py / 512) * Math.PI;
  return {
    x: Math.sin(around) * scale.x,
    y: Math.cos(theta) * scale.y,
    z: Math.cos(around) * Math.sin(theta) * scale.z + 0.045,
  };
}

function paintPortrait(g, def) {
  const W = 1024;
  const H = 512;
  const skin = def.id === "washington" ? "#f7f1e6" : def.skin;
  const hair = def.hairColor;
  const ink = "#24160f";
  const cx = 512;
  const cy = 268;
  const rx = def.id === "lincoln" ? 158 : def.id === "teddy" ? 228 : def.id === "bush" ? 206 : 198;
  const ry = def.id === "lincoln" ? 214 : def.id === "teddy" ? 176 : 196;

  g.fillStyle = hair;
  g.fillRect(0, 0, W, H);
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(cx, cy + (def.id === "lincoln" ? 16 : 0), rx, ry, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = "rgba(255,255,255,0.22)";
  g.beginPath();
  g.ellipse(cx - 24, cy - ry * 0.42, rx * 0.42, ry * 0.2, -0.25, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(80, 36, 28, 0.14)";
  g.beginPath();
  g.ellipse(cx - rx * 0.62, cy + 24, 42, 64, 0.2, 0, Math.PI * 2);
  g.ellipse(cx + rx * 0.62, cy + 24, 42, 64, -0.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = rgba(def.blush, 0.55);
  g.beginPath();
  g.ellipse(cx - 108, cy + 36, 48, 30, 0, 0, Math.PI * 2);
  g.ellipse(cx + 108, cy + 36, 48, 30, 0, 0, Math.PI * 2);
  g.fill();

  paintHair(g, def, cx, cy, rx, ry, hair, skin);
  paintFace(g, def, cx, cy, ink, skin);

  g.strokeStyle = "rgba(36, 22, 15, 0.35)";
  g.lineWidth = 10;
  g.beginPath();
  g.ellipse(cx, cy + (def.id === "lincoln" ? 16 : 0), rx, ry, 0, 0, Math.PI * 2);
  g.stroke();
}

function paintHair(g, def, cx, cy, rx, ry, hair, skin) {
  g.fillStyle = hair;
  const id = def.id;
  if (id === "bush") {
    g.beginPath();
    g.ellipse(cx, cy - ry * 1.02, 130, 34, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx - 150, cy - ry * 0.72, 36, 42, 0.5, 0, Math.PI * 2);
    g.ellipse(cx + 148, cy - ry * 0.7, 36, 42, -0.45, 0, Math.PI * 2);
    g.fill();
  } else if (id === "lincoln") {
    g.fillStyle = skin;
    g.fillRect(cx - 70, 40, 150, 120);
    g.fillStyle = hair;
    g.beginPath();
    g.ellipse(cx - 130, cy - 10, 54, 150, 0.15, 0, Math.PI * 2);
    g.ellipse(cx + 130, cy - 10, 54, 150, -0.15, 0, Math.PI * 2);
    g.fill();
    g.fillRect(0, 300, 180, 212);
    g.fillRect(844, 300, 180, 212);
    g.fillRect(cx - 150, cy + 90, 300, 160);
  } else if (id === "obama") {
    g.beginPath();
    g.ellipse(cx, cy - ry * 0.62, rx * 0.92, 78, 0, Math.PI, 0, true);
    g.fill();
    g.fillRect(cx - rx, 70, rx * 2, 70);
    g.beginPath();
    g.ellipse(cx - 150, cy + 10, 60, 140, 0.2, 0, Math.PI * 2);
    g.ellipse(cx + 150, cy + 10, 60, 140, -0.2, 0, Math.PI * 2);
    g.fill();
  } else if (id === "teddy") {
    g.beginPath();
    g.ellipse(cx, cy - ry * 0.7, 200, 70, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx - 170, cy, 70, 120, 0.2, 0, Math.PI * 2);
    g.ellipse(cx + 170, cy, 70, 120, -0.2, 0, Math.PI * 2);
    g.fill();
  } else if (id === "trump") {
    const blond = "#ffe14a";
    g.fillStyle = blond;
    g.beginPath();
    g.ellipse(cx + 70, cy - ry * 0.78, 210, 62, -0.35, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx + 150, cy - 30, 90, 70, -0.6, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(cx - 40, cy - 150);
    g.quadraticCurveTo(cx + 180, cy - 210, cx + 210, cy - 20);
    g.quadraticCurveTo(cx + 80, cy - 80, cx - 40, cy - 150);
    g.fill();
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(cx - 40, cy - 120, 70, 28, 0.4, 0, Math.PI * 2);
    g.fill();
  } else if (id === "washington") {
    g.fillStyle = "#f7f4ee";
    g.beginPath();
    g.ellipse(cx, cy - ry * 0.55, 230, 100, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx - 168, cy + 20, 78, 110, 0.4, 0, Math.PI * 2);
    g.ellipse(cx + 168, cy + 20, 78, 110, -0.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e7e0d4";
    g.beginPath();
    g.ellipse(cx - 168, cy + 50, 36, 70, 0.3, 0, Math.PI * 2);
    g.ellipse(cx + 168, cy + 50, 36, 70, -0.3, 0, Math.PI * 2);
    g.fill();
  } else if (id === "biden") {
    g.fillStyle = "#f4f1ea";
    g.beginPath();
    g.ellipse(cx - 150, cy - 10, 72, 140, 0.25, 0, Math.PI * 2);
    g.ellipse(cx + 150, cy - 10, 72, 140, -0.25, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy - ry * 0.78, 120, 36, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(cx, cy - 130, 90, 34, 0, 0, Math.PI * 2);
    g.fill();
  } else if (id === "jfk") {
    g.beginPath();
    g.ellipse(cx + 16, cy - ry * 0.72, 200, 72, -0.2, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(cx - 80, cy - 150);
    g.quadraticCurveTo(cx + 40, cy - 230, cx + 150, cy - 120);
    g.quadraticCurveTo(cx + 40, cy - 150, cx - 80, cy - 150);
    g.fill();
    g.beginPath();
    g.ellipse(cx - 150, cy, 64, 130, 0.2, 0, Math.PI * 2);
    g.ellipse(cx + 155, cy, 64, 130, -0.15, 0, Math.PI * 2);
    g.fill();
  } else if (id === "reagan") {
    g.beginPath();
    g.ellipse(cx, cy - ry * 0.85, 170, 78, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy - ry * 0.55, 210, 48, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx - 155, cy - 10, 66, 120, 0.15, 0, Math.PI * 2);
    g.ellipse(cx + 155, cy - 10, 66, 120, -0.15, 0, Math.PI * 2);
    g.fill();
  }
}

function paintEye(g, x, y, kind, ink) {
  g.save();
  g.translate(x, y);
  if (kind === "squint") g.scale(1.05, 0.4);
  else if (kind === "soft") g.scale(1, 0.62);
  else if (kind === "lincoln") g.scale(0.82, 0.7);
  g.fillStyle = "#fffdf8";
  g.beginPath();
  g.ellipse(0, 0, 34, 26, 0, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = ink;
  g.stroke();
  g.fillStyle = kind === "obama" ? "#4a2c1c" : "#1a120e";
  g.beginPath();
  g.arc(3, 2, kind === "squint" ? 9 : 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(-5, -6, 5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  if (kind === "squint" || kind === "soft") {
    g.strokeStyle = ink;
    g.lineWidth = kind === "squint" ? 8 : 6;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x - 40, y - 4);
    g.quadraticCurveTo(x, y - (kind === "squint" ? 16 : 22), x + 40, y - 2);
    g.stroke();
  }
}

function paintBrow(g, x, y, style, side, ink, hair) {
  g.strokeStyle = style === "bush" ? "#6d645c" : hair;
  g.lineWidth = style === "thick" ? 14 : style === "up" ? 9 : 7;
  g.lineCap = "round";
  g.beginPath();
  const lift = style === "up" || style === "thick" ? -16 * side : 0;
  g.moveTo(x - 32, y + lift);
  g.quadraticCurveTo(x, y - 10, x + 32, y - lift);
  g.stroke();
}

function paintMouth(g, x, y, kind, ink) {
  g.lineCap = "round";
  g.lineJoin = "round";
  if (kind === "grin") {
    g.fillStyle = "#6e2430";
    g.beginPath();
    g.moveTo(x - 62, y);
    g.quadraticCurveTo(x, y + 58, x + 62, y);
    g.quadraticCurveTo(x, y + 8, x - 62, y);
    g.fill();
    g.fillStyle = "#fffaf4";
    g.fillRect(x - 46, y + 2, 92, 16);
    g.strokeStyle = ink;
    g.lineWidth = 5;
    g.stroke();
  } else if (kind === "smirk") {
    g.strokeStyle = "#7a3030";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(x - 34, y + 6);
    g.quadraticCurveTo(x + 8, y + 22, x + 52, y - 12);
    g.stroke();
  } else {
    g.strokeStyle = "#7a3030";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(x - 30, y);
    g.quadraticCurveTo(x, y + 18, x + 30, y);
    g.stroke();
  }
}

function paintFace(g, def, cx, cy, ink, skin) {
  const eyeKind = def.id === "obama" ? "obama" : def.id === "lincoln" ? "lincoln" : def.eye;
  const brow = def.id === "bush" ? "bush" : def.brows;
  [-1, 1].forEach((side) => {
    paintBrow(g, cx + side * FACE_EYE.px, FACE_EYE.py - 42, brow, side, ink, def.hairColor);
    paintEye(g, cx + side * FACE_EYE.px, FACE_EYE.py, eyeKind, ink);
  });
  g.fillStyle = rgba(skin, 1);
  g.strokeStyle = "rgba(90, 50, 40, 0.35)";
  g.lineWidth = 4;
  const nose = def.id === "lincoln" ? 34 : def.id === "bush" ? 26 : 20;
  g.beginPath();
  g.moveTo(cx, cy - 36);
  g.quadraticCurveTo(cx + nose, cy + 8, cx + 12, cy + 22);
  g.quadraticCurveTo(cx, cy + 30, cx - 12, cy + 22);
  g.quadraticCurveTo(cx - nose * 0.4, cy + 8, cx, cy - 36);
  g.fill();
  g.stroke();
  g.fillStyle = "rgba(90, 40, 36, 0.45)";
  g.beginPath();
  g.ellipse(cx - 14, cy + 24, 7, 5, 0, 0, Math.PI * 2);
  g.ellipse(cx + 14, cy + 24, 7, 5, 0, 0, Math.PI * 2);
  g.fill();

  const smile = def.id === "lincoln" ? "soft" : def.smile;
  paintMouth(g, cx + (smile === "smirk" ? 8 : 0), cy + 78, smile, ink);

  if (def.id === "lincoln") {
    g.fillStyle = "#16120f";
    g.beginPath();
    g.moveTo(cx - 120, cy + 40);
    g.quadraticCurveTo(cx - 140, cy + 130, cx, cy + 190);
    g.quadraticCurveTo(cx + 140, cy + 130, cx + 120, cy + 40);
    g.quadraticCurveTo(cx + 90, cy + 70, cx, cy + 78);
    g.quadraticCurveTo(cx - 90, cy + 70, cx - 120, cy + 40);
    g.fill();
    g.beginPath();
    g.ellipse(cx, cy + 168, 28, 46, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (def.mustache) {
    g.fillStyle = "#4a3422";
    g.beginPath();
    g.ellipse(cx, cy + 62, 78, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(cx - 62, cy + 74, 28, 18, 0.4, 0, Math.PI * 2);
    g.ellipse(cx + 62, cy + 74, 28, 18, -0.4, 0, Math.PI * 2);
    g.fill();
  }
  if (def.id === "reagan") {
    g.strokeStyle = "rgba(90, 50, 40, 0.35)";
    g.lineWidth = 3;
    [-1, 1].forEach((side) => {
      g.beginPath();
      g.moveTo(cx + side * 48, cy + 48);
      g.quadraticCurveTo(cx + side * 90, cy + 70, cx + side * 70, cy + 96);
      g.stroke();
    });
  }
}

function portraitMaterial(def) {
  const map = canvasTexture((g) => paintPortrait(g, def), 1024, 512);
  map.anisotropy = 8;
  const material = new THREE.MeshBasicMaterial({ map });
  material.toneMapped = false;
  material.userData.unique = true;
  return material;
}

function canvasTexture(draw, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function softTexture() {
  return canvasTexture((g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,255,255,0.85)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }, 128, 128);
}

function apronTexture(def) {
  return canvasTexture((g, w, h) => {
    g.fillStyle = def.apron;
    g.fillRect(0, 0, w, h);
    g.fillStyle = def.stripe;
    g.fillRect(0, 0, 42, h);
    g.fillRect(w - 42, 0, 42, h);
    g.fillStyle = "#24160f";
    g.font = "800 86px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(def.apronWord, w / 2, h * 0.4);
    g.font = "700 48px Arial, sans-serif";
    g.fillStyle = def.accent;
    g.fillText(def.pin, w / 2, h * 0.58);
    g.strokeStyle = "#e4d3bc";
    g.lineWidth = 8;
    g.strokeRect(w * 0.32, h * 0.68, w * 0.36, h * 0.2);
  }, 512, 512);
}

function floorTexture() {
  return canvasTexture((g, w, h) => {
    const cells = 8;
    const size = w / cells;
    for (let y = 0; y < cells; y += 1) {
      for (let x = 0; x < cells; x += 1) {
        const alt = (x + y) % 2 === 0;
        g.fillStyle = alt ? "#f0d2ae" : "#d4844e";
        g.fillRect(x * size, y * size, size + 1, size + 1);
        g.fillStyle = alt ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
        g.fillRect(x * size + 6, y * size + 6, 10, 8);
      }
    }
  }, 512, 512);
}

function floorSign(text) {
  const tex = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(20, 10, 8, 0.82)";
    g.beginPath();
    g.roundRect(8, 20, w - 16, h - 40, 28);
    g.fill();
    g.fillStyle = "#fff6ea";
    g.font = "800 72px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2);
  }, 360, 140);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.34),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -PI / 2;
  return mesh;
}

function plateBadge(n) {
  const tex = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#c2410c";
    g.font = "800 210px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), w / 2, h / 2 + 10);
  }, 256, 256);
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.15, 24),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -PI / 2;
  mesh.position.y = 0.04;
  return mesh;
}

function hitBox(parent, pick, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  mesh.position.set(x, y, z);
  mesh.userData.pick = pick;
  parent.add(mesh);
  return mesh;
}

export function paintOrderBubble(sprite, order) {
  if (!sprite) return;
  if (!order) {
    sprite.visible = false;
    return;
  }
  const tex = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#fffaf3";
    g.beginPath();
    g.roundRect(10, 8, w - 20, h - 36, 28);
    g.fill();
    g.beginPath();
    g.moveTo(w / 2 - 14, h - 36);
    g.lineTo(w / 2, h - 8);
    g.lineTo(w / 2 + 14, h - 36);
    g.fill();
    g.fillStyle = "#f2c48a";
    g.beginPath();
    g.ellipse(w / 2, 58, 78, 26, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#8a3e18";
    g.fillRect(w / 2 - 62, 50, 124, 18);
    const colors = { ketchup: "#d3262b", mustard: "#e2b31f", relish: "#2f9e44", onion: "#f7f1e4" };
    if (!order.toppings.length) {
      g.fillStyle = "#6d564c";
      g.font = "800 28px Arial, sans-serif";
      g.textAlign = "center";
      g.fillText("PLAIN", w / 2, 108);
    } else {
      order.toppings.forEach((id, index) => {
        g.fillStyle = colors[id] || "#fff";
        g.beginPath();
        g.arc(w / 2 - 42 + index * 28, 108, 10, 0, Math.PI * 2);
        g.fill();
      });
    }
    const mood = Math.max(0, Math.min(1, order.patience / order.maxPatience));
    g.fillStyle = "rgba(36,22,15,0.12)";
    g.fillRect(28, 18, w - 56, 8);
    g.fillStyle = mood > 0.35 ? "#2f9e44" : "#d7263d";
    g.fillRect(28, 18, (w - 56) * mood, 8);
  }, 280, 150);
  if (sprite.material.map) sprite.material.map.dispose();
  sprite.material.map = tex;
  sprite.material.needsUpdate = true;
  sprite.visible = true;
}

function orderBubble() {
  const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.92, 0.5, 1);
  sprite.position.set(0, 1.58, 0.12);
  sprite.visible = false;
  return sprite;
}

function stationLabel(text) {
  const tex = canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(20, 10, 8, 0.9)";
    g.beginPath();
    g.roundRect(6, 10, w - 12, h - 20, 36);
    g.fill();
    g.fillStyle = "#fff6ea";
    g.font = "800 78px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 2);
  }, 360, 140);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(0.86, 0.34, 1);
  return sprite;
}

function signTexture(text, color) {
  return canvasTexture((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = "800 150px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 28;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 8;
    g.fillText(text, w / 2, h / 2);
  }, 1024, 256);
}

function addEye(head, x, style) {
  const squint = style === "squint" || style === "soft";
  const eye = part(G.sphere, M(0xfffaf6, 0.28, 0.04), head, x, 0.08, 0.38, 0.095, squint ? 0.032 : 0.1, 0.062);
  part(G.sphere, M(0x1a120e, 0.35, 0), eye, 0, 0, 0.62, 0.46, squint ? 0.7 : 0.46, 0.46);
  part(G.sphere, M(0xffffff, 0.15, 0), eye, 0.22, 0.22, 0.85, 0.18, 0.18, 0.18);
  return eye;
}

function addBrows(head, style) {
  [-1, 1].forEach((side) => {
    const brow = part(G.box, M(0x24180f, 0.8, 0), head, side * 0.15, 0.2, 0.38, 0.12, style === "thick" ? 0.045 : 0.028, 0.04);
    if (style === "up" || style === "thick") brow.rotation.z = side > 0 ? -0.4 : 0.4;
  });
}

function addSmile(head, style) {
  const radius = style === "grin" ? 0.15 : style === "smirk" ? 0.11 : 0.12;
  const smile = new THREE.Mesh(new THREE.TorusGeometry(radius, style === "grin" ? 0.03 : 0.024, 8, 18, Math.PI), M(0x5a302c, 0.55, 0));
  smile.position.set(style === "smirk" ? 0.03 : 0, -0.12, 0.38);
  smile.rotation.z = Math.PI + (style === "smirk" ? -0.35 : 0);
  head.add(smile);
}

function addHair(head, def) {
  const hair = skinMat(def.hairColor);
  const style = def.hair;
  if (style === "bush") {
    const hat = skinMat(0xf7f4ee);
    part(G.cyl, hat, head, 0, 0.58, 0.02, 0.4, 0.42, 0.4);
    part(G.sphere, hat, head, 0, 0.86, 0.02, 0.34, 0.16, 0.34);
    part(G.sphere, hair, head, -0.28, 0.08, 0.1, 0.1, 0.08, 0.1);
    part(G.sphere, hair, head, 0.28, 0.08, 0.1, 0.1, 0.08, 0.1);
  } else if (style === "lincoln") {
    part(G.sphere, hair, head, -0.22, 0.08, 0.02, 0.12, 0.2, 0.14);
    part(G.sphere, hair, head, 0.22, 0.08, 0.02, 0.12, 0.2, 0.14);
    const felt = skinMat(0x14120f);
    const brim = part(G.cyl, felt, head, 0, 0.68, 0, 0.72, 0.04, 0.72);
    const crown = part(G.box, felt, head, 0, 1.08, 0, 0.36, 0.78, 0.36);
    part(G.box, skinMat(0x6b3a28), head, 0, 0.78, 0.02, 0.38, 0.06, 0.38);
    brim.frustumCulled = false;
    crown.frustumCulled = false;
  } else if (style === "obama") {
    part(G.sphere, hair, head, 0, 0.28, 0.06, 0.4, 0.12, 0.32);
  } else if (style === "teddy") {
    part(G.sphere, hair, head, 0, 0.32, 0.08, 0.36, 0.12, 0.28);
  } else if (style === "trump") {
    const blond = skinMat(0xffe14a);
    part(G.sphere, blond, head, 0.12, 0.34, 0.3, 0.42, 0.12, 0.22);
    part(G.sphere, blond, head, 0.28, 0.46, 0.22, 0.28, 0.18, 0.2);
    part(G.sphere, blond, head, 0.36, 0.16, 0.2, 0.16, 0.2, 0.12);
  } else if (style === "washington") {
    const wig = skinMat(0xf7f4ee);
    part(G.sphere, wig, head, 0, 0.32, 0.08, 0.4, 0.16, 0.32);
    part(G.sphere, wig, head, -0.36, 0.02, 0.16, 0.14, 0.26, 0.14);
    part(G.sphere, wig, head, 0.36, 0.02, 0.16, 0.14, 0.26, 0.14);
    part(G.cyl, wig, head, 0, -0.22, -0.28, 0.07, 0.32, 0.07);
  } else if (style === "biden") {
    const white = skinMat(0xf4f1ea);
    part(G.sphere, white, head, -0.28, 0.16, 0.04, 0.14, 0.18, 0.16);
    part(G.sphere, white, head, 0.28, 0.16, 0.04, 0.14, 0.18, 0.16);
    part(G.sphere, white, head, 0, 0.34, -0.02, 0.28, 0.08, 0.22);
  } else if (style === "jfk") {
    part(G.sphere, hair, head, 0.06, 0.36, 0.18, 0.38, 0.12, 0.26);
    part(G.sphere, hair, head, 0.16, 0.44, 0.12, 0.22, 0.1, 0.18);
  } else if (style === "reagan") {
    part(G.sphere, hair, head, 0, 0.42, 0.1, 0.36, 0.14, 0.28);
    part(G.sphere, hair, head, 0, 0.32, 0.16, 0.4, 0.08, 0.24);
  }
}

function headScale(def) {
  if (def.id === "lincoln") return { x: 0.34, sy: 0.58, z: 0.36, y: 0.06 };
  if (def.id === "teddy") return { x: 0.5, sy: 0.44, z: 0.46, y: 0 };
  if (def.id === "bush") return { x: 0.46, sy: 0.44, z: 0.44, y: 0 };
  if (def.id === "washington") return { x: 0.46, sy: 0.48, z: 0.44, y: 0 };
  return { x: 0.44, sy: 0.47, z: 0.43, y: 0 };
}

function addGlasses(head, style, anchor) {
  if (style === "round") {
    [-1, 1].forEach((side) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 18), skinMat(0x1a1a1a));
      rim.position.set(side * anchor.x, anchor.y, anchor.z + 0.02);
      head.add(rim);
    });
    part(G.box, skinMat(0x1a1a1a), head, 0, anchor.y, anchor.z + 0.02, 0.08, 0.012, 0.012);
  } else if (style === "aviator") {
    const lens = new THREE.MeshBasicMaterial({ color: 0x1c3348, transparent: true, opacity: 0.45 });
    lens.userData.unique = true;
    [-1, 1].forEach((side) => {
      const glass = part(G.sphere, lens, head, side * anchor.x, anchor.y - 0.01, anchor.z, 0.11, 0.08, 0.02);
      glass.scale.set(0.11, 0.08, 0.02);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 18), skinMat(0xd4b15a));
      rim.position.set(side * anchor.x, anchor.y - 0.01, anchor.z + 0.02);
      rim.scale.set(1, 0.78, 1);
      head.add(rim);
    });
    part(G.box, skinMat(0xd4b15a), head, 0, anchor.y + 0.02, anchor.z + 0.02, 0.09, 0.014, 0.012);
  }
}

function addOutfit(bob, def) {
  const jacket = def.outfit === "khaki" ? def.shirt : def.suit;
  const pants = def.outfit === "colonial" ? 0xf3ecdf : def.outfit === "khaki" ? 0x6a4a28 : darken(def.suit, 0.28);
  part(G.box, M(jacket, 0.7, 0.04), bob, 0, 0.8, 0, 0.68, 0.56, 0.38);
  if (def.outfit === "suit") {
    part(G.box, M(def.shirt, 0.7, 0), bob, 0, 1.02, 0.16, 0.22, 0.12, 0.06);
  } else if (def.outfit === "khaki") {
    part(G.box, M(0x6e4c2b, 0.75, 0.02), bob, 0, 0.78, 0.16, 0.5, 0.42, 0.08);
  } else {
    [-0.12, 0, 0.12].forEach((x, i) => {
      part(G.sphere, M(0xe2c15a, 0.35, 0.6), bob, x, 0.9 - i * 0.02, 0.2, 0.035);
    });
  }
  const tieMat = M(def.tie, 0.45, 0.08);
  if (def.tieStyle === "long") {
    part(G.box, tieMat, bob, 0, 0.62, 0.28, 0.11, 0.78, 0.035);
    part(G.box, tieMat, bob, 0, 1.02, 0.22, 0.12, 0.1, 0.04);
  } else if (def.tieStyle === "standard") {
    part(G.box, tieMat, bob, 0, 1.0, 0.22, 0.1, 0.14, 0.04);
    part(G.box, tieMat, bob, 0, 0.9, 0.2, 0.12, 0.12, 0.03);
  } else if (def.tieStyle === "cravat") {
    part(G.sphere, M(0xf7f4ee, 0.7, 0), bob, 0, 1.0, 0.22, 0.12, 0.08, 0.08);
  } else if (def.tieStyle === "neckerchief") {
    const scarf = part(G.cone, M(def.tie, 0.7, 0), bob, 0, 0.98, 0.24, 0.1, 0.16, 0.08);
    scarf.rotation.x = PI;
  }
  const apron = part(G.box, uniqueMat(0xffffff, 0.86, 0, { map: apronTexture(def) }), bob, 0, 0.7, 0.23, 0.56, 0.5, 0.05);
  apron.material.color.set("#ffffff");
  return { pants };
}

function addLimb(bob, x, y, pants, def, side) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  bob.add(pivot);
  part(G.box, M(pants, 0.75, 0), pivot, 0, -0.2, 0, 0.18, 0.34, 0.2);
  const bootMat = M(def.bootColor, 0.62, 0.08);
  if (def.boots === "cowboy" || def.boots === "buckle") {
    part(G.box, bootMat, pivot, 0, -0.4, 0.05, 0.2, 0.16, 0.32);
    if (def.boots === "cowboy") part(G.sphere, M(0xe2c15a, 0.35, 0.65), pivot, side * 0.1, -0.36, 0.12, 0.035);
    if (def.boots === "buckle") part(G.box, M(0xe2c15a, 0.35, 0.65), pivot, 0, -0.36, 0.2, 0.08, 0.04, 0.02);
  } else {
    part(G.box, bootMat, pivot, 0, -0.4, 0.04, 0.18, 0.1, 0.26);
  }
  return pivot;
}

function addArm(bob, x, def) {
  const pivot = new THREE.Group();
  pivot.position.set(x, 1.02, 0);
  bob.add(pivot);
  const sleeve = def.outfit === "khaki" ? def.shirt : def.suit;
  part(G.box, M(sleeve, 0.7, 0.04), pivot, 0, -0.18, 0, 0.15, 0.32, 0.15);
  part(G.sphere, skinMat(def.skin), pivot, 0, -0.38, 0.02, 0.09);
  return pivot;
}

export function createPresident(def) {
  geos();
  const root = new THREE.Group();
  root.scale.setScalar(def.height || 1);
  const shadowTex = softTexture();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 20),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: 0x000000 }),
  );
  shadow.rotation.x = -PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const bob = new THREE.Group();
  root.add(bob);
  const { pants } = addOutfit(bob, def);
  const legL = addLimb(bob, -0.16, 0.52, pants, def, -1);
  const legR = addLimb(bob, 0.16, 0.52, pants, def, 1);
  const armL = addArm(bob, -0.44, def);
  const armR = addArm(bob, 0.44, def);

  const spat = new THREE.Group();
  spat.position.set(0.14, -0.32, 0.02);
  spat.rotation.set(-0.15, 0.2, 1.2);
  part(G.box, M(0x8a5a32, 0.55, 0), spat, 0, 0, 0, 0.04, 0.22, 0.04);
  part(G.box, M(0xd9e1e6, 0.28, 0.72), spat, 0, 0.16, 0, 0.11, 0.1, 0.016);
  armR.add(spat);

  const head = new THREE.Group();
  head.position.set(0, 1.42, 0);
  bob.add(head);
  const skull = headScale(def);
  const skullMesh = part(G.head, portraitMaterial(def), head, 0, skull.y, 0, skull.x, skull.sy, skull.z);
  // Sphere UVs put the texture center on +X. Turn that to +Z so the portrait faces the counter.
  skullMesh.rotation.y = -PI / 2;
  const ears = [-1, 1].map((side) => {
    const ear = part(
      G.sphere,
      skinMat(def.skin),
      head,
      side * (0.34 + Math.max(0, def.earScale - 1) * 0.16),
      skull.y - 0.02,
      0.02,
      0.09 * def.earScale,
      0.13 * def.earScale,
      0.06 * def.earScale,
    );
    part(G.sphere, skinMat(darken(def.skin, 0.08)), ear, 0, 0, 0.35, 0.4, 0.45, 0.3);
    return ear;
  });
  const anchor = eyeAnchor({ x: skull.x, y: skull.sy, z: skull.z });
  anchor.y += skull.y;
  const lids = [-1, 1].map((side) => part(G.sphere, skinMat(def.id === "washington" ? "#f7f1e6" : def.skin), head, side * anchor.x, anchor.y, anchor.z, 0.1, 0.018, 0.045));
  if (def.mustache) {
    part(G.box, skinMat(0x4a3422), head, 0, skull.y - 0.1, 0.46, 0.26, 0.07, 0.08);
    part(G.sphere, skinMat(0x4a3422), head, -0.14, skull.y - 0.12, 0.44, 0.07);
    part(G.sphere, skinMat(0x4a3422), head, 0.14, skull.y - 0.12, 0.44, 0.07);
  }
  if (def.beard === "lincoln") {
    part(G.sphere, skinMat(0x16120f), head, 0, skull.y - 0.28, 0.28, 0.22, 0.22, 0.16);
    part(G.sphere, skinMat(0x16120f), head, 0, skull.y - 0.46, 0.16, 0.08, 0.18, 0.08);
  }
  addHair(head, def);
  addGlasses(head, def.glasses, anchor);

  const hold = new THREE.Group();
  hold.position.set(-0.28, 0.95, 0.46);
  bob.add(hold);

  root.userData = {
    bob,
    head,
    legL,
    legR,
    armL,
    armR,
    eyes: lids,
    eyeScale: lids.map((lid) => lid.scale.y),
    ears,
    earScale: def.earScale,
    hold,
    phase: Math.random() * 6,
    blink: 1.5 + Math.random() * 2,
    swagger: !!def.swagger,
    id: def.id,
  };
  return root;
}

export function updateActor(root, dt, pose) {
  const u = root.userData;
  u.phase += dt * (pose.moving ? 9.2 : 2.1);
  const swing = Math.sin(u.phase) * (pose.moving ? 0.78 : 0.04);
  u.legL.rotation.x = swing;
  u.legR.rotation.x = -swing;
  if (pose.wave) {
    u.armR.rotation.x = -2.15;
    u.armR.rotation.z = -0.25 + Math.sin(u.phase * 1.4) * 0.28;
    u.armL.rotation.x = -swing * 0.4;
    u.armL.rotation.z = 0.25;
  } else if (pose.point) {
    u.armR.rotation.x = -1.25;
    u.armR.rotation.z = -0.15;
    u.armL.rotation.x = 0.25;
    u.armL.rotation.z = 0.3;
  } else {
    u.armL.rotation.x = -swing * 0.8;
    u.armR.rotation.x = swing * 0.8;
    u.armL.rotation.z = 0.18;
    u.armR.rotation.z = -0.18;
  }
  const hop = pose.hop > 0 ? Math.sin(Math.min(1, pose.hop) * PI) * 0.2 : 0;
  u.bob.position.y = (pose.moving ? Math.abs(Math.sin(u.phase)) * 0.055 : Math.sin(u.phase * 0.6) * 0.012) + hop;
  u.bob.rotation.z = u.swagger ? Math.sin(u.phase * 0.55) * (pose.moving ? 0.08 : 0.04) : 0;
  u.blink -= dt;
  const shut = u.blink < 0.08 && u.blink > 0;
  u.eyes.forEach((eye, index) => {
    const base = u.eyeScale[index];
    eye.scale.y = shut ? base * 7 : base;
  });
  if (u.blink < -0.05) u.blink = 2.2 + Math.random() * 3;
  if (u.earScale > 1.2) {
    const wiggle = 1 + Math.sin(u.phase * 1.6) * 0.05;
    u.ears.forEach((ear) => {
      ear.scale.set(0.1 * u.earScale * wiggle, 0.14 * u.earScale, 0.07 * u.earScale);
    });
  }
  if (pose.shake > 0) u.head.rotation.z = Math.sin(pose.shake * 36) * 0.2;
  else if (pose.select) {
    u.head.rotation.y = Math.sin(u.phase * 0.45) * 0.22;
    u.head.rotation.z = 0;
  } else {
    u.head.rotation.z *= 0.8;
    u.head.rotation.y *= 0.8;
  }
}

export function makeFood(spec) {
  geos();
  const group = new THREE.Group();
  const bun = M(0xf2c48a, 0.72, 0.02);
  const bunTop = M(0xf6d7a4, 0.68, 0.02);
  if (spec.bun) {
    part(G.sphere, bun, group, 0, 0, 0, 0.2, 0.09, 0.15);
    const top = part(G.sphere, bunTop, group, 0, spec.sausage ? 0.16 : 0.1, 0, 0.2, 0.08, 0.15);
    top.position.y = spec.sausage ? 0.16 : 0.1;
  }
  if (spec.sausage) {
    const color = spec.sausage === "raw" ? 0xf0a0b0 : spec.sausage === "burnt" ? 0x2a211c : 0x8a3e18;
    const dog = new THREE.Mesh(G.sausage, uniqueMat(color, 0.42, 0.06));
    dog.rotation.z = PI / 2;
    dog.position.y = spec.bun ? 0.08 : 0;
    group.add(dog);
  }
  const dots = {
    ketchup: 0xd3262b,
    mustard: 0xe2b31f,
    relish: 0x2f9e44,
    onion: 0xf7f1e4,
  };
  (spec.toppings || []).forEach((id, index) => {
    const dot = part(G.sphere, uniqueMat(dots[id] || 0xffffff, 0.45, 0.02), group, -0.09 + index * 0.06, 0.2, 0.04, 0.035);
    dot.position.y = 0.2;
  });
  return group;
}

export function createGrillDog() {
  geos();
  const mesh = new THREE.Mesh(G.sausage, uniqueMat(0xf0a0b0, 0.42, 0.06));
  mesh.rotation.z = PI / 2;
  mesh.visible = false;
  return mesh;
}

export function colorGrillDog(mesh, t, cook, burn) {
  const material = mesh.material;
  if (t < cook) material.color.copy(PINK).lerp(BROWN, t / cook);
  else material.color.copy(BROWN).lerp(BLACK, Math.min(1, (t - cook) / burn));
}

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "default",
    stencil: false,
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0xf6d3b0, 1);
  renderer.domElement.id = "view";
  renderer.domElement.style.background = "#f6d3b0";
  return renderer;
}

function lights(scene, faceZ) {
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xd7a07a, 1.35 * PI));
  const key = new THREE.DirectionalLight(0xfff7ee, 1.35 * PI);
  key.position.set(0.2, 6.2, 7 * faceZ);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd8b0, 0.55 * PI);
  fill.position.set(-2.5, 3.2, -3 * faceZ);
  scene.add(fill);
}

export function buildSelectScene() {
  geos();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6c7a4);
  lights(scene, 1);
  const floorTex = floorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
  floor.rotation.x = -PI / 2;
  scene.add(floor);
  const podium = new THREE.Mesh(G.cyl, M(0x6e2430, 0.55, 0.08));
  podium.scale.set(1.25, 0.4, 1.25);
  podium.position.y = 0.2;
  scene.add(podium);
  const carpet = new THREE.Mesh(new THREE.CircleGeometry(1.05, 28), M(0xf0b429, 0.7, 0.05));
  carpet.rotation.x = -PI / 2;
  carpet.position.y = 0.41;
  scene.add(carpet);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd56a }));
  ring.rotation.x = -PI / 2;
  ring.position.y = 0.43;
  scene.add(ring);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.2), M(0xfff3e4, 0.92, 0));
  wall.position.set(0, 2.1, -2.4);
  scene.add(wall);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.85),
    new THREE.MeshBasicMaterial({ map: signTexture("HOT DOGS", "#ff4f8b"), transparent: true, depthWrite: false }),
  );
  sign.position.set(0, 3.72, -2.3);
  scene.add(sign);
  const glow = new THREE.PointLight(0xff4d88, 10, 6, 2);
  glow.position.set(0, 2.8, -1.2);
  scene.add(glow);
  for (let i = 0; i < 9; i += 1) {
    const flag = part(G.cone, M(i % 3 === 0 ? 0xd7263d : i % 3 === 1 ? 0xf0b429 : 0xfff4e4, 0.7, 0), scene, -2.4 + i * 0.6, 2.55, -2.25, 0.12, 0.22, 0.12);
    flag.rotation.x = PI;
  }
  return { scene, ring, podiumY: 0.4 };
}

export function buildKitchen() {
  geos();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6d3b0);
  lights(scene, -1);

  const floorTex = floorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(2.4, 2);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), floorMat);
  floor.rotation.x = -PI / 2;
  floor.position.set(0, 0, -0.35);
  scene.add(floor);

  const runner = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.3), M(0x7a3034, 0.88, 0));
  runner.rotation.x = -PI / 2;
  runner.position.set(0, 0.012, 0.85);
  scene.add(runner);

  const rear = new THREE.Mesh(new THREE.PlaneGeometry(18, 6), M(0xf6d7b4, 0.92, 0));
  rear.position.set(0, 2.4, 5.2);
  rear.rotation.y = Math.PI;
  scene.add(rear);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 3.6), M(0x6e2c34, 0.92, 0));
  wall.position.set(0, 1.8, LAYOUT.wallZ);
  scene.add(wall);
  const trim = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 0.16), M(0xf2d2a8, 0.7, 0.05));
  trim.position.set(0, 3.45, LAYOUT.wallZ + 0.02);
  scene.add(trim);

  const counter = LAYOUT.counter;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(counter.w, counter.h, counter.d), M(0x8c3038, 0.62, 0.08));
  cab.position.set(0, counter.h / 2, counter.z);
  scene.add(cab);
  const steel = new THREE.Mesh(new THREE.BoxGeometry(counter.w + 0.08, 0.08, counter.d + 0.1), M(0xd5dde4, 0.32, 0.62));
  steel.position.set(0, counter.h + 0.04, counter.z);
  scene.add(steel);

  const grillX = LAYOUT.grillSlots.reduce((sum, slot) => sum + slot.x, 0) / LAYOUT.grillSlots.length;
  const grillZ = LAYOUT.grillSlots[0].z;
  const grillBed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.62), uniqueMat(0x2a2e33, 0.4, 0.4, { emissive: 0xff6a1a, emissiveIntensity: 0.35 }));
  grillBed.position.set(grillX, counter.h + 0.1, grillZ);
  scene.add(grillBed);
  for (let i = 0; i < 4; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.012, 0.02), M(0x1b1d20, 0.4, 0.5));
    bar.position.set(grillX, counter.h + 0.145, grillZ - 0.22 + i * 0.14);
    scene.add(bar);
  }

  const board = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 0.78), M(0xe7d0a4, 0.78, 0));
  board.position.set(-0.4, counter.h + 0.1, -2.25);
  scene.add(board);

  const bunSpot = LAYOUT.stations.find((station) => station.id === "buns");
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.62), M(0xa56a3a, 0.8, 0));
  crate.position.set(bunSpot.x, counter.h + 0.18, -2.22);
  scene.add(crate);
  hitBox(scene, { type: "buns" }, 1.05, 0.7, 0.8, bunSpot.x, counter.h + 0.5, -2.22);
  for (let i = 0; i < 4; i += 1) part(G.sphere, M(0xf2c48a, 0.7, 0), scene, bunSpot.x - 0.22 + (i % 2) * 0.28, counter.h + 0.32 + Math.floor(i / 2) * 0.14, -2.22, 0.18, 0.09, 0.14);

  const dogSpot = LAYOUT.stations.find((station) => station.id === "dogs");
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.55), M(0xc5ced6, 0.3, 0.7));
  tray.position.set(dogSpot.x, counter.h + 0.12, -2.18);
  scene.add(tray);
  hitBox(scene, { type: "dogs" }, 0.58, 0.5, 0.5, dogSpot.x, counter.h + 0.4, -2.18);
  const bunLabel = stationLabel("BUNS");
  bunLabel.position.set(bunSpot.x, counter.h + 0.78, -2.22);
  scene.add(bunLabel);
  const dogLabel = stationLabel("DOGS");
  dogLabel.position.set(dogSpot.x, counter.h + 0.78, -2.18);
  scene.add(dogLabel);
  for (let i = 0; i < 4; i += 1) {
    const raw = new THREE.Mesh(G.sausage, M(0xf0a0b0, 0.45, 0.05));
    raw.rotation.z = PI / 2;
    raw.scale.setScalar(1.25);
    raw.position.set(dogSpot.x - 0.28 + (i % 2) * 0.32, counter.h + 0.24 + Math.floor(i / 2) * 0.1, -2.18);
    scene.add(raw);
  }

  LAYOUT.bottles.forEach((spot) => {
    const bottle = part(G.cyl, M(spot.color, 0.4, 0.15), scene, spot.x, counter.h + 0.32, spot.z, 0.07, 0.28, 0.07);
    bottle.userData.pick = { type: "bottle", id: spot.id };
    part(G.sphere, M(0xf7f4ee, 0.4, 0.1), scene, spot.x, counter.h + 0.5, spot.z, 0.05);
    hitBox(scene, { type: "bottle", id: spot.id }, 0.28, 0.5, 0.28, spot.x, counter.h + 0.4, spot.z);
  });

  const awningColors = [0xd7263d, 0xfff4e4];
  for (let i = 0; i < 6; i += 1) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.7), M(awningColors[i % 2], 0.6, 0.05));
    stripe.position.set(3.55 + i * 0.32, 2.15, -3.15);
    stripe.rotation.x = 0.5;
    scene.add(stripe);
  }
  const bell = new THREE.Mesh(G.cone, M(0xe2c15a, 0.35, 0.65));
  bell.scale.set(0.12, 0.1, 0.12);
  bell.position.set(4.55, counter.h + 0.2, -1.95);
  scene.add(bell);
  part(G.sphere, M(0xe2c15a, 0.35, 0.65), scene, 4.55, counter.h + 0.12, -1.95, 0.035);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.8),
    new THREE.MeshBasicMaterial({ map: signTexture("HOT DOGS", "#ff4f8b"), transparent: true, depthWrite: false }),
  );
  sign.position.set(0, 3.55, 5.05);
  sign.rotation.y = PI;
  scene.add(sign);
  const neon = new THREE.PointLight(0xff4d88, 8, 7, 2);
  neon.position.set(-0.2, 2.7, -3.2);
  scene.add(neon);
  const grillLight = new THREE.PointLight(0xff7a32, 7, 4.5, 2);
  grillLight.position.set(-0.15, 1.8, -2.2);
  scene.add(grillLight);

  const wash = new THREE.PointLight(0xffe1b5, 6, 8, 2);
  wash.position.set(0, 3.4, -1.2);
  scene.add(wash);

  for (let i = 0; i < 9; i += 1) {
    const flag = part(G.cone, M(i % 3 === 0 ? 0xd7263d : i % 3 === 1 ? 0xf0b429 : 0xfff4e4, 0.75, 0), scene, -3.6 + i * 0.9, 3.35, 4.9, 0.16, 0.28, 0.16);
    flag.rotation.x = PI;
  }

  const trash = new THREE.Group();
  part(G.cyl, M(0xb7c0c8, 0.35, 0.6), trash, 0, 0.28, 0, 0.28, 0.5, 0.28);
  part(G.sphere, M(0x2a2422, 0.9, 0), trash, 0, 0.58, 0, 0.22, 0.12, 0.22);
  const trashStation = LAYOUT.stations.find((station) => station.type === "trash");
  trash.position.set(trashStation.x, 0, trashStation.z);
  trash.userData.pick = { type: "trash" };
  hitBox(trash, { type: "trash" }, 0.75, 0.9, 0.75, 0, 0.4, 0);
  scene.add(trash);

  const slots = LAYOUT.grillSlots.map((slot, index) => {
    const group = new THREE.Group();
    group.position.set(slot.x, LAYOUT.itemY, slot.z);
    const dog = createGrillDog();
    dog.userData.pick = { type: "grill", index };
    dog.scale.setScalar(1.15);
    hitBox(group, { type: "grill", index }, 0.32, 0.4, 0.32, 0, 0.08, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 18), uniqueMat(0x6b625c, 0.4, 0.2, { emissive: 0x6b625c, emissiveIntensity: 0.4 }));
    ring.rotation.x = -PI / 2;
    ring.position.y = -0.16;
    group.add(dog);
    group.add(ring);
    scene.add(group);
    return { dog, ring, x: slot.x, z: slot.z };
  });

  const mats = LAYOUT.mats.map((mat, index) => {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.36, 0.05, 24),
      uniqueMat(0xfffaf3, 0.45, 0.12, { emissive: 0x000000, emissiveIntensity: 0 }),
    );
    pad.position.set(mat.x, counter.h + 0.16, mat.z);
    pad.userData.pick = { type: "plate", index };
    pad.add(plateBadge(index + 1));
    hitBox(pad, { type: "plate", index }, 0.82, 0.5, 0.66, 0, 0.22, 0);
    const food = new THREE.Group();
    food.position.set(mat.x, LAYOUT.itemY, mat.z);
    scene.add(pad);
    scene.add(food);
    return { pad, food };
  });

  const customers = LAYOUT.customers.map((spot, index) => {
    const palette = [0x2f6fed, 0xf0b429, 0x2f9e44, 0xd7263d];
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);
    part(G.box, M(palette[index % palette.length], 0.7, 0.04), group, 0, 0.82, 0, 0.48, 0.62, 0.32);
    const headMat = M(index === 1 ? 0x8d5a3c : 0xf0c7a4, 0.58, 0.02);
    part(G.sphere, headMat, group, 0, 1.38, 0, 0.3);
    part(G.sphere, M(index === 2 ? 0xf0b429 : 0x3a2418, 0.7, 0), group, 0, 1.58, 0.02, 0.28, 0.12, 0.24);
    part(G.sphere, M(0x24180f, 0.4, 0), group, -0.1, 1.44, 0.24, 0.045);
    part(G.sphere, M(0x24180f, 0.4, 0), group, 0.1, 1.44, 0.24, 0.045);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI), M(0x5a302c, 0.5, 0));
    smile.position.set(0, 1.28, 0.26);
    smile.rotation.z = Math.PI;
    const frown = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI), M(0x5a302c, 0.5, 0));
    frown.position.set(0, 1.24, 0.26);
    frown.visible = false;
    group.add(smile);
    group.add(frown);
    group.rotation.y = PI;
    group.scale.setScalar(1.15);
    const bubble = orderBubble();
    group.add(bubble);
    hitBox(group, { type: "customer", index }, 0.85, 1.5, 0.7, 0, 0.9, 0);
    group.visible = false;
    group.userData = { smile, frown, phase: index, pop: 0, bubble };
    scene.add(group);
    return group;
  });

  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd56a }));
  marker.rotation.x = -PI / 2;
  marker.position.y = 0.035;
  marker.visible = false;
  scene.add(marker);
  const stationPads = {};

  const bubbles = customers.map((customer) => customer.userData.bubble);
  return { scene, slots, mats, customers, bubbles, bell, grillBed, grillLight, marker, stationPads, steam: createSteam(scene) };
}

export function createSteam(scene) {
  const tex = softTexture();
  const pool = [];
  for (let i = 0; i < 28; i += 1) {
    const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xffffff });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    scene.add(sprite);
    pool.push(sprite);
  }
  return {
    spawn(x, y, z, color) {
      const sprite = pool.find((item) => !item.visible);
      if (!sprite) return;
      sprite.visible = true;
      sprite.position.set(x + (Math.random() - 0.5) * 0.12, y, z + (Math.random() - 0.5) * 0.12);
      sprite.userData.life = 0.7 + Math.random() * 0.35;
      sprite.userData.age = 0;
      sprite.userData.vy = 0.4 + Math.random() * 0.35;
      sprite.material.color.set(color);
      sprite.material.opacity = 0.45;
      sprite.scale.setScalar(0.16);
    },
    update(dt) {
      pool.forEach((sprite) => {
        if (!sprite.visible) return;
        sprite.userData.age += dt;
        const k = sprite.userData.age / sprite.userData.life;
        if (k >= 1) {
          sprite.visible = false;
          return;
        }
        sprite.position.y += sprite.userData.vy * dt;
        sprite.material.opacity = 0.42 * (1 - k);
        sprite.scale.setScalar(0.16 + k * 0.4);
      });
    },
  };
}

export function framePlayCamera(aspect, focus) {
  const portrait = aspect < 0.95;
  // Customer side, high enough to see the face, wide enough that both stacks stay on a phone.
  const fov = portrait ? 56 : 35;
  const x = Math.max(-0.35, Math.min(0.35, (focus.pan || 0) * 0.35));
  const pos = new THREE.Vector3(x, portrait ? 4.7 : 4.05, portrait ? -5.7 : -6.35);
  const target = new THREE.Vector3(x * 0.1, 1.42, portrait ? -1.12 : -1.18);
  return { pos, target, fov, aspect };
}

export function frameSelectCamera(camera, aspect) {
  const wide = aspect > 1.15;
  camera.fov = wide ? 34 : 32;
  camera.aspect = aspect;
  camera.position.set(wide ? 0.42 : 0.26, wide ? 2.05 : 1.92, wide ? 7.15 : 6.85);
  camera.lookAt(0, wide ? 1.78 : 1.68, 0);
  camera.updateProjectionMatrix();
}

export function ringColor(material, state, t, cook) {
  if (state === "empty") material.color.copy(AMBER).multiplyScalar(0.55);
  else if (state === "cooking") material.color.copy(AMBER).lerp(GOLD, Math.min(1, t / cook));
  else if (state === "cooked") material.color.copy(GOLD);
  else material.color.setHex(0xd7263d);
  material.emissive.copy(material.color);
}

export { GOLD };
