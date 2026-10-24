export const TOPPINGS = [
  { id: "ketchup", name: "Ketchup", short: "Ketch", letter: "K", color: "#d3262b" },
  { id: "mustard", name: "Mustard", short: "Mustard", letter: "M", color: "#e2b31f" },
  { id: "relish", name: "Relish", short: "Relish", letter: "R", color: "#2f9e44" },
  { id: "onion", name: "Onion", short: "Onion", letter: "O", color: "#f3e6c8" },
];

const SHIFT_NAMES = [
  "Lunch rush",
  "After-school",
  "Dinner service",
  "Late night",
  "State dinner",
  "Inauguration lunch",
  "Weekend crush",
  "Overtime",
];

export function shiftConfig(shift) {
  const s = Math.max(1, Math.floor(Number(shift) || 1));
  const twoStar = 520 + (s - 1) * 300;
  return {
    shift: s,
    name: SHIFT_NAMES[s - 1] || `Term ${s}`,
    duration: 70 + Math.min(22, (s - 1) * 3),
    patience: Math.max(13, 33 - (s - 1) * 2.15),
    spawnEvery: Math.max(3.5, 7.6 - (s - 1) * 0.45),
    maxOrders: s <= 1 ? 2 : 3,
    maxToppings: s <= 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : 4,
    twoStar,
    threeStar: Math.round(twoStar * 1.7),
    oneStar: Math.round(twoStar * 0.42),
  };
}

export function starsFor(score, shift) {
  const cfg = shiftConfig(shift);
  if (score >= cfg.threeStar) return 3;
  if (score >= cfg.twoStar) return 2;
  if (score >= cfg.oneStar) return 1;
  return 0;
}

export function sameSet(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const seen = new Set(a);
  if (seen.size !== a.length) return false;
  return b.every((item) => seen.has(item));
}

export function orderTitle(toppings) {
  if (!toppings.length) return "Plain dog";
  if (toppings.length === TOPPINGS.length) return "The Works";
  return toppings
    .map((id) => TOPPINGS.find((topping) => topping.id === id)?.name || id)
    .join(" · ");
}

export function mostUrgent(orders) {
  let best = null;
  let bestRatio = Infinity;
  for (const order of orders) {
    const ratio = order.maxPatience > 0 ? order.patience / order.maxPatience : 0;
    if (ratio < bestRatio - 1e-9) {
      best = order;
      bestRatio = ratio;
    }
  }
  return best;
}

export function evaluateServe(orders, item) {
  if (!item || item.kind !== "dog") return { ok: false, reason: "invalid" };
  if (item.state === "burnt") return { ok: false, reason: "burnt" };
  if (item.state !== "cooked") return { ok: false, reason: "raw" };
  if (!orders.length) return { ok: false, reason: "nobody" };
  const matches = orders.filter((order) => sameSet(order.toppings, item.toppings));
  if (!matches.length) return { ok: false, reason: "wrong", order: mostUrgent(orders) };
  return { ok: true, order: mostUrgent(matches) };
}

export function scoreServe(order, combo) {
  const ratio = Math.max(0, Math.min(1, order.patience / order.maxPatience));
  const base = 100 + order.toppings.length * 45;
  const tip = Math.round(ratio * 90);
  const mult = Math.max(1, combo | 0);
  return {
    total: (base + tip) * mult,
    base,
    tip,
    mult,
    perfect: ratio >= 0.75,
  };
}

export function makeOrder(shift, rng = Math.random, opts = {}) {
  const cfg = shiftConfig(shift);
  const cap = Math.max(0, Math.min(TOPPINGS.length, opts.maxToppings ?? cfg.maxToppings));
  let count = opts.forcePlain ? 0 : Math.floor(rng() * (cap + 1));
  count = Math.max(0, Math.min(cap, count));
  const pool = TOPPINGS.map((topping) => topping.id);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = pool[i];
    pool[i] = pool[j];
    pool[j] = swap;
  }
  const patience = opts.patience ?? cfg.patience;
  return {
    toppings: pool.slice(0, count),
    patience,
    maxPatience: patience,
  };
}
