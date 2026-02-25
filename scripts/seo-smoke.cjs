// SPDX-License-Identifier: LicenseRef-SA-NC-1.0
/* Smoke SEO minimal avec Puppeteer : vérifie canonical / et /explain/bill/ (+ fallback) */
const puppeteer = require("puppeteer");

const BASE = (process.argv[2] || "https://documate.work/").replace(/\/+$/, "") + "/";
function url(...parts){ return BASE + parts.join("").replace(/^\/+/, ""); }

async function open(page, target) {
  process.stdout.write(`\n→ Opening ${target}\n`);
  const res = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
  return res;
}

async function waitCanonical(page, timeout=20000) {
  await page.waitForFunction(() => !!document.querySelector('link[rel="canonical"]'), { timeout });
  return page.evaluate(() => {
    const l = document.querySelector('link[rel="canonical"]');
    return l ? l.href : null;
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox","--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  // 1) HOME
  await open(page, url("/"));
  const homeCanon = await waitCanonical(page);
  if (homeCanon !== url("/")) {
    console.error(`❌ ${url("/")} canonical mismatch (seen: "${homeCanon || "(missing)"}")`);
    await browser.close(); process.exit(1);
  }
  console.log(`✅ OK: ${url("/")} (canonical: ${homeCanon})`);

  // 2) TOPIC BILL
  const pretty = url("/explain/bill/");
  const fallback = url("/index.html?topic=bill");

  await open(page, pretty);
  let canon = null;
  try { canon = await waitCanonical(page, 15000); } catch {}

  const expect = pretty;
  if (!canon || !canon.toLowerCase().startsWith(expect.toLowerCase())) {
    console.log(`   ↪ Fallback to ${fallback}`);
    await open(page, fallback);
    try { canon = await waitCanonical(page, 20000); } catch {}
  }

  if (canon && canon.toLowerCase().startsWith(expect.toLowerCase())) {
    console.log(`✅ OK: ${pretty} (canonical: ${canon})`);
    await browser.close(); process.exit(0);
  } else {
    console.error(`❌ Fallback failed for ${pretty} (canonical seen: "${canon || "(missing)"}")`);
    await browser.close(); process.exit(1);
  }
})();
