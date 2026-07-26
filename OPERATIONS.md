# Operations

## Service objectives

- Application and worker health endpoints
- Worker heartbeat and lease expiry monitoring
- Source success rate, extraction drift, response latency, and circuit-breaker state
- Queue depth, job completion, page coverage, AI tokens/cost, and alert delivery
- Web Vitals by route, device class, and application version without direct identifiers

## Logging

Structured JSON logs carry correlation, organization, job, adapter, and application version
identifiers where appropriate. Prompts, page bodies, tokens, payment data, passwords, and direct
personal contact details are excluded.

## Incident handling

Use the admin kill switch for runaway collection, preserve evidence and job state, rotate affected
credentials, and record an audit event. Source-specific repeated failures open the circuit and do
not fail unaffected adapters.
