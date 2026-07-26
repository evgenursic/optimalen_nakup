import { describe, expect, it } from "vitest";

import {
  assertFreshTimestamp,
  escapeCsvCell,
  isPrivateIpAddress,
  signWorkerRequest,
  verifyWorkerSignature,
  type WorkerSignatureInput,
} from "./index.js";

const input: WorkerSignatureInput = {
  method: "POST",
  path: "/worker/jobs/claim",
  timestamp: "2026-07-26T12:00:00.000Z",
  nonce: "nonce-1",
  idempotencyKey: "request-1",
  body: "{}",
};

describe("worker signatures", () => {
  it("accepts a matching HMAC and rejects changed content", () => {
    const signature = signWorkerRequest(input, "a".repeat(32));
    expect(verifyWorkerSignature(input, signature, "a".repeat(32))).toBe(true);
    expect(verifyWorkerSignature({ ...input, body: '{"x":1}' }, signature, "a".repeat(32))).toBe(
      false,
    );
  });
});

describe("network and export controls", () => {
  it("recognizes private network ranges", () => {
    expect(isPrivateIpAddress("127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("169.254.169.254")).toBe(true);
    expect(isPrivateIpAddress("8.8.8.8")).toBe(false);
  });

  it("rejects stale timestamps and escapes spreadsheet formulas", () => {
    expect(() =>
      assertFreshTimestamp("2026-07-26T12:00:00.000Z", Date.parse("2026-07-26T12:10:00.000Z")),
    ).toThrow();
    expect(escapeCsvCell("=SUM(A1:A2)")).toBe('"\'=SUM(A1:A2)"');
  });
});
