import React from 'react';
import { Printer, X, ShieldCheck, QrCode, Download } from 'lucide-react';
import {
  computeDocumentHashCode,
  numeroParaExtenso,
  PRIMAVERA_COMPUTER_NOTE
} from '../utils/documentUtils';

export interface PayslipA4Data {
  numeroRecibo: string;
  periodo: string;
  dataEmissao: string;
  empresa: {
    nome: string;
    nuit?: string;
    nuel?: string;
    endereco?: string;
    cidade?: string;
    provincia?: string;
    email?: string;
    telefone?: string;
    logo?: string;
  };
  colaborador: {
    nome: string;
    cargo: string;
    nuit?: string;
    inss_numero?: string;
    numero_dependentes?: number;
    carteira_movel?: string;
  };
  valores: {
    salarioBase: number;
    descontoFaltas?: number;
    diasFaltas?: number;
    inssTrabalhador: number;
    inssEmpresa?: number;
    irpsConstatado: number;
    descontoVales?: number;
    totalDescontos: number;
    salarioLiquido: number;
  };
  pdfDownloadUrl?: string;
}

interface PayslipA4ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PayslipA4Data | null;
}

export default function PayslipA4Modal({ isOpen, onClose, data }: PayslipA4ModalProps) {
  if (!isOpen || !data) return null;

  const { empresa, colaborador, valores } = data;
  const faltas = Number(valores.descontoFaltas || 0);
  const vales = Number(valores.descontoVales || 0);
  const inssPatronal =
    valores.inssEmpresa !== undefined
      ? Number(valores.inssEmpresa)
      : Math.round(valores.salarioBase * 0.04 * 100) / 100;
  const hashControlo = computeDocumentHashCode(
    data.numeroRecibo,
    valores.salarioLiquido,
    empresa.nuit
  );

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-lg max-w-[210mm] w-full shadow-2xl border border-slate-300 overflow-hidden my-4 sm:my-6 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Barra Superior de Acções */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 print:hidden no-print">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-xs font-bold tracking-wide text-white uppercase">
                Recibo de Vencimento A4 · Estilo Primavera ERP V10
              </h3>
              <p className="text-[11px] text-slate-300">
                {colaborador.nome} · Período {data.periodo} · Processado por computador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data.pdfDownloadUrl && (
              <a
                href={data.pdfDownloadUrl}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} />
                <span>PDF Servidor</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-semibold rounded-md text-xs flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer size={15} />
              <span>Imprimir / Guardar PDF (A4)</span>
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

        {/* Folha A4 Oficial Primavera V10 — Recibo de Vencimento */}
        <div
          data-a4-print-sheet="true"
          className="w-full max-w-[210mm] min-h-[297mm] mx-auto px-7 py-7 sm:px-10 sm:py-9 text-slate-900 bg-white flex flex-col justify-between gap-5 font-sans print:px-2 print:py-2"
        >
          <div className="space-y-5">
            {/* 1. CABEÇALHO EMPRESA & QUADRO RECIBO */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  {empresa.logo && empresa.logo.startsWith('data:image/') ? (
                    <img
                      src={empresa.logo}
                      alt={empresa.nome}
                      className="h-12 w-auto object-contain max-w-[140px]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <img
                      src="/clickpay-logo.png"
                      alt={empresa.nome || 'ClickPay'}
                      className="h-12 w-auto object-contain max-w-[140px]"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h1 className="text-base font-bold text-slate-950 uppercase tracking-tight leading-tight">
                      {empresa.nome || 'CLICKPAY MOÇAMBIQUE, LDA'}
                    </h1>
                    <p className="text-[10px] font-medium text-slate-600">
                      Processamento Salarial Certificado · Lei do Trabalho n.º 13/2023 &amp; IRPS Lei 11/2025
                    </p>
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-700 space-y-0.5 leading-snug">
                  <p>
                    {empresa.endereco || 'Maputo, Moçambique'}
                    {empresa.provincia ? ` · ${empresa.provincia}` : ''}
                  </p>
                  <p className="font-mono tabular-nums">
                    <span className="font-semibold text-slate-900">NUIT:</span> {empresa.nuit || 'N/D'}
                    {empresa.nuel ? ` · NUEL: ${empresa.nuel}` : ''}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Tel:</span> {empresa.telefone || 'N/D'}
                    {' · '}
                    <span className="font-semibold text-slate-900">E-mail:</span> {empresa.email || 'N/D'}
                  </p>
                </div>
              </div>

              {/* Quadro Direito: RECIBO DE VENCIMENTO */}
              <div className="w-full sm:w-72 border border-slate-900 text-[10.5px] bg-white shrink-0">
                <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    RECIBO DE VENCIMENTO
                  </span>
                  <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-200">
                    ORIGINAL
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-y divide-slate-300 border-t border-slate-900">
                  <div className="col-span-2 px-2.5 py-1.5 flex items-center justify-between bg-slate-50">
                    <span className="text-[9.5px] font-semibold uppercase text-slate-500">N.º Recibo</span>
                    <span className="font-mono tabular-nums font-bold text-slate-950 text-xs">{data.numeroRecibo}</span>
                  </div>
                  <div className="px-2.5 py-1.5">
                    <span className="text-[9px] font-semibold uppercase text-slate-500 block">Período / Mês</span>
                    <span className="font-semibold text-slate-900">{data.periodo}</span>
                  </div>
                  <div className="px-2.5 py-1.5">
                    <span className="text-[9px] font-semibold uppercase text-slate-500 block">Data Emissão</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">{data.dataEmissao}</span>
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

            {/* 2. DADOS DO TRABALHADOR (GRELHA PRIMAVERA V10) */}
            <div className="border border-slate-900 text-[10.5px] a4-avoid-break">
              <div className="bg-slate-100 border-b border-slate-900 px-3 py-1.5 font-bold uppercase tracking-wider text-slate-900 text-[10px]">
                Identificação do(a) Trabalhador(a)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300">
                <div className="p-2.5 sm:col-span-2 space-y-1">
                  <p>
                    <span className="text-[9.5px] font-semibold uppercase text-slate-500 block">Nome Completo</span>
                    <span className="font-bold text-slate-950 text-xs uppercase">{colaborador.nome}</span>
                  </p>
                  <p>
                    <span className="text-[9.5px] font-semibold uppercase text-slate-500">Cargo / Categoria: </span>
                    <span className="font-semibold text-slate-900">{colaborador.cargo}</span>
                  </p>
                </div>
                <div className="p-2.5 space-y-1 font-mono tabular-nums text-[10px]">
                  <p>
                    <span className="font-sans font-semibold text-slate-600">NUIT:</span>{' '}
                    <span className="font-bold text-slate-950">{colaborador.nuit || 'N/D'}</span>
                  </p>
                  <p>
                    <span className="font-sans font-semibold text-slate-600">Benef. INSS:</span>{' '}
                    <span className="font-bold text-slate-950">{colaborador.inss_numero || 'N/D'}</span>
                  </p>
                  <p>
                    <span className="font-sans font-semibold text-slate-600">Dependentes IRPS:</span>{' '}
                    <span className="font-bold text-slate-950">
                      {(colaborador.numero_dependentes || 0) >= 4 ? '4 ou mais' : (colaborador.numero_dependentes || 0)}
                    </span>
                  </p>
                  <p>
                    <span className="font-sans font-semibold text-slate-600">Carteira / Pagto:</span>{' '}
                    <span className="font-bold text-slate-950">{colaborador.carteira_movel || 'Transferência'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 3. TABELA DE REMUNERAÇÕES E DESCONTOS ESTILO PRIMAVERA V10 */}
            <div className="border border-slate-900 overflow-hidden">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[9.5px] uppercase tracking-wider">
                    <th className="py-2 px-2.5 border-r border-slate-700 w-16">Cód.</th>
                    <th className="py-2 px-3 border-r border-slate-700">Descrição da Rubrica Salarial</th>
                    <th className="py-2 px-2.5 border-r border-slate-700 w-24 text-center">Ref. / Base</th>
                    <th className="py-2 px-3 border-r border-slate-700 w-32 text-right">Remunerações (MT)</th>
                    <th className="py-2 px-3 w-32 text-right">Descontos (MT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                  <tr className="divide-x divide-slate-200">
                    <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600">R001</td>
                    <td className="py-2 px-3 font-semibold text-slate-950">Vencimento Base Contratual</td>
                    <td className="py-2 px-2.5 text-center font-mono tabular-nums text-slate-600">30 dias</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-950">
                      {valores.salarioBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">0,00</td>
                  </tr>

                  {faltas > 0 && (
                    <tr className="divide-x divide-slate-200">
                      <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600">D001</td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        Faltas / Ausências Não Remuneradas ({valores.diasFaltas || 0} dia(s))
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums text-slate-600">
                        {valores.diasFaltas || 0}d
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">0,00</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {faltas.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}

                  <tr className="divide-x divide-slate-200">
                    <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600">D002</td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      Segurança Social Obrigatória — INSS Trabalhador
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono tabular-nums text-slate-600">3,00%</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">0,00</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {valores.inssTrabalhador.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr className="divide-x divide-slate-200">
                    <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600">D003</td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      Retenção na Fonte de Imposto — IRPS (Lei 11/2025)
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono tabular-nums text-slate-600">Tabela AT</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">0,00</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {valores.irpsConstatado.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {vales > 0 && (
                    <tr className="divide-x divide-slate-200">
                      <td className="py-2 px-2.5 font-mono tabular-nums text-slate-600">D004</td>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        Desconto de Adiantamento Salarial (Vale)
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums text-slate-600">Art. 113</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">0,00</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {vales.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-slate-950 divide-x divide-slate-300">
                    <td colSpan={3} className="py-2 px-3 text-right uppercase text-[10px]">
                      Totais do Recibo (MT)
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {valores.salarioBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {valores.totalDescontos.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* BLOCO INFERIOR FIXADO AO PÉ DA FOLHA A4 */}
          <div className="space-y-4 pt-3 border-t-2 border-slate-900 a4-avoid-break">
            {/* 4. RESUMO FINAL & LÍQUIDO A RECEBER */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch gap-4">
              <div className="flex-1 border border-slate-300 p-3 bg-slate-50 text-[10px] space-y-1.5">
                <p className="font-bold uppercase text-slate-700 text-[9.5px] border-b border-slate-200 pb-1">
                  Encargos &amp; Dados de Pagamento (Informativo)
                </p>
                <p>
                  <span className="font-semibold text-slate-900">INSS Entidade Patronal (4%):</span>{' '}
                  <span className="font-mono tabular-nums font-bold">
                    {inssPatronal.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Meio de Liquidação:</span>{' '}
                  Carteira Móvel / Conta ({colaborador.carteira_movel || 'N/D'})
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Extenso:</span>{' '}
                  <span className="italic">{numeroParaExtenso(valores.salarioLiquido)}</span>
                </p>
              </div>

              <div className="w-full sm:w-72 border border-slate-900 flex flex-col justify-between bg-white">
                <div className="px-3 py-1.5 flex justify-between border-b border-slate-200 text-[10.5px]">
                  <span className="text-slate-600 font-semibold">Total Ilíquido</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {valores.salarioBase.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
                <div className="px-3 py-1.5 flex justify-between border-b border-slate-900 text-[10.5px]">
                  <span className="text-slate-600 font-semibold">Total Descontos</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {valores.totalDescontos.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
                <div className="px-3 py-2.5 bg-slate-900 text-white flex justify-between items-center">
                  <span className="uppercase text-[10px] font-bold tracking-wider">Líquido a Receber</span>
                  <span className="font-mono tabular-nums text-base font-bold">
                    {valores.salarioLiquido.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
              </div>
            </div>

            {/* 5. ASSINATURAS */}
            <div className="grid grid-cols-2 gap-10 pt-3 text-center text-[10px] text-slate-600">
              <div>
                <div className="border-b border-slate-400 h-7 w-48 mx-auto mb-1" />
                <p className="font-semibold text-slate-900 uppercase">Pela Entidade Empregadora</p>
                <p className="text-[9px] text-slate-500">{empresa.nome}</p>
              </div>
              <div>
                <div className="border-b border-slate-400 h-7 w-48 mx-auto mb-1" />
                <p className="font-semibold text-slate-900 uppercase">O(A) Trabalhador(a)</p>
                <p className="text-[9px] text-slate-500">{colaborador.nome}</p>
              </div>
            </div>

            {/* 6. RODAPÉ OFICIAL: PROCESSADO POR COMPUTADOR */}
            <div className="pt-2.5 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 text-[9px] text-slate-600">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-950 uppercase tracking-wide">
                  {PRIMAVERA_COMPUTER_NOTE}
                </p>
                <p className="font-mono tabular-nums text-[8.5px] text-slate-500">
                  Ref. Controlo: {hashControlo} · Recibo: {data.numeroRecibo} · Página 1 de 1
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
