import { verifyWorkerSignature } from "@optimalen-nakup/security";
import { describe, expect, it, vi } from "vitest";

import { WorkerProtocolClient } from "./protocol.js";

function requiredHeader(request: Request, name: string): string {
  const value = request.headers.get(name);
  if (!value) {
    throw new Error(`Missing ${name} header`);
  }
  return value;
}

describe("WorkerProtocolClient", () => {
  it("signs the exact body and retains the idempotency key across a retry", async () => {
    const secret = "s".repeat(32);
    const requests: Request[] = [];
    const fetchMock = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      if (requests.length === 1) {
        return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true, data: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const nonces = ["nonce-0000000000000001", "nonce-0000000000000002"];
    const client = new WorkerProtocolClient({
      baseUrl: "http://localhost:3211",
      workerId: "worker-test",
      sharedSecret: secret,
      fetch: fetchMock,
      now: () => new Date("2026-07-26T12:00:00.000Z"),
      nonce: () => {
        const nonce = nonces.shift();
        if (!nonce) {
          throw new Error("Test nonce sequence exhausted");
        }
        return nonce;
      },
      sleep: async () => undefined,
    });

    await expect(client.complete("job-1", "l".repeat(32), false, {})).resolves.toBeUndefined();
    expect(requests).toHaveLength(2);
    const [first, second] = requests;
    if (!first || !second) {
      throw new Error("Expected two protocol requests");
    }
    expect(first.headers.get("x-idempotency-key")).toBe(second.headers.get("x-idempotency-key"));
    expect(first.headers.get("x-worker-nonce")).not.toBe(second.headers.get("x-worker-nonce"));
    const body = await first.text();
    expect(
      verifyWorkerSignature(
        {
          method: "POST",
          path: "/worker/jobs/complete",
          timestamp: requiredHeader(first, "x-worker-timestamp"),
          nonce: requiredHeader(first, "x-worker-nonce"),
          idempotencyKey: requiredHeader(first, "x-idempotency-key"),
          body,
        },
        requiredHeader(first, "x-worker-signature"),
        secret,
      ),
    ).toBe(true);
  });

  it("refuses cleartext worker transport outside local development", () => {
    expect(
      () =>
        new WorkerProtocolClient({
          baseUrl: "http://example.com",
          workerId: "worker-test",
          sharedSecret: "s".repeat(32),
        }),
    ).toThrow("requires HTTPS");
  });
});
