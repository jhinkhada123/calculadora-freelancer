import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { UI_MODE_VALUES, TAB_MODE_LABELS, TAB_PANELS, TAB_IDS, normalizeUiMode } from "./ui-mode-constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "app.js");
const htmlPath = join(__dirname, "index.html");

describe("ui mode constants", () => {
  test("exports expected mode order", () => {
    expect(UI_MODE_VALUES).toEqual(["essencial", "estrategista", "comparacao", "governanca"]);
  });

  test("tab metadata arrays stay aligned", () => {
    expect(TAB_MODE_LABELS.length).toBe(UI_MODE_VALUES.length);
    expect(TAB_PANELS.length).toBe(UI_MODE_VALUES.length);
    expect(TAB_IDS.length).toBe(UI_MODE_VALUES.length);
  });

  test("normalizeUiMode defaults safely", () => {
    expect(normalizeUiMode("estrategista")).toBe("estrategista");
    expect(normalizeUiMode("  COMPARACAO ")).toBe("comparacao");
    expect(normalizeUiMode("invalid")).toBe("essencial");
    expect(normalizeUiMode(null)).toBe("essencial");
  });
});

describe("app wiring for uiMode tabs", () => {
  test("app imports ui mode constants", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toMatch(/from "\.\/ui-mode-constants\.js"/);
  });

  test("app tracks and persists current ui mode", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toMatch(/let currentUiMode = "essencial"/);
    expect(content).toMatch(/uiMode:\s*normalizeUiMode\(currentUiMode\)/);
    expect(content).toMatch(/persistState\(\{\s*\.\.\.s,\s*uiMode:\s*currentUiMode\s*\}\)/);
  });

  test("setupTabs updates mode label and context hint", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toMatch(/activeModeLabel/);
    expect(content).toMatch(/tabContextHint/);
    expect(content).toMatch(/TAB_CONTEXT_HINTS\[currentUiMode\]/);
  });

  test("setupTabs controls negotiation block visibility by mode", () => {
    const content = readFileSync(appPath, "utf-8");
    expect(content).toMatch(/negotiationConfigCard/);
    expect(content).toMatch(/currentUiMode !== "governanca"/);
  });
});

describe("index markup for mode UX", () => {
  test("contains mode context hint element", () => {
    const html = readFileSync(htmlPath, "utf-8");
    expect(html).toMatch(/id="tabContextHint"/);
  });

  test("strategist control uses explicit label", () => {
    const html = readFileSync(htmlPath, "utf-8");
    expect(html).toMatch(/Usar precificacao por valor \(VCE\/ROIx\/CDO\)/);
  });
});
