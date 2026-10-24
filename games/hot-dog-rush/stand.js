import {
  COOK,
  DAY_FRAMES,
  DAYS,
  NEW_ITEM,
  PENALTY,
  PEOPLE,
  PLACES,
  SERVE_FRAMES,
  advanceCook,
  applyMeter,
  cookMarks,
  dayLabel,
  easePatience,
  finalizeBill,
  levelAt,
  menuAt,
  nextCrowd,
  offerDrink,
  offerFries,
  patienceMarks,
  quoteSnack,
  rollOrder,
  tickPatience,
  trashCost,
  waitingFor,
} from "./stand-logic.js";

const BASE_W = 1280;
const BASE_H = 720;
let W = BASE_W;
let H = BASE_H;
const SAVE_KEY = "hot-dog-rush-stand";

const BUN_SPOTS = [
  { x: 410, y: 448 },
  { x: 508, y: 466 },
  { x: 600, y: 446 },
];
const BBUN_SPOTS = [
  { x: 470, y: 410 },
  { x: 580, y: 430 },
  { x: 690, y: 415 },
];
const DOG_SPOTS = [
  { x: 870, y: 480 },
  { x: 990, y: 520 },
  { x: 900, y: 560 },
];
const PATTY_SPOTS = [
  { x: 820, y: 430 },
  { x: 930, y: 455 },
  { x: 1040, y: 430 },
];
const ONION_SPOTS = [
  { x: 360, y: 430 },
  { x: 250, y: 460 },
];
const FRIE_SPOTS = [
  { x: 130, y: 512 },
  { x: 180, y: 524 },
  { x: 228, y: 508 },
];
const SLOT_X = [240, 480, 720, 960, 1090];
// Back lip of the counter. It sits higher on the left and drops toward the right sidewalk.
const SILL_PTS = [[0, 358], [150, 354], [280, 348], [460, 332], [680, 320], [860, 330], [1040, 348], [1180, 360], [1280, 372]];
let FEET = 530;
let BODY_H = 500;
const BUN_TILT = 16 * Math.PI / 180;
const CRATE = { x: 300, y: 200, w: 290, h: 170 };
const SAUSAGES = { x: 1085, y: 470, w: 195, h: 230 };
const KETCHUP = { x: 64, y: 145, w: 68, h: 215 };
const MUSTARD = { x: 176, y: 368, w: 44, h: 70 };
const RELISH = { x: 218, y: 370, w: 44, h: 68 };
const FRYER = { x: 96, y: 478, w: 170, h: 64 };
const TRASH = { x: 0, y: 470, w: 210, h: 250 };
const HAND_LIFT = 48;
const PATTIES = { x: 760, y: 330, w: 90, h: 90 };
const BURGER_CRATE = { x: 700, y: 250, w: 110, h: 90 };
const ONION_BIN = { x: 262, y: 374, w: 46, h: 62 };
const BOARD = { x: 292, y: 360, w: 400, h: 190 };
const GRILL = { x: 720, y: 400, w: 340, h: 210 };
const BIN = { x: 114, y: 358, w: 204, h: 90 };
const LEMON = { x: 18, y: 360, w: 70, h: 130 };
const COLA = { x: 88, y: 390, w: 70, h: 130 };
const PAUSE = { x: 1210, y: 18, w: 52, h: 52 };

const LOOK = {
  oldwoman: ["woman", 0],
  oldman: ["coat", 12],
  hiphop_man: ["hoodie", 0],
  generic_woman: ["curly", 0],
  generic_man: ["coat", -12],
  bum: ["hoodie", 28],
  worker: ["coat", 22],
  mafia_man: ["coat", -28],
  policeman: ["hoodie", -22],
  driver: ["coat", 36],
  boy: ["hoodie", 14],
  girl: ["curly", 16],
  tourist: ["coat", 8],
  tourist_girl: ["curly", -18],
  mascot: ["hoodie", 48],
  sportsman: ["hoodie", -36],
  sportswoman: ["woman", 20],
  business_woman: ["curly", 32],
  business_man: ["coat", -6],
  alien: ["hoodie", 100],
};

const TIPS = [
  "Click the bun crate to set a bun on the board.",
  "Click the sausages to put one on the grill.",
  "Wait until the hot dog turns golden.",
  "Drag the golden hot dog onto the bun.",
  "Condiments stay in your hand. Tap each bun, or drag a bottle on. Tap it again to put it down.",
  "Drag the hot dog to the customer, then tap the cash.",
];

const HINTS = [
  "Toss burnt food in the trash can on the left.",
  "A burnt hot dog gets thrown back at you.",
  "Hand over part of an order and they wait a little longer.",
  "The wrong topping comes out of the bill.",
  "Faster service pays more.",
  "Cash left on the counter blocks the next customer.",
  "Serve the angry customers first.",
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";
const showZones = new URLSearchParams(location.search).has("zones");

const view = {
  dpr: 1,
  sw: 0,
  sh: 0,
  scale: 1,
  ox: 0,
  oy: 0,
  portrait: false,
  sat: 0,
  sab: 0,
};

function snapRect(rect) {
  return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
}
function copyRect(rect, src) {
  rect.x = src.x;
  rect.y = src.y;
  rect.w = src.w;
  rect.h = src.h;
}
function snapSpots(list) {
  return list.map((spot) => ({ x: spot.x, y: spot.y }));
}
function copySpots(list, src) {
  src.forEach((spot, index) => {
    list[index].x = spot.x;
    list[index].y = spot.y;
  });
}

const LAND = {
  sill: SILL_PTS.map((point) => point.slice()),
  slots: SLOT_X.slice(),
  feet: FEET,
  body: BODY_H,
  buns: snapSpots(BUN_SPOTS),
  bbuns: snapSpots(BBUN_SPOTS),
  dogs: snapSpots(DOG_SPOTS),
  patties: snapSpots(PATTY_SPOTS),
  onions: snapSpots(ONION_SPOTS),
  fries: snapSpots(FRIE_SPOTS),
  crate: snapRect(CRATE),
  sausages: snapRect(SAUSAGES),
  ketchup: snapRect(KETCHUP),
  mustard: snapRect(MUSTARD),
  relish: snapRect(RELISH),
  fryer: snapRect(FRYER),
  trash: snapRect(TRASH),
  pattyBin: snapRect(PATTIES),
  burger: snapRect(BURGER_CRATE),
  onion: snapRect(ONION_BIN),
  lemon: snapRect(LEMON),
  cola: snapRect(COLA),
  pause: snapRect(PAUSE),
  board: snapRect(BOARD),
  grill: snapRect(GRILL),
  bin: snapRect(BIN),
};

const img = {};
const SRC = {
  bg: "assets/bg.jpg",
  woman: "assets/woman.png",
  hoodie: "assets/hoodie.png",
  curly: "assets/curly.png",
  coat: "assets/coat.png",
  bun: "assets/bun.png",
  dog0: "assets/dog-raw.png",
  dog1: "assets/dog-cook.png",
  dog2: "assets/dog-done.png",
  dog3: "assets/dog-burnt.png",
  ketchup: "assets/ketchup.png",
  mustard: "assets/mustard.png",
  bottleK: "assets/bottle-k.png",
  bottleM: "assets/bottle-m.png",
  bottleR: "assets/bottle-r.png",
  sauceK: "assets/sauce-k.png",
  sauceM: "assets/sauce-m.png",
  sauceR: "assets/sauce-r.png",
  cash: "assets/cash.png",
  fries: "assets/fries.png",
  bbun: "assets/burger-bun.png",
  patty0: "assets/patty-raw.png",
  patty1: "assets/patty-cook.png",
  patty2: "assets/patty-done.png",
  patty3: "assets/patty-burnt.png",
  onion0: "assets/onion-raw.png",
  onion1: "assets/onion-done.png",
  cola: "assets/cola.png",
  lemonade: "assets/lemonade.png",
};

const S = {
  screen: "title",
  level: 1,
  total: 0,
  score: 0,
  meter: 0.5,
  crowd: 2,
  frame: 0,
  appear: 100,
  timeOut: false,
  paused: false,
  banner: null,
  toast: null,
  moneyWarned: false,
  tip: 0,
  hint: 0,
  buns: [null, null, null],
  bbuns: [null, null, null],
  dogs: [null, null, null],
  patties: [null, null, null],
  onions: [null, null],
  fries: [false, false, false],
  fryer: null,
  slots: [],
  hand: null,
  tool: null,
  throws: [],
  rejects: [null, null, null],
  shake: 0,
  floats: [],
  px: 0,
  py: 0,
  result: null,
};

let audioCtx;
let gesture = null;
let acc = 0;
let last = 0;

function loadImages() {
  return Promise.all(Object.entries(SRC).map(([key, src]) => new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => {
      img[key] = el;
      resolve();
    };
    el.onerror = () => reject(new Error(src));
    el.src = src;
  })));
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.level >= 1 && data.level <= 30) {
      S.level = data.level;
      S.total = data.total || 0;
    }
  } catch {
    /* private mode */
  }
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ level: S.level, total: S.total }));
  } catch {
    /* ignore */
  }
}

function freshSlots() {
  S.slots = Array.from({ length: 5 }, () => ({ body: null, cash: null }));
}

function begin(level) {
  S.level = level;
  S.score = 0;
  S.meter = 0.5;
  S.crowd = 2;
  S.frame = 0;
  S.appear = levelAt(level).appear;
  S.timeOut = false;
  S.paused = false;
  S.moneyWarned = false;
  S.toast = null;
  S.tip = level === 1 ? 0 : 99;
  S.hand = null;
  S.tool = null;
  S.throws = [];
  S.rejects = [null, null, null];
  S.shake = 0;
  S.floats = [];
  S.result = null;
  S.buns = [null, null, null];
  S.bbuns = [null, null, null];
  S.dogs = [null, null, null];
  S.patties = [null, null, null];
  S.onions = [null, null];
  S.fries = [false, false, false];
  S.fryer = null;
  freshSlots();
  S.screen = "play";
  const item = NEW_ITEM[level];
  S.banner = item ? { title: "New at the stand", body: `${item} is on the counter today.` } : null;
  fitWorld();
}

function menu() {
  return menuAt(S.level);
}

function has(flag) {
  const m = menu();
  if (flag === "burger") return m.snack !== "hot_dog";
  if (flag === "fries") return m.fries > 0;
  if (flag === "onion") return m.onion;
  if (flag === "lemon") return m.drink === "lemonade" || m.drink === "both";
  if (flag === "cola") return m.drink === "cola" || m.drink === "both";
  if (flag === "mustard") return m.sauce === "mustard" || m.sauce === "both";
  return false;
}

function readInset(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

function syncActors() {
  S.slots.forEach((slot, index) => {
    if (slot.cash) {
      slot.cash.x = SLOT_X[index];
      slot.cash.y = cashY();
    }
    if (slot.body && (slot.body.state === "wait" || slot.body.state === "caught")) {
      slot.body.x = SLOT_X[index];
    }
  });
}

function applyLandscape() {
  W = BASE_W;
  H = BASE_H;
  FEET = LAND.feet;
  BODY_H = LAND.body;
  LAND.sill.forEach((point, index) => {
    SILL_PTS[index][0] = point[0];
    SILL_PTS[index][1] = point[1];
  });
  LAND.slots.forEach((x, index) => { SLOT_X[index] = x; });
  copySpots(BUN_SPOTS, LAND.buns);
  copySpots(BBUN_SPOTS, LAND.bbuns);
  copySpots(DOG_SPOTS, LAND.dogs);
  copySpots(PATTY_SPOTS, LAND.patties);
  copySpots(ONION_SPOTS, LAND.onions);
  copySpots(FRIE_SPOTS, LAND.fries);
  copyRect(CRATE, LAND.crate);
  copyRect(SAUSAGES, LAND.sausages);
  copyRect(KETCHUP, LAND.ketchup);
  copyRect(MUSTARD, LAND.mustard);
  copyRect(RELISH, LAND.relish);
  copyRect(FRYER, LAND.fryer);
  copyRect(TRASH, LAND.trash);
  copyRect(PATTIES, LAND.pattyBin);
  copyRect(BURGER_CRATE, LAND.burger);
  copyRect(ONION_BIN, LAND.onion);
  copyRect(LEMON, LAND.lemon);
  copyRect(COLA, LAND.cola);
  copyRect(PAUSE, LAND.pause);
  copyRect(BOARD, LAND.board);
  copyRect(GRILL, LAND.grill);
  copyRect(BIN, LAND.bin);
  syncActors();
}

function applyPortrait(w, h) {
  W = w;
  H = h;
  const sat = view.sat || 0;
  const sab = view.sab || 0;
  const usable = Math.max(480, h - sat - sab);
  const sillY = Math.round(sat + usable * 0.33);
  const binTop = sillY + 8;
  const binH = Math.round(usable * 0.145);
  const boardTop = binTop + binH + 10;
  const boardH = Math.round(usable * 0.175);
  const grillTop = boardTop + boardH + 10;
  const grillH = Math.round(Math.max(96, h - sab - 56 - grillTop));

  for (let i = 0; i < SILL_PTS.length; i++) {
    const t = i / (SILL_PTS.length - 1);
    SILL_PTS[i][0] = t * w;
    SILL_PTS[i][1] = sillY + (t - 0.5) * 8;
  }
  FEET = sillY + 2;
  BODY_H = Math.max(150, Math.round(sillY - sat - 92));
  [0.14, 0.32, 0.5, 0.68, 0.86].forEach((frac, index) => { SLOT_X[index] = w * frac; });

  const drink = has("lemon") || has("cola") ? Math.round(Math.min(72, w * 0.16)) : 0;
  BIN.x = 8;
  BIN.y = binTop;
  BIN.w = w - 16 - drink - (drink ? 8 : 0);
  BIN.h = binH;
  const gap = Math.max(6, w * 0.015);
  const wellW = (BIN.w - gap * 5) / 4;
  [KETCHUP, MUSTARD, RELISH, ONION_BIN].forEach((rect, index) => {
    rect.x = BIN.x + gap + index * (wellW + gap);
    rect.y = BIN.y + 12;
    rect.w = wellW;
    rect.h = BIN.h - 26;
  });
  if (drink) {
    LEMON.x = BIN.x + BIN.w + 8;
    LEMON.y = BIN.y + 6;
    LEMON.w = drink;
    LEMON.h = BIN.h * 0.46;
    COLA.x = LEMON.x;
    COLA.y = LEMON.y + LEMON.h + 6;
    COLA.w = drink;
    COLA.h = BIN.h - LEMON.h - 18;
  }

  const crateW = Math.max(68, Math.min(96, w * 0.2));
  CRATE.x = 8;
  CRATE.y = boardTop;
  CRATE.w = crateW;
  CRATE.h = has("burger") ? boardH * 0.48 : boardH;
  BURGER_CRATE.x = CRATE.x;
  BURGER_CRATE.y = boardTop + boardH * 0.52;
  BURGER_CRATE.w = crateW;
  BURGER_CRATE.h = boardH * 0.48;
  BOARD.x = CRATE.x + CRATE.w + 8;
  BOARD.y = boardTop;
  BOARD.w = w - BOARD.x - 8;
  BOARD.h = boardH;
  [0.2, 0.5, 0.8].forEach((frac, index) => {
    BUN_SPOTS[index].x = BOARD.x + BOARD.w * frac;
    BUN_SPOTS[index].y = BOARD.y + BOARD.h * (index === 1 ? 0.7 : 0.38);
    BBUN_SPOTS[index].x = BUN_SPOTS[index].x;
    BBUN_SPOTS[index].y = BOARD.y + BOARD.h * (index === 1 ? 0.48 : 0.22);
  });

  const trashW = Math.round(Math.min(92, w * 0.2));
  TRASH.x = 6;
  TRASH.y = grillTop;
  TRASH.w = trashW;
  TRASH.h = grillH;
  GRILL.x = TRASH.x + TRASH.w + 6;
  GRILL.y = grillTop;
  GRILL.w = Math.round(w * 0.4);
  GRILL.h = grillH;
  SAUSAGES.x = GRILL.x + GRILL.w + 6;
  SAUSAGES.y = grillTop;
  SAUSAGES.w = w - SAUSAGES.x - 8;
  SAUSAGES.h = grillH;
  [0.28, 0.62, 0.4].forEach((frac, index) => {
    DOG_SPOTS[index].x = GRILL.x + GRILL.w * frac;
    DOG_SPOTS[index].y = GRILL.y + GRILL.h * (index === 1 ? 0.68 : index === 2 ? 0.4 : 0.28);
    PATTY_SPOTS[index].x = GRILL.x + GRILL.w * (0.3 + index * 0.22);
    PATTY_SPOTS[index].y = GRILL.y + GRILL.h * (0.32 + index * 0.16);
  });
  ONION_SPOTS[0].x = BOARD.x + 28;
  ONION_SPOTS[0].y = BOARD.y + BOARD.h * 0.78;
  ONION_SPOTS[1].x = BOARD.x + 64;
  ONION_SPOTS[1].y = BOARD.y + BOARD.h * 0.58;
  FRYER.x = GRILL.x + 4;
  FRYER.y = GRILL.y + 6;
  FRYER.w = Math.max(36, GRILL.w * 0.46);
  FRYER.h = 28;
  FRIE_SPOTS.forEach((spot, index) => {
    spot.x = FRYER.x + FRYER.w * (0.25 + index * 0.25);
    spot.y = FRYER.y + 8;
  });
  PATTIES.x = GRILL.x + 6;
  PATTIES.y = GRILL.y + GRILL.h - 44;
  PATTIES.w = Math.min(52, GRILL.w * 0.34);
  PATTIES.h = 40;
  PAUSE.x = w - 56;
  PAUSE.y = sat + 8;
  PAUSE.w = 48;
  PAUSE.h = 48;
  syncActors();
}

function fitWorld() {
  if (!view.sw || !view.sh) return;
  if (view.portrait) applyPortrait(view.sw, view.sh);
  else applyLandscape();
}

function resize() {
  const sw = window.innerWidth;
  const sh = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const sat = readInset("--sat");
  const sab = readInset("--sab");
  if (canvas.width && sw === view.sw && sh === view.sh && dpr === view.dpr && sat === view.sat && sab === view.sab) return;
  view.sw = sw;
  view.sh = sh;
  view.dpr = dpr;
  view.sat = sat;
  view.sab = sab;
  view.portrait = sh > sw * 1.05;
  canvas.width = Math.max(1, Math.round(sw * dpr));
  canvas.height = Math.max(1, Math.round(sh * dpr));
  canvas.style.width = sw + "px";
  canvas.style.height = sh + "px";
  if (view.portrait) {
    view.scale = 1;
    view.ox = 0;
    view.oy = 0;
  } else {
    const scale = Math.min(sw / BASE_W, sh / BASE_H);
    view.scale = scale;
    view.ox = (sw - BASE_W * scale) / 2;
    view.oy = (sh - BASE_H * scale) / 2;
  }
  fitWorld();
}

function beginFrame() {
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.ox, view.dpr * view.oy);
}

function cashY() {
  return view.portrait ? SILL_PTS[4][1] + 26 : 400;
}

function tone(freq, dur, type, gain) {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain || 0.06, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    /* autoplay */
  }
}

function chime() {
  tone(740, 0.09, "sine", 0.05);
  setTimeout(() => tone(1180, 0.12, "sine", 0.05), 80);
}

function float(text, x, y, color) {
  S.floats.push({ text, x, y, color: color || "#fff6df", life: 56 });
}

function near(spot, x, y, r) {
  const dx = x - spot.x;
  const dy = y - spot.y;
  return dx * dx + dy * dy <= r * r;
}

function inRect(r, x, y) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

function firstEmpty(list) {
  return list.findIndex((item) => !item);
}

function cookVisual(state) {
  if (state <= 0) return 0;
  if (state === 1) return 1;
  if (state === 2) return 2;
  return 3;
}

function meatSprite(prefix, ingredient) {
  return img[prefix + cookVisual(ingredient - 1)];
}

function advanceTip(next) {
  if (S.tip < next) S.tip = next;
}

function decayPop(item) {
  if (item && item.pop > 0) item.pop -= 1;
}

function sim() {
  if (S.screen !== "play" || S.paused || S.banner) return;
  const level = levelAt(S.level);
  if (!S.timeOut) {
    S.frame += 1;
    if (S.frame >= DAY_FRAMES) {
      S.timeOut = true;
      S.tip = 99;
    }
    S.appear -= 1;
    if (S.appear <= 0) {
      S.appear = level.appear;
      trySpawn();
    }
  }
  cookAll();
  S.buns.forEach(decayPop);
  S.bbuns.forEach(decayPop);
  S.dogs.forEach(decayPop);
  S.patties.forEach(decayPop);
  tickEmbers();
  for (const slot of S.slots) {
    if (slot.body) tickBody(slot);
  }
  tickThrows();
  if (S.shake > 0) S.shake -= 1;
  for (const floater of S.floats) floater.life -= 1;
  S.floats = S.floats.filter((floater) => floater.life > 0);
  if (S.toast) {
    S.toast.life -= 1;
    if (S.toast.life <= 0) S.toast = null;
  }
  if (S.timeOut && !S.moneyWarned && S.slots.some((slot) => slot.cash)) {
    S.moneyWarned = true;
    S.toast = { text: "Pick up all the money!", life: 150 };
  }
  if (S.timeOut && S.slots.every((slot) => !slot.body && !slot.cash)) finishDay();
  if (S.tip >= 6) S.hint = Math.floor(S.frame / (FPS_HINT())) % HINTS.length;
}

function FPS_HINT() {
  return 240;
}

function cookOne(item) {
  if (!item || item.left <= 0) return;
  const next = advanceCook(item.left, item.state, item.marks);
  item.left = next.remaining;
  item.state = next.state;
  if (next.ready) {
    chime();
    advanceTip(3);
  }
  if (next.burnt) tone(90, 0.2, "sawtooth", 0.04);
}

function cookAll() {
  S.dogs.forEach((dog, index) => {
    const before = dog ? dog.state : 0;
    cookOne(dog);
    if (dog && before < 3 && dog.state >= 3) float("Burnt", DOG_SPOTS[index].x, DOG_SPOTS[index].y - 36, "#ff8a70");
  });
  S.patties.forEach((patty, index) => {
    const before = patty ? patty.state : 0;
    cookOne(patty);
    if (patty && before < 3 && patty.state >= 3) float("Burnt", PATTY_SPOTS[index].x, PATTY_SPOTS[index].y - 28, "#ff8a70");
  });
  S.onions.forEach(cookOne);
  if (S.fryer) {
    S.fryer.left -= 1;
    if (S.fryer.left <= 0) {
      S.fries = [true, true, true];
      S.fryer = null;
      chime();
    }
  }
}

function trySpawn() {
  const open = [];
  S.slots.forEach((slot, index) => {
    if (!slot.body && !slot.cash) open.push(index);
  });
  const bodies = S.slots.filter((slot) => slot.body).length;
  if (!open.length || bodies >= S.crowd || S.timeOut) return;
  const index = open[Math.floor(Math.random() * open.length)];
  const level = levelAt(S.level);
  const type = level.cast[Math.floor(Math.random() * level.cast.length)];
  const person = PEOPLE[type] || PEOPLE.generic_man;
  const fromRight = index > 2 || (index === 2 && Math.random() < 0.5);
  const waitMax = waitingFor(type, level.wait);
  const order = rollOrder(menu(), Math.random);
  S.slots[index].body = {
    type,
    person,
    look: LOOK[type] || LOOK.generic_man,
    x: fromRight ? W + 180 : -180,
    dir: fromRight ? -1 : 1,
    slot: index,
    state: "walk",
    wait: waitMax,
    waitMax,
    marks: patienceMarks(waitMax),
    mood: 0,
    serve: SERVE_FRAMES,
    order,
    items: order.items,
    price: 0,
    sat: 0,
    perfect: true,
    shaking: false,
    leave: 0,
    bill: 0,
    caught: 0,
  };
}

function tickBody(slot) {
  const body = slot.body;
  const target = SLOT_X[body.slot];
  if (body.state === "walk") {
    const step = Math.min(8, Math.abs(target - body.x));
    body.x += step * body.dir;
    if (Math.abs(body.x - target) < 2) {
      body.x = target;
      body.state = "wait";
      body.wait = body.waitMax;
      body.serve = SERVE_FRAMES;
    }
    return;
  }
  if (body.state === "wait") {
    body.serve -= 1;
    const next = tickPatience(body.wait, body.mood, body.marks);
    body.wait = next.counter;
    body.mood = next.sat;
    if (next.angry) {
      body.shaking = true;
      tone(180, 0.08, "square", 0.03);
    }
    if (next.leave) {
      if (body.items <= 0) pay(slot);
      else stormOff(slot);
    }
    return;
  }
  if (body.state === "caught") {
    body.caught -= 1;
    if (body.caught <= 0) {
      dropCash(slot, body.bill);
      body.state = "leave";
      body.leave = 16;
    }
    return;
  }
  if (body.state === "escape" || body.state === "leave") {
    if (body.leave > 0) {
      body.leave -= 1;
      return;
    }
    const speed = body.state === "escape" ? 14 : 8;
    body.x += speed * body.dir;
    if (body.x < -220 || body.x > W + 220) slot.body = null;
  }
}

function calm(body) {
  const eased = easePatience(body.mood, body.marks, body.waitMax);
  body.mood = eased.sat;
  body.wait = eased.counter;
  body.shaking = false;
}

function pay(slot) {
  const body = slot.body;
  const bill = finalizeBill(body.price, body.sat, body.perfect, body.person.tip, body.mood);
  S.meter = applyMeter(S.meter, bill.sat);
  S.crowd = nextCrowd(S.crowd, body.serve > 0);
  if (levelAt(S.level).cheat && Math.random() < body.person.cheat) {
    body.state = "escape";
    body.bill = bill.price;
    body.leave = 0;
    float("Hey!", body.x, 120, "#ffd0d0");
    return;
  }
  dropCash(slot, bill.price);
  body.state = "leave";
  body.leave = 18;
}

function stormOff(slot) {
  const body = slot.body;
  S.meter = applyMeter(S.meter, -body.mood * PENALTY.mood);
  body.state = "leave";
  body.leave = 12;
  float("...", body.x, 120, "#ffb4a8");
}

function dropCash(slot, amount) {
  slot.cash = { amount, x: SLOT_X[slot.body.slot], y: cashY() };
}

function finishDay() {
  const level = levelAt(S.level);
  const won = S.score >= level.goal;
  let wrapped = false;
  if (won) {
    S.total += S.score;
    if (S.level < 30) S.level += 1;
    else {
      wrapped = true;
      S.level = 1;
    }
  }
  writeSave();
  S.result = { won, goal: level.goal, earned: S.score, total: S.total, wrapped };
  S.screen = "end";
  S.hand = null;
  tone(won ? 660 : 140, 0.25, won ? "triangle" : "sawtooth", 0.06);
}

function placeBunAt(list, index) {
  if (list[index]) return false;
  list[index] = { ketchup: 0, mustard: 0, relish: 0, sausage: 0, burger: 0, onion: 0, pop: 8 };
  tone(520, 0.05, "triangle", 0.04);
  if (list === S.buns) advanceTip(1);
  return true;
}

function placeBun(list) {
  const index = firstEmpty(list);
  if (index < 0) {
    float("Full", W * 0.42, H * 0.62);
    return;
  }
  placeBunAt(list, index);
}

function placeGrillAt(list, index, total) {
  if (list[index]) return false;
  list[index] = { left: total, state: 0, marks: cookMarks(total), pop: 8 };
  tone(300, 0.06, "sawtooth", 0.03);
  if (list === S.dogs) advanceTip(2);
  return true;
}

function placeGrill(list, total) {
  const index = firstEmpty(list);
  if (index < 0) {
    float("Full", view.portrait ? GRILL.x + GRILL.w * 0.5 : 940, view.portrait ? GRILL.y + 20 : 430);
    return;
  }
  placeGrillAt(list, index, total);
}

function liftPlate(list, spots, index, kind) {
  const plate = list[index];
  if (!plate) return;
  list[index] = null;
  const bare = !plate.sausage && !plate.burger;
  S.hand = {
    kind: bare ? (kind === "burger" ? "plain-burger" : "plain-bun") : kind,
    plate,
    origin: { pool: list, index },
  };
}

function liftGrill(list, index, kind) {
  const item = list[index];
  if (!item) return;
  list[index] = null;
  S.hand = { kind, state: item.state, left: item.left, marks: item.marks, origin: { pool: list, index } };
}

function restore() {
  const hand = S.hand;
  if (!hand) return;
  if (hand.origin && !hand.origin.pool[hand.origin.index]) {
    if (hand.plate && (hand.kind === "hot_dog" || hand.kind === "burger" || hand.kind === "plain-bun" || hand.kind === "plain-burger")) {
      hand.origin.pool[hand.origin.index] = hand.plate;
    } else if (hand.kind === "dog" || hand.kind === "patty" || hand.kind === "onion") {
      hand.origin.pool[hand.origin.index] = { left: hand.left, state: hand.state, marks: hand.marks };
    } else if (hand.kind === "fries") {
      hand.origin.pool[hand.origin.index] = true;
    }
  }
  S.hand = null;
}

function trashHand() {
  const cost = trashCost(S.hand && S.hand.plate ? { kind: S.hand.kind === "burger" ? "burger" : "hot_dog", ...S.hand.plate } : S.hand);
  S.score = Math.max(0, S.score - cost);
  if (cost) float(`-$${cost}`, 80, 560, "#ffb0a0");
  tone(110, 0.12, "square", 0.04);
  S.hand = null;
}

function acceptPlate(list, index, meatKey, ingredient) {
  const plate = list[index];
  if (!plate || plate[meatKey]) return false;
  plate[meatKey] = ingredient;
  S.hand = null;
  tone(640, 0.06, "sine", 0.05);
  if (meatKey === "sausage" && ingredient === 3) advanceTip(4);
  return true;
}

function give(slot) {
  const body = slot.body;
  const hand = S.hand;
  if (!body || body.state !== "wait" || !hand) return false;
  if (hand.kind === "fries") {
    const offer = offerFries(body.order);
    if (!offer.ok) return false;
    body.order.fries = offer.fries;
    body.price += offer.price;
    body.sat += offer.sat;
    body.items -= 1;
  } else if (hand.kind === "hot_dog" || hand.kind === "burger") {
    if (burntPlate(hand)) {
      hurl(slot);
      return true;
    }
    const quote = quoteSnack(body.order, { kind: hand.kind, ...hand.plate });
    if (!quote.ok) return false;
    body.price += quote.price;
    body.sat += quote.sat;
    body.perfect = body.perfect && quote.perfect;
    body.order.snack = null;
    body.items -= 1;
  } else return false;
  calm(body);
  S.hand = null;
  tone(580, 0.07, "sine", 0.05);
  if (body.items <= 0) pay(slot);
  return true;
}

function giveTool(slot) {
  const body = slot.body;
  if (!body || body.state !== "wait" || (S.tool !== "lemonade" && S.tool !== "cola")) return false;
  const offer = offerDrink(body.order, S.tool);
  if (!offer.ok) return false;
  body.price += offer.price;
  body.sat += offer.sat;
  body.order.drink = null;
  body.items -= 1;
  calm(body);
  S.tool = null;
  tone(580, 0.07, "sine", 0.05);
  if (body.items <= 0) pay(slot);
  return true;
}

function sauceOn(list, index) {
  const plate = list[index];
  if (!plate) return false;
  if (S.tool === "onion") {
    if (plate.onion) return false;
    plate.onion = 3;
  } else if (S.tool === "ketchup" || S.tool === "mustard" || S.tool === "relish") {
    if (plate[S.tool]) return false;
    plate[S.tool] = 1;
  } else return false;
  advanceTip(5);
  plate.pop = 6;
  tone(700, 0.05, "sine", 0.04);
  return true;
}

function collect(index) {
  const cash = S.slots[index].cash;
  if (!cash) return;
  S.score += cash.amount;
  float(`+$${cash.amount}`, cash.x, cash.y - 20, "#ffe08a");
  S.slots[index].cash = null;
  tone(990, 0.08, "square", 0.05);
  advanceTip(6);
}

function burntPlate(hand) {
  if (!hand || !hand.plate) return false;
  if (hand.kind === "hot_dog") return hand.plate.sausage >= 4;
  if (hand.kind === "burger") return hand.plate.burger >= 4;
  return false;
}

function hurl(slot) {
  const body = slot.body;
  const hand = S.hand;
  body.mood = 3;
  body.shaking = true;
  S.meter = applyMeter(S.meter, -1.2);
  float("Burnt!", body.x, 140, "#ff6a4a");
  tone(120, 0.2, "sawtooth", 0.08);
  const spot = S.rejects.findIndex((item) => !item);
  S.throws.push({
    plate: hand.plate,
    kind: hand.kind,
    x: body.x,
    y: 240,
    vx: ((view.portrait ? W * 0.5 : 640) - body.x) / 18,
    vy: 5,
    rot: -0.5,
    life: 0,
    spot,
  });
  S.hand = null;
  S.shake = 8;
}

function tickThrows() {
  S.throws = S.throws.filter((ball) => {
    ball.life += 1;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vy += 0.9;
    ball.rot += 0.2;
    const floorY = view.portrait ? BOARD.y + BOARD.h * 0.62 : 600;
    const restY = view.portrait ? BOARD.y + BOARD.h * 0.72 : 608;
    const lifeMax = view.portrait ? 42 : 36;
    if (ball.y < floorY && ball.life < lifeMax) return true;
    const minX = view.portrait ? BOARD.x + 16 : 340;
    const maxX = view.portrait ? BOARD.x + BOARD.w - 16 : 1040;
    const x = Math.max(minX, Math.min(maxX, ball.x));
    const y = restY;
    const spot = S.rejects.findIndex((item) => !item);
    if (spot >= 0) S.rejects[spot] = { plate: ball.plate, kind: ball.kind, x, y };
    S.shake = 14;
    tone(80, 0.14, "square", 0.07);
    float("Ow!", x, y - 40, "#ffd0c0");
    return false;
  });
}

function aimPoints(x, y) {
  return [{ x, y }, { x, y: y - HAND_LIFT }];
}

function dropCandidates(x, y) {
  const hand = S.hand;
  if (!hand) return [];
  const found = [];
  const offer = (score, run, mark) => {
    if (score < 0) return;
    found.push({ score, run, mark });
  };
    const trashX = TRASH.x + TRASH.w * 0.5;
    const trashY = TRASH.y + TRASH.h * 0.55;
    for (const p of aimPoints(x, y)) {
    if (inRect(TRASH, p.x, p.y)) offer(0, () => trashHand(), TRASH);
    else {
      const d = Math.hypot(p.x - trashX, p.y - trashY);
      if (d < Math.max(130, TRASH.w * 0.85)) offer(d, () => trashHand(), TRASH);
    }
    if (hand.kind === "dog") {
      BUN_SPOTS.forEach((spot, index) => {
        if (!S.buns[index] || S.buns[index].sausage) return;
        const d = Math.hypot(p.x - spot.x, p.y - spot.y);
        if (d < 110) offer(d, () => { if (!acceptPlate(S.buns, index, "sausage", hand.state + 1)) restore(); }, spotRect(spot));
      });
      DOG_SPOTS.forEach((spot, index) => {
        if (S.dogs[index]) return;
        const d = Math.hypot(p.x - spot.x, p.y - spot.y);
        if (d < 100) offer(d + 6, () => parkGrill(S.dogs, index), spotRect(spot));
      });
    }
    if (hand.kind === "patty") {
      BBUN_SPOTS.forEach((spot, index) => {
        if (!S.bbuns[index] || S.bbuns[index].burger) return;
        const d = Math.hypot(p.x - spot.x, p.y - spot.y);
        if (d < 100) offer(d, () => { if (!acceptPlate(S.bbuns, index, "burger", hand.state + 1)) restore(); }, spotRect(spot));
      });
      PATTY_SPOTS.forEach((spot, index) => {
        if (S.patties[index]) return;
        const d = Math.hypot(p.x - spot.x, p.y - spot.y);
        if (d < 90) offer(d + 6, () => parkGrill(S.patties, index), spotRect(spot));
      });
    }
    if (hand.plate && (hand.kind === "hot_dog" || hand.kind === "plain-bun")) {
      BUN_SPOTS.forEach((spot, index) => {
        if (S.buns[index]) return;
        const d = Math.hypot(p.x - spot.x, p.y - spot.y);
        if (d < 100) offer(d + 4, () => parkPlate(S.buns, index), spotRect(spot));
      });
    }
    if (hand.plate && (hand.kind === "burger" || hand.kind === "plain-burger")) {
      BBUN_SPOTS.forEach((spot, index) => {
        if (S.bbuns[index]) return;
        const d = Math.hypot(p.x - spot.x, p.y - spot.y);
        if (d < 90) offer(d + 4, () => parkPlate(S.bbuns, index), spotRect(spot));
      });
    }
    if (hand.kind === "onion") {
      const piles = [[S.buns, BUN_SPOTS], [S.bbuns, BBUN_SPOTS]];
      for (const [list, spots] of piles) {
        spots.forEach((spot, index) => {
          if (!list[index] || list[index].onion) return;
          const d = Math.hypot(p.x - spot.x, p.y - spot.y);
          if (d < 100) offer(d, () => plantOnion(list, index), spotRect(spot));
        });
      }
    }
    if (hand.kind === "hot_dog" || hand.kind === "burger" || hand.kind === "fries") {
      S.slots.forEach((slot) => {
        const body = slot.body;
        if (!body || body.state !== "wait") return;
        const yLimit = view.portrait ? SILL_PTS[4][1] + 28 : 660;
        const xLimit = view.portrait ? Math.max(72, W * 0.16) : 170;
        if (p.y > yLimit || Math.abs(p.x - body.x) > xLimit) return;
        const d = Math.abs(p.x - body.x) + Math.max(0, p.y - 500) * 0.2;
        offer(d, () => { if (!give(slot)) restore(); }, { x: body.x - 70, y: 150, w: 140, h: 220 });
      });
    }
  }
  return found;
}

function spotRect(spot) {
  return { x: spot.x - 50, y: spot.y - 36, w: 100, h: 72 };
}

function parkGrill(list, index) {
  list[index] = { left: S.hand.left, state: S.hand.state, marks: S.hand.marks };
  S.hand = null;
  tone(300, 0.05, "sawtooth", 0.03);
}

function parkPlate(list, index) {
  list[index] = S.hand.plate;
  S.hand = null;
}

function plantOnion(list, index) {
  list[index].onion = S.hand.state + 1;
  S.hand = null;
  tone(640, 0.05, "sine", 0.04);
}

function pickDraggable(x, y) {
  for (let i = 0; i < 3; i++) if (S.buns[i] && near(BUN_SPOTS[i], x, y, 84)) return { type: "bun", index: i };
  for (let i = 0; i < 3; i++) if (S.bbuns[i] && near(BBUN_SPOTS[i], x, y, 72)) return { type: "bbun", index: i };
  for (let i = 0; i < 3; i++) if (S.dogs[i] && near(DOG_SPOTS[i], x, y, 78)) return { type: "dog", index: i };
  for (let i = 0; i < 3; i++) if (S.patties[i] && near(PATTY_SPOTS[i], x, y, 56)) return { type: "patty", index: i };
  for (let i = 0; i < 2; i++) if (S.onions[i] && near(ONION_SPOTS[i], x, y, 48)) return { type: "onion", index: i };
  for (let i = 0; i < 3; i++) if (S.fries[i] && near(FRIE_SPOTS[i], x, y, 48)) return { type: "fries", index: i };
  for (let i = 0; i < 3; i++) if (S.rejects[i] && near(S.rejects[i], x, y, 80)) return { type: "reject", index: i };
  return null;
}

function lift(hit) {
  if (hit.type === "bun") liftPlate(S.buns, BUN_SPOTS, hit.index, "hot_dog");
  else if (hit.type === "bbun") liftPlate(S.bbuns, BBUN_SPOTS, hit.index, "burger");
  else if (hit.type === "dog") liftGrill(S.dogs, hit.index, "dog");
  else if (hit.type === "patty") liftGrill(S.patties, hit.index, "patty");
  else if (hit.type === "onion") liftGrill(S.onions, hit.index, "onion");
  else if (hit.type === "fries") {
    S.fries[hit.index] = false;
    S.hand = { kind: "fries", origin: { pool: S.fries, index: hit.index } };
  } else if (hit.type === "reject") {
    const item = S.rejects[hit.index];
    S.rejects[hit.index] = null;
    S.hand = { kind: item.kind, plate: item.plate, origin: { pool: S.rejects, index: hit.index } };
  }
}

function dropAt(x, y) {
  if (!S.hand) return;
  const found = dropCandidates(x, y);
  if (!found.length) {
    restore();
    return;
  }
  found.sort((a, b) => a.score - b.score);
  found[0].run();
}

function isSauceTool(tool) {
  const name = tool || S.tool;
  return name === "ketchup" || name === "mustard" || name === "relish" || name === "onion";
}

function sauceAt(x, y) {
  if (!isSauceTool()) return false;
  const reach = view.portrait ? 72 : 58;
  for (const point of aimPoints(x, y)) {
    for (let i = 0; i < 3; i++) if (S.buns[i] && near(BUN_SPOTS[i], point.x, point.y, reach) && sauceOn(S.buns, i)) return true;
    for (let i = 0; i < 3; i++) if (S.bbuns[i] && near(BBUN_SPOTS[i], point.x, point.y, reach - 4) && sauceOn(S.bbuns, i)) return true;
  }
  return false;
}

function nearestEmpty(x, y, spots, list, limit) {
  let best = -1;
  let bestD = limit;
  for (const point of aimPoints(x, y)) {
    spots.forEach((spot, index) => {
      if (list[index]) return;
      const d = Math.hypot(point.x - spot.x, point.y - spot.y);
      if (d < bestD) {
        bestD = d;
        best = index;
      }
    });
  }
  return best;
}

function dropSpawn(x, y) {
  const hand = S.hand;
  if (!hand) return;
  const limit = view.portrait ? 96 : 120;
  if (hand.kind === "spawn-bun") {
    const index = nearestEmpty(x, y, BUN_SPOTS, S.buns, limit);
    S.hand = null;
    if (index < 0) float("Onto the board", x, y - 28);
    else placeBunAt(S.buns, index);
    return;
  }
  if (hand.kind === "spawn-burger") {
    const index = nearestEmpty(x, y, BBUN_SPOTS, S.bbuns, limit);
    S.hand = null;
    if (index < 0) float("Onto the board", x, y - 28);
    else placeBunAt(S.bbuns, index);
    return;
  }
  if (hand.kind === "spawn-dog") {
    const index = nearestEmpty(x, y, DOG_SPOTS, S.dogs, limit);
    S.hand = null;
    if (index < 0) float("Onto the grill", x, y - 28);
    else placeGrillAt(S.dogs, index, COOK.dog);
    return;
  }
  if (hand.kind === "spawn-patty") {
    const index = nearestEmpty(x, y, PATTY_SPOTS, S.patties, limit - 10);
    S.hand = null;
    if (index < 0) float("Onto the grill", x, y - 28);
    else placeGrillAt(S.patties, index, COOK.burger);
    return;
  }
  if (hand.kind === "cash") {
    const index = hand.index;
    S.hand = null;
    collect(index);
  }
}

function sourceAt(x, y) {
  for (let i = 0; i < 5; i++) {
    const cash = S.slots[i].cash;
    if (cash && Math.hypot(x - cash.x, y - cash.y) < 60) return { type: "cash", index: i };
  }
  if (inRect(CRATE, x, y)) return "crate";
  if (inRect(SAUSAGES, x, y)) return "sausages";
  if (has("burger") && inRect(BURGER_CRATE, x, y)) return "burger-crate";
  if (has("burger") && inRect(PATTIES, x, y)) return "patties";
  if (inRect(KETCHUP, x, y)) return "ketchup";
  if (inRect(MUSTARD, x, y)) return "mustard";
  if (inRect(RELISH, x, y)) return "relish";
  if (inRect(ONION_BIN, x, y)) return "onion";
  if (has("lemon") && inRect(LEMON, x, y)) return "lemonade";
  if (has("cola") && inRect(COLA, x, y)) return "cola";
  if (has("fries") && inRect(FRYER, x, y)) return "fryer";
  return null;
}

function armSource(source) {
  if (!source || S.screen !== "play" || S.banner) return;
  if (source === "crate") S.hand = { kind: "spawn-bun" };
  else if (source === "burger-crate") S.hand = { kind: "spawn-burger" };
  else if (source === "sausages") S.hand = { kind: "spawn-dog", state: 0 };
  else if (source === "patties") S.hand = { kind: "spawn-patty", state: 0 };
  else if (source === "ketchup" || source === "mustard" || source === "relish" || source === "onion" || source === "lemonade" || source === "cola") {
    S.tool = source;
    S.hand = null;
  } else if (source.type === "cash" && S.slots[source.index].cash) {
    const cash = S.slots[source.index].cash;
    S.hand = { kind: "cash", index: source.index, amount: cash.amount };
  }
}

function releaseAt(x, y, cancel) {
  if (cancel) {
    if (S.hand && S.hand.origin) restore();
    else S.hand = null;
    return;
  }
  if (S.hand && (S.hand.kind === "spawn-bun" || S.hand.kind === "spawn-burger" || S.hand.kind === "spawn-dog" || S.hand.kind === "spawn-patty" || S.hand.kind === "cash")) {
    dropSpawn(x, y);
    return;
  }
  if (S.hand) {
    dropAt(x, y);
    return;
  }
  if (isSauceTool()) {
    sauceAt(x, y);
    return;
  }
  if (S.tool === "lemonade" || S.tool === "cola") {
    for (let i = 0; i < 5; i++) {
      const body = S.slots[i].body;
      if (!body) continue;
      const yLimit = view.portrait ? SILL_PTS[4][1] + 28 : 660;
      if (Math.abs(x - body.x) < (view.portrait ? W * 0.16 : 150) && y <= yLimit && giveTool(S.slots[i])) return;
    }
  }
}

function tapStack(x, y) {
  if (inRect(CRATE, x, y)) {
    placeBun(S.buns);
    return true;
  }
  if (inRect(SAUSAGES, x, y)) {
    placeGrill(S.dogs, COOK.dog);
    return true;
  }
  if (has("burger") && inRect(BURGER_CRATE, x, y)) {
    placeBun(S.bbuns);
    return true;
  }
  if (has("burger") && inRect(PATTIES, x, y)) {
    placeGrill(S.patties, COOK.burger);
    return true;
  }
  if (has("fries") && inRect(FRYER, x, y) && !S.fryer && S.fries.every((item) => !item)) {
    S.fryer = { left: COOK.fries };
    tone(260, 0.08, "sawtooth", 0.03);
    return true;
  }
  if (inRect(KETCHUP, x, y)) {
    S.tool = S.tool === "ketchup" ? null : "ketchup";
    S.hand = null;
    return true;
  }
  if (inRect(MUSTARD, x, y)) {
    S.tool = S.tool === "mustard" ? null : "mustard";
    S.hand = null;
    return true;
  }
  if (inRect(RELISH, x, y)) {
    S.tool = S.tool === "relish" ? null : "relish";
    S.hand = null;
    return true;
  }
  if (inRect(ONION_BIN, x, y)) {
    S.tool = S.tool === "onion" ? null : "onion";
    S.hand = null;
    return true;
  }
  if (has("lemon") && inRect(LEMON, x, y)) {
    S.tool = S.tool === "lemonade" ? null : "lemonade";
    return true;
  }
  if (has("cola") && inRect(COLA, x, y)) {
    S.tool = S.tool === "cola" ? null : "cola";
    return true;
  }
  return false;
}

function tapAt(x, y, hadHand) {
  if (S.banner) {
    S.banner = null;
    return;
  }
  if (S.screen === "title") {
    if (inRect(titleButton(), x, y)) begin(S.level);
    return;
  }
  if (S.screen === "end") {
    if (inRect(endButton(), x, y)) begin(S.level);
    return;
  }
  if (inRect(PAUSE, x, y)) {
    S.paused = !S.paused;
    return;
  }
  if (S.paused) {
    S.paused = false;
    return;
  }
  for (let i = 0; i < 5; i++) {
    const cash = S.slots[i].cash;
    if (cash && Math.hypot(x - cash.x, y - cash.y) < 54) {
      collect(i);
      return;
    }
  }
  if (hadHand && S.hand) {
    dropAt(x, y);
    return;
  }
  for (let i = 0; i < 5; i++) {
    const body = S.slots[i].body;
    if (!body || Math.abs(x - body.x) > 150 || y > sillAt(body.x) + 28) continue;
    if (body.state === "escape") {
      body.state = "caught";
      body.caught = 90;
      tone(440, 0.08, "triangle", 0.05);
      return;
    }
    if (S.tool && giveTool(S.slots[i])) return;
  }
  if (S.tool === "ketchup" || S.tool === "mustard" || S.tool === "relish" || S.tool === "onion") {
    if (sauceAt(x, y)) return;
  }
  const hit = pickDraggable(x, y);
  if (hit) {
    lift(hit);
    return;
  }
  tapStack(x, y);
}

function pointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;
  return {
    x: (sx - view.ox) / view.scale,
    y: (sy - view.oy) / view.scale,
  };
}

function onDown(event) {
  if (gesture) return;
  if (event.cancelable) event.preventDefault();
  const p = pointerPos(event);
  S.px = p.x;
  S.py = p.y;
  gesture = { x: p.x, y: p.y, moved: false, hadHand: !!S.hand, source: sourceAt(p.x, p.y), pointerId: event.pointerId };
  try { canvas.setPointerCapture?.(event.pointerId); } catch { /* pointer already gone */ }
}

function onMove(event) {
  if (event.cancelable) event.preventDefault();
  const p = pointerPos(event);
  S.px = p.x;
  S.py = p.y;
  if (!gesture || (event.pointerId != null && gesture.pointerId != null && event.pointerId !== gesture.pointerId)) return;
  if (event.buttons === 0 && gesture.moved) {
    onUp(event);
    return;
  }
  if (Math.hypot(p.x - gesture.x, p.y - gesture.y) > 8) {
    gesture.moved = true;
    if (!S.hand && S.screen === "play" && !S.banner && !S.paused) {
      const hit = pickDraggable(gesture.x, gesture.y);
      if (hit) lift(hit);
      else armSource(gesture.source);
    }
  }
}

function onUp(event) {
  if (!gesture) return;
  if (event.pointerId != null && gesture.pointerId != null && event.pointerId !== gesture.pointerId) return;
  const p = pointerPos(event);
  S.px = p.x;
  S.py = p.y;
  const moved = gesture.moved;
  const hadHand = gesture.hadHand;
  const cancel = event.type === "pointercancel";
  gesture = null;
  if (S.paused && S.screen === "play" && !S.banner) {
    if (S.hand && S.hand.origin) restore();
    else S.hand = null;
    S.paused = false;
    return;
  }
  if (cancel) {
    releaseAt(p.x, p.y, true);
    return;
  }
  if (moved && (S.hand || isSauceTool() || S.tool === "lemonade" || S.tool === "cola")) releaseAt(p.x, p.y, false);
  else tapAt(p.x, p.y, hadHand);
}

function sillAt(x) {
  const pts = SILL_PTS;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

function drawImageH(source, x, y, h) {
  if (!source) return;
  const w = source.width * (h / source.height);
  ctx.drawImage(source, x - w / 2, y - h / 2, w, h);
}

function drawImageW(source, x, y, w) {
  if (!source) return;
  const h = source.height * (w / source.width);
  ctx.drawImage(source, x - w / 2, y - h / 2, w, h);
}

function drawTiltedW(source, x, y, w, angle) {
  if (!source) return;
  const h = source.height * (w / source.width);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawBottom(source, x, bottom, h) {
  if (!source) return;
  const w = source.width * (h / source.height);
  ctx.drawImage(source, x - w / 2, bottom - h, w, h);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function contactShadow(x, y, rx, ry) {
  ctx.save();
  ctx.fillStyle = "rgba(20, 12, 8, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spotScale(spots, index) {
  const ys = spots.map((spot) => spot.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const t = max === min ? 0.5 : (spots[index].y - min) / (max - min);
  return 0.92 + t * 0.16;
}

function drawPlate(plate, x, y, kind, scale) {
  const s = scale || 1;
  const pop = plate.pop || 0;
  contactShadow(x, y + 16 * s, 36 * s, 10 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (1 + pop * 0.045), s * (1 - pop * 0.07));
  ctx.translate(-x, -y);
  if (kind === "burger") {
    drawImageH(img.bbun, x, y, 78);
    if (plate.burger) drawImageH(meatSprite("patty", plate.burger), x, y - 6, 52);
  } else {
    const tilt = BUN_TILT + (view.portrait ? 0.04 : 0);
    drawImageW(img.bun, x, y, view.portrait ? Math.min(84, BOARD.w * 0.3) : 122);
    if (plate.sausage) drawTiltedW(meatSprite("dog", plate.sausage), x + 2, y, view.portrait ? 74 : 90, tilt);
  }
  const tilt = BUN_TILT + (view.portrait ? 0.04 : 0);
  if (plate.onion) {
    drawTiltedW(img.onion0, x - 24, y + 2, 30, tilt);
    drawTiltedW(img.onion0, x + 18, y + 8, 26, tilt);
  }
  if (plate.ketchup) drawTiltedW(img.sauceK, x, y - 7, view.portrait ? 70 : 84, tilt);
  if (plate.mustard) drawTiltedW(img.sauceM, x + 2, y, view.portrait ? 64 : 78, tilt);
  if (plate.relish) drawTiltedW(img.sauceR, x - 1, y + 7, view.portrait ? 62 : 76, tilt);
  ctx.restore();
}

function drawBubble(body) {
  const icons = [];
  if (body.order.snack === "hot_dog") icons.push(["dog2", 26]);
  if (body.order.snack === "burger") icons.push(["patty2", 26]);
  if (body.order.ketchup) icons.push(["sauceK", 22]);
  if (body.order.mustard) icons.push(["sauceM", 22]);
  if (body.order.relish) icons.push(["sauceR", 22]);
  if (body.order.onion) icons.push(["onion0", 22]);
  for (let i = 0; i < body.order.fries; i++) icons.push(["fries", 28]);
  if (body.order.drink === "lemonade") icons.push(["lemonade", 32]);
  if (body.order.drink === "cola") icons.push(["cola", 32]);
  if (!icons.length) return;
  const w = icons.length * 30 + 16;
  const x = Math.max(8, Math.min(W - w - 8, body.x - w / 2));
  const y = view.portrait ? view.sat + 46 : 50;
  roundRect(x, y, w, 42, 12);
  ctx.fillStyle = "rgba(255,250,240,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ["#2f9e44", "#d4a017", "#e07020", "#d23b3b"][body.mood] || "#2f9e44";
  ctx.stroke();
  icons.forEach((icon, index) => {
    const source = img[icon[0]];
    const cx = x + 20 + index * 30;
    if (icon[0].startsWith("sauce")) drawImageW(source, cx, y + 20, 26);
    else drawImageH(source, cx, y + 20, icon[1]);
  });
  const frac = Math.max(0, body.wait / body.waitMax);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 8, y + 36, w - 16, 3);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(x + 8, y + 36, (w - 16) * frac, 3);
}

function stampBg(x, y, w, h) {
  ctx.drawImage(img.bg, x, y, w, h, x, y, w, h);
}

function drawPeople() {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, sillAt(W));
  for (let i = SILL_PTS.length - 1; i >= 0; i--) ctx.lineTo(SILL_PTS[i][0], SILL_PTS[i][1]);
  ctx.closePath();
  ctx.clip();
  const seenLook = {};
  for (const slot of S.slots) {
    const body = slot.body;
    if (!body) continue;
    const bob = body.state === "wait" ? Math.sin(S.frame * 0.07 + body.slot) * 1.6 : 0;
    const shake = body.shaking || body.mood >= 3 ? Math.sin(S.frame * 1.6) * (body.mood >= 3 ? 8 : 3) : 0;
    const look = body.look[0];
    const flip = !!seenLook[look];
    seenLook[look] = true;
    ctx.save();
    if (flip) {
      ctx.translate(body.x + shake, 0);
      ctx.scale(-1, 1);
      drawBottom(img[look], 0, FEET + bob, BODY_H);
    } else {
      drawBottom(img[look], body.x + shake, FEET + bob, BODY_H);
    }
    ctx.restore();
  }
  ctx.restore();
  if (!view.portrait) {
    stampBg(318, 208, 250, 160);
    stampBg(66, 142, 64, 214);
  }
  for (const slot of S.slots) {
    const body = slot.body;
    if (body && body.state === "wait") drawBubble(body);
  }
}

const embers = [];

function tickEmbers() {
  const spawn = view.portrait ? 0.8 : 0.5;
  if (Math.random() < spawn) {
    const origin = view.portrait
      ? { x: GRILL.x + 6 + Math.random() * Math.max(12, GRILL.w - 12), y: GRILL.y + GRILL.h * (0.3 + Math.random() * 0.55) }
      : { x: 760 + Math.random() * 270, y: 455 + Math.random() * 95 };
    embers.push({
      x: origin.x,
      y: origin.y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.5 - Math.random() * 0.75,
      life: 16 + Math.random() * 18,
      max: 34,
      r: 1.1 + Math.random() * 1.7,
    });
  }
  for (let i = embers.length - 1; i >= 0; i--) {
    const ember = embers[i];
    ember.x += ember.vx;
    ember.y += ember.vy;
    ember.life -= 1;
    if (ember.life <= 0) embers.splice(i, 1);
  }
  if (embers.length > 32) embers.splice(0, embers.length - 32);
}

function drawEmbers() {
  ctx.save();
  for (const ember of embers) {
    ctx.globalAlpha = Math.max(0, ember.life / ember.max);
    ctx.fillStyle = ember.life > 12 ? "#ffc56a" : "#ff6a2a";
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, ember.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGrillDog(dog, index) {
  const spot = DOG_SPOTS[index];
  const width = (view.portrait ? Math.min(92, GRILL.w * 0.48) : 118) * spotScale(DOG_SPOTS, index);
  const pop = dog.pop || 0;
  contactShadow(spot.x, spot.y + 12, width * 0.26, 7);
  ctx.save();
  ctx.translate(spot.x, spot.y);
  ctx.rotate([-0.14, 0.08, -0.04][index] || 0);
  ctx.scale(1 + pop * 0.04, 1 - pop * 0.06);
  if (dog.state >= 3) {
    ctx.shadowColor = "rgba(255, 64, 40, 0.95)";
    ctx.shadowBlur = 14;
  } else if (dog.state === 2) {
    ctx.shadowColor = "rgba(255, 214, 60, 0.95)";
    ctx.shadowBlur = 16;
  }
  const source = img["dog" + cookVisual(dog.state)];
  if (source) {
    const h = source.height * (width / source.width);
    ctx.drawImage(source, -width / 2, -h / 2, width, h);
  }
  ctx.restore();
}

function drawCondiments() {
  ctx.save();
  ctx.beginPath();
  if (view.portrait) {
    const x = BIN.x + 5;
    const y = BIN.y + 6;
    const w = BIN.w - 10;
    const h = BIN.h - 16;
    const r = 16;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  } else {
    ctx.moveTo(120, 368);
    ctx.lineTo(312, 356);
    ctx.lineTo(306, 434);
    ctx.lineTo(148, 448);
  }
  ctx.closePath();
  ctx.clip();
  [KETCHUP, MUSTARD, RELISH, ONION_BIN].forEach((rect) => {
    ctx.fillStyle = view.portrait ? "rgba(84, 52, 8, 0.38)" : "rgba(30, 18, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(rect.x + rect.w / 2, rect.y + rect.h * 0.78, rect.w * 0.36, Math.max(4, rect.h * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
  });
  [[img.bottleK, KETCHUP], [img.bottleM, MUSTARD], [img.bottleR, RELISH]].forEach((pair, index) => {
    if (!view.portrait && pair[0] === img.bottleK) return;
    const rect = pair[1];
    const bob = Math.sin(S.frame * 0.08 + index * 1.3) * 1.3;
    const bh = Math.max(28, rect.h * 0.9);
    const base = rect.y + rect.h - 1;
    drawImageH(pair[0], rect.x + rect.w / 2, base - bh / 2 + bob, bh);
  });
  drawImageH(img.onion0, ONION_BIN.x + ONION_BIN.w * 0.34, ONION_BIN.y + ONION_BIN.h * 0.5, ONION_BIN.h * 0.4);
  drawImageH(img.onion0, ONION_BIN.x + ONION_BIN.w * 0.68, ONION_BIN.y + ONION_BIN.h * 0.42, ONION_BIN.h * 0.34);
  drawImageH(img.onion0, ONION_BIN.x + ONION_BIN.w * 0.5, ONION_BIN.y + ONION_BIN.h * 0.72, ONION_BIN.h * 0.36);
  ctx.restore();
  if (!view.portrait && img.bg) ctx.drawImage(img.bg, 104, 436, 230, 34, 104, 436, 230, 34);
  else {
    const y = BIN.y + BIN.h - 11;
    const lip = ctx.createLinearGradient(0, y, 0, y + 14);
    lip.addColorStop(0, "#e7eef3");
    lip.addColorStop(1, "#8d98a3");
    ctx.fillStyle = lip;
    roundRect(BIN.x + 2, y, BIN.w - 4, 13, 6);
    ctx.fill();
  }
}

function drawSpawnAim() {
  const kind = S.hand.kind;
  const spots = kind === "spawn-dog" || kind === "spawn-patty"
    ? (kind === "spawn-dog" ? DOG_SPOTS : PATTY_SPOTS)
    : (kind === "spawn-burger" ? BBUN_SPOTS : BUN_SPOTS);
  const list = kind === "spawn-dog" ? S.dogs : kind === "spawn-patty" ? S.patties : kind === "spawn-burger" ? S.bbuns : S.buns;
  const index = nearestEmpty(S.px, S.py, spots, list, view.portrait ? 110 : 140);
  if (index >= 0) ring(spotRect(spots[index]));
}

function titleButton() {
  if (!view.portrait) return { x: 470, y: 390, w: 340, h: 78 };
  const w = Math.min(280, W - 40);
  return { x: (W - w) / 2, y: H * 0.56, w, h: 68 };
}

function endButton() {
  if (!view.portrait) return { x: 470, y: 420, w: 340, h: 72 };
  const w = Math.min(280, W - 40);
  return { x: (W - w) / 2, y: H * 0.7, w, h: 64 };
}

function drawPortraitKitchen() {
  const sill = SILL_PTS[4][1];
  if (img.bg) ctx.drawImage(img.bg, 0, 0, 1280, 420, 0, 0, W, sill + 6);
  else {
    ctx.fillStyle = "#e38a4a";
    ctx.fillRect(0, 0, W, sill);
  }
  drawPeople();
  const steel = ctx.createLinearGradient(0, sill, 0, H);
  steel.addColorStop(0, "#b7c0c8");
  steel.addColorStop(0.12, "#eceff2");
  steel.addColorStop(0.45, "#8d969f");
  steel.addColorStop(1, "#3c444c");
  ctx.fillStyle = steel;
  ctx.fillRect(0, sill - 1, W, H - sill + 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(0, sill - 1, W, 3);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, sill + 6, W, 10);
  for (const slot of S.slots) {
    const body = slot.body;
    if (!body || body.state === "walk") continue;
    contactShadow(body.x, sill + 18, view.portrait ? 36 : 48, 8);
  }

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(BIN.x + 3, BIN.y + 6, BIN.w, BIN.h, 18);
  ctx.fill();
  const bin = ctx.createLinearGradient(BIN.x, BIN.y, BIN.x, BIN.y + BIN.h);
  bin.addColorStop(0, "#f4f7f8");
  bin.addColorStop(0.35, "#c5ced6");
  bin.addColorStop(1, "#7e8993");
  ctx.fillStyle = bin;
  roundRect(BIN.x, BIN.y, BIN.w, BIN.h, 18);
  ctx.fill();
  const oil = ctx.createLinearGradient(BIN.x, BIN.y, BIN.x, BIN.y + BIN.h);
  oil.addColorStop(0, "#f0d98a");
  oil.addColorStop(1, "#8d6414");
  ctx.fillStyle = oil;
  roundRect(BIN.x + 8, BIN.y + 10, BIN.w - 16, BIN.h - 22, 12);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(BOARD.x + 6, BOARD.y + 8);
  ctx.lineTo(BOARD.x + BOARD.w + 4, BOARD.y + 10);
  ctx.lineTo(BOARD.x + BOARD.w + 2, BOARD.y + BOARD.h + 8);
  ctx.lineTo(BOARD.x + 2, BOARD.y + BOARD.h + 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(BOARD.x + BOARD.w * 0.05, BOARD.y);
  ctx.lineTo(BOARD.x + BOARD.w * 0.95, BOARD.y + BOARD.h * 0.04);
  ctx.lineTo(BOARD.x + BOARD.w, BOARD.y + BOARD.h);
  ctx.lineTo(BOARD.x, BOARD.y + BOARD.h);
  ctx.closePath();
  const board = ctx.createLinearGradient(0, BOARD.y, 0, BOARD.y + BOARD.h);
  board.addColorStop(0, "#ef6a55");
  board.addColorStop(0.45, "#d04532");
  board.addColorStop(1, "#8f2418");
  ctx.fillStyle = board;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(GRILL.x, GRILL.y, GRILL.w, GRILL.h, 16);
  ctx.clip();
  if (img.bg) ctx.drawImage(img.bg, 690, 424, 430, 210, GRILL.x - 4, GRILL.y - 6, GRILL.w + 8, GRILL.h + 10);
  else {
    ctx.fillStyle = "#2b2118";
    ctx.fillRect(GRILL.x, GRILL.y, GRILL.w, GRILL.h);
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.22 + 0.08 * Math.sin(S.frame * 0.2);
  const heat = ctx.createRadialGradient(GRILL.x + GRILL.w * 0.5, GRILL.y + GRILL.h * 0.62, 8, GRILL.x + GRILL.w * 0.5, GRILL.y + GRILL.h * 0.6, GRILL.w * 0.5);
  heat.addColorStop(0, "rgba(255, 140, 40, 0.9)");
  heat.addColorStop(1, "rgba(255, 60, 0, 0)");
  ctx.fillStyle = heat;
  ctx.fillRect(GRILL.x, GRILL.y, GRILL.w, GRILL.h);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(SAUSAGES.x + 3, SAUSAGES.y + 6, SAUSAGES.w, SAUSAGES.h, 14);
  ctx.fill();
  const tray = ctx.createLinearGradient(SAUSAGES.x, SAUSAGES.y, SAUSAGES.x, SAUSAGES.y + SAUSAGES.h);
  tray.addColorStop(0, "#f7f8f8");
  tray.addColorStop(1, "#aeb6be");
  ctx.fillStyle = tray;
  roundRect(SAUSAGES.x, SAUSAGES.y, SAUSAGES.w, SAUSAGES.h, 14);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    drawImageW(img.dog0, SAUSAGES.x + SAUSAGES.w * 0.5, SAUSAGES.y + SAUSAGES.h * (0.28 + i * 0.22), Math.min(SAUSAGES.w * 0.8, 88));
  }
  ctx.restore();

  ctx.save();
  const canW = TRASH.w * 0.92;
  const canH = Math.min(TRASH.h * 0.62, 132);
  const canX = TRASH.x + TRASH.w * 0.5;
  const canY = TRASH.y + TRASH.h - canH - 6;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(canX + 3, canY + canH, canW * 0.42, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const can = ctx.createLinearGradient(TRASH.x, 0, TRASH.x + TRASH.w, 0);
  can.addColorStop(0, "#5c656e");
  can.addColorStop(0.4, "#a8b1b8");
  can.addColorStop(1, "#3e464e");
  ctx.fillStyle = can;
  roundRect(canX - canW / 2, canY, canW, canH, 10);
  ctx.fill();
  ctx.fillStyle = "#12161a";
  ctx.beginPath();
  ctx.ellipse(canX, canY + 10, canW * 0.42, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d5dde2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(canX, canY + 10, canW * 0.42, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(CRATE.x + 3, CRATE.y + 6, CRATE.w, CRATE.h, 8);
  ctx.fill();
  const wood = ctx.createLinearGradient(CRATE.x, CRATE.y, CRATE.x, CRATE.y + CRATE.h);
  wood.addColorStop(0, "#c48a52");
  wood.addColorStop(1, "#6b3d1c");
  ctx.fillStyle = wood;
  roundRect(CRATE.x, CRATE.y, CRATE.w, CRATE.h, 8);
  ctx.fill();
  drawImageW(img.bun, CRATE.x + CRATE.w * 0.5, CRATE.y + CRATE.h * 0.42, CRATE.w * 0.82);
  if (has("burger")) {
    ctx.fillStyle = wood;
    roundRect(BURGER_CRATE.x, BURGER_CRATE.y, BURGER_CRATE.w, BURGER_CRATE.h, 8);
    ctx.fill();
    drawImageH(img.bbun, BURGER_CRATE.x + BURGER_CRATE.w * 0.5, BURGER_CRATE.y + BURGER_CRATE.h * 0.45, BURGER_CRATE.h * 0.7);
  }
  ctx.restore();
}

function drawFood() {
  S.buns.forEach((plate, index) => plate && drawPlate(plate, BUN_SPOTS[index].x, BUN_SPOTS[index].y, "hot_dog", spotScale(BUN_SPOTS, index)));
  S.bbuns.forEach((plate, index) => plate && drawPlate(plate, BBUN_SPOTS[index].x, BBUN_SPOTS[index].y, "burger", spotScale(BBUN_SPOTS, index)));
  S.dogs.forEach((dog, index) => {
    if (!dog) return;
    drawGrillDog(dog, index);
  });
  S.patties.forEach((patty, index) => {
    if (!patty) return;
    const key = "patty" + cookVisual(patty.state);
    if (patty.state === 2) {
      ctx.save();
      ctx.shadowColor = "rgba(255, 214, 60, 0.95)";
      ctx.shadowBlur = 18;
      drawImageH(img[key], PATTY_SPOTS[index].x, PATTY_SPOTS[index].y, 48);
      ctx.restore();
    } else drawImageH(img[key], PATTY_SPOTS[index].x, PATTY_SPOTS[index].y, 48);
  });
  S.onions.forEach((onion, index) => {
    if (!onion) return;
    drawImageH(onion.state >= 2 ? img.onion1 : img.onion0, ONION_SPOTS[index].x, ONION_SPOTS[index].y, 36);
  });
  if (has("fries")) {
    ctx.save();
    roundRect(FRYER.x, FRYER.y, FRYER.w, FRYER.h, 12);
    ctx.fillStyle = "rgba(120, 92, 40, 0.45)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 224, 160, 0.85)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  S.fries.forEach((ready, index) => ready && drawImageH(img.fries, FRIE_SPOTS[index].x, FRIE_SPOTS[index].y, 48));
  S.rejects.forEach((item) => {
    if (!item) return;
    ctx.save();
    ctx.shadowColor = "rgba(255, 64, 40, 0.85)";
    ctx.shadowBlur = 16;
    drawPlate(item.plate, item.x, item.y, item.kind);
    ctx.restore();
  });
  for (const slot of S.slots) {
    if (!slot.cash) continue;
    if (S.hand && S.hand.kind === "cash" && S.hand.index === S.slots.indexOf(slot)) continue;
    const bob = Math.sin(S.frame * 0.12 + slot.cash.x) * 1.5;
    contactShadow(slot.cash.x, slot.cash.y + 18, 22, 7);
    drawImageH(img.cash, slot.cash.x, slot.cash.y + bob, view.portrait ? 52 : 64);
    ctx.fillStyle = "#3a2414";
    ctx.font = "700 18px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`$${slot.cash.amount}`, slot.cash.x, slot.cash.y + bob + 6);
  }
  drawCondiments();
  if (has("burger")) {
    if (view.portrait) drawImageH(img.patty0, PATTIES.x + PATTIES.w * 0.5, PATTIES.y + PATTIES.h * 0.45, 34);
    else {
      drawImageH(img.bbun, BURGER_CRATE.x + 50, BURGER_CRATE.y + 40, 58);
      drawImageH(img.patty0, PATTIES.x + 40, PATTIES.y + 40, 46);
    }
  }
  if (has("lemon")) drawImageH(img.lemonade, LEMON.x + LEMON.w * 0.5, LEMON.y + LEMON.h * 0.55, Math.min(90, LEMON.h * 0.9));
  if (has("cola")) drawImageH(img.cola, COLA.x + COLA.w * 0.5, COLA.y + COLA.h * 0.55, Math.min(90, COLA.h * 0.9));
  const pulse = 0.55 + 0.45 * Math.sin(S.frame * 0.18);
  ctx.save();
  ctx.globalAlpha = pulse;
  if (S.tool === "ketchup") ring(KETCHUP);
  if (S.tool === "mustard") ring(MUSTARD);
  if (S.tool === "relish") ring(RELISH);
  if (S.tool === "onion") ring(ONION_BIN);
  if (S.tool === "lemonade") ring(LEMON);
  if (S.tool === "cola") ring(COLA);
  ctx.restore();
}

function ring(rect) {
  ctx.save();
  ctx.strokeStyle = "#ffe56a";
  ctx.lineWidth = 4;
  roundRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8, 12);
  ctx.stroke();
  ctx.restore();
}

function drawHand() {
  if (!S.hand) return;
  const x = S.px;
  const y = S.py - HAND_LIFT;
  if (S.hand.kind === "dog" || S.hand.kind === "spawn-dog") drawImageW(img["dog" + cookVisual(S.hand.state || 0)], x, y, view.portrait ? 96 : 120);
  else if (S.hand.kind === "patty" || S.hand.kind === "spawn-patty") drawImageH(img["patty" + cookVisual(S.hand.state || 0)], x, y, 52);
  else if (S.hand.kind === "onion") drawImageH(S.hand.state >= 2 ? img.onion1 : img.onion0, x, y, 40);
  else if (S.hand.kind === "fries") drawImageH(img.fries, x, y, 56);
  else if (S.hand.kind === "plain-bun" || S.hand.kind === "spawn-bun") drawImageW(img.bun, x, y, view.portrait ? 120 : 160);
  else if (S.hand.kind === "plain-burger" || S.hand.kind === "spawn-burger") drawImageH(img.bbun, x, y, 70);
  else if (S.hand.kind === "cash") {
    drawImageH(img.cash, x, y, view.portrait ? 56 : 68);
    ctx.fillStyle = "#3a2414";
    ctx.font = "700 18px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`$${S.hand.amount}`, x, y + 6);
  }
  else if (S.hand.plate) drawPlate(S.hand.plate, x, y, S.hand.kind);
}

function drawAim() {
  if (!S.hand || S.screen !== "play") return;
  if (S.hand.kind === "cash") return;
  if (String(S.hand.kind).startsWith("spawn")) {
    drawSpawnAim();
    return;
  }
  const found = dropCandidates(S.px, S.py);
  found.sort((a, b) => a.score - b.score);
  const hot = found[0] && found[0].mark === TRASH;
  ctx.save();
  ctx.strokeStyle = hot ? "#ff5a3c" : "rgba(255, 246, 232, 0.85)";
  ctx.lineWidth = hot ? 6 : 3;
  ctx.setLineDash(hot ? [] : [8, 6]);
  roundRect(TRASH.x + 16, TRASH.y + 28, TRASH.w - 36, TRASH.h - 70, 18);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "700 22px Fredoka, Nunito, sans-serif";
  const label = hot ? "Toss" : "Trash";
  const cx = TRASH.x + TRASH.w * 0.45;
  const tw = ctx.measureText(label).width + 28;
  roundRect(cx - tw / 2, TRASH.y + 8, tw, 36, 12);
  ctx.fillStyle = hot ? "rgba(160, 32, 18, 0.94)" : "rgba(28, 16, 12, 0.82)";
  ctx.fill();
  ctx.fillStyle = "#fff6e8";
  ctx.textAlign = "center";
  ctx.fillText(label, cx, TRASH.y + 33);
  ctx.restore();
  if (found[0] && found[0].mark !== TRASH) ring(found[0].mark);
}

function drawThrows() {
  for (const ball of S.throws) {
    const scale = 1 + Math.min(0.8, ball.life * 0.045);
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rot);
    ctx.scale(scale, scale);
    drawPlate(ball.plate, 0, 0, ball.kind);
    ctx.restore();
  }
}

function drawAnger() {
  for (const slot of S.slots) {
    const body = slot.body;
    if (!body || body.state !== "wait" || body.mood < 3) continue;
    ctx.save();
    ctx.font = "700 44px Fredoka, Nunito, sans-serif";
    ctx.fillStyle = "#ff3b30";
    ctx.textAlign = "center";
    ctx.fillText("!", body.x + (view.portrait ? 34 : 78), view.portrait ? view.sat + 78 : 86);
    ctx.restore();
  }
}

function drawToolCursor() {
  if (!S.tool || S.hand) return;
  const icon = {
    ketchup: img.sauceK,
    mustard: img.sauceM,
    relish: img.sauceR,
    onion: img.onion0,
    lemonade: img.lemonade,
    cola: img.cola,
  }[S.tool];
  if (S.tool === "ketchup" || S.tool === "mustard" || S.tool === "relish") drawImageW(icon, S.px, S.py - 28, 70);
  else drawImageH(icon, S.px, S.py - 28, 40);
}

function chip(text, x, y, align) {
  const size = view.portrait ? 15 : 26;
  const h = view.portrait ? 30 : 40;
  ctx.font = `700 ${size}px Fredoka, Nunito, sans-serif`;
  const w = ctx.measureText(text).width + (view.portrait ? 18 : 28);
  const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  roundRect(left, y, w, h, 14);
  ctx.fillStyle = "rgba(28, 16, 12, 0.72)";
  ctx.fill();
  ctx.fillStyle = "#fff6e8";
  ctx.textAlign = "left";
  ctx.fillText(text, left + (view.portrait ? 9 : 14), y + (view.portrait ? 20 : 28));
}

function drawClock() {
  const pct = S.timeOut ? 0 : 1 - S.frame / DAY_FRAMES;
  const x = view.portrait ? 30 : 46;
  const y = (view.sat || 0) + (view.portrait ? 26 : 40);
  const radius = view.portrait ? 16 : 24;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f6e2c2";
  ctx.fill();
  ctx.strokeStyle = "#3a2416";
  ctx.lineWidth = 3;
  ctx.stroke();
  const hour = ((-70 + (1 - pct) * 230) * Math.PI) / 180;
  const minute = ((1 - pct) * Math.PI * 2) - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(hour) * radius * 0.42, y + Math.sin(hour) * radius * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(minute) * radius * 0.66, y + Math.sin(minute) * radius * 0.66);
  ctx.stroke();
}

function drawHud() {
  drawClock();
  const level = levelAt(S.level);
  const goal = view.portrait
    ? `${dayLabel(S.level)}  $${S.score}/$${level.goal}`
    : `${dayLabel(S.level)} · ${PLACES[level.loc]} · Goal $${level.goal}`;
  chip(goal, view.portrait ? 56 : W / 2, view.sat + (view.portrait ? 8 : 12), view.portrait ? "left" : "center");
  if (!view.portrait) chip(`$${S.score}`, 1160, 12, "right");
  const meterX = view.portrait ? W - 158 : 1040;
  const meterY = view.portrait ? view.sat + 52 : 62;
  roundRect(meterX, meterY, 150, 14, 7);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  roundRect(meterX, meterY, 150 * S.meter, 14, 7);
  ctx.fillStyle = S.meter > 0.55 ? "#3ecf6e" : S.meter > 0.3 ? "#e2c14a" : "#d23b3b";
  ctx.fill();
  roundRect(PAUSE.x, PAUSE.y, PAUSE.w, PAUSE.h, 14);
  ctx.fillStyle = "rgba(28,16,12,0.72)";
  ctx.fill();
  ctx.fillStyle = "#fff6e8";
  ctx.font = "700 22px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(S.paused ? "►" : "II", PAUSE.x + PAUSE.w / 2, PAUSE.y + 34);
  const line = S.tip < TIPS.length ? TIPS[S.tip] : HINTS[S.hint % HINTS.length];
  if (line && !S.banner) {
    const maxW = W - 24;
    let size = view.portrait ? 15 : 20;
    ctx.font = `700 ${size}px Nunito, sans-serif`;
    while (size > 11 && ctx.measureText(line).width + 36 > maxW) {
      size -= 1;
      ctx.font = `700 ${size}px Nunito, sans-serif`;
    }
    const tw = Math.min(maxW, ctx.measureText(line).width + 36);
    const tipY = view.portrait ? H - view.sab - 46 : 668;
    roundRect((W - tw) / 2, tipY, tw, 40, 14);
    ctx.fillStyle = "rgba(28,16,12,0.78)";
    ctx.fill();
    ctx.fillStyle = "#fff6e8";
    ctx.textAlign = "center";
    ctx.fillText(line, W / 2, tipY + 27);
  }
  for (const floater of S.floats) {
    ctx.globalAlpha = Math.max(0, floater.life / 56);
    ctx.fillStyle = floater.color;
    ctx.font = "700 26px Fredoka, Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(floater.text, floater.x, floater.y - (56 - floater.life) * 0.4);
    ctx.globalAlpha = 1;
  }
  if (S.toast) {
    ctx.font = "700 28px Fredoka, Nunito, sans-serif";
    const tw = ctx.measureText(S.toast.text).width + 40;
    roundRect((W - tw) / 2, 120, tw, 52, 16);
    ctx.fillStyle = "rgba(92, 28, 22, 0.92)";
    ctx.fill();
    ctx.fillStyle = "#fff6e8";
    ctx.textAlign = "center";
    ctx.fillText(S.toast.text, W / 2, 154);
  }
}

function drawBanner() {
  ctx.fillStyle = "rgba(16, 8, 6, 0.45)";
  ctx.fillRect(0, 0, W, H);
  const bw = Math.min(720, W - 32);
  const bh = Math.min(250, Math.max(180, H * 0.36));
  const bx = (W - bw) / 2;
  const by = Math.max(view.sat + 48, (H - bh) / 2 - 10);
  roundRect(bx, by, bw, bh, 24);
  ctx.fillStyle = "#fff8ee";
  ctx.fill();
  ctx.fillStyle = "#3a2416";
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(Math.min(40, W * 0.07))}px Fredoka, Nunito, sans-serif`;
  ctx.fillText(S.banner.title, W / 2, by + bh * 0.32);
  ctx.font = `700 ${Math.round(Math.min(26, W * 0.045))}px Nunito, sans-serif`;
  ctx.fillText(S.banner.body, W / 2, by + bh * 0.52);
  const btnW = Math.min(300, bw * 0.62);
  roundRect((W - btnW) / 2, by + bh * 0.66, btnW, 56, 16);
  ctx.fillStyle = "#c0392b";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText("Let's cook", W / 2, by + bh * 0.66 + 36);
}

function drawTitle() {
  if (view.portrait) {
    drawPortraitKitchen();
    ctx.fillStyle = "rgba(20, 10, 8, 0.5)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff6e8";
    ctx.font = `700 ${Math.round(Math.min(64, W * 0.12))}px Fredoka, Nunito, sans-serif`;
    ctx.fillText("HOT DOG", W / 2, H * 0.28);
    ctx.fillText("RUSH", W / 2, H * 0.36);
    const level = levelAt(S.level);
    ctx.font = `700 ${Math.round(Math.min(22, W * 0.05))}px Nunito, sans-serif`;
    ctx.fillText(`${dayLabel(S.level)}  ·  ${PLACES[level.loc]}`, W / 2, H * 0.44);
    ctx.fillText(`Goal $${level.goal}    ·    Career $${S.total}`, W / 2, H * 0.49);
    const btn = titleButton();
    roundRect(btn.x, btn.y, btn.w, btn.h, 20);
    ctx.fillStyle = "#c0392b";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 28px Fredoka, Nunito, sans-serif";
    ctx.fillText(S.level === 1 && S.total === 0 ? "Start the day" : "Continue", W / 2, btn.y + 44);
    return;
  }
  ctx.drawImage(img.bg, 0, 0, W, H);
  ctx.fillStyle = "rgba(20, 10, 8, 0.45)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff6e8";
  ctx.font = "700 76px Fredoka, Nunito, sans-serif";
  ctx.fillText("HOT DOG RUSH", W / 2, 230);
  const level = levelAt(S.level);
  ctx.font = "700 28px Nunito, sans-serif";
  ctx.fillText(`${dayLabel(S.level)}  ·  ${PLACES[level.loc]}`, W / 2, 290);
  ctx.fillText(`Goal $${level.goal}    ·    Career $${S.total}`, W / 2, 334);
  roundRect(470, 390, 340, 78, 22);
  ctx.fillStyle = "#c0392b";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 36px Fredoka, Nunito, sans-serif";
  ctx.fillText(S.level === 1 && S.total === 0 ? "Start the day" : "Continue", W / 2, 440);
  ctx.font = "700 18px Nunito, sans-serif";
  ctx.fillStyle = "#fff6e8";
  ctx.fillText("Click the crates. Drag the food. Pick up the cash.", W / 2, 520);
}

function drawEnd() {
  if (view.portrait) {
    drawPortraitKitchen();
    ctx.fillStyle = "rgba(16, 8, 6, 0.55)";
    ctx.fillRect(0, 0, W, H);
    const cardW = W - 36;
    const cardH = Math.min(420, H * 0.62);
    const cardX = 18;
    const cardY = H * 0.16;
    roundRect(cardX, cardY, cardW, cardH, 22);
    ctx.fillStyle = "#fff8ee";
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#3a2416";
    ctx.font = "700 36px Fredoka, Nunito, sans-serif";
    ctx.fillText(S.result.won ? "Day cleared" : "Not enough", W / 2, cardY + 70);
    ctx.font = "700 22px Nunito, sans-serif";
    ctx.fillText(`Needed $${S.result.goal}`, W / 2, cardY + 130);
    ctx.fillText(`Earned $${S.result.earned}`, W / 2, cardY + 168);
    ctx.fillText(`Career $${S.result.total}`, W / 2, cardY + 206);
    const btn = endButton();
    roundRect(btn.x, btn.y, btn.w, btn.h, 18);
    ctx.fillStyle = "#c0392b";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 22px Fredoka, Nunito, sans-serif";
    const next = levelAt(S.level);
    const label = S.result.wrapped ? "Play again" : S.result.won ? `${DAYS[(S.level - 1) % 5]} · ${PLACES[next.loc]}` : "Try this day again";
    ctx.fillText(label, W / 2, btn.y + 40);
    return;
  }
  ctx.drawImage(img.bg, 0, 0, W, H);
  ctx.fillStyle = "rgba(16, 8, 6, 0.5)";
  ctx.fillRect(0, 0, W, H);
  roundRect(300, 140, 680, 420, 24);
  ctx.fillStyle = "#fff8ee";
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "#3a2416";
  ctx.font = "700 46px Fredoka, Nunito, sans-serif";
  ctx.fillText(S.result.won ? "Day cleared" : "Not enough", W / 2, 230);
  ctx.font = "700 26px Nunito, sans-serif";
  ctx.fillText(`Needed $${S.result.goal}`, W / 2, 290);
  ctx.fillText(`Earned $${S.result.earned}`, W / 2, 332);
  ctx.fillText(`Career $${S.result.total}`, W / 2, 374);
  roundRect(470, 420, 340, 72, 18);
  ctx.fillStyle = "#c0392b";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 30px Fredoka, Nunito, sans-serif";
  const next = levelAt(S.level);
  const label = S.result.wrapped ? "Play again" : S.result.won ? `${DAYS[(S.level - 1) % 5]} · ${PLACES[next.loc]}` : "Try this day again";
  ctx.fillText(label, W / 2, 466);
}

function drawZones() {
  if (!showZones) return;
  ctx.save();
  ctx.strokeStyle = "rgba(0,255,255,0.8)";
  ctx.lineWidth = 2;
  for (const rect of [CRATE, SAUSAGES, KETCHUP, TRASH, FRYER, MUSTARD, RELISH, PATTIES, BURGER_CRATE, ONION_BIN, LEMON, COLA]) {
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

function frame(now) {
  requestAnimationFrame(frame);
  try {
    resize();
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    let steps = 0;
    while (acc >= 1000 / 30 && steps < 5) {
      sim();
      acc -= 1000 / 30;
      steps += 1;
    }
    if (steps === 5) acc = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    beginFrame();
    const shaking = S.screen === "play" && S.shake > 0;
    if (shaking) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
    }
    if (S.screen === "title") drawTitle();
    else if (S.screen === "end") drawEnd();
    else {
      if (view.portrait) drawPortraitKitchen();
      else {
        ctx.drawImage(img.bg, 0, 0, W, H);
        drawPeople();
      }
      drawEmbers();
      drawFood();
      drawHand();
      drawAim();
      drawToolCursor();
      drawAnger();
      drawHud();
      drawThrows();
      drawZones();
      if (S.paused && !S.banner) {
        ctx.fillStyle = "rgba(10,6,4,0.35)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff6e8";
        ctx.font = "700 48px Fredoka, Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Paused", W / 2, H / 2);
      }
      if (S.banner) drawBanner();
    }
    if (shaking) ctx.restore();
  } catch (error) {
    console.error(error);
    acc = 0;
  }
}

canvas.addEventListener("pointerdown", onDown, { passive: false });
canvas.addEventListener("pointermove", onMove, { passive: false });
canvas.addEventListener("pointerup", onUp);
canvas.addEventListener("pointercancel", onUp);
window.addEventListener("pointerup", onUp);
window.addEventListener("pointercancel", onUp);
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
document.addEventListener("visibilitychange", () => {
  last = 0;
  acc = 0;
  if (document.hidden) {
    if (S.hand && S.hand.origin) restore();
    else S.hand = null;
    gesture = null;
  }
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

resize();

readSave();
loadImages().then(() => {
  document.getElementById("boot")?.remove();
  requestAnimationFrame(frame);
}).catch((error) => {
  const boot = document.getElementById("boot");
  if (boot) boot.textContent = "The stand art didn't load.";
  console.error(error);
});

window.__rush = {
  get score() { return S.score; },
  get screen() { return S.screen; },
  get level() { return S.level; },
  get meter() { return S.meter; },
  get tip() { return S.tip; },
  start(level) { begin(level || S.level); S.banner = null; },
  tap(x, y) { gesture = { x, y, moved: false, hadHand: !!S.hand }; tapAt(x, y, !!S.hand); gesture = null; },
  drag(x1, y1, x2, y2) {
    gesture = { x: x1, y: y1, moved: true, hadHand: !!S.hand, source: sourceAt(x1, y1) };
    const hit = pickDraggable(x1, y1);
    if (hit) lift(hit);
    else armSource(gesture.source);
    releaseAt(x2, y2, false);
    gesture = null;
  },
  readyDogs() {
    S.dogs.forEach((dog) => {
      if (dog) {
        dog.state = 2;
        dog.left = 200;
      }
    });
  },
  spawn() { trySpawn(); },
  cast(types) {
    const level = levelAt(S.level);
    types.forEach((type, index) => {
      if (!type || !S.slots[index]) {
        if (S.slots[index]) S.slots[index].body = null;
        return;
      }
      const person = PEOPLE[type] || PEOPLE.generic_man;
      const waitMax = waitingFor(type, level.wait);
      S.slots[index].body = {
        type,
        person,
        look: LOOK[type] || LOOK.generic_man,
        x: SLOT_X[index],
        dir: 1,
        slot: index,
        state: "wait",
        wait: waitMax,
        waitMax,
        marks: patienceMarks(waitMax),
        mood: 0,
        serve: SERVE_FRAMES,
        order: rollOrder(menu(), Math.random),
        items: 1,
        price: 0,
        sat: 0,
        perfect: true,
        shaking: false,
        leave: 0,
        bill: 0,
        caught: 0,
      };
      S.slots[index].body.items = S.slots[index].body.order.items;
    });
  },
  burnDogs() {
    S.dogs.forEach((dog) => {
      if (dog) {
        dog.state = 3;
        dog.left = 40;
      }
    });
  },
  pause(on) { S.paused = on !== false; },
  fly(n) { for (let i = 0; i < n; i++) tickThrows(); },
  step(n) { for (let i = 0; i < n; i++) sim(); },
  layout() {
    return {
      portrait: view.portrait,
      w: W,
      h: H,
      crate: { ...CRATE },
      sausages: { ...SAUSAGES },
      ketchup: { ...KETCHUP },
      mustard: { ...MUSTARD },
      relish: { ...RELISH },
      onion: { ...ONION_BIN },
      buns: BUN_SPOTS.map((spot) => ({ ...spot })),
      dogs: DOG_SPOTS.map((spot) => ({ ...spot })),
      trash: { ...TRASH },
      bin: { ...BIN },
      board: { ...BOARD },
    };
  },
  snapshot() {
    return {
      score: S.score,
      meter: S.meter,
      screen: S.screen,
      buns: S.buns.map((bun) => (bun ? { ...bun } : null)),
      dogs: S.dogs.map((dog) => (dog ? { state: dog.state, left: dog.left } : null)),
      rejects: S.rejects.map((item) => (item ? item.kind : null)),
      throws: S.throws.length,
      crowd: S.crowd,
      bodies: S.slots.map((slot) => (slot.body ? { type: slot.body.type, state: slot.body.state, items: slot.body.items, mood: slot.body.mood, ketchup: slot.body.order.ketchup, snack: slot.body.order.snack } : null)),
      cash: S.slots.map((slot) => (slot.cash ? slot.cash.amount : 0)),
    };
  },
};
