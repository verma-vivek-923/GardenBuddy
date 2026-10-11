# Support

## Troubleshooting

1. Confirm Node.js is 20.19 or newer.
2. Run `npm install` from the repository root.
3. Copy `.env.example` to `.env` and configure the required values.
4. Run `npm run typecheck`, `npm test`, and `npm run build`.
5. Check `GET /api/health` and `GET /api/capabilities` when diagnosing API configuration.

AI recommendations and plans require a valid `GROQ_API_KEY` and an operator-verified `GROQ_TEXT_MODEL`. Diagnosis additionally requires explicit opt-in settings and a verified vision model. The application intentionally returns a configuration error instead of inventing a result.

## Reporting a product issue

Use the bug issue template and include the browser/OS, reproduction steps, expected behavior, actual behavior, relevant route, and sanitized console or server errors. Never include API keys, private user data, or uploaded images.

## Data and recovery

Garden data is stored locally in the browser and is not synced across devices. Browser storage can be cleared or unavailable in private browsing. Before resetting data, export or copy it from browser developer tools if recovery is important.
