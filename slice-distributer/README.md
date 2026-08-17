# Slice Distributor

Slice Distributor is an operations tool for a fast-paced pizza pop-up. The current MVP connects a cashier-facing order queue to a reheat-station workflow, groups orders into oven batches, and keeps both views synchronized through Supabase Realtime.

> **Project status:** active MVP. Order entry and reheat batching are working; inventory, bake planning, product availability, full-pie orders, and operational analytics are documented but not yet implemented. See [the engineering audit](doc/engineering-audit.md) for the prioritized roadmap.

## Why this exists

During service, staff need to turn a stream of slice orders into simple, capacity-aware oven instructions without losing order sequence. This project explores that workflow with a tablet-friendly interface and shared live state.

## Current features

- Email/password authentication with Supabase
- Create, edit, filter, and delete slice orders
- Live order updates through Supabase Realtime
- Capacity-aware batching across two ovens
- Forward/backward reheat batch navigation
- Responsive UI with dark mode
- Multi-stage hardened container build using a non-root distroless runtime

## Architecture

- **Frontend:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, and Zod
- **Backend:** Supabase Auth, Postgres, Row Level Security, and Realtime
- **Deployment:** Next.js standalone output with Docker/Compose

The browser talks directly to Supabase using the public client key. Database Row Level Security restricts order access to authenticated users; the Next.js middleware also protects all operational pages.

## Run locally

Prerequisites: Node.js 22, npm, and a Supabase project.

1. Clone the repository and enter the application directory:

   ```bash
   git clone <repository-url>
   cd slice-distributer/slice-distributer
   ```

2. Install dependencies with `npm ci`.
3. Copy `.env.example` to `.env.local` and add your Supabase project values.
4. Run [`supabase/migrations/20260817000000_create_orders.sql`](supabase/migrations/20260817000000_create_orders.sql) in the Supabase SQL editor. Enable Realtime for `public.orders` if needed.
5. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run typecheck
npm run build
```

## Container deployment

The hardened deployment choices are documented in [`doc/container-hardening.md`](doc/container-hardening.md).

```bash
docker compose -f compose.hardened.yml up --build
```

## Product scope

The intended operational system and business rules are captured in [`doc/requirements.md`](doc/requirements.md). That document extends beyond the current MVP; the status note above and engineering audit distinguish implemented behavior from planned work.

## Author

Built by [Voidcake](https://github.com/Voidcake).
