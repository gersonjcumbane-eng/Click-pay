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
  Layers, 
  X, 
  ChevronRight, 
  LogOut,
  Building2,
  Calendar,
  CheckCircle2,
  Brain,
  Sparkles
} from 'lucide-react';
import { CompanyData } from '../types';

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
}

export const LeftModuleNav: React.FC<LeftModuleNavProps> = ({
  activeTab,
  financialSubTab,
  userRole,
  company,
  availableCompanies,
  onSwitchCompany,
  selectedPeriod,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onLogout
}) => {
  const isClient = userRole === 'CLIENTE_EMPRESA';

  const isM1Active = (activeTab === 'financial' && financialSubTab === 'vendas') || activeTab === 'clients';
  const isM2Active = activeTab === 'financial' && financialSubTab === 'compras';
  const isM3Active = ['employees', 'sissmo', 'simulator', 'fintech', 'contracts'].includes(activeTab);
  const isM4Active = activeTab === 'financial' && ['caixa', 'iva', 'relatorios', 'conformidade', 'plano_contas'].includes(financialSubTab);

  const formattedDate = (() => {
    const date = new Date();
    const day = date.getDate();
    const parts = selectedPeriod ? selectedPeriod.split(' ') : [];
    const activeMonth = parts[0] || 'Julho';
    const activeYear = parts[1] || '2026';
    return `${day} de ${activeMonth} de ${activeYear}`;
  })();

  const navContent = (
    <div className="flex flex-col gap-2.5">
      {/* Brand & System Title (Compact & Crisp) */}
      <div className="flex items-center gap-2 px-1 pb-2 border-b border-slate-200">
        <img 
          src="/logo-payroll.png" 
          alt="ClickPay" 
          className="h-8 w-auto object-contain shrink-0" 
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-black tracking-tight truncate">ClickPay</span>
            <span className="text-[8px] bg-blue-50 text-blue-950 border border-blue-200 font-extrabold px-1 py-0.2 rounded">ERP</span>
          </div>
          <p className="text-[9px] text-slate-800 font-bold truncate">Payroll Tech MZ · Moçambique</p>
        </div>
      </div>

      {/* Empresa Ativa & Status Box (Compressed Layout) */}
      {company && (
        <div className="p-2 bg-white border border-slate-200 rounded-xl flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-wider">Empresa Ativa</span>
            <span className="text-[8px] bg-blue-900 text-white font-extrabold px-1.5 py-0.2 rounded">
              {company.regime_fiscal_pme?.includes('ISPC') ? 'ISPC 3%' : company.regime_fiscal_pme?.includes('Artigo 9º') ? 'Isento Art.9' : 'IVA 16%'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {company.logo ? (
              <img 
                src={company.logo} 
                alt={company.nome} 
                className="w-5 h-5 rounded object-cover border border-slate-200 shrink-0" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-5 h-5 rounded bg-blue-100 text-blue-950 flex items-center justify-center font-black text-[8px] shrink-0">
                {company.nome ? company.nome.substring(0, 2).toUpperCase() : 'EM'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {!isClient && availableCompanies && availableCompanies.length > 1 && onSwitchCompany ? (
                <select
                  value={availableCompanies.find(c => c.isActive)?.id || ''}
                  onChange={(e) => onSwitchCompany(e.target.value)}
                  className="text-[11px] font-black text-black bg-transparent border-0 p-0 m-0 leading-tight focus:ring-0 focus:outline-none cursor-pointer truncate max-w-[140px] hover:text-blue-900"
                >
                  {availableCompanies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-black font-semibold">
                      {c.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] font-black text-black truncate" title={company.nome}>
                  {company.nome}
                </p>
              )}
            </div>
          </div>

          {/* Sector & Server Line */}
          <div className="pt-1 border-t border-slate-150 flex items-center justify-between text-[9px]">
            <span className="text-black font-bold truncate max-w-[110px]" title={company.sector_negocio || 'Geral'}>
              {company.sector_negocio || 'Serviços & Comércio'}
            </span>
            <div className="flex items-center gap-1 text-emerald-800 font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-[8px]">PayTek Activo</span>
            </div>
          </div>
        </div>
      )}

      {/* Module Navigation List - Compressed & High Visual Quality */}
      <div className="flex flex-col gap-1">
        <div className="px-1 pb-0.5 flex items-center justify-between">
          <span className="text-[9px] font-black text-black uppercase tracking-wider">Módulos ERP</span>
          <span className="text-[8px] text-slate-800 font-extrabold">8 Áreas</span>
        </div>

        {/* 1. Visão Geral */}
        <button
          onClick={() => {
            onSelectTab('dashboard');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
            activeTab === 'dashboard'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-black border border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
              activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'bg-slate-100 text-black group-hover:bg-blue-50 group-hover:text-blue-900'
            }`}>
              <BarChart3 size={14} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className={`text-[11px] font-black block truncate leading-tight ${
                activeTab === 'dashboard' ? 'text-white' : 'text-black'
              }`}>
                Visão Geral
              </span>
            </div>
          </div>
          <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 ${
            activeTab === 'dashboard' ? 'text-white' : 'text-slate-500 group-hover:text-black'
          }`} />
        </button>

        {/* 2. BRAIN IA · 4 Assistentes Financeiros (Inspirado Bujeti) */}
        <button
          onClick={() => {
            onSelectTab('brain');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
            activeTab === 'brain'
              ? 'bg-blue-950 text-white shadow-xs border border-blue-800'
              : 'bg-gradient-to-r from-blue-50/70 to-indigo-50/70 hover:from-blue-100 hover:to-indigo-100 text-black border border-blue-200 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
              activeTab === 'brain' ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-700 text-white shadow-2xs'
            }`}>
              <Brain size={14} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className={`text-[11px] font-black truncate leading-tight ${
                activeTab === 'brain' ? 'text-white' : 'text-blue-950'
              }`}>
                BRAIN IA
              </span>
              <span className={`text-[7px] font-black px-1 py-0.2 rounded uppercase flex items-center gap-0.5 ${
                activeTab === 'brain' ? 'bg-blue-500/30 text-blue-200' : 'bg-blue-900 text-white font-extrabold'
              }`}>
                <Sparkles size={8} /> 4 AGENTES
              </span>
            </div>
          </div>
          <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 ${
            activeTab === 'brain' ? 'text-white' : 'text-blue-900 group-hover:text-black'
          }`} />
        </button>

        {/* 3. CRM & Vendas */}
        <button
          onClick={() => {
            onSelectTab('crm');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
            activeTab === 'crm'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white hover:bg-indigo-50/40 text-black border border-slate-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
              activeTab === 'crm' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-900 group-hover:bg-indigo-100'
            }`}>
              <Briefcase size={14} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className={`text-[11px] font-black truncate leading-tight ${
                activeTab === 'crm' ? 'text-white' : 'text-black'
              }`}>
                CRM & Vendas
              </span>
              <span className={`text-[7px] font-black px-1 py-0.2 rounded uppercase ${
                activeTab === 'crm' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-950 font-extrabold'
              }`}>CRM</span>
            </div>
          </div>
          <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 ${
            activeTab === 'crm' ? 'text-white' : 'text-slate-500 group-hover:text-black'
          }`} />
        </button>

        {/* 3. M1 · Facturação & Vendas */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              onSelectTab('financial', 'vendas');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
              isM1Active
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white hover:bg-blue-50/40 text-black border border-slate-200 hover:border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
                isM1Active ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-900 group-hover:bg-blue-100'
              }`}>
                <Tag size={14} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex items-center gap-1.5">
                <span className={`text-[11px] font-black truncate leading-tight ${
                  isM1Active ? 'text-white' : 'text-black'
                }`}>
                  Facturação
                </span>
                <span className={`text-[7px] font-black px-1 py-0.2 rounded uppercase ${
                  isM1Active ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-950 font-extrabold'
                }`}>M1</span>
              </div>
            </div>
            <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 transition-transform ${
              isM1Active ? 'text-white rotate-90' : 'text-slate-500 group-hover:text-black'
            }`} />
          </button>

          {/* Sub-items for M1 (Tight & Readable) */}
          {isM1Active && (
            <div className="ml-3 pl-2.5 border-l-2 border-blue-400 flex flex-col gap-0.5 py-0.5">
              <button
                onClick={() => {
                  onSelectTab('financial', 'vendas');
                  onCloseMobile();
                }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'financial' && financialSubTab === 'vendas'
                    ? 'bg-blue-100 text-blue-950 font-black'
                    : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Vendas & Facturação</span>
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
                  className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                    activeTab === 'clients'
                      ? 'bg-blue-100 text-blue-950 font-black'
                      : 'text-black hover:bg-slate-100'
                  }`}
                >
                  <span>• Gestão de Clientes</span>
                  {activeTab === 'clients' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-900"></span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 4. M2 · Compras & Stocks */}
        <button
          onClick={() => {
            onSelectTab('financial', 'compras');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
            isM2Active
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white hover:bg-amber-50/40 text-black border border-slate-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
              isM2Active ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-900 group-hover:bg-amber-100'
            }`}>
              <ShoppingCart size={14} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className={`text-[11px] font-black truncate leading-tight ${
                isM2Active ? 'text-white' : 'text-black'
              }`}>
                Compras & Stocks
              </span>
              <span className={`text-[7px] font-black px-1 py-0.2 rounded uppercase ${
                isM2Active ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-950 font-extrabold'
              }`}>M2</span>
            </div>
          </div>
          <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 ${
            isM2Active ? 'text-white' : 'text-slate-500 group-hover:text-black'
          }`} />
        </button>

        {/* 5. M3 · Salários & RH */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              onSelectTab('employees');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
              isM3Active
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white hover:bg-emerald-50/40 text-black border border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
                isM3Active ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-900 group-hover:bg-emerald-100'
              }`}>
                <Users size={14} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex items-center gap-1.5">
                <span className={`text-[11px] font-black truncate leading-tight ${
                  isM3Active ? 'text-white' : 'text-black'
                }`}>
                  Salários & RH
                </span>
                <span className={`text-[7px] font-black px-1 py-0.2 rounded uppercase ${
                  isM3Active ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-950 font-extrabold'
                }`}>M3</span>
              </div>
            </div>
            <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 transition-transform ${
              isM3Active ? 'text-white rotate-90' : 'text-slate-500 group-hover:text-black'
            }`} />
          </button>

          {/* Sub-items for M3 (Compressed) */}
          {isM3Active && (
            <div className="ml-3 pl-2.5 border-l-2 border-emerald-500 flex flex-col gap-0.5 py-0.5">
              <button
                onClick={() => { onSelectTab('employees'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'employees' ? 'bg-emerald-100 text-emerald-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Colaboradores & Folha</span>
                {activeTab === 'employees' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('sissmo'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'sissmo' ? 'bg-emerald-100 text-emerald-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• SISSMO & Guias INSS</span>
                {activeTab === 'sissmo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('simulator'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'simulator' ? 'bg-emerald-100 text-emerald-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Simulador IRPS/INSS</span>
                {activeTab === 'simulator' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('fintech'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'fintech' ? 'bg-emerald-100 text-emerald-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Vales & Fintech</span>
                {activeTab === 'fintech' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('contracts'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  activeTab === 'contracts' ? 'bg-emerald-100 text-emerald-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Contratos de Trabalho</span>
                {activeTab === 'contracts' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>}
              </button>
            </div>
          )}
        </div>

        {/* 6. M4 · Tesouraria & Contabilidade */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              onSelectTab('financial', 'caixa');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
              isM4Active
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white hover:bg-indigo-50/40 text-black border border-slate-200 hover:border-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
                isM4Active ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-900 group-hover:bg-indigo-100'
              }`}>
                <BookOpen size={14} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex items-center gap-1.5">
                <span className={`text-[11px] font-black truncate leading-tight ${
                  isM4Active ? 'text-white' : 'text-black'
                }`}>
                  Tesouraria & PGC
                </span>
                <span className={`text-[7px] font-black px-1 py-0.2 rounded uppercase ${
                  isM4Active ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-950 font-extrabold'
                }`}>M4</span>
              </div>
            </div>
            <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 transition-transform ${
              isM4Active ? 'text-white rotate-90' : 'text-slate-500 group-hover:text-black'
            }`} />
          </button>

          {/* Sub-items for M4 (Compressed) */}
          {isM4Active && (
            <div className="ml-3 pl-2.5 border-l-2 border-indigo-400 flex flex-col gap-0.5 py-0.5">
              <button
                onClick={() => { onSelectTab('financial', 'caixa'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'caixa' ? 'bg-indigo-100 text-indigo-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Livro de Caixa & Bancos</span>
                {financialSubTab === 'caixa' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'iva'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'iva' ? 'bg-indigo-100 text-indigo-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Apuramento IVA (M/01)</span>
                {financialSubTab === 'iva' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'relatorios'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'relatorios' ? 'bg-indigo-100 text-indigo-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Relatórios ERP & DRE</span>
                {financialSubTab === 'relatorios' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'plano_contas'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'plano_contas' ? 'bg-indigo-100 text-indigo-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Plano de Contas (PGC)</span>
                {financialSubTab === 'plano_contas' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-700"></span>}
              </button>
              <button
                onClick={() => { onSelectTab('financial', 'conformidade'); onCloseMobile(); }}
                className={`text-[10px] font-black px-2 py-1 rounded text-left transition-all cursor-pointer flex items-center justify-between ${
                  financialSubTab === 'conformidade' ? 'bg-indigo-100 text-indigo-950 font-black' : 'text-black hover:bg-slate-100'
                }`}
              >
                <span>• Guia & Conformidade AT</span>
                {financialSubTab === 'conformidade' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-700"></span>}
              </button>
            </div>
          )}
        </div>

        {/* 7. M5 · Alertas Fiscais & IA */}
        <button
          onClick={() => {
            onSelectTab('alerts');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
            activeTab === 'alerts'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white hover:bg-rose-50/40 text-black border border-slate-200 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
              activeTab === 'alerts' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-900 group-hover:bg-rose-100'
            }`}>
              <Bell size={14} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className={`text-[11px] font-black truncate leading-tight ${
                activeTab === 'alerts' ? 'text-white' : 'text-black'
              }`}>
                Alertas Fiscais
              </span>
              <span className={`text-[7px] font-black px-1 py-0.2 rounded uppercase ${
                activeTab === 'alerts' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-950 font-extrabold'
              }`}>M5</span>
            </div>
          </div>
          <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 ${
            activeTab === 'alerts' ? 'text-white' : 'text-slate-500 group-hover:text-black'
          }`} />
        </button>

        {/* 8. Configurações */}
        <button
          onClick={() => {
            onSelectTab('settings');
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
            activeTab === 'settings'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-black border border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${
              activeTab === 'settings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-black group-hover:bg-slate-200'
            }`}>
              <Settings size={14} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className={`text-[11px] font-black block truncate leading-tight ${
                activeTab === 'settings' ? 'text-white' : 'text-black'
              }`}>
                Configurações
              </span>
            </div>
          </div>
          <ChevronRight size={13} strokeWidth={2.5} className={`shrink-0 ${
            activeTab === 'settings' ? 'text-white' : 'text-slate-500 group-hover:text-black'
          }`} />
        </button>

      </div>

      {/* Isolated Red Logout Window / Container (Compact & High Contrast) */}
      <div className="mt-1 p-2.5 bg-red-50/95 border border-red-300 rounded-xl shadow-xs" id="logout-isolated-red-window">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span className="text-[9px] font-black text-red-950 uppercase tracking-wider">Sessão Segura</span>
          </div>
          <span className="text-[8px] font-mono text-red-950 font-bold bg-red-100 border border-red-200 px-1 py-0.2 rounded">
            {formattedDate}
          </span>
        </div>
        <p className="text-[9px] text-red-950 font-bold mb-2 leading-tight">
          Terminar sessão com segurança?
        </p>
        <button
          onClick={onLogout}
          className="w-full py-1.5 px-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-[11px] rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-[1.01]"
          id="btn-sair-vermelho"
        >
          <LogOut size={13} strokeWidth={2.5} />
          <span>Sair do Sistema</span>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar with compressed width & spacing */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-2.5">
          {navContent}
        </div>
      </aside>

      {/* Mobile Drawer / Slide-Over from Left */}
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
              className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl p-3 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-black text-black uppercase tracking-wider">Menu ERP</span>
                  <button
                    onClick={onCloseMobile}
                    className="p-1 text-black hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.5} />
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
