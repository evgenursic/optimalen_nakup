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
  Ubuntu GitHub Actions job rather than claimed from the local machine.
- The local `bash` command resolves to WSL, but no Linux distribution is installed. Shell parsing is
  verified by the same Ubuntu Actions gate rather than claimed locally.
- A clean backup/restore rehearsal requires the external S3-compatible repository and a disposable
  Convex deployment.
- Authenticated E2E and the real results-route Lighthouse run require a dedicated Clerk test user, a
  deployed environment, and a completed research job owned by that user's test workspace.
- The Figma file is on a Starter team, which permits one variable mode. The Light mode is the v1
  release scope; semantic aliases remain ready for a later Dark mode after the workspace supports
  it.
- The Figma file metadata is readable again, but the general write endpoint and library-discovery
  endpoint still return `INVALID_ARGUMENT`. Four initial collections and 49 variables were created
  before that failure; pages, styles, components, and screen parity remain open. The owner approved
  Phase 1 on 2026-07-29, but the first post-approval call was a read-only inventory and failed
  before any mutation, so no blind retry or duplicate creation was attempted.
- Five clean Ubuntu Lighthouse series pass Accessibility, Best Practices, SEO, and both transfer
  budgets, while the latest mobile Performance medians remain 98 rather than the required exact 100.
  The residual variance is therefore reproduced outside the local Windows environment. Run
  `30461698590` stores all 24 reports as artifact `8728119687`.
