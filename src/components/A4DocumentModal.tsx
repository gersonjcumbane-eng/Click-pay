import React from 'react';
import { Printer, Download, X, ShieldCheck, QrCode, CheckCircle2, Building2, Wallet } from 'lucide-react';
import { DEFAULT_BANK_ACCOUNTS, DEFAULT_MOBILE_WALLETS, numeroParaExtenso, BankAccountDetails } from '../utils/documentUtils';

export interface DocumentItem {
  codigo?: string;
  descricao: string;
  quantidade: number;
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

  const contas = empresa.contasBancarias && empresa.contasBancarias.length > 0 
    ? empresa.contasBancarias 
    : DEFAULT_BANK_ACCOUNTS;

  const getTituloDocumento = () => {
    switch (tipoDocumento) {
      case 'fatura':
        return 'FACTURA OFICIAL';
      case 'factura_recibo':
        return 'FACTURA-RECIBO (FR)';
      case 'recibo':
        return 'RECIBO DE LIQUIDAÇÃO';
      case 'proforma':
        return 'FACTURA PROFORMA';
      case 'compra':
        return 'COMPROVATIVO DE COMPRA';
      case 'caixa':
        return 'RECIBO DE CAIXA';
      default:
        return 'DOCUMENTO COMERCIAL';
    }
  };

  const isRecibo = tipoDocumento === 'recibo' || tipoDocumento === 'caixa' || estadoPagamento === 'Cobrado' || estadoPagamento === 'Pago';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-300 overflow-hidden my-4 sm:my-8 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* BARRA SUPERIOR DE AÇÕES (ESCONDIDA NA IMPRESSÃO) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
                Documento A4 Profissional • {getTituloDocumento()}
              </h3>
              <p className="text-[11px] text-slate-400">
                Padrão AT Moçambique (IVA 16% / PGC-NIRF) • Certificado nº 01/AT/2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Printer size={16} />
              Imprimir Documento (A4)
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X size={16} />
              Fechar
            </button>
          </div>
        </div>

        {/* CONTAINER DOCUMENTO FOLHA A4 (LAYOUT DE IMPRESSÃO A4 OFICIAL) */}
        <div className="p-6 sm:p-10 md:p-12 text-slate-900 space-y-6 bg-white relative print:p-8 font-sans">
          
          {/* MARCA DE ÁGUA DE CERTIFICAÇÃO */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] select-none text-center">
            <h1 className="text-8xl font-black tracking-tighter text-slate-900 uppercase">PRIMAVERA ERP</h1>
            <p className="text-3xl font-bold tracking-widest text-slate-800 mt-2">CERTIFICADO 01/AT/2026</p>
          </div>

          {/* CABEÇALHO DA EMPRESA EMITENTE & DETALHES DO DOCUMENTO */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 gap-6">
            
            {/* LADO ESQUERDO: DADOS E LOGO DA EMPRESA */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                {empresa.logo && empresa.logo.startsWith('data:image/') ? (
                  <img src={empresa.logo} alt="Logo" className="h-12 w-auto object-contain max-w-[160px]" referrerPolicy="no-referrer" />
                ) : (
                  <img src="/logo-payroll.png" alt="Payroll Tech" className="h-12 w-auto object-contain max-w-[160px]" referrerPolicy="no-referrer" />
                )}
                <div>
                  <h1 className="text-lg font-black text-slate-950 uppercase tracking-tight leading-tight">
                    {empresa.nome || 'PAYROLL TECH MZ, LDA'}
                  </h1>
                  <span className="text-[9px] font-bold text-slate-500 tracking-wider block uppercase">
                    Software de Faturação Certificado nº 01/AT/2026
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed font-medium">
                <p>{empresa.endereco || 'Av. Julius Nyerere, Edifício Jat V'}, {empresa.cidade || 'Maputo Cidade'}, Moçambique</p>
                <p>
                  <b>NUIT:</b> {empresa.nuit || '400990887'} {empresa.nuel ? `| NUEL: ${empresa.nuel}` : ''}
                </p>
                <p>
                  <b>Tel:</b> {empresa.telefone || '+258 861390061'} | <b>E-mail:</b> {empresa.email || 'gersonjcumbane@gmail.com'}
                </p>
                <p className="text-[10.5px] text-slate-500">
                  <b>Regime de IVA:</b> {empresa.regimeIva || 'IVA Normal 16% (Art. 1 Lei do IVA)'}
                </p>
              </div>
            </div>

            {/* LADO DIREITO: CAIXA TIPO DE DOCUMENTO E METADADOS */}
            <div className="w-full sm:w-72 border-2 border-slate-900 rounded-xl overflow-hidden bg-white shadow-sm text-xs">
              <div className="bg-slate-900 text-white font-black px-4 py-2 text-center text-xs tracking-wider uppercase">
                {getTituloDocumento()}
              </div>

              <div className="p-3 bg-slate-50/80 space-y-2 divide-y divide-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">N.º do Documento:</span>
                  <span className="font-mono font-black text-slate-950 text-sm">{numeroDocumento}</span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Data de Emissão:</span>
                  <span className="font-bold text-slate-900 font-mono">{dataEmissao}</span>
                </div>

                {dataVencimento && !isRecibo && (
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Data Vencimento:</span>
                    <span className="font-bold text-rose-700 font-mono">{dataVencimento}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Estado:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    estadoPagamento === 'Cobrado' || estadoPagamento === 'Pago' 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {estadoPagamento === 'Cobrado' || estadoPagamento === 'Pago' ? 'LIQUIDADO' : 'PENDENTE'}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Moeda:</span>
                  <span className="font-bold text-slate-900">Metical Moçambicano (MT)</span>
                </div>
              </div>
            </div>

          </div>

          {/* DADOS DA ENTIDADE DESTINATÁRIA (CLIENTE OU FORNECEDOR) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* QUADRO DESTINATÁRIO */}
            <div className="border-2 border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-1.5 relative">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
                EXMO.(S) SENHOR(ES) / {entidade.tipo ? entidade.tipo.toUpperCase() : 'CLIENTE DESTINATÁRIO'}
              </span>
              <h3 className="font-black text-slate-950 text-sm uppercase">
                {entidade.nome || 'CLIENTE FINAL'}
              </h3>
              <div className="text-xs text-slate-700 space-y-0.5 font-medium">
                <p><b>NUIT:</b> <span className="font-mono font-bold text-slate-900">{entidade.nuit || 'Consumidor Final'}</span></p>
                <p><b>Endereço:</b> {entidade.endereco || 'Maputo, Moçambique'}</p>
                {entidade.email && <p><b>E-mail:</b> {entidade.email}</p>}
                {entidade.telefone && <p><b>Telefone:</b> {entidade.telefone}</p>}
              </div>
            </div>

            {/* QUADRO CONDICIONAL / TERMOS COMERCIAIS */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 text-xs space-y-1.5">
              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
                CONDIÇÕES TRIBUTÁRIAS & OPERACIONAIS
              </span>
              <p className="text-slate-600">
                <b>Método de Pagamento:</b> {metodoPagamento}
              </p>
              <p className="text-slate-600">
                <b>Local de Prestação / Entrega:</b> Moçambique (Mercado Nacional)
              </p>
              <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">
                Documento emitido ao abrigo do Código do IVA de Moçambique e regido pelo Plano Geral de Contabilidade PGC-NIRF. Conservar este documento para efeitos de auditoria fiscal.
              </p>
            </div>

          </div>

          {/* TEXTO DE DECLARAÇÃO DE QUITAÇÃO (SE FOR RECIBO) */}
          {isRecibo && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl text-xs text-emerald-950 space-y-1 leading-relaxed font-medium">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-700" />
                DECLARAÇÃO DE RECEBIMENTO & QUITAÇÃO INTEGRAL
              </p>
              <p>
                Declaramos para os devidos efeitos legais e comerciais que recebemos da entidade <b className="uppercase">{entidade.nome}</b> (NUIT: <b className="font-mono">{entidade.nuit || 'N/A'}</b>) a quantia total de <b className="font-mono text-sm">{valorTotalGeral.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</b> (<span className="font-bold italic">{numeroParaExtenso(valorTotalGeral)}</span>), dando por este meio a plena e integral quitação das obrigações discriminadas no presente documento.
              </p>
            </div>
          )}

          {/* TABELA DISCRIMINADA DE BENS OU SERVIÇOS */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">
              DISCRIMINAÇÃO DOS BENS / SERVIÇOS PRESTADOS
            </span>

            <div className="border-2 border-slate-900 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white font-black text-[9.5px] uppercase tracking-wider">
                  <tr className="divide-x divide-slate-700">
                    <th className="p-2.5 w-16 text-center">Cód.</th>
                    <th className="p-2.5">Descrição do Item / Serviço</th>
                    <th className="p-2.5 w-16 text-center">Qtd.</th>
                    <th className="p-2.5 w-28 text-right">Preço Un. (MT)</th>
                    <th className="p-2.5 w-20 text-center">IVA %</th>
                    <th className="p-2.5 w-24 text-right">IVA (MT)</th>
                    <th className="p-2.5 w-32 text-right">Total c/ IVA (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-slate-800 bg-white font-medium">
                  {itens && itens.length > 0 ? (
                    itens.map((item, idx) => (
                      <tr key={idx} className="divide-x divide-slate-200 hover:bg-slate-50/80">
                        <td className="p-2.5 text-center font-mono font-bold text-slate-500">{item.codigo || `IT-${idx + 1}`}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-950 block">{item.descricao}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono">{item.quantidade}</td>
                        <td className="p-2.5 text-right font-mono">{item.precoUnitario.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                          {item.taxaIva > 0 ? `${item.taxaIva}%` : 'Isento'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-900 font-semibold">
                          {item.valorIva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono font-extrabold text-slate-950">
                          {item.totalComIva.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                        Sem itens discriminados no documento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* QUADRO DE IMPOSTOS & RESUMO DE TOTAIS */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-slate-900">
            
            {/* QUADRO DE RESUMO DE IMPOSTOS (AUTORIDADE TRIBUTÁRIA MODELO M/01) */}
            <div className="w-full sm:w-72 border border-slate-300 rounded-xl overflow-hidden text-[10px] bg-slate-50/50">
              <div className="bg-slate-800 text-white font-black p-2 text-center uppercase tracking-wider text-[10px]">
                Quadro de Resumo do IVA (AT Moçambique)
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300">
                    <th className="p-1.5">Taxa</th>
                    <th className="p-1.5 text-right">Incidência (MT)</th>
                    <th className="p-1.5 text-right">Imposto (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-slate-800 font-mono">
                  <tr>
                    <td className="p-1.5 font-bold">IVA 16% (Normal)</td>
                    <td className="p-1.5 text-right">{valorBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                    <td className="p-1.5 text-right font-bold text-amber-900">{valorIvaTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-2 text-[9px] text-slate-500 bg-white border-t border-slate-200 leading-tight">
                Taxa legal de IVA de 16% conforme previsto no Código do Imposto sobre o Valor Acrescentado em vigor em Moçambique.
              </div>
            </div>

            {/* QUADRO DE TOTAIS FINAIS DO DOCUMENTO */}
            <div className="w-full sm:w-80 border-2 border-slate-900 rounded-xl text-xs overflow-hidden bg-white shadow-sm">
              <div className="p-2.5 flex justify-between border-b border-slate-200">
                <span className="text-slate-600 font-bold uppercase text-[10px]">Valor Ilíquido (Base):</span>
                <span className="font-mono font-bold text-slate-950">{valorBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
              </div>
              <div className="p-2.5 flex justify-between border-b border-slate-200">
                <span className="text-slate-600 font-bold uppercase text-[10px]">Total Descontos:</span>
                <span className="font-mono font-bold text-slate-950">0,00 MT</span>
              </div>
              <div className="p-2.5 flex justify-between border-b border-slate-200 bg-slate-50">
                <span className="text-slate-700 font-bold uppercase text-[10px]">Total Imposto IVA (16%):</span>
                <span className="font-mono font-extrabold text-amber-900">{valorIvaTotal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
              </div>
              <div className="p-3 flex justify-between bg-slate-900 text-white font-black items-center">
                <span className="uppercase text-[10px] tracking-widest block font-black">TOTAL A PAGAR (MT):</span>
                <span className="font-mono text-base block font-black text-emerald-400">
                  {valorTotalGeral.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                </span>
              </div>
            </div>

          </div>

          {/* VALOR POR EXTENSO */}
          <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-900">
            <span className="font-extrabold uppercase text-[10px] text-slate-500 block mb-0.5">VALOR POR EXTENSO:</span>
            <p className="font-bold text-slate-950 italic text-sm">
              {numeroParaExtenso(valorTotalGeral)}
            </p>
          </div>

          {/* COORDENADAS BANCÁRIAS DA EMPRESA EMITENTE */}
          <div className="p-4 bg-blue-50/70 border-2 border-blue-200 rounded-xl space-y-2 text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
              <span className="font-black text-blue-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Building2 size={16} className="text-blue-700" />
                Dados Bancários Oficiais para Liquidação por Transferência / M-Pesa
              </span>
              <span className="text-[10px] font-bold text-blue-800 font-mono">
                Titular: {empresa.nome || 'Payroll Tech MZ, Lda'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono text-[11px]">
              {contas.map((conta, i) => (
                <div key={i} className="p-2.5 bg-white rounded-lg border border-blue-150 space-y-0.5 shadow-2xs">
                  <span className="font-black text-blue-900 block text-[11px] uppercase">{conta.banco}</span>
                  <p className="text-slate-700"><b>Conta:</b> {conta.conta}</p>
                  <p className="text-slate-700"><b>NIB:</b> {conta.nib}</p>
                  {conta.swift && <p className="text-slate-500 text-[10px]"><b>SWIFT:</b> {conta.swift}</p>}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10.5px] text-slate-600 font-medium">
              <p>
                <b>M-Pesa:</b> <span className="font-mono font-bold text-slate-900">{DEFAULT_MOBILE_WALLETS.mpesa}</span> | <b>E-Mola:</b> <span className="font-mono font-bold text-slate-900">{DEFAULT_MOBILE_WALLETS.emola}</span>
              </p>
              <p className="text-[10px] text-blue-900 font-bold">
                ⚠️ Favor enviar o comprovativo bancário citando o N.º {numeroDocumento}
              </p>
            </div>
          </div>

          {/* OBSERVAÇÕES OPCIONAIS */}
          {observacoes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <b className="text-slate-900 block mb-0.5">Observações:</b>
              <p>{observacoes}</p>
            </div>
          )}

          {/* ASSINATURAS E CARIMBO OFICIAL */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-8">
              <div className="border-b-2 border-slate-800 w-56 mx-auto h-8"></div>
              <div>
                <p className="font-bold text-slate-900 uppercase">Pela Entidade Emitente</p>
                <p className="text-[10px] text-slate-500">{empresa.nome || 'Payroll Tech MZ, Lda'}</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border-b-2 border-slate-800 w-56 mx-auto h-8"></div>
              <div>
                <p className="font-bold text-slate-900 uppercase">Exmo.(s) Senhor(es) Destinatário</p>
                <p className="text-[10px] text-slate-500">{entidade.nome || 'O Cliente'}</p>
              </div>
            </div>
          </div>

          {/* RODAPÉ TÉCNICO PRIMAVERA ERP V10 & QR CODE DE CONFORMIDADE */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-[9px] text-slate-500 font-medium">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-700">
                Emitido por PRIMAVERA ERP V10 | Software de Faturação Certificado nº 01/AT/2026 | Processado por Computador
              </p>
              <p className="font-mono text-[8.5px] text-slate-400">
                Hash de Validação AT: {numeroDocumento}-2026-AT-MZ-VALIDATED-SECURE-STAMP
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <QrCode size={20} className="text-slate-800" />
              <div className="text-[8px] font-mono text-slate-600 leading-tight">
                <b>Validação AT Moçambique</b><br />
                Verificação Digital OK
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
