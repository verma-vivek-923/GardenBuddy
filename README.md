# 🌱 GardenBuddy AI

**A personal gardening companion** that matches three plants to a gardener's space and turns their selected plant into a real AI-generated seven-day care plan. No login, application database, or cloud sync is required.

> Built against the five original specifications in `Ai_Docs/`, with the accompanying `Pasted markdown.md` build directive supplied for this project. Source priority: FRD → Technical Approach → PRD → End-to-End Journey → User Journey.

## What's included

- Original responsive landing page with an illustrated botanical hero; keyboard-accessible navigation.
- `/setup` — six validated gardening preferences, exactly three distinct AI plant recommendations, explicit plant selection and plan generation.
- `/garden` — profile, seven complete day groups, editable daily tasks, complete/undo actions, progress ring, estimated planned minutes, versioned history, intentional regeneration, local reset.
- `/diagnose` — **optional, gated** photo analysis. JPEG/PNG/WebP, preview and removal, maximum 5 MB by default, real backend multipart upload and text-only local diagnosis history. Off unless explicitly enabled and a compatible vision model has been verified.
- `/` (Home), `/setup`, `/garden`, `/diagnose`, useful 404 page, guided empty and network/error states.
- Express API with Zod DTO validation, server-only Groq integration, constrained prompts, JSON-mode responses, bounded retries, safe error mapping, CORS, Helmet, rate limiting, request limits and file signature checks.
- Browser-only `localStorage` state with versioned keys, schema checks, non-destructive corruption detection, completion timestamps, and archived history.
- API and persistence tests and a GitHub Actions workflow.

## Documentation

The complete documentation map is in [`docs/README.md`](docs/README.md).

- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — development workflow and pull requests.
- [`docs/SECURITY.md`](docs/SECURITY.md) — security boundaries and vulnerability reporting.
- [`docs/SUPPORT.md`](docs/SUPPORT.md) — troubleshooting and support guidance.
- [`docs/PROJECT_DOCUMENTATION_INDEX.md`](docs/PROJECT_DOCUMENTATION_INDEX.md) — documentation ownership and source of truth.
- [`Ai_Docs/`](Ai_Docs/) — product, functional, technical, and journey specifications.

**Important:** no successful AI output is simulated. Without a real Groq key and verified compatible text model, recommendation and plan generation will return a safe, honest configuration error.

## Architecture

```text
Browser (React / Vite / React Router)
  ├── routes: /  /setup  /garden  /diagnose
  ├── centralized API client ────────────────────────────┐
  └── typed localStorage profile/plans/diagnoses/settings│
                                                        │ HTTP /api/*
                                              Express (Node.js / TS)
                                                ├── Helmet + CORS + throttling
                                                ├── Zod input/output validation
                                                ├── memory-only image upload
                                                └── GroqProvider
                                                      └── Groq Chat Completions API
                                                          (server API key only)
```

## Start locally

Requirements: **Node.js >= 20.19** and npm. Project root contains `package.json`, `client/`, `server/`, `shared/`, `Ai_Docs/`.

```bash
npm install
cp .env.example .env
# Edit .env: supply your own GROQ_API_KEY and verified GROQ_TEXT_MODEL
npm run dev
```

PowerShell equivalent to copying environment file:

```powershell
Copy-Item .env.example .env
```

Open **http://localhost:5173** (Vite), with Express running on **http://localhost:5000**. Vite proxies `/api` to Express, so `VITE_API_BASE_URL` is optional in local development.

For independent terminals:

```bash
npm run dev:server
npm run dev:client
```

Production build and run backend:

```bash
npm run build
npm start
```

The built static client is at `dist/client/`; serve it separately through a static host, CDN, Nginx, Caddy, etc., with an HTTPS `/api` reverse proxy to the Express service. `npm start` serves only the API, **not** the Vite client.

### Environment variables

| Variable | Purpose | Required? |
|---|---|---|
| `PORT=5000` | Express port | Optional |
| `CLIENT_ORIGIN` | Allowed browser origins, comma separated | Yes in production |
| `GROQ_API_KEY` | Groq API secret, server only | Yes for AI |
| `GROQ_TEXT_MODEL` | An **actual, currently supported Groq text model ID**, confirmed by the operator | Yes for recommendation/plan |
| `GROQ_VISION_MODEL` | An actual verified vision model ID | Only for diagnosis |
| `ENABLE_VISION_DIAGNOSIS=true` | Explicitly opt in to photo analysis | Only for diagnosis |
| `GROQ_VISION_VERIFIED=true` | Operator confirms model supports images, JSON responses and meets relevant eligibility conditions | Only for diagnosis |
| `MAX_IMAGE_SIZE_MB=5` | Image upload limit (server capped at 15 MB) | Optional |
| `VITE_API_BASE_URL` | Public **base URL without `/api`**, e.g. `https://api.example.com`; leave blank for same-origin proxy | Only for cross-origin hosting |
| `NODE_ENV` | Runtime environment indicator | Optional |

**Never commit `.env`**, ship the Groq API key into a Vite variable, or expose it to browser code. This repository intentionally does not hardcode a speculative model ID. Verify availability and JSON-mode support in Groq's current model documentation, plus the actual model's weight/license and any external challenge requirements. A model hosted by Groq is not necessarily open source.

### API reference

| Endpoint | Request | Success response |
|---|---|---|
| `GET /api/health` | None | `{"status":"ok"}` |
| `GET /api/capabilities` | None | `{"recommendations":boolean,"diagnosis":boolean}`; no secrets |
| `POST /api/recommendations` | `{"preferences":{...}}` | `{"recommendations":[3 unique plants]}` |
| `POST /api/plans` | `{"preferences":{...},"selectedPlant":{"id":"plant-1","name":"Mint"}}` | `{"plan":{"title":string,"generalNote":string,"tasks":[...]}}` (covers days 1–7) |
| `POST /api/diagnose` | Multipart `image`, optional `plantName`, `symptoms` | `{"diagnosis":{...}}` when enabled |

Full schema and supported enums: `shared/src/contracts.ts`. Accepted `space`: `indoor`, `balcony`, `terrace`, `backyard`; `sunlight`: `low`, `partial`, `full`, `unsure`; `experience`: `beginner`, `intermediate`, `experienced`; `goal`: `herbs`, `vegetables`, `flowers`, `ornamental`, `general`; minutes: `5`, `10`, `15`, `30`, `45`.

All error responses use `{ "error": { "code": "STABLE_CODE", "message": "Safe explanation" } }` and meaningful HTTP codes (400/413/415/429/502/503/500). Unsafe or structurally invalid model output is **rejected** with 502 rather than silently substituted. Provider credentials and raw responses are not returned to users.

Example test command (replace configured credentials in your local `.env`):

```bash
curl -X POST http://localhost:5000/api/recommendations \
  -H 'Content-Type: application/json' \
  -d '{"preferences":{"city":"Indore","space":"balcony","sunlight":"partial","experience":"beginner","goal":"herbs","dailyTimeMinutes":15}}'
```

## Garden data integrity

Versioned keys:

```text
gardenbuddy:v1:profile
gardenbuddy:v1:plans
gardenbuddy:v1:diagnoses
gardenbuddy:v1:settings
```

- Profile stores garden ID, plant, preferences and timestamps. Plans store version, status, completion, task instructions, duration and materials. Diagnoses store **only text**, timestamps and optional symptom description.
- Recommendations are never saved as a committed new garden until a complete plan for the selected plant exists. This is a deliberate integrity decision: choosing a different plant before successful plan generation must not mismatch an old active plan (FR-PROFILE-04 / journey invariant).
- A new plan is validated, created in full, then written in **one `localStorage` write** with the old version marked `archived`. Failed requests, schema errors and quota errors leave the old plan untouched. The profile+plans initial/new-plant commit spans two browser keys and uses best-effort rollback; **localStorage does not provide cross-key ACID transactions**.
- Every plan version has seven distinct day groups, unique task identifiers and exactly one active plan per browser garden. Completion count and percentage are computed from stored task state.
- Task edits preserve completion state; checkbox undo clears completion timestamp. No remote call is made for edits or checkmarks.
- Invalid stored JSON is not overwritten automatically. The workspace warns the user and provides a confirmed reset path; data may be manually backed up with browser developer tools before resetting.
- Browser storage cannot sync across devices, may be unavailable in private browsing, and can be cleared by the browser/user. No login or server persistence exists.

## Testing

After `npm install`:

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

`server/test/app.test.ts` uses an **injected AI mock**, never a real provider key; it tests schemas, invalid JSON, invalid/oversized images, disabled vision, malformed provider output, safe error mapping, retries, and timeouts. `client/src/test/storage.test.ts` tests corrupt storage, seven-day regeneration rejection, history preservation, completion/undo, task edits and refresh restoration.

Manual happy path (requires real configured text model):

1. Visit `/`; choose **Start my garden**.
2. Enter city, choose space/light/experience/goal/available daily time, submit. Invalid fields must remain editable and show validation.
3. Receive exactly three unique recommendation cards; select one; choose **Create my 7-day plan**. A full seven-day workspace should open only after success.
4. Mark a task complete, undo, edit the task title and materials; refresh the browser and verify persisted state.
5. Generate a new version: dismiss confirmation (no change), then confirm; check that the previous plan appears in history. Simulate failed API by stopping the backend: old plan must stay active.
6. Refresh and select **Continue my garden** from Home. Plan/plant/completion must match.
7. Visit `/diagnose` with vision disabled: explanation must be honest, with no fake result. With independently verified vision and both opt-in settings enabled, upload a valid image and test preview/remove, accepted upload, safe result, and text-only history.
8. Test mobile widths **320px**, 375px, tablet and desktop; tab through all controls, test visible focus, check input errors, read texts at high zoom. Check reduced-motion preference.
9. Confirm reset removes only GardenBuddy's browser-local keys after explicit warning.

## Production deployment notes

- Deploy the client `dist/client` to static hosting. Configure history fallback to `index.html` for React Router.
- Deploy Express behind HTTPS reverse proxy to private upstream port. Restrict allowed origins with `CLIENT_ORIGIN`. Set `VITE_API_BASE_URL` **at client build time** when frontend and backend have different public origins.
- Groq request retries are bounded to **two attempts** with 22-second per-attempt timeouts. The API has 45 AI requests per IP per 15 minutes, in-memory, and a 32 KB JSON body cap.
- For multi-replica deployments, replace the in-memory rate-limit store with shared Redis or equivalent; configure a trusted-proxy policy carefully to avoid IP spoofing.
- Uploads are held temporarily in memory, checked against supported type signatures, sent to the AI provider and discarded after request handling. File parsing is limited to basic signatures, **not a full image-decoder safety proof**. Use stricter malware checks before accepting untrusted public traffic at scale.
- Diagnosis is probabilistic visual advice only. No live weather, IoT automation, medical or pesticide advice, accounts, billing, payments, tracking or cloud sync.
- Current styles use only CSS, an inline SVG and emoji for illustration, and optional Google Fonts with system fallbacks. Product functionality does not depend on remote images.

## Validation status in this environment

Source was checked with the installed TypeScript compiler's syntax transpilation: **17 TS/TSX files parsed, 0 syntax errors**. Required files and CSS brace balance were also checked. `npm install` timed out while waiting on package access in this sandbox. As a result:

- `npm run typecheck` was attempted and blocked by missing `@types/node`.
- `npm test` was attempted and blocked because `vitest` was not installed.
- `npm run build` was attempted and blocked by the same missing Node type definitions.
- No live Groq API test was executed. No claim of an E2E run or successful production build is made.

Install dependencies in a normal networked development environment, run the four validation commands above, and verify the manual flow with a real configured model before production release.

## Source-derived decisions & tradeoffs

- **CSS styling instead of Tailwind runtime:** the Technical Approach explicitly supports CSS or Tailwind; custom CSS avoids additional styling/build dependencies while preserving the requested botanical responsive visual system.
- **No invented model IDs:** the provider model catalog and license can change, so actual IDs are operator-configured.
- **Diagnosis gated by both configuration and operator verification:** model capability is not inferred from a nonempty env string or fake AI result. The status endpoint reports only opt-in/configured readiness, not a successful provider test.
- **Provider JSON output must pass strict shape + full 7-day coverage:** user prompts can be unreliable; malformed AI content never creates a saved plan.
- **Photo diagnosis** implemented as optional capability; hidden in navigation unless enabled and verified.
- **Regeneration** requires confirmation regardless of completion, intentionally stronger than the FRD minimum when unfinished tasks exist.

The canonical product documents are retained under `Ai_Docs/` for traceability.
