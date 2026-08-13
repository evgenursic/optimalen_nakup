const fs = require("node:fs");
const path = require("node:path");

module.exports = async (browser) => {
  const statePath = path.resolve(".auth/lighthouse-storage-state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const page = await browser.newPage();

  const cookies = (state.cookies || []).map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }));
  if (cookies.length > 0) {
    await page.setCookie(...cookies);
  }

  for (const originState of state.origins || []) {
    await page.goto(originState.origin, { waitUntil: "domcontentloaded" });
    await page.evaluate((items) => {
      for (const item of items) localStorage.setItem(item.name, item.value);
    }, originState.localStorage || []);
  }
  await page.close();
};
