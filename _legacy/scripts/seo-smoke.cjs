// SPDX-License-Identifier: LicenseRef-SA-NC-1.0
/* Smoke SEO: vérifie les canonicals des pages. */
const puppeteer = require("puppeteer");

const BASE = (process.argv[2] || "https://documate.work/").replace(/\/+$/, "") + "/";
function abs(p){ return BASE + p.replace(/^\/+/, ""); }

const CHECKS = [
  { url: "/", expect: "/" },
  { url: "/explain/bill/", expect: "/explain/bill/", fallback: "/?topic=bill" },
  { url: "/explain/contract/", expect: "/explain/contract/", fallback: "/?topic=contract" },
  { url: "/fr/", expect: "/fr/" },
  { url: "/fr/expliquer/facture/", expect: "/fr/expliquer/facture/", fallback: "/fr/?topic=bill" },
  { url: "/fr/expliquer/contrat/", expect: "/fr/expliquer/contrat/", fallback: "/fr/?topic=contract" }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox","--disable-dev-shm-usage"]
  });

  try {
    const page = await browser.newPage();

    // Désactive le cache et force une requête fraîche
    await page.setCacheEnabled(false);
    await page.setExtraHTTPHeaders({
      "Cache-Control": "no-cache, no-store, max-age=0",
      "Pragma": "no-cache",
      "User-Agent": "Documate-SEO-SMOKE/1.0"
    });

    async function open(url) {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!res) throw new Error(`No response for ${url}`);
      const status = res.status();
      // Accepte 200 et 304 (chargé depuis cache => DOM dispo)
      if (![200, 304].includes(status)) throw new Error(`${url} returned ${status}`);
      return res;
    }

    for (const c of CHECKS) {
      const target = abs(c.url);
      process.stdout.write(`\n→ Opening ${target}\n`);
      await open(target);

      // Laisse le bootstrap poser la canonical
      await page.waitForFunction(() => !!document.querySelector('link[rel="canonical"]'), { timeout: 15000 });
      let canon = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href || null);

      const expectAbs = abs(c.expect);
      if (!canon || !canon.toLowerCase().startsWith(expectAbs.toLowerCase())) {
        if (c.fallback) {
          const fb = abs(c.fallback);
          console.log(`   ↪ Fallback to ${fb}`);
          await open(fb);
          await page.waitForFunction(() => !!document.querySelector('link[rel="canonical"]'), { timeout: 15000 });
          canon = await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href || null);
        }
      }

      if (!canon || !canon.toLowerCase().startsWith(expectAbs.toLowerCase())) {
        throw new Error(`Fallback failed for ${target} (canonical seen: "${canon || "(missing)"}")`);
      }

      console.log(`✅ OK: ${target} (canonical: ${canon})`);
    }
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
