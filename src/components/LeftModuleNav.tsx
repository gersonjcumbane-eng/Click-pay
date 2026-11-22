import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  Briefcase,
  Tag,
  ShoppingCart,
  Users,
  BookOpen,
  Bell,
  Settings,
  X,
  ChevronRight,
  LogOut,
  Brain,
  RotateCcw,
  Trash2,
  Lock,
  KeyRound,
  MessageCircle,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { CompanyData } from '../types';
import { getFormattedCurrentDateLong } from '../db_tax';
import { isFounderUser } from '../lib/authSession';

export interface LeftModuleNavProps {
  activeTab: string;
  financialSubTab: string;
  userRole?: string | null;
  company?: CompanyData;
  availableCompanies?: any[];
  onSwitchCompany?: (id: string) => void;
  selectedPeriod?: string;
  onSelectTab: (tab: any, subTab?: any) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  onResetDb?: () => void;
  onResetCosts?: () => void;
  onOpenSupport?: () => void;
}

export const LeftModuleNav: React.FC<LeftModuleNavProps> = ({
  activeTab,
  financialSubTab,
  userRole,
  company,
  availableCompanies,
  onSwitchCompany,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onLogout,
  onResetDb,
  onResetCosts,
  onOpenSupport
}) => {
  const isFounder = isFounderUser(userRole);
  const subPlan = company?.subscription_plan || 'Bronze';
  const isBronze = subPlan === 'Bronze';
  const isSilver = subPlan === 'Silver';

  const isM1Active = activeTab === 'financial' && financialSubTab === 'vendas';
  const isM2Active = activeTab === 'financial' && financialSubTab === 'compras';
  const isM3Active = ['employees', 'sissmo', 'simulator', 'fintech', 'contracts'].includes(
    activeTab
  );
  const isM4Active =
    activeTab === 'financial' &&
    ['caixa', 'iva', 'relatorios', 'conformidade', 'plano_contas'].includes(financialSubTab);

  const [liveFormattedDate, setLiveFormattedDate] = React.useState<string>(() =>
    getFormattedCurrentDateLong()
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveFormattedDate(getFormattedCurrentDateLong());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const taxRegimeLabel = company?.regime_fiscal_pme?.includes('ISPC')
    ? 'ISPC 3%'
    : company?.regime_fiscal_pme?.includes('Artigo 9º')
    ? 'Isento Art. 9'
    : 'IVA 16%';

  const navContent = (
    <div className="flex flex-col gap-4">
      {/* Brand Lockup */}
      <div className="flex items-center gap-2.5 px-1 pb-3 border-b border-slate-200">
        <img
          src="/clickpay-logo.png"
          alt=""
          className="h-8 w-auto object-contain shrink-0"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="min-w-0">
          <span className="text-[15px] font-semibold text-slate-950 tracking-tight block leading-none">
            ClickPay
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            Gestão Empresarial
          </span>
        </div>
      </div>

      {/* Active Entity Switcher / Summary */}
      {company && (
        <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2">
            {company.logo ? (
              <img
                src={company.logo}
                alt=""
                className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-semibold text-[10px] shrink-0">
                {company.nome ? company.nome.substring(0, 2).toUpperCase() : 'CP'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {isFounder && availableCompanies && availableCompanies.length > 1 && onSwitchCompany ? (
                <select
                  value={availableCompanies.find((c) => c.isActive)?.id || ''}
                  onChange={(e) => onSwitchCompany(e.target.value)}
                  aria-label="Selecionar empresa ativa"
                  className="w-full text-xs font-semibold text-slate-900 bg-transparent border-0 p-0 m-0 leading-tight focus:ring-0 focus:outline-none cursor-pointer truncate hover:text-blue-900"
                >
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-slate-900">
                      {c.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-semibold text-slate-900 truncate" title={company.nome}>
                  {company.nome}
                </p>
              )}
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono tabular-nums">NUIT {company.nuit || '402302399'}</span>
            <span>{taxRegimeLabel}</span>
          </div>
        </div>
      )}

      {/* Primary ERP Navigation */}
      <nav aria-label="Módulos ERP" className="flex flex-col gap-0.5">
        <span className="text-[11px] font-medium text-slate-400 px-2 pb-1">
          Módulos
        </span>

        {/* 1. Visão Geral */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('dashboard');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-blue-900 text-white font-semibold'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <BarChart3 size={15} className="shrink-0" />
            <span className="text-xs truncate">Visão Geral</span>
          </span>
        </button>

        {/* 2. Assistente IA */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('brain');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            activeTab === 'brain'
              ? 'bg-blue-900 text-white font-semibold'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Brain size={15} className="shrink-0" />
            <span className="text-xs truncate">ClickPay IA</span>
          </span>
          {(isBronze || isSilver) && (
            <span title="Requer Plano Empresarial (Gold)" className="shrink-0">
              <Lock size={12} className="text-amber-600" />
            </span>
          )}
        </button>

        {/* 3. CRM & Vendas */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('crm');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            activeTab === 'crm'
              ? 'bg-blue-900 text-white font-semibold'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Briefcase size={15} className="shrink-0" />
            <span className="text-xs truncate">CRM &amp; Vendas</span>
          </span>
          {isBronze && (
            <span title="Requer Plano Profissional (Silver)" className="shrink-0">
              <Lock size={12} className="text-amber-600" />
            </span>
          )}
        </button>

        {/* 4. Facturação & Vendas */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('financial', 'vendas');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            isM1Active
              ? 'bg-blue-900 text-white font-semibold'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Tag size={15} className="shrink-0" />
            <span className="text-xs truncate">Facturação &amp; Vendas</span>
          </span>
        </button>

        {/* 5. Compras & Stocks */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('financial', 'compras');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            isM2Active
              ? 'bg-blue-900 text-white font-semibold'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <ShoppingCart size={15} className="shrink-0" />
            <span className="text-xs truncate">Compras &amp; Stocks</span>
          </span>
          {isBronze && (
            <span title="Requer Plano Profissional (Silver)" className="shrink-0">
              <Lock size={12} className="text-amber-600" />
            </span>
          )}
        </button>

        {/* 6. Salários & RH */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onSelectTab('employees');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              isM3Active
                ? 'bg-blue-900 text-white font-semibold'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Users size={15} className="shrink-0" />
              <span className="text-xs truncate">Salários &amp; RH</span>
            </span>
            <ChevronRight
              size={13}
              className={`shrink-0 transition-transform ${
                isM3Active ? 'text-white rotate-90' : 'text-slate-400'
              }`}
            />
          </button>

          {isM3Active && (
            <div className="ml-3.5 pl-2.5 border-l border-slate-200 flex flex-col gap-0.5 py-1">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('employees');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  activeTab === 'employees'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                Colaboradores &amp; Folha
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('sissmo');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer flex items-center justify-between ${
                  activeTab === 'sissmo'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <span>SISSMO &amp; Guias INSS</span>
                {isBronze && <Lock size={10} className="text-amber-600" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('simulator');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  activeTab === 'simulator'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                Simulador IRPS/INSS
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('fintech');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer flex items-center justify-between ${
                  activeTab === 'fintech'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <span>Vales &amp; Carteira Móvel</span>
                {isBronze && <Lock size={10} className="text-amber-600" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('contracts');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer flex items-center justify-between ${
                  activeTab === 'contracts'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <span>Contratos de Trabalho</span>
                {isBronze && <Lock size={10} className="text-amber-600" />}
              </button>
            </div>
          )}
        </div>

        {/* 7. Tesouraria & Contabilidade PGC */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onSelectTab('financial', 'caixa');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
              isM4Active
                ? 'bg-blue-900 text-white font-semibold'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <BookOpen size={15} className="shrink-0" />
              <span className="text-xs truncate">Tesouraria &amp; PGC</span>
            </span>
            {isBronze ? (
              <span title="Requer Plano Profissional ou Empresarial" className="shrink-0">
                <Lock size={12} className="text-amber-600" />
              </span>
            ) : (
              <ChevronRight
                size={13}
                className={`shrink-0 transition-transform ${
                  isM4Active ? 'text-white rotate-90' : 'text-slate-400'
                }`}
              />
            )}
          </button>

          {isM4Active && (
            <div className="ml-3.5 pl-2.5 border-l border-slate-200 flex flex-col gap-0.5 py-1">
              <button
                type="button"
                onClick={() => {
                  onSelectTab('financial', 'caixa');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  financialSubTab === 'caixa'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                Livro de Caixa &amp; Bancos
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('financial', 'iva');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  financialSubTab === 'iva'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                Apuramento IVA (M/01)
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('financial', 'relatorios');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  financialSubTab === 'relatorios'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                Relatórios ERP &amp; DRE
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('financial', 'plano_contas');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  financialSubTab === 'plano_contas'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                Plano de Contas (PGC)
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectTab('financial', 'conformidade');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  financialSubTab === 'conformidade'
                    ? 'bg-slate-100 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                Guia &amp; Conformidade AT
              </button>
            </div>
          )}
        </div>

        {/* 8. Alertas Fiscais */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('alerts');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-blue-900 text-white font-semibold'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Bell size={15} className="shrink-0" />
            <span className="text-xs truncate">Alertas Fiscais</span>
          </span>
          {isBronze && (
            <span title="Requer Plano Profissional (Silver)" className="shrink-0">
              <Lock size={12} className="text-amber-600" />
            </span>
          )}
        </button>

        {/* 9. Configurações */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('settings');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-blue-900 text-white font-semibold'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Settings size={15} className="shrink-0" />
            <span className="text-xs truncate">Configurações</span>
          </span>
        </button>

        {/* Administração Exclusiva do Fundador */}
        {isFounder && (
          <div className="pt-2 mt-2 border-t border-slate-200 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-blue-900 px-2 pb-1 flex items-center gap-1 uppercase tracking-wider">
              <ShieldCheck size={11} className="shrink-0" />
              Fundador
            </span>

            <button
              type="button"
              onClick={() => {
                onSelectTab('clients');
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                activeTab === 'clients'
                  ? 'bg-blue-900 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Building2 size={15} className="shrink-0" />
                <span className="text-xs truncate">Gestor de Clientes</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('credentials');
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-blue-900 text-white font-semibold'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <KeyRound size={15} className="shrink-0" />
                <span className="text-xs truncate">Acesso &amp; Credenciais</span>
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Data Maintenance */}
      {(onResetCosts || onResetDb) && (
        <div className="pt-3 border-t border-slate-200 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block px-2 pb-0.5">
            Manutenção
          </span>
          {onResetCosts && (
            <button
              type="button"
              onClick={onResetCosts}
              className="w-full py-1.5 px-2.5 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
              title="Zerar cálculos fiscais, compras, vendas e caixa"
            >
              <RotateCcw size={13} className="shrink-0 text-slate-500" />
              <span className="truncate">Zerar Cálculos Fiscais</span>
            </button>
          )}
          {onResetDb && (
            <button
              type="button"
              onClick={onResetDb}
              className="w-full py-1.5 px-2.5 hover:bg-rose-50 text-slate-700 hover:text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
              title="Limpar todos os dados e começar do zero"
            >
              <Trash2 size={13} className="shrink-0 text-slate-500" />
              <span className="truncate">Reiniciar Base de Dados</span>
            </button>
          )}
        </div>
      )}

      {/* Session Footer */}
      <div className="pt-3 border-t border-slate-200 space-y-2" id="logout-isolated-red-window">
        {onOpenSupport && (
          <button
            type="button"
            onClick={() => {
              onOpenSupport();
              onCloseMobile();
            }}
            className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <MessageCircle size={14} className="text-blue-900" />
            <span>Suporte Técnico</span>
          </button>
        )}
        <p className="text-[11px] text-slate-500 px-1 tabular-nums">{liveFormattedDate}</p>
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-800 border border-slate-200 hover:border-rose-200 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          id="btn-sair-vermelho"
        >
          <LogOut size={14} />
          <span>Terminar Sessão</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5">{navContent}</div>
      </aside>

      {/* Mobile Drawer / Slide-Over */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-xl p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-900">Menu ERP</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Fechar menu"
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              {navContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
