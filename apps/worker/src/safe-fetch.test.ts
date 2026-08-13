import { describe, expect, it } from "vitest";

import { resolvePublicAddresses, resolveRedirectUrl } from "./safe-fetch.js";

describe("resolvePublicAddresses", () => {
  it("rejects every target when any DNS result is private", async () => {
    await expect(
      resolvePublicAddresses("example.test", async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]),
    ).rejects.toThrow("blocked address");
  });

  it("accepts public-only DNS results and blocks local hostnames", async () => {
    await expect(
      resolvePublicAddresses("example.test", async () => [{ address: "93.184.216.34", family: 4 }]),
    ).resolves.toEqual([{ address: "93.184.216.34", family: 4 }]);
    await expect(
      resolvePublicAddresses("metadata.internal", async () => [
        { address: "93.184.216.34", family: 4 },
      ]),
    ).rejects.toThrow("Blocked host");
  });
});

describe("redirect validation", () => {
  it("resolves relative redirects without allowing URL validation to be skipped", () => {
    expect(
      resolveRedirectUrl(new URL("https://source.example/catalog"), "/robots.txt").toString(),
    ).toBe("https://source.example/robots.txt");
    expect(() =>
      resolveRedirectUrl(new URL("https://source.example/catalog"), "file:///secret"),
    ).toThrow("Blocked URL");
  });
});
