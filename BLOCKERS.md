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
  it. Phase 1 currently contains 68 variables across four collections, 14 semantic aliases, six
  Inter text styles, and three effect styles.
- The post-correction Figma readback hit the Starter-plan MCP limit (`INVALID_ARGUMENT`), so
  post-correction validation and the approved Phase 2 page skeleton remain open. No further
  mutations are attempted until the endpoint limit resets or the plan is upgraded.
- Clean Ubuntu Lighthouse series pass Accessibility, Best Practices, SEO, and both transfer budgets.
  The latest completed run `31656269642` reports mobile Performance medians of 98, 98, 98, and 98
  across the four public routes; the strict exact-100 gate remains open and the 24-report artifact
  is retained as `9164652577` (ZIP digest
  `sha256:5d50de7f0d1747b84b33930e9b2d35285fa96cf700e1bfe3cbdbd38575c806a6`). Desktop Lighthouse,
  the quality/build job, containers, Playwright, and CodeQL pass.
