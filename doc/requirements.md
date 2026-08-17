# Historical Product Exploration — Pizza Pop-up 🍕

> **Status: reference only — not the implementation plan.**
>
> This document records an earlier, broader exploration of a complete pizza-pop-up operations platform. The repository's intentionally smaller scope is authenticated slice-order entry and capacity-aware reheat batching. Inventory, full-pie ordering, baking, topping and sold-out management, configurable oven infrastructure, and operational analytics are **not implemented and not planned for this repository**. Normative language such as “must” and “should” below describes the explored product concept, not commitments or incomplete work.

## Implemented repository scope

- Authenticated access
- Slice-order creation and management
- A live POS order view
- Reheat batching for the current fixed two-oven setup
- Reheat batch progression and history

Everything else in this document is retained only to show the product-thinking process that preceded the narrower MVP decision.

## 1. Context

Fast-paced pizza pop-up selling pizza slices and full pies.

Pizzas are pre-baked and held in inventory. Slice orders are reheated shortly before serving. Full-pie orders are served as whole pies and bypass the reheat station.

The system supports POS order intake, inventory tracking, bake planning, reheat batching, sold-out handling, and basic operational stats.

## 2. Core Goals

The system should:

- Keep pizza inventory near target levels.
- Tell the baking station which pizza to bake next.
- Tell the reheat station which slices to heat in efficient batches.
- Prevent POS from selling unavailable items.
- Allow manual inventory correction during messy real-world operation.
- Provide basic live analytics.
- Stay usable under pressure with a minimal, fast UI.

## 3. Products

### Slice Order

A customer orders one or more pizza slices.

Slice orders:

- Are taken through the POS.
- Are added to the digital order backlog.
- Consume slice inventory.
- Require reheating before serving.
- Can be grouped into reheat batches.

### Full-Pie Order

A customer orders a complete pizza pie.

Full-pie orders:

- Are taken through the POS.
- Consume one full pie from inventory.
- Are served whole.
- Do not go through the reheat station.
- Should appear separately from slice orders in the order backlog.
- Trigger baking restock logic like any other inventory reduction.

## 4. Order Backlog

The system maintains a live digital backlog of all incoming POS orders.

Each order should track:

- Order ID
- Order type: `slice` or `full pie`
- Pizza type
- Quantity
- Status
- Timestamp

Suggested statuses:

- `received`
- `allocated`
- `sent to reheat`
- `reheated`
- `ready`
- `completed`
- `cancelled`

Full-pie orders may skip directly from `allocated` to `ready`.

## 5. Inventory

Inventory is dynamic and manually editable.

### Pizza Inventory

Pizza inventory is tracked as whole pre-baked pies per pizza type and stored internally as pie equivalents.

Operationally, inventory may be displayed as pies and slices:

```text
Margherita: 2 full pies + 4 slices
```

Internally, the system stores and calculates this as:

```text
Margherita: 2.5 pies
```

Assumption:

```text
1 pie = 8 slices
```

Examples:

```text
8 slices = 1.0 pie
4 slices = 0.5 pies
2 slices = 0.25 pies
```

Slice orders decrement the pizza inventory by slice fraction.

Full-pie orders decrement the pizza inventory by `1.0` pie.

### Initial Inventory

The system starts with a base inventory:

- Pre-baked pies per pizza type
- Available slices per pizza type
- Dough balls
- Topping availability

Example:

```text
Margherita: 3 pies
Pepperoni: 3 pies
Mushroom: 2 pies

Dough balls: 20

Toppings:
- Tomato sauce: available
- Mozzarella: available
- Pepperoni: available
- Mushrooms: available
```

### Manual Inventory Corrections

The user must be able to manually correct inventory during service.

Typical cases:

- Burnt pizza
- Dropped pizza
- Wrong pizza baked
- Incorrect POS entry
- Manual stock count correction
- Dough count correction

Inventory must stay fast to edit. Corrections should not require a complex approval flow.

## 6. Topping Availability

Toppings have three availability states:

- `available`
- `limited`
- `sold out`

### Available

A topping is available when there is no expected short-term constraint.

Products using this topping may be sold normally.

### Limited

A topping is limited when the operator knows the remaining stock is low but not fully sold out.

When setting a topping to `limited`, the operator manually enters how many additional full pies the remaining topping stock can still cover.

Example:

```text
Mushrooms: limited
Remaining topping stock: 3 pies
```

This value means there is enough mushroom stock for approximately three more mushroom pies.

The system must subtract already received but not yet completed production demand from this value.

Example:

```text
Operator estimate:
Mushrooms available for 3 pies

Open backlog at production / topping stage:
2 Mushroom pies

Effective remaining availability:
1 pie
```

The displayed remaining value should therefore be:

```text
Mushrooms: limited - approx. 1 pie remaining
```

This logic prevents the POS from overselling toppings that are technically not sold out yet but already committed to open orders.

### Sold Out

A topping is sold out when no further products using that topping should be sold.

Products requiring a sold-out topping must be blocked at the POS.

## 7. Sold-Out Logic

The system must prevent unavailable orders from being sold.

Product availability should be based on:

- Pizza inventory
- Dough availability
- Topping availability
- Open, received, and not-yet-produced orders
- Whether the order is for slices or a full pie

Availability states sent to the POS:

- `available`
- `limited`
- `sold out`

### Availability Rules

A product is `available` when:

- Required pizza inventory exists, or production is possible.
- Required dough is available.
- Required toppings are available.
- No relevant topping is constrained.

A product is `limited` when:

- At least one required topping is marked `limited`.
- The remaining topping stock can still cover some additional demand.
- Pizza or dough stock is low but not exhausted.

A product is `sold out` when:

- A required topping is `sold out`.
- A required limited topping has no remaining effective stock.
- Dough is unavailable.
- The required pizza type cannot be fulfilled from inventory or production.

### Limited Topping Calculation

For limited toppings, the system calculates:

```text
effective topping availability = manually entered topping capacity - open committed demand
```

Example:

```text
Mushrooms manually set to: 3 pies remaining

Open Mushroom demand:
- 1 full Mushroom pie
- 8 Mushroom slices = 1 pie

Committed demand: 2 pies
Effective availability: 1 pie
```

POS should treat this as:

```text
Mushroom Pizza: limited - approx. 1 pie remaining
```

Once effective availability reaches zero, affected products become:

```text
sold out
```

## 8. Baking Station

The baking station receives signals when pizza inventory drops below the target level.

Pizza inventory is tracked in pie equivalents.

Example:

```text
Target inventory: 3.0 pies
Current inventory: 2.5 pies
Signal: Bake 1 Margherita
```

### Bake Signal Logic

Bake signals should consider:

- Current pizza inventory
- Target inventory per pizza type
- Open orders
- Full-pie orders
- Dough availability
- Topping availability
- Limited topping constraints

The system should signal the next pizza to bake when inventory needs to be replenished.

### Optimistic Inventory Update

Bake signals should automatically increase pizza inventory.

When the system sends a bake signal, it assumes the pizza will be successfully baked and added to stock.

Example:

```text
Current inventory: 2.0 pies
Target inventory: 3.0 pies
Signal sent: Bake 1 Pepperoni

Inventory automatically updates to:
Pepperoni: 3.0 pies
```

No confirmation is required when the bake succeeds.

### Failure Correction

Manual interaction is only required if the bake fails or the pizza is not added to inventory.

Failure cases:

- Pizza burnt
- Pizza dropped
- Wrong pizza baked
- Pizza delayed
- Ingredients unavailable after signal
- Bake cancelled

The baking station UI should provide a fast correction action:

```text
Mark bake as failed / not added to stock
```

When a bake is marked as failed, the system should reverse the optimistic inventory increase.

Example:

```text
Signal sent:
Bake 1 Mushroom

Inventory auto-increased:
Mushroom: 3.0 pies

Bake failed:
Inventory corrected back to:
Mushroom: 2.0 pies
```

## 9. Reheat Station

The reheat station handles slice orders only.

Full-pie orders bypass this station.

### Oven Setup

The number of reheat ovens and their slice capacity must be editable.

Default setup:

```text
Ovens: 2
Capacity per oven: 4 slices
Total batch capacity: 8 slices
```

The system should support pop-ups with different oven setups.

Example:

```text
Ovens: 1
Capacity per oven: 4 slices
Total batch capacity: 4 slices
```

Example:

```text
Ovens: 3
Capacity per oven: 4 slices
Total batch capacity: 12 slices
```

### Batch Logic

The system should group slice orders into efficient reheat batches based on the configured oven setup.

Priority:

1. Fill available oven capacity where possible.
2. Use oldest orders first.
3. Allow order splitting if needed.
4. Avoid delaying ready slices unnecessarily.
5. Keep batches simple enough for staff to execute quickly.

Example with default setup:

```text
Oven 1:
- 2x Margherita
- 1x Pepperoni
- 1x Mushroom

Oven 2:
- 3x Margherita
- 1x Pepperoni
```

### Batch Completion

When a reheat batch is marked done:

- All slices in the batch are marked `reheated`.
- Orders with all required slices reheated are marked `ready` or `completed`.
- Partial orders remain open until all required slices are ready.
- Inventory should not change at this point, because inventory was already decremented when the order was accepted.

## 10. Post-Bake Topping Station

> Out of scope.

Some pizzas may need post-bake toppings.

The system should display simple topping symbols or icons for speed.

Example:

```text
🌿 Basil
🌶 Chili
🧄 Garlic oil
🧀 Extra cheese
```

The topping station should show:

- Pizza type
- Required post-bake toppings
- Quantity
- Order or batch reference

## 11. POS Integration

The POS integration should:

- Receive product availability from the system.
- Send confirmed orders to the system.
- Block or warn against sold-out products.
- Show limited availability where relevant.
- Distinguish between slice orders and full-pie orders.
- Handle API failures gracefully.

The POS should expose three product states:

- `available`
- `limited`
- `sold out`

For limited products, the POS should show a simple operational hint:

```text
Mushroom Pizza: limited - approx. 1 pie remaining
```

Or:

```text
Mushroom Pizza: limited - approx. 8 slices remaining
```

The internal source of truth may remain in pie equivalents.

If POS API connectivity fails:

- Existing backlog must remain visible.
- Manual order entry should be possible.
- Inventory must remain manually editable.

## 12. UI Requirements

The UI should be minimal and optimized for speed.

Key screens:

- Order Backlog
- Inventory
- Baking Station
- Reheat Station
- POS Availability
- Basic Stats

Design principles:

- Large buttons
- Few clicks
- Clear status colors
- Fast manual overrides
- No dense forms during service
- Works on tablets or small screens

## 13. Fault Tolerance

The system should assume a messy deployment environment.

Required safeguards:

- Manual inventory override
- Manual order status override
- Offline-tolerant backlog display
- Clear error states for POS API issues
- No silent inventory changes
- Confirmation required for baked pizzas
- Ability to mark items sold out instantly
- Ability to undo or correct mistakes

## 14. Basic Analytics

The system should provide simple live stats:

- Orders received
- Slices sold by pizza type
- Full pies sold by pizza type
- Current inventory
- Sold-out items
- Average order wait time
- Reheat batches completed
- Pizzas baked
- Waste / manual inventory losses, if tracked

Keep analytics operational, not decorative.

## 15. Key Rules

- Pizza inventory is stored as pie equivalents.
- Pizza inventory may be displayed as full pies plus slices.
- Slice orders decrement inventory by slice fraction.
- Full-pie orders decrement inventory by `1.0` pie.
- Full-pie orders bypass reheating.
- A baked pizza signal, meaning an inventory increase, decrements a pizza dough.
- Toppings can be `available`, `limited`, or `sold out`.
- Limited topping stock is entered manually as additional full-pie capacity.
- Limited topping availability must subtract already received but unfinished production demand.
- Sold-out toppings block dependent products.
- Bake signals automatically increase inventory.
- Failed bakes must be manually corrected.
- Manual correction must remain fast and always available.
