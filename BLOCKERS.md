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
- Source availability was rechecked read-only on 2026-08-13, but legal approval and explicit source
  activation are still required before any live adapter run.
- Source commit `9444939` passed the strict public Lighthouse median-100 gate in run `31665236023`,
  but the later documentation-head rerun `31667135836` failed mobile `/sl` with samples
  `0.99, 1.00, 0.99`. The exact threshold remains unchanged; this is an active
  reproducibility/runner-variance blocker alongside the authenticated research-results route, which
  still requires deployed Clerk/Convex credentials, a dedicated test user, and a completed research
  job.
- Earlier push/merge Lighthouse runs (`31660347514`, `31663156305`, and `31663733513`) also showed
  runner variance on mobile; the strict threshold remains unchanged.
- The rejected `eb71be3` runtime-script externalization experiment did not improve that gate: clean
  Ubuntu push run `31662511432` measured 0.99 medians on `/sl` and `/sl/sign-in`. It was reverted in
  `476ade4`; the strict gate remains unchanged.
- The draft PR remains open because the public median gate is not reproducibly green across the
  latest head, and authenticated results, backup/restore, legal/source activation, and production
  credentials are still incomplete.
- The `2062ffa` deep below-fold containment experiment was rejected by CI Axe: `content-visibility`
  caused a serious mobile contrast false-state on the dark process section. It was reverted in
  `f956dd6`; accessibility remains a hard gate.
