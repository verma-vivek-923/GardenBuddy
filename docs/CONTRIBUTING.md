# Contributing to GardenBuddy AI

## Before you start

Read the root [`README.md`](../README.md), the relevant specification in [`Ai_Docs/`](../Ai_Docs/), and [`SECURITY.md`](SECURITY.md). Do not open a public issue for a suspected security vulnerability.

## Development setup

Requirements: Node.js 20.19+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

For PowerShell:

```powershell
Copy-Item .env.example .env
npm run dev
```

The frontend runs on `http://localhost:5173`; the API runs on `http://localhost:5000`.

## Quality checks

Run these before opening a pull request:

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

Tests must not call a real AI provider. Use the injected provider mock used by the existing server tests.

## Change guidelines

- Keep API contracts in `shared/src/contracts.ts` and validate both input and provider output.
- Never commit `.env`, API keys, uploaded images, build output, or generated dependency directories.
- Preserve the local-storage integrity rules: failed generation must not replace a valid active plan.
- Keep diagnosis optional and honest; do not add simulated AI results.
- Add or update tests for changed behavior.
- Update the README or a relevant document when setup, API behavior, security, or user-visible behavior changes.

## Pull requests

Use a focused branch and describe the problem, the change, verification performed, and any configuration or migration impact. Include screenshots for meaningful UI changes and call out known limitations.
