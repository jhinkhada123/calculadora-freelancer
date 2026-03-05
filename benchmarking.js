export const BENCHMARK_RULES = {
  utilizationWarning: 80,
  utilizationCritical: 90,
  hoursWarning: 8,
  hoursCritical: 10,
  daysInfo: 5,
  daysWarning: 6,
  vacationWarning: 2,
  taxLow: 4,
  taxHigh: 30,
  totalPercentWarning: 75,
  totalPercentCritical: 90,
};

function pushAlert(list, id, severity, title, message, recommendation) {
  list.push({ id, severity, title, message, recommendation });
}

export function evaluateBenchmarkAlerts(inputs, outputs, rules = BENCHMARK_RULES) {
  const alerts = [];
  const utilization = Number(inputs.utilization) || 0;
  const hoursPerDay = Number(inputs.hoursPerDay) || 0;
  const daysPerWeek = Number(inputs.daysPerWeek) || 0;
  const vacationWeeks = Number(inputs.vacationWeeks) || 0;
  const taxRate = Number(inputs.taxRate) || 0;
  const totalPercent = Number(outputs.totalPercent) || 0;

  if (utilization > rules.utilizationCritical) {
    pushAlert(
      alerts,
      "utilization-critical",
      "critical",
      "Utilização muito alta",
      `Sua taxa de horas faturáveis está em ${utilization}%.`,
      "Considere reservar mais tempo para operação comercial e pausas."
    );
  } else if (utilization > rules.utilizationWarning) {
    pushAlert(
      alerts,
      "utilization-warning",
      "warning",
      "Utilização elevada",
      `Utilização em ${utilization}% pode gerar agenda apertada.`,
      "Inclua folga semanal e revise prazos para evitar sobrecarga."
    );
  }

  if (hoursPerDay > rules.hoursCritical) {
    pushAlert(
      alerts,
      "hours-critical",
      "critical",
      "Carga diária crítica",
      `Planejamento com ${hoursPerDay}h/dia tende a ser difícil de sustentar.`,
      "Recalibre horas/dia ou aumente taxa para compensar."
    );
  } else if (hoursPerDay > rules.hoursWarning) {
    pushAlert(
      alerts,
      "hours-warning",
      "warning",
      "Carga diária alta",
      `Você definiu ${hoursPerDay}h/dia.`,
      "Avalie reduzir horas ou criar janelas de recuperação."
    );
  }

  if (daysPerWeek > rules.daysWarning) {
    pushAlert(
      alerts,
      "days-warning",
      "warning",
      "Semana sem margem",
      `${daysPerWeek} dias/semana pode aumentar fadiga no médio prazo.`,
      "Tente concentrar entregas em até 5-6 dias por semana."
    );
  } else if (daysPerWeek > rules.daysInfo) {
    pushAlert(
      alerts,
      "days-info",
      "info",
      "Ritmo semanal intenso",
      `Planejamento atual considera ${daysPerWeek} dias/semana.`,
      "Mantenha um dia de folga para reduzir risco de retrabalho."
    );
  }

  if (vacationWeeks < rules.vacationWarning) {
    pushAlert(
      alerts,
      "vacation-warning",
      "warning",
      "Folgas anuais baixas",
      `Você definiu ${vacationWeeks} semanas de folga/ano.`,
      "Planeje pelo menos 2 semanas para sustentabilidade."
    );
  }

  if (taxRate <= rules.taxLow) {
    pushAlert(
      alerts,
      "tax-low-info",
      "info",
      "Imposto muito baixo",
      `Alíquota em ${taxRate}% pode não refletir todos os tributos do seu cenário.`,
      "Confirme regime fiscal com contador para evitar subprecificação."
    );
  } else if (taxRate >= rules.taxHigh) {
    pushAlert(
      alerts,
      "tax-high-info",
      "info",
      "Imposto elevado",
      `Alíquota em ${taxRate}% reduz bastante a margem operacional.`,
      "Revise enquadramento e repasse tributário na proposta."
    );
  }

  if (totalPercent >= rules.totalPercentCritical) {
    pushAlert(
      alerts,
      "total-critical",
      "critical",
      "Percentual total crítico",
      `Impostos + lucro + buffer em ${totalPercent.toFixed(1)}%.`,
      "Rebalanceie percentuais para manter precificação viável."
    );
  } else if (totalPercent >= rules.totalPercentWarning) {
    pushAlert(
      alerts,
      "total-warning",
      "warning",
      "Percentual total alto",
      `Total de percentuais em ${totalPercent.toFixed(1)}%.`,
      "Monitore competitividade e valide percepção de valor no mercado."
    );
  }

  return alerts;
}
