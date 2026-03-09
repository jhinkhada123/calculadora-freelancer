import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "app.js");
const htmlPath = join(__dirname, "index.html");

function getFunctionBlock(content, fnName, nextFnName) {
  const startNeedle = `function ${fnName}(`;
  const nextNeedle = `function ${nextFnName}(`;
  const start = content.indexOf(startNeedle);
  if (start < 0) return "";
  const end = content.indexOf(nextNeedle, start);
  if (end < 0) return content.slice(start);
  return content.slice(start, end);
}

describe("pricing ui traceability wiring", () => {
  test("app defines traceability state and canonical helpers", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toMatch(/traceabilityUiState\s*=\s*\{ activeMetric: null, activeInputKeys: \[\] \}/);
    expect(content).toMatch(/function getCanonicalTraceMetricName\(metric\)/);
    expect(content).toMatch(/function resolveTraceabilityDrivers\(metric, vm\)/);
    expect(content).toMatch(/function bindTraceabilityModeEvents\(\)/);
    expect(content).toMatch(/syncTraceabilityModeWithVm\(vm\)/);
  });

  test("traceability events support desktop hover and mobile tap", () => {
    const content = readFileSync(appPath, "utf-8");
    const block = getFunctionBlock(content, "bindTraceabilityModeEvents", "getProjectPricingUiInputs");

    expect(block).toMatch(/mouseenter/);
    expect(block).toMatch(/mouseleave/);
    expect(block).toMatch(/addEventListener\("click"/);
    expect(block).toMatch(/event\.key === "Escape"/);
  });

  test("traceability interactions do not trigger pricing recalculation directly", () => {
    const content = readFileSync(appPath, "utf-8");
    const block = getFunctionBlock(content, "bindTraceabilityModeEvents", "getProjectPricingUiInputs");

    expect(block).not.toMatch(/updateUI\(/);
    expect(block).not.toMatch(/computePricingEngineV1\(/);
  });
});

describe("pricing hud and traceability markup", () => {
  test("index contains canonical trace metrics", () => {
    const html = readFileSync(htmlPath, "utf-8");
    expect(html).toMatch(/data-trace-metric="heroPrice"/);
    expect(html).toMatch(/data-trace-metric="sustainablePrice"/);
    expect(html).toMatch(/data-trace-metric="floorPrice"/);
    expect(html).toMatch(/data-trace-metric="riskIndicator"/);
  });

  test("index exposes stable input keys for highlighted controls", () => {
    const html = readFileSync(htmlPath, "utf-8");
    [
      "projectHours",
      "scopeRisk",
      "discount",
      "scopeClarity",
      "urgentDeadline",
      "revisionLoad",
      "engagementModel",
      "monthlyVolumeHours",
      "utilization",
      "profitMargin",
      "buffer",
    ].forEach((key) => {
      expect(html).toMatch(new RegExp(`data-input-key="${key}"`));
    });
  });
});
