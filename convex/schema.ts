import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("researcher"),
  v.literal("viewer"),
);

export const localeValidator = v.union(v.literal("sl"), v.literal("en"));

export const categoryValidator = v.union(
  v.literal("vehicles"),
  v.literal("computers"),
  v.literal("white_goods"),
  v.literal("services"),
);

export const researchStageValidator = v.union(
  v.literal("intake"),
  v.literal("clarification"),
  v.literal("filter_confirmation"),
  v.literal("research_plan"),
  v.literal("source_discovery"),
  v.literal("collection"),
  v.literal("detail_verification"),
  v.literal("normalization"),
  v.literal("duplicate_resolution"),
  v.literal("conflict_detection"),
  v.literal("scoring"),
  v.literal("evidence_validation"),
  v.literal("final_report"),
  v.literal("monitoring"),
);

export const researchStateValidator = v.union(
  v.literal("draft"),
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("completed_partial"),
  v.literal("cancel_requested"),
  v.literal("cancelled"),
  v.literal("failed"),
  v.literal("dead_letter"),
);

export const verificationStatusValidator = v.union(
  v.literal("verified"),
  v.literal("inferred"),
  v.literal("secondary"),
  v.literal("missing"),
  v.literal("conflicting"),
);

export const extractionMethodValidator = v.union(
  v.literal("api"),
  v.literal("feed"),
  v.literal("json_ld"),
  v.literal("dom"),
  v.literal("browser"),
  v.literal("ai_structured"),
  v.literal("user_supplied"),
);

export const planValidator = v.union(
  v.literal("closed_beta"),
  v.literal("starter"),
  v.literal("pro"),
  v.literal("business"),
);

export const recommendationModeValidator = v.union(
  v.literal("best_overall"),
  v.literal("best_value"),
  v.literal("lowest_verified_price"),
  v.literal("premium"),
  v.literal("lowest_risk"),
  v.literal("long_term_value"),
  v.literal("lowest_tco"),
  v.literal("most_reliable"),
  v.literal("environmental"),
  v.literal("fastest_available"),
  v.literal("closest_match"),
);

export const moneyValidator = v.object({
  amount: v.number(),
  currency: v.string(),
});

export const nullableMoneyValidator = v.union(moneyValidator, v.null());

export const filterSpecV1Validator = v.object({
  schemaVersion: v.literal(1),
  category: categoryValidator,
  mode: recommendationModeValidator,
  query: v.string(),
  hardRequirementsJson: v.string(),
  preferencesJson: v.string(),
  exclusionsJson: v.string(),
  budgetJson: v.string(),
  geographyJson: v.string(),
  acceptableConditionsJson: v.string(),
  timingJson: v.string(),
  riskTolerance: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  weightsJson: v.string(),
  confirmedAt: v.union(v.number(), v.null()),
});

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    primaryEmail: v.optional(v.string()),
    displayName: v.optional(v.string()),
    locale: localeValidator,
    status: v.union(v.literal("active"), v.literal("deletion_pending"), v.literal("deleted")),
    deletionRequestedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    createdByUserId: v.id("users"),
    plan: planValidator,
    status: v.union(v.literal("active"), v.literal("suspended"), v.literal("deletion_pending")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_created_by", ["createdByUserId"]),

  memberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: roleValidator,
    status: v.union(v.literal("active"), v.literal("suspended")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_and_user", ["organizationId", "userId"]),

  invitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    emailHash: v.string(),
    role: roleValidator,
    tokenHash: v.string(),
    invitedByUserId: v.id("users"),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_email", ["organizationId", "email"])
    .index("by_token_hash", ["tokenHash"]),

  researchRequests: defineTable({
    organizationId: v.id("organizations"),
    createdByUserId: v.id("users"),
    title: v.string(),
    originalInput: v.string(),
    locale: localeValidator,
    category: categoryValidator,
    status: v.union(v.literal("draft"), v.literal("confirmed"), v.literal("archived")),
    activeFilterId: v.optional(v.id("filters")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_created_at", ["organizationId", "createdAt"])
    .index("by_organization_and_creator", ["organizationId", "createdByUserId"]),

  filters: defineTable({
    organizationId: v.id("organizations"),
    researchRequestId: v.id("researchRequests"),
    createdByUserId: v.id("users"),
    version: v.number(),
    spec: filterSpecV1Validator,
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_request_and_version", ["researchRequestId", "version"]),

  researchJobs: defineTable({
    organizationId: v.id("organizations"),
    researchRequestId: v.id("researchRequests"),
    filterId: v.id("filters"),
    requestedByUserId: v.id("users"),
    state: researchStateValidator,
    stage: researchStageValidator,
    progress: v.number(),
    priority: v.number(),
    attempt: v.number(),
    maxAttempts: v.number(),
    idempotencyKey: v.string(),
    pagesVisited: v.number(),
    maxPages: v.number(),
    runtimeSeconds: v.number(),
    maxRuntimeSeconds: v.number(),
    aiCostEur: v.number(),
    maxAiCostEur: v.number(),
    coverageJson: v.string(),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    cancelRequestedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_created_at", ["organizationId", "createdAt"])
    .index("by_state_and_next_attempt", ["state", "nextAttemptAt"])
    .index("by_request", ["researchRequestId"])
    .index("by_idempotency_key", ["idempotencyKey"]),

  jobLeases: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    acquiredAt: v.number(),
    heartbeatAt: v.number(),
    expiresAt: v.number(),
    releasedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job", ["jobId"])
    .index("by_expires_at", ["expiresAt"]),

  jobEvents: defineTable({
    organizationId: v.id("organizations"),
    jobId: v.id("researchJobs"),
    sequence: v.number(),
    type: v.string(),
    stage: researchStageValidator,
    payloadJson: v.string(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job_and_sequence", ["jobId", "sequence"]),

  offers: defineTable({
    organizationId: v.id("organizations"),
    researchJobId: v.id("researchJobs"),
    schemaVersion: v.literal(1),
    sourceId: v.string(),
    sourceOfferId: v.string(),
    identityKey: v.string(),
    canonicalUrl: v.string(),
    title: v.string(),
    category: categoryValidator,
    offerType: v.union(
      v.literal("product"),
      v.literal("vehicle"),
      v.literal("service"),
      v.literal("subscription"),
    ),
    providerName: v.union(v.string(), v.null()),
    sellerName: v.union(v.string(), v.null()),
    basePrice: nullableMoneyValidator,
    recurringPrice: nullableMoneyValidator,
    totalInitialCost: nullableMoneyValidator,
    estimatedTotalCost: nullableMoneyValidator,
    location: v.union(v.string(), v.null()),
    availability: v.union(
      v.literal("in_stock"),
      v.literal("limited"),
      v.literal("preorder"),
      v.literal("unavailable"),
      v.literal("unknown"),
    ),
    warranty: v.union(v.string(), v.null()),
    attributesJson: v.string(),
    collectedAt: v.number(),
    staleAfter: v.number(),
    currentVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job", ["researchJobId"])
    .index("by_job_and_identity", ["researchJobId", "identityKey"])
    .index("by_source_offer", ["sourceId", "sourceOfferId"]),

  offerPins: defineTable({
    organizationId: v.id("organizations"),
    researchJobId: v.id("researchJobs"),
    offerId: v.id("offers"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job_and_user", ["researchJobId", "userId"])
    .index("by_user_and_offer", ["userId", "offerId"]),

  offerVersions: defineTable({
    organizationId: v.id("organizations"),
    offerId: v.id("offers"),
    version: v.number(),
    rawContentHash: v.string(),
    normalizedJson: v.string(),
    collectedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_offer_and_version", ["offerId", "version"]),

  evidenceRecords: defineTable({
    organizationId: v.id("organizations"),
    researchJobId: v.id("researchJobs"),
    offerId: v.id("offers"),
    schemaVersion: v.literal(1),
    field: v.string(),
    sourceUrl: v.string(),
    sourceName: v.string(),
    status: verificationStatusValidator,
    confidence: v.number(),
    method: extractionMethodValidator,
    excerpt: v.union(v.string(), v.null()),
    contentHash: v.string(),
    collectedAt: v.number(),
    staleAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job", ["researchJobId"])
    .index("by_offer", ["offerId"])
    .index("by_offer_and_field", ["offerId", "field"]),

  scores: defineTable({
    organizationId: v.id("organizations"),
    researchJobId: v.id("researchJobs"),
    offerId: v.id("offers"),
    schemaVersion: v.literal(1),
    scoringModelVersion: v.string(),
    total: v.number(),
    componentsJson: v.string(),
    weightsJson: v.string(),
    penaltiesJson: v.string(),
    reasonsJson: v.string(),
    risksJson: v.string(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job_and_total", ["researchJobId", "total"])
    .index("by_offer", ["offerId"]),

  recommendations: defineTable({
    organizationId: v.id("organizations"),
    researchJobId: v.id("researchJobs"),
    offerId: v.optional(v.id("offers")),
    mode: recommendationModeValidator,
    rank: v.number(),
    headline: v.string(),
    rationale: v.string(),
    caveatsJson: v.string(),
    evidenceCoverage: v.number(),
    unsupportedClaimCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job_and_rank", ["researchJobId", "rank"]),

  savedSearches: defineTable({
    organizationId: v.id("organizations"),
    createdByUserId: v.id("users"),
    researchRequestId: v.id("researchRequests"),
    name: v.string(),
    active: v.boolean(),
    emailEnabled: v.optional(v.boolean()),
    monitoringIntervalHours: v.optional(v.number()),
    lastScheduledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_creator", ["organizationId", "createdByUserId"])
    .index("by_active_and_last_scheduled", ["active", "lastScheduledAt"]),

  alerts: defineTable({
    organizationId: v.id("organizations"),
    savedSearchId: v.id("savedSearches"),
    channel: v.union(v.literal("in_app"), v.literal("email")),
    eventType: v.string(),
    deduplicationKey: v.string(),
    payloadJson: v.string(),
    state: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_deduplication_key", ["deduplicationKey"])
    .index("by_state", ["state"]),

  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    provider: v.literal("lemon_squeezy"),
    externalCustomerId: v.optional(v.string()),
    externalSubscriptionId: v.optional(v.string()),
    externalVariantId: v.optional(v.string()),
    plan: planValidator,
    status: v.string(),
    renewsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_external_subscription", ["externalSubscriptionId"]),

  entitlements: defineTable({
    organizationId: v.id("organizations"),
    key: v.string(),
    enabled: v.boolean(),
    limit: v.optional(v.number()),
    source: v.union(v.literal("plan"), v.literal("override")),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_key", ["organizationId", "key"]),

  usageLedger: defineTable({
    organizationId: v.id("organizations"),
    kind: v.union(
      v.literal("research_job"),
      v.literal("page_fetch"),
      v.literal("ai_input_token"),
      v.literal("ai_output_token"),
      v.literal("email"),
    ),
    amount: v.number(),
    unit: v.string(),
    referenceId: v.string(),
    idempotencyKey: v.string(),
    occurredAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_occurred_at", ["organizationId", "occurredAt"])
    .index("by_organization_kind_and_occurred_at", ["organizationId", "kind", "occurredAt"])
    .index("by_idempotency_key", ["idempotencyKey"]),

  webhookDeliveries: defineTable({
    organizationId: v.optional(v.id("organizations")),
    provider: v.string(),
    externalEventId: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
    state: v.union(v.literal("received"), v.literal("processed"), v.literal("failed")),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_external_event", ["provider", "externalEventId"])
    .index("by_state", ["state"]),

  auditEvents: defineTable({
    organizationId: v.id("organizations"),
    actorUserId: v.optional(v.id("users")),
    actorType: v.union(v.literal("user"), v.literal("worker"), v.literal("system")),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    metadataJson: v.string(),
    occurredAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_occurred_at", ["organizationId", "occurredAt"]),

  modelCosts: defineTable({
    organizationId: v.id("organizations"),
    researchJobId: v.optional(v.id("researchJobs")),
    model: v.string(),
    purpose: v.union(
      v.literal("filter_structuring"),
      v.literal("extraction"),
      v.literal("normalization"),
      v.literal("dispute"),
      v.literal("synthesis"),
    ),
    inputTokens: v.number(),
    cachedInputTokens: v.number(),
    cacheWriteTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.number(),
    estimatedCostUsd: v.number(),
    estimatedCostEur: v.number(),
    usdToEurRate: v.number(),
    pricingVersion: v.string(),
    requestId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_job", ["researchJobId"])
    .index("by_organization_and_request_id", ["organizationId", "requestId"])
    .index("by_job_and_request_id", ["researchJobId", "requestId"]),

  sourceHealth: defineTable({
    sourceId: v.string(),
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("blocked"),
      v.literal("disabled"),
      v.literal("legal_review_required"),
    ),
    robotsReviewedAt: v.number(),
    termsReviewedAt: v.number(),
    lastCheckedAt: v.number(),
    lastSuccessAt: v.optional(v.number()),
    consecutiveFailures: v.number(),
    latencyMs: v.optional(v.number()),
    detail: v.string(),
  }).index("by_source_id", ["sourceId"]),

  webVitals: defineTable({
    organizationId: v.optional(v.id("organizations")),
    route: v.string(),
    metric: v.union(v.literal("LCP"), v.literal("INP"), v.literal("CLS"), v.literal("TTFB")),
    value: v.number(),
    rating: v.union(v.literal("good"), v.literal("needs-improvement"), v.literal("poor")),
    navigationType: v.string(),
    appVersion: v.string(),
    recordedAt: v.number(),
  })
    .index("by_metric_and_recorded_at", ["metric", "recordedAt"])
    .index("by_organization_and_recorded_at", ["organizationId", "recordedAt"]),

  workerNonces: defineTable({
    nonce: v.string(),
    workerId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_nonce", ["nonce"])
    .index("by_expires_at", ["expiresAt"]),

  workerRequests: defineTable({
    workerId: v.string(),
    idempotencyKey: v.string(),
    path: v.string(),
    bodyHash: v.string(),
    state: v.union(v.literal("processing"), v.literal("completed")),
    responseJson: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index("by_worker_and_key", ["workerId", "idempotencyKey"])
    .index("by_expires_at", ["expiresAt"]),

  waitlist: defineTable({
    normalizedEmail: v.string(),
    emailHash: v.string(),
    locale: localeValidator,
    categoriesJson: v.string(),
    consentVersion: v.string(),
    source: v.string(),
    createdAt: v.number(),
  }).index("by_normalized_email", ["normalizedEmail"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStartedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expires_at", ["expiresAt"]),

  applicationSettings: defineTable({
    key: v.string(),
    valueJson: v.string(),
    sensitive: v.boolean(),
    updatedByUserId: v.optional(v.id("users")),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
