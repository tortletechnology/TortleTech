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
  sprite.scale.set(1.05, 0.4, 1);
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
  const eye = part(G.sphere, M(0xfffaf6, 0.35, 0.05), head, x, 0.06, 0.36, 0.078, squint ? 0.03 : 0.08, 0.055);
  part(G.sphere, M(0x1a120e, 0.4, 0), eye, 0, 0, 0.55, 0.42, 0.42, 0.42);
  part(G.sphere, M(0xffffff, 0.2, 0), eye, 0.18, 0.18, 0.78, 0.16, 0.16, 0.16);
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
  const hair = M(def.hairColor, 0.72, 0.02);
  const style = def.hair;
  if (style === "bush") {
    part(G.sphere, hair, head, 0.02, 0.22, -0.02, 0.4, 0.22, 0.38);
    part(G.sphere, hair, head, 0.12, 0.32, 0.08, 0.24, 0.12, 0.26);
    part(G.sphere, hair, head, -0.08, 0.3, 0.1, 0.12, 0.1, 0.14);
  } else if (style === "lincoln") {
    part(G.sphere, hair, head, 0, 0.1, -0.06, 0.36, 0.14, 0.3);
    const felt = M(0x14120f, 0.72, 0.02);
    const brim = part(G.cyl, felt, head, 0, 0.4, 0, 0.72, 0.05, 0.72);
    const crown = part(G.box, felt, head, 0, 0.84, 0, 0.42, 0.78, 0.42);
    part(G.box, M(0x6b3a28, 0.55, 0.08), head, 0, 0.5, 0.01, 0.44, 0.07, 0.44);
    brim.frustumCulled = false;
    crown.frustumCulled = false;
  } else if (style === "obama") {
    part(G.sphere, hair, head, 0, 0.16, -0.02, 0.46, 0.28, 0.44);
  } else if (style === "teddy") {
    part(G.sphere, hair, head, 0, 0.24, 0.02, 0.4, 0.2, 0.38);
    part(G.sphere, hair, head, 0, 0.08, -0.08, 0.4, 0.16, 0.3);
  } else if (style === "trump") {
    const blond = M(0xffe14a, 0.48, 0.06);
    part(G.sphere, blond, head, 0.1, 0.22, 0.28, 0.46, 0.16, 0.28);
    part(G.sphere, blond, head, 0.3, 0.38, 0.2, 0.32, 0.24, 0.26);
    part(G.sphere, blond, head, 0.4, 0.08, 0.16, 0.2, 0.22, 0.16);
    part(G.sphere, blond, head, -0.02, 0.32, -0.08, 0.34, 0.16, 0.26);
  } else if (style === "washington") {
    part(G.sphere, hair, head, 0, 0.18, -0.12, 0.5, 0.3, 0.36);
    part(G.sphere, hair, head, -0.36, 0.02, -0.02, 0.16, 0.22, 0.16);
    part(G.sphere, hair, head, 0.36, 0.02, -0.02, 0.16, 0.22, 0.16);
    part(G.cyl, hair, head, 0, -0.22, -0.36, 0.07, 0.32, 0.07);
  } else if (style === "biden") {
    part(G.sphere, hair, head, 0, 0.2, -0.04, 0.46, 0.2, 0.42);
    part(G.sphere, hair, head, 0, 0.02, -0.02, 0.48, 0.14, 0.4);
  } else if (style === "jfk") {
    part(G.sphere, hair, head, 0, 0.18, 0.02, 0.46, 0.26, 0.44);
    part(G.sphere, hair, head, 0.04, 0.32, 0.16, 0.36, 0.12, 0.24);
  } else if (style === "reagan") {
    part(G.sphere, hair, head, 0, 0.24, 0, 0.44, 0.24, 0.4);
    part(G.sphere, hair, head, 0, 0.38, 0.08, 0.32, 0.12, 0.28);
  }
}

function addGlasses(head, style) {
  if (style === "round") {
    [-0.15, 0.15].forEach((x) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 6, 16), M(0x1a1a1a, 0.4, 0.45));
      rim.position.set(x, 0.06, 0.42);
      head.add(rim);
    });
    part(G.box, M(0x1a1a1a, 0.4, 0.45), head, 0, 0.06, 0.42, 0.08, 0.012, 0.012);
  } else if (style === "aviator") {
    const lens = uniqueMat(0x1c3348, 0.15, 0.55, { transparent: true, opacity: 0.5 });
    [-0.15, 0.15].forEach((x) => {
      const glass = part(G.sphere, lens, head, x, 0.05, 0.4, 0.1, 0.08, 0.03);
      glass.scale.set(0.1, 0.078, 0.03);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 16), M(0xd4b15a, 0.35, 0.7));
      rim.position.set(x, 0.05, 0.43);
      rim.scale.set(1, 0.8, 1);
      head.add(rim);
    });
    part(G.box, M(0xd4b15a, 0.35, 0.7), head, 0, 0.08, 0.43, 0.08, 0.012, 0.012);
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
  part(G.sphere, M(def.skin, 0.58, 0.02), pivot, 0, -0.38, 0.02, 0.085);
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
  head.position.set(0, 1.4, 0);
  bob.add(head);
  part(G.sphere, M(def.skin, 0.56, 0.02), head, 0, 0, 0, 0.42, 0.44, 0.4);
  const ears = [-1, 1].map((side) => {
    const ear = part(
      G.sphere,
      M(def.skin, 0.56, 0.02),
      head,
      side * (0.38 + def.earScale * 0.05),
      -0.02,
      0,
      0.1 * def.earScale,
      0.14 * def.earScale,
      0.07 * def.earScale,
    );
    part(G.sphere, M(darken(def.skin, 0.12), 0.6, 0), ear, 0, 0, 0.25, 0.45, 0.5, 0.35);
    return ear;
  });
  const eyeL = addEye(head, -0.14, def.eye);
  const eyeR = addEye(head, 0.14, def.eye);
  addBrows(head, def.brows);
  const noseScale = def.id === "bush" ? [0.09, 0.09, 0.12] : [0.065, 0.075, 0.09];
  part(G.sphere, M(def.skin, 0.56, 0.02), head, 0, -0.02, 0.4, ...noseScale);
  addSmile(head, def.smile);
  if (def.mustache) {
    part(G.box, M(0x4a3422, 0.75, 0), head, 0, -0.06, 0.42, 0.24, 0.07, 0.07);
    part(G.sphere, M(0x4a3422, 0.75, 0), head, -0.12, -0.08, 0.4, 0.06);
    part(G.sphere, M(0x4a3422, 0.75, 0), head, 0.12, -0.08, 0.4, 0.06);
  }
  if (def.beard === "lincoln") {
    part(G.sphere, M(0x16120f, 0.8, 0), head, 0, -0.2, 0.18, 0.26, 0.2, 0.2);
    part(G.sphere, M(0x16120f, 0.8, 0), head, 0, -0.36, 0.08, 0.1, 0.16, 0.1);
  }
  const blush = uniqueMat(def.blush, 0.7, 0, { transparent: true, opacity: 0.35 });
  part(G.sphere, blush, head, -0.24, -0.08, 0.28, 0.07, 0.045, 0.04);
  part(G.sphere, blush, head, 0.24, -0.08, 0.28, 0.07, 0.045, 0.04);
  addHair(head, def);
  addGlasses(head, def.glasses);

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
    eyes: [eyeL, eyeR],
    eyeScale: [eyeL.scale.y, eyeR.scale.y],
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
    eye.scale.y = shut ? 0.008 : base;
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
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x1a0e0c, 1);
  renderer.domElement.id = "view";
  return renderer;
}

function lights(scene, warmer) {
  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x3a221c, 0.85 * PI));
  const key = new THREE.DirectionalLight(0xfff7ee, (warmer ? 1.25 : 1.05) * PI);
  key.position.set(4.5, 9, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb088, 0.38 * PI);
  rim.position.set(-5, 4, -3);
  scene.add(rim);
}

export function buildSelectScene() {
  geos();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c0d12);
  lights(scene, true);
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
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.2), M(0x4a2030, 0.9, 0));
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
  scene.background = new THREE.Color(0x24120f);
  lights(scene, false);

  const floorTex = floorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(2.4, 2);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 11.5), floorMat);
  floor.rotation.x = -PI / 2;
  floor.position.set(0, 0, -0.35);
  scene.add(floor);

  const runner = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.3), M(0x7a3034, 0.88, 0));
  runner.rotation.x = -PI / 2;
  runner.position.set(0, 0.012, 0.85);
  scene.add(runner);

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

  const grillBed = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.06, 0.78), uniqueMat(0x2a2e33, 0.4, 0.4, { emissive: 0xff6a1a, emissiveIntensity: 0.35 }));
  grillBed.position.set(-0.15, counter.h + 0.1, -2.22);
  scene.add(grillBed);
  for (let i = 0; i < 7; i += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.025, 0.035), M(0x1b1d20, 0.4, 0.5));
    bar.position.set(-0.15, counter.h + 0.16, -2.48 + i * 0.09);
    scene.add(bar);
  }

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.9), M(0xe7d0a4, 0.78, 0));
  board.position.set(2.45, counter.h + 0.1, -2.22);
  scene.add(board);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.7), M(0xa56a3a, 0.8, 0));
  crate.position.set(-4.2, counter.h + 0.2, -2.55);
  scene.add(crate);
  for (let i = 0; i < 3; i += 1) part(G.sphere, M(0xf2c48a, 0.7, 0), scene, -4.45 + i * 0.22, counter.h + 0.38, -2.55, 0.12, 0.08, 0.1);

  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.55), M(0xc5ced6, 0.3, 0.7));
  tray.position.set(-2.5, counter.h + 0.12, -2.45);
  scene.add(tray);
  for (let i = 0; i < 3; i += 1) {
    const raw = new THREE.Mesh(G.sausage, M(0xf0a0b0, 0.45, 0.05));
    raw.rotation.z = PI / 2;
    raw.position.set(-2.74 + i * 0.22, counter.h + 0.22, -2.45);
    scene.add(raw);
  }

  const bottleSpots = [
    { x: 1.55, color: 0xd3262b },
    { x: 1.78, color: 0xe2b31f },
    { x: 2.0, color: 0x2f9e44 },
  ];
  bottleSpots.forEach((spot) => {
    part(G.cyl, M(spot.color, 0.4, 0.15), scene, spot.x, counter.h + 0.28, -2.85, 0.06, 0.22, 0.06);
    part(G.sphere, M(0xf7f4ee, 0.4, 0.1), scene, spot.x, counter.h + 0.42, -2.85, 0.045);
  });
  part(G.cyl, M(0xf3e6c8, 0.7, 0.05), scene, 3.35, counter.h + 0.18, -2.8, 0.12, 0.12, 0.12);

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
    new THREE.PlaneGeometry(3.1, 0.72),
    new THREE.MeshBasicMaterial({ map: signTexture("HOT DOGS", "#ff4f8b"), transparent: true, depthWrite: false }),
  );
  sign.position.set(-0.2, 3.05, LAYOUT.wallZ + 0.05);
  scene.add(sign);
  const neon = new THREE.PointLight(0xff4d88, 8, 7, 2);
  neon.position.set(-0.2, 2.7, -3.2);
  scene.add(neon);
  const grillLight = new THREE.PointLight(0xff7a32, 7, 4.5, 2);
  grillLight.position.set(-0.15, 1.8, -2.2);
  scene.add(grillLight);

  function lamp(x, z) {
    const shade = part(G.cone, M(0xf0b429, 0.5, 0.12), scene, x, 2.65, z, 0.26, 0.2, 0.26);
    shade.rotation.x = PI;
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
    const bulb = part(G.sphere, bulbMat, scene, x, 2.48, z, 0.07);
    bulb.scale.setScalar(0.07);
    const light = new THREE.PointLight(0xffe1b5, 5, 4.2, 2);
    light.position.set(x, 2.4, z);
    scene.add(light);
  }
  lamp(-0.15, -1.6);
  lamp(2.45, -1.6);

  for (let i = 0; i < 12; i += 1) {
    const flag = part(G.cone, M(i % 3 === 0 ? 0xd7263d : i % 3 === 1 ? 0xf0b429 : 0xfff4e4, 0.75, 0), scene, -5.2 + i * 0.9, 3.25, LAYOUT.wallZ + 0.08, 0.14, 0.24, 0.14);
    flag.rotation.x = PI;
  }

  const trash = new THREE.Group();
  part(G.cyl, M(0xb7c0c8, 0.35, 0.6), trash, 0, 0.28, 0, 0.28, 0.5, 0.28);
  part(G.sphere, M(0x2a2422, 0.9, 0), trash, 0, 0.58, 0, 0.22, 0.12, 0.22);
  const trashStation = LAYOUT.stations.find((station) => station.type === "trash");
  trash.position.set(trashStation.x, 0, trashStation.z);
  scene.add(trash);

  const slots = LAYOUT.grillSlots.map((slot) => {
    const group = new THREE.Group();
    group.position.set(slot.x, LAYOUT.itemY, slot.z);
    const dog = createGrillDog();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 18), uniqueMat(0x6b625c, 0.4, 0.2, { emissive: 0x6b625c, emissiveIntensity: 0.4 }));
    ring.rotation.x = -PI / 2;
    ring.position.y = -0.16;
    group.add(dog);
    group.add(ring);
    scene.add(group);
    return { dog, ring, x: slot.x, z: slot.z };
  });

  const mats = LAYOUT.mats.map((mat) => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.04, 0.62), uniqueMat(0xf7f1e4, 0.8, 0, { emissive: 0x000000, emissiveIntensity: 0 }));
    pad.position.set(mat.x, counter.h + 0.15, mat.z);
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
    part(G.box, M(palette[index % palette.length], 0.7, 0.04), group, 0, 0.78, 0, 0.42, 0.5, 0.28);
    part(G.sphere, M(index === 1 ? 0x8d5a3c : 0xf0c7a4, 0.58, 0.02), group, 0, 1.28, 0, 0.26);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI), M(0x5a302c, 0.5, 0));
    smile.position.set(0, 1.2, 0.22);
    smile.rotation.z = Math.PI;
    const frown = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI), M(0x5a302c, 0.5, 0));
    frown.position.set(0, 1.16, 0.22);
    frown.visible = false;
    group.add(smile);
    group.add(frown);
    part(G.sphere, M(0x24180f, 0.4, 0), group, -0.08, 1.32, 0.2, 0.035);
    part(G.sphere, M(0x24180f, 0.4, 0), group, 0.08, 1.32, 0.2, 0.035);
    group.visible = false;
    group.userData = { smile, frown, phase: index, pop: 0 };
    scene.add(group);
    return group;
  });

  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffd56a }));
  marker.rotation.x = -PI / 2;
  marker.position.y = 0.035;
  scene.add(marker);

  const padColors = {
    buns: 0xf2c48a,
    dogs: 0xf0a0b0,
    grill: 0xff7a32,
    board: 0xf0b429,
    serve: 0x3dbe58,
    trash: 0x9aa3ab,
  };
  const padNames = { buns: "BUNS", dogs: "DOGS", grill: "GRILL", board: "BUILD", serve: "SERVE", trash: "TRASH" };
  const stationPads = {};
  LAYOUT.stations.forEach((station) => {
    const pad = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.055, 8, 28),
      new THREE.MeshBasicMaterial({ color: padColors[station.type] || 0xffd56a }),
    );
    pad.rotation.x = -PI / 2;
    pad.position.set(station.x, 0.04, station.z);
    scene.add(pad);
    const label = stationLabel(padNames[station.type] || station.type);
    label.position.set(station.x, 1.62, station.z);
    scene.add(label);
    stationPads[station.id] = pad;
  });

  return { scene, slots, mats, customers, bell, grillBed, grillLight, marker, stationPads, steam: createSteam(scene) };
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
  const fov = portrait ? 52 : 40;
  const back = portrait ? 5.6 : 6.4;
  const up = portrait ? 4.8 : 5.4;
  const ahead = portrait ? 1.3 : 1.0;
  const lookY = portrait ? 1.0 : 0.8;
  const target = new THREE.Vector3(focus.x, lookY, focus.z - ahead);
  const pos = new THREE.Vector3(focus.x, up, focus.z + back);
  return { pos, target, fov, aspect };
}

export function frameSelectCamera(camera, aspect) {
  const wide = aspect > 1.15;
  camera.fov = wide ? 34 : 32;
  camera.aspect = aspect;
  camera.position.set(wide ? 0.55 : 0.4, wide ? 1.95 : 1.88, wide ? 6.7 : 6.45);
  camera.lookAt(0, wide ? 1.72 : 1.58, 0);
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
