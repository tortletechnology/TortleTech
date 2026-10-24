import { PRESIDENTS, line, presidentById } from "./data.js";
import { LAYOUT } from "./layout.js";
import {
  evaluateServe,
  makeOrder,
  orderTitle,
  sameSet,
  scoreServe,
  shiftConfig,
  starsFor,
  TOPPINGS,
} from "./logic.js";
import { createAudio } from "./audio.js";
import { Group, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "./vendor/three.module.min.js";
import {
  buildKitchen,
  buildSelectScene,
  colorGrillDog,
  createPresident,
  createRenderer,
  framePlayCamera,
  frameSelectCamera,
  makeFood,
  paintOrderBubble,
  ringColor,
  updateActor,
} from "./view.js";

const COOK = 3.7;
const BURN = 3.35;
const SPEED = 5.35;
const SAVE_KEY = "hotdog-rush-v1";
const params = new URLSearchParams(location.search);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id) => document.getElementById(id);
const audio = createAudio();
const stick = { id: null, x: 0, y: 0, ox: 0, oy: 0 };
const raycaster = new Raycaster();
const pointerNdc = new Vector2();
const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
const floorHit = new Vector3();
let goal = null;
const keys = new Set();
const actorCache = new Map();

const state = {
  mode: "select",
  phase: "idle",
  paused: false,
  presidentId: "bush",
  shift: 1,
  timeLeft: 0,
  score: 0,
  combo: 0,
  orders: [],
  nextOrderId: 1,
  spawnIn: 2,
  hands: null,
  mats: LAYOUT.mats.map(() => ({ bun: false, sausage: null, toppings: [] })),
  stats: emptyStats(),
  lastCall: false,
  bannerT: 0,
  emote: 0,
  emoteKind: "",
  shake: 0,
  dprCap: 1.25,
  helpMode: "intro",
  pan: 0,
  focusMat: 0,
};

const player = { x: LAYOUT.spawn.x, z: LAYOUT.spawn.z, yaw: Math.PI };
const slots = LAYOUT.grillSlots.map(() => ({ t: 0, state: "empty" }));

let renderer;
let camera;
let selectScene;
let playPack;
let actor = null;
let playCam = null;
let last = performance.now();
let heldSig = "";
let matSig = "";
let steamAcc = 0;
let speakUntil = 0;
let speakKind = "";
let speakTimer = 0;
let quoteTimer = 0;
let slowFrames = 0;
let dprDropped = false;
let nextActionAt = 0;

function emptyStats() {
  return { served: 0, lost: 0, perfect: 0, bestCombo: 0, wrong: 0 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeSave(patch) {
  const next = { ...loadSave(), ...patch };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

function currentDef() {
  return presidentById(state.presidentId);
}

function say(text, kind = "coach") {
  const now = performance.now();
  if (kind === "coach" && now < speakUntil && speakKind === "quip") return;
  if (kind === "quip" && speakKind === "quip" && now < speakUntil - 1500) return;
  $("speech-who").textContent = kind === "quip" ? currentDef().short.toUpperCase() : "TIP";
  $("speech-text").textContent = text;
  const bubble = $("speech");
  bubble.hidden = false;
  bubble.className = `speech ${kind}`;
  speakKind = kind;
  speakUntil = now + (kind === "quip" ? 2500 : 1500);
  clearTimeout(speakTimer);
  speakTimer = setTimeout(() => {
    bubble.hidden = true;
    speakKind = "";
  }, kind === "quip" ? 2500 : 1500);
}

function floater(text, kind) {
  const el = document.createElement("div");
  el.className = `floater ${kind || ""}`;
  el.textContent = text;
  el.style.left = `${42 + Math.random() * 16}%`;
  $("floaters").appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function buzz(ms) {
  const save = loadSave();
  if (save.haptics === false || !navigator.vibrate) return;
  navigator.vibrate(ms);
}

function actorFor(id) {
  if (!actorCache.has(id)) actorCache.set(id, createPresident(presidentById(id)));
  return actorCache.get(id);
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((obj) => {
      if (obj.material?.userData?.unique) obj.material.dispose();
    });
  }
}

function showPresident(id) {
  const def = presidentById(id);
  state.presidentId = def.id;
  const next = actorFor(def.id);
  if (actor?.parent) actor.parent.remove(actor);
  actor = next;
  const scene = state.mode === "play" ? playPack.scene : selectScene;
  scene.add(actor);
  if (state.mode === "select") {
    actor.position.set(0, 0.4, 0);
    actor.rotation.y = -0.55;
  }
  document.documentElement.style.setProperty("--p-accent", def.accent);
  $("pres-name").textContent = def.name;
  $("pres-epithet").textContent = def.epithet;
  $("pres-blurb").textContent = def.blurb;
  $("start-btn").textContent = `Play as ${def.short}`;
  const save = loadSave();
  const personal = save.by?.[def.id]?.best || 0;
  $("record-line").textContent = save.best ? `Kitchen record ${save.best.toLocaleString()}` : "No kitchen record yet";
  $("best-line").textContent = personal ? `${def.short}'s best ${personal.toLocaleString()}` : `${def.short} has not closed a shift yet`;
  document.querySelectorAll("#roster button").forEach((button) => {
    button.setAttribute("aria-selected", button.dataset.id === def.id ? "true" : "false");
  });
  cycleQuote();
  writeSave({ lastId: def.id });
}

function cycleQuote() {
  const def = currentDef();
  const pool = def.quips.start.concat(def.quips.serve);
  const index = Math.floor(performance.now() / 3400) % pool.length;
  $("pres-quote").textContent = `“${pool[index]}”`;
}

function stepPresident(dir) {
  const index = PRESIDENTS.findIndex((item) => item.id === state.presidentId);
  const next = (index + dir + PRESIDENTS.length) % PRESIDENTS.length;
  showPresident(PRESIDENTS[next].id);
  audio.click();
}

function applyPlayCamera(aspect, blend) {
  const framed = framePlayCamera(aspect, { pan: state.pan });
  if (!playCam) playCam = { pos: framed.pos.clone(), target: framed.target.clone() };
  else {
    playCam.pos.lerp(framed.pos, blend);
    playCam.target.lerp(framed.target, blend);
  }
  camera.fov = framed.fov;
  camera.aspect = framed.aspect;
  camera.position.copy(playCam.pos);
  camera.lookAt(playCam.target);
  camera.updateProjectionMatrix();
}

function resize() {
  const host = renderer.domElement.parentElement;
  if (!host) return;
  const hostW = host.clientWidth;
  const hostH = host.clientHeight;
  if (hostW < 2 || hostH < 2) return;
  const canvas = renderer.domElement;
  let w = hostW;
  let h = hostH;
  if (state.mode === "play" && hostW < hostH) {
    const aspect = 1.42;
    h = Math.min(hostW / aspect, Math.max(190, hostH - 220));
    w = Math.min(hostW, h * aspect);
    const top = 92;
    canvas.style.position = "absolute";
    canvas.style.left = `${Math.round((hostW - w) / 2)}px`;
    canvas.style.top = `${top}px`;
    document.documentElement.style.setProperty("--play-top", `${Math.round(top + h + 10)}px`);
  } else {
    canvas.style.position = "absolute";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    document.documentElement.style.removeProperty("--play-top");
  }
  const dpr = Math.min(window.devicePixelRatio || 1, state.dprCap);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const aspect = w / h;
  if (state.mode === "select") frameSelectCamera(camera, aspect);
  else applyPlayCamera(aspect, 1);
}

function setMode(mode) {
  state.mode = mode;
  $("screen-select").hidden = mode !== "select";
  $("screen-play").hidden = mode !== "play";
  const host = mode === "select" ? $("preview") : $("stage");
  host.appendChild(renderer.domElement);
  requestAnimationFrame(resize);
}

function resetKitchen() {
  state.hands = null;
  state.orders = [];
  state.mats.forEach((mat) => {
    mat.bun = false;
    mat.sausage = null;
    mat.toppings.length = 0;
  });
  slots.forEach((slot) => {
    slot.t = 0;
    slot.state = "empty";
  });
  heldSig = "";
  matSig = "";
  player.x = LAYOUT.spawn.x;
  player.z = LAYOUT.spawn.z;
  player.yaw = Math.PI;
  if (actor) {
    clearGroup(actor.userData.hold);
    heldSig = "";
  }
}

function spawnOrder(forcePlain) {
  const order = makeOrder(state.shift, Math.random, { forcePlain });
  order.id = state.nextOrderId;
  state.nextOrderId += 1;
  state.orders.push(order);
}

function startShift() {
  const cfg = shiftConfig(state.shift);
  $("modal-help").hidden = true;
  $("modal-pause").hidden = true;
  $("modal-results").hidden = true;
  state.paused = false;
  state.score = 0;
  state.combo = 0;
  state.timeLeft = cfg.duration;
  state.phase = "banner";
  state.bannerT = 1.05;
  state.lastCall = false;
  state.stats = emptyStats();
  state.spawnIn = state.shift === 1 ? 3.2 : 2.2;
  resetKitchen();
  playCam = null;
  spawnOrder(state.shift === 1);
  if (actor?.parent) actor.parent.remove(actor);
  actor = actorFor(state.presidentId);
  playPack.scene.add(actor);
  actor.position.set(player.x, 0, player.z);
  actor.rotation.y = player.yaw;
  setMode("play");
  $("banner-kicker").textContent = `Shift ${cfg.shift}`;
  $("banner-title").textContent = cfg.name;
  $("banner").hidden = false;
  $("shift-label").textContent = `${cfg.name} · goal $${cfg.twoStar}`;
  audio.resume();
  audio.fanfare();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function endShift() {
  state.phase = "end";
  state.timeLeft = 0;
  $("banner").hidden = true;
  const stars = starsFor(state.score, state.shift);
  const save = loadSave();
  const by = { ...(save.by || {}) };
  const prev = by[state.presidentId]?.best || 0;
  const isNew = state.score > prev && state.score > 0;
  const personal = Math.max(prev, state.score);
  by[state.presidentId] = { best: personal, stars: Math.max(by[state.presidentId]?.stars || 0, stars) };
  const allBest = Math.max(save.best || 0, state.score);
  writeSave({ by, best: allBest, lastId: state.presidentId });
  const def = currentDef();
  $("results-kicker").textContent = `${def.short} · Shift ${state.shift}`;
  $("results-title").textContent = stars >= 2 ? shiftConfig(state.shift).name : "Shift complete";
  $("results-ribbon").hidden = !isNew;
  $("results-stars").innerHTML = [1, 2, 3]
    .map((n) => `<span class="star ${n <= stars ? "on" : "off"}">★</span>`)
    .join("");
  $("results-quip").textContent = line(def, stars >= 1 ? "win" : "rally");
  $("results-stats").textContent = `${state.stats.served} served · ${state.stats.perfect} perfect · ${state.stats.lost} walked · best combo x${Math.max(1, state.stats.bestCombo)}`;
  const next = shiftConfig(state.shift + 1);
  $("results-next-hint").textContent = `Next up: ${next.name}. Tickets get less patient.`;
  $("modal-results").hidden = false;
  countUp($("results-score"), state.score);
  if (stars >= 2) audio.fanfare();
  else audio.fail();
}

function countUp(el, target) {
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / 700);
    const eased = 1 - (1 - k) ** 3;
    el.textContent = Math.round(target * eased).toLocaleString();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function axis() {
  let x = stick.x;
  let y = stick.y;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
  const mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }
  if (mag < 0.12 && stick.id === null && !keys.size) return { x: 0, y: 0 };
  if (Math.hypot(x, y) < 0.12) return { x: 0, y: 0 };
  return { x, y };
}

function nearestStation() {
  let best = null;
  let bestD = LAYOUT.reach;
  for (const station of LAYOUT.stations) {
    const dist = Math.hypot(player.x - station.x, player.z - station.z);
    if (dist <= bestD) {
      best = station;
      bestD = dist;
    }
  }
  return best;
}

function movePlayer(dt, moving, dir) {
  let speed = SPEED;
  if (moving) goal = null;
  else if (goal && state.phase !== "end") {
    const dx = goal.x - player.x;
    const dz = goal.z - player.z;
    const dist = Math.hypot(dx, dz);
    const arrived = goal.act ? dist <= LAYOUT.reach : dist < 0.22;
    if (arrived) {
      const act = goal.act;
      goal = null;
      if (act) onAction(LAYOUT.stations.find((station) => station.id === act), true);
      return;
    }
    dir = { x: dx / dist, y: dz / dist };
    moving = true;
    speed = SPEED * 1.2;
  }
  if (!moving) return;
  let nx = player.x + dir.x * speed * dt;
  let nz = player.z + dir.y * speed * dt;
  const { bounds, trashRadius } = LAYOUT;
  nx = clamp(nx, bounds.minX, bounds.maxX);
  nz = clamp(nz, bounds.minZ, bounds.maxZ);
  const trash = LAYOUT.stations.find((station) => station.type === "trash");
  const dx = nx - trash.x;
  const dz = nz - trash.z;
  const min = trashRadius + 0.28;
  const dist = Math.hypot(dx, dz);
  if (dist < min && dist > 0.0001) {
    nx = clamp(trash.x + (dx / dist) * min, bounds.minX, bounds.maxX);
    nz = clamp(trash.z + (dz / dist) * min, bounds.minZ, bounds.maxZ);
  }
  player.x = nx;
  player.z = nz;
  const targetYaw = Math.atan2(dir.x, dir.y);
  let delta = targetYaw - player.yaw;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  player.yaw += delta * Math.min(1, dt * 18);
}

function spotId(index) {
  return `board-${Math.max(0, index)}`;
}

function nextStep() {
  const cooked = slots.some((slot) => slot.state === "cooked");
  const onGrill = slots.some((slot) => slot.state !== "empty");
  const empty = state.mats.findIndex((mat) => !mat.bun && !mat.sausage);
  const needsDog = state.mats.findIndex((mat) => mat.bun && !mat.sausage);
  const ready = state.mats.findIndex((mat) => mat.bun && mat.sausage);
  if (needsDog >= 0 && cooked) return { station: "grill", text: "Drag a gold dog onto a bun. It snaps." };
  if (needsDog >= 0 && !onGrill) return { station: "dogs", text: "Click the stack of dogs to fill the grill." };
  if (needsDog >= 0) return { station: "grill", text: "The grill is working. Click the stack to add more dogs." };
  if (ready >= 0) {
    const mat = state.mats[ready];
    return mat.toppings.length
      ? { station: spotId(ready), text: "Drag that dog to the customer with the matching bubble." }
      : { station: spotId(ready), text: "Click a bottle to add what the bubble shows, then drag it over." };
  }
  if (empty >= 0) return { station: "buns", text: "Click the bun stack. You can lay out three." };
  return { station: "buns", text: "Drag a finished dog to a customer and take the money." };
}

function simulate(dt) {
  // The cook stays behind the counter. Play is clicking and dragging the food, not walking.
  if (state.phase === "banner") {
    state.bannerT -= dt;
    if (state.bannerT <= 0) {
      state.phase = "play";
      $("banner").hidden = true;
      say(line(currentDef(), "start"), "quip");
    }
    return;
  }
  if (state.phase !== "play") return;

  slots.forEach((slot) => {
    if (slot.state === "empty") return;
    slot.t += dt;
    let next = "cooking";
    if (slot.t >= COOK + BURN) next = "burnt";
    else if (slot.t >= COOK) next = "cooked";
    if (next !== slot.state) {
      slot.state = next;
      if (next === "cooked") audio.ding();
      if (next === "burnt") {
        audio.burn();
        say(line(currentDef(), "burn"), "quip");
        buzz(18);
      }
    }
  });

  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      onLeave(order);
    }
  }

  state.timeLeft -= dt;
  if (state.timeLeft <= 15 && !state.lastCall) {
    state.lastCall = true;
    say("Last call. Serve what you can.", "quip");
  }
  if (state.timeLeft <= 0) {
    endShift();
    return;
  }

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    const cfg = shiftConfig(state.shift);
    state.spawnIn = cfg.spawnEvery;
    if (state.orders.length < cfg.maxOrders) spawnOrder(false);
  }
}

function onLeave(order) {
  state.stats.lost += 1;
  state.combo = 0;
  const heldMatch = state.hands?.kind === "dog" && state.hands.state === "cooked" && sameSet(state.hands.toppings, order.toppings);
  const matMatch = state.mats.some((mat) => mat.bun && mat.sausage === "cooked" && sameSet(mat.toppings, order.toppings));
  floater(heldMatch || matMatch ? "SO CLOSE" : "LEFT", "bad");
  if (heldMatch || matMatch) say("So close. That one walked.", "quip");
  else say(line(currentDef(), "fail"), "quip");
  audio.fail();
  buzz(14);
  state.shake = reduceMotion ? 0 : 0.08;
  state.emote = 0.45;
  state.emoteKind = "shake";
}

function emote(kind) {
  state.emote = 0.7;
  state.emoteKind = kind;
  state.shake = reduceMotion ? 0 : kind === "point" ? 0.08 : 0.11;
}

function onAction(forced, fromWalk) {
  if (state.mode !== "play" || state.paused || state.phase === "end") return;
  const now = performance.now();
  if (!fromWalk && now < nextActionAt) return;
  nextActionAt = now + 160;
  const station = forced || nearestStation();
  if (!station) {
    const hint = nextStep();
    const target = LAYOUT.stations.find((item) => item.id === hint.station);
    if (target) walkTo(target.x, target.z, target.id);
    audio.click();
    return;
  }
  if (station.type === "buns") doBuns();
  else if (station.type === "dogs") doDogs();
  else if (station.type === "grill") doGrill();
  else if (station.type === "board") doBoard(station);
  else if (station.type === "serve") doServe();
  else if (station.type === "trash") doTrash();
}

function doBuns() {
  if (state.hands) return say("Hands full. Serve it or trash it.");
  state.hands = { kind: "bun" };
  audio.pickup();
  buzz(8);
}

function doDogs() {
  if (state.hands) return say("Hands full. Serve it or trash it.");
  state.hands = { kind: "sausage", state: "raw" };
  audio.pickup();
  buzz(8);
}

function doGrill() {
  const hands = state.hands;
  if (hands?.kind === "sausage" && hands.state === "raw") {
    const open = slots.find((slot) => slot.state === "empty");
    if (!open) return say("Grill is full.");
    open.state = "cooking";
    open.t = 0;
    state.hands = null;
    audio.grill();
    buzz(10);
    return;
  }
  if (hands) return say("Only a raw dog goes on the grill.");
  const cooked = slots.reduce((best, slot) => (slot.state === "cooked" && (!best || slot.t > best.t) ? slot : best), null);
  const burnt = slots.find((slot) => slot.state === "burnt");
  const take = cooked || burnt;
  if (!take) return say("Nothing ready. Wait for the gold ring.");
  state.hands = { kind: "sausage", state: take.state };
  take.state = "empty";
  take.t = 0;
  audio.pickup();
  if (state.hands.state === "burnt") say("Burnt. Walk it to the trash.");
}

function doBoard(station) {
  const mat = state.mats[station?.mat ?? 0];
  const spot = (station?.mat ?? 0) + 1;
  const hands = state.hands;
  if (hands?.kind === "bun") {
    if (mat.bun || mat.sausage) return say(`Bun ${spot} is taken. Use another spot.`);
    mat.bun = true;
    state.hands = null;
    audio.pickup();
    return;
  }
  if (hands?.kind === "sausage") {
    if (hands.state === "raw") return say("Grill that dog first.");
    if (!mat.bun) return say(`Bun ${spot} is empty. Set a bun there first.`);
    if (mat.sausage) return say(`Bun ${spot} already has a dog.`);
    mat.sausage = hands.state;
    state.hands = null;
    audio.pickup();
    if (hands.state === "burnt") say("That one is burnt. It will not sell.");
    return;
  }
  if (hands?.kind === "dog") {
    if (mat.bun || mat.sausage) return say(`Clear bun ${spot} before putting that back.`);
    mat.bun = true;
    mat.sausage = hands.state;
    mat.toppings.splice(0, mat.toppings.length, ...hands.toppings);
    state.hands = null;
    audio.pickup();
    say("Back on the board. Fix the toppings.");
    return;
  }
  if (mat.bun && mat.sausage) {
    state.hands = { kind: "dog", state: mat.sausage, toppings: mat.toppings.slice() };
    mat.bun = false;
    mat.sausage = null;
    mat.toppings.length = 0;
    audio.pickup();
    return;
  }
  if (mat.bun) {
    state.hands = { kind: "bun" };
    mat.bun = false;
    mat.toppings.length = 0;
    audio.pickup();
    return;
  }
  say(`Bun ${spot} is open. Set a bun, then a grilled dog.`);
}

function doServe() {
  const hands = state.hands;
  if (!hands || hands.kind !== "dog") return say("Bring a finished dog to the window.");
  const result = evaluateServe(state.orders, hands);
  if (!result.ok) {
    state.stats.wrong += 1;
    state.combo = 0;
    emote("shake");
    audio.fail();
    buzz(20);
    nextActionAt = performance.now() + 350;
    if (result.reason === "burnt") {
      floater("BURNT", "bad");
      say(line(currentDef(), "burn"), "quip");
    } else if (result.reason === "wrong") {
      floater("WRONG", "bad");
      say(line(currentDef(), "fail"), "quip");
    } else say("Nobody is waiting for that.");
    return;
  }
  const idx = state.orders.findIndex((order) => order.id === result.order.id);
  if (playPack.customers[idx]) playPack.customers[idx].userData.pop = 1;
  const gained = scoreServe(result.order, state.combo + 1);
  state.combo += 1;
  state.stats.bestCombo = Math.max(state.stats.bestCombo, state.combo);
  state.score += gained.total;
  state.stats.served += 1;
  if (gained.perfect) state.stats.perfect += 1;
  state.orders.splice(idx, 1);
  state.hands = null;
  floater(`+${gained.total}`, "good");
  if (gained.perfect) floater("PERFECT", "hot");
  if (state.combo >= 2) floater(`x${state.combo}`, "hot");
  audio.serve();
  buzz(15);
  emote("point");
  say(line(currentDef(), "serve"), "quip");
  playPack.bell.userData.ding = 1;
  for (let n = 0; n < 8; n += 1) playPack.steam.spawn(4.55, 1.4, -1.6, 0xffd56a);
}

function doTrash() {
  if (!state.hands) return say("Grab the mistake, then trash it.");
  const burnt = state.hands.state === "burnt";
  state.hands = null;
  audio.grill();
  floater(burnt ? "DUMPED" : "TOSSED", "bad");
  if (!burnt) say("There went a perfectly good dog.");
}

function onTopping(id, matIndex = state.focusMat) {
  const mat = state.mats[matIndex];
  if (!mat?.bun || !mat.sausage) return say("Drag a grilled dog onto a bun first.");
  const index = mat.toppings.indexOf(id);
  if (index >= 0) mat.toppings.splice(index, 1);
  else mat.toppings.push(id);
  audio.click();
}

function describeAction() {
  const station = nearestStation();
  if (!station) {
    const where = { buns: "BUNS", dogs: "DOGS", grill: "GRILL", board: "BUILD", serve: "SERVE", trash: "TRASH" };
    return ["GO", `Run to ${where[nextStep().station]}`, true];
  }
  const hands = state.hands;
  if (station.type === "buns") return hands ? ["FULL", "Hands are full", false] : ["BUN", "Grab a bun", true];
  if (station.type === "dogs") return hands ? ["FULL", "Hands are full", false] : ["DOG", "Grab a raw dog", true];
  if (station.type === "grill") {
    if (hands?.kind === "sausage" && hands.state === "raw") {
      return slots.some((slot) => slot.state === "empty") ? ["GRILL", "Drop it on the heat", true] : ["FULL", "Grill is full", false];
    }
    if (hands) return ["FULL", "Hands are full", false];
    if (slots.some((slot) => slot.state === "cooked")) return ["TAKE", "Gold means done", true];
    if (slots.some((slot) => slot.state === "burnt")) return ["TAKE", "Burnt. Trash it", true];
    const cooking = slots.filter((slot) => slot.state === "cooking").sort((a, b) => b.t - a.t)[0];
    if (cooking) return ["WAIT", `${Math.min(99, Math.floor((cooking.t / COOK) * 100))}%`, false];
    return ["GRILL", "Bring a raw dog", false];
  }
  if (station.type === "board") {
    const mat = state.mats[station.mat ?? 0];
    if (hands?.kind === "bun") return mat.bun || mat.sausage ? ["BUSY", "Try another bun spot", false] : ["PLACE", "Put the bun down", true];
    if (hands?.kind === "sausage") {
      if (hands.state === "raw") return ["GRILL", "Cook it before stacking", false];
      if (!mat.bun) return ["BUN?", "Need a bun first", false];
      if (mat.sausage) return ["BUSY", "Dog already there", false];
      return ["STACK", "Add the dog", true];
    }
    if (hands?.kind === "dog") return mat.bun || mat.sausage ? ["BUSY", "Clear the board", false] : ["FIX", "Put it back", true];
    if (mat.bun && mat.sausage) return ["GRAB", "Pick up the dog", true];
    if (mat.bun) return ["GRAB", "Pick the bun up", true];
    return ["BOARD", "Place a bun", false];
  }
  if (station.type === "serve") return hands?.kind === "dog" ? ["SERVE", "Match the ticket", true] : ["SERVE", "Bring a finished dog", false];
  if (hands) return ["TRASH", hands.state === "burnt" ? "Dump the burnt dog" : "Toss what you hold", true];
  return ["TRASH", "Nothing to toss", false];
}

function describeHands() {
  const hands = state.hands;
  if (!hands) return "Hands free";
  if (hands.kind === "bun") return "Holding a bun";
  if (hands.kind === "sausage") return hands.state === "raw" ? "Holding a raw dog" : hands.state === "burnt" ? "Holding a burnt dog" : "Holding a grilled dog";
  const title = orderTitle(hands.toppings);
  return hands.state === "burnt" ? "Holding a burnt dog" : `Holding ${title}`;
}

function foodSpecFromHands() {
  const hands = state.hands;
  if (!hands) return null;
  if (hands.kind === "bun") return { bun: true, sausage: null, toppings: [] };
  if (hands.kind === "sausage") return { bun: false, sausage: hands.state, toppings: [] };
  return { bun: true, sausage: hands.state, toppings: hands.toppings };
}

function updateHud() {
  const station = nearestStation();
  const nearBoard = station?.type === "board";
  $("toppings").hidden = !nearBoard;
  const mat = nearBoard ? state.mats[station.mat ?? 0] : state.mats[0];
  TOPPINGS.forEach((topping) => {
    const button = document.querySelector(`[data-top="${topping.id}"]`);
    button.classList.toggle("on", mat.toppings.includes(topping.id));
  });
  const hint = nextStep();
  document.querySelectorAll("[data-go]").forEach((button) => {
    const id = button.dataset.go;
    const target = LAYOUT.stations.find((item) => item.id === id);
    button.classList.toggle("next", id === hint.station);
    button.classList.toggle("here", station?.id === id);
    const note = button.querySelector("small");
    if (!note || !target) return;
    let text = "";
    if (target.type === "board") {
      const spot = state.mats[target.mat];
      if (spot.bun && spot.sausage) text = spot.toppings.length ? `${spot.toppings.length} tops` : "ready";
      else if (spot.bun) text = "bun down";
      else text = "empty";
    } else if (target.type === "grill") {
      const done = slots.filter((slot) => slot.state === "cooked").length;
      text = done ? `${done} done` : "heat";
    } else if (target.type === "buns") text = "grab";
    else if (target.type === "dogs") text = "raw";
    else if (target.type === "serve") text = "window";
    else text = "dump";
    if (note.textContent !== text) note.textContent = text;
  });
  const hold = describeHands();
  if ($("holding").textContent !== hold) $("holding").textContent = hold;
  $("score").textContent = `$${state.score.toLocaleString()}`;
  const goalLabel = `Goal $${shiftConfig(state.shift).twoStar.toLocaleString()}`;
  if ($("holding").textContent !== goalLabel) $("holding").textContent = goalLabel;
  $("combo").hidden = state.combo < 2;
  $("combo").textContent = `x${state.combo} COMBO`;
  $("timer").textContent = formatTime(state.timeLeft);
  $("timer").classList.toggle("danger", state.timeLeft <= 15 && state.phase === "play");
  const signature = state.orders.map((order) => `${order.id}:${order.toppings.join(",")}`).join("|");
  if (signature !== $("tickets").dataset.sig) {
    $("tickets").dataset.sig = signature;
    paintTickets();
  }
  [...$("tickets").children].forEach((card, index) => {
    const order = state.orders[index];
    if (!order) return;
    const ratio = clamp(order.patience / order.maxPatience, 0, 1);
    card.querySelector("i").style.transform = `scaleX(${ratio})`;
    card.classList.toggle("hot", ratio < 0.3);
    card.classList.toggle("match", readyMatch(order));
  });
}

function readyMatch(order) {
  const hands = state.hands;
  if (hands?.kind === "dog" && hands.state === "cooked" && sameSet(hands.toppings, order.toppings)) return true;
  return state.mats.some((mat) => mat.bun && mat.sausage === "cooked" && sameSet(mat.toppings, order.toppings));
}

function paintTickets() {
  const host = $("tickets");
  host.innerHTML = "";
  for (let i = 0; i < 3; i += 1) {
    const order = state.orders[i];
    const card = document.createElement("article");
    card.className = "ticket";
    card.hidden = !order;
    if (order) {
      const icons = order.toppings.length
        ? order.toppings
            .map((id) => {
              const topping = TOPPINGS.find((item) => item.id === id);
              return `<span class="pip" style="--pip:${topping.color}">${topping.letter}</span>`;
            })
            .join("")
        : `<span class="pip plain">Plain</span>`;
      card.innerHTML = `<header><span>#${order.id}</span><b>${orderTitle(order.toppings)}</b></header><div class="icons">${icons}</div><div class="bar"><i></i></div>`;
    }
    host.appendChild(card);
  }
}

function formatTime(value) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function updatePlayVisuals(dt) {
  if (state.emote > 0) state.emote = Math.max(0, state.emote - dt);
  const dir = axis();
  const moving = state.mode === "play" && !state.paused && state.phase !== "end" && Math.hypot(dir.x, dir.y) > 0.05;
  actor.position.set(player.x, 0, player.z);
  actor.rotation.y = Math.PI;
  updateActor(actor, dt, {
    moving,
    point: state.emoteKind === "point" && state.emote > 0,
    shake: state.emoteKind === "shake" ? state.emote : 0,
    hop: state.emoteKind === "point" ? state.emote / 0.7 : 0,
  });

  const spec = foodSpecFromHands();
  const nextHeld = spec ? JSON.stringify(spec) : "";
  if (nextHeld !== heldSig) {
    heldSig = nextHeld;
    clearGroup(actor.userData.hold);
    if (spec) actor.userData.hold.add(makeFood(spec));
  }

  const nextMat = JSON.stringify(state.mats);
  if (nextMat !== matSig) {
    matSig = nextMat;
    state.mats.forEach((mat, index) => {
      const view = playPack.mats[index];
      clearGroup(view.food);
      if (mat.bun || mat.sausage) {
        const food = makeFood({ bun: mat.bun, sausage: mat.sausage, toppings: mat.toppings });
        food.scale.setScalar(1.35);
        view.food.add(food);
      }
    });
  }
  const near = nearestStation();
  playPack.mats.forEach((view, index) => {
    const on = state.focusMat === index && (state.mats[index].bun || state.mats[index].sausage);
    view.pad.material.emissive.setHex(on ? 0xffd56a : 0x000000);
    view.pad.material.emissiveIntensity = on ? 0.45 : 0;
  });

  playPack.slots.forEach((view, index) => {
    const slot = slots[index];
    view.dog.visible = slot.state !== "empty";
    if (view.dog.visible) colorGrillDog(view.dog, slot.t, COOK, BURN);
    ringColor(view.ring.material, slot.state, slot.t, COOK);
    const pulse = slot.state === "cooked" ? 1 + Math.sin(performance.now() / 140) * 0.14 : 1;
    view.ring.scale.set(pulse, pulse, pulse);
  });

  playPack.customers.forEach((customer, index) => {
    const order = state.orders[index];
    customer.visible = !!order && state.phase !== "idle";
    if (!customer.visible) return;
    const mood = order.patience / order.maxPatience;
    customer.userData.phase += dt;
    customer.userData.pop = Math.max(0, customer.userData.pop - dt);
    const hop = customer.userData.pop > 0 ? Math.sin(customer.userData.pop * Math.PI) * 0.18 : 0;
    customer.position.y = Math.sin(customer.userData.phase * 2.2) * 0.03 + hop;
    customer.userData.smile.visible = mood >= 0.3;
    customer.userData.frown.visible = mood < 0.3;
  });

  const station = nearestStation();
  const hint = nextStep();
  const guide = $("guide-text");
  if (guide && guide.textContent !== hint.text) guide.textContent = hint.text;
  Object.entries(playPack.stationPads).forEach(([id, pad]) => {
    const here = station?.id === id;
    const suggested = hint.station === id;
    const pulse = suggested ? 1.08 + Math.sin(performance.now() / 180) * 0.08 : here ? 1.05 : 0.92;
    pad.scale.setScalar(pulse);
  });
  playPack.marker.visible = false;
  playPack.bubbles?.forEach((bubble, index) => {
    const order = state.orders[index];
    const mood = order ? Math.ceil((order.patience / order.maxPatience) * 8) : 0;
    const sig = order ? `${order.id}:${order.toppings.join(",")}:${mood}` : "";
    if (bubble.userData.sig !== sig) {
      bubble.userData.sig = sig;
      paintOrderBubble(bubble, order);
    }
  });
  const mark = LAYOUT.stations.find((item) => item.id === (goal?.act || hint.station));
  if (mark) {
    playPack.marker.position.x = mark.x;
    playPack.marker.position.z = mark.z;
  }

  steamAcc += dt;
  if (steamAcc > 0.22) {
    steamAcc = 0;
    slots.forEach((slot, index) => {
      if (slot.state === "empty") return;
      const view = playPack.slots[index];
      playPack.steam.spawn(view.x, 1.25, view.z, slot.state === "burnt" ? 0x9a9a9a : 0xffffff);
    });
  }
  playPack.steam.update(dt);
  const ding = playPack.bell.userData.ding || 0;
  playPack.bell.rotation.z = Math.sin(performance.now() / 30) * ding * 0.4;
  playPack.bell.userData.ding = ding * Math.exp(-3.2 * dt);

  applyPlayCamera(camera.aspect, reduceMotion ? 1 : 1 - Math.exp(-16 * dt));
  if (state.shake > 0) state.shake *= Math.exp(-3.5 * dt);
  playPack.grillBed.material.emissiveIntensity = 0.25 + slots.filter((slot) => slot.state === "cooking" || slot.state === "cooked").length * 0.12;
}

function updateSelect(dt) {
  if (!actor) return;
  const sway = -0.18 + Math.sin(performance.now() / 900) * 0.16;
  actor.position.set(0, 0.4, 0);
  actor.rotation.y = sway;
  updateActor(actor, dt, { wave: true, select: true });
  selectScene.userData.ring.rotation.z += dt * 0.35;
  quoteTimer += dt;
  if (quoteTimer > 3.4) {
    quoteTimer = 0;
    cycleQuote();
  }
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (dt > 0.05) slowFrames += 1;
  else slowFrames = Math.max(0, slowFrames - 1);
  if (!dprDropped && slowFrames > 40 && state.dprCap > 1) {
    state.dprCap = 1;
    dprDropped = true;
    resize();
  }
  if (state.mode === "select") updateSelect(dt);
  else {
    if (!state.paused && state.phase !== "end") simulate(dt);
    updatePlayVisuals(dt);
    updateHud();
  }
  audio.update();
  renderer.render(state.mode === "select" ? selectScene : playPack.scene, camera);
  requestAnimationFrame(loop);
}

function openHelp(mode) {
  state.helpMode = mode;
  $("help-go").textContent = mode === "intro" ? "Fire up the grill" : state.mode === "play" ? "Back to the rush" : "Got it";
  $("modal-help").hidden = false;
}

function openPause() {
  if (state.mode !== "play" || state.phase === "end" || state.paused) return;
  state.paused = true;
  $("pause-music").textContent = audio.musicOn ? "Diner radio: on" : "Diner radio: off";
  $("pause-hands").textContent = document.body.classList.contains("lefty") ? "Controls: left-handed" : "Controls: right-handed";
  $("modal-pause").hidden = false;
}

function floorPoint(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  return raycaster.ray.intersectPlane(floorPlane, floorHit) ? floorHit.clone() : null;
}

function walkTo(x, z, act) {
  const { bounds } = LAYOUT;
  goal = {
    x: clamp(x, bounds.minX, bounds.maxX),
    z: clamp(z, bounds.minZ, bounds.maxZ),
    act: act || null,
  };
}

const counterPlane = new Plane(new Vector3(0, 1, 0), -1.16);
const counterHit = new Vector3();
let pointer = null;

function project(x, y, z) {
  const v = new Vector3(x, y, z).project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
    ndcX: v.x,
    ndcY: v.y,
    behind: v.z > 1,
  };
}

function pickAt(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(playPack.scene.children, true);
  for (const hit of hits) {
    let obj = hit.object;
    while (obj) {
      if (obj.userData?.pick) return obj.userData.pick;
      obj = obj.parent;
    }
  }
  return null;
}

function counterPoint(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  return raycaster.ray.intersectPlane(counterPlane, counterHit) ? counterHit.clone() : null;
}

function nearestDrop(point) {
  if (!point) return null;
  let best = null;
  let bestD = 0.72;
  LAYOUT.mats.forEach((mat, index) => {
    const dist = Math.hypot(point.x - mat.x, point.z - mat.z);
    if (dist < bestD) {
      bestD = dist;
      best = { type: "plate", index };
    }
  });
  LAYOUT.customers.forEach((spot, index) => {
    const dist = Math.hypot(point.x - spot.x, point.z - spot.z);
    if (dist < 1.05 && dist < bestD + 0.35) {
      bestD = dist;
      best = { type: "customer", index };
    }
  });
  const trash = LAYOUT.stations.find((station) => station.type === "trash");
  if (Math.hypot(point.x - trash.x, point.z - trash.z) < 0.85) best = { type: "trash" };
  return best;
}

function showGhost(spec, point) {
  const group = playPack.drag;
  if (!group) return;
  while (group.children.length) group.remove(group.children[0]);
  const food = makeFood(spec);
  food.scale.setScalar(1.35);
  group.add(food);
  group.visible = true;
  if (point) group.position.set(point.x, 1.25, point.z);
}

function clearGhost() {
  const group = playPack.drag;
  if (!group) return;
  while (group.children.length) group.remove(group.children[0]);
  group.visible = false;
}

function placeBun() {
  const index = state.mats.findIndex((mat) => !mat.bun && !mat.sausage);
  if (index < 0) return say("Three buns are already out.");
  state.mats[index].bun = true;
  state.focusMat = index;
  audio.pickup();
  buzz(8);
}

function placeOnGrill() {
  const open = slots.find((slot) => slot.state === "empty");
  if (!open) return say("Grill is full. Drag one off first.");
  open.state = "cooking";
  open.t = 0;
  audio.grill();
  buzz(10);
}

function servePlate(matIndex, customerIndex) {
  const mat = state.mats[matIndex];
  const order = state.orders[customerIndex];
  const item = { kind: "dog", state: mat.sausage, toppings: mat.toppings.slice() };
  if (!order) return say("Nobody is standing there.");
  const matches = item.state === "cooked" && sameSet(order.toppings, item.toppings);
  if (!matches) {
    state.stats.wrong += 1;
    state.combo = 0;
    emote("shake");
    audio.fail();
    buzz(20);
    floater(item.state === "burnt" ? "BURNT" : "WRONG", "bad");
    say(item.state === "burnt" ? line(currentDef(), "burn") : line(currentDef(), "fail"));
    return;
  }
  const gained = scoreServe(order, state.combo + 1);
  state.combo += 1;
  state.stats.bestCombo = Math.max(state.stats.bestCombo, state.combo);
  state.score += gained.total;
  state.stats.served += 1;
  if (gained.perfect) state.stats.perfect += 1;
  state.orders.splice(customerIndex, 1);
  mat.bun = false;
  mat.sausage = null;
  mat.toppings.length = 0;
  if (playPack.customers[customerIndex]) playPack.customers[customerIndex].userData.pop = 1;
  floater(`+$${gained.total}`, "good");
  if (gained.perfect) floater("PERFECT", "hot");
  if (state.combo >= 2) floater(`x${state.combo}`, "hot");
  audio.serve();
  buzz(15);
  emote("point");
  say(line(currentDef(), "serve"), "quip");
  playPack.bell.userData.ding = 1;
  const spot = LAYOUT.customers[customerIndex];
  for (let n = 0; n < 8; n += 1) playPack.steam.spawn(spot.x, 1.5, spot.z, 0xffd56a);
}

function finishDrag(drag, drop) {
  if (drag.from === "grill") {
    const slot = slots[drag.index];
    if (drop?.type === "trash") {
      slot.state = "empty";
      slot.t = 0;
      floater("TOSSED", "bad");
      audio.grill();
      return;
    }
    if (drop?.type === "plate" && (slot.state === "cooked" || slot.state === "burnt")) {
      const mat = state.mats[drop.index];
      if (!mat.bun) return say("Click the bun stack first.");
      if (mat.sausage) return say("That bun already has a dog.");
      const cooked = slot.state;
      mat.sausage = cooked;
      slot.state = "empty";
      slot.t = 0;
      state.focusMat = drop.index;
      audio.pickup();
      say(cooked === "burnt" ? "That one is burnt. It will not sell." : "Snapped onto the bun.");
      return;
    }
    return say("Drag a cooked dog onto an open bun.");
  }
  const mat = state.mats[drag.index];
  if (drop?.type === "trash") {
    mat.bun = false;
    mat.sausage = null;
    mat.toppings.length = 0;
    floater("TOSSED", "bad");
    audio.grill();
    return;
  }
  if (drop?.type === "customer" && mat.sausage) {
    servePlate(drag.index, drop.index);
    return;
  }
  if (drop?.type === "plate" && drop.index !== drag.index && !mat.sausage) {
    const dest = state.mats[drop.index];
    if (!dest.bun && !dest.sausage) {
      dest.bun = true;
      mat.bun = false;
      state.focusMat = drop.index;
      audio.pickup();
      return;
    }
  }
  if (mat.sausage) say("Drag it onto the customer whose bubble matches.");
}

function dropTarget(drag, event) {
  const picked = pickAt(event);
  const near = nearestDrop(counterPoint(event));
  const ok = drag.from === "grill" ? ["plate", "trash"] : ["customer", "trash", "plate"];
  if (picked && ok.includes(picked.type)) return picked;
  return near || picked;
}

function onPointerDown(event) {
  if (state.mode !== "play" || state.paused || state.phase === "end") return;
  audio.resume();
  const pick = pickAt(event);
  let drag = null;
  if (pick?.type === "grill") {
    const slot = slots[pick.index];
    if (slot.state === "cooked" || slot.state === "burnt") {
      drag = { from: "grill", index: pick.index, spec: { bun: false, sausage: slot.state, toppings: [] } };
    }
  } else if (pick?.type === "plate") {
    const mat = state.mats[pick.index];
    state.focusMat = pick.index;
    if (mat.sausage) drag = { from: "plate", index: pick.index, spec: { bun: true, sausage: mat.sausage, toppings: mat.toppings.slice() } };
    else if (mat.bun) drag = { from: "bun", index: pick.index, spec: { bun: true, sausage: null, toppings: [] } };
  }
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, pick, drag, moved: false, pan: state.pan };
  if (drag) showGhost(drag.spec, counterPoint(event));
  renderer.domElement.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (Math.hypot(dx, dy) > 12) pointer.moved = true;
  if (pointer.drag) {
    const point = counterPoint(event);
    if (point && playPack.drag) playPack.drag.position.set(point.x, 1.28, point.z);
    return;
  }
  if (pointer.moved) state.pan = clamp(pointer.pan - dx * 0.008, -0.9, 0.9);
}

function onPointerUp(event) {
  if (!pointer || pointer.id !== event.pointerId) return;
  const info = pointer;
  pointer = null;
  clearGhost();
  if (info.drag && info.moved) {
    finishDrag(info.drag, dropTarget(info.drag, event));
    return;
  }
  if (info.moved || !info.pick) return;
  const pick = info.pick;
  if (pick.type === "buns") placeBun();
  else if (pick.type === "dogs") placeOnGrill();
  else if (pick.type === "bottle") onTopping(pick.id, state.focusMat);
  else if (pick.type === "grill") {
    const slot = slots[pick.index];
    if (slot.state === "cooking") say("Still on the heat. Wait for gold, then drag it.");
    else if (slot.state === "empty") placeOnGrill();
  } else if (pick.type === "plate") audio.click();
}

function bindInput() {
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);

  document.querySelectorAll("[data-top]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      onTopping(button.dataset.top);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    const typing = document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
    if (typing) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    audio.resume();
    if (state.mode === "select" && $("modal-help").hidden && $("modal-results").hidden) {
      if (event.code === "ArrowRight" || event.code === "ArrowLeft" || event.code === "Enter") event.preventDefault();
      if (event.code === "ArrowRight") stepPresident(1);
      if (event.code === "ArrowLeft") stepPresident(-1);
      if (event.code === "Enter") $("start-btn").click();
    }
    if (event.code === "Escape") {
      if (!$("modal-help").hidden && state.helpMode !== "intro") $("modal-help").hidden = true;
      else if (!$("modal-pause").hidden) {
        state.paused = false;
        $("modal-pause").hidden = true;
      }
    }
    if (state.mode === "play" && !state.paused && state.phase !== "end") {
      if (event.code === "Space") placeBun();
      if (event.code === "KeyE") placeOnGrill();
      const toppingIndex = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(event.code);
      if (toppingIndex >= 0) onTopping(TOPPINGS[toppingIndex].id);
      if (event.code === "KeyP") openPause();
      if (event.code === "KeyM") $("btn-mute").click();
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => {
    keys.clear();
    stick.x = 0;
    stick.y = 0;
  });
}

function bindUi() {
  const roster = $("roster");
  PRESIDENTS.forEach((def) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = def.id;
    button.setAttribute("role", "option");
    button.innerHTML = `<i style="background:${def.accent}"></i>${def.short}`;
    button.addEventListener("click", () => {
      audio.resume();
      showPresident(def.id);
      audio.click();
    });
    roster.appendChild(button);
  });
  $("arrow-prev").addEventListener("click", () => stepPresident(-1));
  $("arrow-next").addEventListener("click", () => stepPresident(1));
  $("preview").addEventListener("pointerdown", (event) => {
    $("preview").dataset.x = String(event.clientX);
    $("preview").dataset.y = String(event.clientY);
  });
  $("preview").addEventListener("pointerup", (event) => {
    const dx = event.clientX - Number($("preview").dataset.x || event.clientX);
    const dy = event.clientY - Number($("preview").dataset.y || event.clientY);
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) stepPresident(dx < 0 ? 1 : -1);
  });
  $("start-btn").addEventListener("click", () => {
    audio.resume();
    const save = loadSave();
    if (!save.helpSeen && !params.has("play")) openHelp("intro");
    else startShift();
  });
  $("help-go").addEventListener("click", () => {
    $("modal-help").hidden = true;
    if (state.helpMode === "intro") {
      writeSave({ helpSeen: true });
      startShift();
    }
  });
  $("btn-pause").addEventListener("click", openPause);
  $("pause-resume").addEventListener("click", () => {
    state.paused = false;
    $("modal-pause").hidden = true;
  });
  $("pause-help").addEventListener("click", () => openHelp("pause"));
  $("pause-hands").addEventListener("click", () => {
    document.body.classList.toggle("lefty");
    const lefty = document.body.classList.contains("lefty");
    writeSave({ hands: lefty ? "left" : "right" });
    $("pause-hands").textContent = lefty ? "Controls: left-handed" : "Controls: right-handed";
  });
  $("pause-music").addEventListener("click", () => {
    audio.resume();
    const on = audio.toggleMusic();
    writeSave({ music: on });
    $("pause-music").textContent = on ? "Diner radio: on" : "Diner radio: off";
  });
  $("pause-quit").addEventListener("click", () => {
    state.paused = false;
    state.phase = "idle";
    $("modal-pause").hidden = true;
    $("banner").hidden = true;
    if (actor?.parent) actor.parent.remove(actor);
    setMode("select");
    showPresident(state.presidentId);
  });
  $("btn-mute").addEventListener("click", () => {
    audio.resume();
    const muted = audio.toggleMute();
    writeSave({ muted });
    $("btn-mute").textContent = muted ? "🔇" : "🔊";
    $("btn-mute").setAttribute("aria-label", muted ? "Unmute" : "Mute");
  });
  $("results-next").addEventListener("click", () => {
    state.shift += 1;
    startShift();
  });
  $("results-retry").addEventListener("click", () => startShift());
  $("results-pres").addEventListener("click", () => {
    state.phase = "idle";
    $("modal-results").hidden = true;
    if (actor?.parent) actor.parent.remove(actor);
    setMode("select");
    showPresident(state.presidentId);
  });
  $("btn-help-select").addEventListener("click", () => openHelp("pause"));
  document.addEventListener("pointerdown", () => audio.resume(), { once: false });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) openPause();
  });
}

function fitWindow() {
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty("--app-h", `${height}px`);
  if (renderer) resize();
}

function fail(message) {
  $("loader").hidden = true;
  $("screen-select").hidden = false;
  $("preview").innerHTML = `<p class="fail">${message}</p>`;
}

function bootReal() {
  const save = loadSave();
  state.dprCap = Math.min(window.innerWidth, window.innerHeight) < 760 ? 1.25 : 1.75;
  if (save.hands === "left") document.body.classList.add("lefty");
  audio.setMuted(!!save.muted);
  audio.setMusic(save.music !== false);
  $("btn-mute").textContent = save.muted ? "🔇" : "🔊";
  const requested = params.get("as");
  state.presidentId = PRESIDENTS.some((item) => item.id === requested) ? requested : save.lastId || "bush";

  try {
    renderer = createRenderer();
  } catch {
    fail("This phone blocked 3D graphics, so the diner cannot open. Try another browser.");
    return;
  }
  if (!renderer.getContext()) {
    fail("This phone blocked 3D graphics, so the diner cannot open. Try another browser.");
    return;
  }
  camera = new PerspectiveCamera(36, 1, 0.05, 80);
  try {
    const select = buildSelectScene();
    selectScene = select.scene;
    selectScene.userData.ring = select.ring;
    playPack = buildKitchen();
    playPack.drag = new Group();
    playPack.scene.add(playPack.drag);
    bindUi();
    bindInput();
    setMode("select");
    showPresident(state.presidentId);
    try {
      renderer.compile(selectScene, camera);
      renderer.compile(playPack.scene, camera);
    } catch {
      /* compile is a warm-up */
    }
    fitWindow();
    window.addEventListener("resize", fitWindow);
    window.visualViewport?.addEventListener("resize", fitWindow);
    window.visualViewport?.addEventListener("scroll", fitWindow);
    const watcher = new ResizeObserver(() => resize());
    watcher.observe($("preview"));
    watcher.observe($("stage"));
    $("loader").hidden = true;
    requestAnimationFrame(loop);
    let warm = 0;
    const warmer = setInterval(() => {
      actorFor(PRESIDENTS[warm].id);
      warm += 1;
      if (warm >= PRESIDENTS.length) clearInterval(warmer);
    }, 70);
    if (params.has("debug")) {
      window.__HD = {
        state,
        player,
        slots,
        startShift,
        onAction,
        stick,
        say,
        walkTo,
        placeBun,
        placeOnGrill,
        servePlate,
        finishDrag,
        onTopping,
        camera,
        project,
        LAYOUT,
      };
    }
    if (params.has("play")) startShift();
  } catch (error) {
    console.error(error);
    fail("The diner could not start on this device. Refresh and try again.");
  }
}

bootReal();
