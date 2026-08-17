export const PIZZA_TYPES = ["margherita", "piccante", "marinara"] as const;
export const OVEN_CAPACITY = 8;
export const BATCH_CAPACITY = OVEN_CAPACITY * 2;

export type PizzaType = (typeof PIZZA_TYPES)[number];
export type OrderStatus = "OPEN" | "PROCESSED";

export interface Order {
  id: string | number;
  orderNumber: string;
  margherita: number;
  piccante: number;
  marinara: number;
  status: OrderStatus;
}

export interface OrderRow {
  id: string | number;
  order_number: string;
  slices_margherita: number | null;
  slices_piccante: number | null;
  slices_marinara: number | null;
  status: OrderStatus;
}

export interface Batch {
  orderNumbers: string[];
  slicesByType: Record<string, number>;
  totalSlices: number;
  ovenDistribution: [Record<string, number>, Record<string, number>];
  orders: Order[];
}

export function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    margherita: row.slices_margherita ?? 0,
    piccante: row.slices_piccante ?? 0,
    marinara: row.slices_marinara ?? 0,
    status: row.status,
  };
}

export function countOrderSlices(order: Order): number {
  return PIZZA_TYPES.reduce((total, type) => total + order[type], 0);
}

export function distributeToOvens(
  slicesByType: Record<PizzaType, number>,
): [Record<string, number>, Record<string, number>] {
  const ovens: [Record<string, number>, Record<string, number>] = [{}, {}];
  const ovenTotals = [0, 0];

  for (const [type, count] of Object.entries(slicesByType).sort((a, b) => b[1] - a[1])) {
    let remaining = count;

    for (let ovenIndex = 0; ovenIndex < ovens.length && remaining > 0; ovenIndex += 1) {
      const available = OVEN_CAPACITY - ovenTotals[ovenIndex];
      const assigned = Math.min(available, remaining);

      if (assigned > 0) {
        ovens[ovenIndex][type] = assigned;
        ovenTotals[ovenIndex] += assigned;
        remaining -= assigned;
      }
    }
  }

  return ovens;
}

export function createBatch(orders: Order[]): Batch | null {
  const batchOrders: Order[] = [];
  const slices = { margherita: 0, piccante: 0, marinara: 0 };
  let totalSlices = 0;

  for (const order of orders.filter(({ status }) => status === "OPEN")) {
    const orderSlices = countOrderSlices(order);

    if (orderSlices > BATCH_CAPACITY) {
      throw new Error(`Order ${order.orderNumber} exceeds the ${BATCH_CAPACITY}-slice batch capacity.`);
    }

    if (totalSlices + orderSlices > BATCH_CAPACITY) break;

    batchOrders.push(order);
    totalSlices += orderSlices;
    for (const type of PIZZA_TYPES) slices[type] += order[type];
  }

  if (batchOrders.length === 0) return null;

  return {
    orderNumbers: batchOrders.map(({ orderNumber }) => orderNumber),
    slicesByType: Object.fromEntries(
      PIZZA_TYPES.map((type) => [`${type[0].toUpperCase()}${type.slice(1)}`, slices[type]]),
    ),
    totalSlices,
    ovenDistribution: distributeToOvens(slices),
    orders: batchOrders,
  };
}
