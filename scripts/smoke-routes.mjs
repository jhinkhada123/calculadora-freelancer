const baseUrl = process.argv[2] || "https://calculadora-freelancer-orpin.vercel.app";

const checks = [
  { path: "/", type: "html" },
  { path: "/head-init.js", type: "js" },
  { path: "/calculadora.js", type: "js" },
  { path: "/compliance.js", type: "js" },
  { path: "/privacidade.html", type: "html" },
  { path: "/privacidade", type: "html" },
  {
    path: "/?view=client&currency=BRL&projectNet=5000&projectHours=40&professionalName=QA&validityDate=2026-12-31",
    type: "html",
    clientView: true,
  },
  {
    path: "/?areaImpacto=%3Cscript%3Ealert(1)%3C%2Fscript%3E&impactoNoNegocio=critico",
    type: "html",
    xssCheck: true,
  },
];

function passType(contentType, type) {
  if (!contentType) return false;
  if (type === "js") return /javascript|ecmascript|text\/plain/i.test(contentType);
  if (type === "html") return /text\/html/i.test(contentType);
  return true;
}

const CLIENT_VIEW_MARKERS = ["clientViewContainer", "clientViewTotal"];

const rows = [];
for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  try {
    const method = check.clientView || check.xssCheck ? "GET" : "HEAD";
    const res = await fetch(url, { method });
    const ct = res.headers.get("content-type") || "";
    let pass = res.status === 200 && passType(ct, check.type);
    if (pass && check.clientView) {
      const html = await res.text();
      pass = CLIENT_VIEW_MARKERS.every((m) => html.includes(m));
    }
    if (pass && check.xssCheck) {
      const html = await res.text();
      pass = !html.includes("<script>alert(1)</script>") && (html.includes("&lt;script&gt;") || html.includes("areaImpacto"));
    }
    rows.push({ url, status: res.status, contentType: ct, pass });
  } catch (err) {
    rows.push({ url, status: "ERR", contentType: "-", pass: false, error: String(err) });
  }
}

console.table(rows);
const allPass = rows.every((r) => r.pass);
console.log(`\nFinal verdict: ${allPass ? "GO-LIVE READY" : "NOT READY"}`);
process.exit(allPass ? 0 : 1);
