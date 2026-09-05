# Spatial Forge

Text-to-3D generation on the [Mint API](https://docs.mint.gg). Describe an
object, watch it generate, orbit it in the browser, and download the mesh.

## Setup

```bash
npm install
cp .env.example .env   # then paste your key
npm run dev
```

Open http://localhost:3000.

## Architecture

The Mint API key is server-side only. The browser never sees it — it talks to
two local routes that proxy to Mint:

| Route | Purpose |
| --- | --- |
| `POST /api/generate` | Validates input, calls `POST /v1/models:generate`, returns the accepted operation |
| `GET /api/operations/[operationId]` | Proxies `GET /v1/operations/{id}` and adds a `done` flag |

`src/lib/mint.ts` is marked `server-only`, so importing it from a client
component is a build error rather than a leaked key.

### Polling

Generation is asynchronous. The client polls on Mint's recommended cadence:
start at 2s, multiply by 1.6, cap at 15s, give up at 30 minutes, with jitter.
`429` responses honor `Retry-After`.

An operation counts as finished only when it reaches a terminal status *and*
its Credit reservation has settled — Mint can report `succeeded` while
`credits.reserved` is still non-zero. `isTerminal()` in `src/lib/mint.ts`
handles that.

Every terminal status is handled: `succeeded`, `partially_succeeded`, `failed`,
`canceled`, `preview_ready`, and `billing_required` (which surfaces the required
Credits and Mint's billing action URL instead of silently failing).

### Presets

`fast` for iteration, `standard` for the balanced default, `production` for
highest quality. Each generation costs Credits.

## Notes

- Generation modes: the app uses `auto`, which runs straight through to the
  final asset. Mint also supports `review`, which pauses at `preview_ready` for
  an explicit approve/revise decision.
- Reference images: `src/lib/mint.ts` accepts either one `imageUrl` or 2–8
  `sourceImages`, never both. Only `imageUrl` is wired into the UI so far.
- `riggingPose` (`t_pose` / `a_pose`) prepares a humanoid preview for later
  rigging. It does not rig or animate the model.
