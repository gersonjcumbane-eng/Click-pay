/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Building2, 
  Settings, 
  BarChart3, 
  Calculator, 
  FileSpreadsheet, 
  Activity, 
  CreditCard, 
  Lock,
  LogOut,
  FileText,
  Bell,
  Briefcase,
  Wallet,
  DollarSign,
  ShoppingCart,
  Tag,
  BookOpen,
  Percent,
  ChevronDown,
  ChevronRight,
  Layers
} from 'lucide-react';

import { Employee, CompanyData, ConfigFiscal, PayrollSummary, PaymentLog } from './types';
import {
  getAuthHeaders,
  isFounderUser,
  isFounderEmail,
  PAYMENTS_MODULE_LOCKED,
  PAYMENTS_LOCKED_MESSAGE
} from './lib/authSession';
import {
  consumeGoogleRedirectResult,
  provisionOrLookupGoogleClientInCloud,
  signOutGoogleSession
} from './lib/firebase';
import Dashboard from './components/Dashboard';
import EmployeeDirectory from './components/EmployeeDirectory';
import TaxSimulator from './components/TaxSimulator';
import SISSMOExport from './components/SISSMOExport';
import CorporateSettings from './components/CorporateSettings';
import FintechPayments from './components/FintechPayments';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import ContractManagement from './components/ContractManagement';
import AlertScheduler from './components/AlertScheduler';
import ClientManagement from './components/ClientManagement';
import FinancialManagement from './components/FinancialManagement';
import { CRMVendas } from './components/CRMVendas';
import OnboardingWizard from './components/OnboardingWizard';
import { LeftModuleNav } from './components/LeftModuleNav';
import { ClickPayBrain } from './components/ClickPayBrain';
import AccessCredentialManagement from './components/AccessCredentialManagement';
import SupportTicketModal, {
  buildSupportMailtoUrl,
  buildSupportWhatsAppUrl,
  CLICKPAY_SUPPORT
} from './components/SupportTicketModal';
import { 
  updateConfiguracaoFiscal, 
  updateEmpresa, 
  employees as defaultEmployees, 
  empresaAtual, 
  configuracaoFiscal, 
  paymentLogs, 
  calcularFolhaSalario, 
  baseDadosClientes, 
  selecionarClienteEmpresa,
  resetDbTotal,
  zerarCalculosEResetFinanceiro,
  getCurrentPeriod
} from './db_tax';
import { useToast, useConfirm } from './context/ToastContext';

interface LockedFeatureOverlayProps {
  featureName: string;
  requiredPlan: 'Profissional (Silver)' | 'Empresarial (Gold)';
  description: string;
}

function LockedFeatureOverlay({ featureName, requiredPlan, description }: LockedFeatureOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-8 sm:p-10 text-center border border-slate-200 max-w-2xl mx-auto my-8 space-y-6"
    >
      <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center mx-auto border border-slate-200">
        <Lock size={20} />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-950">Módulo Bloqueado: {featureName}</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3">
        <p className="text-[11px] font-medium text-slate-500">Requisito de Subscrição</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-700">Plano Necessário</p>
            <p className="text-sm font-semibold text-blue-900">{requiredPlan}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={buildSupportMailtoUrl({
                subject: `Solicitação de Upgrade (${featureName}) - ClickPay Moçambique`,
                body: `Olá Equipa ClickPay,\n\nSolicito upgrade para o plano ${requiredPlan} para ativar o módulo ${featureName}.\n`
              })}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-semibold rounded-lg text-xs transition-colors whitespace-nowrap"
            >
              Solicitar via E-mail
            </a>
            <a
              href={buildSupportWhatsAppUrl({
                number: CLICKPAY_SUPPORT.whatsappPrimaryNumber,
                message: `Olá Equipa ClickPay, gostaria de solicitar upgrade para o plano ${requiredPlan} (${featureName}).`
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold rounded-lg text-xs transition-colors whitespace-nowrap"
            >
              WhatsApp Suporte
            </a>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Suporte comercial e técnico:{' '}
        <span className="font-medium text-slate-700">{CLICKPAY_SUPPORT.emailPrimary}</span> ·{' '}
        <span className="font-medium text-slate-700">{CLICKPAY_SUPPORT.whatsappPrimaryDisplay}</span>
      </p>
    </motion.div>
  );
}

function PaymentsLockedOverlay({ onGoToInvoicing }: { onGoToInvoicing: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-rose-200 max-w-2xl mx-auto my-8 space-y-6 shadow-xs"
    >
      <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-xl flex items-center justify-center mx-auto border border-rose-200">
        <Lock size={22} />
      </div>
      <div className="space-y-2">
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
          Pagamentos Bloqueados
        </span>
        <h3 className="text-lg font-bold text-slate-950">
          Módulo de Pagamentos &amp; Carteiras Móveis Desativado
        </h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          {PAYMENTS_LOCKED_MESSAGE}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3">
        <p className="text-xs font-bold text-slate-800">O que está bloqueado para todos os utilizadores:</p>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
          <li>Liquidações salariais diretas via M-Pesa, e-Mola, mKesh ou conta bancária</li>
          <li>Recargas de carteira corporativa, transferências em lote e piloto automático</li>
          <li>Solicitação e desembolso de adiantamentos (Vales)</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onGoToInvoicing}
          className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Ir para Facturação &amp; Vendas
        </button>
      </div>
    </motion.div>
  );
}

export default function App() {
  const { showSuccess, showError, showInfo } = useToast();
  const confirmAction = useConfirm();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'crm' | 'employees' | 'simulator' | 'sissmo' | 'settings' | 'fintech' | 'contracts' | 'alerts' | 'clients' | 'financial' | 'brain' | 'credentials'>('dashboard');
  const [financialSubTab, setFinancialSubTab] = useState<'caixa' | 'compras' | 'vendas' | 'iva' | 'relatorios' | 'conformidade' | 'plano_contas'>('conformidade');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [supportModalOpen, setSupportModalOpen] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<'Bronze' | 'Silver' | 'Gold' | null>(null);
  // Ao pesquisar ou abrir o site pela primeira vez, sempre exibe a Landing Page primeiro (a menos que já esteja explicitamente logado)
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    // Se a URL tiver ?login=true ou #login abre o login, caso contrário quem acessa o site sempre vê a Landing Page primeiro
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === 'true' || window.location.hash === '#login') {
        return false;
      }
    }
    return localStorage.getItem('paytek_auth') === 'true';
  });
  const [userRole, setUserRole] = useState<string | null>(() => {
    return localStorage.getItem('paytek_role');
  });

  useEffect(() => {
    if (authenticated) {
      setUserRole(localStorage.getItem('paytek_role'));
    } else {
      setUserRole(null);
    }
  }, [authenticated]);
  
  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [company, setCompany] = useState<CompanyData>({ nome: '', nuit: '', endereco: '' });
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

  const handleSessionExpired = () => {
    localStorage.removeItem('paytek_auth');
    localStorage.removeItem('paytek_role');
    localStorage.removeItem('paytek_token');
    localStorage.removeItem('paytek_user');
    localStorage.removeItem('paytek_company_id');
    setAvailableCompanies([]);
    setAuthenticated(false);
    setShowLogin(true);
    showInfo('A sua sessão expirou. Inicie sessão novamente para sincronizar com o servidor.');
  };

  const loadCompanies = async () => {
    if (!isFounderUser()) {
      setAvailableCompanies([]);
      return;
    }
    try {
      const res = await fetch('/api/clients', {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setAvailableCompanies(Array.isArray(data) ? data : []);
      } else {
        setAvailableCompanies([]);
      }
    } catch (err) {
      console.warn('Erro ao carregar lista de empresas:', err);
      setAvailableCompanies([]);
    }
  };

  const handleSwitchCompany = async (companyId: string) => {
    if (!isFounderUser()) return;
    try {
      const res = await fetch('/api/clients/select', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: companyId })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        await loadData();
        await loadCompanies();
        return;
      }
    } catch (err) {
      console.warn('Alternando empresa em modo local:', err);
    }
    // Fallback local instantâneo apenas para Fundador
    selecionarClienteEmpresa(companyId);
    await loadData();
    await loadCompanies();
  };
  const [configFiscal, setConfigFiscal] = useState<ConfigFiscal>({ taxa_inss_trabalhador: 3, taxa_inss_entidade: 4, valor_ipa_mensal: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => getCurrentPeriod());
  const [summary, setSummary] = useState<PayrollSummary>(() => ({
    periodoAtual: getCurrentPeriod(),
    kpis: { custoEmpresaTotal: 0, totalPagoAosFuncionarios: 0, retencaoEstadoTotal: 0 },
    dadosParaGraficoPizza: { labels: [], valoresEmMeticais: [] }
  }));
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mantém as datas e o período fiscal em dia e sincronizados em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      const periodoEmDia = getCurrentPeriod();
      setSelectedPeriod(prev => prev || periodoEmDia);
    }, 30000); // Valida a cada 30 segundos
    return () => clearInterval(timer);
  }, []);

  const getDeletedSeedIds = (): string[] => {
    try {
      const raw = localStorage.getItem('clickpay_deleted_seed_ids');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const addDeletedSeedId = (id: string) => {
    try {
      const existing = new Set(getDeletedSeedIds());
      existing.add(id);
      localStorage.setItem('clickpay_deleted_seed_ids', JSON.stringify(Array.from(existing)));
    } catch {
      // ignore
    }
  };

  const resolveActiveTenantId = (): string => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('paytek_company_id') : '';
    if (stored) return stored;
    return isFounderUser() ? 'cli_founders' : 'cli_bronze';
  };

  const readTenantSnapshot = (cid: string) => {
    try {
      const raw = localStorage.getItem(`clickpay_tenant_${cid}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveTenantSnapshot = (cid: string, patch: Partial<{
    employees: Employee[];
    logs: PaymentLog[];
    contracts: any[];
    company: CompanyData;
    config: ConfigFiscal;
    deletedIds: string[];
  }>) => {
    try {
      const prev = readTenantSnapshot(cid) || {};
      localStorage.setItem(`clickpay_tenant_${cid}`, JSON.stringify({ ...prev, ...patch }));
    } catch {
      // ignore
    }
  };

  const computeLocalSummary = (emps: Employee[]): PayrollSummary => {
    let totalCusto = 0;
    let totalLiquido = 0;
    let totalEstado = 0;
    emps.forEach(emp => {
      const calc = calcularFolhaSalario(emp.salario_base, 0, emp.numero_dependentes);
      totalCusto += emp.salario_base + calc.inssEmpresa;
      totalLiquido += calc.salarioLiquido;
      totalEstado += calc.irpsConstatado + calc.inssTrabalhador + calc.inssEmpresa;
    });
    return {
      periodoAtual: selectedPeriod,
      kpis: {
        custoEmpresaTotal: totalCusto,
        totalPagoAosFuncionarios: totalLiquido,
        retencaoEstadoTotal: totalEstado
      },
      dadosParaGraficoPizza: {
        labels: ['Líquido Pago', 'IRPS Retido', 'INSS Total'],
        valoresEmMeticais: [totalLiquido, totalEstado * 0.6, totalEstado * 0.4]
      }
    };
  };

  const loadLocalFallbackData = () => {
    const cid = resolveActiveTenantId();
    const snapshot = readTenantSnapshot(cid);
    const globalDeleted = getDeletedSeedIds();
    const tenantDeleted = new Set<string>([
      ...globalDeleted,
      ...(Array.isArray(snapshot?.deletedIds) ? snapshot.deletedIds : [])
    ]);

    const savedCompanyName = localStorage.getItem('paytek_company_name');
    const savedPlan = localStorage.getItem('paytek_sub_plan') as any;
    const savedStatus = localStorage.getItem('paytek_sub_status') as any;

    let localEmployees: Employee[] = [];
    let localLogs: PaymentLog[] = [];
    let baseCompany: CompanyData = { ...empresaAtual };

    if (snapshot && Array.isArray(snapshot.employees)) {
      localEmployees = snapshot.employees.filter((e: Employee) => !tenantDeleted.has(e.id));
      localLogs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
      if (snapshot.company) {
        baseCompany = { ...baseCompany, ...snapshot.company };
      }
    } else if (cid === 'cli_founders' && isFounderUser()) {
      localEmployees = defaultEmployees.filter(e => !tenantDeleted.has(e.id));
      localLogs = [...paymentLogs];
    } else if (cid === 'cli_bronze' || cid === 'cli_silver' || cid === 'cli_gold') {
      const matched = baseDadosClientes.find(c => c.id === cid);
      if (matched) {
        localEmployees = (matched.employees || []).filter(e => !tenantDeleted.has(e.id));
        localLogs = [...(matched.paymentLogs || [])];
        baseCompany = {
          nome: matched.nome,
          nuit: matched.nuit,
          endereco: matched.endereco,
          provincia: matched.provincia,
          distrito: matched.distrito,
          regime_iva: matched.regime_iva,
          nuel: matched.nuel,
          email: matched.email,
          telefone: matched.telefone,
          logo: matched.logo,
          subscription_status: matched.subscription_status,
          subscription_plan: matched.subscription_plan,
          next_billing_date: matched.next_billing_date,
          fee_base: matched.fee_base,
          fee_por_slip: matched.fee_por_slip
        };
      }
    } else {
      // Conta nova criada pelo cliente (Onboarding): começa 100% isolada e vazia!
      localEmployees = [];
      localLogs = [];
      baseCompany = {
        nome: savedCompanyName || 'Minha Empresa',
        nuit: snapshot?.company?.nuit || '',
        endereco: snapshot?.company?.endereco || 'Moçambique',
        email: localStorage.getItem('paytek_user') || '',
        subscription_plan: savedPlan || 'Bronze',
        subscription_status: savedStatus || 'ativo'
      };
    }

    const localCompany: CompanyData = {
      ...baseCompany,
      ...(savedCompanyName ? { nome: savedCompanyName } : {}),
      ...(savedPlan ? { subscription_plan: savedPlan } : {}),
      ...(savedStatus ? { subscription_status: savedStatus } : {})
    };
    const localConfig = snapshot?.config ? { ...configuracaoFiscal, ...snapshot.config } : { ...configuracaoFiscal };

    setEmployees(localEmployees);
    setCompany(localCompany);
    setConfigFiscal(localConfig);
    setSummary(computeLocalSummary(localEmployees));
    setLogs(localLogs);
    setError(null);
  };

  const loadData = async () => {
    try {
      const cid = resolveActiveTenantId();
      const authHeaders = getAuthHeaders();
      const [empRes, configRes, summaryRes, logsRes] = await Promise.all([
        fetch('/api/employees', { headers: authHeaders }).catch(() => null),
        fetch('/api/config', { headers: authHeaders }).catch(() => null),
        fetch(`/api/dashboard/resumo-financeiro?periodo=${encodeURIComponent(selectedPeriod)}`, { headers: authHeaders }).catch(() => null),
        fetch('/api/logs', { headers: authHeaders }).catch(() => null)
      ]);

      if (empRes?.status === 401 || configRes?.status === 401 || summaryRes?.status === 401 || logsRes?.status === 401) {
        handleSessionExpired();
        return;
      }

      const isJson = (res: Response | null) => res && res.ok && (res.headers.get('content-type') || '').includes('application/json');

      if (isJson(empRes) && isJson(configRes) && isJson(summaryRes) && isJson(logsRes)) {
        const employeesData = await empRes!.json();
        const configData = await configRes!.json();
        const summaryData = await summaryRes!.json();
        const logsData = await logsRes!.json();

        setEmployees(employeesData);
        setCompany(configData.empresaAtual);
        setConfigFiscal(configData.configuracaoFiscal);
        updateConfiguracaoFiscal(configData.configuracaoFiscal);
        updateEmpresa(configData.empresaAtual);
        setSummary(summaryData);
        setLogs(logsData);
        setError(null);

        saveTenantSnapshot(cid, {
          employees: Array.isArray(employeesData) ? employeesData : [],
          logs: Array.isArray(logsData) ? logsData : [],
          company: configData.empresaAtual,
          config: configData.configuracaoFiscal
        });
      } else {
        loadLocalFallbackData();
      }
    } catch (err: any) {
      console.warn('Ativando fallback de dados locais integrados:', err);
      loadLocalFallbackData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadData();
      if (isFounderUser()) {
        loadCompanies();
      } else {
        setAvailableCompanies([]);
      }
    } else {
      setLoading(false);
    }
  }, [authenticated]);

  // Completar autenticação se o navegador retornar de um redirect Google OAuth
  useEffect(() => {
    if (authenticated) return;
    let active = true;
    consumeGoogleRedirectResult().then(async (redirectRes) => {
      if (!active || !redirectRes || !redirectRes.ok || !redirectRes.email) return;
      const persistRedirect = (token: string, usuario: any) => {
        const resolvedEmail = String(usuario?.email || redirectRes.email || '').toLowerCase().trim();
        const resolvedRole = usuario?.funcao || 'CLIENTE_EMPRESA';
        localStorage.setItem('paytek_auth', 'true');
        localStorage.setItem('paytek_token', token || `token_clickpay_${Date.now()}`);
        localStorage.setItem('paytek_user', resolvedEmail);
        localStorage.setItem('paytek_role', resolvedRole);
        if (usuario?.empresa_id) {
          localStorage.setItem('paytek_company_id', usuario.empresa_id);
        } else if (resolvedRole === 'SUPER_ADMIN_PAYROLL') {
          localStorage.setItem('paytek_company_id', 'cli_founders');
        }
        localStorage.setItem('paytek_sub_status', usuario?.subscription_status || 'ativo');
        localStorage.setItem('paytek_sub_plan', usuario?.subscription_plan || 'Bronze');
        localStorage.setItem('paytek_company_name', usuario?.nome_empresa || '');
        localStorage.setItem('paytek_payments_locked', 'true');
        setUserRole(resolvedRole);
        setAuthenticated(true);
        setShowLogin(false);
      };

      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleAccessToken: redirectRes.googleAccessToken,
            idToken: redirectRes.idToken
          })
        });
        const isJson = (res.headers.get('content-type') || '').includes('application/json');
        if (isJson && res.ok) {
          const data = await res.json();
          if (data.sucesso) {
            persistRedirect(data.token, data.usuario);
            return;
          }
        }
        if (!isJson || res.status === 404 || res.status === 405 || res.status >= 500) {
          if (isFounderEmail(redirectRes.email) && redirectRes.emailVerified) {
            persistRedirect(`token_google_${Date.now()}`, {
              email: redirectRes.email,
              funcao: 'SUPER_ADMIN_PAYROLL',
              empresa_id: 'cli_founders',
              nome_empresa: 'ClickPay Moçambique Lda',
              subscription_status: 'ativo',
              subscription_plan: 'Platinum'
            });
            return;
          }
          const client = await provisionOrLookupGoogleClientInCloud({
            email: redirectRes.email,
            displayName: redirectRes.displayName
          });
          persistRedirect(`token_google_${client.id}`, {
            email: client.email,
            funcao: 'CLIENTE_EMPRESA',
            empresa_id: client.id,
            nome_empresa: client.companyName,
            subscription_status: client.status,
            subscription_plan: client.plan
          });
        }
      } catch {
        // Fallback silencioso caso o utilizador esteja offline
      }
    });
    return () => {
      active = false;
    };
  }, [authenticated]);

  // Monitorar parâmetro 'plano' da URL para roteamento inteligente de novos cadastros
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get('plano');
    if (planParam) {
      const p = planParam.toLowerCase();
      if (p === 'base' || p === 'bronze') {
        setSelectedPlan('Bronze');
        setShowLogin(true);
      } else if (p === 'profissional' || p === 'silver') {
        setSelectedPlan('Silver');
        setShowLogin(true);
      } else if (p === 'empresarial' || p === 'gold') {
        setSelectedPlan('Gold');
        setShowLogin(true);
      } else if (p === 'teste-gratis') {
        setSelectedPlan('Bronze');
        setShowLogin(true);
      }
    }
  }, []);

  // Employee actions
  const handleAddEmployee = async (newEmp: Omit<Employee, 'id'>) => {
    // Check subscription plan limits
    const plan = company.subscription_plan || 'Bronze';
    const currentCount = employees.length;
    let limit = 5;
    if (plan === 'Silver') limit = 15;
    if (plan === 'Gold') limit = 30;
    if (plan === 'Platinum') limit = 999;

    if (currentCount >= limit) {
      showError(`Limite de colaboradores atingido! O seu plano atual (${
        plan === 'Bronze' ? 'Starter (Bronze)' :
        plan === 'Silver' ? 'Profissional (Silver)' :
        plan === 'Gold' ? 'Empresarial (Gold)' : 'Starter'
      }) permite no máximo ${limit} colaboradores. Por favor, faça upgrade para expandir a sua equipa.`);
      return;
    }

    const cid = resolveActiveTenantId();
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newEmp)
      });
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (isJson) {
        if (!res.ok) throw new Error('Não foi possível adicionar o colaborador.');
        await loadData();
      } else {
        const localNew: Employee = { ...newEmp, id: `emp-${Date.now()}` };
        const nextList = [...employees, localNew];
        setEmployees(nextList);
        setSummary(computeLocalSummary(nextList));
        saveTenantSnapshot(cid, { employees: nextList });
      }
    } catch (err: any) {
      showError(err.message || 'Não foi possível adicionar o colaborador.');
    }
  };

  const handleUpdateEmployee = async (id: string, updatedFields: Partial<Employee>) => {
    const cid = resolveActiveTenantId();
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updatedFields)
      });
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (isJson) {
        if (!res.ok) throw new Error('Não foi possível atualizar o colaborador.');
        await loadData();
      } else {
        const nextList = employees.map(e => (e.id === id ? { ...e, ...updatedFields } : e));
        setEmployees(nextList);
        setSummary(computeLocalSummary(nextList));
        saveTenantSnapshot(cid, { employees: nextList });
      }
    } catch (err: any) {
      showError(err.message || 'Não foi possível atualizar o colaborador.');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const cid = resolveActiveTenantId();
    const targetEmp = employees.find(e => e.id === id);
    addDeletedSeedId(id);

    const updateLocalTenantAfterDelete = () => {
      const nextList = employees.filter(e => e.id !== id);
      const nextLogs = logs.filter(
        l => l.employeeId !== id && (!targetEmp || l.employeeName !== targetEmp.nome)
      );
      const snap = readTenantSnapshot(cid) || {};
      const nextContracts = Array.isArray(snap.contracts)
        ? snap.contracts.filter((c: any) => !targetEmp || c.nome_funcionario !== targetEmp.nome)
        : snap.contracts;
      const nextDeleted = Array.from(new Set([...(Array.isArray(snap.deletedIds) ? snap.deletedIds : []), id]));

      setEmployees(nextList);
      setLogs(nextLogs);
      setSummary(computeLocalSummary(nextList));
      saveTenantSnapshot(cid, {
        employees: nextList,
        logs: nextLogs,
        contracts: nextContracts,
        deletedIds: nextDeleted
      });
    };

    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (isJson && res.ok) {
        updateLocalTenantAfterDelete();
        await loadData();
      } else {
        updateLocalTenantAfterDelete();
      }
      showSuccess('Colaborador e dados salariais associados eliminados.');
    } catch (err: any) {
      updateLocalTenantAfterDelete();
      showSuccess('Colaborador eliminado da sessão atual.');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const cid = resolveActiveTenantId();
    try {
      const res = await fetch(`/api/logs/${encodeURIComponent(logId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      const nextLogs = logs.filter(l => l.id !== logId);
      setLogs(nextLogs);
      saveTenantSnapshot(cid, { logs: nextLogs });
      if (isJson && res.ok) {
        await loadData();
      }
      showSuccess('Registo de pagamento removido do histórico.');
    } catch (err) {
      const nextLogs = logs.filter(l => l.id !== logId);
      setLogs(nextLogs);
      saveTenantSnapshot(cid, { logs: nextLogs });
    }
  };

  // Corporate Settings Actions
  const handleSaveSettings = async (newConfig: ConfigFiscal, newCompany: CompanyData) => {
    const cid = resolveActiveTenantId();
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          config: newConfig,
          empresa: newCompany
        })
      });
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      if (isJson) {
        if (!res.ok) throw new Error('Erro ao salvar as configurações.');
        await loadData();
      } else {
        setConfigFiscal(newConfig);
        setCompany(newCompany);
        saveTenantSnapshot(cid, { config: newConfig, company: newCompany });
      }
    } catch (err: any) {
      showError(err.message || 'Erro ao salvar as configurações.');
    }
  };

  const handleResetDb = async () => {
    const confirmed = await confirmAction({
      title: 'Reiniciar Base de Dados',
      message: 'Deseja apagar todos os colaboradores, logs de pagamento, vales e contratos para iniciar a simulação do zero? O ERP ficará totalmente limpo e pronto para novos registos.',
      confirmText: 'Apagar Tudo',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await fetch('/api/mvp/reset-total', { method: 'POST', headers: getAuthHeaders() }).catch(() => null);
      } catch (err) {
        // Fallback local
      }
      const cid = resolveActiveTenantId();
      saveTenantSnapshot(cid, { employees: [], logs: [], contracts: [] });
      resetDbTotal();
      showSuccess("ERP Pronto! Base de dados e cálculos zerados com sucesso.");
      await loadData();
    }
  };

  const handleResetCosts = async () => {
    const confirmed = await confirmAction({
      title: 'Zerar Cálculos Fiscais',
      message: 'Deseja zerar e limpar todos os cálculos fiscais, compras, vendas e histórico financeiro? A estrutura cadastral das empresas será preservada.',
      confirmText: 'Zerar Cálculos',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await fetch('/api/mvp/reset-costs', { method: 'POST', headers: getAuthHeaders() }).catch(() => null);
      } catch (err) {
        // Fallback local
      }
      const cid = resolveActiveTenantId();
      saveTenantSnapshot(cid, { logs: [] });
      zerarCalculosEResetFinanceiro();
      showSuccess("Cálculos e histórico financeiro zerados com sucesso!");
      await loadData();
    }
  };

  const handleSeedDemo = async () => {
    const confirmed = await confirmAction({
      title: 'Carregar Dados de Demonstração',
      message: 'Deseja carregar os dados de demonstração (colaboradores pré-registados, contratos laborais e histórico de teste) para apresentar as funcionalidades do sistema instantaneamente?',
      confirmText: 'Carregar Demo',
      variant: 'info'
    });
    if (confirmed) {
      try {
        const res = await fetch('/api/mvp/seed-demo', { method: 'POST', headers: getAuthHeaders() });
        const data = await res.json();
        if (data.sucesso) {
          showSuccess("Dados de demonstração carregados com sucesso!");
          await loadData();
        } else {
          showError(data.error || "Erro ao carregar dados de demonstração.");
        }
      } catch (err: any) {
        showError("Falha ao comunicar com o servidor: " + err.message);
      }
    }
  };

  useEffect(() => {
    if (!isFounderUser(userRole) && (activeTab === 'clients' || activeTab === 'credentials')) {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab, authenticated]);

  const handleEnterPlanDemo = (plan: 'Bronze' | 'Silver' | 'Gold') => {
    setSelectedPlan(plan);
    setShowLogin(true);
  };

  if (!authenticated) {
    if (showOnboarding) {
      return (
        <OnboardingWizard
          onCancel={() => setShowOnboarding(false)}
          onEnterLogin={() => {
            setShowOnboarding(false);
            setShowLogin(true);
          }}
          onSuccess={async () => {
            setUserRole(localStorage.getItem('paytek_role'));
            setAuthenticated(true);
            setShowOnboarding(false);
            await loadData();
            await loadCompanies();
          }}
        />
      );
    }

    if (showLogin) {
      return (
        <div className="relative min-h-screen bg-slate-50 flex flex-col justify-center">
          <div className="absolute top-4 left-4 z-50">
            <button
              onClick={() => {
                setShowLogin(false);
                setSelectedPlan(null);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-[8px] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              ← Voltar ao Início
            </button>
          </div>
          <Login 
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onEnterRegister={() => {
              setShowLogin(false);
              setShowOnboarding(true);
            }}
            onLoginSuccess={async () => {
              setUserRole(localStorage.getItem('paytek_role'));
              setAuthenticated(true);
              setShowLogin(false);
              await loadData();
              await loadCompanies();
            }} 
          />
        </div>
      );
    }
    return (
      <LandingPage 
        onEnterLogin={() => setShowLogin(true)} 
        onEnterRegister={() => setShowOnboarding(true)}
        onEnterPlanDemo={handleEnterPlanDemo} 
      />
    );
  }

  if (authenticated && userRole === 'CLIENTE_EMPRESA' && company.subscription_status === 'suspenso') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
        <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center font-black text-2xl border border-rose-100">
            ⚠️
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Serviço Suspenso temporariamente</h2>
            <p className="text-sm text-slate-500">
              A assinatura do software <b>ClickPay</b> para a empresa <b className="text-slate-800">{company.nome || 'sua empresa'}</b> encontra-se suspensa ou aguardando pagamento.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 text-xs text-left space-y-2 border border-slate-100">
            <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Detalhes da Subscrição:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600">
              <div>Plano: <span className="font-bold text-indigo-700">👑 {
                company.subscription_plan === 'Bronze' ? 'Base' :
                company.subscription_plan === 'Silver' ? 'Profissional' :
                company.subscription_plan === 'Gold' ? 'Empresarial' :
                company.subscription_plan || 'Base'
              }</span></div>
              <div>Data de Renovação: <span className="font-bold text-slate-700">{company.next_billing_date || 'N/D'}</span></div>
              <div>NUIT da Empresa: <span className="font-bold text-slate-700">{company.nuit}</span></div>
              <div>Mensalidade Estimada: <span className="font-bold text-slate-700">{(company.fee_base || 1500).toLocaleString()} MT</span></div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Para restabelecer o acesso total ao processamento de salários, segurança social (SISSMO), emissão de guias e transferências móveis, por favor contacte o seu gestor de conta ou envie comprovativo de pagamento para:
          </p>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-xs font-semibold text-blue-900 flex flex-col gap-2 items-center">
            <span>📞 Suporte ClickPay: +258 84 201 4173 · +258 86 139 0061</span>
            <span>📧 E-mail: {CLICKPAY_SUPPORT.emailPrimary}</span>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <a 
                href={buildSupportWhatsAppUrl({
                  number: CLICKPAY_SUPPORT.whatsappPrimaryNumber,
                  message: `Olá Equipa ClickPay, preciso de suporte para a subscrição da empresa ${company.nome || ''} (NUIT ${company.nuit || ''}).`
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>Suporte via WhatsApp</span>
              </a>
              <a
                href={buildSupportMailtoUrl({
                  subject: `Reativação / Suporte Subscrição - ${company.nome || 'ClickPay'}`,
                  body: `Olá Equipa ClickPay,\n\nSolicito suporte para a conta da empresa ${company.nome || ''} (NUIT ${company.nuit || ''}).\n`
                })}
                className="px-4 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-extrabold transition-all shadow-xs"
              >
                Enviar E-mail ({CLICKPAY_SUPPORT.emailPrimary})
              </a>
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Abrir Ticket
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                localStorage.removeItem('paytek_auth');
                localStorage.removeItem('paytek_role');
                localStorage.removeItem('paytek_token');
                localStorage.removeItem('paytek_user');
                localStorage.removeItem('paytek_company_id');
                signOutGoogleSession().catch(() => {});
                setAuthenticated(false);
                setShowLogin(false);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Terminar Sessão
            </button>
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Verificar Estado
            </button>
          </div>
        </div>
        <SupportTicketModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          canalOrigem="Conta Suspensa ClickPay"
          defaultEmpresa={company.nome}
          defaultEmail={company.email}
          defaultTelefone={company.telefone}
          defaultAssunto="Reativação de Subscrição & Suporte Técnico"
        />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('paytek_auth');
    localStorage.removeItem('paytek_role');
    localStorage.removeItem('paytek_token');
    localStorage.removeItem('paytek_user');
    localStorage.removeItem('paytek_company_id');
    localStorage.removeItem('paytek_company_name');
    localStorage.removeItem('paytek_sub_plan');
    localStorage.removeItem('paytek_sub_status');
    localStorage.removeItem('paytek_sub_expire');
    signOutGoogleSession().catch(() => {});
    setAvailableCompanies([]);
    setAuthenticated(false);
    setShowLogin(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB] flex flex-col font-sans text-slate-900 antialiased">
      {/* Mobile Top Header Trigger */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 lg:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            id="mobile-open-left-nav-btn"
            title="Abrir Menu de Módulos"
          >
            <Layers size={14} />
            <span>Módulos ERP</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 truncate max-w-[180px]">
              {company?.nome || 'ClickPay'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Layout with Left-Side Modules Navigation */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-5 lg:px-6 py-5 flex-1 flex flex-col lg:flex-row gap-5 items-start">
        <LeftModuleNav
          activeTab={activeTab}
          financialSubTab={financialSubTab}
          userRole={userRole}
          company={company}
          availableCompanies={availableCompanies}
          onSwitchCompany={handleSwitchCompany}
          selectedPeriod={selectedPeriod}
          onSelectTab={(tab, subTab) => {
            setActiveTab(tab as any);
            if (subTab) setFinancialSubTab(subTab as any);
          }}
          isOpenMobile={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onLogout={handleLogout}
          onResetDb={handleResetDb}
          onResetCosts={handleResetCosts}
          onOpenSupport={() => setSupportModalOpen(true)}
        />

        {/* Dynamic Panel Content Container */}
        <main className="flex-1 min-w-0 w-full">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-7 h-7 border-2 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium text-slate-700">A carregar módulos ClickPay ERP...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 text-rose-950 rounded-xl p-6 border border-rose-200 text-center space-y-4">
              <p className="text-xs font-semibold text-rose-900">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  loadData();
                }}
                className="px-4 py-2 bg-rose-700 text-white font-semibold rounded-lg text-xs cursor-pointer hover:bg-rose-800"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'dashboard' && (
                    <Dashboard
                      employees={employees}
                      company={company}
                      summary={summary}
                      logs={logs}
                      onReload={loadData}
                      onDeleteLog={handleDeleteLog}
                      selectedPeriod={selectedPeriod}
                      onResetCosts={handleResetCosts}
                      userRole={userRole}
                      onNavigateTab={(tab, subTab) => {
                        setActiveTab(tab as any);
                        if (subTab) setFinancialSubTab(subTab as any);
                      }}
                    />
                  )}
                  {activeTab === 'crm' && (
                    company.subscription_plan === 'Bronze' ? (
                      <LockedFeatureOverlay 
                        featureName="CRM & Pipeline de Vendas" 
                        requiredPlan="Profissional (Silver)" 
                        description="O CRM integrado permite gerir clientes potenciais, acompanhar oportunidades comerciais e emitir propostas oficiais em PDF A4 padrão ClickPay ERP com um clique."
                      />
                    ) : (
                      <CRMVendas
                        companyData={company}
                        onNavigateToFinancial={() => {
                          setActiveTab('financial');
                          setFinancialSubTab('vendas');
                        }}
                      />
                    )
                  )}
                  {activeTab === 'employees' && (
                    <EmployeeDirectory
                      employees={employees}
                      company={company}
                      onAdd={handleAddEmployee}
                      onUpdate={handleUpdateEmployee}
                      onDelete={handleDeleteEmployee}
                      selectedPeriod={selectedPeriod}
                      onReload={loadData}
                      onReset={handleResetDb}
                      onSeed={handleSeedDemo}
                    />
                  )}
                  {activeTab === 'simulator' && <TaxSimulator />}
                  {activeTab === 'sissmo' && (
                    company.subscription_plan === 'Bronze' ? (
                      <LockedFeatureOverlay 
                        featureName="SISSMO & Guias Oficiais" 
                        requiredPlan="Profissional (Silver)" 
                        description="O módulo de exportação de dados para o SISSMO e Guias de INSS oficiais permite gerar os ficheiros compatíveis com o portal da Segurança Social Moçambicana num clique, reduzindo falhas manuais."
                      />
                    ) : (
                      <SISSMOExport
                        employees={employees}
                        company={company}
                        selectedPeriod={selectedPeriod}
                      />
                    )
                  )}
                  {activeTab === 'settings' && (
                    <CorporateSettings
                      company={company}
                      config={configFiscal}
                      onSave={handleSaveSettings}
                      onReset={handleResetDb}
                      onResetCosts={handleResetCosts}
                      userRole={userRole}
                      availableCompanies={availableCompanies}
                      onSwitchCompany={handleSwitchCompany}
                      onNavigateTab={(tab) => setActiveTab(tab as any)}
                    />
                  )}
                  {activeTab === 'credentials' && (
                    isFounderUser(userRole) ? (
                      <AccessCredentialManagement
                        company={company}
                        onUpdateCompany={(updated) => setCompany(updated)}
                        userRole={userRole}
                      />
                    ) : (
                      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-8 space-y-2">
                        <Lock size={20} className="mx-auto text-rose-700" />
                        <h3 className="text-sm font-bold text-slate-900">Acesso Restrito ao Fundador</h3>
                        <p className="text-xs text-slate-600">Esta secção é reservada exclusivamente ao Fundador do sistema.</p>
                      </div>
                    )
                  )}
                  {activeTab === 'fintech' && (
                    PAYMENTS_MODULE_LOCKED ? (
                      <PaymentsLockedOverlay
                        onGoToInvoicing={() => {
                          setActiveTab('financial');
                          setFinancialSubTab('vendas');
                        }}
                      />
                    ) : company.subscription_plan === 'Bronze' ? (
                      <LockedFeatureOverlay 
                        featureName="Vales & Fintech M-Pesa / e-Mola" 
                        requiredPlan="Profissional (Silver)" 
                        description="O adiantamento de salários e integração Fintech permite pagamentos automáticos de folha via carteiras móveis (M-Pesa e e-Mola) e reconciliação bancária instantânea."
                      />
                    ) : (
                      <FintechPayments
                        employees={employees}
                        company={company}
                        selectedPeriod={selectedPeriod}
                        logs={logs}
                        onReload={loadData}
                      />
                    )
                  )}
                  {activeTab === 'contracts' && (
                    company.subscription_plan === 'Bronze' ? (
                      <LockedFeatureOverlay 
                        featureName="Gestão Inteligente de Contratos" 
                        requiredPlan="Profissional (Silver)" 
                        description="A gestão inteligente de contratos garante a emissão automática, visualização de termos contratuais de acordo com a nova Lei do Trabalho de Moçambique, e controlo absoluto de renovações."
                      />
                    ) : (
                      <ContractManagement
                        company={company}
                        employees={employees}
                        onReload={loadData}
                      />
                    )
                  )}
                  {activeTab === 'alerts' && (
                    company.subscription_plan === 'Bronze' ? (
                      <LockedFeatureOverlay 
                        featureName="Alertas e Notificações Preventivas" 
                        requiredPlan="Profissional (Silver)" 
                        description="Receba alertas preventivos automáticos por e-mail e SMS sobre términos de contratos de trabalho, obrigações com o INSS, prazos fiscais da AT e novas conformidades."
                      />
                    ) : (
                      <AlertScheduler
                        company={company}
                        onReloadMainMetrics={loadData}
                      />
                    )
                  )}
                  {activeTab === 'clients' && (
                    isFounderUser(userRole) ? (
                      <ClientManagement
                        onCompanySwitched={loadData}
                        userRole={userRole}
                      />
                    ) : (
                      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-8 space-y-2">
                        <Lock size={20} className="mx-auto text-rose-700" />
                        <h3 className="text-sm font-bold text-slate-900">Acesso Restrito ao Fundador</h3>
                        <p className="text-xs text-slate-600">O Gestor de Clientes é reservado exclusivamente ao Fundador do sistema.</p>
                      </div>
                    )
                  )}
                  {activeTab === 'financial' && (
                    company.subscription_plan === 'Bronze' && financialSubTab === 'compras' ? (
                      <LockedFeatureOverlay 
                        featureName="Compras & Gestão de Stocks" 
                        requiredPlan="Profissional (Silver)" 
                        description="O módulo de compras permite registar facturas de fornecedores, deduzir IVA de acordo com o Art. 19 do Código do IVA, gerir inventário e emitir ordens de compra."
                      />
                    ) : company.subscription_plan === 'Bronze' && ['caixa', 'iva', 'relatorios', 'plano_contas'].includes(financialSubTab) ? (
                      <LockedFeatureOverlay 
                        featureName="Tesouraria & Contabilidade PGC-NIRF" 
                        requiredPlan="Empresarial (Gold)" 
                        description="A contabilidade PGC-NIRF completa com Livro de Caixa, Balanço Patrimonial, Demonstração de Resultados (DRE), Balancete e Apuramento IVA Modelo 01 está disponível no plano Empresarial."
                      />
                    ) : (company.subscription_plan === 'Silver' && ['relatorios', 'plano_contas'].includes(financialSubTab)) ? (
                      <LockedFeatureOverlay 
                        featureName="Relatórios Contabilísticos Avançados & PGC" 
                        requiredPlan="Empresarial (Gold)" 
                        description="O Balanço Patrimonial oficial e a Demonstração de Resultados do Exercício (DRE) sob o PGC-NIRF exigem o plano Empresarial."
                      />
                    ) : (
                      <FinancialManagement
                        company={company}
                        selectedPeriod={selectedPeriod}
                        initialSubTab={financialSubTab}
                      />
                    )
                  )}
                  {activeTab === 'brain' && (
                    (company.subscription_plan === 'Bronze' || company.subscription_plan === 'Silver') ? (
                      <LockedFeatureOverlay 
                        featureName="BRAIN IA · 4 Agentes Financeiros Autónomos" 
                        requiredPlan="Empresarial (Gold)" 
                        description="O BRAIN IA conta com 4 agentes de inteligência artificial autónomos treinados na legislação moçambicana (Consultor Tributário AT, Auditor Contabilístico PGC, Otimizador de Custos e Gestor de Folha)."
                      />
                    ) : (
                      <ClickPayBrain
                        company={company}
                        onNavigateToTab={(tab, subTab) => {
                          setActiveTab(tab as any);
                          if (subTab) setFinancialSubTab(subTab as any);
                        }}
                      />
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      <SupportTicketModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        canalOrigem="Painel Interno ClickPay ERP"
        defaultEmpresa={company?.nome}
        defaultEmail={company?.email}
        defaultTelefone={company?.telefone}
      />

      {/* Simple Professional Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[11px] text-slate-700 font-medium">
        <p>© 2026 ClickPay ERP. Todos os direitos reservados. Regulado pela Autoridade Tributária de Moçambique.</p>
      </footer>
    </div>
  );
}
