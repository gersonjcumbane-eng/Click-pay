export type BillingCycle = 'mensal' | 'anual';
export type PlanCode = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export type OnboardingPlanKey = 'Starter' | 'Growth' | 'Business';

export interface ClickPayPlanSpec {
  id: OnboardingPlanKey;
  internalCode: Exclude<PlanCode, 'Platinum'>;
  name: string;
  segment: string;
  tagline: string;
  monthlyPriceMzn: number;
  annualMonthlyEquivalentMzn: number;
  annualTotalMzn: number;
  annualSavingsMzn: number;
  includedEmployees: number;
  includedUsersLabel: string;
  extraSlipFeeMzn: number;
  recommended?: boolean;
  features: string[];
}

export const ANNUAL_DISCOUNT_RATE = 0.2;

export const CLICKPAY_PLANS: ClickPayPlanSpec[] = [
  {
    id: 'Starter',
    internalCode: 'Bronze',
    name: 'Starter',
    segment: 'Microempresa',
    tagline: 'Para negócios em início de atividade e prestadores de serviços.',
    monthlyPriceMzn: 1500,
    annualMonthlyEquivalentMzn: 1200,
    annualTotalMzn: 14400,
    annualSavingsMzn: 3600,
    includedEmployees: 5,
    includedUsersLabel: '1 utilizador',
    extraSlipFeeMzn: 120,
    features: [
      'Até 5 colaboradores (+ 120 MT/recibo extra)',
      '1 utilizador incluído',
      'Faturação e vendas em MZN (IVA / ISPC)',
      'Recibos de salário, IRPS (Lei 11/2025) & INSS',
      'Suporte técnico via WhatsApp e E-mail'
    ]
  },
  {
    id: 'Growth',
    internalCode: 'Silver',
    name: 'Profissional',
    segment: 'Pequena Empresa',
    tagline: 'Para equipas ativas com gestão de stocks, CRM e obrigações ao SISSMO.',
    monthlyPriceMzn: 3500,
    annualMonthlyEquivalentMzn: 2800,
    annualTotalMzn: 33600,
    annualSavingsMzn: 8400,
    includedEmployees: 20,
    includedUsersLabel: 'Até 5 utilizadores',
    extraSlipFeeMzn: 100,
    recommended: true,
    features: [
      'Até 20 colaboradores (+ 100 MT/recibo extra)',
      'Até 5 utilizadores simultâneos',
      'Ficheiros SISSMO, guias INSS & Contratos (Lei 13/2023)',
      'Compras, fornecedores, stocks e CRM comercial',
      'Facturação A4 avançada & gestão de clientes e faturas'
    ]
  },
  {
    id: 'Business',
    internalCode: 'Gold',
    name: 'Empresarial',
    segment: 'Média Empresa',
    tagline: 'Contabilidade PGC-NIRF completa, múltiplos armazéns e tesouraria.',
    monthlyPriceMzn: 6900,
    annualMonthlyEquivalentMzn: 5520,
    annualTotalMzn: 66240,
    annualSavingsMzn: 16560,
    includedEmployees: 50,
    includedUsersLabel: 'Utilizadores ilimitados',
    extraSlipFeeMzn: 95,
    features: [
      'Até 50 colaboradores (+ 95 MT/recibo extra)',
      'Utilizadores ilimitados',
      'Contabilidade PGC-NIRF: DRE, Balanço, IVA M/01 e Fluxo de Caixa',
      'Gestão multi-armazém & reconciliação bancária',
      'Acompanhamento executivo prioritário VIP'
    ]
  }
];

export function normalizePlanToInternal(plan?: string | null): PlanCode {
  const raw = String(plan || '').trim().toLowerCase();
  if (raw.includes('platinum')) return 'Platinum';
  if (raw.includes('gold') || raw.includes('business') || raw.includes('empresarial') || raw.includes('vitalicio')) {
    return 'Gold';
  }
  if (raw.includes('silver') || raw.includes('growth') || raw.includes('profissional')) {
    return 'Silver';
  }
  return 'Bronze';
}

export function normalizePlanToOnboarding(plan?: string | null): OnboardingPlanKey {
  const internal = normalizePlanToInternal(plan);
  if (internal === 'Silver') return 'Growth';
  if (internal === 'Gold' || internal === 'Platinum') return 'Business';
  return 'Starter';
}

export function getPlanSpec(plan?: string | null): ClickPayPlanSpec {
  const key = normalizePlanToOnboarding(plan);
  return CLICKPAY_PLANS.find((p) => p.id === key) || CLICKPAY_PLANS[0];
}

export function getPlanFeeMzn(plan?: string | null, cycle: BillingCycle = 'mensal'): number {
  const spec = getPlanSpec(plan);
  return cycle === 'anual' ? spec.annualTotalMzn : spec.monthlyPriceMzn;
}

export function getPlanMonthlyEquivalentMzn(plan?: string | null, cycle: BillingCycle = 'mensal'): number {
  const spec = getPlanSpec(plan);
  return cycle === 'anual' ? spec.annualMonthlyEquivalentMzn : spec.monthlyPriceMzn;
}

export function getPlanExtraSlipFeeMzn(plan?: string | null): number {
  return getPlanSpec(plan).extraSlipFeeMzn;
}

export function formatMzn(value: number, options?: { spaceGrouping?: boolean }): string {
  const fixed = Number(value || 0).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const sep = options?.spaceGrouping ? ' ' : '.';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return `${grouped},${decPart} MT`;
}
