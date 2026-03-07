import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXCLUDE_DIR = new Set([".git", "node_modules", "dist"]);
const EXT_ALLOW = new Set([".js", ".mjs", ".html", ".md", ".json", ".txt"]);

const BAD_PATTERNS = [
  "Ãƒ",
  "Ã¢",
  "Ã‚",
  "Ã°",
  "Ãâ",
  "â‚¬",
  "â„¢",
  "â€œ",
  "â€",
  "â€”",
  "â€“",
  "â€¦",
  "Â·",
  "�",
];

const BAD_REGEX = new RegExp(BAD_PATTERNS.map((p) => escapeRegex(p)).join("|"), "g");

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith(".")) {
      if (ent.name === ".env") out.push(path.join(dir, ent.name));
      continue;
    }
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (EXCLUDE_DIR.has(ent.name)) continue;
      walk(abs, out);
      continue;
    }
    if (!EXT_ALLOW.has(path.extname(ent.name).toLowerCase())) continue;
    out.push(abs);
  }
  return out;
}

function scoreLine(line) {
  const m = line.match(BAD_REGEX);
  return m ? m.length : 0;
}

function scanFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/);
  const hits = [];
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    const count = scoreLine(lines[i]);
    if (!count) continue;
    total += count;
    hits.push({ line: i + 1, text: lines[i].trim(), count });
  }
  return { file, total, hits };
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

const files = walk(ROOT);
const report = files
  .map(scanFile)
  .filter((r) => r.total > 0)
  .sort((a, b) => b.total - a.total);

if (!report.length) {
  console.log("No mojibake patterns found.");
  process.exit(0);
}

console.log("=== Mojibake Scan Summary ===");
for (const r of report.slice(0, 50)) {
  console.log(`${rel(r.file)}\t${r.total}`);
}

console.log("\n=== Critical UI/PDF files ===");
const critical = report.filter((r) => {
  const p = rel(r.file);
  return (
    p === "app.js" ||
    p === "index.html" ||
    p.includes("pdf-") ||
    p === "calculadora.js" ||
    p === "compliance.js"
  );
});

for (const r of critical) {
  console.log(`\n[${rel(r.file)}] total=${r.total}`);
  for (const h of r.hits.slice(0, 30)) {
    console.log(`  L${h.line}: ${h.text}`);
  }
}
