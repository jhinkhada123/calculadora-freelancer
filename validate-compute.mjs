/**
 * Validação mínima do contrato compute() — rodar com: node validate-compute.mjs
 * Requer Node com suporte a ES modules (type: module no package.json ou .mjs).
 */
import { compute } from "./calculadora.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Caso nominal: totalPercent < 100, billableHours > 0
const nominal = {
  targetIncome: 6000,
  monthlyCosts: 2000,
  taxRate: 10,
  profitMargin: 6,
  buffer: 4,
  utilization: 100,
  hoursPerDay: 8,
  daysPerWeek: 5,
  vacationWeeks: 4,
  projectHours: 40,
  scopeRisk: 10,
  discount: 0,
};
const rNom = compute(nominal);
assert(rNom.ok === true, "nominal: ok deve ser true");
assert(rNom.error === null, "nominal: error deve ser null");
assert(Number.isFinite(rNom.baseNeed) && rNom.baseNeed === 8000, "nominal: baseNeed 8000");
assert(Number.isFinite(rNom.totalPercent) && rNom.totalPercent === 20, "nominal: totalPercent 20");
assert(Number.isFinite(rNom.revenueTarget) && rNom.revenueTarget === 10000, "nominal: revenueTarget 10000");
assert(Number.isFinite(rNom.hourly) && rNom.hourly != null, "nominal: hourly finito");
assert(Number.isFinite(rNom.daily) && rNom.daily != null, "nominal: daily finito");
assert(Number.isFinite(rNom.projectNet) && rNom.projectNet != null, "nominal: projectNet finito");
assert(!Number.isNaN(rNom.hourly) && rNom.hourly !== Infinity, "nominal: sem NaN/Infinity em hourly");

// Caso inválido: totalPercent >= 100
const invalid100 = { ...nominal, taxRate: 50, profitMargin: 30, buffer: 20 };
const r100 = compute(invalid100);
assert(r100.ok === false, "inválido 100%: ok deve ser false");
assert(r100.error && r100.error.code === "TOTAL_PERCENT_INVALID", "inválido 100%: error.code");
assert(r100.revenueTarget === null && r100.hourly === null, "inválido 100%: valores numéricos null");

console.log("validate-compute.mjs: todos os asserts passaram (contrato compute nominal + inválido).");
