/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  User, 
  Calendar, 
  Coins, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Plus, 
  Trash2, 
  Eye, 
  ShieldAlert,
  Clock,
  Briefcase
} from 'lucide-react';
import { Employee, CompanyData } from '../types';

interface Contract {
  id: string;
  empresa_id: string;
  nome_funcionario: string;
  cargo: string;
  tipo_contrato: 'Prazo Certo' | 'Indeterminado' | 'Prazo Incerto';
  data_inicio: string;
  data_fim?: string;
  salario_base: number;
  cargo_complexo?: boolean;
  auditoria?: {
    statusRisco: 'VERDE' | 'AMARELO' | 'VERMELHO';
    mensagemLegal: string;
  };
}

interface ContractManagementProps {
  company: CompanyData;
  employees: Employee[];
  onReload?: () => void;
}

export default function ContractManagement({ company, employees, onReload }: ContractManagementProps) {
  const [contratos, setContratos] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [selectedContrato, setSelectedContrato] = useState<Contract | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Form states for new contract
  const [novoFuncionario, setNovoFuncionario] = useState('');
  const [novoCargo, setNovoCargo] = useState('');
  const [novoTipo, setNovoTipo] = useState<'Prazo Certo' | 'Indeterminado' | 'Prazo Incerto'>('Prazo Certo');
  const [novoInicio, setNovoInicio] = useState('2026-06-01');
  const [novoFim, setNovoFim] = useState('2026-12-31');
  const [novoSalario, setNovoSalario] = useState('20000');
  const [novoCargoComplexo, setNovoCargoComplexo] = useState(false);

  const carregarContratos = async () => {
    setLoading(true);
    try {
      // Simula o cabeçalho de autenticação do cliente logado
      const usuarioSimulado = JSON.stringify({ funcao: "CLIENTE_EMPRESA", empresa_id: "emp_piloto_01" });
      
      const resposta = await fetch('/api/clientes/listar-contratos', {
        headers: { 'usuario-simulado': usuarioSimulado }
      });
      
      if (!resposta.ok) {
        throw new Error('Falha ao descarregar contratos.');
      }
      const data = await resposta.json();
      setContratos(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar contratos laborais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContratos();
  }, [employees]); // Reload contracts when employees array changes

  const emitirAvisoPrevio = async (contrato: Contract) => {
    setDownloadingPdf(contrato.id);
    try {
      // Data de hoje formatada em português para o PDF
      const dataHoje = new Date('2026-06-26');
      const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      
      const dadosEmpresa = {
        nome: company.nome || "Mercearia do Povo Lda",
        nuit: company.nuit || "400555321",
        endereco: company.endereco || "Maputo Cidade, Moçambique"
      };

      const dadosFuncionario = {
        nome: contrato.nome_funcionario,
        cargo: contrato.cargo,
        inss_numero: employees.find(e => e.nome === contrato.nome_funcionario)?.inss_numero || "Pendente"
      };

      const dadosContrato = {
        data_fim: contrato.data_fim || "Indeterminado",
        dia_atual: String(dataHoje.getDate()),
        mes_atual: meses[dataHoje.getMonth()],
        ano_atual: String(dataHoje.getFullYear())
      };

      const res = await fetch('/api/contratos/emitir-aviso-previo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dadosEmpresa, dadosFuncionario, dadosContrato })
      });

      if (!res.ok) {
        throw new Error('Falha ao emitir o PDF de Aviso Prévio.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aviso_previo_${dadosFuncionario.nome.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleCriarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const usuarioSimulado = JSON.stringify({ funcao: "CLIENTE_EMPRESA", empresa_id: "emp_piloto_01" });
      const payload = {
        nome_funcionario: novoFuncionario,
        cargo: novoCargo,
        tipo_contrato: novoTipo,
        data_inicio: novoInicio,
        data_fim: novoTipo === 'Prazo Certo' ? novoFim : undefined,
        salario_base: Number(novoSalario),
        cargo_complexo: novoCargoComplexo
      };

      const res = await fetch('/api/clientes/criar-contrato', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'usuario-simulado': usuarioSimulado
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.erro || 'Erro ao criar contrato no servidor.');
      }

      await carregarContratos();
      if (onReload) onReload(); // Reload parents/employee list

      setShowAddModal(false);
      // Reset formulário
      setNovoFuncionario('');
      setNovoCargo('');
      setNovoTipo('Prazo Certo');
      setNovoSalario('20000');
      setNovoCargoComplexo(false);

    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleRemoverContrato = async (id: string, nome: string) => {
    if (confirm(`Atenção: Deseja remover o contrato de ${nome}? Isto também irá remover o colaborador correspondente do ERP de forma interligada.`)) {
      try {
        const usuarioSimulado = JSON.stringify({ funcao: "CLIENTE_EMPRESA", empresa_id: "emp_piloto_01" });
        const res = await fetch(`/api/clientes/remover-contrato/${id}`, {
          method: 'DELETE',
          headers: { 'usuario-simulado': usuarioSimulado }
        });
        if (res.ok) {
          await carregarContratos();
          if (onReload) onReload(); // Sync with parent database
        } else {
          const errData = await res.json();
          alert(errData.erro || 'Erro ao remover contrato.');
        }
      } catch (err: any) {
        alert(err.message || 'Erro de rede.');
      }
    }
  };

  return (
    <div id="contract_panel" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            📋 Painel de Contratos Laborais
          </h2>
          <p className="text-xs text-slate-500">
            Controlo de prazos, períodos de experiência e avisos prévios sob a nova Lei nº 13/2023 de Moçambique.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus size={14} />
          Novo Contrato
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">A processar motor de auditoria de contratos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 rounded-2xl p-6 border border-red-100 text-center">
          <p className="text-xs font-bold">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Funcionário</th>
                  <th className="p-4">Tipo de Contrato</th>
                  <th className="p-4">Início</th>
                  <th className="p-4">Término</th>
                  <th className="p-4 text-right">Salário Base</th>
                  <th className="p-4">Estado / Alerta</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {contratos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      Nenhum contrato laboral registado de momento.
                    </td>
                  </tr>
                ) : (
                  contratos.map((ct) => {
                    const badgeClass = 
                      ct.auditoria?.statusRisco === 'VERMELHO' 
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : ct.auditoria?.statusRisco === 'AMARELO'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100';

                    return (
                      <tr key={ct.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div>
                            <span className="font-extrabold text-slate-800 block">{ct.nome_funcionario}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{ct.cargo}</span>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-600">
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} className="text-slate-400" />
                            {ct.tipo_contrato}
                            {ct.cargo_complexo && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1 rounded border border-indigo-100">
                                Técnico/Complexo
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{ct.data_inicio}</td>
                        <td className="p-4 font-mono text-slate-500">{ct.data_fim || 'Indeterminado'}</td>
                        <td className="p-4 text-right font-extrabold text-slate-700 font-mono">
                          {ct.salario_base.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                        </td>
                        <td className="p-4">
                          <span 
                            title={ct.auditoria?.mensagemLegal}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wide cursor-help ${badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              ct.auditoria?.statusRisco === 'VERMELHO' ? 'bg-rose-500' :
                              ct.auditoria?.statusRisco === 'AMARELO' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            {ct.auditoria?.statusRisco === 'VERDE' ? 'Regular' : ct.auditoria?.statusRisco}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedContrato(ct)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/50 transition-all cursor-pointer"
                              title="Ver Detalhes Jurídicos"
                            >
                              <Eye size={13} />
                            </button>
                            {ct.auditoria?.statusRisco === 'VERMELHO' ? (
                              <button
                                onClick={() => emitirAvisoPrevio(ct)}
                                disabled={downloadingPdf === ct.id}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {downloadingPdf === ct.id ? (
                                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <Download size={11} />
                                )}
                                Emitir Aviso
                              </button>
                            ) : (
                              <button
                                onClick={() => alert('Abriremos o gestor de ficheiros de contrato.')}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all border border-slate-200 cursor-pointer"
                              >
                                Ver Detalhes
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoverContrato(ct.id, ct.nome_funcionario)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg border border-rose-200/50 transition-all cursor-pointer"
                              title="Remover Contrato (Sincronizado com Colaboradores)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legenda Informativa da Lei 13/2023 */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
          <ShieldAlert size={14} className="text-blue-800" />
          Regras de Auditoria Legal sob a Lei do Trabalho nº 13/2023 (República de Moçambique)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-slate-600 leading-relaxed">
          <div className="bg-white p-3 rounded-xl border border-blue-100/50">
            <span className="font-bold text-blue-900 block mb-1">📢 Aviso Prévio Obrigatório</span>
            Para contratos a prazo certo, a falta de denúncia expressa escrita com <b>30 dias</b> de antecedência do vencimento do contrato implica a renovação tácita do contrato ou obrigações indemnizatórias de caducidade (Art. 41).
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-100/50">
            <span className="font-bold text-blue-900 block mb-1">⏱️ Períodos de Experiência</span>
            A duração máxima do período de experiência é de <b>15 dias</b> (prazo até 6 meses), <b>30 dias</b> (prazo superior a 6 meses), <b>90 dias</b> (trabalhos complexos ou por tempo indeterminado padrão) ou <b>180 dias</b> (cargos complexos indeterminado).
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-100/50">
            <span className="font-bold text-blue-900 block mb-1">⚠️ Classificação de Alertas</span>
            <span className="text-rose-600 font-semibold">VERMELHO</span>: Contratos caducando em menos de 30 dias (sem aviso de não renovação emitido). <span className="text-amber-600 font-semibold">AMARELO</span>: Próximo de findar o período de experiência de avaliação de desempenho.
          </div>
        </div>
      </div>

      {/* MODAL: VER DETALHES JURÍDICOS */}
      <AnimatePresence>
        {selectedContrato && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Análise Regulamentar do Contrato</h3>
                  <p className="text-[11px] text-slate-400">Verificação automática de conformidade sob a Lei nº 13/2023</p>
                </div>
                <button 
                  onClick={() => setSelectedContrato(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer text-xs font-bold"
                >
                  X
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Funcionário:</span>
                  <span className="font-bold text-slate-800">{selectedContrato.nome_funcionario}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Função/Cargo:</span>
                  <span className="font-semibold text-slate-800">{selectedContrato.cargo}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Tipo de Vínculo:</span>
                  <span className="font-semibold text-slate-800">{selectedContrato.tipo_contrato}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Início de Funções:</span>
                  <span className="font-mono text-slate-700">{selectedContrato.data_inicio}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Data de Término:</span>
                  <span className="font-mono text-slate-700">{selectedContrato.data_fim || 'Sem prazo determinado'}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Salário Contratual:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedContrato.salario_base.toLocaleString('pt-MZ')} MT
                  </span>
                </div>
              </div>

              {/* Status Box */}
              <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                selectedContrato.auditoria?.statusRisco === 'VERMELHO' ? 'bg-rose-50 border-rose-100 text-rose-800' :
                selectedContrato.auditoria?.statusRisco === 'AMARELO' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {selectedContrato.auditoria?.statusRisco === 'VERMELHO' ? <AlertTriangle size={15} /> :
                   selectedContrato.auditoria?.statusRisco === 'AMARELO' ? <Clock size={15} /> : <CheckCircle size={15} />}
                  <span>ESTADO: {selectedContrato.auditoria?.statusRisco === 'VERDE' ? 'CONFORMIDADE PLENA' : `ALERTA ${selectedContrato.auditoria?.statusRisco}`}</span>
                </div>
                <p className="leading-relaxed font-medium">{selectedContrato.auditoria?.mensagemLegal}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedContrato(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Fechar
                </button>
                {selectedContrato.auditoria?.statusRisco === 'VERMELHO' && (
                  <button
                    onClick={() => {
                      emitirAvisoPrevio(selectedContrato);
                      setSelectedContrato(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    Emitir Aviso Prévio
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NOVO CONTRATO */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registar Novo Contrato Laboral</h3>
                  <p className="text-[11px] text-slate-400">Insira as cláusulas básicas de contratação</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer font-bold text-xs"
                >
                  X
                </button>
              </div>

              <form onSubmit={handleCriarContrato} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Funcionário:</label>
                  <select 
                    required
                    value={novoFuncionario}
                    onChange={(e) => {
                      setNovoFuncionario(e.target.value);
                      const matchingEmp = employees.find(emp => emp.nome === e.target.value);
                      if (matchingEmp) {
                        setNovoCargo(matchingEmp.cargo);
                        setNovoSalario(String(matchingEmp.salario_base));
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-900 focus:outline-none"
                  >
                    <option value="">Selecione o Trabalhador...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.nome}>{emp.nome} ({emp.cargo})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Cargo / Função:</label>
                    <input 
                      type="text" 
                      required
                      value={novoCargo}
                      onChange={(e) => setNovoCargo(e.target.value)}
                      placeholder="Ex: Caixa"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-900 focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Salário Base (MT):</label>
                    <input 
                      type="number" 
                      required
                      value={novoSalario}
                      onChange={(e) => setNovoSalario(e.target.value)}
                      placeholder="Ex: 15000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Tipo de Contrato:</label>
                    <select 
                      value={novoTipo}
                      onChange={(e) => setNovoTipo(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-900 focus:outline-none font-semibold"
                    >
                      <option value="Prazo Certo">Prazo Certo</option>
                      <option value="Indeterminado">Indeterminado</option>
                      <option value="Prazo Incerto">Prazo Incerto</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5 pl-1">
                    <input 
                      type="checkbox" 
                      id="cargo_complexo_check"
                      checked={novoCargoComplexo}
                      onChange={(e) => setNovoCargoComplexo(e.target.checked)}
                      className="w-4 h-4 text-blue-900 bg-slate-50 border-slate-200 rounded focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="cargo_complexo_check" className="font-bold text-slate-600 select-none cursor-pointer">
                      Cargo Altamente Qualificado / Complexo
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Data de Início:</label>
                    <input 
                      type="date" 
                      required
                      value={novoInicio}
                      onChange={(e) => setNovoInicio(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-900 focus:outline-none font-mono"
                    />
                  </div>
                  {novoTipo === 'Prazo Certo' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Data de Término:</label>
                      <input 
                        type="date" 
                        required
                        value={novoFim}
                        onChange={(e) => setNovoFim(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-900 focus:outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Registar Contrato
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
