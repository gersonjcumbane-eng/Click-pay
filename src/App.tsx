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
import { QuickIRPSWidget } from './components/QuickIRPSWidget';
import { LeftModuleNav } from './components/LeftModuleNav';
import { ClickPayBrain } from './components/ClickPayBrain';
import { updateConfiguracaoFiscal, updateEmpresa } from './db_tax';
import { useToast } from './context/ToastContext';

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
      className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-md border border-slate-100 max-w-2xl mx-auto my-8 space-y-6"
    >
      <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner animate-pulse">
        🔒
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-950">Módulo Bloqueado: {featureName}</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-4">
        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Requisito de Subscrição</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-800">Plano Necessário:</p>
            <p className="text-sm font-black text-blue-900">👑 {requiredPlan}</p>
          </div>
          <a
            href="mailto:gersonjcumbane@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20Upgrade%20-%20Payroll%20Tech%20Mz"
            className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-blue-900/10 whitespace-nowrap"
          >
            Fazer Upgrade Agora
          </a>
        </div>
      </div>

      <p className="text-[10px] text-slate-400">
        Para dúvidas sobre faturamento ou termos de licença, por favor contacte o Administrador <span className="font-semibold text-slate-600">gersonjcumbane@gmail.com</span>
      </p>
    </motion.div>
  );
}

export default function App() {
  const { showSuccess, showError, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'crm' | 'employees' | 'simulator' | 'sissmo' | 'settings' | 'fintech' | 'contracts' | 'alerts' | 'clients' | 'financial' | 'brain'>('dashboard');
  const [financialSubTab, setFinancialSubTab] = useState<'caixa' | 'compras' | 'vendas' | 'iva' | 'relatorios' | 'conformidade' | 'plano_contas'>('conformidade');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<'Bronze' | 'Silver' | 'Gold' | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
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

  const loadCompanies = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setAvailableCompanies(data);
      }
    } catch (err) {
      console.error('Erro ao descarregar as empresas autorizadas:', err);
    }
  };

  const handleSwitchCompany = async (companyId: string) => {
    try {
      const res = await fetch('/api/clients/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: companyId })
      });
      if (!res.ok) throw new Error('Não foi possível alterar a empresa ativa.');
      await loadData();
      await loadCompanies();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar empresa ativa.');
    }
  };
  const [configFiscal, setConfigFiscal] = useState<ConfigFiscal>({ taxa_inss_trabalhador: 3, taxa_inss_entidade: 4, valor_ipa_mensal: 0 });
  const [summary, setSummary] = useState<PayrollSummary>({
    periodoAtual: 'Julho 2026',
    kpis: { custoEmpresaTotal: 0, totalPagoAosFuncionarios: 0, retencaoEstadoTotal: 0 },
    dadosParaGraficoPizza: { labels: [], valoresEmMeticais: [] }
  });
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedPeriod = "Julho 2026";

  const loadData = async () => {
    try {
      const [empRes, configRes, summaryRes, logsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/config'),
        fetch(`/api/dashboard/resumo-financeiro?periodo=${encodeURIComponent(selectedPeriod)}`),
        fetch('/api/logs')
      ]);

      if (!empRes.ok || !configRes.ok || !summaryRes.ok || !logsRes.ok) {
        throw new Error('Falha ao descarregar as informações do servidor ERP.');
      }

      const employeesData = await empRes.json();
      const configData = await configRes.json();
      const summaryData = await summaryRes.json();
      const logsData = await logsRes.json();

      setEmployees(employeesData);
      setCompany(configData.empresaAtual);
      setConfigFiscal(configData.configuracaoFiscal);
      // Sincronizar as variáveis locais do db_tax para que as simulações em tempo real usem as taxas actualizadas
      updateConfiguracaoFiscal(configData.configuracaoFiscal);
      updateEmpresa(configData.empresaAtual);
      setSummary(summaryData);
      setLogs(logsData);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao ligar com o servidor ERP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadCompanies();
  }, []);

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
    if (plan === 'Gold' || plan === 'Platinum') limit = 20;

    if (currentCount >= limit) {
      alert(`Limite de colaboradores atingido! O seu plano atual (${
        plan === 'Bronze' ? 'Base (Bronze)' :
        plan === 'Silver' ? 'Profissional (Silver)' :
        plan === 'Gold' ? 'Empresarial (Gold)' : 'Base'
      }) permite no máximo ${limit} colaboradores. Por favor, faça upgrade para adicionar mais.`);
      return;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmp)
      });
      if (!res.ok) throw new Error('Não foi possível adicionar o colaborador.');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateEmployee = async (id: string, updatedFields: Partial<Employee>) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (!res.ok) throw new Error('Não foi possível atualizar o colaborador.');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Não foi possível remover o colaborador.');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Corporate Settings Actions
  const handleSaveSettings = async (newConfig: ConfigFiscal, newCompany: CompanyData) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: newConfig,
          empresa: newCompany
        })
      });
      if (!res.ok) throw new Error('Erro ao salvar as configurações.');
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetDb = async () => {
    if (confirm("Deseja apagar todos os colaboradores, logs de pagamento, vales e contratos para iniciar a simulação do zero? O ERP ficará totalmente limpo e pronto para novos registos.")) {
      try {
        const res = await fetch('/api/mvp/reset-total', { method: 'POST' });
        const data = await res.json();
        if (data.sucesso) {
          showSuccess("ERP Pronto! Base de dados zerada com sucesso.");
          await loadData();
        } else {
          showError(data.error || "Erro ao zerar base de dados.");
        }
      } catch (err: any) {
        showError("Falha ao comunicar com o servidor: " + err.message);
      }
    }
  };

  const handleResetCosts = async () => {
    if (confirm("Deseja redefinir e zerar todos os custos e histórico financeiro de Janeiro a Dezembro? A estrutura cadastral das empresas e colaboradores será integralmente preservada.")) {
      try {
        const res = await fetch('/api/mvp/reset-costs', { method: 'POST' });
        const data = await res.json();
        if (data.sucesso) {
          showSuccess("Reset de Custos Concluído! Todos os valores financeiros foram redefinidos para zero.");
          await loadData();
        } else {
          showError(data.error || "Erro ao redefinir custos.");
        }
      } catch (err: any) {
        showError("Falha ao comunicar com o servidor: " + err.message);
      }
    }
  };

  const handleSeedDemo = async () => {
    if (confirm("Deseja carregar os dados de demonstração (colaboradores pré-registados, contratos laborais e histórico de teste) para apresentar as funcionalidades do sistema instantaneamente?")) {
      try {
        const res = await fetch('/api/mvp/seed-demo', { method: 'POST' });
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
    if (userRole === 'CLIENTE_EMPRESA' && activeTab === 'clients') {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab]);

  const handleEnterPlanDemo = (plan: 'Bronze' | 'Silver' | 'Gold') => {
    setSelectedPlan(plan);
    setShowLogin(true);
  };

  if (!authenticated) {
    if (showOnboarding) {
      return (
        <OnboardingWizard
          onCancel={() => setShowOnboarding(false)}
          onSuccess={async () => {
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
              setAuthenticated(true);
              setShowLogin(false);
              await loadData();
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
              A assinatura do software <b>Payroll Tech Mz</b> para a empresa <b className="text-slate-800">{company.nome || 'sua empresa'}</b> encontra-se suspensa ou aguardando pagamento.
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
              <div>Mensalidade Estimada: <span className="font-bold text-slate-700">{(company.fee_base || 2000).toLocaleString()} MT</span></div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Para restabelecer o acesso total ao processamento de salários, segurança social (SISSMO), emissão de guias e transferências móveis, por favor contacte o seu gestor de conta ou envie comprovativo de pagamento para:
          </p>

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-xs font-semibold text-blue-900 flex flex-col gap-2 items-center">
            <span>📞 Suporte Payroll Tech: +258 861390061</span>
            <span>📧 Administrador: gersonjcumbane@gmail.com</span>
            <a 
              href="https://wa.me/258842014173?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20suporte%20para%20minha%20conta%20na%20plataforma%20Payroll%20Tech%20MZ."
              target="_blank"
              rel="noreferrer"
              className="mt-1 px-4 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.906-6.99C16.55 1.87 14.075.841 11.973.841c-5.441 0-9.865 4.422-9.869 9.865-.001 1.761.47 3.473 1.365 4.975l-.991 3.619 3.714-.974zm12.335-7.39c-.316-.158-1.87-.924-2.155-1.027-.285-.104-.492-.158-.7.158-.207.317-.803.104-.984.316-.18.213-.362.213-.678.055-.316-.158-1.334-.491-2.541-1.57C11.533 9.444 10.9 8.01 10.74 7.746c-.158-.317-.017-.488.141-.645.142-.142.316-.369.474-.554.158-.185.21-.317.316-.528.106-.211.053-.396-.026-.554-.079-.158-.7-1.691-.959-2.316-.252-.61-.51-.527-.7-.537-.181-.009-.39-.01-.599-.01-.21 0-.554.079-.844.396-.29.317-1.11 1.083-1.11 2.64 0 1.557 1.133 3.064 1.292 3.275.158.21 2.227 3.4 5.397 4.767.753.325 1.343.52 1.802.666.759.241 1.449.207 1.995.126.608-.091 1.87-.765 2.134-1.466.264-.702.264-1.303.185-1.428-.079-.126-.285-.21-.601-.368z"/>
              </svg>
              <span>Suporte via WhatsApp</span>
            </a>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                localStorage.removeItem('paytek_auth');
                localStorage.removeItem('paytek_role');
                localStorage.removeItem('paytek_token');
                localStorage.removeItem('paytek_user');
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
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('paytek_auth');
    localStorage.removeItem('paytek_role');
    localStorage.removeItem('paytek_token');
    localStorage.removeItem('paytek_user');
    setAuthenticated(false);
    setShowLogin(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-black antialiased">
      {/* Mobile Top Header Trigger (Minimalist & Clean) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 lg:hidden">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            id="mobile-open-left-nav-btn"
            title="Abrir Menu de Módulos"
          >
            <Layers size={15} strokeWidth={2.2} />
            <span>Módulos ERP</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-black truncate max-w-[170px]">
              {company?.nome || 'Payroll Tech Mz'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Layout with Left-Side Modules Navigation */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-5 lg:px-6 py-4 flex-1 flex flex-col lg:flex-row gap-5 items-start">
        
        {/* Left-Side ERP Modules Navigation Panel & Isolated Logout Window */}
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
        />

        {/* Dynamic Panel Content Container (Right / Center) */}
        <main className="flex-1 min-w-0 w-full bg-white">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-black">A iniciar módulos ERP de Moçambique...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-950 rounded-2xl p-6 border border-red-200 text-center space-y-4">
              <p className="text-sm font-bold text-red-900">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  loadData();
                }}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-red-700"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="relative bg-white">
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
                    <CRMVendas
                      companyData={company}
                      onNavigateToFinancial={() => {
                        setActiveTab('financial');
                        setFinancialSubTab('vendas');
                      }}
                    />
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
                    />
                  )}
                  {activeTab === 'fintech' && (
                    <FintechPayments
                      employees={employees}
                      company={company}
                      selectedPeriod={selectedPeriod}
                      onReload={loadData}
                    />
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
                    <ClientManagement
                      onCompanySwitched={loadData}
                    />
                  )}
                  {activeTab === 'financial' && (
                    <FinancialManagement
                      company={company}
                      selectedPeriod={selectedPeriod}
                      initialSubTab={financialSubTab}
                    />
                  )}
                  {activeTab === 'brain' && (
                    <ClickPayBrain
                      company={company}
                      onNavigateToTab={(tab, subTab) => {
                        setActiveTab(tab as any);
                        if (subTab) setFinancialSubTab(subTab as any);
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Simple Professional Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[11px] text-slate-700 font-medium">
        <p>© 2026 Payroll Tech Mz. Todos os direitos reservados. Regulado pela Autoridade Tributária de Moçambique.</p>
      </footer>

      {/* Widget Flutuante de Simulação Rápida IRPS */}
      <QuickIRPSWidget />
    </div>
  );
}
