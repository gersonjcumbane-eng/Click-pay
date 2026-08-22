import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  FileText,
  FileSignature,
  Plus,
  Search,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  Zap,
  DollarSign,
  Calendar,
  Building2,
  Filter,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  Tag,
  Briefcase
} from 'lucide-react';
import { LeadItem, PropostaItem, ContratoComercialItem, CompanyData } from '../types';

interface CRMVendasProps {
  companyData: CompanyData;
  onNavigateToFinancial?: () => void;
}

export const CRMVendas: React.FC<CRMVendasProps> = ({ companyData, onNavigateToFinancial }) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'propostas' | 'contratos' | 'metricas'>('pipeline');

  // State Stores
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [propostas, setPropostas] = useState<PropostaItem[]>([]);
  const [contratos, setContratos] = useState<ContratoComercialItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('todos');

  // Modals state
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false);
  const [showPropostaModal, setShowPropostaModal] = useState<boolean>(false);
  const [showContratoModal, setShowContratoModal] = useState<boolean>(false);
  const [selectedPropostaPDF, setSelectedPropostaPDF] = useState<PropostaItem | null>(null);

  // Lead Form
  const [leadForm, setLeadForm] = useState({
    empresa_nome: '',
    nuit: '',
    contacto_nome: '',
    email: '',
    telefone: '',
    estagio: 'Prospecto' as LeadItem['estagio'],
    valor_estimado: 100000,
    probabilidade: 50,
    origem: 'Website' as LeadItem['origem'],
    vendedor: 'Gerson Cumbane',
    data_fecho_estimada: '',
    notas: ''
  });

  // Proposta Form
  const [propostaForm, setPropostaForm] = useState({
    lead_id: '',
    cliente_nome: '',
    nuit_cliente: '',
    email_cliente: '',
    telefone_cliente: '',
    data_validade: '',
    condicoes_pagamento: '50% no acto da adjudicação e 50% após entrega final.',
    vendedor: 'Gerson Cumbane',
    itens: [
      { descricao: 'Licenciamento ERP Payroll Tech Cloud', quantidade: 1, preco_unitario: 150000, taxa_iva: 16, desconto_percentual: 0, total: 150000 }
    ]
  });

  // Contrato Form
  const [contratoForm, setContratoForm] = useState({
    cliente_nome: '',
    nuit_cliente: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    valor_total: 240000,
    faturamento_mensal: 20000,
    ciclo_faturamento: 'Mensal' as ContratoComercialItem['ciclo_faturamento'],
    estado: 'Ativo' as ContratoComercialItem['estado'],
    vendedor: 'Gerson Cumbane',
    observacoes: ''
  });

  // Feedback Messages
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resLeads, resProp, resCtr] = await Promise.all([
        fetch('/api/crm/leads'),
        fetch('/api/crm/propostas'),
        fetch('/api/crm/contratos')
      ]);

      if (resLeads.ok) setLeads(await resLeads.json());
      if (resProp.ok) setPropostas(await resProp.json());
      if (resCtr.ok) setContratos(await resCtr.json());
    } catch (err) {
      console.error('Erro ao carregar dados do CRM:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // NUIT Validation (Mozambique 9 digits)
  const isNuitValid = (nuit: string) => /^[0-9]{9}$/.test(nuit.trim());

  // Handle Lead Create
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.empresa_nome) {
      showNotification('error', 'O nome da empresa é obrigatório.');
      return;
    }
    if (leadForm.nuit && !isNuitValid(leadForm.nuit)) {
      showNotification('error', 'O NUIT deve ter exatamente 9 dígitos numéricos.');
      return;
    }

    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm)
      });
      if (res.ok) {
        showNotification('success', 'Lead registado com sucesso no Funil de Vendas!');
        setShowLeadModal(false);
        setLeadForm({
          empresa_nome: '',
          nuit: '',
          contacto_nome: '',
          email: '',
          telefone: '',
          estagio: 'Prospecto',
          valor_estimado: 100000,
          probabilidade: 50,
          origem: 'Website',
          vendedor: 'Gerson Cumbane',
          data_fecho_estimada: '',
          notas: ''
        });
        fetchData();
      }
    } catch (err) {
      showNotification('error', 'Erro ao salvar lead.');
    }
  };

  // Move Lead Stage
  const handleUpdateLeadStage = async (id: string, newStage: LeadItem['estagio']) => {
    try {
      const probMap: Record<LeadItem['estagio'], number> = {
        'Prospecto': 20,
        'Qualificado': 40,
        'Proposta_Enviada': 60,
        'Negociacao': 80,
        'Fechado_Ganho': 100,
        'Perdido': 0
      };

      const res = await fetch(`/api/crm/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estagio: newStage, probabilidade: probMap[newStage] })
      });

      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, estagio: newStage, probabilidade: probMap[newStage] } : l));
        showNotification('success', `Estágio do lead atualizado para ${newStage.replace('_', ' ')}.`);
      }
    } catch (err) {
      showNotification('error', 'Erro ao atualizar estágio do lead.');
    }
  };

  // Quick action: Lead -> Proposta Modal
  const openPropostaForLead = (lead: LeadItem) => {
    setPropostaForm({
      lead_id: lead.id,
      cliente_nome: lead.empresa_nome,
      nuit_cliente: lead.nuit || '400000000',
      email_cliente: lead.email,
      telefone_cliente: lead.telefone,
      data_validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      condicoes_pagamento: '50% na adjudicação e 50% após migração inicial.',
      vendedor: lead.vendedor || 'Gerson Cumbane',
      itens: [
        {
          descricao: `Serviço de Licenciamento & Implementação ERP para ${lead.empresa_nome}`,
          quantidade: 1,
          preco_unitario: lead.valor_estimado || 150000,
          taxa_iva: 16,
          desconto_percentual: 0,
          total: lead.valor_estimado || 150000
        }
      ]
    });
    setShowPropostaModal(true);
  };

  // Proposta Item Row Control
  const addPropostaItemRow = () => {
    setPropostaForm(prev => ({
      ...prev,
      itens: [
        ...prev.itens,
        { descricao: '', quantidade: 1, preco_unitario: 0, taxa_iva: 16, desconto_percentual: 0, total: 0 }
      ]
    }));
  };

  const updatePropostaItemRow = (index: number, field: string, val: any) => {
    setPropostaForm(prev => {
      const copy = [...prev.itens];
      const item = { ...copy[index], [field]: val };
      const descMult = 1 - (item.desconto_percentual || 0) / 100;
      item.total = Number((item.quantidade * item.preco_unitario * descMult).toFixed(2));
      copy[index] = item;
      return { ...prev, itens: copy };
    });
  };

  const removePropostaItemRow = (index: number) => {
    if (propostaForm.itens.length <= 1) return;
    setPropostaForm(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  // Handle Proposta Submit
  const handleCreateProposta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propostaForm.cliente_nome) {
      showNotification('error', 'Nome do cliente é obrigatório.');
      return;
    }
    if (!isNuitValid(propostaForm.nuit_cliente)) {
      showNotification('error', 'NUIT do cliente inválido (requer exatamente 9 dígitos).');
      return;
    }

    try {
      const res = await fetch('/api/crm/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...propostaForm,
          estado: 'Enviada',
          data_emissao: new Date().toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        showNotification('success', 'Proposta comercial gerada com sucesso!');
        setShowPropostaModal(false);
        fetchData();
      }
    } catch (err) {
      showNotification('error', 'Erro ao emitir proposta.');
    }
  };

  // ⚡ CONVERTER PROPOSTA EM FATURA NA TESOURARIA (DIRECT TREASURY INTEGRATION)
  const handleConvertPropostaToInvoice = async (propId: string) => {
    if (!confirm('Deseja converter esta proposta comercial numa Fatura oficial com lançamento automático na Contabilidade PGC-NIRF e Tesouraria?')) {
      return;
    }

    try {
      const res = await fetch(`/api/crm/propostas/${propId}/converter-venda`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        showNotification(
          'success',
          `⚡ Proposta convertida com sucesso! Gerada a Fatura ${data.venda?.numero_factura} no valor de ${data.venda?.total_com_iva.toLocaleString('pt-MZ')} MT.`
        );
        fetchData();
      } else {
        showNotification('error', 'Falha ao converter proposta em fatura.');
      }
    } catch (err) {
      showNotification('error', 'Erro de comunicação ao converter proposta.');
    }
  };

  // Handle Contrato Submit
  const handleCreateContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contratoForm.cliente_nome) {
      showNotification('error', 'Nome do cliente é obrigatório.');
      return;
    }
    if (!isNuitValid(contratoForm.nuit_cliente)) {
      showNotification('error', 'NUIT do cliente deve ter 9 dígitos.');
      return;
    }

    try {
      const res = await fetch('/api/crm/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contratoForm)
      });

      if (res.ok) {
        showNotification('success', 'Contrato comercial registado com sucesso!');
        setShowContratoModal(false);
        fetchData();
      }
    } catch (err) {
      showNotification('error', 'Erro ao salvar contrato.');
    }
  };

  // Calculate Metrics
  const totalPipelineForecast = leads
    .filter(l => l.estagio !== 'Perdido')
    .reduce((acc, l) => acc + (l.valor_estimado * (l.probabilidade / 100)), 0);

  const totalWonLeads = leads.filter(l => l.estagio === 'Fechado_Ganho').length;
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? ((totalWonLeads / totalLeads) * 100).toFixed(1) : '0';

  const totalPropostasAprovadas = propostas.filter(p => p.estado === 'Aprovada' || p.estado === 'Convertida_Em_Venda').length;
  const valorTotalPropostas = propostas.reduce((a, b) => a + b.total_geral, 0);

  // Filtered Lists
  const filteredLeads = leads.filter(l => {
    const matchSearch = l.empresa_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.contacto_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.nuit.includes(searchTerm);
    const matchStage = stageFilter === 'todos' || l.estagio === stageFilter;
    return matchSearch && matchStage;
  });

  const stages: { key: LeadItem['estagio']; label: string; bg: string; border: string; text: string }[] = [
    { key: 'Prospecto', label: 'Prospectos', bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700' },
    { key: 'Qualificado', label: 'Qualificados', bg: 'bg-blue-50/60', border: 'border-blue-200', text: 'text-blue-800' },
    { key: 'Proposta_Enviada', label: 'Proposta Enviada', bg: 'bg-amber-50/60', border: 'border-amber-200', text: 'text-amber-800' },
    { key: 'Negociacao', label: 'Em Negociação', bg: 'bg-indigo-50/60', border: 'border-indigo-200', text: 'text-indigo-800' },
    { key: 'Fechado_Ganho', label: 'Fechado / Ganho', bg: 'bg-emerald-50/60', border: 'border-emerald-200', text: 'text-emerald-800' },
    { key: 'Perdido', label: 'Perdido', bg: 'bg-rose-50/60', border: 'border-rose-200', text: 'text-rose-800' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-blue-400/30">
                CRM & Vendas Integrado
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <Zap size={10} /> Conexão Tesouraria PGC-NIRF
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Módulo CRM & Gestão Comercial</h1>
            <p className="text-xs sm:text-sm text-blue-200/80 max-w-2xl font-medium leading-relaxed">
              Gerencie prospectos, emita propostas comerciais com cálculo automático de IVA 16%, controle contratos e converta negócios diretamente em Faturas de Tesouraria.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowLeadModal(true)}
              className="bg-white text-blue-900 hover:bg-blue-50 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Novo Lead</span>
            </button>
            <button
              onClick={() => setShowPropostaModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText size={16} />
              <span>Emitir Proposta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Forecast do Pipeline</span>
            <div className="p-2 bg-blue-50 text-blue-900 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {totalPipelineForecast.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Ponderado por probabilidade</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Taxa de Conversão</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700 font-mono">{conversionRate}%</div>
            <span className="text-[10px] text-slate-400 font-medium">{totalWonLeads} ganhos de {totalLeads} leads totais</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Propostas Aprovadas</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileText size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono">{totalPropostasAprovadas}</div>
            <span className="text-[10px] text-slate-400 font-medium">De {propostas.length} propostas emitidas</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contratos Activos</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <FileSignature size={18} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {contratos.filter(c => c.estado === 'Ativo').length}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Receita mensal contratada</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pipeline'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp size={15} />
          <span>Funil de Vendas (Pipeline)</span>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.2 rounded-full font-black">
            {leads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('propostas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'propostas'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText size={15} />
          <span>Propostas Comercial & Orçamentos</span>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.2 rounded-full font-black">
            {propostas.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('contratos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'contratos'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSignature size={15} />
          <span>Contratos Comerciais</span>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.2 rounded-full font-black">
            {contratos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('metricas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'metricas'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users size={15} />
          <span>Métricas & Desempenho</span>
        </button>
      </div>

      {/* TAB 1: FUNIL DE VENDAS (KANBAN & LISTA) */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por empresa, contacto ou NUIT..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Filter size={14} className="text-slate-400" />
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium text-slate-700 focus:outline-none"
              >
                <option value="todos">Todos os Estágios</option>
                <option value="Prospecto">Prospecto</option>
                <option value="Qualificado">Qualificado</option>
                <option value="Proposta_Enviada">Proposta Enviada</option>
                <option value="Negociacao">Em Negociação</option>
                <option value="Fechado_Ganho">Fechado / Ganho</option>
                <option value="Perdido">Perdido</option>
              </select>

              <button
                onClick={fetchData}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                title="Atualizar dados"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Kanban Board Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto pb-4">
            {stages.map(stg => {
              const stageLeads = filteredLeads.filter(l => l.estagio === stg.key);
              const stageTotalValue = stageLeads.reduce((a, b) => a + (b.valor_estimado || 0), 0);

              return (
                <div key={stg.key} className={`rounded-xl border ${stg.border} ${stg.bg} p-3 space-y-3 flex flex-col min-w-[240px]`}>
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-black ${stg.text}`}>{stg.label}</span>
                      <span className="bg-white text-slate-700 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-slate-200">
                        {stageLeads.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">
                      {(stageTotalValue / 1000).toFixed(0)}k MT
                    </span>
                  </div>

                  {/* Leads Cards */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-6 text-[10px] text-slate-400 font-medium italic">
                        Nenhum lead
                      </div>
                    ) : (
                      stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-lg p-3 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-2 group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-black text-slate-900 line-clamp-1">{lead.empresa_nome}</h4>
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded shrink-0">
                              {lead.probabilidade}%
                            </span>
                          </div>

                          <div className="text-[10.5px] text-slate-500 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Building2 size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">NUIT: {lead.nuit || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{lead.contacto_nome}</span>
                            </div>
                          </div>

                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-blue-900 font-mono">
                              {lead.valor_estimado.toLocaleString('pt-MZ')} MT
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-1 flex items-center justify-between gap-1 border-t border-slate-100">
                            <select
                              value={lead.estagio}
                              onChange={e => handleUpdateLeadStage(lead.id, e.target.value as LeadItem['estagio'])}
                              className="text-[9.5px] border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 font-bold text-slate-700"
                            >
                              <option value="Prospecto">Prospecto</option>
                              <option value="Qualificado">Qualificado</option>
                              <option value="Proposta_Enviada">Proposta Enviada</option>
                              <option value="Negociacao">Negociação</option>
                              <option value="Fechado_Ganho">Ganho</option>
                              <option value="Perdido">Perdido</option>
                            </select>

                            <button
                              onClick={() => openPropostaForLead(lead)}
                              className="text-[9.5px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5 cursor-pointer"
                              title="Criar proposta para este lead"
                            >
                              <Plus size={10} />
                              <span>Proposta</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PROPOSTAS COMERCIAIS & ORÇAMENTOS */}
      {activeTab === 'propostas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-900">Propostas Comerciais & Orçamentos Emitidos</h3>
              <p className="text-xs text-slate-500 font-medium">
                Cálculo automático de IVA (16%), condições comerciais e conversão direta para Fatura de Tesouraria.
              </p>
            </div>

            <button
              onClick={() => setShowPropostaModal(true)}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Nova Proposta Comercial</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10.5px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="p-3">Nº Proposta</th>
                  <th className="p-3">Cliente / Entidade</th>
                  <th className="p-3">NUIT</th>
                  <th className="p-3">Data Validade</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">IVA (16%)</th>
                  <th className="p-3 text-right">Total Geral</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {propostas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400 font-medium">
                      Nenhuma proposta emitida até ao momento.
                    </td>
                  </tr>
                ) : (
                  propostas.map(prop => (
                    <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-900">{prop.numero_proposta}</td>
                      <td className="p-3 font-extrabold text-slate-800">{prop.cliente_nome}</td>
                      <td className="p-3 font-mono text-slate-600">{prop.nuit_cliente}</td>
                      <td className="p-3 text-slate-600 font-medium">{prop.data_validade}</td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        {prop.subtotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {prop.valor_iva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        {prop.total_geral.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          prop.estado === 'Aprovada' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          prop.estado === 'Convertida_Em_Venda' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                          prop.estado === 'Enviada' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {prop.estado === 'Convertida_Em_Venda' ? 'Faturado Tesouraria' : prop.estado}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPropostaPDF(prop)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Visualizar Proposta / Imprimir PDF"
                          >
                            <Eye size={14} />
                          </button>

                          {prop.estado !== 'Convertida_Em_Venda' && (
                            <button
                              onClick={() => handleConvertPropostaToInvoice(prop.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="⚡ Converter em Fatura na Tesouraria"
                            >
                              <Zap size={11} />
                              <span>Faturar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRATOS COMERCIAIS */}
      {activeTab === 'contratos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-900">Contratos Comerciais & Prestação de Serviços</h3>
              <p className="text-xs text-slate-500 font-medium">
                Acompanhamento de contratos activos, vigência de prazos e receitas recorrentes (MRR).
              </p>
            </div>

            <button
              onClick={() => setShowContratoModal(true)}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Contrato</span>
            </button>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {contratos.map(ctr => (
              <div key={ctr.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {ctr.numero_contrato}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1">{ctr.cliente_nome}</h4>
                    <span className="text-[10.5px] text-slate-500 font-mono">NUIT: {ctr.nuit_cliente}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    ctr.estado === 'Ativo' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {ctr.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Valor Total</span>
                    <span className="font-mono font-extrabold text-slate-900">{ctr.valor_total.toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Mensalidade</span>
                    <span className="font-mono font-extrabold text-emerald-700">{ctr.faturamento_mensal.toLocaleString('pt-MZ')} MT</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Data Início</span>
                    <span className="text-slate-700 font-medium">{ctr.data_inicio}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Data Término</span>
                    <span className="text-slate-700 font-medium">{ctr.data_fim}</span>
                  </div>
                </div>

                {ctr.observacoes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50/50 p-2 rounded border border-slate-100">
                    "{ctr.observacoes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MÉTRICAS DE DESEMPENHO COMERCIAL */}
      {activeTab === 'metricas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-black text-slate-900">Métricas & Relatório de Desempenho Comercial</h3>
            <p className="text-xs text-slate-500 font-medium">Análise de eficiência de vendas, funil de conversão e ticket médio.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total em Pipeline Ativo</span>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {leads.filter(l => l.estagio !== 'Fechado_Ganho' && l.estagio !== 'Perdido').reduce((a, b) => a + b.valor_estimado, 0).toLocaleString('pt-MZ')} MT
              </div>
              <p className="text-[10.5px] text-slate-500">Soma de todas as oportunidades em prospeção e negociação.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ticket Médio por Negócio</span>
              <div className="text-2xl font-black text-blue-900 font-mono">
                {leads.length > 0 ? (leads.reduce((a, b) => a + b.valor_estimado, 0) / leads.length).toLocaleString('pt-MZ', { maximumFractionDigits: 0 }) : 0} MT
              </div>
              <p className="text-[10.5px] text-slate-500">Valor médio estimado por oportunidade negociada.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Propostas Convertidas</span>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {propostas.filter(p => p.estado === 'Convertida_Em_Venda').length}
              </div>
              <p className="text-[10.5px] text-slate-500">Faturas geradas e integradas na Tesouraria.</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTO DE NOVO LEAD */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Plus size={16} className="text-blue-900" />
                <span>Registar Novo Lead no CRM</span>
              </h3>
              <button onClick={() => setShowLeadModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nome da Empresa / Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Petróleos de Moçambique SA"
                    value={leadForm.empresa_nome}
                    onChange={e => setLeadForm({ ...leadForm, empresa_nome: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">NUIT (9 dígitos)</label>
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="Ex: 400123456"
                    value={leadForm.nuit}
                    onChange={e => setLeadForm({ ...leadForm, nuit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pessoa de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ex: Dra. Anabela Cossa"
                    value={leadForm.contacto_nome}
                    onChange={e => setLeadForm({ ...leadForm, contacto_nome: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.co.mz"
                    value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Telefone</label>
                  <input
                    type="text"
                    placeholder="+258 84 000 0000"
                    value={leadForm.telefone}
                    onChange={e => setLeadForm({ ...leadForm, telefone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor Estimado (MT)</label>
                  <input
                    type="number"
                    value={leadForm.valor_estimado}
                    onChange={e => setLeadForm({ ...leadForm, valor_estimado: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estágio Inicial</label>
                  <select
                    value={leadForm.estagio}
                    onChange={e => setLeadForm({ ...leadForm, estagio: e.target.value as LeadItem['estagio'] })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-medium"
                  >
                    <option value="Prospecto">Prospecto</option>
                    <option value="Qualificado">Qualificado</option>
                    <option value="Proposta_Enviada">Proposta Enviada</option>
                    <option value="Negociacao">Em Negociação</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-extrabold"
                >
                  Registar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CRIAR PROPOSTA COMERCIAL / ORÇAMENTO */}
      {showPropostaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-emerald-600" />
                <span>Emitir Proposta Comercial / Orçamento</span>
              </h3>
              <button onClick={() => setShowPropostaModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateProposta} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Razão Social do Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cimentos de Moçambique SARL"
                    value={propostaForm.cliente_nome}
                    onChange={e => setPropostaForm({ ...propostaForm, cliente_nome: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">NUIT do Cliente (9 dígitos) *</label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    placeholder="Ex: 400123456"
                    value={propostaForm.nuit_cliente}
                    onChange={e => setPropostaForm({ ...propostaForm, nuit_cliente: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono bg-white focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-900 text-xs">Itens & Serviços da Proposta</label>
                  <button
                    type="button"
                    onClick={addPropostaItemRow}
                    className="text-[11px] bg-blue-50 text-blue-900 font-bold px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Adicionar Linha
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        <th className="p-2">Descrição</th>
                        <th className="p-2 w-16 text-center">Qtd</th>
                        <th className="p-2 w-28 text-right">Preço Unit (MT)</th>
                        <th className="p-2 w-20 text-center">IVA %</th>
                        <th className="p-2 w-28 text-right">Total (MT)</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {propostaForm.itens.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="Descrição do serviço/produto"
                              value={it.descricao}
                              onChange={e => updatePropostaItemRow(idx, 'descricao', e.target.value)}
                              className="w-full border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-blue-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={1}
                              value={it.quantidade}
                              onChange={e => updatePropostaItemRow(idx, 'quantidade', Number(e.target.value))}
                              className="w-full border border-slate-200 rounded p-1.5 text-center font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={it.preco_unitario}
                              onChange={e => updatePropostaItemRow(idx, 'preco_unitario', Number(e.target.value))}
                              className="w-full border border-slate-200 rounded p-1.5 text-right font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={it.taxa_iva}
                              onChange={e => updatePropostaItemRow(idx, 'taxa_iva', Number(e.target.value))}
                              className="w-full border border-slate-200 rounded p-1.5 text-center font-bold"
                            >
                              <option value={16}>16%</option>
                              <option value={0}>0% Isento</option>
                            </select>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-800">
                            {it.total.toLocaleString('pt-MZ')} MT
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removePropostaItemRow(idx)}
                              className="text-slate-400 hover:text-rose-600 font-bold"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Condições de Pagamento</label>
                <textarea
                  rows={2}
                  value={propostaForm.condicoes_pagamento}
                  onChange={e => setPropostaForm({ ...propostaForm, condicoes_pagamento: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPropostaModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold"
                >
                  Emitir Proposta Comercial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NOVO CONTRATO COMERCIAL */}
      {showContratoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileSignature size={16} className="text-blue-900" />
                <span>Registar Novo Contrato Comercial</span>
              </h3>
              <button onClick={() => setShowContratoModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateContrato} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banco de Moçambique SA"
                    value={contratoForm.cliente_nome}
                    onChange={e => setContratoForm({ ...contratoForm, cliente_nome: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">NUIT (9 dígitos) *</label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    placeholder="Ex: 400112233"
                    value={contratoForm.nuit_cliente}
                    onChange={e => setContratoForm({ ...contratoForm, nuit_cliente: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ciclo de Faturamento</label>
                  <select
                    value={contratoForm.ciclo_faturamento}
                    onChange={e => setContratoForm({ ...contratoForm, ciclo_faturamento: e.target.value as ContratoComercialItem['ciclo_faturamento'] })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-medium"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Anual">Anual</option>
                    <option value="Unico">Único</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor Total (MT)</label>
                  <input
                    type="number"
                    value={contratoForm.valor_total}
                    onChange={e => setContratoForm({ ...contratoForm, valor_total: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Faturamento Mensal (MT)</label>
                  <input
                    type="number"
                    value={contratoForm.faturamento_mensal}
                    onChange={e => setContratoForm({ ...contratoForm, faturamento_mensal: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Data Início</label>
                  <input
                    type="date"
                    value={contratoForm.data_inicio}
                    onChange={e => setContratoForm({ ...contratoForm, data_inicio: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Data Término</label>
                  <input
                    type="date"
                    value={contratoForm.data_fim}
                    onChange={e => setContratoForm({ ...contratoForm, data_fim: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowContratoModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-extrabold"
                >
                  Guardar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VISUALIZADOR DE PROPOSTA COMERCIAL (DOCUMENTO PRINT / PDF) */}
      {selectedPropostaPDF && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-300 space-y-6 my-6 print:m-0 print:p-0 print:shadow-none">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <span className="text-xs font-black text-blue-900 uppercase tracking-widest">
                Documento Oficial de Proposta Comercial
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setSelectedPropostaPDF(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Document Timbre / Header */}
            <div className="border-b-2 border-blue-900 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-blue-900 tracking-tight">{companyData.nome || 'Payroll Tech MZ Cloud ERP'}</h2>
                <p className="text-xs text-slate-600 font-medium">{companyData.endereco || 'Avenida 25 de Setembro, Maputo, Moçambique'}</p>
                <p className="text-xs text-slate-600 font-mono">NUIT: {companyData.nuit || '400123456'}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-sm font-black text-slate-900 font-mono block">{selectedPropostaPDF.numero_proposta}</span>
                <span className="text-[10px] bg-blue-50 text-blue-900 px-2 py-0.5 rounded font-bold uppercase border border-blue-200">
                  Proposta Comercial
                </span>
                <p className="text-[10.5px] text-slate-500 block pt-1">
                  Validade: {selectedPropostaPDF.data_validade}
                </p>
              </div>
            </div>

            {/* Client Info Block */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entidade Destinatária</span>
              <h4 className="text-sm font-black text-slate-900">{selectedPropostaPDF.cliente_nome}</h4>
              <p className="text-xs text-slate-600 font-mono">NUIT: {selectedPropostaPDF.nuit_cliente}</p>
              {selectedPropostaPDF.email_cliente && (
                <p className="text-xs text-slate-500">{selectedPropostaPDF.email_cliente} | {selectedPropostaPDF.telefone_cliente}</p>
              )}
            </div>

            {/* Proposal Items Table */}
            <table className="w-full text-left text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200">Item / Serviço</th>
                  <th className="p-2 border-r border-slate-200 text-center w-16">Qtd</th>
                  <th className="p-2 border-r border-slate-200 text-right w-28">Preço Unit.</th>
                  <th className="p-2 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedPropostaPDF.itens.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-r border-slate-200 font-medium text-slate-800">{it.descricao}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{it.quantidade}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">{it.preco_unitario.toLocaleString('pt-MZ')} MT</td>
                    <td className="p-2 text-right font-mono font-bold text-slate-900">{it.total.toLocaleString('pt-MZ')} MT</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-xs border-t border-slate-200 pt-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{selectedPropostaPDF.subtotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA (16%):</span>
                  <span className="font-mono">{selectedPropostaPDF.valor_iva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                </div>
                <div className="flex justify-between font-black text-sm text-blue-900 border-t border-slate-300 pt-1">
                  <span>Total Geral:</span>
                  <span className="font-mono">{selectedPropostaPDF.total_geral.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                </div>
              </div>
            </div>

            {/* Conditions, Bank Details & Signatures */}
            <div className="pt-4 border-t border-slate-200 space-y-4 text-xs">
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Termos e Condições de Pagamento:</span>
                <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                  {selectedPropostaPDF.condicoes_pagamento}
                </p>
              </div>

              {/* Bank Coordinates */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1 text-slate-800">
                <span className="font-bold text-blue-900 block text-[11px] uppercase tracking-wider">
                  Coordenadas Bancárias para Liquidação (Payroll Tech MZ, Lda):
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono text-[9px] pt-1">
                  <div className="bg-white p-2 rounded border border-blue-150">
                    <b className="text-blue-900 block">MILLENNIUM BIM</b>
                    Conta: 9944-8833-MZ<br />
                    NIB: 0001 0000 9944 8833 01
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-150">
                    <b className="text-blue-900 block">BCI FOMENTO</b>
                    Conta: 1122-3344-MZ<br />
                    NIB: 0008 0000 1122 3344 02
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-150">
                    <b className="text-blue-900 block">CARTEIRAS MÓVEIS</b>
                    M-Pesa: +258 861390061<br />
                    E-Mola: +258 871234567
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Pelo Departamento Comercial
                  </div>
                  <span className="text-[10px] text-slate-500 block">{selectedPropostaPDF.vendedor}</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                    Aceite do Cliente
                  </div>
                  <span className="text-[10px] text-slate-500 block">Assinatura / Carimbo</span>
                </div>
              </div>

              <div className="pt-2 text-center text-[8px] font-bold text-slate-400 border-t border-slate-200">
                Emitido por PRIMAVERA ERP V10 | Software Certificado nº 01/AT/2026 | Processado por Computador
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
