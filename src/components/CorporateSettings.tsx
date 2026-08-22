/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Settings2, 
  Percent, 
  Save, 
  CheckCircle2, 
  Coins,
  MapPin,
  FileText,
  Upload,
  Globe,
  Mail,
  Phone,
  Receipt,
  Image as ImageIcon,
  Cloud,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Database,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { CompanyData, ConfigFiscal, EscalaoFiscalMoz } from '../types';
import { matrizFiscaisMoçambique } from '../db_tax';
import { useToast } from '../context/ToastContext';

interface CorporateSettingsProps {
  company: CompanyData;
  config: ConfigFiscal;
  onSave: (config: ConfigFiscal, company: CompanyData) => Promise<void>;
  onReset?: () => Promise<void>;
  onResetCosts?: () => Promise<void>;
  userRole?: string | null;
  availableCompanies?: any[];
  onSwitchCompany?: (companyId: string) => Promise<void>;
}

export default function CorporateSettings({
  company,
  config,
  onSave,
  onReset,
  onResetCosts,
  userRole: propUserRole,
  availableCompanies,
  onSwitchCompany
}: CorporateSettingsProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const localUserRole = localStorage.getItem('paytek_role');
  const userRole = propUserRole || localUserRole;
  const isClient = userRole === 'CLIENTE_EMPRESA';

  // Company state
  const [nome, setNome] = useState(company.nome || "Sua Empresa Lda");
  const [pais, setPais] = useState(company.pais || "Moçambique");
  const [provincia, setProvincia] = useState(company.provincia || "Maputo Cidade");
  const [distrito, setDistrito] = useState(company.distrito || "Maputo Cidade");
  const [regimeIva, setRegimeIva] = useState(company.regime_iva || "IVA Normal");
  const [sectorNegocio, setSectorNegocio] = useState(company.sector_negocio || "Comércio & Retalho");
  const [tamanhoEmpresa, setTamanhoEmpresa] = useState(company.tamanho_empresa || "Microempresa (1-5 Colaboradores)");
  const [regimeFiscalPme, setRegimeFiscalPme] = useState(company.regime_fiscal_pme || "ISPC (Imposto Simplificado 3%)");
  const [nuel, setNuel] = useState(company.nuel || "");
  const [nuit, setNuit] = useState(company.nuit || "400111222");
  const [email, setEmail] = useState(company.email || "contacto@suaempresa.co.mz");
  const [telefone, setTelefone] = useState(company.telefone || "+258 861390061");
  const [logo, setLogo] = useState(company.logo || "");

  // Tax state
  const [taxaInssTrabalhador, setTaxaInssTrabalhador] = useState(config.taxa_inss_trabalhador);
  const [taxaInssEntidade, setTaxaInssEntidade] = useState(config.taxa_inss_entidade);
  const [valorIpaMensal, setValorIpaMensal] = useState(config.valor_ipa_mensal);

  // Formulas state
  const [divisorDiasFaltas, setDivisorDiasFaltas] = useState(config.divisor_dias_faltas || 30);
  const [formulaFaltasModelo, setFormulaFaltasModelo] = useState(config.formula_faltas_modelo || "(Salário Base / Divisor) * Dias de Faltas");
  const [formulaIrpsModelo, setFormulaIrpsModelo] = useState(config.formula_irps_modelo || "Valor Fixo + (Matéria Coletável - Limite Mínimo) * Taxa - Dedução por Dependente");
  const [escaloesIrps, setEscaloesIrps] = useState<EscalaoFiscalMoz[]>(() => {
    return config.escaloes_irps && config.escaloes_irps.length > 0 
      ? JSON.parse(JSON.stringify(config.escaloes_irps)) 
      : JSON.parse(JSON.stringify(matrizFiscaisMoçambique));
  });

  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showPerfilSuccess, setShowPerfilSuccess] = useState(false);
  const [showConfigSuccess, setShowConfigSuccess] = useState(false);

  // Backup States
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [backupStep, setBackupStep] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadBackupHistory = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/backup/history');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBackups(data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  React.useEffect(() => {
    loadBackupHistory();
  }, [company.nuit]);

  const handleTriggerBackup = async () => {
    setTriggeringBackup(true);
    setBackupStep('A ligar à Cloud com encriptação SSL...');
    await new Promise(resolve => setTimeout(resolve, 600));
    setBackupStep('A ler tabelas de colaboradores, contratos e remunerações...');
    await new Promise(resolve => setTimeout(resolve, 600));
    setBackupStep('A compactar e a transmitir instantâneo com sucesso...');
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const res = await fetch('/api/backup/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'Manual (Utilizador)' })
      });
      const data = await res.json();
      if (data.success) {
        setBackupStep('Cópia de segurança criada na Nuvem!');
        showSuccess('Cópia de segurança criada com sucesso na Nuvem!');
        await new Promise(resolve => setTimeout(resolve, 800));
        loadBackupHistory();
      } else {
        showError(data.error || 'Erro ao criar cópia de segurança.');
      }
    } catch (err) {
      console.error(err);
      showError('Erro ao conectar com servidor de backups.');
    } finally {
      setTriggeringBackup(false);
      setBackupStep('');
    }
  };

  const handleRestoreBackup = async (id: string) => {
    setRestoringId(id);
    setShowRestoreConfirm(null);
    try {
      const res = await fetch(`/api/backup/restore/${id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.mensagem || 'Cópia de segurança restaurada!');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        showError(data.error || 'Erro ao restaurar cópia de segurança.');
      }
    } catch (err) {
      console.error(err);
      showError('Erro de comunicação ao restaurar cópia de segurança.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleEscalaoChange = (index: number, field: string, value: any) => {
    const updated = [...escaloesIrps];
    if (field.startsWith('deducao_')) {
      const depField = field.replace('deducao_', '');
      updated[index].deducao_por_dependente = {
        ...updated[index].deducao_por_dependente,
        [depField]: Number(value)
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: field === 'intervalo' ? value : (value === '' ? null : Number(value))
      };
    }
    setEscaloesIrps(updated);
  };

  const exportEmployeesCSV = (employeesList: any[]) => {
    const headers = ["ID", "Nome Completo", "NUIT", "Nº INSS", "Cargo", "Salário Base (MT)", "Nº Dependentes", "Carteira Móvel"];
    const rows = employeesList.map(e => [
      e.id,
      `"${e.nome.replace(/"/g, '""')}"`,
      e.nuit,
      e.inss_numero,
      `"${e.cargo.replace(/"/g, '""')}"`,
      e.salario_base,
      e.numero_dependentes,
      e.carteira_movel
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `colaboradores_paytek_${company.nuit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalariesCSV = (logs: any[]) => {
    const headers = ["ID Lançamento", "ID Colaborador", "Nome do Colaborador", "Carteira Móvel", "Salário Líquido (MT)", "Estado", "Período", "Data e Hora", "ID de Transação"];
    const rows = logs.map(l => [
      l.id,
      l.employeeId,
      `"${l.employeeName.replace(/"/g, '""')}"`,
      l.carteira_movel,
      l.salarioLiquido,
      l.status,
      `"${l.periodo.replace(/"/g, '""')}"`,
      l.timestamp,
      l.txId || ''
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `historico_salarios_paytek_${company.nuit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLocalExport = async (format: 'json' | 'csv-employees' | 'csv-salaries') => {
    setExporting(format);
    try {
      const resEmp = await fetch('/api/employees');
      const employeesList = await resEmp.json();

      const resLogs = await fetch('/api/logs');
      const logsList = await resLogs.json();

      if (format === 'json') {
        const fullDb = {
          empresa: company,
          exportDate: new Date().toISOString(),
          employees: employeesList,
          paymentLogs: logsList,
          parameters: config
        };
        const blob = new Blob([JSON.stringify(fullDb, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `erp_export_paytek_${company.nuit}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'csv-employees') {
        exportEmployeesCSV(employeesList);
      } else if (format === 'csv-salaries') {
        exportSalariesCSV(logsList);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar exportação de dados.');
    } finally {
      setExporting(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("O ficheiro de logótipo excede o tamanho máximo permitido de 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePerfilSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerfil(true);
    setShowPerfilSuccess(false);

    const payload = {
      nome,
      pais,
      provincia,
      distrito,
      regime_iva: regimeIva,
      sector_negocio: sectorNegocio,
      tamanho_empresa: tamanhoEmpresa,
      regime_fiscal_pme: regimeFiscalPme,
      nuel,
      nuit,
      email,
      telefone,
      logo
    };

    try {
      // 1. Send to the backend endpoint specified by the user
      const resPerfil = await fetch('/api/empresa/atualizar-perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dataPerfil = await resPerfil.json();

      if (dataPerfil.sucesso) {
        // 2. Save in parent state to update standard company variables in the ERP
        await onSave({
          taxa_inss_trabalhador: Number(taxaInssTrabalhador),
          taxa_inss_entidade: Number(taxaInssEntidade),
          valor_ipa_mensal: Number(valorIpaMensal),
          divisor_dias_faltas: Number(divisorDiasFaltas),
          formula_faltas_modelo: formulaFaltasModelo,
          formula_irps_modelo: formulaIrpsModelo,
          escaloes_irps: escaloesIrps
        }, {
          nome,
          nuit,
          endereco: `${provincia || ''}${provincia && distrito ? ', ' : ''}${distrito || ''}`,
          pais,
          provincia,
          distrito,
          regime_iva: regimeIva,
          sector_negocio: sectorNegocio,
          tamanho_empresa: tamanhoEmpresa,
          regime_fiscal_pme: regimeFiscalPme,
          nuel,
          email,
          telefone,
          logo
        });

        setShowPerfilSuccess(true);
        showSuccess('Perfil da empresa guardado com sucesso!');
        setTimeout(() => setShowPerfilSuccess(false), 4000);
      } else {
        showError(dataPerfil.erro || "Erro ao salvar perfil da empresa.");
      }
    } catch (err) {
      console.error(err);
      showError("Erro de comunicação ao salvar perfil fiscal.");
    } finally {
      setSavingPerfil(false);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setShowConfigSuccess(false);

    try {
      await onSave({
        taxa_inss_trabalhador: Number(taxaInssTrabalhador),
        taxa_inss_entidade: Number(taxaInssEntidade),
        valor_ipa_mensal: Number(valorIpaMensal),
        divisor_dias_faltas: Number(divisorDiasFaltas),
        formula_faltas_modelo: formulaFaltasModelo,
        formula_irps_modelo: formulaIrpsModelo,
        escaloes_irps: escaloesIrps
      }, {
        nome,
        nuit,
        endereco: `${provincia || ''}${provincia && distrito ? ', ' : ''}${distrito || ''}`,
        pais,
        provincia,
        distrito,
        regime_iva: regimeIva,
        nuel,
        email,
        telefone,
        logo
      });

      setShowConfigSuccess(true);
      showSuccess('Alterações de configuração fiscal guardadas com sucesso!');
      setTimeout(() => setShowConfigSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      showError("Erro ao salvar parâmetros fiscais.");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div id="settings_panel" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Configurações Gerais & Perfil Fiscal</h2>
        <p className="text-xs text-slate-500">
          Modifique o cadastro institucional da sua empresa, configure o regime tributário e ajuste parâmetros de retenção para Moçambique.
        </p>
      </div>

      {/* SELECIONAR EMPRESA / SWITCH COMPANY */}
      {availableCompanies && availableCompanies.length > 1 && onSwitchCompany && (
        <div id="company_switcher_settings" className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl text-amber-400">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Selecionar Empresa Autorizada</h3>
              <p className="text-xs text-slate-300">Trocar contexto e visualizar dados de outras filiais ou clientes sob a sua gestão.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <select
                value={availableCompanies.find(c => c.isActive)?.id || ''}
                onChange={(e) => onSwitchCompany(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                id="company-switcher-settings-select"
                title="Selecionar Empresa"
              >
                {availableCompanies.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-800 bg-white font-medium">
                    {c.nome} ({c.nuit})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                const selectEl = document.getElementById('company-switcher-settings-select') as HTMLSelectElement;
                if (selectEl) {
                  onSwitchCompany(selectEl.value);
                }
              }}
              className="px-6 py-3 bg-white hover:bg-slate-100 text-blue-900 font-bold rounded-xl text-xs transition-all uppercase shadow-md cursor-pointer text-center"
              title="Trocar"
              id="company-switcher-settings-btn"
            >
              Trocar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Column: Perfil da Empresa (Exactly formatted as specified) */}
        <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 border-blue-600 space-y-6 ${isClient ? 'lg:col-span-12 max-w-4xl mx-auto' : 'lg:col-span-7'}`}>
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl font-bold text-lg">
                🏢
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Perfil da Empresa</h3>
                <p className="text-[11px] text-slate-500">Confirme os dados fiscais e de contacto.</p>
              </div>
            </div>
            <span className="bg-blue-50 text-blue-900 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              REGISTO ERP ATIVO
            </span>
          </div>

          <form onSubmit={handlePerfilSubmit} className="space-y-5">
            {/* SELETOR MULTI-SECTOR PME / ADAPTADOR UNIVERSAL */}
            <div className="bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md space-y-4 border border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-blue-500/30 text-blue-300 rounded-xl text-lg">⚡</span>
                  <div>
                    <h4 className="font-black text-sm text-white">Adaptador Universal para Micro & Pequenas Empresas (PMEs)</h4>
                    <p className="text-[11px] text-blue-100">
                      Selecione o ramo de negócio para adaptar categorias, faturas, regime tributário e modelos operacionais.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2.5 py-1 rounded-full uppercase tracking-wider hidden sm:block">
                  PME Mozambique Ready
                </span>
              </div>

              {/* 9 Sector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {[
                  { id: 'Comércio & Retalho', icon: '🛒', nome: 'Comércio & Retalho', desc: 'Lojas, Mercearias, Supermercados, Ferragens, Farmácias', regime: 'ISPC 3%', regimeIva: 'Isento' },
                  { id: 'Prestação de Serviços & Tecnologia', icon: '💼', nome: 'Serviços & Consultoria', desc: 'TI, Contabilidade, Advocacia, Engenharia, Consultoria', regime: 'IVA 16%', regimeIva: 'IVA Normal' },
                  { id: 'Restauração & Hotelaria', icon: '🍽️', nome: 'Restauração & Hotelaria', desc: 'Restaurantes, Cafés, Bares, Fast-Food, Pátios, Guesthouses', regime: 'ISPC 3%', regimeIva: 'Isento' },
                  { id: 'Construção & Obras', icon: '🏗️', nome: 'Construção & Obras', desc: 'Empreiteiros, Pintura, Climatização, Canalização, Eletricidade', regime: 'IVA 16%', regimeIva: 'IVA Normal' },
                  { id: 'Indústria & Oficina', icon: '🛠️', nome: 'Oficina & Manufatura', desc: 'Carpintarias, Serralharias, Oficinas Mecânicas, Panificação', regime: 'ISPC 3%', regimeIva: 'Isento' },
                  { id: 'Transporte & Logística', icon: '🚚', nome: 'Transporte & Logística', desc: 'Transporte de Cargas, Fretes, Chapas, Táxis, Entregas', regime: 'ISPC 3%', regimeIva: 'Isento' },
                  { id: 'Educação & Formação', icon: '🏫', nome: 'Educação & Formação', desc: 'Creches, Escolas Privadas, Explicações, Academias', regime: 'Isento Art. 9º', regimeIva: 'Isento' },
                  { id: 'Saúde & Beleza', icon: '🩺', nome: 'Saúde & Estética', desc: 'Clínicas Médicas, Salões de Beleza, Barbearias, Spas', regime: 'Isento Art. 9º', regimeIva: 'Isento' },
                  { id: 'Agricultura & Agronegócio', icon: '🌾', nome: 'Agricultura & Agronegócio', desc: 'Machambas, Avicultura, Pecuária, Processamento', regime: 'ISPC 3%', regimeIva: 'Isento' }
                ].map((s) => {
                  const active = sectorNegocio === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSectorNegocio(s.id);
                        setRegimeIva(s.regimeIva);
                        setRegimeFiscalPme(s.regime.includes('ISPC') ? 'ISPC (Imposto Simplificado 3%)' : s.regime.includes('Art. 9º') ? 'Isento de IVA (Artigo 9º)' : 'Regime Geral IVA (16%)');
                      }}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        active 
                          ? 'bg-blue-600/40 border-blue-400 text-white shadow-lg ring-2 ring-blue-400/40' 
                          : 'bg-white/5 border-white/10 text-blue-100 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">{s.icon}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          active ? 'bg-blue-400 text-blue-950' : 'bg-white/10 text-blue-200'
                        }`}>
                          {s.regime}
                        </span>
                      </div>
                      <div className="font-extrabold text-xs leading-snug">{s.nome}</div>
                      <div className="text-[10px] text-blue-200 line-clamp-2 mt-0.5 font-normal leading-tight">{s.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Regimes Fiscais & Porte da Empresa Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-blue-100 block">Porte / Dimensão da Microempresa</label>
                  <select
                    value={tamanhoEmpresa}
                    onChange={(e) => setTamanhoEmpresa(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="Microempresa (1-5 Colaboradores)" className="bg-slate-900 text-white">Microempresa (1 a 5 Colaboradores)</option>
                    <option value="Pequena Empresa (6-20 Colaboradores)" className="bg-slate-900 text-white">Pequena Empresa (6 a 20 Colaboradores)</option>
                    <option value="Média Empresa (21-50 Colaboradores)" className="bg-slate-900 text-white">Média Empresa (21 a 50 Colaboradores)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-200 block">Enquadramento Tributário PME</label>
                  <select
                    value={regimeFiscalPme}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegimeFiscalPme(val);
                      if (val.includes('16%')) {
                        setRegimeIva('IVA Normal');
                      } else {
                        setRegimeIva('Isento');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  >
                    <option value="ISPC (Imposto Simplificado 3%)" className="bg-slate-900 text-white">ISPC - Imposto Simplificado 3% (Microempresas &lt; 2,5M MT)</option>
                    <option value="Regime Geral IVA (16%)" className="bg-slate-900 text-white">Regime Geral do IVA 16% (PGC-NIRF)</option>
                    <option value="Isento de IVA (Artigo 9º)" className="bg-slate-900 text-white">Isento de IVA (Artigo 9º do Código do IVA)</option>
                  </select>
                </div>
              </div>
            </div>
            {/* Logo da Empresa */}
            <div className="space-y-2">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: '#374151' }}>
                Logótipo da Empresa
              </label>
              <div className="upload-container" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
                {/* A caixa de preview exibe o logótipo oficial da Fintech como padrão ou a customizada se existir */}
                <div className="avatar-preview" style={{ width: '80px', height: '80px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', overflow: 'hidden' }}>
                  <img 
                    src={logo || "logo-payroll.png"} 
                    alt="Logo" 
                    style={{ width: '70px', height: 'auto', maxHeight: '70px', objectFit: 'contain' }}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    type="button" 
                    onClick={handleLogoUploadClick}
                    className="btn-upload" 
                    style={{ background: 'white', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    ⬆ Alterar Logótipo
                  </button>
                  <div className="upload-info" style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    PNG ou JPG com fundo transparente. Máx. 2MB.
                  </div>
                </div>
              </div>
            </div>

            {/* Nome da Empresa */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Nome da Empresa *</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: suaempresa, lda"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold"
              />
            </div>

            {/* País */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">País</label>
              <select
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold"
              >
                <option value="Moçambique">Moçambique</option>
              </select>
            </div>

            {/* Província e Distrito */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Província / Estado</label>
                <select
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold"
                >
                  <option value="">Seleccione</option>
                  <option value="Maputo Cidade">Maputo Cidade</option>
                  <option value="Maputo Província">Maputo Província</option>
                  <option value="Sofala">Sofala</option>
                  <option value="Nampula">Nampula</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Distrito / Cidade</label>
                <input
                  type="text"
                  value={distrito}
                  onChange={(e) => setDistrito(e.target.value)}
                  placeholder="Distrito / Cidade"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold"
                />
              </div>
            </div>

            {/* Regime de IVA */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">🧾 Regime de IVA</label>
              <select
                value={regimeIva}
                onChange={(e) => setRegimeIva(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold"
              >
                <option value="IVA Normal">IVA Normal</option>
                <option value="Isento">Isento</option>
              </select>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[10px] text-slate-500 mt-1 leading-relaxed">
                Regime normal de IVA (16%) — contabilidade completa. Iremos criar as taxas de imposto correspondentes automaticamente.
              </div>
            </div>

            {/* NUEL e NUIT */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">NUEL</label>
                <input
                  type="text"
                  value={nuel}
                  onChange={(e) => setNuel(e.target.value)}
                  placeholder="10012145"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">NUIT</label>
                <input
                  type="text"
                  value={nuit}
                  onChange={(e) => setNuit(e.target.value)}
                  placeholder="123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold font-mono"
                />
              </div>
            </div>

            {/* Email e Telefone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresa@exemplo.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="+258..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800 font-semibold font-mono"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="space-y-3.5 pt-2">
              {showPerfilSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
                  Perfil fiscal da empresa guardado com sucesso no ERP!
                </motion.div>
              )}

              <button
                type="submit"
                disabled={savingPerfil}
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-extrabold rounded-xl text-xs tracking-wider uppercase transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {savingPerfil ? 'A GRAVAR PERFIL...' : 'GRAVAR PERFIL FISCAL'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Form Column: Parâmetros Fiscais (INSS & IPA) */}
        {!isClient && (
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold">
                <Percent size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Parâmetros de Retenção</h3>
                <p className="text-[10px] text-slate-400">Taxas e impostos regulamentados.</p>
              </div>
            </div>

            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">INSS Trabalhador (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={taxaInssTrabalhador}
                    onChange={(e) => setTaxaInssTrabalhador(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-400 block">Padrão Moçambique: 3.0%</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">INSS Entidade Patronal (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={taxaInssEntidade}
                    onChange={(e) => setTaxaInssEntidade(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-400 block">Padrão Moçambique: 4.0%</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">IPA Mensal (Imposto Autárquico)</label>
                <input
                  type="number"
                  required
                  value={valorIpaMensal}
                  onChange={(e) => setValorIpaMensal(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[9px] text-slate-400 block">Padrão Moçambique: 0.0 MT</span>
              </div>

              {/* DESCONTO POR FALTAS */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Desconto por Faltas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Divisor de Dias (Faltas)</label>
                    <input
                      type="number"
                      required
                      value={divisorDiasFaltas}
                      onChange={(e) => setDivisorDiasFaltas(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-[9px] text-slate-400 block">Moçambique comercial: 30 dias.</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Fórmula de Desconto por Faltas</label>
                    <input
                      type="text"
                      required
                      value={formulaFaltasModelo}
                      onChange={(e) => setFormulaFaltasModelo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-[9px] text-slate-400 block">Legislação Moçambicana para actualização.</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-500">
                  ⚡ <b>Fórmula em Execução:</b> (Salário Base / {divisorDiasFaltas}) × Dias Faltas
                </div>
              </div>

              {/* DESCONTO DE IRPS & ESCALÕES */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Fórmula de Retenção de IRPS
                </h4>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Expressão Matemática Geral</label>
                  <input
                    type="text"
                    required
                    value={formulaIrpsModelo}
                    onChange={(e) => setFormulaIrpsModelo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-400 block">Modelo matemático da retenção na fonte.</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Escalões Fiscais de IRPS (Tabela Progressiva)</label>
                    <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold font-mono">Lei nº 11/2025</span>
                  </div>

                  <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                    {escaloesIrps.map((esc, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                          <span className="text-xs font-bold text-indigo-950 font-mono">{esc.intervalo}</span>
                          <span className="text-[10px] text-slate-500 italic">Limites em MT</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-semibold text-slate-500 block">Lim. Mínimo (MT)</label>
                            <input
                              type="number"
                              required
                              value={esc.limite_minimo}
                              onChange={(e) => handleEscalaoChange(index, 'limite_minimo', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-semibold text-slate-500 block">Lim. Máximo (MT)</label>
                            <input
                              type="number"
                              placeholder="Sem limite"
                              value={esc.limite_maximo === null ? '' : esc.limite_maximo}
                              onChange={(e) => handleEscalaoChange(index, 'limite_maximo', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-semibold text-slate-500 block">Taxa Marginal (Coeficiente)</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={esc.coeficiente_taxa}
                              onChange={(e) => handleEscalaoChange(index, 'coeficiente_taxa', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                            />
                            <span className="text-[9px] text-slate-400">Ex: 0.15 = 15%</span>
                          </div>
                          <div>
                            <label className="text-[9px] font-semibold text-slate-500 block">Valor Fixo IRPS (MT)</label>
                            <input
                              type="number"
                              required
                              value={esc.valor_fixo_irps}
                              onChange={(e) => handleEscalaoChange(index, 'valor_fixo_irps', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Deduções por dependentes */}
                        <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[9px] font-bold text-slate-600 block">Deduções por Dependentes (MT a Abater)</span>
                          <div className="grid grid-cols-5 gap-1 text-[9px] text-slate-500">
                            <div>
                              <span>0 Dep.</span>
                              <input
                                type="number"
                                required
                                value={esc.deducao_por_dependente.dep_0}
                                onChange={(e) => handleEscalaoChange(index, 'deducao_dep_0', e.target.value)}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-center font-mono"
                              />
                            </div>
                            <div>
                              <span>1 Dep.</span>
                              <input
                                type="number"
                                required
                                value={esc.deducao_por_dependente.dep_1}
                                onChange={(e) => handleEscalaoChange(index, 'deducao_dep_1', e.target.value)}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-center font-mono"
                              />
                            </div>
                            <div>
                              <span>2 Dep.</span>
                              <input
                                type="number"
                                required
                                value={esc.deducao_por_dependente.dep_2}
                                onChange={(e) => handleEscalaoChange(index, 'deducao_dep_2', e.target.value)}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-center font-mono"
                              />
                            </div>
                            <div>
                              <span>3 Dep.</span>
                              <input
                                type="number"
                                required
                                value={esc.deducao_por_dependente.dep_3}
                                onChange={(e) => handleEscalaoChange(index, 'deducao_dep_3', e.target.value)}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-center font-mono"
                              />
                            </div>
                            <div>
                              <span>4+ Dep.</span>
                              <input
                                type="number"
                                required
                                value={esc.deducao_por_dependente.dep_4_mais}
                                onChange={(e) => handleEscalaoChange(index, 'deducao_dep_4_mais', e.target.value)}
                                className="w-full p-1 bg-slate-50 border border-slate-200 rounded text-center font-mono"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {showConfigSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 className="text-emerald-600 shrink-0" size={16} />
                    Parâmetros actualizados! Taxas aplicadas em todos os cálculos.
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 transition-colors uppercase tracking-wider"
                >
                  <Save size={14} />
                  {savingConfig ? 'A gravar...' : 'Gravar Parâmetros'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3.5">
            <h4 className="font-bold text-[10px] text-amber-400 uppercase tracking-widest font-mono">Nota de Auditoria Fiscal</h4>
            <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
              Em Moçambique, a declaração de remunerações (INSS) deve ser submetida até ao dia 10 de cada mês através do portal SISSMO, e o pagamento do IRPS por guias de modelo 39 até ao dia 20. Garanta que os dados NUIT e Nuel estão em perfeita concordância legal para evitar coimas fiscais da Autoridade Tributária.
            </p>
          </div>

          {/* SECÇÃO: DOWNLOAD & EXPORTAÇÃO LOCAL */}
          <div id="export_panel" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2.5 bg-blue-50 text-blue-950 rounded-xl font-bold">
                <Download size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Download & Exportação</h3>
                <p className="text-[10px] text-slate-400">Descarregue o histórico fiscal do ERP.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Descarregue cópias locais imediatas dos dados da sua empresa no formato compatível com Excel (CSV) ou sistemas de contabilidade (JSON):
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => handleLocalExport('csv-employees')}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-600" size={15} />
                    Colaboradores (.CSV)
                  </span>
                  <span className="text-[10px] text-slate-400">Descarregar</span>
                </button>

                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => handleLocalExport('csv-salaries')}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="text-blue-600" size={15} />
                    Histórico de Salários (.CSV)
                  </span>
                  <span className="text-[10px] text-slate-400">Descarregar</span>
                </button>

                <button
                  type="button"
                  disabled={exporting !== null}
                  onClick={() => handleLocalExport('json')}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Database className="text-indigo-600" size={15} />
                    Instantâneo ERP Completo (.JSON)
                  </span>
                  <span className="text-[10px] text-slate-400">Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECÇÃO: BACKUP AUTOMÁTICO NA NUVEM */}
          <div id="cloud_backup_panel" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold">
                  <Cloud size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Backup Seguro na Nuvem</h3>
                  <p className="text-[10px] text-slate-400">Sincronização redundante automática.</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-100 shrink-0 font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                SINC. ATIVO
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                O software <b>Payroll Tech Mz</b> executa <b>salvaguardas automáticas na nuvem</b> sempre que regista novos funcionários ou conclui o processamento salarial dos seus colaboradores.
              </p>

              {/* Step backup indicator */}
              {triggeringBackup ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-600" size={14} />
                    <span className="text-xs font-bold text-slate-800">A processar backup na Nuvem...</span>
                  </div>
                  <p className="text-[10px] text-slate-500 animate-pulse">{backupStep}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerBackup}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Cloud size={14} />
                  CRIAR CÓPIA DE SEGURANÇA IMEDIATA
                </button>
              )}

              {/* Backups List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Histórico de Backups na Nuvem</span>
                  <button 
                    type="button"
                    onClick={loadBackupHistory} 
                    className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                    title="Actualizar histórico"
                  >
                    <RefreshCw size={10} className={loadingBackups ? "animate-spin" : ""} />
                    Actualizar
                  </button>
                </div>

                {backups.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-2 italic bg-slate-50 rounded-lg">
                    Nenhum backup encontrado na nuvem para esta empresa.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {backups.map((bkp) => (
                      <div key={bkp.id} className="pt-2 flex flex-col gap-1 first:pt-0">
                        <div className="flex justify-between items-start text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {bkp.tipo}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              🕒 {bkp.timestamp}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            {bkp.tamanhoKb} KB
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pb-1">
                          <span>
                            👥 {bkp.quantidadeColaboradores} col. | 💸 {bkp.quantidadeLancamentos} sal.
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`/api/backup/download/${bkp.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-0.5"
                              title="Descarregar ficheiro JSON"
                            >
                              <Download size={10} /> Download
                            </a>

                            {bkp.snapshot && (
                              <>
                                <span className="text-slate-300">|</span>
                                {showRestoreConfirm === bkp.id ? (
                                  <div className="flex items-center gap-1 bg-amber-50 p-1 rounded border border-amber-200">
                                    <span className="text-[9px] text-amber-800 font-black">Restaurar?</span>
                                    <button
                                      type="button"
                                      disabled={restoringId !== null}
                                      onClick={() => handleRestoreBackup(bkp.id)}
                                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-1 rounded text-[9px] cursor-pointer"
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowRestoreConfirm(null)}
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-1 rounded text-[9px] cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={restoringId !== null}
                                    onClick={() => setShowRestoreConfirm(bkp.id)}
                                    className="text-emerald-600 hover:text-emerald-800 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                                    title="Restaurar base de dados para o estado deste backup"
                                  >
                                    <RefreshCw size={10} /> Restaurar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECÇÃO: ADMINISTRAÇÃO DO SISTEMA & RESET */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl font-bold">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Ações do Sistema</h3>
                <p className="text-[10px] text-slate-400">Gerir dados e custos do ERP.</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Opções administrativas para reiniciar simulações ou limpar valores acumulados do exercício financeiro.
              </p>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {onResetCosts && (
                  <button
                    type="button"
                    onClick={() => onResetCosts()}
                    className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center justify-between transition-all cursor-pointer shadow-xs"
                    title="Zera todos os valores financeiros de Janeiro a Dezembro mantendo os cadastros"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw className="text-rose-600 shrink-0" size={15} />
                      Zerar Histórico de Custos (Jan-Dez)
                    </span>
                    <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Reset Custos</span>
                  </button>
                )}

                {onReset && (
                  <button
                    type="button"
                    onClick={() => onReset()}
                    className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                    title="Limpa todo o banco de dados incluindo funcionários e clientes"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="text-slate-600" size={15} />
                      Limpeza Total da Base de Dados
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Zerar Tudo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
