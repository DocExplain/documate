#!/usr/bin/env node
/**
 * SPDX quick-fix: add missing SPDX header to text-based files (idempotent).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { globby } from "globby";
const SPDX = "SPDX-License-Identifier: LicenseRef-SA-NC-1.0";
const exts = ["html","xml","txt","js","cjs","mjs","ts","tsx","css","md","yml","yaml","sh"];
const files = await globby([
  `**/*.{${exts.join(",")}}`,
  "!node_modules/**",
  "!.git/**",
  "!.vercel/**"
]);
for (const f of files) {
  let s = readFileSync(f, "utf8");
  if (s.includes(SPDX)) continue;
  const isHtml = f.endsWith(".html") || f.endsWith(".xml");
  const isCss  = f.endsWith(".css");
  const isSh   = f.endsWith(".sh");
  const isYaml = f.endsWith(".yml") || f.endsWith(".yaml");
  const isJsTs = /\.(c|m)?js$|\.tsx?$/.test(f);
  let header;
  if (isHtml) header = `<!-- ${SPDX} -->\\n`;
  else if (isCss) header = `/* ${SPDX} */\\n`;
  else if (isYaml) header = `# ${SPDX}\\n`;
  else if (isSh) header = `# ${SPDX}\\n`;
  else if (isJsTs) header = `// ${SPDX}\\n`;
  else header = `# ${SPDX}\\n`;
  if (isHtml && /^<!doctype/i.test(s)) {
    s = s.replace(/^(<!doctype[^>]*>\\s*)/i, `$1${header}`);
  } else {
    s = header + s;
  }
  writeFileSync(f, s, "utf8");
}
console.log(`SPDX ensured in ${files.length} files`);
