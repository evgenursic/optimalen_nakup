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
- Clean Ubuntu Lighthouse run `31658076444` now passes the configured three-run median-100 gate for
  Performance, Accessibility, Best Practices, and SEO on all four public routes in both profiles;
  both transfer budgets pass. Artifact `9165300267` (ZIP digest
  `sha256:8e3464a57d6ab4ac2e0faa13a0c89742a44381e51b24c93cddc5078bb60f345b`) is retained. A few
  individual samples are lower than 100, so the evidence supports the documented median gate and not
  an assertion that every noisy sample is exactly 100.
- The authenticated research-results Lighthouse path is still unverified because it requires a
  deployed Clerk/Convex environment, a dedicated test user, and a completed research job.
