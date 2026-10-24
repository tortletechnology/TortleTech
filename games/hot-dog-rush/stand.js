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

const W = 1280;
const H = 720;
const SAVE_KEY = "hot-dog-rush-stand";

const BUN_SPOTS = [
  { x: 470, y: 455 },
  { x: 585, y: 490 },
  { x: 700, y: 455 },
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
  { x: 155, y: 400 },
  { x: 210, y: 445 },
  { x: 255, y: 390 },
];
const SLOT_X = [180, 420, 660, 900, 1140];
const FEET = 328;
const CRATE = { x: 300, y: 200, w: 290, h: 170 };
const SAUSAGES = { x: 1085, y: 470, w: 195, h: 230 };
const KETCHUP = { x: 55, y: 125, w: 90, h: 220 };
const MUSTARD = { x: 155, y: 180, w: 80, h: 170 };
const FRYER = { x: 100, y: 300, w: 200, h: 190 };
const TRASH = { x: 0, y: 530, w: 150, h: 190 };
const PATTIES = { x: 760, y: 330, w: 90, h: 90 };
const BURGER_CRATE = { x: 700, y: 250, w: 110, h: 90 };
const ONION_BIN = { x: 200, y: 330, w: 100, h: 90 };
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
  "If the bubble shows ketchup, click the bottle, then the bun.",
  "Drag the hot dog to the customer, then tap the cash.",
];

const HINTS = [
  "Undercooked or burnt hot dogs pay less.",
  "Hand over part of an order and they wait a little longer.",
  "The wrong topping comes out of the bill.",
  "Faster service pays more.",
  "Cash left on the counter blocks the next customer.",
  "Serve the angry customers first.",
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const showZones = new URLSearchParams(location.search).has("zones");

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
  for (const slot of S.slots) {
    if (slot.body) tickBody(slot);
  }
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
  S.dogs.forEach(cookOne);
  S.patties.forEach(cookOne);
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
    x: fromRight ? 1460 : -180,
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
    if (body.x < -220 || body.x > 1500) slot.body = null;
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
  slot.cash = { amount, x: SLOT_X[slot.body.slot], y: 400 };
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

function placeBun(list) {
  const index = firstEmpty(list);
  if (index < 0) {
    float("Full", 540, 450);
    return;
  }
  list[index] = { ketchup: 0, mustard: 0, sausage: 0, burger: 0, onion: 0 };
  tone(520, 0.05, "triangle", 0.04);
  if (list === S.buns) advanceTip(1);
}

function placeGrill(list, total) {
  const index = firstEmpty(list);
  if (index < 0) {
    float("Full", 940, 430);
    return;
  }
  list[index] = { left: total, state: 0, marks: cookMarks(total) };
  tone(300, 0.06, "sawtooth", 0.03);
  if (list === S.dogs) advanceTip(2);
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
  if (!plate || (S.tool !== "ketchup" && S.tool !== "mustard")) return false;
  if (plate[S.tool]) return false;
  plate[S.tool] = 1;
  if (S.tool === "ketchup") advanceTip(5);
  S.tool = null;
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

function pickDraggable(x, y) {
  for (let i = 0; i < 3; i++) if (S.buns[i] && near(BUN_SPOTS[i], x, y, 52)) return { type: "bun", index: i };
  for (let i = 0; i < 3; i++) if (S.bbuns[i] && near(BBUN_SPOTS[i], x, y, 48)) return { type: "bbun", index: i };
  for (let i = 0; i < 3; i++) if (S.dogs[i] && near(DOG_SPOTS[i], x, y, 46)) return { type: "dog", index: i };
  for (let i = 0; i < 3; i++) if (S.patties[i] && near(PATTY_SPOTS[i], x, y, 42)) return { type: "patty", index: i };
  for (let i = 0; i < 2; i++) if (S.onions[i] && near(ONION_SPOTS[i], x, y, 40)) return { type: "onion", index: i };
  for (let i = 0; i < 3; i++) if (S.fries[i] && near(FRIE_SPOTS[i], x, y, 36)) return { type: "fries", index: i };
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
  }
}

function dropAt(x, y) {
  if (!S.hand) return;
  if (inRect(TRASH, x, y)) {
    trashHand();
    return;
  }
  if (S.hand.kind === "dog") {
    const index = BUN_SPOTS.findIndex((spot, i) => S.buns[i] && near(spot, x, y, 56));
    if (index >= 0 && acceptPlate(S.buns, index, "sausage", S.hand.state + 1)) return;
  }
  if (S.hand.kind === "patty") {
    const index = BBUN_SPOTS.findIndex((spot, i) => S.bbuns[i] && near(spot, x, y, 54));
    if (index >= 0 && acceptPlate(S.bbuns, index, "burger", S.hand.state + 1)) return;
  }
  if (S.hand.kind === "onion") {
    const pools = [[S.buns, BUN_SPOTS], [S.bbuns, BBUN_SPOTS]];
    for (const [list, spots] of pools) {
      const index = spots.findIndex((spot, i) => list[i] && near(spot, x, y, 54));
      if (index >= 0 && list[index] && !list[index].onion) {
        list[index].onion = S.hand.state + 1;
        S.hand = null;
        tone(640, 0.05, "sine", 0.04);
        return;
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    const body = S.slots[i].body;
    if (body && Math.abs(x - body.x) < 80 && y < 360 && give(S.slots[i])) return;
  }
  restore();
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
  if (has("onion") && inRect(ONION_BIN, x, y)) {
    placeGrill(S.onions, COOK.onion);
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
  if (has("mustard") && inRect(MUSTARD, x, y)) {
    S.tool = S.tool === "mustard" ? null : "mustard";
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
    if (y > 360 && y < 500 && x > 430 && x < 850) begin(S.level);
    return;
  }
  if (S.screen === "end") {
    if (y > 430 && y < 540 && x > 430 && x < 850) begin(S.level);
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
    if (!body || Math.abs(x - body.x) > 78 || y > 360) continue;
    if (body.state === "escape") {
      body.state = "caught";
      body.caught = 90;
      tone(440, 0.08, "triangle", 0.05);
      return;
    }
    if (S.tool && giveTool(S.slots[i])) return;
  }
  if (S.tool === "ketchup" || S.tool === "mustard") {
    for (let i = 0; i < 3; i++) if (S.buns[i] && near(BUN_SPOTS[i], x, y, 54) && sauceOn(S.buns, i)) return;
    for (let i = 0; i < 3; i++) if (S.bbuns[i] && near(BBUN_SPOTS[i], x, y, 50) && sauceOn(S.bbuns, i)) return;
    S.tool = null;
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
  return {
    x: ((event.clientX - rect.left) * W) / rect.width,
    y: ((event.clientY - rect.top) * H) / rect.height,
  };
}

function onDown(event) {
  if (event.cancelable) event.preventDefault();
  const p = pointerPos(event);
  S.px = p.x;
  S.py = p.y;
  gesture = { x: p.x, y: p.y, moved: false, hadHand: !!S.hand };
  canvas.setPointerCapture?.(event.pointerId);
}

function onMove(event) {
  const p = pointerPos(event);
  S.px = p.x;
  S.py = p.y;
  if (!gesture) return;
  if (Math.hypot(p.x - gesture.x, p.y - gesture.y) > 16) {
    gesture.moved = true;
    if (!S.hand && S.screen === "play" && !S.banner) {
      const hit = pickDraggable(gesture.x, gesture.y);
      if (hit) lift(hit);
    }
  }
}

function onUp(event) {
  const p = pointerPos(event);
  S.px = p.x;
  S.py = p.y;
  if (!gesture) return;
  if (gesture.moved && S.hand) dropAt(p.x, p.y);
  else tapAt(p.x, p.y, gesture.hadHand);
  gesture = null;
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

function drawPlate(plate, x, y, kind) {
  if (kind === "burger") {
    drawImageH(img.bbun, x, y, 78);
    if (plate.burger) drawImageH(meatSprite("patty", plate.burger), x, y - 6, 52);
  } else {
    drawImageW(img.bun, x, y, 168);
    if (plate.sausage) drawImageW(meatSprite("dog", plate.sausage), x, y - 2, 118);
  }
  if (plate.onion) drawImageH(plate.onion >= 3 ? img.onion1 : img.onion0, x + 16, y - 8, 28);
  if (plate.ketchup) drawImageH(img.ketchup, x - 6, y - 8, 78);
  if (plate.mustard) drawImageH(img.mustard, x + 18, y - 4, 74);
}

function drawBubble(body) {
  const icons = [];
  if (body.order.snack === "hot_dog") icons.push(["dog2", 26]);
  if (body.order.snack === "burger") icons.push(["patty2", 26]);
  if (body.order.ketchup) icons.push(["ketchup", 28]);
  if (body.order.mustard) icons.push(["mustard", 28]);
  if (body.order.onion) icons.push(["onion1", 24]);
  for (let i = 0; i < body.order.fries; i++) icons.push(["fries", 28]);
  if (body.order.drink === "lemonade") icons.push(["lemonade", 32]);
  if (body.order.drink === "cola") icons.push(["cola", 32]);
  if (!icons.length) return;
  const w = icons.length * 34 + 16;
  const x = Math.max(8, Math.min(W - w - 8, body.x - w / 2));
  const y = 78;
  roundRect(x, y, w, 42, 12);
  ctx.fillStyle = "rgba(255,250,240,0.95)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ["#2f9e44", "#d4a017", "#e07020", "#d23b3b"][body.mood] || "#2f9e44";
  ctx.stroke();
  icons.forEach((icon, index) => drawImageH(img[icon[0]], x + 24 + index * 34, y + 22, icon[1]));
  const frac = Math.max(0, body.wait / body.waitMax);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 8, y + 36, w - 16, 3);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(x + 8, y + 36, (w - 16) * frac, 3);
}

function drawPeople() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, 336);
  ctx.clip();
  for (const slot of S.slots) {
    const body = slot.body;
    if (!body) continue;
    const shake = body.shaking ? Math.sin(S.frame * 1.4) * 3 : 0;
    drawBottom(img[body.look[0]], body.x + shake, FEET, 210);
  }
  ctx.restore();
  ctx.drawImage(img.bg, 0, 318, W, H - 318, 0, 318, W, H - 318);
  for (const slot of S.slots) {
    const body = slot.body;
    if (body && body.state === "wait") drawBubble(body);
  }
}

function drawFood() {
  S.buns.forEach((plate, index) => plate && drawPlate(plate, BUN_SPOTS[index].x, BUN_SPOTS[index].y, "hot_dog"));
  S.bbuns.forEach((plate, index) => plate && drawPlate(plate, BBUN_SPOTS[index].x, BBUN_SPOTS[index].y, "burger"));
  S.dogs.forEach((dog, index) => {
    if (!dog) return;
    if (dog.state === 2) {
      ctx.save();
      ctx.shadowColor = "rgba(255, 214, 60, 0.95)";
      ctx.shadowBlur = 22;
      drawImageW(img.dog2, DOG_SPOTS[index].x, DOG_SPOTS[index].y, 118);
      ctx.restore();
    } else drawImageW(img["dog" + cookVisual(dog.state)], DOG_SPOTS[index].x, DOG_SPOTS[index].y, 118);
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
  S.fries.forEach((ready, index) => ready && drawImageH(img.fries, FRIE_SPOTS[index].x, FRIE_SPOTS[index].y, 48));
  for (const slot of S.slots) {
    if (!slot.cash) continue;
    drawImageH(img.cash, slot.cash.x, slot.cash.y, 64);
    ctx.fillStyle = "#3a2414";
    ctx.font = "700 18px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`$${slot.cash.amount}`, slot.cash.x, slot.cash.y + 6);
  }
  if (has("mustard")) drawImageH(img.bottleM, MUSTARD.x + 36, MUSTARD.y + 70, 120);
  if (has("burger")) {
    drawImageH(img.bbun, BURGER_CRATE.x + 50, BURGER_CRATE.y + 40, 58);
    drawImageH(img.patty0, PATTIES.x + 40, PATTIES.y + 40, 46);
  }
  if (has("onion")) drawImageH(img.onion0, ONION_BIN.x + 46, ONION_BIN.y + 40, 40);
  if (has("lemon")) drawImageH(img.lemonade, LEMON.x + 34, LEMON.y + 60, 90);
  if (has("cola")) drawImageH(img.cola, COLA.x + 34, COLA.y + 60, 90);
  if (S.tool === "ketchup") ring(KETCHUP);
  if (S.tool === "mustard") ring(MUSTARD);
  if (S.tool === "lemonade") ring(LEMON);
  if (S.tool === "cola") ring(COLA);
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
  const y = S.py - 36;
  if (S.hand.kind === "dog") drawImageW(img["dog" + cookVisual(S.hand.state)], x, y, 120);
  else if (S.hand.kind === "patty") drawImageH(img["patty" + cookVisual(S.hand.state)], x, y, 52);
  else if (S.hand.kind === "onion") drawImageH(S.hand.state >= 2 ? img.onion1 : img.onion0, x, y, 40);
  else if (S.hand.kind === "fries") drawImageH(img.fries, x, y, 56);
  else if (S.hand.kind === "plain-bun") drawImageW(img.bun, x, y, 160);
  else if (S.hand.kind === "plain-burger") drawImageH(img.bbun, x, y, 70);
  else if (S.hand.plate) drawPlate(S.hand.plate, x, y, S.hand.kind);
}

function drawToolCursor() {
  if (!S.tool || S.hand) return;
  const icon = S.tool === "ketchup" ? img.ketchup : S.tool === "mustard" ? img.mustard : img[S.tool];
  drawImageH(icon, S.px, S.py - 28, 40);
}

function chip(text, x, y, align) {
  ctx.font = "700 26px Fredoka, Nunito, sans-serif";
  const w = ctx.measureText(text).width + 28;
  const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  roundRect(left, y, w, 40, 14);
  ctx.fillStyle = "rgba(28, 16, 12, 0.72)";
  ctx.fill();
  ctx.fillStyle = "#fff6e8";
  ctx.textAlign = "left";
  ctx.fillText(text, left + 14, y + 28);
}

function drawClock() {
  const pct = S.timeOut ? 0 : 1 - S.frame / DAY_FRAMES;
  const x = 46;
  const y = 40;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fillStyle = "#f6e2c2";
  ctx.fill();
  ctx.strokeStyle = "#3a2416";
  ctx.lineWidth = 3;
  ctx.stroke();
  const hour = ((-70 + (1 - pct) * 230) * Math.PI) / 180;
  const minute = ((1 - pct) * Math.PI * 2) - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(hour) * 10, y + Math.sin(hour) * 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(minute) * 16, y + Math.sin(minute) * 16);
  ctx.stroke();
}

function drawHud() {
  drawClock();
  const level = levelAt(S.level);
  chip(`${dayLabel(S.level)} · ${PLACES[level.loc]} · Goal $${level.goal}`, W / 2, 12, "center");
  chip(`$${S.score}`, 1160, 12, "right");
  const meterX = 1040;
  roundRect(meterX, 62, 150, 14, 7);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  roundRect(meterX, 62, 150 * S.meter, 14, 7);
  ctx.fillStyle = S.meter > 0.55 ? "#3ecf6e" : S.meter > 0.3 ? "#e2c14a" : "#d23b3b";
  ctx.fill();
  roundRect(PAUSE.x, PAUSE.y, PAUSE.w, PAUSE.h, 14);
  ctx.fillStyle = "rgba(28,16,12,0.72)";
  ctx.fill();
  ctx.fillStyle = "#fff6e8";
  ctx.font = "700 22px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(S.paused ? "►" : "II", PAUSE.x + 26, PAUSE.y + 34);
  const line = S.tip < TIPS.length ? TIPS[S.tip] : HINTS[S.hint % HINTS.length];
  if (line && !S.banner) {
    ctx.font = "700 20px Nunito, sans-serif";
    const tw = ctx.measureText(line).width + 36;
    roundRect((W - tw) / 2, 668, tw, 40, 14);
    ctx.fillStyle = "rgba(28,16,12,0.78)";
    ctx.fill();
    ctx.fillStyle = "#fff6e8";
    ctx.textAlign = "center";
    ctx.fillText(line, W / 2, 695);
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
  roundRect(280, 220, 720, 250, 24);
  ctx.fillStyle = "#fff8ee";
  ctx.fill();
  ctx.fillStyle = "#3a2416";
  ctx.textAlign = "center";
  ctx.font = "700 40px Fredoka, Nunito, sans-serif";
  ctx.fillText(S.banner.title, W / 2, 300);
  ctx.font = "700 26px Nunito, sans-serif";
  ctx.fillText(S.banner.body, W / 2, 360);
  roundRect(490, 390, 300, 56, 16);
  ctx.fillStyle = "#c0392b";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText("Let's cook", W / 2, 426);
}

function drawTitle() {
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
  for (const rect of [CRATE, SAUSAGES, KETCHUP, TRASH, FRYER, MUSTARD, PATTIES, BURGER_CRATE, ONION_BIN, LEMON, COLA]) {
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

function frame(now) {
  if (!last) last = now;
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= 1000 / 30) {
    sim();
    acc -= 1000 / 30;
  }
  ctx.clearRect(0, 0, W, H);
  if (S.screen === "title") drawTitle();
  else if (S.screen === "end") drawEnd();
  else {
    ctx.drawImage(img.bg, 0, 0, W, H);
    drawPeople();
    drawFood();
    drawHand();
    drawToolCursor();
    drawHud();
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
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointerdown", onDown);
canvas.addEventListener("pointermove", onMove);
canvas.addEventListener("pointerup", onUp);
canvas.addEventListener("pointercancel", onUp);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());

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
    gesture = { x: x1, y: y1, moved: false, hadHand: !!S.hand };
    const hit = pickDraggable(x1, y1);
    if (hit) lift(hit);
    dropAt(x2, y2);
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
  step(n) { for (let i = 0; i < n; i++) sim(); },
  snapshot() {
    return {
      score: S.score,
      screen: S.screen,
      buns: S.buns.map((bun) => (bun ? { ...bun } : null)),
      dogs: S.dogs.map((dog) => (dog ? { state: dog.state, left: dog.left } : null)),
      crowd: S.crowd,
      bodies: S.slots.map((slot) => (slot.body ? { type: slot.body.type, state: slot.body.state, items: slot.body.items, ketchup: slot.body.order.ketchup, snack: slot.body.order.snack } : null)),
      cash: S.slots.map((slot) => (slot.cash ? slot.cash.amount : 0)),
    };
  },
};
