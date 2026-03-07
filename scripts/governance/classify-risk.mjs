import fs from "node:fs";
import process from "node:process";
import { classifyRiskFromFiles, formatRiskReasons, RISK_LABELS } from "./risk-rules.mjs";

function appendOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const serialized = String(value ?? "");
  if (serialized.includes("\n")) {
    fs.appendFileSync(outputPath, `${name}<<__CODEx__\n${serialized}\n__CODEx__\n`, "utf8");
  } else {
    fs.appendFileSync(outputPath, `${name}=${serialized}\n`, "utf8");
  }
}

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

async function fetchPullRequestFiles({ apiUrl, repo, prNumber, token }) {
  const files = [];
  let page = 1;
  while (true) {
    const url = `${apiUrl}/repos/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "governance-risk-classifier",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status} while listing PR files.`);
    }

    const chunk = await response.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;

    for (const item of chunk) {
      if (item && typeof item.filename === "string") files.push(item.filename);
    }

    if (chunk.length < 100) break;
    page += 1;
  }

  return files;
}

async function syncRiskLabels({ apiUrl, repo, prNumber, token, keepLabel }) {
  if (!token || !repo || !prNumber) return;

  await fetch(`${apiUrl}/repos/${repo}/issues/${prNumber}/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "governance-risk-classifier",
    },
    body: JSON.stringify({ labels: [keepLabel] }),
  });

  const removals = RISK_LABELS.filter((label) => label !== keepLabel);
  for (const label of removals) {
    await fetch(
      `${apiUrl}/repos/${repo}/issues/${prNumber}/labels/${encodeURIComponent(label)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "governance-risk-classifier",
        },
      }
    );
  }
}

async function main() {
  const event = loadEvent();
  const pr = event?.pull_request;

  if (!pr) {
    appendOutput("risk_level", "low");
    appendOutput("risk_label", "risk:low");
    appendOutput("risk_reason", "Not a pull_request event.");
    appendSummary("## Governance Risk\n- Event is not pull_request. Defaulting to risk:low.");
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";

  let changedFiles = [];

  if (token && repo) {
    changedFiles = await fetchPullRequestFiles({
      apiUrl,
      repo,
      prNumber: pr.number,
      token,
    });
  }

  const classification = classifyRiskFromFiles(changedFiles);
  const reason = formatRiskReasons(classification);

  appendOutput("risk_level", classification.level);
  appendOutput("risk_label", classification.label);
  appendOutput("risk_reason", reason);
  appendOutput("risk_matches", JSON.stringify(classification.matches));
  appendOutput("changed_files", JSON.stringify(changedFiles));

  appendSummary("## Governance Risk Classification");
  appendSummary(`- level: \`${classification.level}\``);
  appendSummary(`- label: \`${classification.label}\``);
  appendSummary(`- changed files: \`${changedFiles.length}\``);
  appendSummary("- origin:");
  appendSummary(reason.split("\n").map((line) => `  ${line}`).join("\n"));

  await syncRiskLabels({
    apiUrl,
    repo,
    prNumber: pr.number,
    token,
    keepLabel: classification.label,
  });
}

main().catch((error) => {
  appendSummary("## Governance Risk Classification\n- status: failed");
  appendSummary(`- error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
