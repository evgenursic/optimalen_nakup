export type DeviceClass = "mobile" | "tablet" | "desktop" | "unknown";

const tabletUserAgentPattern = /(?:ipad|tablet|kindle|silk|playbook|android(?!.*(?:mobile|mobi)))/i;
const mobileUserAgentPattern =
  /(?:iphone|ipod|android.*(?:mobile|mobi)|windows phone|blackberry|opera mini|mobile)/i;

export function classifyDevice(headers: Headers): DeviceClass {
  const userAgent = headers.get("user-agent")?.slice(0, 1_000) ?? "";

  if (tabletUserAgentPattern.test(userAgent)) {
    return "tablet";
  }
  if (headers.get("sec-ch-ua-mobile") === "?1" || mobileUserAgentPattern.test(userAgent)) {
    return "mobile";
  }
  if (userAgent || headers.get("sec-ch-ua-mobile") === "?0") {
    return "desktop";
  }
  return "unknown";
}
