export const RISK_LABELS = ["risk:low", "risk:medium", "risk:high"];

export const HIGH_RISK_RULES = [
  { id: "motor-core", pattern: /^calculadora\.js$/ },
  { id: "contract-proposal-metrics", pattern: /^proposal-metrics\.js$/ },
  { id: "engine-agency", pattern: /^advanced-pricing\.js$/ },
  { id: "engine-inacao", pattern: /^strategist-mode\.js$/ },
  { id: "engine-batna", pattern: /^negotiation-v21\.js$/ },
  { id: "engine-tiers", pattern: /^proposal-tiers\.js$/ },
  { id: "schema-sanitize", pattern: /^utils\/sanitize-state\.js$/ },
  { id: "schema-storage", pattern: /^utils\/storage\.js$/ },
];

export const MEDIUM_RISK_RULES = [
  { id: "ui-orchestration", pattern: /^app\.js$/ },
  { id: "ui-structure", pattern: /^index\.html$/ },
  { id: "feature-flags", pattern: /^feature-flags\.js$/ },
  { id: "pdf-client", pattern: /^pdf-.*\.js$/ },
  { id: "ui-modes", pattern: /^ui-mode-constants\.js$/ },
];

function matchRules(files, rules) {
  const matches = [];
  for (const file of files) {
    for (const rule of rules) {
      if (rule.pattern.test(file)) {
        matches.push({ file, ruleId: rule.id });
      }
    }
  }
  return matches;
}

export function classifyRiskFromFiles(files = []) {
  const normalized = files
    .filter((f) => typeof f === "string" && f.trim() !== "")
    .map((f) => f.replace(/\\/g, "/"));

  const highMatches = matchRules(normalized, HIGH_RISK_RULES);
  if (highMatches.length > 0) {
    return {
      level: "high",
      label: "risk:high",
      matches: highMatches,
      files: normalized,
    };
  }

  const mediumMatches = matchRules(normalized, MEDIUM_RISK_RULES);
  if (mediumMatches.length > 0) {
    return {
      level: "medium",
      label: "risk:medium",
      matches: mediumMatches,
      files: normalized,
    };
  }

  return {
    level: "low",
    label: "risk:low",
    matches: [],
    files: normalized,
  };
}

export function formatRiskReasons(classification) {
  if (!classification || !Array.isArray(classification.matches) || classification.matches.length === 0) {
    return "No high/medium sensitive paths matched.";
  }

  const lines = classification.matches.map(
    (m) => `- ${m.file} (rule: ${m.ruleId})`
  );
  return lines.join("\n");
}
