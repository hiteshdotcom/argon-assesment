# Argon · Image Upload & Validation

Full-stack skeleton for uploading images, running a six-rule validation pipeline asynchronously, and presenting accepted/rejected results in real time.

```
.
├── docker-compose.yml      # postgres + minio + bucket auto-create
├── server/                 # Node 20 + Express + TypeScript + Prisma
└── client/                 # React + Vite + TypeScript
```

---

## Prerequisites

- Node 20+
- Docker Desktop (for postgres + minio)
- `npm` (or `pnpm`/`yarn`)

---

## Setup

```bash
# 1. Start postgres + minio (and create the bucket)
docker compose up -d

# 2. Server
cd server
cp .env.example .env
npm install
npx prisma migrate deploy      # applies the initial migration
npx prisma generate
npm run dev                    # → http://localhost:4000

# 3. Client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                    # → http://localhost:5173
```

Open <http://localhost:5173>, drop in some images, and watch the right-hand panels fill in.

### Optional: enable face validators

The pipeline runs end-to-end without face weights — `faceCount` and `faceSize` pass-through with a `skipped: model_unavailable` marker. To enable real detection:

```bash
mkdir -p server/models
# Download the SSD MobileNet v1 weights into server/models from:
#   https://github.com/vladmandic/face-api/tree/master/model
# (ssd_mobilenetv1_model-*.bin and ssd_mobilenetv1_model-weights_manifest.json)
```

### MinIO console

<http://localhost:9001> · login `minioadmin` / `minioadmin`.

---

## Run commands (cheat sheet)

| What | Command |
| --- | --- |
| Start infra | `docker compose up -d` |
| Stop infra | `docker compose down` |
| Server dev | `cd server && npm run dev` |
| Server build | `cd server && npm run build && npm start` |
| Prisma migrate | `cd server && npx prisma migrate deploy` |
| Prisma studio | `cd server && npx prisma studio` |
| Client dev | `cd client && npm run dev` |
| Client build | `cd client && npm run build && npm run preview` |

---

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/images?status=accepted\|rejected\|pending` | List, optionally filtered |
| `GET` | `/api/images/:id` | Single record (frontend polls this) |
| `POST` | `/api/images` | Multipart `file=…` — returns `202 {id, status}` |
| `DELETE` | `/api/images/:id` | Deletes row + S3 object |

Every response that references stored bytes includes a short-lived presigned `previewUrl`. The S3 key itself is never sent to the client.

---

## Architecture & tradeoffs

### Validation pipeline

Six rules, each a self-contained module in `server/src/validators/`:

| Module | Failure condition |
| --- | --- |
| `format` | Magic-byte sniff (`file-type`) — only JPEG, PNG, HEIC pass |
| `dimensions` | width < 512, height < 512, or bytes < 20 KB |
| `blur` | Variance of a Laplacian convolution below threshold |
| `similarity` | aHash Hamming distance to any accepted image below threshold |
| `faceCount` | Detected faces ≠ 1 |
| `faceSize` | Largest face / image area below threshold |

The runner (`validators/index.ts`) executes them in order but **never short-circuits** — every rule runs, every failure is collected, so a single rejected upload reports all the things that are wrong with it. A throw inside a validator is itself a failure with the message captured, not a crash.

Validators receive a shared `ctx` carrying the buffer and a `computed` bag, so `dimensions` can stash width/height for `faceSize` and `faceCount` can cache its detection so `faceSize` doesn't re-run inference.

### Async flow

```
POST /api/images
   ├─ multer (memory, max 15 MB)
   ├─ magic-byte sniff (415 if bad)
   ├─ HEIC → JPEG via sharp
   ├─ S3 PUT under uploads/<uuid>.<ext>
   ├─ Prisma INSERT status=PENDING
   ├─ enqueue("processImage", { imageId })
   └─ 202 {id, status:"PENDING"}

Worker (in-process):
   ├─ status → PROCESSING
   ├─ S3 GET → runPipeline()
   └─ status → ACCEPTED | REJECTED + rejectionReasons[]
```

The worker is just a function registered with `queue.ts`'s `registerHandler`. The queue's current implementation is a `setImmediate` fire-and-forget, but the seam is clear — swapping in BullMQ means changing `enqueue` to `queue.add(name, payload)` and writing a tiny `Worker(name, ...)` bootstrap. No callsite needs to know.

### Storage & security

- **S3 key sanitization** — keys are server-generated UUIDs (`uploads/<uuid>.<ext>`); user input never touches the path.
- **Magic bytes, not extensions** — both at the edge (`POST /api/images`) and inside the `format` validator.
- **Presigned URLs only** — clients never see raw keys or credentials. Default TTL 15 min, env-configurable.
- **Multer fileSize limit** at the edge so we never load > 15 MB into memory.
- **CORS** locked to `CLIENT_ORIGIN`.
- **Rate limit** on `POST /api/images` (30/min/IP); read endpoints are unrestricted.
- **Helmet** for standard HTTP hardening headers.

### Frontend

- `useImageUpload()` is the entire data layer — handles client-side type sniffing (extension + MIME, before upload), POST, polling every 1.5 s, optimistic preview via `URL.createObjectURL`, and cleanup of intervals + object URLs on unmount.
- Optimistic UI: a card with a local preview appears immediately. Server status updates flow through the same card via polling.
- Two panels (`Accepted`, `Rejected`); the rejected panel renders the full list of `rejectionReasons` so users see *why*.
- CSS modules only — no UI framework, just a small token set in `index.css`.

### Tradeoffs I'd revisit at scale

| Decision | Today | At scale |
| --- | --- | --- |
| Queue is `setImmediate` | Zero infra | BullMQ (Redis) — durable, retries, observability |
| Similarity scan is O(n) over accepted rows | Fine ≤10k | Move `perceptualHash` to a vector index (pg `bit_count` BK-tree, or a dedicated ANN store) |
| HEIC conversion on the request path | Simpler edge | Push to the worker; return 202 faster; store original + derivatives |
| Polling for status | One verb, predictable | SSE or WebSocket push |
| Face model lazy-loaded in-process | Trivial deploy | Externalize to a CV microservice; the validator just calls an RPC |

### What's *not* here, intentionally

- No auth — out of spec.
- No image deletion confirmation modal — out of spec, easy to add.
- No virus scan — would belong as another pipeline rule (`clamav.ts`).
- No retries on pipeline failures — the queue seam is where that belongs (BullMQ has it built in).
