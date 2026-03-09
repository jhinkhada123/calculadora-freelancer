import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "app.js");
const htmlPath = join(__dirname, "index.html");

describe("command center impact preview wiring", () => {
  test("first viewport exposes impact preview target", () => {
    const html = readFileSync(htmlPath, "utf-8");
    expect(html).toMatch(/id="pricingImpactPreview"/);
  });

  test("app consumes engine impactPreview map and renders preview by focused input", () => {
    const app = readFileSync(appPath, "utf-8");
    expect(app).toMatch(/vm\.result\.impactPreview\s*&&\s*vm\.result\.impactPreview\[inputKey\]/);
    expect(app).toMatch(/IMPACT_PREVIEW_INPUT_KEYS_V1\s*=\s*new Set/);
    expect(app).toMatch(/impactPreviewUiState\.activeInputKey\s*=\s*inputKey/);
    expect(app).toMatch(/syncImpactPreviewState\(pricingEngineV1Vm, s\)/);
  });

  test("wireEvents includes focus handlers for impact-preview inputs", () => {
    const app = readFileSync(appPath, "utf-8");
    expect(app).toMatch(/document\.querySelectorAll\("\[data-input-key\]"\)/);
    expect(app).toMatch(/node\.addEventListener\("focusin", \(\) => \{/);
    expect(app).toMatch(/node\.addEventListener\("focusout", \(\) => \{/);
    expect(app).toMatch(/setImpactPreviewInput\(/);
    expect(app).toMatch(/clearImpactPreviewState\(/);
  });
});
