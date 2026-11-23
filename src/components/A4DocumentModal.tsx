import React from 'react';
import { Printer, X, ShieldCheck, QrCode, Building2, Download } from 'lucide-react';
import {
  DEFAULT_BANK_ACCOUNTS,
  DEFAULT_MOBILE_WALLETS,
  numeroParaExtenso,
  BankAccountDetails,
  computeDocumentHashCode,
  CLICKPAY_COMPUTER_NOTE
} from '../utils/documentUtils';
import { downloadBlobAsFile, generateA4CommercialDocPdfBlob } from '../lib/clientPdf';

export interface DocumentItem {
  codigo?: string;
  descricao: string;
  quantidade: number;
  unidade?: string;
  precoUnitario: number;
  taxaIva: number; // e.g. 16 or 0
  descontoPercentual?: number;
  subtotal: number;
  valorIva: number;
  totalComIva: number;
}

export interface A4DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipoDocumento: 'fatura' | 'factura_recibo' | 'recibo' | 'proforma' | 'compra' | 'caixa';
  numeroDocumento: string;
  dataEmissao: string;
  dataVencimento?: string;
  estadoPagamento?: 'Cobrado' | 'Pago' | 'Pendente' | 'Cancelado';
  metodoPagamento?: string;

  // Dados do Emitente (Empresa)
  empresa: {
    nome: string;
    nuit: string;
    nuel?: string;
    endereco?: string;
    cidade?: string;
    provincia?: string;
    email?: string;
    telefone?: string;
    logo?: string;
    regimeIva?: string;
    contasBancarias?: BankAccountDetails[];
  };

  // Dados do Destinatário (Cliente ou Fornecedor)
  entidade: {
    nome: string;
    nuit: string;
    endereco?: string;
    email?: string;
    telefone?: string;
    tipo?: 'Cliente' | 'Fornecedor' | 'Outro';
  };

  // Linhas do Documento
  itens: DocumentItem[];

  // Totais
  valorBase: number;
  valorIvaTotal: number;
  valorTotalGeral: number;
  observacoes?: string;
}

export default function A4DocumentModal({
  isOpen,
  onClose,
  tipoDocumento,
  numeroDocumento,
  dataEmissao,
  dataVencimento,
  estadoPagamento = 'Pago',
  metodoPagamento = 'Transferência Bancária / M-Pesa',
  empresa,
  entidade,
  itens,
  valorBase,
  valorIvaTotal,
  valorTotalGeral,
  observacoes
}: A4DocumentModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const contas =
    empresa.contasBancarias && empresa.contasBancarias.length > 0
      ? empresa.contasBancarias
      : DEFAULT_BANK_ACCOUNTS;

  const getTituloDocumento = () => {
    switch (tipoDocumento) {
      case 'fatura':
        return 'FACTURA';
      case 'factura_recibo':
        return 'FACTURA-RECIBO';
      case 'recibo':
        return 'RECIBO DE LIQUIDAÇÃO';
      case 'proforma':
        return 'FACTURA PROFORMA';
      case 'compra':
        return 'FACTURA DE COMPRA / V/FACTURA';
      case 'caixa':
        return 'RECIBO DE CAIXA';
      default:
        return 'DOCUMENTO COMERCIAL';
    }
  };

  const isRecibo =
    tipoDocumento === 'recibo' ||
    tipoDocumento === 'caixa' ||
    tipoDocumento === 'factura_recibo';

  const isLiquidado =
    estadoPagamento === 'Cobrado' || estadoPagamento === 'Pago' || tipoDocumento === 'recibo' || tipoDocumento === 'caixa';

  const totalDescontos = itens.reduce((acc, item) => {
    const bruto = item.quantidade * item.precoUnitario;
    const desc = bruto * ((item.descontoPercentual || 0) / 100);
    return acc + desc;
  }, 0);

  const hashControlo = computeDocumentHashCode(numeroDocumento, valorTotalGeral, empresa.nuit);
  const effectiveIvaRate = valorBase > 0 && valorIvaTotal > 0 ? Math.round((valorIvaTotal / valorBase) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-lg max-w-[210mm] w-full shadow-2xl border border-slate-300 overflow-hidden my-4 sm:my-6 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Barra Superior de Acções (Oculta na Impressão) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 print:hidden no-print">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-xs font-bold tracking-wide text-white uppercase">
                Formato Oficial A4 · ClickPay ERP Enterprise
              </h3>
              <p className="text-[11px] text-slate-300">
                {getTituloDocumento()} n.º {numeroDocumento} · Processado por computador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const blob = generateA4CommercialDocPdfBlob({
                  titulo: getTituloDocumento(),
                  numeroDocumento,
                  dataEmissao,
                  dataVencimento,
                  empresa,
                  entidade,
                  itens: itens.map((it) => ({
                    codigo: it.codigo,
                    descricao: it.descricao,
                    quantidade: it.quantidade,
                    precoUnitario: it.precoUnitario,
                    taxaIva: it.taxaIva,
                    total: it.totalComIva
                  })),
                  valorBase,
                  valorIvaTotal,
                  valorTotalGeral,
                  observacoes
                });
                downloadBlobAsFile(blob, `${numeroDocumento.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-md text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download size={15} />
              <span>Descarregar PDF (A4)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-md text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer size={15} />
              <span>Imprimir (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X size={15} />
              <span>Fechar</span>
            </button>
          </div>
        </div>

        {/* Folha A4 Oficial (210mm x 297mm) ClickPay ERP Enterprise */}
        <div
          data-a4-print-sheet="true"
          className="w-full max-w-[210mm] min-h-[297mm] mx-auto px-7 py-7 sm:px-10 sm:py-9 text-slate-900 bg-white flex flex-col justify-between gap-5 font-sans print:px-2 print:py-2"
        >
          {/* BLOCO PRINCIPAL SUPERIOR + TABELA */}
          <div className="space-y-5">
            {/* 1. CABEÇALHO CLICKPAY ERP ENTERPRISE */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-4">
              {/* Lado Esquerdo: Emitente */}
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center gap-3">
                  {empresa.logo && empresa.logo.startsWith('data:image/') ? (
                    <img
                      src={empresa.logo}
                      alt={empresa.nome}
                      className="h-12 w-auto object-contain max-w-[150px]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <img
                      src="/clickpay-logo.png"
                      alt={empresa.nome || 'ClickPay'}
                      className="h-12 w-auto object-contain max-w-[150px]"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight leading-tight">
                      {empresa.nome || 'CLICKPAY MOÇAMBIQUE, LDA'}
                    </h1>
                    <p className="text-[10px] font-medium text-slate-600">
                      {empresa.regimeIva || 'Regime Normal de IVA (16%) · Contabilidade PGC-NIRF'}
                    </p>
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-700 space-y-0.5 leading-snug">
                  <p>
                    {empresa.endereco || 'Av. Julius Nyerere, Edifício Jat V'}, {empresa.cidade || 'Maputo Cidade'}, Moçambique
                  </p>
                  <p className="font-mono tabular-nums">
                    <span className="font-semibold text-slate-900">NUIT:</span> {empresa.nuit || '402302399'}
                    {' · '}
                    <span className="font-semibold text-slate-900">NUEL:</span> {empresa.nuel || '105086659'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Tel:</span> {empresa.telefone || '+258 86 139 0061'}
                    {' · '}
                    <span className="font-semibold text-slate-900">E-mail:</span> {empresa.email || 'gersonjcumbane@gmail.com'}
                  </p>
                </div>
              </div>

              {/* Lado Direito: Quadro de Identificação do Documento ClickPay ERP Enterprise */}
              <div className="w-full sm:w-72 border border-slate-900 text-[10.5px] bg-white shrink-0">
                <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    {getTituloDocumento()}
                  </span>
                  <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-200">
                    ORIGINAL
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 border-t border-slate-900">
                  <div className="col-span-2 px-2.5 py-1.5 flex items-center justify-between bg-slate-50">
                    <span className="text-[9.5px] font-semibold uppercase text-slate-500">Documento N.º</span>
                    <span className="font-mono tabular-nums font-bold text-slate-950 text-xs">{numeroDocumento}</span>
                  </div>
                  <div className="px-2.5 py-1.5">
                    <span className="text-[9px] font-semibold uppercase text-slate-500 block">Data Emissão</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">{dataEmissao}</span>
                  </div>
                  <div className="px-2.5 py-1.5">
                    <span className="text-[9px] font-semibold uppercase text-slate-500 block">
                      {dataVencimento && !isRecibo ? 'Vencimento' : 'Estado'}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {dataVencimento && !isRecibo
                        ? dataVencimento
                        : isLiquidado
                        ? 'Liquidado'
                        : estadoPagamento}
                    </span>
                  </div>
                  <div className="px-2.5 py-1.5">
                    <span className="text-[9px] font-semibold uppercase text-slate-500 block">Moeda</span>
                    <span className="font-semibold text-slate-900">MZN (Metical)</span>
                  </div>
                  <div className="px-2.5 py-1.5">
                    <span className="text-[9px] font-semibold uppercase text-slate-500 block">Página</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">1 / 1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. QUADRO DESTINATÁRIO (JANELA ENVELOPE) + CONDIÇÕES COMERCIAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 a4-avoid-break">
              {/* Condições Comerciais & Tributárias */}
              <div className="border border-slate-300 p-3 bg-slate-50/40 text-[10.5px] space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                  Condições Comerciais &amp; Fiscais
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Cond. Pagamento:</span> {metodoPagamento}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Situação:</span>{' '}
                  {isLiquidado ? 'Liquidado / Pago na íntegra' : 'Aguardando liquidação'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Local de Carga / Prestação:</span> Moçambique
                </p>
                <p className="text-[9.5px] text-slate-500 pt-0.5 leading-snug">
                  Emitido nos termos do Código do IVA da República de Moçambique (PGC-NIRF).
                </p>
              </div>

              {/* Exmo.(s) Senhor(es) */}
              <div className="border border-slate-900 p-3 bg-white text-[10.5px] space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                  Exmo.(s) Senhor(es) · {entidade.tipo || 'Cliente'}
                </p>
                <h2 className="font-bold text-slate-950 text-xs uppercase leading-snug">
                  {entidade.nome || 'CONSUMIDOR FINAL'}
                </h2>
                <p className="font-mono tabular-nums">
                  <span className="font-semibold text-slate-900">NUIT:</span> {entidade.nuit || 'Consumidor Final'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Morada:</span> {entidade.endereco || 'Maputo, Moçambique'}
                </p>
                {(entidade.telefone || entidade.email) && (
                  <p className="text-slate-600">
                    {entidade.telefone ? `Tel: ${entidade.telefone}` : ''}
                    {entidade.telefone && entidade.email ? ' · ' : ''}
                    {entidade.email ? `E-mail: ${entidade.email}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* 3. DECLARAÇÃO DE QUITAÇÃO (PARA RECIBOS / FACTURA-RECIBO) */}
            {isRecibo && (
              <div className="p-3 bg-slate-50 border border-slate-300 text-[10.5px] text-slate-800 leading-relaxed a4-avoid-break">
                <span className="font-bold text-slate-950 uppercase text-[10px] block mb-0.5">
                  Declaração de Recebimento &amp; Quitação
                </span>
                Recebemos de <span className="font-bold uppercase">{entidade.nome}</span> (NUIT:{' '}
                <span className="font-mono">{entidade.nuit || 'N/A'}</span>) a quantia total de{' '}
                <span className="font-mono tabular-nums font-bold text-slate-950">
                  {valorTotalGeral.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                </span>{' '}
                (<span className="italic">{numeroParaExtenso(valorTotalGeral)}</span>), referente à liquidação integral dos artigos ou serviços abaixo discriminados.
              </div>
            )}

            {/* 4. TABELA DE ARTIGOS / SERVIÇOS CLICKPAY ERP ENTERPRISE */}
            <div className="border border-slate-900 overflow-hidden">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[9.5px] uppercase tracking-wider">
                    <th className="py-2 px-2 border-r border-slate-700 w-16">Artigo</th>
                    <th className="py-2 px-2.5 border-r border-slate-700">Descrição</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-14 text-right">Qtd.</th>
                    <th className="py-2 px-1.5 border-r border-slate-700 w-10 text-center">Un.</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-24 text-right">Pr. Unit.</th>
                    <th className="py-2 px-1.5 border-r border-slate-700 w-14 text-right">Desc.%</th>
                    <th className="py-2 px-1.5 border-r border-slate-700 w-14 text-right">IVA</th>
                    <th className="py-2 px-2.5 w-28 text-right">Total (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                  {itens && itens.length > 0 ? (
                    itens.map((item, idx) => (
                      <tr key={idx} className="divide-x divide-slate-200">
                        <td className="py-2 px-2 font-mono tabular-nums text-[10px] text-slate-700">
                          {item.codigo || `ART-${String(idx + 1).padStart(3, '0')}`}
                        </td>
                        <td className="py-2 px-2.5 font-medium text-slate-950">{item.descricao}</td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {Number(item.quantidade).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-1.5 text-center text-[10px] text-slate-600">
                          {item.unidade || 'UN'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {Number(item.precoUnitario).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-1.5 text-right font-mono tabular-nums text-slate-600">
                          {(item.descontoPercentual || 0).toFixed(1)}%
                        </td>
                        <td className="py-2 px-1.5 text-right font-mono tabular-nums">
                          {item.taxaIva > 0 ? `${item.taxaIva}%` : 'Isento'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-slate-950">
                          {Number(item.totalComIva).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                        Sem artigos discriminados no documento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BLOCO INFERIOR FIXADO AO PÉ DA FOLHA A4 */}
          <div className="space-y-4 pt-3 border-t-2 border-slate-900 a4-avoid-break">
            {/* 5. RESUMO DE IMPOSTOS + TOTAIS */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-5">
              {/* Quadro de Resumo de Impostos */}
              <div className="w-full sm:w-80 border border-slate-400 text-[10px]">
                <div className="bg-slate-100 border-b border-slate-400 px-2.5 py-1 font-bold uppercase tracking-wider text-slate-800 text-[9.5px]">
                  Quadro de Resumo de Impostos (IVA)
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50 text-slate-600 text-[9px] uppercase">
                      <th className="py-1 px-2">Taxa / Descrição</th>
                      <th className="py-1 px-2 text-right">Incidência</th>
                      <th className="py-1 px-2 text-right">Imposto (MT)</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums text-slate-800">
                    <tr>
                      <td className="py-1.5 px-2 font-sans font-medium">
                        {effectiveIvaRate > 0 ? `IVA Normal (${effectiveIvaRate}%)` : 'Isento / Não Sujeito'}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {valorBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold">
                        {valorIvaTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Quadro de Totais Financeiros */}
              <div className="w-full sm:w-72 border border-slate-900 text-[10.5px] bg-white">
                <div className="px-3 py-1.5 flex justify-between border-b border-slate-300">
                  <span className="text-slate-600 font-semibold">Total Ilíquido (Base)</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {valorBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
                <div className="px-3 py-1.5 flex justify-between border-b border-slate-300">
                  <span className="text-slate-600 font-semibold">Descontos Comerciais</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {totalDescontos.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
                <div className="px-3 py-1.5 flex justify-between border-b border-slate-900 bg-slate-50">
                  <span className="text-slate-700 font-semibold">Total Imposto IVA</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {valorIvaTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
                <div className="px-3 py-2 flex justify-between items-center bg-slate-900 text-white">
                  <span className="uppercase text-[10px] font-bold tracking-wider">Total do Documento</span>
                  <span className="font-mono tabular-nums text-sm font-bold">
                    {valorTotalGeral.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
              </div>
            </div>

            {/* 6. VALOR POR EXTENSO & OBSERVAÇÕES */}
            <div className="border border-slate-300 bg-slate-50 px-3 py-2 text-[10px] text-slate-800">
              <span className="font-bold uppercase text-[9px] text-slate-500 mr-2">Valor por Extenso:</span>
              <span className="font-semibold italic text-slate-950">{numeroParaExtenso(valorTotalGeral)}</span>
              {observacoes && (
                <p className="text-[10px] text-slate-600 mt-1 border-t border-slate-200 pt-1">
                  <span className="font-semibold text-slate-800">Obs.:</span> {observacoes}
                </p>
              )}
            </div>

            {/* 7. COORDENADAS BANCÁRIAS COMPACTAS */}
            <div className="border border-slate-300 p-2.5 text-[9.5px] text-slate-700 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={12} className="text-slate-700" />
                  Coordenadas Bancárias &amp; Carteiras Móveis ({empresa.nome || 'ClickPay Moçambique'})
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  M-Pesa: {DEFAULT_MOBILE_WALLETS.mpesa} · e-Mola: {DEFAULT_MOBILE_WALLETS.emola}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[9px]">
                {contas.slice(0, 3).map((conta, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 px-2 py-1">
                    <span className="font-bold text-slate-900 block uppercase font-sans">{conta.banco}</span>
                    <span>Conta: {conta.conta}</span>
                    <span className="block">NIB: {conta.nib}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 8. ASSINATURAS */}
            <div className="grid grid-cols-2 gap-10 pt-2 text-center text-[10px] text-slate-600">
              <div>
                <div className="border-b border-slate-400 h-7 w-48 mx-auto mb-1" />
                <p className="font-semibold text-slate-900 uppercase">Pela Entidade Emitente</p>
                <p className="text-[9px] text-slate-500">{empresa.nome || 'ClickPay Moçambique, Lda'}</p>
              </div>
              <div>
                <div className="border-b border-slate-400 h-7 w-48 mx-auto mb-1" />
                <p className="font-semibold text-slate-900 uppercase">Receção / Conferência</p>
                <p className="text-[9px] text-slate-500">{entidade.nome || 'O Cliente'}</p>
              </div>
            </div>

            {/* 9. RODAPÉ OFICIAL CLICKPAY ERP ENTERPRISE: PROCESSADO POR COMPUTADOR */}
            <div className="pt-2.5 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 text-[9px] text-slate-600">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-950 uppercase tracking-wide">
                  {CLICKPAY_COMPUTER_NOTE}
                </p>
                <p className="font-mono tabular-nums text-[8.5px] text-slate-500">
                  Ref. Controlo: {hashControlo} · Documento: {numeroDocumento} · Página 1 de 1
                </p>
              </div>

              <div className="flex items-center gap-2 border border-slate-300 bg-slate-50 px-2.5 py-1">
                <QrCode size={18} className="text-slate-900 shrink-0" />
                <div className="font-mono text-[8px] leading-tight text-slate-700">
                  <span className="font-bold block">VERIFICAÇÃO</span>
                  <span>{hashControlo}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
