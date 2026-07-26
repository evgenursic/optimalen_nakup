# Test results

## 2026-07-26 foundation and backend

Environment: Windows 11, Node 22.18.0 for package installation and direct commands; the Codex
shell's nested pnpm shim reports Node 24.14.0, so Linux CI remains the authoritative Node 22 gate.

| Command                                                   | Result | Evidence                                                                     |
| --------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `pnpm format:check`                                       | Pass   | All tracked source and documentation match Prettier.                         |
| `pnpm lint`                                               | Pass   | Nine workspaces and all Convex TypeScript pass with zero warnings.           |
| `pnpm typecheck`                                          | Pass   | Strict workspace TypeScript plus `convex/tsconfig.json`.                     |
| `pnpm test`                                               | Pass   | 34 package tests and 12 Convex security/application/protocol tests.          |
| `pnpm build`                                              | Pass   | Next.js production build generated 26 route patterns; all packages compiled. |
| `pnpm test:e2e`                                           | Pass   | 4 Chromium tests passed across desktop and Pixel 7 profiles.                 |
| Offline worker Chromium smoke                             | Pass   | Network-blocked render matched the captured title and formatted price.       |
| `pnpm audit --prod --audit-level high`                    | Pass   | No known vulnerabilities after patched transitive dependency overrides.      |
| `CONVEX_AGENT_MODE=anonymous pnpm exec convex dev --once` | Pass   | Schema, functions, indexes, actions, and crons prepared at 15:59 CEST.       |

The public Playwright tests, dependency audit, and Linux Node 22 build run in GitHub Actions after
this milestone is pushed. Convex tests now cover tenant isolation, verified-email invitations,
waitlist deduplication/rate limiting, subscription replay protection, worker request idempotency,
lease claiming, budget cancellation, user-scoped pins/alerts, scheduled monitoring, public-pricing
validation, intake-cost deduplication, platform-admin access, last-owner deletion protection, and
account anonymization. Container, authenticated E2E, Lighthouse, backup/restore, and live-source
results are not yet claimed.

Worker fixtures and unit/integration tests cover HMAC request construction and retry idempotency,
DNS rebinding/private-address rejection, redirect checks, robots parsing, rate/circuit controls,
sanitized offline Playwright input, ECB conversion/cache behavior, all three initial adapters, BMW M
Sport evidence, hard filters, TCO, conflicts, scoring, partial completion, model-cost deduplication,
and source-health recovery. The offline worker verifier also launched with the pinned local
Chromium; Linux CI remains the authoritative browser/container environment.
