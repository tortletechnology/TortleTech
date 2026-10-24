// Career rules matched to the original hot-dog stand:
// 30 frames a second, prices, cook marks, patience, and the bill formula.

export const FPS = 30;
export const DAY_FRAMES = 120 * FPS;
export const SERVE_FRAMES = 1000;
export const COOK = { dog: 470, burger: 500, onion: 320, fries: 210 };
export const PRICE = {
  hotdog: 15,
  burger: 20,
  ketchup: 2,
  mustard: 3,
  relish: 2,
  onion: 4,
  fries: 10,
  cola: 7,
  lemonade: 7,
};
export const PENALTY = { hotdog: 7, burger: 13, onion: 1, mood: 3 };
export const SAT = { ingredient: 0.05, state: 0.05, perfect: 0.15, scale: 0.2 };

export const PEOPLE = {
  oldwoman: { wait: 1.1, cheat: 0.1, tip: 0 },
  oldman: { wait: 1.1, cheat: 0.05, tip: 0.1 },
  hiphop_man: { wait: 1.1, cheat: 0.1, tip: 0.1 },
  worker: { wait: 1.1, cheat: 0.05, tip: 0.2 },
  generic_woman: { wait: 1.1, cheat: 0, tip: 0.2 },
  generic_man: { wait: 1.1, cheat: 0.05, tip: 0.1 },
  business_man: { wait: 1.1, cheat: 0.15, tip: 0.3 },
  business_woman: { wait: 1.1, cheat: 0.1, tip: 0.1 },
  boy: { wait: 1.1, cheat: 0.15, tip: 0 },
  girl: { wait: 1.1, cheat: 0.05, tip: 0.1 },
  tourist: { wait: 1.1, cheat: 0.1, tip: 0.2 },
  tourist_girl: { wait: 1.1, cheat: 0, tip: 0.1 },
  mafia_man: { wait: 1.1, cheat: 0.15, tip: 0 },
  driver: { wait: 1.1, cheat: 0.05, tip: 0.1 },
  policeman: { wait: 1.1, cheat: 0.05, tip: 0.1 },
  bum: { wait: 1.1, cheat: 0.1, tip: 0 },
  alien: { wait: 1.1, cheat: 0.15, tip: 0 },
  sportsman: { wait: 1.1, cheat: 0.1, tip: 0.1 },
  sportswoman: { wait: 1.1, cheat: 0.05, tip: 0.2 },
  mascot: { wait: 1.1, cheat: 0.05, tip: 0.1 },
};

const C = (goal, appear, wait, cheat, loc, cast) => ({ goal, appear, wait, cheat, loc, cast });

export const LEVELS = [
  C(150, 100, 900, false, "bronx", ["oldwoman", "hiphop_man", "generic_woman", "generic_man", "bum"]),
  C(175, 95, 880, false, "bronx", ["oldwoman", "oldman", "worker", "mafia_man", "policeman"]),
  C(200, 90, 870, true, "bronx", ["hiphop_man", "generic_woman", "generic_man", "driver", "bum"]),
  C(225, 90, 860, false, "bronx", ["oldman", "generic_woman", "boy", "mafia_man", "policeman"]),
  C(250, 90, 850, true, "bronx", ["oldwoman", "hiphop_man", "worker", "generic_woman", "mafia_man"]),
  C(290, 89, 847, false, "yankees_stadium", ["oldman", "generic_woman", "boy", "tourist", "mascot"]),
  C(300, 88, 847, false, "yankees_stadium", ["hiphop_man", "generic_man", "tourist_girl", "policeman", "sportsman"]),
  C(310, 87, 847, true, "yankees_stadium", ["oldman", "worker", "generic_woman", "girl", "sportswoman"]),
  C(320, 86, 845, false, "yankees_stadium", ["oldwoman", "generic_man", "boy", "tourist_girl", "mascot"]),
  C(330, 86, 843, true, "yankees_stadium", ["hiphop_man", "worker", "generic_man", "boy", "girl"]),
  C(350, 85, 843, false, "central_park", ["oldman", "tourist", "tourist_girl", "sportsman", "sportswoman"]),
  C(360, 85, 840, true, "central_park", ["oldwoman", "generic_woman", "boy", "girl", "policeman"]),
  C(370, 83, 837, false, "central_park", ["hiphop_man", "tourist", "tourist_girl", "bum", "sportswoman"]),
  C(380, 83, 837, true, "central_park", ["oldwoman", "oldman", "boy", "girl", "sportsman"]),
  C(390, 82, 835, true, "central_park", ["oldman", "generic_woman", "girl", "tourist", "sportswoman"]),
  C(410, 80, 835, true, "times_square", ["generic_man", "tourist", "tourist_girl", "driver", "bum"]),
  C(415, 80, 833, true, "times_square", ["worker", "generic_woman", "business_woman", "girl", "tourist"]),
  C(420, 80, 830, false, "times_square", ["oldwoman", "hiphop_man", "business_man", "tourist_girl", "policeman"]),
  C(425, 75, 830, true, "times_square", ["generic_woman", "boy", "girl", "tourist", "policeman"]),
  C(430, 75, 830, true, "times_square", ["oldman", "generic_woman", "generic_man", "business_woman", "tourist_girl"]),
  C(435, 74, 830, true, "wall_street", ["worker", "generic_man", "business_man", "business_woman", "policeman"]),
  C(440, 73, 829, true, "wall_street", ["oldman", "generic_woman", "business_woman", "mafia_man", "driver"]),
  C(445, 73, 829, true, "wall_street", ["oldman", "worker", "generic_woman", "business_man", "bum"]),
  C(450, 73, 828, true, "wall_street", ["worker", "business_man", "business_woman", "tourist", "policeman"]),
  C(455, 72, 827, true, "wall_street", ["oldman", "generic_woman", "generic_man", "business_man", "driver"]),
  C(460, 70, 820, true, "alien_ship", ["generic_woman", "boy", "tourist", "alien", "mascot"]),
  C(475, 60, 800, true, "alien_ship", ["generic_woman", "boy", "alien", "mascot"]),
  C(490, 50, 750, true, "alien_ship", ["generic_woman", "alien", "mascot"]),
  C(505, 50, 700, true, "alien_ship", ["alien", "mascot"]),
  C(520, 40, 700, true, "alien_ship", ["alien"]),
];

const M = (fries, onion, drink, sauce, snack) => ({ fries, onion, drink, sauce, snack });
export const MENUS = [
  M(0, false, "none", "ketchup", "hot_dog"),
  M(0, false, "lemonade", "ketchup", "hot_dog"),
  M(1, false, "lemonade", "ketchup", "hot_dog"),
  M(1, false, "lemonade", "ketchup", "both"),
  M(1, false, "lemonade", "ketchup", "both"),
  M(1, false, "lemonade", "ketchup", "both"),
  M(1, true, "lemonade", "ketchup", "both"),
  M(1, true, "lemonade", "ketchup", "both"),
  M(1, true, "both", "ketchup", "both"),
  M(1, true, "both", "ketchup", "both"),
  M(1, true, "both", "ketchup", "both"),
  M(1, true, "both", "both", "both"),
  M(1, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(2, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
  M(3, true, "both", "both", "both"),
];

export const NEW_ITEM = {
  2: "Lemonade",
  3: "Fries",
  4: "Burgers",
  7: "Onions",
  9: "Cola",
  12: "Mustard",
};

export const PLACES = {
  bronx: "The Bronx",
  yankees_stadium: "Yankees Stadium",
  central_park: "Central Park",
  times_square: "Times Square",
  wall_street: "Wall Street",
  alien_ship: "The Alien Ship",
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function levelAt(n) {
  const i = Math.min(LEVELS.length, Math.max(1, n)) - 1;
  return LEVELS[i];
}

export function menuAt(n) {
  const i = Math.min(MENUS.length, Math.max(1, n)) - 1;
  return MENUS[i];
}

export function dayLabel(n) {
  return DAYS[(n - 1) % 5];
}

export function cookMarks(total) {
  const step = Math.floor(total / 5);
  const counts = [0, 1, 2, 3, 4].map((i) => i * step).reverse();
  counts.splice(2, 1);
  return counts;
}

export function advanceCook(remaining, state, marks) {
  if (remaining <= 0) return { remaining: 0, state, burnt: false, ready: false };
  remaining -= 1;
  let burnt = false;
  let ready = false;
  if (state < marks.length && remaining === marks[state]) {
    state += 1;
    burnt = state === 3;
    ready = state === 2;
  }
  return { remaining, state, burnt, ready };
}

export function patienceMarks(waiting) {
  const step = Math.floor(waiting / 4);
  return [0, 1, 2, 3].map((i) => i * step).reverse();
}

export function tickPatience(counter, sat, marks) {
  counter -= 1;
  let angry = false;
  if (counter > 0 && sat < marks.length && counter === marks[sat]) {
    sat += 1;
    angry = sat === 3;
  }
  return { counter, sat, angry, leave: counter <= 0 };
}

export function easePatience(sat, marks, waiting) {
  if (sat === 0) return { sat: 0, counter: waiting };
  sat -= 1;
  return { sat, counter: sat > 0 ? marks[sat - 1] : waiting };
}

export function waitingFor(type, base) {
  const mult = (PEOPLE[type] || { wait: 1.1 }).wait;
  return Math.floor(base * mult);
}

export function rollOrder(menu, rng) {
  const order = { snack: "hot_dog", ketchup: 0, mustard: 0, relish: 0, onion: 0, fries: 0, drink: null, items: 1 };
  if (menu.snack === "burger") order.snack = "burger";
  else if (menu.snack === "both") order.snack = rng() < 0.5 ? "hot_dog" : "burger";
  if (rng() < 0.7) {
    if (menu.sauce === "ketchup") order.ketchup = 1;
    else if (menu.sauce === "mustard") order.mustard = 1;
    else if (menu.sauce === "both") {
      const r = rng();
      if (r < 0.33) order.ketchup = 1;
      else if (r < 0.66) order.mustard = 1;
      else {
        order.ketchup = 1;
        order.mustard = 1;
      }
    }
  }
  if (menu.onion && rng() < 0.5) order.onion = 1;
  if (rng() < 0.7 && menu.fries > 0) order.fries = Math.floor(rng() * (menu.fries + 1));
  if (rng() < 0.7) {
    if (menu.drink === "lemonade") order.drink = "lemonade";
    else if (menu.drink === "cola") order.drink = "cola";
    else if (menu.drink === "both") order.drink = rng() < 0.5 ? "lemonade" : "cola";
  }
  if (rng() < 0.45) order.relish = 1;
  if (!order.mustard && rng() < 0.4) order.mustard = 1;
  if (!order.onion && rng() < 0.4) order.onion = 1;
  order.items = 1 + order.fries + (order.drink ? 1 : 0);
  return order;
}

function sauceScore(wanted, has, price) {
  if (wanted) {
    if (has) return { price, sat: SAT.ingredient, perfect: true };
    return { price: 0, sat: -SAT.ingredient, perfect: false };
  }
  if (has) return { price: 0, sat: -SAT.ingredient, perfect: false };
  return { price: 0, sat: 0, perfect: true };
}

export function quoteSnack(order, item) {
  const kind = item.kind;
  if (order.snack !== kind) return { ok: false };
  const meat = (item.sausage || 0) + (item.burger || 0);
  if (meat <= 0) return { ok: false };
  let price = 0;
  let sat = 0;
  let perfect = true;
  const mustard = sauceScore(order.mustard, item.mustard, PRICE.mustard);
  const ketchup = sauceScore(order.ketchup, item.ketchup, PRICE.ketchup);
  const relish = sauceScore(order.relish, item.relish, PRICE.relish);
  price += mustard.price + ketchup.price + relish.price;
  sat += mustard.sat + ketchup.sat + relish.sat;
  perfect = perfect && mustard.perfect && ketchup.perfect && relish.perfect;
  if (order.onion) {
    if (item.onion > 0) {
      const off = Math.abs(item.onion - 3);
      price += PRICE.onion - off * PENALTY.onion;
      sat += SAT.ingredient - off * SAT.ingredient;
      if (item.onion !== 3) perfect = false;
    } else {
      sat -= SAT.ingredient;
      perfect = false;
    }
  } else if (item.onion > 0) {
    sat -= SAT.ingredient;
    perfect = false;
  }
  if (kind === "hot_dog") {
    const off = Math.abs(item.sausage - 3);
    price += PRICE.hotdog - off * PENALTY.hotdog;
    sat += SAT.ingredient - off * SAT.ingredient;
    if (item.sausage !== 3) perfect = false;
  } else {
    const off = Math.abs(item.burger - 3);
    price += PRICE.burger - off * PENALTY.burger;
    sat += SAT.ingredient - off * SAT.ingredient;
    if (item.burger !== 3) perfect = false;
  }
  return { ok: true, price, sat, perfect };
}

export function finalizeBill(price, sat, perfect, tip, mood) {
  if (perfect) {
    price = Math.floor(price * (1 + tip));
    sat += SAT.perfect;
  }
  sat -= SAT.state;
  price -= mood * PENALTY.mood;
  if (price < 1) price = 1;
  return { price, sat };
}

export function applyMeter(meter, delta) {
  return Math.max(0, Math.min(1, meter + delta * SAT.scale));
}

export function nextCrowd(current, good) {
  return Math.max(1, Math.min(5, current + (good ? 1 : -1)));
}

export function trashCost(item) {
  if (!item) return 0;
  if (item.kind === "hot_dog" || item.kind === "burger") {
    let n = 1;
    if (item.sausage) n += 2;
    if (item.burger) n += 2;
    if (item.onion) n += 1;
    return n;
  }
  if (item.kind === "dog" || item.kind === "patty") return 2;
  if (item.kind === "onion" || item.kind === "fries") return 1;
  if (item.kind === "plain-bun" || item.kind === "plain-burger") return 1;
  return 0;
}

export function offerFries(order) {
  if (!order || order.fries <= 0) return { ok: false };
  return { ok: true, price: PRICE.fries, sat: SAT.ingredient, fries: order.fries - 1 };
}

export function offerDrink(order, kind) {
  if (!order || order.drink !== kind) return { ok: false };
  const price = kind === "cola" ? PRICE.cola : PRICE.lemonade;
  return { ok: true, price, sat: SAT.ingredient };
}
