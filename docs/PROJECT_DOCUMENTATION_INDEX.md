# Project Documentation Index

## Project

- **Name:** GardenBuddy AI
- **Type:** React/Vite frontend with an Express/TypeScript API
- **Runtime:** Node.js 20.19 or newer
- **Persistence:** Browser `localStorage`; no application database or account system
- **AI provider:** Groq, configured server-side
- **Status:** MVP implementation; production deployment requires operator verification of provider models and environment configuration

## Source of truth

| Area | Primary source |
|---|---|
| Product goals and scope | [`Ai_Docs/PRD.md`](../Ai_Docs/PRD.md) |
| Functional behavior | [`Ai_Docs/GardenBuddy_AI_FRD.md`](../Ai_Docs/GardenBuddy_AI_FRD.md) |
| Architecture and technical choices | [`Ai_Docs/GardenBuddy_AI_Technical_Approach.md`](../Ai_Docs/GardenBuddy_AI_Technical_Approach.md) |
| User journeys | [`Ai_Docs/GardenBuddy_AI_User_Journey.md`](../Ai_Docs/GardenBuddy_AI_User_Journey.md) |
| Runtime setup and API quick reference | [`README.md`](../README.md) |
| Shared request/response schemas | [`shared/src/contracts.ts`](../shared/src/contracts.ts) |
| CI checks | [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) |

When documents disagree, update the source-of-truth document first and align downstream documentation in the same change.

## Repository map

```text
client/       React UI, routes, browser state, styles, client tests
server/       Express API, AI provider integration, API tests
shared/       Shared Zod schemas and TypeScript contracts
Ai_Docs/      Product, functional, journey, and technical specifications
docs/         Project governance and operational documentation
.github/      CI workflow and contribution templates
```

## Documentation standards

- Prefer concise Markdown with a clear audience and purpose.
- Include dates or version context when behavior can change.
- Never document real credentials, private URLs, personal data, or production secrets.
- Keep examples executable where practical and mark placeholders clearly.
- Update relevant documentation in the same pull request as behavior changes.
