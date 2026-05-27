# Hardened Container

This project builds as a Next.js standalone server and runs in a distroless,
non-root runtime image. The runtime image contains only the traced production
server files, static assets, and `public` assets.

## Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t slice-distributer:local .
```

## Run With Hardened Defaults

```bash
docker compose -f compose.hardened.yml up --build
```

The compose profile applies runtime controls that reduce blast radius:

- non-root distroless runtime with no shell or package manager
- read-only root filesystem
- writable `/tmp` only, mounted as `noexec,nosuid,nodev`
- all Linux capabilities dropped
- `no-new-privileges`
- process and memory limits

## Supply Chain Notes

- `npm ci` installs exactly from `package-lock.json`.
- Install lifecycle scripts are disabled during dependency install with
  `--ignore-scripts`.
- Floating `latest` package ranges are pinned in `package.json`.
- For production, replace `NODE_IMAGE` and `RUNTIME_IMAGE` with digest-pinned
  references after mirroring or approving the base images:

```bash
docker build \
  --build-arg NODE_IMAGE='node:22.16.0-bookworm-slim@sha256:<digest>' \
  --build-arg RUNTIME_IMAGE='gcr.io/distroless/nodejs22-debian12:nonroot@sha256:<digest>' \
  ...
```
