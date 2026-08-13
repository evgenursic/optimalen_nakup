import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export interface WorkerSignatureInput {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  idempotencyKey: string;
  body: string;
}

export function canonicalWorkerPayload(input: WorkerSignatureInput): string {
  return [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.nonce,
    input.idempotencyKey,
    input.body,
  ].join("\n");
}

export function signWorkerRequest(input: WorkerSignatureInput, secret: string): string {
  return createHmac("sha256", secret).update(canonicalWorkerPayload(input)).digest("hex");
}

export function verifyWorkerSignature(
  input: WorkerSignatureInput,
  signature: string,
  secret: string,
): boolean {
  if (!/^[a-f0-9]{64}$/.test(signature)) {
    return false;
  }
  const expected = Buffer.from(signWorkerRequest(input, secret), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!/^[a-f0-9]{64}$/.test(signature)) {
    return false;
  }
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function assertFreshTimestamp(
  timestamp: string,
  now = Date.now(),
  maximumSkewMs = 5 * 60 * 1_000,
): void {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed) || Math.abs(now - parsed) > maximumSkewMs) {
    throw new Error("Request timestamp is outside the allowed window");
  }
}

export function isPrivateIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".").map(Number);
    const first = octets[0] ?? -1;
    const second = octets[1] ?? -1;
    return (
      first === 0 ||
      first === 10 ||
      (first === 100 && second >= 64 && second <= 127) ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 198 && second === 51) ||
      (first === 203 && second === 0) ||
      first >= 224
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    const ipv4Mapped = normalized.match(/^(?:::ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (ipv4Mapped?.[1]) {
      return isPrivateIpAddress(ipv4Mapped[1]);
    }
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8:") ||
      (!normalized.startsWith("2") && !normalized.startsWith("3"))
    );
  }
  return true;
}

export function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
