# Engineering and portfolio audit

Updated: 2026-08-17

This audit separates defects in the current MVP from features that exist only in the product requirements. Priorities reflect recruiter impact, data/security risk, and whether another developer can evaluate the application reliably.

## P0 — essential before presenting the project

- [x] Replace the untouched Supabase starter README with an honest project overview, architecture, setup guide, current scope, and links to deeper docs.
- [x] Protect `/dashboard`, `/POS`, and `/reheat-station`; previously only the password-reset route required authentication.
- [x] Fix the authenticated home redirect, which pointed to a nonexistent `/protected` page.
- [x] Add a reproducible `orders` database migration with constraints, indexes, and Row Level Security policies.
- [ ] Add automated tests for batching rules and critical order mutations. No test framework, test files, or CI workflow currently exists.
- [ ] Make order-number allocation atomic in Postgres. The UI currently reads the largest value and increments it, so simultaneous cashiers can generate the same number.
- [ ] Move multi-row status transitions into a database transaction/RPC. The reheat station currently performs separate updates and can leave partial state after a failure.
- [ ] Correct oversized-order handling. An order over the hard-coded 16-slice capacity produces no batch and blocks the queue, although requirements allow splitting.
- [ ] Add authorization roles. Every authenticated account currently has full create/update/delete access.
- [ ] Add a working hosted demo or recruiter-safe demo mode with seeded data.

## P1 — core product gaps

- [ ] Implement inventory in pie equivalents and decrement it atomically when an order is accepted.
- [ ] Add full-pie orders and ensure they bypass reheating.
- [ ] Implement dough and topping availability, limited-capacity calculations, and sold-out enforcement.
- [ ] Implement the baking station, target-stock signals, optimistic inventory additions, and failed-bake correction.
- [ ] Replace `OPEN`/`PROCESSED` with the documented lifecycle (`received`, `allocated`, `sent_to_reheat`, `reheated`, `ready`, `completed`, `cancelled`).
- [ ] Make oven count and capacity configurable. Code assumes two ovens of eight slices; requirements default to two ovens of four.
- [ ] Preserve FIFO with an immutable timestamp/sequence. Editable string order numbers currently drive queue boundaries.
- [ ] Add explicit loading, empty, success, and retry states; several status-reset errors are ignored.
- [ ] Add live subscriptions to the reheat station, not only the POS table.

## P2 — maintainability and presentation polish

- [ ] Extract shared `Order`, database-row, pizza-type, and status types instead of redefining them and mapping `any` in multiple components.
- [ ] Generate typed Supabase bindings so schema drift fails at compile time.
- [ ] Extract batching and oven distribution into pure domain functions. The hook currently mixes database mutation, local storage, batching, and UI state.
- [ ] Remove dead state (`lastProcessedOrderIndex` is written but never read), stale comments, and an accidental generated citation in source.
- [ ] Fix effect dependency/stale-closure risks and cancel async state updates on unmount.
- [ ] Replace fragile `setTimeout(..., 5)` reset behavior with an awaited reset operation.
- [ ] Handle corrupt local-storage JSON without crashing the station.
- [ ] Improve accessibility: label the start-order input, expose loading state, use semantic controls, and verify keyboard/focus behavior.
- [ ] Fix responsive issues, including a fixed three-column toolbar and fixed-width sheets on narrow screens.
- [ ] Standardize formatting and naming, including “Distributor,” quote style, and invalid classes such as `text-l` and `text-centerr`.
- [ ] Replace generic starter authentication copy and add a demo walkthrough or screenshots.
- [ ] Add structured error reporting and avoid showing raw backend messages to users.
- [ ] Pin container images by digest and make Compose actually read-only (`read_only` is currently `false`, contradicting its documentation).
- [ ] Add dependency automation and security scanning; dependencies were not auditable in this environment.

## Requirements/documentation issues

- The requirements are substantially broader than the implementation but were not labelled as a future-state specification.
- Persistence, concurrency, idempotency, roles, audit history, and database ownership are underspecified.
- Adding an unbaked pizza directly to available inventory risks overselling; available, planned, and failed stock should be distinct.
- Completion criteria and acceptance tests are absent for each workflow.
- The post-bake topping station is marked out of scope but uses normative “should” language, making scope ambiguous.

## Verification limitation

The current execution environment does not provide Node.js/npm, so `npm run typecheck` and the production build could not be executed during this audit. They should be the first checks run in a Node 22 environment.
