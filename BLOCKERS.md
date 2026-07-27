# Blockers

## External production blockers

- Final domain and DNS ownership
- Purchased Hostinger KVM 4 VPS
- Convex production deployment and deploy key
- Clerk production instance and issuer
- OpenAI API project and production budget
- Lemon Squeezy approved store, products, variants, and webhook secret
- Resend production domain and API key
- S3-compatible EU backup destination and credentials
- Qualified review of license, privacy, terms, cookie, and source-use policies
- Explicit owner/legal activation of `bmw-si-used`, `enaa-si`, and `bigbang-si`; robots review alone
  is not permission for a live production smoke test

These do not block credential-free implementation and fixture-based verification. Live integrations
must not be reported as verified until their exact smoke tests pass.

## Verification constraints

- Docker is not installed on the local Windows environment. Compose rendering, image builds, Linux
  shell syntax, least-privilege container startup, and health checks are therefore enforced by the
  Ubuntu GitHub Actions job after push.
- The local `bash` command resolves to WSL, but no Linux distribution is installed. Shell parsing is
  therefore part of the same Ubuntu Actions gate rather than a claimed local check.
- A clean backup/restore rehearsal requires the external S3-compatible repository and a disposable
  Convex deployment.
- Authenticated E2E and the real results-route Lighthouse run require a dedicated Clerk test user, a
  deployed environment, and a completed research job owned by that user's test workspace.
- The Figma file is on a Starter team, which permits one variable mode. The Light mode is the v1
  release scope; semantic aliases remain ready for a later Dark mode after the workspace supports
  it.
- The Figma connector began returning `INVALID_ARGUMENT` after the initial collections and color
  variables were created. Component/page work remains open until the external connector accepts read
  and write operations again.
- The final local mobile Lighthouse series passes Accessibility, Best Practices, SEO, and both
  transfer budgets, but Performance medians remain 87-97 rather than 100. The clean Linux result is
  required before deciding whether remaining variance is environmental or needs more code work.
