import fs from "node:fs";
import process from "node:process";

const REQUIRED_HIGH_RISK_SECTIONS = [
  "Risk Classification",
  "Evidence",
  "Rollback + Migration",
  "Golden Dataset",
  "Monotonicity",
  "Post-merge Observability",
];

function appendSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  fs.appendFileSync(summaryPath, `${markdown}\n`, "utf8");
}

function loadEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  const raw = fs.readFileSync(eventPath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function sectionContent(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^##\\s+${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n##\\s+|\\s*$)`, "im");
  const match = markdown.match(regex);
  return match ? match[1].trim() : "";
}

function hasMeaningfulContent(content) {
  if (!content) return false;

  const normalized = content
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/[-*]\s*\[ \]\s*/g, "")
    .trim();

  if (normalized.length < 12) return false;

  if (/(todo|tbd|a definir|preencher|n\/a|nao se aplica|none)/i.test(normalized)) {
    return false;
  }

  return /[A-Za-zÀ-ÿ0-9]/.test(normalized);
}

function hasOverrideLabel(labels = []) {
  return labels.some((label) => label?.name === "governance:override");
}

function validateHighRiskBody(body, labels, riskReason) {
  const failures = [];

  if (!riskReason || riskReason.trim() === "" || riskReason.includes("No high/medium sensitive paths matched")) {
    failures.push("risk:high sem origem de classificacao publicada (risk_reason vazio).");
  }

  for (const section of REQUIRED_HIGH_RISK_SECTIONS) {
    const content = sectionContent(body, section);
    if (!hasMeaningfulContent(content)) {
      failures.push(`secao obrigatoria ausente ou vazia: \"${section}\"`);
    }
  }

  if (hasOverrideLabel(labels)) {
    const overrideContent = sectionContent(body, "Override Justification");
    if (!hasMeaningfulContent(overrideContent)) {
      failures.push("label governance:override exige secao \"Override Justification\" preenchida.");
    }
  }

  return failures;
}

function main() {
  const event = loadEvent();
  const pr = event?.pull_request;
  const riskLevel = (process.env.RISK_LEVEL || "low").toLowerCase();
  const riskReason = process.env.RISK_REASON || "";

  if (!pr) {
    appendSummary("## Governance Evidence\n- Not a pull_request event. Skipping.");
    return;
  }

  if (riskLevel !== "high") {
    appendSummary("## Governance Evidence\n- risk level is not high; high-risk evidence gate skipped.");
    return;
  }

  const body = pr.body || "";
  const labels = Array.isArray(pr.labels) ? pr.labels : [];
  const failures = validateHighRiskBody(body, labels, riskReason);

  appendSummary("## Governance Evidence (risk:high)");
  appendSummary(`- PR: #${pr.number}`);
  appendSummary(`- failures: ${failures.length}`);

  if (failures.length > 0) {
    for (const failure of failures) {
      appendSummary(`- ${failure}`);
    }
    console.error("Governance evidence gate failed:\n" + failures.join("\n"));
    process.exit(1);
  }

  appendSummary("- All mandatory evidence sections are present and meaningful.");
}

main();


