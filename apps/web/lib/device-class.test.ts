import { describe, expect, it } from "vitest";

import { classifyDevice } from "./device-class";

describe("classifyDevice", () => {
  it("prefers the client hint for mobile devices", () => {
    expect(classifyDevice(new Headers({ "sec-ch-ua-mobile": "?1" }))).toBe("mobile");
  });

  it("distinguishes tablets from Android phones", () => {
    expect(
      classifyDevice(
        new Headers({
          "user-agent":
            "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        }),
      ),
    ).toBe("tablet");
    expect(
      classifyDevice(
        new Headers({
          "user-agent":
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36",
        }),
      ),
    ).toBe("mobile");
  });

  it("uses a coarse desktop or unknown fallback without retaining the user agent", () => {
    expect(classifyDevice(new Headers({ "user-agent": "Mozilla/5.0 (Windows NT 10.0)" }))).toBe(
      "desktop",
    );
    expect(classifyDevice(new Headers())).toBe("unknown");
  });
});
