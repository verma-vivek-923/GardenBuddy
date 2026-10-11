# Security Policy

## Scope

GardenBuddy AI handles gardening preferences in the browser and may send user-supplied text or an uploaded image to the configured AI provider. It is not a medical, pesticide, emergency, or automated-control system.

## Reporting a vulnerability

Do not disclose vulnerabilities in a public issue. Contact the repository maintainer through the private security channel configured for the deployment, including a concise description, impact, affected route or component, reproducible steps, and suggested mitigation if known.

If no private channel has been configured, contact the project owner directly before public disclosure. Remove secrets and personal data from reports.

## Security expectations

- Keep `GROQ_API_KEY` server-side; never use a `VITE_` variable for secrets.
- Use HTTPS and a restricted `CLIENT_ORIGIN` in production.
- Keep dependencies and Node.js current.
- Treat uploaded images and AI output as untrusted input.
- Do not rely on client-side validation alone.
- Replace the in-memory rate limiter with a shared store before multi-replica public deployment.
- Review provider retention, model eligibility, and data-processing terms before enabling diagnosis for real users.

## Supported versions

Only the current default branch and the latest released deployment are expected to receive security fixes until a formal support policy is established.
