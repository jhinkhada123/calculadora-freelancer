import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "app.js");
const htmlPath = join(__dirname, "index.html");

describe("command center traceability x-ray wiring", () => {
  test("first viewport exposes canonical trace metrics in HTML", () => {
    const html = readFileSync(htmlPath, "utf-8");
    expect(html).toMatch(/data-trace-metric="heroPrice"/);
    expect(html).toMatch(/data-trace-metric="sustainablePrice"/);
    expect(html).toMatch(/data-trace-metric="floorPrice"/);
    expect(html).toMatch(/data-trace-metric="riskIndicator"/);
  });

  test("app consumes engine traceability and limits highlighted drivers to max 3", () => {
    const app = readFileSync(appPath, "utf-8");
    expect(app).toMatch(/vm\.result\.traceability\s*&&\s*vm\.result\.traceability\[metric\]/);
    expect(app).toMatch(/\.slice\(0,\s*3\)/);
    expect(app).toMatch(/traceabilityUiState\.activeInputKeys\s*=\s*drivers\.map\(\(driver\) => driver\.inputKey\)\.slice\(0,\s*3\)/);
  });

  test("wireEvents includes desktop hover and mobile tap handlers for trace mode", () => {
    const app = readFileSync(appPath, "utf-8");
    expect(app).toMatch(/node\.addEventListener\("mouseenter"/);
    expect(app).toMatch(/node\.addEventListener\("mouseleave"/);
    expect(app).toMatch(/node\.addEventListener\("click"/);
    expect(app).toMatch(/isCoarsePointerDevice\(\)/);
    expect(app).toMatch(/document\.addEventListener\("click", \(event\) => \{/);
  });
});
