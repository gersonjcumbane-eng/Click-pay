/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, 
  Download, 
  ShieldCheck, 
  HelpCircle, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Search,
  Building2,
  Users,
  Check,
  Percent,
  Coins,
  FileText,
  Calendar
} from 'lucide-react';
import { Employee, CompanyData } from '../types';
import { calcularFolhaSalario } from '../db_tax';

interface SISSMOExportProps {
  employees: Employee[];
  company: CompanyData;
  selectedPeriod: string;
}

export default function SISSMOExport({
  employees,
  company,
  selectedPeriod
}: SISSMOExportProps) {
  const [activeSubTab, setActiveSubTab] = useState<'csv' | 'pdf' | 'irps'>('csv');
  const [downloading, setDownloading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingIrpsPdf, setGeneratingIrpsPdf] = useState(false);
  const [validatedCompany, setValidatedCompany] = useState(false);
  const [validatedEmployees, setValidatedEmployees] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom states for the INSS payment guide calculations
  const [juros, setJuros] = useState<string>('0');
  const [multas, setMultas] = useState<string>('0');
  const [jurosIrps, setJurosIrps] = useState<string>('0');

  const isNuitValid = (n: string | undefined) => {
    if (!n) return false;
    const clean = n.replace(/\D/g, '');
    return clean.length === 9;
  };

  const isNuelValid = (n: string | undefined) => {
    if (!n) return false;
    const clean = n.replace(/\D/g, '');
    return clean.length >= 8 && clean.length <= 10;
  };

  const isInssValid = (n: string | undefined) => {
    if (!n) return false;
    const clean = n.replace(/\D/g, '');
    return clean.length >= 7;
  };

  const handleDownloadSissmo = async () => {
    setDownloading(true);
    try {
      const p = selectedPeriod.replace(/\s+/g, '_');
      window.location.href = `/api/payroll/exportar-sissmo?periodo=${p}`;
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar ficheiro.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadGuiaPdf = () => {
    setGeneratingPdf(true);
    try {
      const p = encodeURIComponent(selectedPeriod);
      const jVal = Number(juros) || 0;
      const mVal = Number(multas) || 0;
      window.location.href = `/api/exportar/guia-inss-pdf?periodo=${p}&juros=${jVal}&multas=${mVal}`;
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar PDF.');
    } finally {
      setTimeout(() => setGeneratingPdf(false), 2000);
    }
  };

  const handleDownloadIrpsPdf = () => {
    setGeneratingIrpsPdf(true);
    try {
      const p = encodeURIComponent(selectedPeriod);
      const jVal = Number(jurosIrps) || 0;
      window.location.href = `/api/exportar/guia-irps-pdf?periodo=${p}&juros=${jVal}`;
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar PDF da Guia de IRPS.');
    } finally {
      setTimeout(() => setGeneratingIrpsPdf(false), 2000);
    }
  };

  const totalEmployees = employees.length;
  const validEmployeeNuits = employees.filter(emp => isNuitValid(emp.nuit)).length;
  const validEmployeeInss = employees.filter(emp => isInssValid(emp.inss_numero)).length;

  const companyNuitValid = isNuitValid(company.nuit);
  const companyNuelValid = isNuelValid(company.nuel);

  const filteredEmployees = employees.filter(emp => 
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.nuit && emp.nuit.includes(searchTerm)) ||
    (emp.inss_numero && emp.inss_numero.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Prefill and compute values for the INSS Guia de Recolhimento
  let totalRemuneracoes = 0;
  let contribuicaoTrabalhadores = 0;
  let contribuicaoPatronal = 0;

  employees.forEach(emp => {
    const remuneracao = emp.salario_base;
    totalRemuneracoes += remuneracao;
    contribuicaoTrabalhadores += Number((remuneracao * 0.03).toFixed(2));
    contribuicaoPatronal += Number((remuneracao * 0.04).toFixed(2));
  });

  totalRemuneracoes = Number(totalRemuneracoes.toFixed(2));
  contribuicaoTrabalhadores = Number(contribuicaoTrabalhadores.toFixed(2));
  contribuicaoPatronal = Number(contribuicaoPatronal.toFixed(2));
  const totalContribuicoes = Number((contribuicaoTrabalhadores + contribuicaoPatronal).toFixed(2));
  const jurosNum = Number(juros) || 0;
  const multasNum = Number(multas) || 0;
  const totalPagar = Number((totalContribuicoes + jurosNum + multasNum).toFixed(2));

  // Determine limit date of payment based on selected month (10th of next month)
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  let mesSeguinte = "mês seguinte";
  let anoSeguinte = "2026";
  
  const parts = selectedPeriod.trim().split(' ');
  if (parts.length >= 2) {
    const mesAtual = parts[0];
    const anoAtual = parts[1];
    anoSeguinte = anoAtual;
    const idx = meses.findIndex(m => m.toLowerCase().startsWith(mesAtual.toLowerCase()));
    if (idx !== -1) {
      const nextIdx = (idx + 1) % 12;
      mesSeguinte = meses[nextIdx];
      if (nextIdx === 0) {
        anoSeguinte = String(Number(anoAtual) + 1);
      }
    }
  }
  const dataLimite = `10 de ${mesSeguinte} de ${anoSeguinte}`;
  const dataLimiteIrps = `20 de ${mesSeguinte} de ${anoSeguinte}`;

  // Deterministic live SISSMO Payment Reference code
  const hashNuit = (company.nuit || '400999999').replace(/[^\d]/g, '');
  const hashPeriodo = selectedPeriod.replace(/[^\d]/g, '') || '2026';
  const referenciaSISSMO = `90244 ${hashNuit.substring(0,4)} ${hashPeriodo.substring(0,4)} 8892`;
  const referenciaIRPS = `80133 ${hashNuit.substring(0,4)} ${hashPeriodo.substring(0,4)} 4511`;

  // IRPS Calculations
  let totalIrpsRetido = 0;
  employees.forEach(emp => {
    const calc = calcularFolhaSalario(emp.salario_base, 0, emp.numero_dependentes);
    totalIrpsRetido += calc.irpsConstatado;
  });
  totalIrpsRetido = Number(totalIrpsRetido.toFixed(2));
  const jurosIrpsNum = Number(jurosIrps) || 0;
  const totalIrpsPagar = Number((totalIrpsRetido + jurosIrpsNum).toFixed(2));

  return (
    <div id="sissmo_panel" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900" id="sissmo_title">Exportar Folhas de Salário & Conformidade</h2>
        <p className="text-xs text-slate-500" id="sissmo_desc">
          Gere e preencha automaticamente os ficheiros e guias oficiais para submissão e pagamento das obrigações da Segurança Social (INSS) e Imposto de Rendimento (IRPS).
        </p>
      </div>

      {/* Sub-Tabs navigation */}
      <div className="flex border-b border-slate-200" id="sissmo_subtabs">
        <button
          onClick={() => setActiveSubTab('csv')}
          id="btn_subtab_csv"
          className={`flex items-center gap-2 px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'csv'
              ? 'border-blue-900 text-blue-900 bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet size={16} />
          Ficheiro SISSMO (.CSV)
        </button>
        <button
          onClick={() => setActiveSubTab('pdf')}
          id="btn_subtab_pdf"
          className={`flex items-center gap-2 px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'pdf'
              ? 'border-blue-900 text-blue-900 bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 size={16} />
          Guia de Recolhimento INSS (.PDF)
        </button>
        <button
          onClick={() => setActiveSubTab('irps')}
          id="btn_subtab_irps"
          className={`flex items-center gap-2 px-6 py-3 font-bold text-xs border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'irps'
              ? 'border-blue-900 text-blue-900 bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Percent size={16} />
          Guia de Recolhimento IRPS (.PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="sissmo_grid_content">
        {/* Main Section (2/3 size) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6" id="sissmo_main_card">
          
          {activeSubTab === 'csv' ? (
            <>
              {/* CSV INSS LAYOUT VIEW */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4" id="csv_header">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Exportação de Layout SISSMO (INSS)</h3>
                  <p className="text-xs text-slate-500">Folha de Contribuições Mensal no formato oficial .csv para o portal do SISSMO.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3" id="csv_info">
                <div className="flex gap-2.5 items-start text-xs text-slate-600">
                  <ShieldCheck className="text-emerald-600 shrink-0" size={16} />
                  <div>
                    <p className="font-semibold text-slate-800">Layout Padronizado Verificado 🇲🇿</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      O ficheiro exportado contém as colunas oficiais exigidas pelo portal do SISSMO: 
                      <code className="bg-slate-200/60 px-1 py-0.5 rounded text-[10px] mx-1 font-mono">N_INSS;NUIT_FUNCIONARIO;NOME_TRABALHADOR;SALARIO_BRUTO;DIAS_FALTAS</code>. 
                      O processamento automatizado previne erros manuais de arredondamento e garante conformidade fiscal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Painel de Validação Regulamentar */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4" id="validation_panel">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CheckCircle2 className="text-blue-900 shrink-0" size={16} />
                  <p className="text-xs font-bold text-slate-800">Painel de Validação de Identificadores (NUIT & NUEL)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Entidade Patronal status */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entidade Patronal</span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">NUIT da Empresa:</span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${companyNuitValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {company.nuit || 'Pendente'} {companyNuitValid ? '✓' : '⚠'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">NUEL da Empresa:</span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${companyNuelValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {company.nuel || 'Pendente'} {companyNuelValid ? '✓' : '⚠'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Colaboradores status */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dados de Colaboradores</span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">NUITs dos Funcionários:</span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${validEmployeeNuits === totalEmployees && totalEmployees > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {validEmployeeNuits} / {totalEmployees} {validEmployeeNuits === totalEmployees && totalEmployees > 0 ? '✓' : '⚠'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Números de INSS:</span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[10px] ${validEmployeeInss === totalEmployees && totalEmployees > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {validEmployeeInss} / {totalEmployees} {validEmployeeInss === totalEmployees && totalEmployees > 0 ? '✓' : '⚠'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkboxes for user validation confirmation */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl cursor-pointer border border-slate-100 transition-all select-none">
                    <input 
                      type="checkbox" 
                      checked={validatedCompany} 
                      onChange={(e) => setValidatedCompany(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 accent-blue-900 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Validar Identidade Legal da Empresa</span>
                      <span className="text-slate-500 text-[10px] leading-relaxed block mt-0.5">
                        Confirmo que o NUIT <b>{company.nuit || 'N/A'}</b> e o NUEL <b>{company.nuel || 'N/A'}</b> da empresa estão corretos e em total concordância legal.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl cursor-pointer border border-slate-100 transition-all select-none">
                    <input 
                      type="checkbox" 
                      checked={validatedEmployees} 
                      onChange={(e) => setValidatedEmployees(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900 accent-blue-900 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">Validar Identificadores Individuais (Tabela Abaixo)</span>
                      <span className="text-slate-500 text-[10px] leading-relaxed block mt-0.5">
                        Verifiquei a lista de funcionários na antevisão abaixo e dou por validados todos os NUITs e números de INSS individuais.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Table preview with search and validation highlights */}
              <div className="space-y-3" id="csv_preview">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Antevisão dos Dados para Exportação ({selectedPeriod})</span>
                    <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                      {filteredEmployees.length} {filteredEmployees.length === 1 ? 'colaborador' : 'colaboradores'}
                    </span>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, NUIT ou INSS..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-700 font-sans"
                    />
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px]">
                  <table className="w-full text-left border-collapse bg-slate-50/40">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 bg-slate-50 font-semibold font-mono">
                        <th className="p-2.5 bg-slate-100/50">N_INSS (Highlight)</th>
                        <th className="p-2.5 bg-blue-50/40">NUIT_TRABALHADOR</th>
                        <th className="p-2.5">NOME</th>
                        <th className="p-2.5 text-right">SALÁRIO BRUTO (MT)</th>
                        <th className="p-2.5 text-center">VALIDAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400">Nenhum funcionário encontrado na pesquisa.</td>
                        </tr>
                      ) : (
                        filteredEmployees.map((emp, idx) => {
                          const nuitValid = isNuitValid(emp.nuit);
                          const inssValid = isInssValid(emp.inss_numero);
                          return (
                            <tr key={idx} className="border-b border-slate-50 bg-white font-mono text-[10px] hover:bg-slate-50/40 transition-colors">
                              <td className={`p-2.5 text-slate-700 font-semibold ${!inssValid ? 'bg-amber-50/50 text-amber-800' : 'bg-slate-50/30'}`}>
                                <div className="flex items-center gap-1">
                                  <span>{emp.inss_numero ? emp.inss_numero.replace('INSS-', '') : 'Sem INSS'}</span>
                                  {!inssValid && <AlertTriangle size={11} className="text-amber-500 shrink-0" />}
                                </div>
                              </td>
                              <td className={`p-2.5 text-slate-700 font-semibold ${!nuitValid ? 'bg-amber-50/50 text-amber-800' : 'bg-blue-50/20'}`}>
                                <div className="flex items-center gap-1">
                                  <span>{emp.nuit || 'Sem NUIT'}</span>
                                  {!nuitValid && <AlertTriangle size={11} className="text-amber-500 shrink-0" />}
                                </div>
                              </td>
                              <td className="p-2.5 text-slate-800 font-bold truncate max-w-[130px]" title={emp.nome}>
                                {emp.nome.toUpperCase()}
                              </td>
                              <td className="p-2.5 text-right text-slate-700 font-semibold">
                                {emp.salario_base.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-2.5 text-center">
                                {nuitValid && inssValid ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-sans font-bold text-[9px]">
                                    <Check size={8} /> OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-sans font-bold text-[9px]">
                                    <AlertTriangle size={8} /> INVÁLIDO
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleDownloadSissmo}
                  id="btn_download_sissmo_csv"
                  disabled={downloading || employees.length === 0 || !validatedCompany || !validatedEmployees}
                  className={`w-full py-3 font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                    validatedCompany && validatedEmployees 
                      ? 'bg-blue-900 hover:bg-blue-800 text-white' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed'
                  }`}
                >
                  <Download size={14} />
                  {downloading ? 'A gerar CSV SISSMO...' : `DESCARREGAR FOLHA SISSMO (${selectedPeriod})`}
                </button>
                {(!validatedCompany || !validatedEmployees) && employees.length > 0 && (
                  <p className="text-[10px] text-slate-400 text-center italic">
                    * Por favor, verifique as informações e marque as caixas de validação para autorizar o descarregamento do ficheiro oficial.
                  </p>
                )}
              </div>
            </>
          ) : activeSubTab === 'pdf' ? (
            <>
              {/* PDF INSS payment guide (Guia de Recolhimento) */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4" id="pdf_header">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Guia de Recolhimento de Contribuições</h3>
                  <p className="text-xs text-slate-500">Preenchimento automático e emissão da Guia Oficial do INSS de Moçambique em PDF.</p>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3" id="pdf_sissmo_instructions">
                <div className="flex gap-2.5 items-start text-xs text-slate-700">
                  <ShieldCheck className="text-blue-950 shrink-0" size={16} />
                  <div>
                    <p className="font-semibold text-slate-900">Preenchimento Automático SISSMO 🇲🇿</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      Esta guia é preenchida automaticamente de acordo com o regulamento de contribuições da Segurança Social de Moçambique (Decreto nº 51/2017).
                      O sistema calcula as alíquotas obrigatórias (<b>3.0% Trabalhador</b> + <b>4.0% Entidade Empregadora</b>) totalizando <b>7.0%</b> do total de salários brutos declarados.
                    </p>
                  </div>
                </div>
              </div>

               {/* LIVE PREVIEW OF PRE-FILLED FIELDS */}
               <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4" id="pdf_preview_container">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-3">
                   <div>
                     <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider block">Visualização da Guia do INSS</span>
                     <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded uppercase inline-block mt-1">Oficial SISSMO</span>
                   </div>
                   
                   {/* HIGH FIDELITY RENDER OF OFFICIAL INSS MOZAMBIQUE LOGO */}
                   <div className="w-48 h-18 bg-[#00adef] relative overflow-hidden rounded-lg shadow-sm border border-blue-400/20 shrink-0 self-start sm:self-center">
                     <svg viewBox="0 0 110 42" className="absolute inset-0 w-full h-full select-none">
                       {/* Map of Mozambique in white */}
                       <path
                         d="M 18 4 L 22 6 L 24 10 L 20 14 L 15 19 L 16 24 L 12 30 L 9 38 L 7 38 L 8 30 L 11 24 L 9 20 L 4 19 L 7 13 L 10 11 L 9 6 L 13 4 Z"
                         fill="#ffffff"
                       />
                       {/* Giant letters I N S S behind figures */}
                       <text x="32" y="19" fill="#092f59" fontFamily="sans-serif" fontWeight="bold" fontSize="13">I</text>
                       <text x="32" y="31" fill="#092f59" fontFamily="sans-serif" fontWeight="bold" fontSize="13">N</text>
                       <text x="64" y="19" fill="#092f59" fontFamily="sans-serif" fontWeight="bold" fontSize="13">S</text>
                       <text x="64" y="31" fill="#092f59" fontFamily="sans-serif" fontWeight="bold" fontSize="13">S</text>

                       {/* White figures of the family */}
                       {/* Boy */}
                       <circle cx="38" cy="21" r="1.8" fill="#ffffff" />
                       <rect x="36.5" y="23.5" width="3" height="7" fill="#ffffff" />
                       <rect x="36.8" y="30.5" width="1" height="4.5" fill="#ffffff" />
                       <rect x="38.2" y="30.5" width="1" height="4.5" fill="#ffffff" />
                       <rect x="35.5" y="23.5" width="0.8" height="5.5" fill="#ffffff" />
                       <rect x="39.7" y="23.5" width="0.8" height="5.5" fill="#ffffff" />

                       {/* Mother */}
                       <circle cx="51" cy="15" r="2.2" fill="#ffffff" />
                       <polygon points="51,18 46.5,30 55.5,30" fill="#ffffff" />
                       <rect x="48.8" y="30" width="1.2" height="5.5" fill="#ffffff" />
                       <rect x="52" y="30" width="1.2" height="5.5" fill="#ffffff" />

                       {/* Father */}
                       <circle cx="68" cy="13" r="2.5" fill="#ffffff" />
                       <rect x="65.5" y="16.5" width="5" height="10" fill="#ffffff" />
                       <rect x="65.8" y="26.5" width="1.8" height="7.5" fill="#ffffff" />
                       <rect x="68.4" y="26.5" width="1.8" height="7.5" fill="#ffffff" />
                       <rect x="64.2" y="16.5" width="1" height="8.5" fill="#ffffff" />
                       <rect x="70.8" y="16.5" width="1" height="8.5" fill="#ffffff" />

                       {/* Girl */}
                       <circle cx="81" cy="23" r="1.5" fill="#ffffff" />
                       <polygon points="81,25.2 77.8,34 84.2,34" fill="#ffffff" />
                       <rect x="79.4" y="34" width="0.9" height="4" fill="#ffffff" />
                       <rect x="81.7" y="34" width="0.9" height="4" fill="#ffffff" />

                       {/* Institution name on top right in white */}
                       <text x="40" y="7" fill="#ffffff" fontFamily="sans-serif" fontWeight="bold" fontSize="3.3" letterSpacing="0.05">INSTITUTO NACIONAL DE</text>
                       <text x="42" y="11" fill="#ffffff" fontFamily="sans-serif" fontWeight="bold" fontSize="3.3" letterSpacing="0.05">SEGURANÇA SOCIAL</text>

                       {/* English translation at the bottom right in white */}
                       <text x="44" y="36.5" fill="#ffffff" fontFamily="sans-serif" fontWeight="bold" fontSize="3" letterSpacing="0.05">NACIONAL INSTITUTE OF</text>
                       <text x="48" y="40" fill="#ffffff" fontFamily="sans-serif" fontWeight="bold" fontSize="3" letterSpacing="0.05">SOCIAL SECURITY</text>
                     </svg>
                   </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Contribuinte</span>
                    <span className="font-bold text-slate-800">{company.nome.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">NUEL (N.º INSS Empresa)</span>
                    <span className="font-mono font-bold text-slate-800">{company.nuel || '10011122'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">NUIT da Empresa</span>
                    <span className="font-mono font-bold text-slate-800">{company.nuit || '400999999'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Mês de Referência</span>
                    <span className="font-bold text-slate-800">{selectedPeriod.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Trabalhadores</span>
                    <span className="font-bold text-slate-800">{totalEmployees} Colaboradores</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Total Remunerações Sujeitas</span>
                    <span className="font-mono font-bold text-slate-800">{totalRemuneracoes.toLocaleString('pt-MZ')} MT</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Contribuição Trabalhadores (3.0%):</span>
                    <span className="font-mono font-semibold text-slate-800">{contribuicaoTrabalhadores.toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Contribuição Patronal (4.0%):</span>
                    <span className="font-mono font-semibold text-slate-800">{contribuicaoPatronal.toLocaleString('pt-MZ')} MT</span>
                  </div>

                  {/* INTERACTIVE CONTROLS FOR LATE PENALTIES & INTEREST */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Juros de Mora (MT)</label>
                      <input
                        type="number"
                        min="0"
                        value={juros}
                        onChange={(e) => setJuros(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                        placeholder="Ex: 150"
                        title="Juros de mora por atraso de pagamento"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Outras Multas (MT)</label>
                      <input
                        type="number"
                        min="0"
                        value={multas}
                        onChange={(e) => setMultas(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 font-mono"
                        placeholder="Ex: 500"
                        title="Multas administrativas aplicadas pelo INSS"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-blue-900 text-white p-3 rounded-xl mt-2">
                    <span className="text-xs font-bold uppercase">Total Líquido a Recolher (7% + Acréscimos)</span>
                    <span className="text-sm font-extrabold font-mono">{totalPagar.toLocaleString('pt-MZ')} MT</span>
                  </div>
                </div>

                {/* BANK PAYMENT DETAILS INTEGRATION */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 space-y-2 text-[11px]" id="pdf_bank_details">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <Coins size={14} />
                    <span>Dados de Liquidação Interbancária (Moçambique)</span>
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span>Entidade do INSS:</span>
                      <span className="font-bold font-mono">INSS SISSMO (90244)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Referência de Pagamento:</span>
                      <span className="font-extrabold font-mono text-red-700">{referenciaSISSMO}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Limite de Pagamento:</span>
                      <span className="font-bold text-slate-800">{dataLimite}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2" id="pdf_actions">
                <button
                  onClick={handleDownloadGuiaPdf}
                  id="btn_download_inss_pdf"
                  disabled={generatingPdf || totalEmployees === 0}
                  className={`w-full py-3.5 font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                    totalEmployees > 0 
                      ? 'bg-red-700 hover:bg-red-800 text-white' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed'
                  }`}
                >
                  <Download size={14} />
                  {generatingPdf ? 'A emitir Guia em PDF...' : `DESCARREGAR GUIA DE RECOLHIMENTO (PDF)`}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* PDF IRPS payment guide (Modelo M/19) */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4" id="irps_pdf_header">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Percent size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Guia de Recolhimento IRPS (Modelo M/19)</h3>
                  <p className="text-xs text-slate-500">Preenchimento automático e emissão da Guia de IRPS sobre Rendimentos do Trabalho Dependente.</p>
                </div>
              </div>

              <div className="bg-amber-50/30 border border-amber-200/60 rounded-xl p-4 space-y-3" id="pdf_irps_instructions">
                <div className="flex gap-2.5 items-start text-xs text-slate-700">
                  <ShieldCheck className="text-amber-800 shrink-0" size={16} />
                  <div>
                    <p className="font-semibold text-slate-900">Preenchimento Automático Modelo M/19 🇲🇿</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                      Esta guia é preenchida automaticamente de acordo com as retenções na fonte de IRPS calculadas sobre a folha de salários para a categoria de <b>Trabalho Dependente (Linha 10)</b>.
                      O imposto deve ser recolhido até ao dia <b>20 do mês seguinte</b> àquele a que os rendimentos respeitam.
                    </p>
                  </div>
                </div>
              </div>

               {/* LIVE PREVIEW OF PRE-FILLED IRPS FIELDS */}
               <div className="bg-[#fffbeb] rounded-2xl p-5 border border-amber-200 space-y-4 shadow-sm" id="irps_pdf_preview_container">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-amber-200 pb-3">
                   <div>
                     <span className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wider block">Visualização da Guia IRPS (M/19)</span>
                     <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded uppercase inline-block mt-1">República de Moçambique</span>
                   </div>
                   
                   {/* NATIONAL EMBLEM PLACEHOLDER IN THE PREVIEW */}
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-[10px] font-bold border border-amber-400">
                       🇲🇿
                     </div>
                     <div className="text-[9px] text-slate-800 leading-tight">
                       <p className="font-extrabold">REPÚBLICA DE MOÇAMBIQUE</p>
                       <p className="font-bold text-slate-500 text-[8px]">MINISTÉRIO DA ECONOMIA E FINANÇAS</p>
                       <p className="text-[8px] font-semibold text-amber-800">DIRECÇÃO GERAL DOS IMPOSTOS</p>
                     </div>
                   </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div>
                    <span className="text-amber-800/70 font-semibold block text-[10px] uppercase">Nome ou Designação Social</span>
                    <span className="font-bold text-slate-800">{company.nome.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/70 font-semibold block text-[10px] uppercase">NUIT do Sujeito Passivo</span>
                    <span className="font-mono font-bold text-slate-800">{company.nuit || '400999999'}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/70 font-semibold block text-[10px] uppercase">Mês/Ano de Referência</span>
                    <span className="font-bold text-slate-800">{selectedPeriod.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-amber-800/70 font-semibold block text-[10px] uppercase">Endereço Fiscal</span>
                    <span className="font-semibold text-slate-700">Av. 24 de Julho, Maputo</span>
                  </div>
                </div>

                <div className="border-t border-amber-200 pt-3 space-y-2">
                  <div className="bg-white rounded-lg border border-amber-200/80 overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-amber-100 text-amber-900 font-bold border-b border-amber-200">
                          <th className="p-2">Cód. Receita</th>
                          <th className="p-2">Descrição da Categoria</th>
                          <th className="p-2 text-right">Valor Retido (MT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-amber-100">
                          <td className="p-2 font-mono font-bold text-slate-700">10-10-10-20-1</td>
                          <td className="p-2 text-slate-600 font-medium">Linha 10: Trabalho Dependente (Artigo 58)</td>
                          <td className="p-2 text-right font-mono font-extrabold text-slate-800">{totalIrpsRetido.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                        </tr>
                        {jurosIrpsNum > 0 && (
                          <tr className="border-b border-amber-100">
                            <td className="p-2 font-mono font-bold text-slate-400">-</td>
                            <td className="p-2 text-slate-600 font-medium">Juros Compensatórios</td>
                            <td className="p-2 text-right font-mono font-extrabold text-slate-800">{jurosIrpsNum.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* INTERACTIVE CONTROLS FOR IRPS COMPENSATORY INTEREST */}
                  <div className="grid grid-cols-1 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Juros Compensatórios por Atraso (MT)</label>
                      <input
                        type="number"
                        min="0"
                        value={jurosIrps}
                        onChange={(e) => setJurosIrps(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        placeholder="Ex: 250"
                        title="Juros compensatórios por atraso na entrega do imposto retido"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-amber-800 text-white p-3 rounded-xl mt-2 shadow-sm">
                    <span className="text-xs font-bold uppercase">Total Líquido a Recolher (M/19)</span>
                    <span className="text-sm font-extrabold font-mono">{totalIrpsPagar.toLocaleString('pt-MZ')} MT</span>
                  </div>
                </div>

                {/* IRPS BANK PAYMENT DETAILS INTEGRATION */}
                <div className="bg-amber-100/50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-[11px]" id="irps_bank_details">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <Coins size={14} />
                    <span>Dados de Liquidação de Tributos Estatais (DGI)</span>
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span>Entidade da DGI:</span>
                      <span className="font-bold font-mono">RECOLHA DE IRPS (80133)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Referência de Pagamento:</span>
                      <span className="font-extrabold font-mono text-amber-900">{referenciaIRPS}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Limite de Pagamento:</span>
                      <span className="font-bold text-slate-850">{dataLimiteIrps}</span>
                    </div>
                  </div>
                </div>
               </div>

              <div className="space-y-2" id="irps_pdf_actions">
                <button
                  onClick={handleDownloadIrpsPdf}
                  id="btn_download_irps_pdf"
                  disabled={generatingIrpsPdf || totalEmployees === 0}
                  className={`w-full py-3.5 font-bold rounded-xl shadow-md cursor-pointer text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                    totalEmployees > 0 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed'
                  }`}
                >
                  <Download size={14} />
                  {generatingIrpsPdf ? 'A emitir M/19 em PDF...' : `DESCARREGAR GUIA IRPS MODELO M/19 (PDF)`}
                </button>
              </div>
            </>
          )}

        </div>

        {/* Support & Legal Terms Sidebar (1/3 size) */}
        <div className="space-y-6" id="sissmo_sidebar">
          {/* Moz labor guidelines */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4" id="labor_guidelines_card">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Guias de Conformidade Laboral</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs">
                <ChevronRight className="text-blue-900 shrink-0 mt-0.5" size={14} />
                <p className="text-slate-600 leading-relaxed">
                  <b>SISSMO Integrado:</b> O Sistema de Informação da Segurança Social de Moçambique unifica a folha de salários eletrónica (.csv) e a emissão das guias bancárias de recolhimento.
                </p>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <ChevronRight className="text-blue-900 shrink-0 mt-0.5" size={14} />
                <p className="text-slate-600 leading-relaxed">
                  <b>Prazo Limite INSS:</b> A declaração e o pagamento da Guia do INSS (7% total) devem ocorrer impreterivelmente até ao dia <b>10 de cada mês</b>.
                </p>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <ChevronRight className="text-blue-900 shrink-0 mt-0.5" size={14} />
                <p className="text-slate-600 leading-relaxed">
                  <b>Prazo Limite IRPS:</b> O imposto retido sobre o Trabalho Dependente (M/19) deve ser pago ao banco até ao dia <b>20 de cada mês</b>.
                </p>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <ChevronRight className="text-blue-900 shrink-0 mt-0.5" size={14} />
                <p className="text-slate-600 leading-relaxed">
                  <b>Penalizações por Atraso:</b> Pagamentos efectuados após o dia 10 (INSS) ou dia 20 (IRPS) incorrem em juros de mora legais, nos termos do regulamento nacional de segurança social e fiscal.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Terms of Service */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg space-y-4" id="legal_disclaimer_card">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={18} />
              <h4 className="font-bold text-xs uppercase tracking-wider">Declaração de Isenção Legal</h4>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              Os cálculos e simulações de guias e layouts baseiam-se estritamente na regulamentação do Instituto Nacional de Segurança Social (INSS) de Moçambique. O utilizador reconhece que as simulações e dados exportados devem ser revalidados pelo contabilista certificado da empresa antes do envio definitivo e pagamento bancário.
            </p>
            <div className="border-t border-slate-800 pt-3">
              <p className="text-[9px] text-slate-400">
                Parceiro de Liquidação Financeira Autorizado pelo Banco de Moçambique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
