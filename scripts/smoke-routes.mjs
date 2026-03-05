const baseUrl = process.argv[2] || "https://calculadora-freelancer-orpin.vercel.app";

const checks = [
  { path: "/", type: "html" },
  { path: "/calculadora.js", type: "js" },
  { path: "/compliance.js", type: "js" },
  { path: "/privacidade.html", type: "html" },
  { path: "/privacidade", type: "html" },
];

function passType(contentType, type) {
  if (!contentType) return false;
  if (type === "js") return /javascript|ecmascript|text\/plain/i.test(contentType);
  if (type === "html") return /text\/html/i.test(contentType);
  return true;
}

const rows = [];
for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ct = res.headers.get("content-type") || "";
    const pass = res.status === 200 && passType(ct, check.type);
    rows.push({ url, status: res.status, contentType: ct, pass });
  } catch (err) {
    rows.push({ url, status: "ERR", contentType: "-", pass: false, error: String(err) });
  }
}

console.table(rows);
const allPass = rows.every((r) => r.pass);
console.log(`\nFinal verdict: ${allPass ? "GO-LIVE READY" : "NOT READY"}`);
process.exit(allPass ? 0 : 1);
