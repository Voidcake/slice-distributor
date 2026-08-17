import assert from "node:assert/strict";
import test from "node:test";

import { BATCH_CAPACITY, createBatch, distributeToOvens, type Order } from "./orders.ts";

function order(
  orderNumber: string,
  slices: Partial<Pick<Order, "margherita" | "piccante" | "marinara">>,
  status: Order["status"] = "OPEN",
): Order {
  return {
    id: orderNumber,
    orderNumber,
    margherita: 0,
    piccante: 0,
    marinara: 0,
    status,
    ...slices,
  };
}

test("creates a FIFO batch without exceeding capacity", () => {
  const batch = createBatch([
    order("001", { margherita: 8 }),
    order("002", { piccante: 8 }),
    order("003", { marinara: 1 }),
  ]);

  assert.deepEqual(batch?.orderNumbers, ["001", "002"]);
  assert.equal(batch?.totalSlices, BATCH_CAPACITY);
});

test("ignores processed orders", () => {
  const batch = createBatch([
    order("001", { margherita: 4 }, "PROCESSED"),
    order("002", { marinara: 3 }),
  ]);

  assert.deepEqual(batch?.orderNumbers, ["002"]);
});

test("keeps each oven at or below its capacity", () => {
  const ovens = distributeToOvens({ margherita: 7, piccante: 5, marinara: 4 });

  for (const oven of ovens) {
    const total = Object.values(oven).reduce((sum, slices) => sum + slices, 0);
    assert.ok(total <= 8);
  }
});

test("rejects a legacy order that cannot fit in one batch", () => {
  assert.throws(
    () => createBatch([order("001", { margherita: BATCH_CAPACITY + 1 })]),
    /exceeds the 16-slice batch capacity/,
  );
});

test("returns null when no open orders exist", () => {
  assert.equal(createBatch([order("001", { margherita: 2 }, "PROCESSED")]), null);
});
