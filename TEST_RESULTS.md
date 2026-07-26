# Test results

## 2026-07-26 foundation and backend

Environment: Windows 11, Node 22.18.0 for package installation and direct commands; the Codex
shell's nested pnpm shim reports Node 24.14.0, so Linux CI remains the authoritative Node 22 gate.

| Command                                                   | Result | Evidence                                                                    |
| --------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `pnpm format:check`                                       | Pass   | All tracked source and documentation match Prettier.                        |
| `pnpm lint`                                               | Pass   | Eight workspaces and all Convex TypeScript pass with zero warnings.         |
| `pnpm typecheck`                                          | Pass   | Strict workspace TypeScript plus `convex/tsconfig.json`.                    |
| `pnpm test`                                               | Pass   | 9 package tests and 7 Convex security/protocol tests.                       |
| `pnpm build`                                              | Pass   | Next.js production build generated 16 routes; worker and packages compiled. |
| `CONVEX_AGENT_MODE=anonymous pnpm exec convex dev --once` | Pass   | Local schema and functions prepared successfully at 2026-07-26 14:13 CEST.  |

The public Playwright tests, dependency audit, and Linux Node 22 build run in GitHub Actions after
this milestone is pushed. Convex tests now cover tenant isolation, verified-email invitations,
waitlist deduplication/rate limiting, subscription replay protection, worker request idempotency,
lease claiming, and budget cancellation. Container, authenticated E2E, Lighthouse, backup/restore,
and live-source results are not yet claimed.
