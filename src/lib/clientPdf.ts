/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { getAuthHeaders } from './authSession';
import {
  CLICKPAY_COMPUTER_NOTE,
  DEFAULT_BANK_ACCOUNTS,
  DEFAULT_MOBILE_WALLETS,
  computeDocumentHashCode,
  numeroParaExtenso
} from '../utils/documentUtils';
import { CompanyData, Employee, PaymentLog } from '../types';
import { calcularFolhaSalario } from '../db_tax';

function fmtMzn(value: number): string {
  const num = Number(value || 0);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedInt},${decPart} MT`;
}

function fmtNum(value: number): string {
  const num = Number(value || 0);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${decPart}`;
}

function todayPt(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function drawHeaderFrame(
  doc: jsPDF,
  company: Partial<CompanyData>,
  docTitle: string,
  docNumber: string,
  metaLeftLabel: string,
  metaLeftValue: string,
  metaRightLabel: string,
  metaRightValue: string
): number {
  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Company Identity (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text((company.nome || 'CLICKPAY MOÇAMBIQUE, LDA').toUpperCase().slice(0, 44), margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  const endereco = `${company.endereco || 'Maputo, Moçambique'}${company.provincia ? ` · ${company.provincia}` : ''}`;
  doc.text(endereco.slice(0, 62), margin, 23.5);
  doc.text(
    `NUIT: ${company.nuit || 'N/D'}${company.nuel ? ` · NUEL: ${company.nuel}` : ''}`,
    margin,
    28
  );
  doc.text(
    `Tel: ${company.telefone || '+258 86 139 0061'} · E-mail: ${company.email || 'admin@clickpay.co.mz'}`.slice(0, 64),
    margin,
    32.5
  );

  // Document Metadata Box (Right)
  const boxX = 128;
  const boxY = 12;
  const boxW = contentWidth - (boxX - margin);
  doc.setFillColor(15, 23, 42);
  doc.rect(boxX, boxY, boxW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(docTitle.toUpperCase().slice(0, 26), boxX + 2.5, boxY + 4.8);
  doc.setFontSize(7);
  doc.text('ORIGINAL', boxX + boxW - 2.5, boxY + 4.8, { align: 'right' });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.rect(boxX, boxY, boxW, 25);

  doc.setFillColor(248, 250, 252);
  doc.rect(boxX, boxY + 7, boxW, 8, 'F');
  doc.line(boxX, boxY + 15, boxX + boxW, boxY + 15);
  doc.line(boxX + boxW / 2, boxY + 15, boxX + boxW / 2, boxY + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCUMENTO N.º', boxX + 2.5, boxY + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(docNumber).slice(0, 24), boxX + boxW - 2.5, boxY + 12.2, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(metaLeftLabel.toUpperCase(), boxX + 2.5, boxY + 18.5);
  doc.text(metaRightLabel.toUpperCase(), boxX + boxW / 2 + 2.5, boxY + 18.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  doc.text(String(metaLeftValue).slice(0, 18), boxX + 2.5, boxY + 22.8);
  doc.text(String(metaRightValue).slice(0, 18), boxX + boxW / 2 + 2.5, boxY + 22.8);

  // Horizontal Separator
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(margin, 41, pageWidth - margin, 41);

  return 47;
}

function drawFooterFrame(doc: jsPDF, refCode: string, total = 0, nuit?: string, pageLabel = 'Pág. 1/1') {
  const margin = 14;
  const pageWidth = 210;
  const y = 281;
  const hash = computeDocumentHashCode(refCode, total, nuit);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(CLICKPAY_COMPUTER_NOTE, margin, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Ref. Controlo: ${hash} · ${pageLabel}`, pageWidth - margin, y + 4.5, { align: 'right' });
}

export function downloadBlobAsFile(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
}

export async function downloadOrFallbackPdf(opts: {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  filename: string;
  headers?: Record<string, string>;
  generateFallback: () => Blob | Promise<Blob>;
}): Promise<{ source: 'server' | 'client' }> {
  try {
    const reqHeaders = getAuthHeaders(opts.headers || {});
    if (opts.body !== undefined && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    const res = await fetch(opts.url, {
      method: opts.method || 'GET',
      headers: reqHeaders,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (res.ok && ct.includes('application/pdf')) {
      const blob = await res.blob();
      if (blob.size > 100) {
        const headerSig = await blob.slice(0, 4).text();
        if (headerSig === '%PDF') {
          downloadBlobAsFile(blob, opts.filename);
          return { source: 'server' };
        }
      }
    }
  } catch {
    // Fallback para geração nativa A4 no navegador
  }

  const fallbackBlob = await opts.generateFallback();
  downloadBlobAsFile(fallbackBlob, opts.filename);
  return { source: 'client' };
}

export async function downloadOrFallbackCsv(opts: {
  url: string;
  filename: string;
  generateFallback: () => string;
}): Promise<{ source: 'server' | 'client' }> {
  try {
    const res = await fetch(opts.url, { headers: getAuthHeaders() });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (res.ok && (ct.includes('text/csv') || ct.includes('application/csv') || ct.includes('text/plain'))) {
      const text = await res.text();
      if (text && !text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
        downloadBlobAsFile(new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8;' }), opts.filename);
        return { source: 'server' };
      }
    }
  } catch {
    // Fallback CSV local
  }
  const csv = opts.generateFallback();
  downloadBlobAsFile(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), opts.filename);
  return { source: 'client' };
}

// 1. RECIBO DE VENCIMENTO A4 (PAYSLIP)
export function generatePayslipPdfBlob(data: {
  numeroRecibo: string;
  periodo: string;
  dataEmissao: string;
  empresa: Partial<CompanyData>;
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
}): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    data.empresa,
    'RECIBO DE VENCIMENTO',
    data.numeroRecibo,
    'Período / Mês',
    data.periodo,
    'Data Emissão',
    data.dataEmissao || todayPt()
  );

  // Worker Box
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, width, 6.5, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, width, 24);
  doc.line(margin, y + 6.5, margin + width, y + 6.5);
  doc.line(margin + 115, y + 6.5, margin + 115, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('IDENTIFICAÇÃO DO(A) TRABALHADOR(A)', margin + 2.5, y + 4.5);

  doc.setFontSize(9.5);
  doc.text((data.colaborador.nome || 'Colaborador').toUpperCase(), margin + 2.5, y + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Cargo / Categoria: ${data.colaborador.cargo || 'Trabalhador'}`, margin + 2.5, y + 18);
  doc.text(`Carteira / Pagto: ${data.colaborador.carteira_movel || 'Transferência'}`, margin + 2.5, y + 22);

  doc.setTextColor(15, 23, 42);
  doc.text(`NUIT: ${data.colaborador.nuit || 'N/D'}`, margin + 118, y + 12);
  doc.text(`Benef. INSS: ${data.colaborador.inss_numero || 'N/D'}`, margin + 118, y + 16.5);
  const deps = Number(data.colaborador.numero_dependentes || 0);
  doc.text(`Dependentes IRPS: ${deps >= 4 ? '4 ou mais' : deps}`, margin + 118, y + 21);

  y += 30;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text('CÓD.', margin + 2.5, y + 5);
  doc.text('DESCRIÇÃO DA RUBRICA SALARIAL', margin + 18, y + 5);
  doc.text('REF.', margin + 112, y + 5, { align: 'center' });
  doc.text('REMUNERAÇÕES', margin + 148, y + 5, { align: 'right' });
  doc.text('DESCONTOS', margin + width - 2.5, y + 5, { align: 'right' });

  y += 7.5;

  const faltas = Number(data.valores.descontoFaltas || 0);
  const vales = Number(data.valores.descontoVales || 0);
  const inssPatronal =
    data.valores.inssEmpresa !== undefined
      ? Number(data.valores.inssEmpresa)
      : Math.round(data.valores.salarioBase * 0.04 * 100) / 100;

  const rows = [
    { cod: 'R01', desc: 'Vencimento Base Mensal', ref: '30 dias', rem: fmtNum(data.valores.salarioBase), descVal: '' },
    ...(faltas > 0
      ? [
          {
            cod: 'D01',
            desc: `Desconto por Faltas (${data.valores.diasFaltas || 0} dia(s))`,
            ref: `${data.valores.diasFaltas || 0} d`,
            rem: '',
            descVal: fmtNum(faltas)
          }
        ]
      : []),
    { cod: 'D02', desc: 'Segurança Social Obrigatória — INSS (Trabalhador)', ref: '3,0%', rem: '', descVal: fmtNum(data.valores.inssTrabalhador) },
    { cod: 'D03', desc: 'Imposto sobre o Rendimento — IRPS (Lei 11/2025)', ref: 'Ret. Fonte', rem: '', descVal: fmtNum(data.valores.irpsConstatado) },
    ...(vales > 0 ? [{ cod: 'D04', desc: 'Adiantamento Salarial (Vale) Descontado', ref: 'Fintech', rem: '', descVal: fmtNum(vales) }] : [])
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  rows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 7, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 7);
    doc.setTextColor(71, 85, 105);
    doc.text(r.cod, margin + 2.5, y + 4.8);
    doc.setTextColor(15, 23, 42);
    doc.text(r.desc, margin + 18, y + 4.8);
    doc.text(r.ref, margin + 112, y + 4.8, { align: 'center' });
    doc.text(r.rem, margin + 148, y + 4.8, { align: 'right' });
    doc.text(r.descVal, margin + width - 2.5, y + 4.8, { align: 'right' });
    y += 7;
  });

  // Totals row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, width, 8, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.rect(margin, y, width, 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAIS DO RECIBO', margin + 18, y + 5.2);
  doc.text(fmtNum(data.valores.salarioBase), margin + 148, y + 5.2, { align: 'right' });
  doc.text(fmtNum(data.valores.totalDescontos), margin + width - 2.5, y + 5.2, { align: 'right' });

  y += 14;

  // Net summary box
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, 106, 24, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('VALOR LÍQUIDO POR EXTENSO', margin + 3, y + 5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.2);
  const extensoLines = doc.splitTextToSize(numeroParaExtenso(data.valores.salarioLiquido), 100);
  doc.text(extensoLines, margin + 3, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(71, 85, 105);
  doc.text(`Encargo Patronal INSS (4%): ${fmtMzn(inssPatronal)}`, margin + 3, y + 21);

  const totBoxX = margin + 112;
  const totBoxW = width - 112;
  doc.setDrawColor(15, 23, 42);
  doc.rect(totBoxX, y, totBoxW, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Ilíquido:', totBoxX + 3, y + 6);
  doc.text(fmtMzn(data.valores.salarioBase), totBoxX + totBoxW - 3, y + 6, { align: 'right' });
  doc.text('Total Descontos:', totBoxX + 3, y + 12);
  doc.text(`- ${fmtMzn(data.valores.totalDescontos)}`, totBoxX + totBoxW - 3, y + 12, { align: 'right' });
  doc.setFillColor(15, 23, 42);
  doc.rect(totBoxX, y + 15.5, totBoxW, 8.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('LÍQUIDO A RECEBER', totBoxX + 3, y + 21);
  doc.text(fmtMzn(data.valores.salarioLiquido), totBoxX + totBoxW - 3, y + 21, { align: 'right' });

  y += 42;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 12, y, margin + 72, y);
  doc.line(margin + 110, y, margin + 170, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Pela Entidade Empregadora', margin + 42, y + 4.5, { align: 'center' });
  doc.text('O(A) Trabalhador(a)', margin + 140, y + 4.5, { align: 'center' });

  drawFooterFrame(doc, data.numeroRecibo, data.valores.salarioLiquido, data.empresa.nuit);
  return doc.output('blob');
}

// 2. DOCUMENTO COMERCIAL / FACTURA / RECIBO / PROPOSTA A4
export function generateA4CommercialDocPdfBlob(props: {
  titulo: string;
  numeroDocumento: string;
  dataEmissao: string;
  dataVencimento?: string;
  empresa: Partial<CompanyData>;
  entidade: { nome: string; nuit?: string; endereco?: string; email?: string; telefone?: string };
  itens: Array<{
    codigo?: string;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
    taxaIva?: number;
    total: number;
  }>;
  valorBase: number;
  valorIvaTotal: number;
  valorTotalGeral: number;
  observacoes?: string;
}): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    props.empresa,
    props.titulo,
    props.numeroDocumento,
    'Data Emissão',
    props.dataEmissao || todayPt(),
    props.dataVencimento ? 'Vencimento' : 'Moeda',
    props.dataVencimento || 'MZN (Metical)'
  );

  // Destinatário Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, width, 21, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('EXMO.(S) SENHOR(ES) — ENTIDADE DESTINATÁRIA', margin + 3, y + 4.5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text((props.entidade.nome || 'Consumidor Final').toUpperCase().slice(0, 60), margin + 3, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `NUIT: ${props.entidade.nuit || 'N/D'} · Endereço: ${props.entidade.endereco || 'Moçambique'}`.slice(0, 85),
    margin + 3,
    y + 15
  );
  if (props.entidade.email || props.entidade.telefone) {
    doc.text(
      `Contacto: ${props.entidade.email || ''} ${props.entidade.telefone || ''}`.trim().slice(0, 85),
      margin + 3,
      y + 19.2
    );
  }

  y += 26;

  // Items Table
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(255, 255, 255);
  doc.text('CÓD.', margin + 2.5, y + 5);
  doc.text('DESCRIÇÃO DO ARTIGO / SERVIÇO', margin + 18, y + 5);
  doc.text('QTD.', margin + 114, y + 5, { align: 'center' });
  doc.text('PR. UNIT.', margin + 144, y + 5, { align: 'right' });
  doc.text('IVA', margin + 157, y + 5, { align: 'center' });
  doc.text('TOTAL (MT)', margin + width - 2.5, y + 5, { align: 'right' });

  y += 7.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  props.itens.slice(0, 22).forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 7, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 7);
    doc.setTextColor(71, 85, 105);
    doc.text((item.codigo || String(idx + 1).padStart(2, '0')).slice(0, 8), margin + 2.5, y + 4.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.descricao || '').slice(0, 48), margin + 18, y + 4.8);
    doc.text(String(item.quantidade || 1), margin + 114, y + 4.8, { align: 'center' });
    doc.text(fmtNum(item.precoUnitario), margin + 144, y + 4.8, { align: 'right' });
    doc.text(item.taxaIva ? `${item.taxaIva}%` : 'Isento', margin + 157, y + 4.8, { align: 'center' });
    doc.text(fmtNum(item.total), margin + width - 2.5, y + 4.8, { align: 'right' });
    y += 7;
  });

  y += 8;

  // Totals & Extenso
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 23, 42);
  doc.rect(margin, y, 108, 24, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('VALOR POR EXTENSO', margin + 3, y + 5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(numeroParaExtenso(props.valorTotalGeral), 102), margin + 3, y + 10.5);

  const tx = margin + 114;
  const tw = width - 114;
  doc.rect(tx, y, tw, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Total Ilíquido:', tx + 3, y + 5.8);
  doc.text(fmtMzn(props.valorBase), tx + tw - 3, y + 5.8, { align: 'right' });
  doc.text('Total Impostos (IVA):', tx + 3, y + 11.8);
  doc.text(fmtMzn(props.valorIvaTotal), tx + tw - 3, y + 11.8, { align: 'right' });
  doc.setFillColor(15, 23, 42);
  doc.rect(tx, y + 15.5, tw, 8.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DOCUMENTO', tx + 3, y + 21);
  doc.text(fmtMzn(props.valorTotalGeral), tx + tw - 3, y + 21, { align: 'right' });

  y += 30;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, width, 16, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(15, 23, 42);
  doc.text('COORDENADAS BANCÁRIAS & CARTEIRAS MÓVEIS', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  doc.text(
    `${DEFAULT_BANK_ACCOUNTS[0].banco}: NIB ${DEFAULT_BANK_ACCOUNTS[0].nib} | ${DEFAULT_BANK_ACCOUNTS[1].banco}: NIB ${DEFAULT_BANK_ACCOUNTS[1].nib}`,
    margin + 3,
    y + 9.8
  );
  doc.text(
    `M-Pesa: ${DEFAULT_MOBILE_WALLETS.mpesa} | e-Mola: ${DEFAULT_MOBILE_WALLETS.emola}${props.observacoes ? ` | Obs: ${props.observacoes.slice(0, 42)}` : ''}`,
    margin + 3,
    y + 13.8
  );

  drawFooterFrame(doc, props.numeroDocumento, props.valorTotalGeral, props.empresa.nuit);
  return doc.output('blob');
}

// 3. MAPA DE SALÁRIOS MENSAL PDF
export function generateMapaSalariosPdfBlob(
  company: Partial<CompanyData>,
  employees: Employee[],
  period: string
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    company,
    'MAPA DE SALÁRIOS',
    `MS-${period.replace(/[^A-Z0-9]/gi, '').slice(0, 10) || '2026'}`,
    'Período Fiscal',
    period,
    'Colaboradores',
    String(employees.length)
  );

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);
  doc.text('COLABORADOR', margin + 2, y + 5);
  doc.text('SAL. BASE', margin + 88, y + 5, { align: 'right' });
  doc.text('INSS (3%)', margin + 114, y + 5, { align: 'right' });
  doc.text('IRPS', margin + 138, y + 5, { align: 'right' });
  doc.text('INSS (4%)', margin + 160, y + 5, { align: 'right' });
  doc.text('LÍQUIDO', margin + width - 2, y + 5, { align: 'right' });
  y += 7.5;

  let totBase = 0;
  let totInssTrab = 0;
  let totIrps = 0;
  let totInssPat = 0;
  let totLiq = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  employees.forEach((emp, idx) => {
    if (y > 255) return;
    const calc = calcularFolhaSalario(emp.salario_base, 0, emp.numero_dependentes || 0);
    totBase += calc.salarioBase;
    totInssTrab += calc.inssTrabalhador;
    totIrps += calc.irpsConstatado;
    totInssPat += calc.inssEmpresa;
    totLiq += calc.salarioLiquido;

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 6.8, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(emp.nome || '').slice(0, 34), margin + 2, y + 4.6);
    doc.text(fmtNum(calc.salarioBase), margin + 88, y + 4.6, { align: 'right' });
    doc.text(fmtNum(calc.inssTrabalhador), margin + 114, y + 4.6, { align: 'right' });
    doc.text(fmtNum(calc.irpsConstatado), margin + 138, y + 4.6, { align: 'right' });
    doc.text(fmtNum(calc.inssEmpresa), margin + 160, y + 4.6, { align: 'right' });
    doc.text(fmtNum(calc.salarioLiquido), margin + width - 2, y + 4.6, { align: 'right' });
    y += 6.8;
  });

  if (employees.length === 0) {
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Sem colaboradores registados para o período selecionado.', margin + width / 2, y + 6.5, { align: 'center' });
    y += 10;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, width, 8, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.rect(margin, y, width, 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAIS CONSOLIDADOS', margin + 2, y + 5.2);
  doc.text(fmtNum(totBase), margin + 88, y + 5.2, { align: 'right' });
  doc.text(fmtNum(totInssTrab), margin + 114, y + 5.2, { align: 'right' });
  doc.text(fmtNum(totIrps), margin + 138, y + 5.2, { align: 'right' });
  doc.text(fmtNum(totInssPat), margin + 160, y + 5.2, { align: 'right' });
  doc.text(fmtNum(totLiq), margin + width - 2, y + 5.2, { align: 'right' });

  drawFooterFrame(doc, `MAPA-${period}`, totLiq, company.nuit);
  return doc.output('blob');
}

// 4. GUIA DE RECOLHIMENTO INSS (SISSMO) PDF
export function generateGuiaInssPdfBlob(
  company: Partial<CompanyData>,
  employees: Employee[],
  period: string,
  jurosMora = 0,
  multas = 0
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let remun = 0;
  let trab3 = 0;
  let pat4 = 0;
  employees.forEach((emp) => {
    const c = calcularFolhaSalario(emp.salario_base, 0, emp.numero_dependentes || 0);
    remun += c.salarioBase;
    trab3 += c.inssTrabalhador;
    pat4 += c.inssEmpresa;
  });
  const totalContrib = trab3 + pat4;
  const totalPagar = totalContrib + jurosMora + multas;
  const ref = `90244 ${(company.nuit || '4023').slice(0, 4)} 2026`;

  let y = drawHeaderFrame(
    doc,
    company,
    'GUIA INSS / SISSMO',
    ref,
    'Mês de Referência',
    period,
    'Data Limite',
    'Dia 10 mês seg.'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('INSTITUTO NACIONAL DE SEGURANÇA SOCIAL (INSS) — DECLARAÇÃO DE REMUNERAÇÕES', margin, y);
  y += 7;

  const lines = [
    ['Número de Trabalhadores Declarados', String(employees.length)],
    ['Total de Remunerações Tributáveis', fmtMzn(remun)],
    ['Quota do Trabalhador (3,0%)', fmtMzn(trab3)],
    ['Quota da Entidade Empregadora (4,0%)', fmtMzn(pat4)],
    ['Subtotal de Contribuições Sociais (7,0%)', fmtMzn(totalContrib)],
    ['Juros de Mora / Acréscimos', fmtMzn(jurosMora)],
    ['Multas / Penalidades', fmtMzn(multas)]
  ];

  doc.setFontSize(8.5);
  lines.forEach(([k, v], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 8, 'F');
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, width, 8);
    doc.setFont('helvetica', 'normal');
    doc.text(k, margin + 3, y + 5.4);
    doc.setFont('helvetica', 'bold');
    doc.text(v, margin + width - 3, y + 5.4, { align: 'right' });
    y += 8;
  });

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL A RECOLHER AO INSS', margin + 3, y + 6.5);
  doc.text(fmtMzn(totalPagar), margin + width - 3, y + 6.5, { align: 'right' });

  drawFooterFrame(doc, ref, totalPagar, company.nuit);
  return doc.output('blob');
}

// 5. GUIA DE RECOLHIMENTO IRPS MODELO M/19 PDF
export function generateGuiaIrpsPdfBlob(
  company: Partial<CompanyData>,
  employees: Employee[],
  period: string,
  jurosCompensatorios = 0
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let totalIrps = 0;
  let totalBruto = 0;
  employees.forEach((emp) => {
    const c = calcularFolhaSalario(emp.salario_base, 0, emp.numero_dependentes || 0);
    totalBruto += c.salarioBase;
    totalIrps += c.irpsConstatado;
  });
  const totalPagar = totalIrps + jurosCompensatorios;
  const ref = `M19-${(company.nuit || '4023').slice(0, 4)}-2026`;

  let y = drawHeaderFrame(
    doc,
    company,
    'GUIA IRPS MOD. M/19',
    ref,
    'Período Tributário',
    period,
    'Prazo Legal AT',
    'Dia 20 mês seg.'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTORIDADE TRIBUTÁRIA DE MOÇAMBIQUE — RETENÇÃO NA FONTE (IRPS LEI 11/2025)', margin, y);
  y += 7;

  const lines = [
    ['1.ª Categoria — Trabalho Dependente (Massa Salarial)', fmtMzn(totalBruto)],
    ['IRPS Retido na Fonte (Art. 65 CIRPS / Lei 11/2025)', fmtMzn(totalIrps)],
    ['Juros Compensatórios', fmtMzn(jurosCompensatorios)]
  ];

  doc.setFontSize(8.5);
  lines.forEach(([k, v], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 8.5, 'F');
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, width, 8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(k, margin + 3, y + 5.6);
    doc.setFont('helvetica', 'bold');
    doc.text(v, margin + width - 3, y + 5.6, { align: 'right' });
    y += 8.5;
  });

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL IRPS A ENTREGAR (MOD. M/19)', margin + 3, y + 6.5);
  doc.text(fmtMzn(totalPagar), margin + width - 3, y + 6.5, { align: 'right' });

  drawFooterFrame(doc, ref, totalPagar, company.nuit);
  return doc.output('blob');
}

// 6. HISTÓRICO FINANCEIRO ANUAL / PERÍODO PDF
export function generateHistoricoFinanceiroPdfBlob(
  company: Partial<CompanyData>,
  period: string,
  employees: Employee[],
  logs: PaymentLog[]
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    company,
    'HISTÓRICO FINANCEIRO',
    `HF-${Date.now().toString().slice(-6)}`,
    'Período Ativo',
    period,
    'Registos',
    String(logs.length)
  );

  let totalPago = 0;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('COLABORADOR', margin + 2, y + 5);
  doc.text('CARTEIRA / CONTA', margin + 80, y + 5);
  doc.text('PERÍODO', margin + 120, y + 5);
  doc.text('ESTADO', margin + 150, y + 5);
  doc.text('VALOR (MT)', margin + width - 2, y + 5, { align: 'right' });
  y += 7.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  logs.slice(0, 26).forEach((l, idx) => {
    totalPago += Number(l.salarioLiquido || 0);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 6.8, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(l.employeeName || '').slice(0, 32), margin + 2, y + 4.6);
    doc.text(String(l.carteira_movel || 'Banco').slice(0, 18), margin + 80, y + 4.6);
    doc.text(String(l.periodo || period).slice(0, 16), margin + 120, y + 4.6);
    doc.text(String(l.status || 'Liquidado'), margin + 150, y + 4.6);
    doc.text(fmtNum(l.salarioLiquido), margin + width - 2, y + 4.6, { align: 'right' });
    y += 6.8;
  });

  if (logs.length === 0) {
    const resumoSalarios = employees.reduce((acc, e) => acc + Number(e.salario_base || 0), 0);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 12);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Sem liquidações registadas até ao momento. Massa salarial ativa configurada: ${fmtMzn(resumoSalarios)}.`,
      margin + 3,
      y + 7.5
    );
    y += 14;
  }

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 23, 42);
  doc.rect(margin, y, width, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL LIQUIDADO NO HISTÓRICO', margin + 3, y + 5.8);
  doc.text(fmtMzn(totalPago), margin + width - 3, y + 5.8, { align: 'right' });

  drawFooterFrame(doc, `HIST-${period}`, totalPago, company.nuit);
  return doc.output('blob');
}

// 7. EXTRATO DA CARTEIRA FINTECH PDF
export function generateExtratoFintechPdfBlob(
  company: Partial<CompanyData>,
  logs: PaymentLog[],
  saldoDisponivel: number
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    company,
    'EXTRATO FINTECH',
    `EXT-${Date.now().toString().slice(-6)}`,
    'Data Emissão',
    todayPt(),
    'Saldo Atual',
    fmtMzn(saldoDisponivel)
  );

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('REF. TRANSAÇÃO', margin + 2, y + 5);
  doc.text('BENEFICIÁRIO', margin + 38, y + 5);
  doc.text('DESTINO', margin + 106, y + 5);
  doc.text('PERÍODO', margin + 136, y + 5);
  doc.text('VALOR (MT)', margin + width - 2, y + 5, { align: 'right' });
  y += 7.5;

  let tot = 0;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  logs.slice(0, 26).forEach((l, idx) => {
    tot += Number(l.salarioLiquido || 0);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 6.8, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(l.txId || l.id).slice(0, 16), margin + 2, y + 4.6);
    doc.text(String(l.employeeName || '').slice(0, 28), margin + 38, y + 4.6);
    doc.text(String(l.carteira_movel || 'N/D').slice(0, 14), margin + 106, y + 4.6);
    doc.text(String(l.periodo || '').slice(0, 14), margin + 136, y + 4.6);
    doc.text(fmtNum(l.salarioLiquido), margin + width - 2, y + 4.6, { align: 'right' });
    y += 6.8;
  });

  if (logs.length === 0) {
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum movimento de liquidação registado na carteira.', margin + width / 2, y + 6.5, { align: 'center' });
  }

  drawFooterFrame(doc, `EXT-${todayPt()}`, tot || saldoDisponivel, company.nuit);
  return doc.output('blob');
}

// 8. COMPROVATIVO INDIVIDUAL DE VALE / ADIANTAMENTO PDF
export function generateValeComprovativoPdfBlob(
  company: Partial<CompanyData>,
  vale: {
    vale_id: string;
    nome: string;
    valor: number;
    data_lancamento: string;
    status: string;
    telefone_carteira?: string;
  },
  emp?: Employee
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    company,
    'COMPROVATIVO DE VALE',
    vale.vale_id,
    'Data Lançamento',
    (vale.data_lancamento || todayPt()).slice(0, 16),
    'Estado',
    vale.status || 'APROVADO'
  );

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 23, 42);
  doc.rect(margin, y, width, 42, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('RECIBO DE ADIANTAMENTO SALARIAL (VALE DE VENCIMENTO)', margin + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Colaborador Beneficiário: ${vale.nome}`, margin + 4, y + 16);
  doc.text(`Cargo: ${emp?.cargo || 'Colaborador'} | NUIT: ${emp?.nuit || 'N/D'}`, margin + 4, y + 22);
  doc.text(`Carteira Móvel Destino: ${vale.telefone_carteira || emp?.carteira_movel || 'N/D'}`, margin + 4, y + 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Valor Concedido: ${fmtMzn(vale.valor)}`, margin + 4, y + 36);

  y += 48;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    doc.splitTextToSize(
      `Por extenso: ${numeroParaExtenso(vale.valor)}. Este adiantamento será abatido automaticamente no próximo processamento de folha salarial do colaborador, em conformidade com a Lei do Trabalho n.º 13/2023.`,
      width
    ),
    margin,
    y
  );

  drawFooterFrame(doc, vale.vale_id, vale.valor, company.nuit);
  return doc.output('blob');
}

// 9. RELATÓRIO CONSOLIDADO DE VALES PDF
export function generateValesRelatorioPdfBlob(
  company: Partial<CompanyData>,
  vales: Array<{ vale_id: string; nome: string; valor: number; data_lancamento: string; status: string }>
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    company,
    'RELATÓRIO DE VALES',
    `RV-${Date.now().toString().slice(-6)}`,
    'Data Emissão',
    todayPt(),
    'Total Registos',
    String(vales.length)
  );

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CÓD. VALE', margin + 2, y + 5);
  doc.text('COLABORADOR', margin + 36, y + 5);
  doc.text('DATA', margin + 105, y + 5);
  doc.text('ESTADO', margin + 135, y + 5);
  doc.text('VALOR (MT)', margin + width - 2, y + 5, { align: 'right' });
  y += 7.5;

  let tot = 0;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  vales.slice(0, 26).forEach((v, idx) => {
    tot += Number(v.valor || 0);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 6.8, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(v.vale_id || '').slice(0, 15), margin + 2, y + 4.6);
    doc.text(String(v.nome || '').slice(0, 28), margin + 36, y + 4.6);
    doc.text(String(v.data_lancamento || '').slice(0, 12), margin + 105, y + 4.6);
    doc.text(String(v.status || '').slice(0, 16), margin + 135, y + 4.6);
    doc.text(fmtNum(v.valor), margin + width - 2, y + 4.6, { align: 'right' });
    y += 6.8;
  });

  if (vales.length === 0) {
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Sem adiantamentos salariais registados.', margin + width / 2, y + 6.5, { align: 'center' });
    y += 10;
  }

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 23, 42);
  doc.rect(margin, y, width, 8.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL CONSOLIDADO EM ADIANTAMENTOS', margin + 3, y + 5.6);
  doc.text(fmtMzn(tot), margin + width - 3, y + 5.6, { align: 'right' });

  drawFooterFrame(doc, `VALES-${todayPt()}`, tot, company.nuit);
  return doc.output('blob');
}

// 10. AVISO PRÉVIO DE NÃO RENOVAÇÃO DE CONTRATO (LEI 13/2023) PDF
export function generateAvisoPrevioPdfBlob(
  company: Partial<CompanyData>,
  funcionario: { nome: string; cargo: string; inss_numero?: string },
  contrato: { data_fim: string; dia_atual: string; mes_atual: string; ano_atual: string }
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  const width = 178;

  let y = drawHeaderFrame(
    doc,
    company,
    'AVISO PRÉVIO LEGAL',
    `AP-${contrato.ano_atual}-${funcionario.inss_numero || 'MZ'}`,
    'Data Emissão',
    `${contrato.dia_atual} ${contrato.mes_atual} ${contrato.ano_atual}`,
    'Base Legal',
    'Lei 13/2023'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('COMUNICAÇÃO DE NÃO RENOVAÇÃO DE CONTRATO DE TRABALHO', margin + width / 2, y + 4, { align: 'center' });
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const body = [
    `Exmo.(a) Senhor(a) ${funcionario.nome},`,
    `Categoria / Função: ${funcionario.cargo} · Beneficiário INSS n.º ${funcionario.inss_numero || 'Pendente'}`,
    '',
    `Nos termos e para os efeitos do disposto na Lei do Trabalho n.º 13/2023 da República de Moçambique (Artigo 41.º sobre caducidade e denúncia de contratos a prazo certo), a entidade empregadora ${company.nome || 'ClickPay Moçambique, Lda'} (NUIT ${company.nuit || 'N/D'}) vem pela presente comunicar formalmente, com a antecedência legal de 30 (trinta) dias, a sua decisão de NÃO RENOVAR o contrato de trabalho a prazo certo celebrado consigo, cujo termo ocorre no dia ${contrato.data_fim}.`,
    '',
    'Mais se informa que, até à data de cessação, serão apurados todos os direitos laborais devidos nos termos da lei em vigor, incluindo remunerações proporcionais, férias não gozadas e respetiva declaração de situação contributiva.',
    '',
    `${company.provincia || 'Maputo'}, aos ${contrato.dia_atual} de ${contrato.mes_atual} de ${contrato.ano_atual}.`
  ];

  body.forEach((paragraph) => {
    if (!paragraph) {
      y += 4;
      return;
    }
    const lines = doc.splitTextToSize(paragraph, width);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 2;
  });

  y += 18;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 5, y, margin + 75, y);
  doc.line(margin + 100, y, margin + 170, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('A Entidade Empregadora (Assinatura / Carimbo)', margin + 40, y + 5, { align: 'center' });
  doc.text('Recebido pelo(a) Trabalhador(a)', margin + 135, y + 5, { align: 'center' });

  drawFooterFrame(doc, `AP-${funcionario.nome}`, 0, company.nuit);
  return doc.output('blob');
}

// 11. RELATÓRIOS AGRUPADOS E CONTABILIDADE ERP PDF
export function generateRelatorioErpPdfBlob(
  company: Partial<CompanyData>,
  tipo: string,
  periodo: string,
  dados?: { title?: string; rows?: Array<{ col1: string; col2: string; col3: string }> }
): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = 182;

  let y = drawHeaderFrame(
    doc,
    company,
    'RELATÓRIO CONTABILÍSTICO',
    `ERP-${tipo.toUpperCase().slice(0, 10)}`,
    'Período',
    periodo,
    'Norma Contabil.',
    'PGC-NIRF'
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text((dados?.title || `Relatório Contabilístico Agrupado: ${tipo}`).toUpperCase(), margin, y);
  y += 7;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, width, 7.5, 'F');
  doc.setFontSize(7.6);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIÇÃO / CONTA PGC-NIRF', margin + 3, y + 5);
  doc.text('REFERÊNCIA / MOVIMENTO', margin + 112, y + 5);
  doc.text('VALOR (MT)', margin + width - 3, y + 5, { align: 'right' });
  y += 7.5;

  const rows = dados?.rows || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  rows.slice(0, 26).forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, width, 7, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 7);
    doc.setTextColor(15, 23, 42);
    doc.text(String(r.col1 || '').slice(0, 52), margin + 3, y + 4.8);
    doc.text(String(r.col2 || '').slice(0, 24), margin + 112, y + 4.8);
    doc.text(String(r.col3 || ''), margin + width - 3, y + 4.8, { align: 'right' });
    y += 7;
  });

  if (rows.length === 0) {
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, width, 11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Relatório ${tipo} consolidado para o período ${periodo} (0 movimentos adicionais pendentes).`, margin + 3, y + 7);
  }

  drawFooterFrame(doc, `REL-${tipo}-${periodo}`, 0, company.nuit);
  return doc.output('blob');
}

// 12. CSV FALLBACKS (SISSMO & MAPA SALÁRIOS)
export function generateSissmoCsvContent(employees: Employee[]): string {
  let csv = 'N_INSS;NUIT_FUNCIONARIO;NOME_TRABALHADOR;SALARIO_BRUTO;DIAS_FALTAS\n';
  employees.forEach((emp) => {
    const c = calcularFolhaSalario(emp.salario_base, 0, emp.numero_dependentes || 0);
    const inssClean = String(emp.inss_numero || '').replace('INSS-', '');
    csv += `${inssClean};${emp.nuit || ''};${String(emp.nome || '').toUpperCase()};${c.salarioBase.toFixed(2)};0\n`;
  });
  return csv;
}

export function generateMapaSalariosCsvContent(employees: Employee[]): string {
  let csv = 'Nome;Cargo;NUIT;INSS;Salario Base;INSS Trabalhador (3%);IRPS;INSS Patronal (4%);Liquido a Receber\n';
  employees.forEach((emp) => {
    const c = calcularFolhaSalario(emp.salario_base, 0, emp.numero_dependentes || 0);
    csv += `"${emp.nome}";"${emp.cargo}";"${emp.nuit}";"${emp.inss_numero}";${c.salarioBase.toFixed(2)};${c.inssTrabalhador.toFixed(2)};${c.irpsConstatado.toFixed(2)};${c.inssEmpresa.toFixed(2)};${c.salarioLiquido.toFixed(2)}\n`;
  });
  return csv;
}
