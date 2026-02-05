"use strict";
// SPDX quick-fix (CommonJS, idempotent).
// Ajoute un en-tête SPDX si manquant pour: js,cjs,mjs,ts,cts,mts,jsx,tsx,css,html,sh.
// N'échoue jamais: code de sortie 0 même si aucun fichier modifié.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const LICENSE = "LicenseRef-SA-NC-1.0";
const SPDX_RX = /SPDX-License-Identifier:\s*LicenseRef-SA-NC-1\.0/i;

// extensions cibles -> "style" de commentaire
const COMMENT_STYLE = {
  js: "block", cjs: "block", mjs: "block",
  ts: "block", cts: "block", mts: "block",
  jsx: "block", tsx: "block",
  css: "block",
  html: "html",
  sh: "hash"
};

const SKIP_DIRS = new Set([
  ".git", ".github", "node_modules", ".vercel", ".next",
  "dist", "build", "out", ".output"
]);

const TARGET_EXTS = new Set(Object.keys(COMMENT_STYLE));

// utils
function listFiles(dir) {
  /** @type {string[]} */
  const out = [];
  (function walk(d) {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith(".")) {
        if (SKIP_DIRS.has(e.name)) continue;
      }
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(p);
      } else if (e.isFile()) {
        out.push(p);
      }
    }
  })(dir);
  return out;
}

function extOf(file) {
  const b = path.basename(file);
  const m = b.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "";
}

function hasSpdxTop(content) {
  // Cherche dans les ~15 premières lignes
  const head = content.slice(0, 400);
  return SPDX_RX.test(head);
}

function makeHeader(style) {
  if (style === "html") {
    return "<!-- SPDX-License-Identifier: " + LICENSE + " -->\n";
  }
  if (style === "hash") {
    return "# SPDX-License-Identifier: " + LICENSE + "\n";
  }
  // block
  return "/* SPDX-License-Identifier: " + LICENSE + " */\n";
}

function insertHeader(content, ext, style) {
  const header = makeHeader(style);

  // shebang (#!) : insérer juste après
  if (/^#!/.test(content)) {
    const nl = content.indexOf("\n");
    if (nl !== -1) return content.slice(0, nl + 1) + header + content.slice(nl + 1);
  }

  // HTML: conserver le doctype en 1ère ligne
  if (ext === "html") {
    const m = content.match(/^\s*<!doctype[^>]*>\s*/i);
    if (m) {
      const p = m[0].length;
      return content.slice(0, p) + header + content.slice(p);
    }
  }

  // par défaut: en tout début
  return header + content;
}

function shouldProcess(file) {
  const ext = extOf(file);
  if (!TARGET_EXTS.has(ext)) return false;

  // on exclut certains noms fréquemment dérivés
  const base = path.basename(file);
  if (base === "LICENSE" || base === "LICENSE.txt") return false;

  return true;
}

let changed = 0;
const files = listFiles(ROOT);
for (const f of files) {
  if (!shouldProcess(f)) continue;
  let content;
  try { content = fs.readFileSync(f, "utf8"); } catch { continue; }

  if (hasSpdxTop(content)) continue;

  const ext = extOf(f);
  const style = COMMENT_STYLE[ext];
  if (!style) continue;

  const next = insertHeader(content, ext, style);
  if (next !== content) {
    try {
      fs.writeFileSync(f, next, "utf8");
      console.log(`+ SPDX added: ${path.relative(ROOT, f)}`);
      changed++;
    } catch (e) {
      console.error(`! Failed to write ${f}:`, e && e.message ? e.message : e);
    }
  }
}

console.log(changed ? `Done. Updated ${changed} file(s).` : "Done. No changes needed.");
process.exit(0);
