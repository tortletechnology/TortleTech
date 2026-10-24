import assert from "node:assert/strict";
import test from "node:test";
import {
  COOK,
  advanceCook,
  applyMeter,
  cookMarks,
  easePatience,
  finalizeBill,
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

test("sausage cook marks and the golden window", () => {
  const marks = cookMarks(COOK.dog);
  assert.deepEqual(marks, [376, 282, 94, 0]);
  let remaining = COOK.dog;
  let state = 0;
  const hits = {};
  for (let i = 0; i < COOK.dog; i++) {
    const next = advanceCook(remaining, state, marks);
    if (next.state !== state) hits[next.state] = next.remaining;
    remaining = next.remaining;
    state = next.state;
  }
  assert.equal(hits[1], 376);
  assert.equal(hits[2], 282);
  assert.equal(hits[3], 94);
  assert.equal(hits[4], 0);
  assert.equal(state, 4);
});

test("patience quarters and the angry face", () => {
  const wait = waitingFor("oldwoman", 900);
  assert.equal(wait, 990);
  const marks = patienceMarks(wait);
  assert.deepEqual(marks, [741, 494, 247, 0]);
  let counter = wait;
  let sat = 0;
  let angryAt = null;
  while (counter > 0) {
    const next = tickPatience(counter, sat, marks);
    if (next.angry) angryAt = next.counter;
    counter = next.counter;
    sat = next.sat;
    if (next.leave) break;
  }
  assert.equal(angryAt, 247);
  assert.equal(sat, 3);
  assert.equal(counter, 0);
});

test("relish and mustard change the bill the same way ketchup does", () => {
  const order = { snack: "hot_dog", ketchup: 0, mustard: 1, relish: 1, onion: 0 };
  const dressed = quoteSnack(order, { kind: "hot_dog", sausage: 3, ketchup: 0, mustard: 1, relish: 1, onion: 0 });
  assert.equal(dressed.perfect, true);
  assert.equal(dressed.price, 20);
  const bare = quoteSnack(order, { kind: "hot_dog", sausage: 3, ketchup: 0, mustard: 0, relish: 0, onion: 0 });
  assert.equal(bare.perfect, false);
  assert.equal(bare.price, 15);
});

test("a perfect ketchup dog pays 17 before the tip", () => {
  const order = { snack: "hot_dog", ketchup: 1, mustard: 0, onion: 0, fries: 0, drink: null, items: 1 };
  const quote = quoteSnack(order, { kind: "hot_dog", sausage: 3, burger: 0, ketchup: 1, mustard: 0, onion: 0 });
  assert.equal(quote.ok, true);
  assert.equal(quote.perfect, true);
  assert.equal(quote.price, 17);
  const bill = finalizeBill(quote.price, quote.sat, true, 0, 0);
  assert.equal(bill.price, 17);
  const tipped = finalizeBill(quote.price, quote.sat, true, 0.2, 0);
  assert.equal(tipped.price, 20);
});

test("raw, burnt, missing ketchup, and an angry face pay less", () => {
  const order = { snack: "hot_dog", ketchup: 1, mustard: 0, onion: 0 };
  const raw = quoteSnack(order, { kind: "hot_dog", sausage: 1, ketchup: 1, mustard: 0, onion: 0 });
  assert.equal(raw.perfect, false);
  assert.equal(raw.price, 3);
  const burnt = quoteSnack(order, { kind: "hot_dog", sausage: 4, ketchup: 1, mustard: 0, onion: 0 });
  assert.equal(burnt.price, 10);
  const plain = quoteSnack(order, { kind: "hot_dog", sausage: 3, ketchup: 0, mustard: 0, onion: 0 });
  assert.equal(plain.perfect, false);
  assert.equal(plain.price, 15);
  const angry = finalizeBill(plain.price, plain.sat, false, 0, 3);
  assert.equal(angry.price, 6);
  const wiped = applyMeter(0.5, -3 * 3);
  assert.equal(wiped, 0);
});

test("a burger is refused by a hot-dog order and an empty bun is refused", () => {
  const order = { snack: "hot_dog", ketchup: 0, mustard: 0, onion: 0 };
  assert.equal(quoteSnack(order, { kind: "burger", burger: 3, sausage: 0, ketchup: 0, mustard: 0, onion: 0 }).ok, false);
  assert.equal(quoteSnack(order, { kind: "hot_dog", sausage: 0, burger: 0, ketchup: 0, mustard: 0, onion: 0 }).ok, false);
});

test("Monday orders are hot dogs and sometimes ketchup", () => {
  const menu = menuAt(1);
  const withSauce = rollOrder(menu, () => 0.1);
  assert.equal(withSauce.snack, "hot_dog");
  assert.equal(withSauce.ketchup, 1);
  assert.equal(withSauce.fries, 0);
  assert.equal(withSauce.drink, null);
  assert.equal(withSauce.items, 1);
  const plain = rollOrder(menu, () => 0.95);
  assert.equal(plain.ketchup, 0);
});

test("later menus add fries, a drink, and both snacks", () => {
  const rolls = [0.1, 0.1, 0.9, 0.1];
  let n = 0;
  const fries = rollOrder(menuAt(3), () => rolls[n++]);
  assert.equal(fries.drink, "lemonade");
  assert.equal(fries.fries, 1);
  assert.equal(fries.items, 3);
  let snackRoll = 0;
  const both = rollOrder(menuAt(4), () => {
    snackRoll += 1;
    return snackRoll === 1 ? 0.8 : 0.1;
  });
  assert.equal(both.snack, "burger");
  assert.equal(offerFries({ fries: 1 }).price, 10);
  assert.equal(offerDrink({ drink: "cola" }, "lemonade").ok, false);
  assert.equal(offerDrink({ drink: "lemonade" }, "lemonade").price, 7);
});

test("trash adds the bun and whatever is on it", () => {
  assert.equal(trashCost({ kind: "dog" }), 2);
  assert.equal(trashCost({ kind: "hot_dog", sausage: 3, burger: 0, onion: 0 }), 3);
  assert.equal(trashCost({ kind: "burger", sausage: 0, burger: 3, onion: 2 }), 4);
  assert.equal(trashCost({ kind: "plain-bun" }), 1);
});

test("a partial serve calms the customer and the line grows or shrinks", () => {
  const marks = patienceMarks(900);
  assert.deepEqual(easePatience(0, marks, 900), { sat: 0, counter: 900 });
  assert.deepEqual(easePatience(2, marks, 900), { sat: 1, counter: 675 });
  assert.equal(nextCrowd(2, true), 3);
  assert.equal(nextCrowd(1, false), 1);
  assert.equal(nextCrowd(5, true), 5);
});
