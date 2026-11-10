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
  Building,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { CompanyData } from '../types';
import { getFormattedCurrentDateLong } from '../db_tax';

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
  onResetCosts
}) => {
  const isClient = userRole === 'CLIENTE_EMPRESA';
  const subPlan = company?.subscription_plan || 'Bronze';
  const isBronze = subPlan === 'Bronze';
  const isSilver = subPlan === 'Silver';

  const isM1Active = (activeTab === 'financial' && financialSubTab === 'vendas') || activeTab === 'clients';
  const isM2Active = activeTab === 'financial' && financialSubTab === 'compras';
  const isM3Active = ['employees', 'sissmo', 'simulator', 'fintech', 'contracts'].includes(activeTab);
  const isM4Active = activeTab === 'financial' && ['caixa', 'iva', 'relatorios', 'conformidade', 'plano_contas'].includes(financialSubTab);

  const [liveFormattedDate, setLiveFormattedDate] = React.useState<string>(() => getFormattedCurrentDateLong());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveFormattedDate(getFormattedCurrentDateLong());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const navContent = (
    <div className="flex flex-col gap-3">
      {/* Brand & System Title (Clean & Executive) */}
      <div className="flex items-center gap-2.5 px-1 pb-3 border-b border-slate-200">
        <img 
          src="/logo-payroll.png" 
          alt="ClickPay" 
          className="h-8 w-auto object-contain shrink-0" 
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="min-w-0">
          <span className="text-base font-black text-slate-950 tracking-tight block leading-none">
            ClickPay
          </span>
          <span className="text-[10px] text-slate-500 font-medium tracking-normal block mt-0.5">
            ERP de Gestão Empresarial
          </span>
        </div>
      </div>

      {/* Empresa Ativa Card */}
      {company && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Empresa Ativa</span>
            <span className="text-[9px] bg-slate-200/80 text-slate-800 font-bold px-1.5 py-0.5 rounded">
              {company.regime_fiscal_pme?.includes('ISPC') ? 'ISPC 3%' : company.regime_fiscal_pme?.includes('Artigo 9º') ? 'Isento Art. 9' : 'IVA 16%'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {company.logo ? (
              <img 
                src={company.logo} 
                alt={company.nome} 
                className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-6 h-6 rounded bg-blue-900 text-white flex items-center justify-center font-black text-[9px] shrink-0">
                {company.nome ? company.nome.substring(0, 2).toUpperCase() : 'CP'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {!isClient && availableCompanies && availableCompanies.length > 1 && onSwitchCompany ? (
                <select
                  value={availableCompanies.find(c => c.isActive)?.id || ''}
                  onChange={(e) => onSwitchCompany(e.target.value)}
                  className="w-full text-xs font-bold text-slate-900 bg-transparent border-0 p-0 m-0 leading-tight focus:ring-0 focus:outline-none cursor-pointer truncate hover:text-blue-900"
                >
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-slate-900 font-semibold">
                      {c.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-bold text-slate-900 truncate" title={company.nome}>
                  {company.nome}
                </p>
              )}
            </div>
          </div>

          {/* NUIT & Status Info */}
          <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-mono font-medium">
              NUIT: {company.nuit || '402302399'}
            </span>
            <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online</span>
            </div>
          </div>
        </div>
      )}

      {/* Navegação ERP */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
          Navegação ERP
        </span>

        {/* 1. Visão Geral */}
        <button
          onClick={() => {
            onSelectTab('dashboard');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart3 size={16} strokeWidth={2.2} className="shrink-0" />
            <span className="text-xs truncate">Visão Geral</span>
          </div>
          <ChevronRight size={14} className={`shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        {/* 2. BRAIN IA */}
        <button
          onClick={() => {
            onSelectTab('brain');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
            activeTab === 'brain'
              ? 'bg-blue-950 text-white font-bold shadow-xs border border-blue-800'
              : 'text-slate-700 hover:text-blue-950 hover:bg-blue-50/70 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Brain size={16} strokeWidth={2.2} className={activeTab === 'brain' ? 'text-blue-300 shrink-0' : 'text-blue-800 shrink-0'} />
            <span className="text-xs truncate">BRAIN IA</span>
          </div>
          {(isBronze || isSilver) ? (
            <span title="Requer Plano Empresarial (Gold)" className="shrink-0 flex items-center">
              <Lock size={12} className="text-amber-500" />
            </span>
          ) : (
            <ChevronRight size={14} className={`shrink-0 ${activeTab === 'brain' ? 'text-white' : 'text-slate-400'}`} />
          )}
        </button>

        {/* 3. CRM & Vendas */}
        <button
          onClick={() => {
            onSelectTab('crm');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
            activeTab === 'crm'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Briefcase size={16} strokeWidth={2.2} className="shrink-0" />
            <span className="text-xs truncate">CRM & Vendas</span>
          </div>
          {isBronze ? (
            <span title="Requer Plano Profissional (Silver)" className="shrink-0 flex items-center">
              <Lock size={12} className="text-amber-500" />
            </span>
          ) : (
            <ChevronRight size={14} className={`shrink-0 ${activeTab === 'crm' ? 'text-white' : 'text-slate-400'}`} />
          )}
        </button>

        {/* 4. Facturação & Vendas */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              onSelectTab('financial', 'vendas');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
              isM1Active
                ? 'bg-blue-900 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Tag size={16} strokeWidth={2.2} className="shrink-0" />
              <span className="text-xs truncate">Facturação & Vendas</span>
            </div>
            <ChevronRight size={14} className={`shrink-0 transition-transform ${isM1Active ? 'text-white rotate-90' : 'text-slate-400'}`} />
          </button>

          {isM1Active && (
            <div className="ml-4 pl-2.5 border-l-2 border-blue-500/30 flex flex-col gap-0.5 py-1">
              <button
                onClick={() => {
                  onSelectTab('financial', 'vendas');
                  onCloseMobile();
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'financial' && financialSubTab === 'vendas'
                    ? 'bg-blue-100 text-blue-950 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Vendas & Facturação</span>
                {activeTab === 'financial' && financialSubTab === 'vendas' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>
                )}
              </button>

              {!isClient && (
                <button
                  onClick={() => {
                    onSelectTab('clients');
                    onCloseMobile();
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                    activeTab === 'clients'
                      ? 'bg-blue-100 text-blue-950 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span>Gestão de Clientes</span>
                  {activeTab === 'clients' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 5. Compras & Stocks */}
        <button
          onClick={() => {
            onSelectTab('financial', 'compras');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
            isM2Active
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingCart size={16} strokeWidth={2.2} className="shrink-0" />
            <span className="text-xs truncate">Compras & Stocks</span>
          </div>
          {isBronze ? (
            <span title="Requer Plano Profissional (Silver)" className="shrink-0 flex items-center">
              <Lock size={12} className="text-amber-500" />
            </span>
          ) : (
            <ChevronRight size={14} className={`shrink-0 ${isM2Active ? 'text-white' : 'text-slate-400'}`} />
          )}
        </button>

        {/* 6. Salários & RH */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              onSelectTab('employees');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
              isM3Active
                ? 'bg-blue-900 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Users size={16} strokeWidth={2.2} className="shrink-0" />
              <span className="text-xs truncate">Salários & RH</span>
            </div>
            <ChevronRight size={14} className={`shrink-0 transition-transform ${isM3Active ? 'text-white rotate-90' : 'text-slate-400'}`} />
          </button>

          {isM3Active && (
            <div className="ml-4 pl-2.5 border-l-2 border-blue-500/30 flex flex-col gap-0.5 py-1">
              <button
                onClick={() => { onSelectTab('employees'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'employees' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Colaboradores & Folha</span>
                {activeTab === 'employees' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('sissmo'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'sissmo' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  SISSMO & Guias INSS
                  {isBronze && <Lock size={10} className="text-amber-500" />}
                </span>
                {activeTab === 'sissmo' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('simulator'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'simulator' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Simulador IRPS/INSS</span>
                {activeTab === 'simulator' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('fintech'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'fintech' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  Vales & Fintech
                  {isBronze && <Lock size={10} className="text-amber-500" />}
                </span>
                {activeTab === 'fintech' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('contracts'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'contracts' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  Contratos de Trabalho
                  {isBronze && <Lock size={10} className="text-amber-500" />}
                </span>
                {activeTab === 'contracts' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
            </div>
          )}
        </div>

        {/* 7. Tesouraria & Contabilidade PGC */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              onSelectTab('financial', 'caixa');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
              isM4Active
                ? 'bg-blue-900 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen size={16} strokeWidth={2.2} className="shrink-0" />
              <span className="text-xs truncate">Tesouraria & PGC</span>
            </div>
            {isBronze ? (
              <span title="Requer Plano Profissional ou Empresarial" className="shrink-0 flex items-center">
                <Lock size={12} className="text-amber-500" />
              </span>
            ) : (
              <ChevronRight size={14} className={`shrink-0 transition-transform ${isM4Active ? 'text-white rotate-90' : 'text-slate-400'}`} />
            )}
          </button>

          {isM4Active && (
            <div className="ml-4 pl-2.5 border-l-2 border-blue-500/30 flex flex-col gap-0.5 py-1">
              <button
                onClick={() => { onSelectTab('financial', 'caixa'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'caixa' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Livro de Caixa & Bancos</span>
                {financialSubTab === 'caixa' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'iva'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'iva' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Apuramento IVA (M/01)</span>
                {financialSubTab === 'iva' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'relatorios'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'relatorios' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Relatórios ERP & DRE</span>
                {financialSubTab === 'relatorios' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'plano_contas'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'plano_contas' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Plano de Contas (PGC)</span>
                {financialSubTab === 'plano_contas' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'conformidade'); onCloseMobile(); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'conformidade' ? 'bg-blue-100 text-blue-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span>Guia & Conformidade AT</span>
                {financialSubTab === 'conformidade' && <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>}
              </button>
            </div>
          )}
        </div>

        {/* 8. Alertas Fiscais */}
        <button
          onClick={() => {
            onSelectTab('alerts');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell size={16} strokeWidth={2.2} className="shrink-0" />
            <span className="text-xs truncate">Alertas Fiscais</span>
          </div>
          {isBronze ? (
            <span title="Requer Plano Profissional (Silver)" className="shrink-0 flex items-center">
              <Lock size={12} className="text-amber-500" />
            </span>
          ) : (
            <ChevronRight size={14} className={`shrink-0 ${activeTab === 'alerts' ? 'text-white' : 'text-slate-400'}`} />
          )}
        </button>

        {/* 9. Configurações */}
        <button
          onClick={() => {
            onSelectTab('settings');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Settings size={16} strokeWidth={2.2} className="shrink-0" />
            <span className="text-xs truncate">Configurações</span>
          </div>
          <ChevronRight size={14} className={`shrink-0 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        {/* 10. Acesso & Credenciais */}
        <button
          onClick={() => {
            onSelectTab('credentials');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
            activeTab === 'credentials'
              ? 'bg-blue-900 text-white font-bold shadow-xs'
              : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <KeyRound size={16} strokeWidth={2.2} className="shrink-0 text-blue-900" />
            <span className="text-xs truncate font-semibold">Acesso & Credenciais</span>
          </div>
          <ChevronRight size={14} className={`shrink-0 ${activeTab === 'credentials' ? 'text-white' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* Gestão de Dados (Clean Utility Section) */}
      {(onResetCosts || onResetDb) && (
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-1">
            Gestão de Dados
          </span>
          {onResetCosts && (
            <button
              onClick={onResetCosts}
              className="w-full py-1.5 px-2.5 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              title="Zerar cálculos fiscais, compras, vendas e caixa"
            >
              <RotateCcw size={13} className="shrink-0 text-amber-700" />
              <span className="truncate">Zerar Cálculos Fiscais</span>
            </button>
          )}
          {onResetDb && (
            <button
              onClick={onResetDb}
              className="w-full py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              title="Limpar todos os dados e começar do zero"
            >
              <Trash2 size={13} className="shrink-0 text-slate-500" />
              <span className="truncate">Reiniciar Base de Dados</span>
            </button>
          )}
        </div>
      )}

      {/* Sessão Segura / Logout (Clean & Executive) */}
      <div className="mt-1 p-3 bg-red-50/60 border border-red-200 rounded-xl" id="logout-isolated-red-window">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping shrink-0" />
            <span className="text-[10px] font-bold text-red-950 uppercase tracking-wider">Sessão Segura</span>
          </div>
          <span className="text-[9px] font-mono text-red-900 font-semibold bg-white/80 border border-red-200 px-1.5 py-0.5 rounded">
            {liveFormattedDate}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          id="btn-sair-vermelho"
        >
          <LogOut size={14} strokeWidth={2.4} />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
          {navContent}
        </div>
      </aside>

      {/* Mobile Drawer / Slide-Over */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-over Left Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl p-4 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Menu ERP</span>
                  <button
                    onClick={onCloseMobile}
                    className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>
                {navContent}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
