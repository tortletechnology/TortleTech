import assert from "node:assert/strict";
import test from "node:test";
import { PRESIDENTS } from "./data.js";
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

test("topping order does not matter and extras fail", () => {
  assert.equal(sameSet(["ketchup", "mustard"], ["mustard", "ketchup"]), true);
  assert.equal(sameSet(["ketchup"], ["ketchup", "onion"]), false);
  assert.equal(sameSet([], []), true);
});

test("plain, wrong, burnt, and urgent serves", () => {
  const orders = [
    { id: 1, toppings: [], patience: 20, maxPatience: 30 },
    { id: 2, toppings: [], patience: 5, maxPatience: 30 },
  ];
  const cooked = { kind: "dog", state: "cooked", toppings: [] };
  const hit = evaluateServe(orders, cooked);
  assert.equal(hit.ok, true);
  assert.equal(hit.order.id, 2);
  const wrong = evaluateServe(orders, { kind: "dog", state: "cooked", toppings: ["ketchup"] });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "wrong");
  assert.equal(evaluateServe(orders, { kind: "dog", state: "burnt", toppings: [] }).reason, "burnt");
  assert.equal(evaluateServe([], cooked).reason, "nobody");
  assert.equal(evaluateServe(orders, null).reason, "invalid");
});

test("combo multiplies a perfect plain dog", () => {
  const order = { toppings: [], patience: 30, maxPatience: 30 };
  const once = scoreServe(order, 1);
  const triple = scoreServe(order, 3);
  assert.equal(once.perfect, true);
  assert.equal(triple.total, once.total * 3);
  assert.ok(scoreServe({ toppings: ["ketchup"], patience: 1, maxPatience: 30 }, 1).total > 100);
});

test("stars use the shift targets", () => {
  const cfg = shiftConfig(1);
  assert.ok(cfg.oneStar < cfg.twoStar && cfg.twoStar < cfg.threeStar);
  assert.equal(starsFor(cfg.oneStar - 1, 1), 0);
  assert.equal(starsFor(cfg.oneStar, 1), 1);
  assert.equal(starsFor(cfg.twoStar, 1), 2);
  assert.equal(starsFor(cfg.threeStar, 1), 3);
  assert.equal(shiftConfig(1).name, "Lunch rush");
  assert.equal(shiftConfig(9).name, "Term 9");
});

test("orders stay inside the topping cap", () => {
  const alwaysHigh = () => 0.99;
  for (let shift = 1; shift <= 5; shift += 1) {
    const cap = shiftConfig(shift).maxToppings;
    for (let n = 0; n < 20; n += 1) {
      const order = makeOrder(shift, alwaysHigh);
      assert.ok(order.toppings.length <= cap);
      assert.equal(new Set(order.toppings).size, order.toppings.length);
    }
  }
  assert.deepEqual(makeOrder(4, Math.random, { forcePlain: true }).toppings, []);
  assert.equal(orderTitle([]), "Plain dog");
  assert.equal(orderTitle(TOPPINGS.map((topping) => topping.id)), "The Works");
});

test("every station can be reached from the walkway", () => {
  for (const station of LAYOUT.stations) {
    const x = clamp(station.x, LAYOUT.bounds.minX, LAYOUT.bounds.maxX);
    const z = clamp(station.z, LAYOUT.bounds.minZ, LAYOUT.bounds.maxZ);
    const dist = Math.hypot(x - station.x, z - station.z);
    assert.ok(dist <= LAYOUT.reach, `${station.id} is ${dist} away`);
  }
  assert.equal(LAYOUT.mats.length, 3);
  assert.equal(LAYOUT.grillSlots.length, 4);
});

test("the roster leads with a funny George and stays cosmetic-only", () => {
  assert.ok(PRESIDENTS.length >= 8);
  assert.equal(PRESIDENTS[0].id, "bush");
  assert.ok(PRESIDENTS[0].earScale >= 1.6);
  const ids = new Set();
  for (const president of PRESIDENTS) {
    assert.equal(ids.has(president.id), false);
    ids.add(president.id);
    assert.ok(president.name && president.short && president.epithet && president.blurb);
    assert.ok(president.apronWord && president.pin && president.accent);
    for (const kind of ["start", "serve", "fail", "burn", "win", "rally"]) {
      assert.ok(president.quips[kind].length >= 1, `${president.id} ${kind}`);
    }
  }
});
