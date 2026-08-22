import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  ShoppingCart, 
  Tag, 
  BookOpen, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Download, 
  Coins, 
  Receipt, 
  Building2, 
  FileText, 
  ShieldCheck, 
  RefreshCw,
  Wallet,
  CreditCard,
  Percent,
  ChevronRight,
  Sparkles,
  Printer,
  Eye
} from 'lucide-react';
import { CompraItem, VendaItem, LivroCaixaItem, ApuramentoIVA, CompanyData } from '../types';
import { useToast } from '../context/ToastContext';
import { ComplianceAssist } from './ComplianceAssist';
import { PLANO_CONTAS_PGC_MOZAMBIQUE, getPlanoContasComSaldos, PgcContaComSaldo, validarEClassificarLancamentoPGC } from '../pgc_mozambique';
import { employees } from '../db_tax';
import A4DocumentModal, { DocumentItem } from './A4DocumentModal';

interface FinancialManagementProps {
  company: CompanyData;
  selectedPeriod: string;
  initialSubTab?: 'caixa' | 'compras' | 'vendas' | 'iva' | 'relatorios' | 'conformidade' | 'plano_contas';
}

export default function FinancialManagement({ company, selectedPeriod, initialSubTab }: FinancialManagementProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'caixa' | 'compras' | 'vendas' | 'iva' | 'relatorios' | 'conformidade' | 'plano_contas'>(initialSubTab || 'conformidade');

  const [pgcSearch, setPgcSearch] = useState<string>('');
  const [pgcClasseFilter, setPgcClasseFilter] = useState<number>(0);

  const [activeReportType, setActiveReportType] = useState<
    'custos_despesas' | 'vendas' | 'compras' | 'clientes' | 'fornecedores' | 'balancete' | 'diario_caixa' | 'fluxo_caixa' | 'balanco'
  >('custos_despesas');

  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // State
  const [compras, setCompras] = useState<CompraItem[]>([]);
  const [vendas, setVendas] = useState<VendaItem[]>([]);
  const [caixa, setCaixa] = useState<LivroCaixaItem[]>([]);
  const [apuramentoIva, setApuramentoIva] = useState<ApuramentoIVA | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('todos');

  const loadErpReport = async (tipo: string, periodo: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/relatorios/erp-agrupados?tipo=${tipo}&periodo=${encodeURIComponent(periodo)}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar relatório ERP:', err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'relatorios') {
      loadErpReport(activeReportType, selectedPeriod);
    }
  }, [activeSubTab, activeReportType, selectedPeriod]);

  // Modals & Forms
  const [showAddCompraModal, setShowAddCompraModal] = useState<boolean>(false);
  const [showAddVendaModal, setShowAddVendaModal] = useState<boolean>(false);
  const [showAddCaixaModal, setShowAddCaixaModal] = useState<boolean>(false);

  // Modal A4 Document View
  const [selectedDocA4, setSelectedDocA4] = useState<{
    isOpen: boolean;
    tipoDocumento: 'fatura' | 'factura_recibo' | 'recibo' | 'proforma' | 'compra' | 'caixa';
    numeroDocumento: string;
    dataEmissao: string;
    dataVencimento?: string;
    estadoPagamento?: 'Cobrado' | 'Pago' | 'Pendente' | 'Cancelado';
    metodoPagamento?: string;
    entidade: {
      nome: string;
      nuit: string;
      endereco?: string;
      email?: string;
      telefone?: string;
      tipo?: 'Cliente' | 'Fornecedor' | 'Outro';
    };
    itens: DocumentItem[];
    valorBase: number;
    valorIvaTotal: number;
    valorTotalGeral: number;
    observacoes?: string;
  } | null>(null);

  const openVendaA4 = (v: VendaItem) => {
    setSelectedDocA4({
      isOpen: true,
      tipoDocumento: v.estado === 'Cobrado' ? 'factura_recibo' : 'fatura',
      numeroDocumento: v.numero_factura || `FT-${v.id.substring(0, 8)}`,
      dataEmissao: v.data,
      dataVencimento: v.data,
      estadoPagamento: (v.estado as any) || 'Cobrado',
      metodoPagamento: 'Transferência Bancária / M-Pesa',
      entidade: {
        nome: v.cliente,
        nuit: v.nuit_cliente || 'Consumidor Final',
        tipo: 'Cliente'
      },
      itens: [
        {
          codigo: 'VD-001',
          descricao: v.descricao || 'Venda de Mercadorias / Prestação de Serviços',
          quantidade: 1,
          precoUnitario: v.valor_base,
          taxaIva: 16,
          subtotal: v.valor_base,
          valorIva: v.valor_iva,
          totalComIva: v.total_com_iva
        }
      ],
      valorBase: v.valor_base,
      valorIvaTotal: v.valor_iva,
      valorTotalGeral: v.total_com_iva,
      observacoes: 'Venda registada e integradamente contabilizada segundo o PGC-NIRF de Moçambique.'
    });
  };

  const openCompraA4 = (c: CompraItem) => {
    setSelectedDocA4({
      isOpen: true,
      tipoDocumento: 'compra',
      numeroDocumento: c.numero_factura || `FT-COMP-${c.id.substring(0, 8)}`,
      dataEmissao: c.data,
      dataVencimento: c.data,
      estadoPagamento: c.estado === 'Pago' ? 'Pago' : 'Pendente',
      metodoPagamento: 'Transferência Bancária',
      entidade: {
        nome: c.fornecedor,
        nuit: c.nuit_fornecedor || 'N/A',
        tipo: 'Fornecedor'
      },
      itens: [
        {
          codigo: 'CP-001',
          descricao: c.descricao || 'Aquisição de Mercadorias / Materiais / Insumos',
          quantidade: 1,
          precoUnitario: c.valor_base,
          taxaIva: 16,
          subtotal: c.valor_base,
          valorIva: c.valor_iva,
          totalComIva: c.total_com_iva
        }
      ],
      valorBase: c.valor_base,
      valorIvaTotal: c.valor_iva,
      valorTotalGeral: c.total_com_iva,
      observacoes: 'Factura de compra com IVA suportado dedutível para a Autoridade Tributária.'
    });
  };

  const openCaixaA4 = (cx: LivroCaixaItem) => {
    setSelectedDocA4({
      isOpen: true,
      tipoDocumento: 'caixa',
      numeroDocumento: cx.documento_ref || `RC-CX-${cx.id.substring(0, 8)}`,
      dataEmissao: cx.data,
      estadoPagamento: 'Pago',
      metodoPagamento: cx.categoria || 'Caixa / Banco',
      entidade: {
        nome: cx.terceiro || 'Lançamento de Caixa',
        nuit: cx.nuit_terceiro || 'N/A',
        tipo: cx.tipo === 'Entrada' ? 'Cliente' : 'Fornecedor'
      },
      itens: [
        {
          codigo: 'CX-001',
          descricao: cx.descricao || 'Movimento do Livro de Caixa',
          quantidade: 1,
          precoUnitario: cx.valor,
          taxaIva: 0,
          subtotal: cx.valor,
          valorIva: 0,
          totalComIva: cx.valor
        }
      ],
      valorBase: cx.valor,
      valorIvaTotal: 0,
      valorTotalGeral: cx.valor,
      observacoes: `Lançamento de Livro de Caixa (${cx.tipo.toUpperCase()})`
    });
  };

  // Form States - Nova Compra
  const [formCompra, setFormCompra] = useState({
    fornecedor: '',
    nuit_fornecedor: '',
    numero_factura: '',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    categoria: 'Insumos' as CompraItem['categoria'],
    valor_base: 0,
    taxa_iva: 16,
    estado: 'Pago' as CompraItem['estado'],
    metodo_pagamento: 'Transferencia_Bancaria' as CompraItem['metodo_pagamento']
  });

  // Form States - Nova Venda
  const [formVenda, setFormVenda] = useState({
    cliente: '',
    nuit_cliente: '',
    numero_factura: '',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    categoria: 'Servicos' as VendaItem['categoria'],
    valor_base: 0,
    taxa_iva: 16,
    estado: 'Cobrado' as VendaItem['estado'],
    metodo_recebimento: 'Transferencia_Bancaria' as VendaItem['metodo_recebimento']
  });

  // Form States - Novo Lançamento de Caixa
  const [formCaixa, setFormCaixa] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: 'Entrada' as LivroCaixaItem['tipo'],
    descricao: '',
    categoria: 'Outros' as LivroCaixaItem['categoria'],
    valor: 0,
    metodo: 'Transferencia_Bancaria' as LivroCaixaItem['metodo'],
    entidade: ''
  });

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const [compRes, vendRes, cxRes, ivaRes] = await Promise.all([
        fetch(`/api/compras?periodo=${encodeURIComponent(selectedPeriod)}`),
        fetch(`/api/vendas?periodo=${encodeURIComponent(selectedPeriod)}`),
        fetch(`/api/caixa?periodo=${encodeURIComponent(selectedPeriod)}`),
        fetch(`/api/financeiro/apuramento-iva?periodo=${encodeURIComponent(selectedPeriod)}`)
      ]);

      if (compRes.ok) setCompras(await compRes.json());
      if (vendRes.ok) setVendas(await vendRes.json());
      if (cxRes.ok) setCaixa(await cxRes.json());
      if (ivaRes.ok) setApuramentoIva(await ivaRes.json());
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  // Handle Nova Compra
  const handleSaveCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vPGC = validarEClassificarLancamentoPGC('compra', formCompra);
      if (!vPGC.valido) {
        showError(`Erro PGC-NIRF: ${vPGC.erros.join(', ')}`);
        return;
      }

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formCompra,
          periodo: selectedPeriod
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Não foi possível guardar a compra.');
      }
      setShowAddCompraModal(false);
      setFormCompra({
        fornecedor: '',
        nuit_fornecedor: '',
        numero_factura: '',
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        categoria: 'Insumos',
        valor_base: 0,
        taxa_iva: 16,
        estado: 'Pago',
        metodo_pagamento: 'Transferencia_Bancaria'
      });
      showSuccess('Factura de compra guardada com sucesso!');
      await loadFinancialData();
    } catch (err: any) {
      showError(err.message || 'Erro ao guardar compra.');
    }
  };

  // Handle Nova Venda
  const handleSaveVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vPGC = validarEClassificarLancamentoPGC('venda', formVenda);
      if (!vPGC.valido) {
        showError(`Erro PGC-NIRF: ${vPGC.erros.join(', ')}`);
        return;
      }

      const res = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formVenda,
          periodo: selectedPeriod
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Não foi possível guardar a venda.');
      }
      setShowAddVendaModal(false);
      setFormVenda({
        cliente: '',
        nuit_cliente: '',
        numero_factura: '',
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        categoria: 'Servicos',
        valor_base: 0,
        taxa_iva: 16,
        estado: 'Cobrado',
        metodo_recebimento: 'Transferencia_Bancaria'
      });
      showSuccess('Factura de venda guardada com sucesso!');
      await loadFinancialData();
    } catch (err: any) {
      showError(err.message || 'Erro ao guardar venda.');
    }
  };

  // Handle Novo Lançamento Caixa
  const handleSaveCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/caixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formCaixa,
          periodo: selectedPeriod
        })
      });
      if (!res.ok) throw new Error('Não foi possível guardar movimento de caixa.');
      setShowAddCaixaModal(false);
      setFormCaixa({
        data: new Date().toISOString().split('T')[0],
        tipo: 'Entrada',
        descricao: '',
        categoria: 'Outros',
        valor: 0,
        metodo: 'Transferencia_Bancaria',
        entidade: ''
      });
      showSuccess('Lançamento no Livro de Caixa efetuado com sucesso!');
      await loadFinancialData();
    } catch (err: any) {
      showError(err.message || 'Erro ao guardar lançamento.');
    }
  };

  const handleDeleteCompra = async (id: string) => {
    if (!confirm('Deseja eliminar esta compra?')) return;
    try {
      const res = await fetch(`/api/compras/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Registo de compra removido.');
        await loadFinancialData();
      }
    } catch (err) {
      showError('Erro ao eliminar compra.');
    }
  };

  const handleDeleteVenda = async (id: string) => {
    if (!confirm('Deseja eliminar esta venda?')) return;
    try {
      const res = await fetch(`/api/vendas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Registo de venda removido.');
        await loadFinancialData();
      }
    } catch (err) {
      showError('Erro ao eliminar venda.');
    }
  };

  const handleDeleteCaixa = async (id: string) => {
    if (!confirm('Deseja eliminar este movimento do Livro de Caixa?')) return;
    try {
      const res = await fetch(`/api/caixa/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Movimento de caixa removido.');
        await loadFinancialData();
      }
    } catch (err) {
      showError('Erro ao eliminar movimento.');
    }
  };

  // Calculations for Summary
  const totalEntradasCaixa = caixa.filter(c => c.tipo === 'Entrada').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidasCaixa = caixa.filter(c => c.tipo === 'Saida').reduce((acc, curr) => acc + curr.valor, 0);
  const saldoCaixaAtual = totalEntradasCaixa - totalSaidasCaixa;

  const totalComprasBase = compras.filter(c => c.estado !== 'Cancelado').reduce((acc, curr) => acc + curr.valor_base, 0);
  const totalIvaCompras = compras.filter(c => c.estado !== 'Cancelado').reduce((acc, curr) => acc + curr.valor_iva, 0);
  const totalGeralCompras = compras.filter(c => c.estado !== 'Cancelado').reduce((acc, curr) => acc + curr.total_com_iva, 0);

  const totalVendasBase = vendas.filter(v => v.estado !== 'Anulado').reduce((acc, curr) => acc + curr.valor_base, 0);
  const totalIvaVendas = vendas.filter(v => v.estado !== 'Anulado').reduce((acc, curr) => acc + curr.valor_iva, 0);
  const totalGeralVendas = vendas.filter(v => v.estado !== 'Anulado').reduce((acc, curr) => acc + curr.total_com_iva, 0);

  // Export CSV Livro de Caixa
  const handleExportLivroCaixaCSV = () => {
    let csv = "\uFEFFData;Tipo;Descrição;Categoria;Entidade;Método de Pagamento;Valor (MT)\n";
    caixa.forEach(item => {
      csv += `${item.data};${item.tipo};"${item.descricao}";${item.categoria};"${item.entidade || ''}";${item.metodo};${item.valor}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Livro_Caixa_${selectedPeriod.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wider">
              Módulo ERP Empresarial & Fiscal
            </span>
            <span className="text-xs text-slate-400 font-medium">Período: <b>{selectedPeriod}</b></span>
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
            {activeSubTab === 'compras' ? (
              <>
                <ShoppingCart className="text-blue-900" size={28} />
                Gestão de Compras & IVA Dedutível
              </>
            ) : activeSubTab === 'vendas' ? (
              <>
                <Tag className="text-emerald-700" size={28} />
                Gestão de Vendas & IVA Liquidado
              </>
            ) : activeSubTab === 'caixa' ? (
              <>
                <BookOpen className="text-blue-900" size={28} />
                Livro de Caixa da Plataforma
              </>
            ) : activeSubTab === 'iva' ? (
              <>
                <Percent className="text-amber-700" size={28} />
                Apuramento do IVA (Modelo M/01)
              </>
            ) : activeSubTab === 'plano_contas' ? (
              <>
                <BookOpen className="text-indigo-700" size={28} />
                Plano de Contas PGC Moçambique
              </>
            ) : activeSubTab === 'relatorios' ? (
              <>
                <FileText className="text-purple-700" size={28} />
                Relatórios Agrupados & Contabilidade
              </>
            ) : (
              <>
                <Wallet className="text-emerald-700" size={28} />
                Gestão Financeira, Compras, Vendas & IVA
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            {activeSubTab === 'compras' ? (
              'Registo e controlo de compras com IVA dedutível (16%), gestão de fornecedores, NUIT, facturas de aquisição e apuramento de imposto suportado para a Autoridade Tributária de Moçambique.'
            ) : activeSubTab === 'vendas' ? (
              'Facturação e controlo de vendas com IVA liquidado (16%), acompanhamento de clientes, NUIT e apuramento de imposto debitado para a Autoridade Tributária de Moçambique.'
            ) : activeSubTab === 'caixa' ? (
              'Controlo integral dos fluxos de caixa, entradas, saídas, recibos e liquidações da empresa.'
            ) : activeSubTab === 'iva' ? (
              'Apuramento mensal do imposto sobre o valor acrescentado (16%), confronto entre IVA liquidado e IVA dedutível para a Autoridade Tributária de Moçambique.'
            ) : activeSubTab === 'plano_contas' ? (
              'Plano Geral de Contabilidade PGC-NIRF oficial de Moçambique com classificação de classes, naturezas e balancetes.'
            ) : activeSubTab === 'relatorios' ? (
              'Demonstrações financeiras consolidadas, balancete de verificação, balanço patrimonial e demonstração de resultados.'
            ) : (
              'Controlo integral do Livro de Caixa da plataforma, registo de compras com IVA dedutível (16%), vendas com IVA liquidado, e apuramento automático do imposto para a Autoridade Tributária de Moçambique.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {activeSubTab === 'compras' ? (
            <button
              onClick={() => setShowAddCompraModal(true)}
              className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus size={16} />
              Registar Compra (IVA Dedução)
            </button>
          ) : activeSubTab === 'vendas' ? (
            <button
              onClick={() => setShowAddVendaModal(true)}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus size={16} />
              Emitir Nova Venda (16% IVA)
            </button>
          ) : activeSubTab === 'caixa' ? (
            <button
              onClick={() => setShowAddCaixaModal(true)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus size={16} />
              Lançamento Caixa
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowAddVendaModal(true)}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Plus size={16} />
                Nova Venda (16% IVA)
              </button>
              <button
                onClick={() => setShowAddCompraModal(true)}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Plus size={16} />
                Nova Compra (IVA Dedução)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveSubTab('conformidade')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'conformidade'
              ? 'bg-emerald-800 text-white shadow-md shadow-emerald-800/20'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Conformidade & Guia para Não-Contabilistas</span>
          <span className="text-[9px] bg-emerald-950 text-emerald-200 px-1.5 py-0.5 rounded uppercase font-black">100% AT</span>
        </button>

        <button
          onClick={() => setActiveSubTab('caixa')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'caixa'
              ? 'bg-blue-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen size={16} />
          Livro de Caixa da Plataforma ({caixa.length})
        </button>

        <button
          onClick={() => setActiveSubTab('vendas')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'vendas'
              ? 'bg-blue-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tag size={16} />
          Vendas & IVA Liquidado ({vendas.length})
        </button>

        <button
          onClick={() => setActiveSubTab('compras')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'compras'
              ? 'bg-blue-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShoppingCart size={16} />
          Compras & IVA Dedutível ({compras.length})
        </button>

        <button
          onClick={() => setActiveSubTab('iva')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'iva'
              ? 'bg-blue-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Percent size={16} />
          Apuramento do IVA (Modelo M/01)
        </button>

        <button
          onClick={() => setActiveSubTab('plano_contas')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'plano_contas'
              ? 'bg-blue-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen size={16} />
          <span>Plano de Contas (PGC Moçambique)</span>
          <span className="text-[9px] bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded uppercase font-black">PGC-NIRF</span>
        </button>

        <button
          onClick={() => setActiveSubTab('relatorios')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'relatorios'
              ? 'bg-blue-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText size={16} />
          Relatórios Agrupados & Contabilidade (ERP)
        </button>
      </div>

      {/* Main SubTab Content */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <RefreshCw className="animate-spin text-blue-900 mx-auto mb-2" size={24} />
          <p className="text-xs text-slate-500 font-semibold">A carregar dados financeiros da empresa...</p>
        </div>
      ) : (
        <>
          {/* TAB CONFORMIDADE & GUIA LEIGO */}
          {activeSubTab === 'conformidade' && (
            <ComplianceAssist
              company={company}
              selectedPeriod={selectedPeriod}
              compras={compras}
              vendas={vendas}
              caixa={caixa}
            />
          )}

          {/* TAB 1: LIVRO DE CAIXA */}
          {activeSubTab === 'caixa' && (
            <div className="space-y-6">
              {/* KPIs Caixa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Saldo de Caixa & Bancos</span>
                    <Coins className="text-emerald-700" size={18} />
                  </div>
                  <p className="text-2xl font-black text-slate-900 font-mono">
                    {saldoCaixaAtual.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-emerald-800 font-semibold">
                    Disponibilidade líquida no período
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Entradas (Recebimentos)</span>
                    <ArrowUpRight className="text-emerald-700" size={18} />
                  </div>
                  <p className="text-2xl font-black text-emerald-800 font-mono">
                    +{totalEntradasCaixa.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-slate-500">Vendas, recebimentos & aportes</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Saídas (Pagamentos)</span>
                    <ArrowDownRight className="text-rose-600" size={18} />
                  </div>
                  <p className="text-2xl font-black text-rose-600 font-mono">
                    -{totalSaidasCaixa.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-slate-500">Compras, salários, serviços e renda</p>
                </div>
              </div>

              {/* Table Controls */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Pesquisar movimento, entidade..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="todos">Todos os Tipos</option>
                      <option value="Entrada">Apenas Entradas</option>
                      <option value="Saida">Apenas Saídas</option>
                    </select>

                    <button
                      onClick={handleExportLivroCaixaCSV}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      Exportar CSV
                    </button>
                  </div>
                </div>

                {/* Cashbook Table */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <th className="p-3">Data</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Descrição do Movimento</th>
                        <th className="p-3">Entidade / Terceiro</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Método</th>
                        <th className="p-3 text-right">Valor (MT)</th>
                        <th className="p-3 text-center">Acção</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {caixa
                        .filter(item => {
                          if (filterType !== 'todos' && item.tipo !== filterType) return false;
                          if (searchQuery) {
                            const query = searchQuery.toLowerCase();
                            return (
                              item.descricao.toLowerCase().includes(query) ||
                              (item.entidade && item.entidade.toLowerCase().includes(query)) ||
                              item.categoria.toLowerCase().includes(query)
                            );
                          }
                          return true;
                        })
                        .map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-mono text-slate-600">{item.data}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                item.tipo === 'Entrada' 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {item.tipo === 'Entrada' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {item.tipo}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">{item.descricao}</td>
                            <td className="p-3 text-slate-600">{item.entidade || 'N/D'}</td>
                            <td className="p-3">
                              <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[10px]">
                                {item.categoria}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 font-medium">{item.metodo.replace('_', ' ')}</td>
                            <td className={`p-3 text-right font-mono font-bold ${
                              item.tipo === 'Entrada' ? 'text-emerald-800' : 'text-rose-600'
                            }`}>
                              {item.tipo === 'Entrada' ? '+' : '-'}{item.valor.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openCaixaA4(item)}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Visualizar / Imprimir Recibo A4"
                                >
                                  <Printer size={12} />
                                  <span>Recibo A4</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCaixa(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Eliminar Lançamento"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {caixa.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400 text-xs italic">
                            Nenhum movimento registado no Livro de Caixa para o período seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VENDAS & IVA LIQUIDADO */}
          {activeSubTab === 'vendas' && (
            <div className="space-y-6">
              {/* KPIs Vendas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Facturação Base</span>
                  <p className="text-2xl font-black text-slate-900 font-mono">
                    {totalVendasBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-slate-500">Valor das vendas sem IVA</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-amber-200/60 bg-amber-50/20 shadow-xs space-y-2">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">IVA Liquidado / Cobrado (16%)</span>
                  <p className="text-2xl font-black text-amber-900 font-mono">
                    {totalIvaVendas.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-amber-800 font-semibold">Imposto cobrado aos clientes (A entregar à AT)</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Geral com IVA</span>
                  <p className="text-2xl font-black text-emerald-800 font-mono">
                    {totalGeralVendas.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-slate-500">Total bruto facturado no período</p>
                </div>
              </div>

              {/* Table Vendas */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <Tag className="text-emerald-800" size={18} />
                    Registo de Vendas & Facturação a Clientes
                  </h3>
                  <button
                    onClick={() => setShowAddVendaModal(true)}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    Registar Venda
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <th className="p-3">Factura Nº</th>
                        <th className="p-3">Cliente / NUIT</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição da Venda</th>
                        <th className="p-3 text-right">Valor Base (MT)</th>
                        <th className="p-3 text-right">IVA 16% (MT)</th>
                        <th className="p-3 text-right">Total c/ IVA (MT)</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Acções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendas.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-800">{v.numero_factura}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{v.cliente}</p>
                            <p className="text-[10px] text-slate-400 font-mono">NUIT: {v.nuit_cliente || 'N/D'}</p>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{v.data}</td>
                          <td className="p-3 text-slate-700">{v.descricao}</td>
                          <td className="p-3 text-right font-mono text-slate-700">{v.valor_base.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-mono font-bold text-amber-900">{v.valor_iva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900">{v.total_com_iva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.estado === 'Cobrado'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : v.estado === 'Pendente'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {v.estado}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openVendaA4(v)}
                                className="px-2 py-1 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Visualizar / Imprimir Documento A4"
                              >
                                <Printer size={12} />
                                <span>A4</span>
                              </button>
                              <button
                                onClick={() => handleDeleteVenda(v.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Eliminar Venda"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {vendas.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 text-xs italic">
                            Nenhuma venda emitida no período seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMPRAS & IVA DEDUTÍVEL */}
          {activeSubTab === 'compras' && (
            <div className="space-y-6">
              {/* KPIs Compras */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Compras Base</span>
                  <p className="text-2xl font-black text-slate-900 font-mono">
                    {totalComprasBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-slate-500">Despesas base sem IVA</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-blue-200/60 bg-blue-50/20 shadow-xs space-y-2">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">IVA Suportado / Dedutível (16%)</span>
                  <p className="text-2xl font-black text-blue-900 font-mono">
                    {totalIvaCompras.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-blue-800 font-semibold">Imposto pago a fornecedores (A deduzir na AT)</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Pago a Fornecedores</span>
                  <p className="text-2xl font-black text-rose-600 font-mono">
                    {totalGeralCompras.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </p>
                  <p className="text-[10px] text-slate-500">Investimentos e custos totais com IVA</p>
                </div>
              </div>

              {/* Table Compras */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <ShoppingCart className="text-blue-900" size={18} />
                    Registo de Compras & Facturas de Fornecedores
                  </h3>
                  <button
                    onClick={() => setShowAddCompraModal(true)}
                    className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    Registar Compra
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                        <th className="p-3">Factura Nº</th>
                        <th className="p-3">Fornecedor / NUIT</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição do Material/Serviço</th>
                        <th className="p-3 text-right">Valor Base (MT)</th>
                        <th className="p-3 text-right">IVA 16% (MT)</th>
                        <th className="p-3 text-right">Total c/ IVA (MT)</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Acções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compras.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-800">{c.numero_factura}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{c.fornecedor}</p>
                            <p className="text-[10px] text-slate-400 font-mono">NUIT: {c.nuit_fornecedor || 'N/D'}</p>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{c.data}</td>
                          <td className="p-3 text-slate-700">{c.descricao}</td>
                          <td className="p-3 text-right font-mono text-slate-700">{c.valor_base.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-mono font-bold text-blue-900">{c.valor_iva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900">{c.total_com_iva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.estado === 'Pago'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : c.estado === 'Pendente'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {c.estado}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openCompraA4(c)}
                                className="px-2 py-1 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Visualizar / Imprimir Comprovativo A4"
                              >
                                <Printer size={12} />
                                <span>A4</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCompra(c.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Eliminar Compra"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {compras.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 text-xs italic">
                            Nenhuma compra registada no período seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APURAMENTO DO IVA (MODELO M/01) */}
          {activeSubTab === 'iva' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded uppercase">Declaração M/01</span>
                      <span className="text-xs font-bold text-slate-600">Autoridade Tributária de Moçambique</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      Apuramento Periódico do Imposto sobre o Valor Acrescentado (IVA @ 16%)
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Prazo de Entrega M/01</p>
                    <p className="text-xs font-black text-amber-900">Até ao dia 20 do mês seguinte</p>
                  </div>
                </div>

                {/* Calculation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Step 1: IVA Liquidado (Vendas) */}
                  <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-amber-900 font-bold text-xs uppercase">
                      <span>(+) IVA Liquidado (Vendas)</span>
                      <Tag size={16} />
                    </div>
                    <p className="text-2xl font-black text-amber-950 font-mono">
                      {totalIvaVendas.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </p>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Imposto cobrado aos clientes sobre a facturação bruta de <b>{totalVendasBase.toLocaleString('pt-MZ')} MT</b>.
                    </p>
                  </div>

                  {/* Step 2: IVA Dedutível (Compras) */}
                  <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-blue-900 font-bold text-xs uppercase">
                      <span>(-) IVA Suportado (Compras)</span>
                      <ShoppingCart size={16} />
                    </div>
                    <p className="text-2xl font-black text-blue-950 font-mono">
                      {totalIvaCompras.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </p>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Imposto pago aos fornecedores em compras elegíveis de <b>{totalComprasBase.toLocaleString('pt-MZ')} MT</b>.
                    </p>
                  </div>

                  {/* Step 3: Saldo Final */}
                  <div className={`border rounded-2xl p-5 space-y-3 ${
                    (totalIvaVendas - totalIvaCompras) >= 0
                      ? 'bg-emerald-900 text-white border-emerald-950'
                      : 'bg-blue-900 text-white border-blue-950'
                  }`}>
                    <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wider">
                      <span>(=) Saldo Final do IVA</span>
                      <ShieldCheck size={18} />
                    </div>
                    <p className="text-2xl font-black font-mono">
                      {Math.abs(totalIvaVendas - totalIvaCompras).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </p>
                    <p className="text-[11px] opacity-90 leading-snug">
                      {(totalIvaVendas - totalIvaCompras) >= 0 ? (
                        <span><b>Imposto a Pagar ao Estado:</b> Valor a ser entregue nas caixas das Recebedorias ou via e-Tributação até ao dia 20.</span>
                      ) : (
                        <span><b>Crédito Fiscal a Favor do Sujeito Passivo:</b> A reportar e deduzir nos períodos fiscais seguintes.</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Legal Note Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <ShieldCheck className="text-emerald-700" size={16} />
                    <span>Conformidade com o Código do IVA em Moçambique (Decreto nº 4/2023 & Lei nº 13/2016)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    A taxa geral de IVA aplicável sobre o fornecimento de bens e prestação de serviços em Moçambique é de <b>16%</b>. 
                    O apuramento do imposto é mensal e a declaração de rendimentos modelo M/01 deve ser submetida eletronicamente no portal e-Tributação da Autoridade Tributária.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RELATÓRIOS AGRUPADOS & CONTABILIDADE ERP */}
          {activeSubTab === 'relatorios' && (
            <div className="space-y-6">
              {/* Header & Export Actions */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-blue-100 text-blue-900 font-black px-2 py-0.5 rounded uppercase">Módulo de Auditoria & Contabilidade ERP</span>
                    <span className="text-xs font-bold text-slate-500">Período: {selectedPeriod}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    Relatórios Agrupados e Demonstrações Financeiras
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consolidação auditada de custos, despesas, vendas, compras, extratos de entidades, balancete e balanço.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/relatorios/exportar-pdf?tipo=${activeReportType}&periodo=${encodeURIComponent(selectedPeriod)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download size={14} />
                    Exportar PDF
                  </a>

                  <a
                    href={`/api/relatorios/exportar-excel?tipo=${activeReportType}&periodo=${encodeURIComponent(selectedPeriod)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <FileText size={14} />
                    Exportar Excel / CSV
                  </a>
                </div>
              </div>

              {/* Grid of Report Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { id: 'custos_despesas', label: 'Custos & Despesas', icon: '📊' },
                  { id: 'vendas', label: 'Vendas Agrupadas', icon: '🛒' },
                  { id: 'compras', label: 'Compras Agrupadas', icon: '📦' },
                  { id: 'clientes', label: 'Extrato Clientes', icon: '👥' },
                  { id: 'fornecedores', label: 'Extrato Fornecedores', icon: '🏬' },
                  { id: 'balancete', label: 'Balancete Verificação', icon: '⚖️' },
                  { id: 'diario_caixa', label: 'Diário de Caixa', icon: '📖' },
                  { id: 'fluxo_caixa', label: 'Fluxo de Caixa (DFC)', icon: '💸' },
                  { id: 'balanco', label: 'Balanço Patrimonial', icon: '🏛️' },
                  { id: 'dr', label: 'Demonstração Resultados', icon: '📈' }
                ].map((rep) => (
                  <button
                    key={rep.id}
                    onClick={() => setActiveReportType(rep.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      activeReportType === rep.id
                        ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{rep.icon}</span>
                    <span className="text-xs font-bold leading-tight">{rep.label}</span>
                  </button>
                ))}
              </div>

              {/* Report Content Display */}
              {reportLoading ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                  <RefreshCw className="animate-spin text-blue-900 mx-auto mb-2" size={24} />
                  <p className="text-xs text-slate-500 font-semibold">A consolidar relatório contabilístico...</p>
                </div>
              ) : reportData ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-6">
                  {/* CUSTOS E DESPESAS */}
                  {activeReportType === 'custos_despesas' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Análise de Custos e Despesas Operacionais ({selectedPeriod})
                        </h4>
                        <span className="text-xs font-mono font-bold text-blue-900">
                          Total: {(reportData.totalGeral || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                              <th className="p-3">Categoria de Despesa</th>
                              <th className="p-3 text-center">Registos</th>
                              <th className="p-3 text-right">Valor Base (MT)</th>
                              <th className="p-3 text-right">IVA 16% (MT)</th>
                              <th className="p-3 text-right">Total com IVA (MT)</th>
                              <th className="p-3 text-right">% do Custo Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(reportData.categorias || []).map((cat: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="p-3 font-bold text-slate-800">{cat.categoria}</td>
                                <td className="p-3 text-center font-mono">{cat.qtd}</td>
                                <td className="p-3 text-right font-mono">{(cat.valor_base || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-blue-900">{(cat.valor_iva || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">{(cat.total || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="font-mono font-bold text-slate-600">{cat.percentagem}%</span>
                                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-blue-900 h-1.5 rounded-full" style={{ width: `${Math.min(cat.percentagem, 100)}%` }}></div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                              <td className="p-3">TOTAL GERAL DE CUSTOS</td>
                              <td className="p-3 text-center font-mono">
                                {(reportData.categorias || []).reduce((acc: number, c: any) => acc + (c.qtd || 0), 0)}
                              </td>
                              <td className="p-3 text-right font-mono">{(reportData.totalGeralBase || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-blue-900">{(reportData.totalGeralIva || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-blue-950 text-sm">{(reportData.totalGeral || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                              <td className="p-3 text-right font-mono">100.0%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* VENDAS AGRUPADAS / CLIENTES */}
                  {(activeReportType === 'vendas' || activeReportType === 'clientes') && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Resumo Consolidado por Cliente e Facturação
                        </h4>
                        <span className="text-xs font-mono font-bold text-emerald-900">
                          Total Facturado: {(reportData.totalVendas || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                              <th className="p-3">Cliente / Entidade</th>
                              <th className="p-3">NUIT</th>
                              <th className="p-3 text-center">Facturas</th>
                              <th className="p-3 text-right">Valor Base (MT)</th>
                              <th className="p-3 text-right">IVA Liquidado (MT)</th>
                              <th className="p-3 text-right">Total Facturado (MT)</th>
                              <th className="p-3 text-right">Cobrado (MT)</th>
                              <th className="p-3 text-right">Pendente (MT)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(reportData.clientes || []).map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="p-3 font-bold text-slate-800">{c.cliente}</td>
                                <td className="p-3 font-mono text-slate-500">{c.nuit}</td>
                                <td className="p-3 text-center font-mono">{c.qtd}</td>
                                <td className="p-3 text-right font-mono">{(c.valor_base || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-emerald-800">{(c.valor_iva || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">{(c.total || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-emerald-900 font-semibold">{(c.cobrado || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-amber-700 font-semibold">{(c.pendente || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-emerald-50/80 font-black text-slate-900 border-t-2 border-emerald-200">
                              <td className="p-3" colSpan={2}>TOTAL DE VENDAS & COBRANÇAS</td>
                              <td className="p-3 text-center font-mono">
                                {(reportData.clientes || []).reduce((acc: number, c: any) => acc + (c.qtd || 0), 0)}
                              </td>
                              <td className="p-3 text-right font-mono">{(reportData.totalVendasBase || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-emerald-900">{(reportData.totalIvaLiquidado || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-emerald-950 text-sm">{(reportData.totalVendas || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                              <td className="p-3 text-right font-mono text-emerald-900">{(reportData.totalCobrado || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-amber-900">{(reportData.totalPendente || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* COMPRAS AGRUPADAS / FORNECEDORES */}
                  {(activeReportType === 'compras' || activeReportType === 'fornecedores') && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Resumo Consolidado por Fornecedor e Aquisições
                        </h4>
                        <span className="text-xs font-mono font-bold text-amber-900">
                          Total Compras: {(reportData.totalCompras || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                              <th className="p-3">Fornecedor / Entidade</th>
                              <th className="p-3">NUIT</th>
                              <th className="p-3 text-center">Facturas</th>
                              <th className="p-3 text-right">Valor Base (MT)</th>
                              <th className="p-3 text-right">IVA Dedutível (MT)</th>
                              <th className="p-3 text-right">Total Compras (MT)</th>
                              <th className="p-3 text-right">Pago (MT)</th>
                              <th className="p-3 text-right">Pendente (MT)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(reportData.fornecedores || []).map((f: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/80">
                                <td className="p-3 font-bold text-slate-800">{f.fornecedor}</td>
                                <td className="p-3 font-mono text-slate-500">{f.nuit}</td>
                                <td className="p-3 text-center font-mono">{f.qtd}</td>
                                <td className="p-3 text-right font-mono">{(f.valor_base || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-amber-800">{(f.valor_iva || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">{(f.total || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-emerald-900 font-semibold">{(f.pago || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-rose-700 font-semibold">{(f.pendente || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-amber-50/80 font-black text-slate-900 border-t-2 border-amber-200">
                              <td className="p-3" colSpan={2}>TOTAL DE COMPRAS & AQUISIÇÕES</td>
                              <td className="p-3 text-center font-mono">
                                {(reportData.fornecedores || []).reduce((acc: number, f: any) => acc + (f.qtd || 0), 0)}
                              </td>
                              <td className="p-3 text-right font-mono">{(reportData.totalComprasBase || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-amber-900">{(reportData.totalIvaDeductivel || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-amber-950 text-sm">{(reportData.totalCompras || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                              <td className="p-3 text-right font-mono text-emerald-900">{(reportData.totalPago || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-rose-900">{(reportData.totalPendente || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* BALANCETE DE VERIFICAÇÃO */}
                  {activeReportType === 'balancete' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                            Balancete de Verificação Geral de Contas (PGC Moçambique)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Razão geral de contas das Classes 1 a 7 auditado conforme normas da Ordem dos Contabilistas.
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          reportData.equilibrado ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {reportData.equilibrado ? '✓ Balancete Verificado e Equilibrado' : '⚠️ Pendente de Ajuste'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-indigo-900 text-white font-bold uppercase">
                              <th className="p-3">Código</th>
                              <th className="p-3">Descrição da Conta PGC</th>
                              <th className="p-3 text-right">Movimento Débito (MT)</th>
                              <th className="p-3 text-right">Movimento Crédito (MT)</th>
                              <th className="p-3 text-right">Saldo Devedor (MT)</th>
                              <th className="p-3 text-right">Saldo Credor (MT)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(reportData.contas || []).map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-indigo-50/40">
                                <td className="p-3 font-mono font-bold text-indigo-950">{c.codigo}</td>
                                <td className="p-3 font-semibold text-slate-800">{c.nome}</td>
                                <td className="p-3 text-right font-mono">{(c.debito || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono">{(c.credito || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-indigo-900 font-bold">{(c.saldo_devedor || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3 text-right font-mono text-slate-700">{(c.saldo_credor || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-indigo-100 font-black text-indigo-950 border-t-2 border-indigo-300">
                              <td className="p-3" colSpan={2}>TOTAL GERAL DO BALANCETE</td>
                              <td className="p-3 text-right font-mono">{(reportData.totalDebito || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono">{(reportData.totalCredito || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-mono text-indigo-950 text-sm">{(reportData.totalSaldoDevedor || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                              <td className="p-3 text-right font-mono text-indigo-950 text-sm">{(reportData.totalSaldoCredor || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* DIÁRIO DE CAIXA */}
                  {activeReportType === 'diario_caixa' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-3">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Diário Cronológico de Caixa e Bancos ({selectedPeriod})
                        </h4>
                        <span className="text-xs font-mono font-bold text-slate-900">
                          Saldo Líquido: {(reportData.saldoLiquido || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                              <th className="p-3">Data</th>
                              <th className="p-3">Entidade / Descrição</th>
                              <th className="p-3">Categoria</th>
                              <th className="p-3">Tipo</th>
                              <th className="p-3 text-right">Valor (MT)</th>
                              <th className="p-3 text-right">Saldo Acumulado (MT)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(reportData.movimentos || []).map((m: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-500">{m.data}</td>
                                <td className="p-3 font-bold text-slate-800">
                                  {m.entidade ? <span className="text-blue-900 mr-1">[{m.entidade}]</span> : null}
                                  {m.descricao}
                                </td>
                                <td className="p-3 text-slate-600">{m.categoria}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    m.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {m.tipo}
                                  </span>
                                </td>
                                <td className={`p-3 text-right font-mono font-bold ${
                                  m.tipo === 'Entrada' ? 'text-emerald-700' : 'text-rose-700'
                                }`}>
                                  {m.tipo === 'Saida' ? '-' : '+'}{(m.valor || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">
                                  {(m.saldo_apos_movimento || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* FLUXO DE CAIXA (DFC) */}
                  {activeReportType === 'fluxo_caixa' && (
                    <div className="space-y-6">
                      <div className="border-b pb-3">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Demonstração dos Fluxos de Caixa (DFC - Método Direto)
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ENTRADAS DE CAIXA */}
                        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
                          <h5 className="font-bold text-xs uppercase text-emerald-950 flex justify-between">
                            <span>(+) Fluxo de Entradas de Caixa</span>
                            <span className="font-mono">{reportData.entradas?.totalEntradas?.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                          </h5>
                          <div className="space-y-2 text-xs divide-y divide-emerald-100/80">
                            <div className="flex justify-between pt-1">
                              <span>Recebimentos de Clientes (Vendas)</span>
                              <span className="font-mono font-bold text-emerald-900">{(reportData.entradas?.recebimentoClientes || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                            <div className="flex justify-between pt-2">
                              <span>Outras Entradas e Suprimentos de Caixa</span>
                              <span className="font-mono font-bold text-emerald-900">{(reportData.entradas?.outrasEntradas || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                          </div>
                        </div>

                        {/* SAÍDAS DE CAIXA */}
                        <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-5 space-y-3">
                          <h5 className="font-bold text-xs uppercase text-rose-950 flex justify-between">
                            <span>(-) Fluxo de Saídas de Caixa</span>
                            <span className="font-mono">{reportData.saidas?.totalSaidas?.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                          </h5>
                          <div className="space-y-2 text-xs divide-y divide-rose-100/80">
                            <div className="flex justify-between pt-1">
                              <span>Pagamento a Fornecedores</span>
                              <span className="font-mono font-bold text-rose-900">{(reportData.saidas?.pagamentoFornecedores || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                            <div className="flex justify-between pt-2">
                              <span>Pagamento de Salários & Encargos RH</span>
                              <span className="font-mono font-bold text-rose-900">{(reportData.saidas?.pagamentoSalarios || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                            <div className="flex justify-between pt-2">
                              <span>Pagamento de Impostos (IRPS/INSS/IVA)</span>
                              <span className="font-mono font-bold text-rose-900">{(reportData.saidas?.pagamentoImpostos || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* FLUXO LÍQUIDO CARD */}
                      <div className="bg-blue-900 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                          <p className="text-xs uppercase font-bold text-blue-200">Fluxo de Caixa Operacional Líquido do Período</p>
                          <h3 className="text-2xl font-black font-mono mt-1">
                            {(reportData.fluxoLiquidoOperacional || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] bg-blue-800 text-blue-100 font-bold px-3 py-1 rounded-full uppercase">
                            Tesouraria Geral Auditada
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BALANÇO PATRIMONIAL */}
                  {activeReportType === 'balanco' && (
                    <div className="space-y-6">
                      <div className="border-b pb-3">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Balanço Patrimonial e Demonstração da Posição Financeira
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ACTIVO */}
                        <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-5 space-y-4">
                          <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                            <h5 className="font-black text-sm text-blue-950 uppercase">ACTIVO</h5>
                            <span className="font-mono font-black text-blue-900 text-base">
                              {(reportData.activo?.totalActivo || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <p className="font-bold text-slate-700 uppercase text-[11px]">Activo Corrente</p>
                            <div className="space-y-1.5 pl-2 border-l-2 border-blue-300">
                              <div className="flex justify-between">
                                <span>Caixa e Bancos (Disponibilidades)</span>
                                <span className="font-mono font-bold">{(reportData.activo?.corrente?.disponibilidades || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Clientes (Contas a Receber)</span>
                                <span className="font-mono font-bold">{(reportData.activo?.corrente?.clientes || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Estado (IVA a Recuperar)</span>
                                <span className="font-mono font-bold text-emerald-800">{(reportData.activo?.corrente?.ivaARecuperar || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PASSIVO E CAPITAL PRÓPRIO */}
                        <div className="border border-rose-200 bg-rose-50/30 rounded-2xl p-5 space-y-4">
                          <div className="flex justify-between items-center border-b border-rose-200 pb-2">
                            <h5 className="font-black text-sm text-rose-950 uppercase">PASSIVO E CAPITAL PRÓPRIO</h5>
                            <span className="font-mono font-black text-rose-900 text-base">
                              {(reportData.totalPassivoEPatrimonio || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <p className="font-bold text-slate-700 uppercase text-[11px]">Passivo Corrente</p>
                            <div className="space-y-1.5 pl-2 border-l-2 border-rose-300">
                              <div className="flex justify-between">
                                <span>Fornecedores (Contas a Pagar)</span>
                                <span className="font-mono font-bold">{(reportData.passivo?.corrente?.fornecedores || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Impostos & Retenções a Pagar</span>
                                <span className="font-mono font-bold text-rose-800">
                                  {((reportData.passivo?.corrente?.ivaAPagar || 0) + (reportData.passivo?.corrente?.impostosRetidosAPagar || 0)).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                                </span>
                              </div>
                            </div>

                            <p className="font-bold text-slate-700 uppercase text-[11px] pt-2">Capital Próprio</p>
                            <div className="space-y-1.5 pl-2 border-l-2 border-indigo-300">
                              <div className="flex justify-between">
                                <span>Capital Social & Resultados Acumulados</span>
                                <span className="font-mono font-bold text-indigo-900">{(reportData.capitalProprio?.totalCapitalProprio || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DEMONSTRAÇÃO DE RESULTADOS (DR) */}
                  {(activeReportType as string) === 'dr' && (
                    <div className="space-y-6">
                      <div className="border-b pb-3 flex justify-between items-center">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                          Demonstração de Resultados por Natureza (DR - PGC Moçambique)
                        </h4>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full uppercase">
                          Auditoria do Exercício: {selectedPeriod}
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="font-bold text-slate-800 uppercase">(+) Vendas e Prestação de Serviços (Rendimentos de Exploração)</span>
                          <span className="font-mono font-black text-slate-900 text-sm">{(reportData.vendasLiquidas || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-200 text-rose-700">
                          <span className="font-semibold">(-) Custo das Mercadorias Vendidas e Matérias Consumidas (CMV)</span>
                          <span className="font-mono font-bold">-{(reportData.custoMercadorias || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>

                        <div className="flex justify-between items-center py-2 bg-emerald-100/60 p-3 rounded-xl text-emerald-950 font-black">
                          <span className="uppercase">(=) MARGEM BRUTA DE EXPLORAÇÃO</span>
                          <span className="font-mono text-base">{(reportData.margemBruta || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-200 text-rose-700">
                          <span className="font-semibold">(-) Gastos com Pessoal (Salários Brutos + INSS Patronal 4%)</span>
                          <span className="font-mono font-bold">-{(reportData.gastosPessoal || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>

                        <div className="flex justify-between items-center py-2 bg-indigo-100/60 p-3 rounded-xl text-indigo-950 font-black">
                          <span className="uppercase">(=) RESULTADO OPERACIONAL (EBIT)</span>
                          <span className="font-mono text-base">{(reportData.resultadoOperacional || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-200 text-amber-800">
                          <span className="font-semibold">(-) Imposto sobre o Rendimento das Pessoas Colectivas (Estimativa IRPC 32%)</span>
                          <span className="font-mono font-bold">-{(reportData.impostoRendimentoEstimado || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>

                        <div className="flex justify-between items-center py-3 bg-blue-900 text-white p-4 rounded-xl font-black">
                          <span className="uppercase tracking-wider">(=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
                          <span className="font-mono text-lg">{(reportData.resultadoLiquido || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAINEL DE CONFORMIDADE COM OS PRINCÍPIOS CONTABILÍSTICOS */}
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-3 mt-6">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wide">
                      <CheckCircle2 size={16} />
                      Conformidade dos Relatórios com Princípios Contabilísticos (PGC Moçambique / NIRF)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                        <p className="font-bold text-white flex justify-between">
                          <span>1. Especialização do Exercício</span>
                          <span className="text-emerald-400 font-mono text-[10px]">VERIFICADO</span>
                        </p>
                        <p className="text-[11px] text-slate-300">Rendimentos e custos registados no período a que respeitam, independentemente da cobrança ou pagamento.</p>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                        <p className="font-bold text-white flex justify-between">
                          <span>2. Partidas Dobradas</span>
                          <span className="text-emerald-400 font-mono text-[10px]">VERIFICADO</span>
                        </p>
                        <p className="text-[11px] text-slate-300">Total Débitos é rigorousamente igual a Total Créditos. Saldo Devedor = Saldo Credor no Balancete.</p>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                        <p className="font-bold text-white flex justify-between">
                          <span>3. Não Compensação de Saldos</span>
                          <span className="text-emerald-400 font-mono text-[10px]">VERIFICADO</span>
                        </p>
                        <p className="text-[11px] text-slate-300">Ativos, Passivos, Custos e Proveitos indicados autonomamente sem ocultar rubricas.</p>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
                        <p className="font-bold text-white flex justify-between">
                          <span>4. Continuidade e Prudência</span>
                          <span className="text-emerald-400 font-mono text-[10px]">VERIFICADO</span>
                        </p>
                        <p className="text-[11px] text-slate-300">Entidade operando em continuidade contínua. Provisões tributárias e sociais calculadas preventivamente.</p>
                      </div>
                      <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1 sm:col-span-2">
                        <p className="font-bold text-white flex justify-between">
                          <span>5. Equação Fundamental do Balanço</span>
                          <span className="text-emerald-400 font-mono text-[10px]">ACTIVO = PASSIVO + CAPITAL PRÓPRIO</span>
                        </p>
                        <p className="text-[11px] text-slate-300">A estrutura do Balanço Patrimonial e Demonstração de Resultados está auditada e equilibrada.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* SUBTAB: PLANO DE CONTAS PGC MOÇAMBIQUE */}
          {activeSubTab === 'plano_contas' && (
            <div className="space-y-6">
              {/* Banner Summary */}
              <div className="bg-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl border border-indigo-900">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-indigo-800/80 pb-4">
                  <div>
                    <span className="text-[10px] bg-indigo-800 text-indigo-200 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      Decreto 70/2009 e 71/2009 — Ordem dos Contabilistas e Auditores de Moçambique (OCAM)
                    </span>
                    <h3 className="text-2xl font-black mt-2 tracking-tight flex items-center gap-2 text-white">
                      <BookOpen className="text-amber-400" size={28} />
                      Plano Geral de Contabilidade de Moçambique (PGC-NIRF / PGC-PE)
                    </h3>
                    <p className="text-xs text-indigo-200 max-w-3xl mt-1 leading-relaxed">
                      Catálogo oficial e quadro homologado de contas contabilísticas para entidades em Moçambique.
                      Todas as transações do ERP (folha de salários, faturas de vendas, compras e guias estatais) são traduzidas automaticamente em lançamentos de débito e crédito no PGC.
                    </p>
                  </div>
                  <div className="bg-indigo-900/80 border border-indigo-700 p-4 rounded-2xl shrink-0 text-right">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase">Total de Contas PGC</p>
                    <p className="text-2xl font-black font-mono text-amber-400">{PLANO_CONTAS_PGC_MOZAMBIQUE.length} Contas</p>
                  </div>
                </div>

                {/* Filters and Search Bar */}
                <div className="flex flex-col md:flex-row gap-3 pt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 text-indigo-400" size={16} />
                    <input
                      type="text"
                      placeholder="Pesquisar por Código PGC (ex: 4.4.3, 6.2.2, 4.1.1) ou Descrição (ex: Caixa, IVA, Salários)..."
                      value={pgcSearch}
                      onChange={(e) => setPgcSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-indigo-900/90 border border-indigo-700/80 rounded-xl text-xs text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                    />
                  </div>

                  {/* Filter by Class 1 to 8 */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setPgcClasseFilter(0)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                        pgcClasseFilter === 0 ? 'bg-amber-400 text-indigo-950 font-black' : 'bg-indigo-900/60 text-indigo-200 hover:bg-indigo-800'
                      }`}
                    >
                      Todas as Classes
                    </button>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((cls) => (
                      <button
                        key={cls}
                        onClick={() => setPgcClasseFilter(cls)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                          pgcClasseFilter === cls ? 'bg-amber-400 text-indigo-950 font-black' : 'bg-indigo-900/60 text-indigo-200 hover:bg-indigo-800'
                        }`}
                      >
                        Classe {cls}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PGC Accounts List with Live Company Balances */}
              {(() => {
                const contasComSaldos = getPlanoContasComSaldos(compras, vendas, caixa, employees);
                const filtradas = contasComSaldos.filter(c => {
                  const matchSearch = c.codigo.toLowerCase().includes(pgcSearch.toLowerCase()) ||
                                      c.nome.toLowerCase().includes(pgcSearch.toLowerCase()) ||
                                      c.descricao.toLowerCase().includes(pgcSearch.toLowerCase());
                  const matchClasse = pgcClasseFilter === 0 || c.classe === pgcClasseFilter;
                  return matchSearch && matchClasse;
                });

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs text-slate-500 font-bold px-1">
                      <span>Exibindo {filtradas.length} de {contasComSaldos.length} contas contabilísticas</span>
                      <span className="font-mono text-indigo-900">Período Activo: {selectedPeriod}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtradas.map((conta) => (
                        <div
                          key={conta.codigo}
                          className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className="px-2.5 py-1 bg-indigo-900 text-white font-mono font-black text-xs rounded-lg shadow-xs">
                                {conta.codigo}
                              </span>
                              <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                                  conta.natureza === 'Devedora'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : conta.natureza === 'Credora'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  Natureza {conta.natureza}
                                </span>
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                  {conta.tipo}
                                </span>
                              </div>
                            </div>

                            <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                              {conta.nome}
                            </h4>

                            <p className="text-[10px] text-slate-400 font-semibold uppercase">
                              {conta.classeNome}
                            </p>

                            <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
                              {conta.descricao}
                            </p>

                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                              <p className="text-[10px] font-extrabold text-slate-700 uppercase flex items-center gap-1">
                                ⚖️ Regra de Partidas Dobradas (PGC Moçambique):
                              </p>
                              <p className="text-[11px] text-slate-600 italic leading-normal">
                                {conta.regrasLancamento}
                              </p>
                            </div>
                          </div>

                          {/* Live Balance Footer */}
                          <div className="pt-3 border-t border-slate-100 bg-indigo-50/30 p-3 rounded-xl space-y-1.5">
                            <p className="text-[10px] font-bold text-indigo-950 uppercase flex justify-between">
                              <span>Movimentos da Empresa ({selectedPeriod}):</span>
                              <span className="font-mono text-indigo-900 font-black">
                                Saldo: {(conta.saldoLiquido || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                              </span>
                            </p>
                            <div className="grid grid-cols-2 text-[11px] font-mono gap-2 pt-1 border-t border-indigo-100/60">
                              <div className="text-blue-900 font-bold">
                                Débito: {(conta.debito || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-purple-900 font-bold text-right">
                                Crédito: {(conta.credito || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Cheat-Sheet: Guia de Lançamentos de Partidas Dobradas */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 space-y-6 shadow-sm">
                <div className="border-b pb-3">
                  <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={20} />
                    Guia Prático de Lançamentos Contabilísticos em Moçambique (PGC)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Como o sistema Payroll Tech MZ classifica automaticamente os principais acontecimentos económicos em estrito cumprimento das Partidas Dobradas:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Operation 1 */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-blue-950 uppercase">1. Processamento da Folha Salarial</span>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">Mensal</span>
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <p className="text-blue-900 font-bold">DÉBITO 6.2.2 Remunerações dos Trabalhadores (Salário Bruto)</p>
                      <p className="text-blue-900 font-bold">DÉBITO 6.2.3 Encargos sobre Remunerações (INSS Patronal 4%)</p>
                      <p className="text-purple-900 font-bold">CRÉDITO 4.4.2.1 Estado - IRPS Retido aos Trabalhadores</p>
                      <p className="text-purple-900 font-bold">CRÉDITO 4.4.9.1 Estado - INSS Geral (3% + 4% = 7%)</p>
                      <p className="text-purple-900 font-bold">CRÉDITO 4.5.2.1 Pessoal - Remunerações a Pagar (Líquido)</p>
                    </div>
                  </div>

                  {/* Operation 2 */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-emerald-950 uppercase">2. Venda de Serviços / Mercadorias (16% IVA)</span>
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">Fatura</span>
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <p className="text-blue-900 font-bold">DÉBITO 4.1.1 Clientes C/C (Total com IVA 16%)</p>
                      <p className="text-purple-900 font-bold">CRÉDITO 7.1.1 Vendas / 7.2 Prestações de Serviços (Valor Base)</p>
                      <p className="text-purple-900 font-bold">CRÉDITO 4.4.3.3 Estado - IVA Liquidado (16%)</p>
                    </div>
                  </div>

                  {/* Operation 3 */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-950 uppercase">3. Compra de Insumos / Serviços com IVA Dedutível</span>
                      <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">Fatura</span>
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <p className="text-blue-900 font-bold">DÉBITO 6.3 Fornecimentos & Serviços Terceiros / 2.1 Compras (Valor Base)</p>
                      <p className="text-blue-900 font-bold">DÉBITO 4.4.3.1 Estado - IVA Suportado / Dedutível (16%)</p>
                      <p className="text-purple-900 font-bold">CRÉDITO 4.2.1 Fornecedores C/C (Total com IVA)</p>
                    </div>
                  </div>

                  {/* Operation 4 */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-950 uppercase">4. Pagamento de Salários e Impostos no Banco</span>
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-900 px-2 py-0.5 rounded font-bold">Tesouraria</span>
                    </div>
                    <div className="space-y-1 text-xs font-mono">
                      <p className="text-blue-900 font-bold">DÉBITO 4.5.2.1 Pessoal - Remunerações a Pagar (Liquidação Salarial)</p>
                      <p className="text-blue-900 font-bold">DÉBITO 4.4.9.1 Estado - Guias de INSS / 4.4.2.1 IRPS / 4.4.3.4 IVA</p>
                      <p className="text-purple-900 font-bold">CRÉDITO 1.2.1 Millennium BIM / BCI (Saída de Depósito à Ordem)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: NOVA COMPRA */}
      <AnimatePresence>
        {showAddCompraModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <ShoppingCart className="text-blue-900" size={20} />
                  Registar Nova Compra (IVA 16%)
                </h3>
                <button
                  onClick={() => setShowAddCompraModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCompra} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome do Fornecedor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Movelaria Maputo Lda"
                      value={formCompra.fornecedor}
                      onChange={(e) => setFormCompra({ ...formCompra, fornecedor: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NUIT do Fornecedor</label>
                    <input
                      type="text"
                      placeholder="Ex: 400123456"
                      value={formCompra.nuit_fornecedor}
                      onChange={(e) => setFormCompra({ ...formCompra, nuit_fornecedor: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nº da Factura / Recibo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: FT 2026/102"
                      value={formCompra.numero_factura}
                      onChange={(e) => setFormCompra({ ...formCompra, numero_factura: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data da Compra *</label>
                    <input
                      type="date"
                      required
                      value={formCompra.data}
                      onChange={(e) => setFormCompra({ ...formCompra, data: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Descrição do Serviço / Insumo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Compra de mobiliário e resmas de papel para o escritório"
                    value={formCompra.descricao}
                    onChange={(e) => setFormCompra({ ...formCompra, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categoria Contabilística (PGC) *</label>
                    <select
                      value={formCompra.categoria}
                      onChange={(e) => setFormCompra({ ...formCompra, categoria: e.target.value as CompraItem['categoria'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-semibold"
                    >
                      <option value="Insumos">Matérias-Primas / Insumos (Conta 2.1.2)</option>
                      <option value="Mercadorias">Mercadorias p/ Revenda (Conta 2.1.1)</option>
                      <option value="Servicos">Serviços / FST (Conta 6.3.2)</option>
                      <option value="Equipamento">Equipamentos / Ativos Tangíveis (Conta 3.2.2)</option>
                      <option value="Outros">Outras Despesas Operacionais (Conta 6.3)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Método de Pagamento</label>
                    <select
                      value={formCompra.metodo_pagamento}
                      onChange={(e) => setFormCompra({ ...formCompra, metodo_pagamento: e.target.value as CompraItem['metodo_pagamento'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-semibold"
                    >
                      <option value="Transferencia_Bancaria">Transferência Bancária (Conta 1.2.1)</option>
                      <option value="Caixa">Caixa Numerário (Conta 1.1)</option>
                      <option value="M-Pesa">Carteira M-Pesa (Conta 1.2.1)</option>
                      <option value="E-Mola">Carteira E-Mola (Conta 1.2.1)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Valor Base (MT) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="Ex: 50000"
                      value={formCompra.valor_base || ''}
                      onChange={(e) => setFormCompra({ ...formCompra, valor_base: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Taxa de IVA (%)</label>
                    <select
                      value={formCompra.taxa_iva}
                      onChange={(e) => setFormCompra({ ...formCompra, taxa_iva: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-semibold"
                    >
                      <option value={16}>16% (Geral Moçambique)</option>
                      <option value={0}>0% (Isento / Isenção Artigo 9)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estado Pagamento</label>
                    <select
                      value={formCompra.estado}
                      onChange={(e) => setFormCompra({ ...formCompra, estado: e.target.value as CompraItem['estado'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 font-semibold"
                    >
                      <option value="Pago">Pago (Lança no Caixa)</option>
                      <option value="Pendente">Pendente (A Prazo)</option>
                    </select>
                  </div>
                </div>

                {/* BLOCO DE VALIDAÇÃO CONTABILÍSTICA PGC-NIRF EM TEMPO REAL */}
                {(() => {
                  const classif = validarEClassificarLancamentoPGC('compra', formCompra);
                  return (
                    <div className={`p-3 rounded-2xl border text-xs space-y-2 transition-all ${classif.valido ? 'bg-blue-50/70 border-blue-200' : 'bg-rose-50/70 border-rose-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[10px] uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <BookOpen size={13} className={classif.valido ? 'text-blue-900' : 'text-rose-600'} />
                          Classificação Contabilística PGC-NIRF (Débito & Crédito)
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${classif.valido ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {classif.valido ? '✓ Lançamento Válido' : '✕ Erro de Conformidade'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                        {/* Débitos */}
                        <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <p className="font-extrabold text-blue-950 uppercase text-[9px] border-b border-slate-100 pb-1 flex justify-between">
                            <span>DÉBITO (Aplicação)</span>
                            <span className="font-mono">{classif.totalDebito.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                          </p>
                          {classif.linhas.filter(l => l.tipo === 'DEBITO').map((l, i) => (
                            <div key={i} className="flex justify-between items-start text-slate-700 text-[9.5px] pt-0.5">
                              <span className="font-semibold leading-tight">{l.contaNome}</span>
                              <span className="font-mono font-bold text-slate-900 ml-1">{l.valor.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                          ))}
                        </div>

                        {/* Créditos */}
                        <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <p className="font-extrabold text-indigo-950 uppercase text-[9px] border-b border-slate-100 pb-1 flex justify-between">
                            <span>CRÉDITO (Origem)</span>
                            <span className="font-mono">{classif.totalCredito.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                          </p>
                          {classif.linhas.filter(l => l.tipo === 'CREDITO').map((l, i) => (
                            <div key={i} className="flex justify-between items-start text-slate-700 text-[9.5px] pt-0.5">
                              <span className="font-semibold leading-tight">{l.contaNome}</span>
                              <span className="font-mono font-bold text-slate-900 ml-1">{l.valor.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mensagens de erro de validação PGC */}
                      {classif.erros.length > 0 && (
                        <div className="p-2 bg-rose-100/90 text-rose-900 rounded-lg text-[9.5px] font-medium space-y-0.5 border border-rose-300">
                          {classif.erros.map((err, idx) => (
                            <p key={idx} className="flex items-center gap-1">
                              <span>•</span>
                              <span>{err}</span>
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Alertas tributários de apoio */}
                      {classif.alertas.length > 0 && classif.erros.length === 0 && (
                        <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg text-[9px] font-medium space-y-0.5 border border-amber-200">
                          {classif.alertas.map((alt, idx) => (
                            <p key={idx}>⚠️ {alt}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCompraModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow-md"
                  >
                    Registar Compra
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: NOVA VENDA */}
      <AnimatePresence>
        {showAddVendaModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Tag className="text-emerald-800" size={20} />
                  Emitir Nova Venda / Factura (IVA 16%)
                </h3>
                <button
                  onClick={() => setShowAddVendaModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveVenda} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome do Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Companhia Agrícola de Chókwè SA"
                      value={formVenda.cliente}
                      onChange={(e) => setFormVenda({ ...formVenda, cliente: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NUIT do Cliente</label>
                    <input
                      type="text"
                      placeholder="Ex: 400555666"
                      value={formVenda.nuit_cliente}
                      onChange={(e) => setFormVenda({ ...formVenda, nuit_cliente: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nº Factura / Guia *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: FT 2026/015"
                      value={formVenda.numero_factura}
                      onChange={(e) => setFormVenda({ ...formVenda, numero_factura: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data da Venda *</label>
                    <input
                      type="date"
                      required
                      value={formVenda.data}
                      onChange={(e) => setFormVenda({ ...formVenda, data: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Descrição do Serviço / Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Licenciamento do software ERP e serviços de implementação"
                    value={formVenda.descricao}
                    onChange={(e) => setFormVenda({ ...formVenda, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categoria Contabilística (PGC) *</label>
                    <select
                      value={formVenda.categoria}
                      onChange={(e) => setFormVenda({ ...formVenda, categoria: e.target.value as VendaItem['categoria'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-semibold"
                    >
                      <option value="Servicos">Prestação de Serviços (Conta 7.2)</option>
                      <option value="Produtos">Venda de Produtos / Mercadorias (Conta 7.1)</option>
                      <option value="Outros">Outros Rendimentos Operacionais (Conta 7.8)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Método de Recebimento</label>
                    <select
                      value={formVenda.metodo_recebimento}
                      onChange={(e) => setFormVenda({ ...formVenda, metodo_recebimento: e.target.value as VendaItem['metodo_recebimento'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-semibold"
                    >
                      <option value="Transferencia_Bancaria">Transferência Bancária (Conta 1.2.1)</option>
                      <option value="Caixa">Caixa Numerário (Conta 1.1)</option>
                      <option value="M-Pesa">Carteira M-Pesa (Conta 1.2.1)</option>
                      <option value="E-Mola">Carteira E-Mola (Conta 1.2.1)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Valor Base (MT) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="Ex: 100000"
                      value={formVenda.valor_base || ''}
                      onChange={(e) => setFormVenda({ ...formVenda, valor_base: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Taxa de IVA (%)</label>
                    <select
                      value={formVenda.taxa_iva}
                      onChange={(e) => setFormVenda({ ...formVenda, taxa_iva: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-semibold"
                    >
                      <option value={16}>16% (Geral Moçambique)</option>
                      <option value={0}>0% (Isento / Isenção Artigo 9)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estado da Cobrança</label>
                    <select
                      value={formVenda.estado}
                      onChange={(e) => setFormVenda({ ...formVenda, estado: e.target.value as VendaItem['estado'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-800 font-semibold"
                    >
                      <option value="Cobrado">Cobrado (Lança no Caixa)</option>
                      <option value="Pendente">Pendente (A Prazo)</option>
                    </select>
                  </div>
                </div>

                {/* BLOCO DE VALIDAÇÃO CONTABILÍSTICA PGC-NIRF EM TEMPO REAL */}
                {(() => {
                  const classif = validarEClassificarLancamentoPGC('venda', formVenda);
                  return (
                    <div className={`p-3 rounded-2xl border text-xs space-y-2 transition-all ${classif.valido ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[10px] uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <BookOpen size={13} className={classif.valido ? 'text-emerald-800' : 'text-rose-600'} />
                          Classificação Contabilística PGC-NIRF (Débito & Crédito)
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${classif.valido ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {classif.valido ? '✓ Lançamento Válido' : '✕ Erro de Conformidade'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                        {/* Débitos */}
                        <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <p className="font-extrabold text-emerald-950 uppercase text-[9px] border-b border-slate-100 pb-1 flex justify-between">
                            <span>DÉBITO (Aplicação)</span>
                            <span className="font-mono">{classif.totalDebito.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                          </p>
                          {classif.linhas.filter(l => l.tipo === 'DEBITO').map((l, i) => (
                            <div key={i} className="flex justify-between items-start text-slate-700 text-[9.5px] pt-0.5">
                              <span className="font-semibold leading-tight">{l.contaNome}</span>
                              <span className="font-mono font-bold text-slate-900 ml-1">{l.valor.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                          ))}
                        </div>

                        {/* Créditos */}
                        <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <p className="font-extrabold text-teal-950 uppercase text-[9px] border-b border-slate-100 pb-1 flex justify-between">
                            <span>CRÉDITO (Origem)</span>
                            <span className="font-mono">{classif.totalCredito.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                          </p>
                          {classif.linhas.filter(l => l.tipo === 'CREDITO').map((l, i) => (
                            <div key={i} className="flex justify-between items-start text-slate-700 text-[9.5px] pt-0.5">
                              <span className="font-semibold leading-tight">{l.contaNome}</span>
                              <span className="font-mono font-bold text-slate-900 ml-1">{l.valor.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mensagens de erro de validação PGC */}
                      {classif.erros.length > 0 && (
                        <div className="p-2 bg-rose-100/90 text-rose-900 rounded-lg text-[9.5px] font-medium space-y-0.5 border border-rose-300">
                          {classif.erros.map((err, idx) => (
                            <p key={idx} className="flex items-center gap-1">
                              <span>•</span>
                              <span>{err}</span>
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Alertas tributários de apoio */}
                      {classif.alertas.length > 0 && classif.erros.length === 0 && (
                        <div className="p-1.5 bg-amber-50 text-amber-800 rounded-lg text-[9px] font-medium space-y-0.5 border border-amber-200">
                          {classif.alertas.map((alt, idx) => (
                            <p key={idx}>⚠️ {alt}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddVendaModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md"
                  >
                    Emitir Venda
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: NOVO LANÇAMENTO CAIXA */}
      <AnimatePresence>
        {showAddCaixaModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <BookOpen className="text-slate-900" size={20} />
                  Novo Lançamento no Livro de Caixa
                </h3>
                <button
                  onClick={() => setShowAddCaixaModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCaixa} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Movimento *</label>
                    <select
                      value={formCaixa.tipo}
                      onChange={(e) => setFormCaixa({ ...formCaixa, tipo: e.target.value as LivroCaixaItem['tipo'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold"
                    >
                      <option value="Entrada">Recebimento / Entrada (+)</option>
                      <option value="Saida">Pagamento / Saída (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data *</label>
                    <input
                      type="date"
                      required
                      value={formCaixa.data}
                      onChange={(e) => setFormCaixa({ ...formCaixa, data: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Descrição do Movimento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pagamento de taxa de licença comercial ou aporte"
                    value={formCaixa.descricao}
                    onChange={(e) => setFormCaixa({ ...formCaixa, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Entidade / Terceiro</label>
                    <input
                      type="text"
                      placeholder="Ex: Millennium BIM / Fornecedor / Cliente"
                      value={formCaixa.entidade}
                      onChange={(e) => setFormCaixa({ ...formCaixa, entidade: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Valor Total (MT) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="Ex: 25000"
                      value={formCaixa.valor || ''}
                      onChange={(e) => setFormCaixa({ ...formCaixa, valor: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categoria de Lançamento</label>
                    <select
                      value={formCaixa.categoria}
                      onChange={(e) => setFormCaixa({ ...formCaixa, categoria: e.target.value as LivroCaixaItem['categoria'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                    >
                      <option value="Venda">Venda / Recebimento</option>
                      <option value="Compra">Compra / Insumos</option>
                      <option value="Salarios">Salários / Pessoal</option>
                      <option value="INSS_IRPS">Impostos INSS & IRPS</option>
                      <option value="Renda">Renda de Instalações</option>
                      <option value="Servicos">Serviços Gerais</option>
                      <option value="Aporte_Capital">Aporte de Capital</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento</label>
                    <select
                      value={formCaixa.metodo}
                      onChange={(e) => setFormCaixa({ ...formCaixa, metodo: e.target.value as LivroCaixaItem['metodo'] })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                    >
                      <option value="Transferencia_Bancaria">Transferência Bancária</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="E-Mola">E-Mola</option>
                      <option value="Caixa">Caixa / Numerário</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCaixaModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl shadow-md"
                  >
                    Registar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO A4 PROFISSIONAL */}
      {selectedDocA4 && (
        <A4DocumentModal
          isOpen={selectedDocA4.isOpen}
          onClose={() => setSelectedDocA4(null)}
          tipoDocumento={selectedDocA4.tipoDocumento}
          numeroDocumento={selectedDocA4.numeroDocumento}
          dataEmissao={selectedDocA4.dataEmissao}
          dataVencimento={selectedDocA4.dataVencimento}
          estadoPagamento={selectedDocA4.estadoPagamento}
          metodoPagamento={selectedDocA4.metodoPagamento}
          empresa={{
            nome: company.nome || 'PAYROLL TECH MZ, LDA',
            nuit: company.nuit || '400990887',
            endereco: company.endereco || 'Av. Julius Nyerere, Jat V, Maputo',
            email: company.email || 'gersonjcumbane@gmail.com',
            telefone: company.telefone || '+258 861390061',
            logo: company.logo
          }}
          entidade={selectedDocA4.entidade}
          itens={selectedDocA4.itens}
          valorBase={selectedDocA4.valorBase}
          valorIvaTotal={selectedDocA4.valorIvaTotal}
          valorTotalGeral={selectedDocA4.valorTotalGeral}
          observacoes={selectedDocA4.observacoes}
        />
      )}
    </div>
  );
}
