/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { PayrollCalculation, CompanyData, Employee } from './types';

/**
 * Generates a polished PDF salary slip for an employee.
 * Utilizes default built-in PDFKit fonts (Helvetica, Helvetica-Bold) for native container rendering.
 */
export function criarReciboSalarioPDF(
  dadosSalario: PayrollCalculation,
  dadosEmpresa: CompanyData,
  dadosFuncionario: Employee,
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // =========================================================================
      // 1. CABEÇALHO CONECTADO AO PERFIL DA EMPRESA E LOGÓTIPO CORPORATIVO
      // =========================================================================
      let textX = 50;
      let drawn = false;

      // Render custom logo if exists and is valid base64 image (PNG/JPEG)
      if (dadosEmpresa.logo && dadosEmpresa.logo.startsWith('data:image/')) {
        try {
          const parts = dadosEmpresa.logo.split(';base64,');
          const mime = parts[0];
          const base64Data = parts[1];
          if (base64Data && (mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg'))) {
            const buffer = Buffer.from(base64Data, 'base64');
            doc.image(buffer, 50, 45, { width: 45 });
            textX = 110;
            drawn = true;
          }
        } catch (err) {
          console.error("Error drawing logo in PDF:", err);
        }
      }

      // Fallback to logo-payroll.png
      if (!drawn) {
        try {
          const caminhoLogotipo = path.join(__dirname, '..', 'public', 'logo-payroll.png');
          const caminhoAlternativo = path.join(process.cwd(), 'public', 'logo-payroll.png');
          
          if (fs.existsSync(caminhoLogotipo)) {
            doc.image(caminhoLogotipo, 50, 45, { width: 45 });
            textX = 110;
          } else if (fs.existsSync(caminhoAlternativo)) {
            doc.image(caminhoAlternativo, 50, 45, { width: 45 });
            textX = 110;
          }
        } catch (err) {
          console.error("Error drawing logo-payroll in PDF:", err);
        }
      }

      const nomeEmpresa = (
        dadosEmpresa.nome || 
        (dadosEmpresa as any).nome_comercial || 
        'Mercearia do Povo Lda'
      ).toUpperCase();

      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text(nomeEmpresa, textX, 45);
      
      const nuitEmp = (dadosEmpresa as any).identificadores_legais?.nuit || dadosEmpresa.nuit || 'N/A';
      const nuelEmp = (dadosEmpresa as any).identificadores_legais?.nuel || dadosEmpresa.nuel || 'N/A';
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
      doc.text(`NUIT: ${nuitEmp}  |  NUEL: ${nuelEmp}`, textX, 60);

      const dist = (dadosEmpresa as any).localizacao?.distrito || dadosEmpresa.distrito || 'Maputo';
      const prov = (dadosEmpresa as any).localizacao?.provincia || dadosEmpresa.provincia || 'Maputo Cidade';
      const localizacaoSede = `${dist}, ${prov}`;
      const regimeIvaStr = (dadosEmpresa as any).enquadramento_fiscal?.regime || dadosEmpresa.regime_iva || 'IVA Normal';
      doc.text(`Regime de IVA: ${regimeIvaStr}  |  Sede: ${localizacaoSede}, Moçambique`, textX, 74);

      const emailEmp = (dadosEmpresa as any).contacto?.email || dadosEmpresa.email || 'N/A';
      const telfEmp = (dadosEmpresa as any).contacto?.telefone || dadosEmpresa.telefone || 'N/A';
      doc.text(`Contacto: ${emailEmp}  |  Tel: ${telfEmp}`, textX, 88);

      // Linha de separação estética do cabeçalho institucional
      doc.moveTo(50, 105).lineTo(545, 105).stroke('#e2e8f0');
      let currentY = 120;

      // =========================================================================
      // 2. TÍTULO DO DOCUMENTO DE PAYROLL
      // =========================================================================
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text('RECIBO DE VENCIMENTO / FOLHA DE SALÁRIO', 50, currentY, { align: 'center' });
      currentY += 16;
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Período de Processamento: ${dadosSalario.periodo}`, 50, currentY, { align: 'center' });
      currentY += 20;

      // =========================================================================
      // 3. QUADRO DE INFORMAÇÕES DO TRABALHADOR
      // =========================================================================
      const topoQuadroTrabalhador = currentY;
      doc.rect(50, topoQuadroTrabalhador, 495, 55).stroke('#cbd5e1');

      doc.fontSize(9).font('Helvetica').fillColor('#111827');
      doc.text(` Funcionário: ${dadosFuncionario.nome.toUpperCase()}`, 55, topoQuadroTrabalhador + 8);
      doc.text(` Cargo / Função: ${dadosFuncionario.cargo}  |  Nº Beneficiário INSS: ${dadosFuncionario.inss_numero}`, 55, topoQuadroTrabalhador + 23);

      // Exibe o número de dependentes que dão direito ao abatimento do IRPS
      const dependentesTexto = dadosFuncionario.numero_dependentes >= 4 ? "4 ou mais" : dadosFuncionario.numero_dependentes;
      doc.font('Helvetica-Oblique').fillColor('#475569').text(` N.º Dependentes IRPS: ${dependentesTexto}  |  NUIT do Trabalhador: ${dadosFuncionario.nuit || 'N/A'}`, 55, topoQuadroTrabalhador + 38);
      currentY += 75;

      // =========================================================================
      // 4. TABELA DE VENCIMENTOS E DESCONTOS FISCAIS (ORDEM LEGAL)
      // =========================================================================
      const topoTabela = currentY;
      doc.font('Helvetica-Bold').fillColor('#111827').text('Descrição dos Elementos Salariais', 55, topoTabela);
      doc.text('Vencimentos (MT)', 250, topoTabela, { width: 120, align: 'right' });
      doc.text('Descontos (MT)', 400, topoTabela, { width: 120, align: 'right' });

      doc.moveTo(50, topoTabela + 14).lineTo(545, topoTabela + 14).stroke('#cbd5e1');
      doc.font('Helvetica');

      // Linha: Salário Base Bruto
      let yLinha = topoTabela + 24;
      doc.text('Salário Base Contratual', 55, yLinha);
      doc.text(dadosSalario.salarioBase.toFixed(2), 250, yLinha, { width: 120, align: 'right' });

      // Linha Opcional: Desconto de Faltas Comerciais (Lei nº 13/2023)
      if (dadosSalario.descontoFaltas > 0) {
        yLinha += 16;
        doc.text(`Desconto de Faltas Autorizadas/Injustificadas (${dadosSalario.diasFaltas} dias)`, 55, yLinha);
        doc.text(dadosSalario.descontoFaltas.toFixed(2), 400, yLinha, { width: 120, align: 'right' });
      }

      // Linha: Desconto INSS Trabalhador (3%)
      yLinha += 16;
      doc.text('Segurança Social Obrigatória (INSS - 3%)', 55, yLinha);
      doc.text(dadosSalario.inssTrabalhador.toFixed(2), 400, yLinha, { width: 120, align: 'right' });

      // Linha: Retenção na Fonte de IRPS (Com dedução por dependentes subtraída)
      const irpsValue = dadosSalario.irpsConstatado !== undefined ? dadosSalario.irpsConstatado : 0;
      yLinha += 16;
      doc.text('Retenção na Fonte de Imposto (IRPS)', 55, yLinha);
      doc.text(irpsValue.toFixed(2), 400, yLinha, { width: 120, align: 'right' });

      // Linha: Desconto de Vales / Adiantamento (Dedução Adicional)
      const valesValue = dadosSalario.descontoVales || 0;
      if (valesValue > 0) {
        yLinha += 16;
        doc.text('Desconto de Vales / Adiantamento', 55, yLinha);
        doc.text(valesValue.toFixed(2), 400, yLinha, { width: 120, align: 'right' });
      }

      doc.moveTo(50, yLinha + 18).lineTo(545, yLinha + 18).stroke('#cbd5e1');

      // =========================================================================
      // 5. RESUMO DE TOTAIS E CAIXA DE LÍQUIDO DA FINTECH
      // =========================================================================
      yLinha += 32;
      doc.font('Helvetica-Bold');
      doc.text('Total de Rendimentos Ilíquidos:', 55, yLinha);
      doc.text(dadosSalario.salarioBase.toFixed(2), 250, yLinha, { width: 120, align: 'right' });

      doc.text('Total de Descontos Efetuados:', 55, yLinha + 16);
      doc.text(dadosSalario.totalDescontos.toFixed(2), 400, yLinha + 16, { width: 120, align: 'right' });

      // Bloco Destacado Cinzento para o Salário Líquido Disponibilizado no M-Pesa
      const yCaixaLiquido = yLinha + 40;
      doc.rect(50, yCaixaLiquido, 495, 28).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#0f172a').text('VALOR LÍQUIDO DISPENSADO E PAGO VIA FINTECH:', 60, yCaixaLiquido + 9);
      doc.fontSize(10).fillColor('#059669').text(`${dadosSalario.salarioLiquido.toFixed(2)} MT`, 400, yCaixaLiquido + 9, { width: 120, align: 'right' });

      // =========================================================================
      // 6. ÁREA DE VALIDAÇÃO E ASSINATURAS MANUAIS
      // =========================================================================
      doc.fontSize(9).font('Helvetica').fillColor('#475569');
      doc.text('________________________________________', 55, 690);
      doc.text('Carimbo e Assinatura da Entidade', 100, 705);

      doc.text('________________________________________', 330, 690);
      doc.text('Assinatura do(a) Trabalhador(a)', 375, 705);

      // Software de Faturação Certificado nº 01/AT/2026. PRIMAVERA ERP V10
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94a3b8');
      doc.text('Emitido por PRIMAVERA ERP V10 | Software de Faturação Certificado nº 01/AT/2026 | Processado por Computador', 50, 755, { align: 'center', width: 495 });

      // Finaliza a renderização e fecha a transmissão do arquivo
      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera o documento de Aviso Prévio em PDF em conformidade com a Lei nº 13/2023
 * @param dadosEmpresa - { nome, nuit, endereco }
 * @param dadosFuncionario - { nome, cargo, inss_numero }
 * @param dadosContrato - { data_fim, dia_atual, mes_atual, ano_atual }
 * @param caminhoFicheiro - Caminho físico onde o PDF será guardado
 */
export function criarAvisoPrevioPDF(
  dadosEmpresa: { nome: string; nuit: string; endereco: string },
  dadosFuncionario: { nome: string; cargo: string; inss_numero: string },
  dadosContrato: { data_fim: string; dia_atual: string; mes_atual: string; ano_atual: string },
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // --- LOGOTIPO / CABEÇALHO DA EMPRESA CLIENTE ---
      doc.fontSize(14).font('Helvetica-Bold').text(dadosEmpresa.nome.toUpperCase(), { align: 'left' });
      doc.fontSize(10).font('Helvetica').text(`NUIT: ${dadosEmpresa.nuit} | Endereço: ${dadosEmpresa.endereco}`);
      
      // Linha divisória de cabeçalho
      doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).stroke('#e2e8f0');
      doc.moveDown(2);

      // --- DATA DE EMISSÃO ---
      doc.fontSize(11).font('Helvetica').text(`Maputo, ${dadosContrato.dia_atual} de ${dadosContrato.mes_atual} de ${dadosContrato.ano_atual}`, { align: 'right' });
      doc.moveDown(2);

      // --- DESTINATÁRIO ---
      doc.font('Helvetica-Bold').text('Ao(À) Senhor(a):');
      doc.font('Helvetica-Bold').fillColor('#1e3a8a').text(dadosFuncionario.nome.toUpperCase());
      doc.font('Helvetica').fillColor('#000000').text(`Cargo / Função: ${dadosFuncionario.cargo}`);
      doc.text(`N.º Beneficiário INSS: ${dadosFuncionario.inss_numero}`);
      doc.moveDown(2);

      // --- ASSUNTO ---
      doc.font('Helvetica-Bold').text('ASSUNTO: AVISO PRÉVIO DE NÃO RENOVAÇÃO / CADUCIDADE DE CONTRATO DE TRABALHO A PRAZO', { align: 'left' });
      doc.font('Helvetica-Bold').fillColor('#b91c1c').text('(ARTIGO 41 DA LEI N.º 13/2023)', { align: 'left' });
      doc.fillColor('#000000').moveDown(1.5);

      // --- CORPO DO TEXTO JURÍDICO ---
      doc.font('Helvetica').fontSize(11).text('Prezado(a) Colaborador(a),', { align: 'justify' });
      doc.moveDown(0.5);

      const textoCorpo = `Serve a presente comunicação por escrito para notificá-lo(a) formalmente, com a antecedência legal obrigatória de 30 (trinta) dias prevista no Artigo 41 da Lei do Trabalho em vigor na República de Moçambique (Lei n.º 13/2023), que a ${dadosEmpresa.nome} decidiu não proceder à renovação do Contrato de Trabalho a Prazo Certo outorgado entre ambas as partes.`;
      doc.text(textoCorpo, { align: 'justify', lineGap: 4 });
      doc.moveDown(1);

      const textoCorpo2 = `Deste modo, o vínculo laboral estabelecido cessará definitivamente na data de caducidade contratual prevista, isto é, no dia ${dadosContrato.data_fim}, sendo este o seu último dia de prestação de serviços à nossa instituição.`;
      doc.text(textoCorpo2, { align: 'justify', lineGap: 4 });
      doc.moveDown(1);

      const textoCorpo3 = `Mais informamos que, na referida data ou no período legal subsequente, ser-lhe-á disponibilizado o respetivo Certificado de Trabalho, bem como a liquidação e o pagamento de todos os direitos financeiros devidos nos termos da legislação laboral moçambicana aplicável.`;
      doc.text(textoCorpo3, { align: 'justify', lineGap: 4 });
      doc.moveDown(1);

      const textoCorpo4 = `Aproveitamos a oportunidade para agradecer publicamente todo o empenho, dedicação e profissionalismo demonstrados ao longo do período em que colaborou com a nossa equipa, desejando-lhe os maiores sucessos na sua carreira profissional.`;
      doc.text(textoCorpo4, { align: 'justify', lineGap: 4 });
      doc.moveDown(2);

      doc.text('Sem outro assunto de momento, subscrevemo-nos com elevada consideração.', { align: 'justify' });
      doc.moveDown(2);

      // --- ASSINATURA DA EMPRESA ---
      doc.text('Pela Direção / Recursos Humanos,', { align: 'left' });
      doc.moveDown(2);
      doc.text('_____________________________________________________', { align: 'left' });
      doc.font('Helvetica-Bold').text(`[Assinatura e Carimbo da ${dadosEmpresa.nome}]`, { align: 'left' });
      doc.font('Helvetica').text('Direção de Recursos Humanos', { align: 'left' });

      // --- LINHA DE SERRILHA PARA PROTOCOLO ---
      doc.moveDown(3);
      doc.text('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', { align: 'center' });
      doc.moveDown(1);

      // --- PROTOCOLO DE RECEÇÃO ---
      doc.font('Helvetica-Bold').text('PROTOCOLO DE RECEÇÃO (CÓPIA DA EMPRESA)', { align: 'center' });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10).text('Declaro que tomei conhecimento e recebi o original da presente notificação de Aviso Prévio na data abaixo indicada.', { align: 'justify' });
      doc.moveDown(2);

      // Linhas finais de assinatura do trabalhador
      const yAssinatura = doc.y;
      doc.text('Data: ____ / ____ / ________', 50, yAssinatura);
      doc.text('___________________________________________', 280, yAssinatura);
      doc.text('Assinatura do(a) Trabalhador(a)', 340, yAssinatura + 15);

      // Finaliza o documento
      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera o extrato de transações fintech em PDF
 */
export function criarExtratoFintechPDF(
  dadosEmpresa: { nome: string; nuit: string; endereco: string },
  logs: any[],
  saldoDisponivel: number,
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // --- LOGOTIPO / CABEÇALHO ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a8a').text(dadosEmpresa.nome.toUpperCase(), { align: 'left' });
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`NUIT: ${dadosEmpresa.nuit} | Endereço: ${dadosEmpresa.endereco}`);
      doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).stroke('#e2e8f0');
      doc.moveDown(1.5);

      // --- DATA ---
      doc.fontSize(10).font('Helvetica').text(`Emissão: ${new Date().toLocaleDateString('pt-MZ')} às ${new Date().toLocaleTimeString('pt-MZ')}`, { align: 'right' });
      doc.moveDown(1.5);

      // --- TÍTULO ---
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('EXTRATO DA CARTEIRA FINTECH PAYROLL', { align: 'center' });
      doc.moveDown(1);

      // --- RESUMO DO SALDO ---
      const topoResumo = doc.y;
      doc.rect(50, topoResumo, 495, 45).fill('#f8fafc').stroke('#e2e8f0');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a').text('SALDO DISPONÍVEL NA CARTEIRA:', 65, topoResumo + 18);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#059669').text(`${saldoDisponivel.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, 380, topoResumo + 17, { width: 150, align: 'right' });
      doc.moveDown(3.5);

      // --- TABELA DE TRANSAÇÕES ---
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Histórico de Movimentações da Carteira', 50, doc.y);
      doc.moveDown(0.5);

      const topoTabela = doc.y;
      doc.rect(50, topoTabela, 495, 20).fill('#1e3a8a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('Ref. ID / TX', 55, topoTabela + 6);
      doc.text('Data', 140, topoTabela + 6);
      doc.text('Descrição / Beneficiário', 210, topoTabela + 6);
      doc.text('Período', 385, topoTabela + 6);
      doc.text('Valor Pago (MT)', 465, topoTabela + 6, { width: 75, align: 'right' });

      doc.font('Helvetica').fillColor('#334155');
      let yLinha = topoTabela + 20;

      if (!logs || logs.length === 0) {
        yLinha += 10;
        doc.fontSize(9).text('Nenhum pagamento ou movimentação registrada até ao momento.', 55, yLinha, { align: 'center', width: 485 });
      } else {
        logs.forEach((log, index) => {
          // Check for page overflow
          if (yLinha > 720) {
            doc.addPage();
            yLinha = 50;
            // Draw table header again on new page
            doc.rect(50, yLinha, 495, 20).fill('#1e3a8a');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
            doc.text('Ref. ID / TX', 55, yLinha + 6);
            doc.text('Data', 140, yLinha + 6);
            doc.text('Descrição / Beneficiário', 210, yLinha + 6);
            doc.text('Período', 385, yLinha + 6);
            doc.text('Valor Pago (MT)', 465, yLinha + 6, { width: 75, align: 'right' });
            
            doc.font('Helvetica').fillColor('#334155');
            yLinha += 20;
          }

          // Alternating row background
          if (index % 2 === 1) {
            doc.rect(50, yLinha, 495, 20).fill('#f8fafc').stroke('transparent');
          }

          doc.fontSize(8).fillColor('#334155');
          doc.text(log.txId || log.id || 'N/A', 55, yLinha + 6);
          
          const dataFormatada = log.timestamp ? new Date(log.timestamp).toLocaleDateString('pt-MZ') : new Date().toLocaleDateString('pt-MZ');
          doc.text(dataFormatada, 140, yLinha + 6);
          doc.text(log.employeeName || 'Carregamento / Outro', 210, yLinha + 6, { width: 170 });
          doc.text(log.periodo || 'N/A', 385, yLinha + 6);
          doc.text(Number(log.salarioLiquido).toFixed(2), 465, yLinha + 6, { width: 75, align: 'right' });

          yLinha += 20;
        });
      }

      // Finaliza o documento
      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera o relatório de Auditoria Interna de Remunerações em PDF
 */
export function criarRelatorioAuditoriaPDF(
  dadosEmpresa: { nome: string; nuit: string; endereco: string },
  dadosAuditoria: {
    periodoPesquisado: string;
    auditoriaGeral: {
      totalPagoFuncionarios: number;
      totalRetidoINSS: number;
      totalRetidoIRPS: number;
      totalTransacoesProcessadas: number;
    };
    detalhesPorTrabalhador: any[];
  },
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // --- LOGOTIPO / CABEÇALHO ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a8a').text(dadosEmpresa.nome.toUpperCase(), { align: 'left' });
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`NUIT: ${dadosEmpresa.nuit} | Endereço: ${dadosEmpresa.endereco}`);
      doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).stroke('#e2e8f0');
      doc.moveDown(1.5);

      // --- DATA ---
      doc.fontSize(10).font('Helvetica').text(`Emissão: ${new Date().toLocaleDateString('pt-MZ')} às ${new Date().toLocaleTimeString('pt-MZ')}`, { align: 'right' });
      doc.moveDown(1.5);

      // --- TÍTULO ---
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('AUDITORIA INTERNA DE REMUNERAÇÕES', { align: 'center' });
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#475569').text(`Período de Referência: ${dadosAuditoria.periodoPesquisado}`, { align: 'center' });
      doc.moveDown(1.5);

      // --- QUADRO RESUMO (KPI CARDS) ---
      const topoKpis = doc.y;
      doc.rect(50, topoKpis, 495, 60).fill('#f8fafc').stroke('#e2e8f0');
      
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569');
      doc.text('TOTAL PAGO LÍQUIDO', 60, topoKpis + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#059669').text(`${dadosAuditoria.auditoriaGeral.totalPagoFuncionarios.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, 60, topoKpis + 25);

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569');
      doc.text('INSS RETIDO ACUMULADO', 195, topoKpis + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text(`${dadosAuditoria.auditoriaGeral.totalRetidoINSS.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, 195, topoKpis + 25);

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569');
      doc.text('IRPS RETIDO ACUMULADO', 330, topoKpis + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text(`${dadosAuditoria.auditoriaGeral.totalRetidoIRPS.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, 330, topoKpis + 25);

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569');
      doc.text('TRANSAÇÕES', 465, topoKpis + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(String(dadosAuditoria.auditoriaGeral.totalTransacoesProcessadas), 465, topoKpis + 25);

      doc.moveDown(4.5);

      // --- TABELA DETALHADA ---
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Detalhamento Técnico de Descontos e Pagamentos', 50, doc.y);
      doc.moveDown(0.5);

      const topoTabela = doc.y;
      doc.rect(50, topoTabela, 495, 20).fill('#1e3a8a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('Ref. Transação', 55, topoTabela + 6);
      doc.text('Funcionário / Telefone', 135, topoTabela + 6);
      doc.text('INSS Retido (3%)', 285, topoTabela + 6, { width: 80, align: 'right' });
      doc.text('IRPS Retido', 375, topoTabela + 6, { width: 80, align: 'right' });
      doc.text('Líquido Pago', 465, topoTabela + 6, { width: 75, align: 'right' });

      doc.font('Helvetica').fillColor('#334155');
      let yLinha = topoTabela + 20;

      if (!dadosAuditoria.detalhesPorTrabalhador || dadosAuditoria.detalhesPorTrabalhador.length === 0) {
        yLinha += 10;
        doc.fontSize(9).text('Nenhum registro consolidado encontrado para este período.', 55, yLinha, { align: 'center', width: 485 });
      } else {
        dadosAuditoria.detalhesPorTrabalhador.forEach((det, index) => {
          // Check for page overflow
          if (yLinha > 720) {
            doc.addPage();
            yLinha = 50;
            // Draw table header again on new page
            doc.rect(50, yLinha, 495, 20).fill('#1e3a8a');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
            doc.text('Ref. Transação', 55, yLinha + 6);
            doc.text('Funcionário / Telefone', 135, yLinha + 6);
            doc.text('INSS Retido (3%)', 285, yLinha + 6, { width: 80, align: 'right' });
            doc.text('IRPS Retido', 375, yLinha + 6, { width: 80, align: 'right' });
            doc.text('Líquido Pago', 465, yLinha + 6, { width: 75, align: 'right' });
            
            doc.font('Helvetica').fillColor('#334155');
            yLinha += 20;
          }

          // Alternating row background
          if (index % 2 === 1) {
            doc.rect(50, yLinha, 495, 20).fill('#f8fafc').stroke('transparent');
          }

          doc.fontSize(8).fillColor('#334155');
          doc.text(det.id_transacao || 'N/A', 55, yLinha + 6);
          doc.text(`${det.funcionario}\n${det.carteira || ''}`, 135, yLinha + 3, { width: 145 });
          doc.text(Number(det.inss).toFixed(2) + ' MT', 285, yLinha + 6, { width: 80, align: 'right' });
          doc.text(Number(det.irps).toFixed(2) + ' MT', 375, yLinha + 6, { width: 80, align: 'right' });
          doc.text(Number(det.liquido).toFixed(2) + ' MT', 465, yLinha + 6, { width: 75, align: 'right' });

          yLinha += 24;
        });
      }

      // Finaliza o documento
      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera o recibo individual de Adiantamento de Salário (Vale) em PDF
 */
export function criarReciboValePDF(
  dadosEmpresa: { nome: string; nuit: string; endereco: string },
  vale: { vale_id: string; nome: string; cargo?: string; carteira_movel: string; valor: number; data_lancamento: string; status: string },
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // --- CABEÇALHO ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a8a').text(dadosEmpresa.nome.toUpperCase(), { align: 'left' });
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`NUIT: ${dadosEmpresa.nuit} | Endereço: ${dadosEmpresa.endereco}`);
      doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).stroke('#e2e8f0');
      doc.moveDown(1.5);

      // --- DATA ---
      doc.fontSize(10).font('Helvetica').text(`Emissão: ${new Date().toLocaleDateString('pt-MZ')} às ${new Date().toLocaleTimeString('pt-MZ')}`, { align: 'right' });
      doc.moveDown(1.5);

      // --- TÍTULO ---
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('COMPROVATIVO DE ADIANTAMENTO SALARIAL (VALE)', { align: 'center' });
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#475569').text(`Código de Referência: ${vale.vale_id}`, { align: 'center' });
      doc.moveDown(1.5);

      // --- QUADRO DO BENEFICIÁRIO ---
      const topoQuadro = doc.y;
      doc.rect(50, topoQuadro, 495, 120).fill('#f8fafc').stroke('#e2e8f0');
      
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a8a').text('DADOS DO BENEFICIÁRIO:', 65, topoQuadro + 12);
      
      doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
      doc.text('Nome do Colaborador:', 65, topoQuadro + 32);
      doc.font('Helvetica-Bold').text(vale.nome.toUpperCase(), 190, topoQuadro + 32);
      
      doc.font('Helvetica').text('Cargo / Função:', 65, topoQuadro + 48);
      doc.font('Helvetica-Bold').text(vale.cargo || 'Não especificado', 190, topoQuadro + 48);
      
      doc.font('Helvetica').text('Carteira de Pagamento:', 65, topoQuadro + 64);
      doc.font('Helvetica-Bold').text(vale.carteira_movel, 190, topoQuadro + 64);

      doc.font('Helvetica').text('Data de Lançamento:', 65, topoQuadro + 80);
      doc.font('Helvetica-Bold').text(vale.data_lancamento, 190, topoQuadro + 80);

      doc.font('Helvetica').text('Estado do Desconto:', 65, topoQuadro + 96);
      const labelStatus = vale.status === "APROVADO_E_TRANSFERIDO" ? 'Pendente de Abate na Folha' : 'Já Abatido / Processado';
      doc.font('Helvetica-Bold').fillColor(vale.status === "APROVADO_E_TRANSFERIDO" ? '#b45309' : '#047857').text(labelStatus, 190, topoQuadro + 96);

      doc.moveDown(4.5);

      // --- QUADRO DO VALOR ---
      const topoValor = doc.y;
      doc.rect(50, topoValor, 495, 45).fill('#eff6ff').stroke('#bfdbfe');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a').text('VALOR ADIANTADO INTEGRAL:', 65, topoValor + 18);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text(`${vale.valor.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, 380, topoValor + 17, { width: 150, align: 'right' });
      
      doc.moveDown(3.5);

      // --- NOTA LEGAL JURÍDICA ---
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text('Declaração de Consentimento de Desconto Automático:', 50, doc.y, { underline: true });
      doc.moveDown(0.5);
      
      const textoDeclaracao = `Declaramos que o colaborador acima identificado recebeu, a título de adiantamento de salário (vale) a meio do mês, o montante indicado neste comprovativo através de transferência imediata de fundos para a sua conta de carteira móvel associada no ERP.

Nos termos do artigo 113 da Lei do Trabalho vigente em Moçambique, o colaborador concorda e autoriza expressamente o desconto integral de ${vale.valor.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT do seu salário líquido final referente ao processamento da folha salarial subsequente, sem necessidade de notificações adicionais.`;

      doc.fontSize(8.5).font('Helvetica').text(textoDeclaracao, 50, doc.y, { align: 'justify', lineGap: 3 });
      doc.moveDown(4);

      // --- ASSINATURAS ---
      const topoAssinaturas = doc.y;
      doc.moveTo(50, topoAssinaturas + 35).lineTo(230, topoAssinaturas + 35).stroke('#94a3b8');
      doc.moveTo(365, topoAssinaturas + 35).lineTo(545, topoAssinaturas + 35).stroke('#94a3b8');

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
      doc.text('PELO COLABORADOR', 50, topoAssinaturas + 40, { width: 180, align: 'center' });
      doc.text('PELA ADMINISTRAÇÃO / RH', 365, topoAssinaturas + 40, { width: 180, align: 'center' });

      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#94a3b8');
      doc.text('(Assinatura e Impressão Digital)', 50, topoAssinaturas + 50, { width: 180, align: 'center' });
      doc.text('(Assinado Digitalmente no ERP)', 365, topoAssinaturas + 50, { width: 180, align: 'center' });

      // Software de Faturação Certificado nº 01/AT/2026. PRIMAVERA ERP V10
      doc.moveDown(2);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#cbd5e1');
      doc.text('Emitido por PRIMAVERA ERP V10 | Software de Faturação Certificado nº 01/AT/2026 | Processado por Computador', 50, doc.y, { align: 'center', width: 495 });

      // Finaliza o documento
      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera o relatório consolidado de todos os adiantamentos e vales em PDF
 */
export function criarRelatorioValesPDF(
  dadosEmpresa: { nome: string; nuit: string; endereco: string },
  vales: any[],
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // --- CABEÇALHO ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a8a').text(dadosEmpresa.nome.toUpperCase(), { align: 'left' });
      doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`NUIT: ${dadosEmpresa.nuit} | Endereço: ${dadosEmpresa.endereco}`);
      doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).stroke('#e2e8f0');
      doc.moveDown(1.5);

      // --- DATA ---
      doc.fontSize(10).font('Helvetica').text(`Emissão: ${new Date().toLocaleDateString('pt-MZ')} às ${new Date().toLocaleTimeString('pt-MZ')}`, { align: 'right' });
      doc.moveDown(1.5);

      // --- TÍTULO ---
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#111827').text('RELATÓRIO CONSOLIDADO DE ADIANTAMENTOS E VALES', { align: 'center' });
      doc.moveDown(1.5);

      // --- RESUMO DO SALDO ---
      const totalVales = vales.reduce((soma, v) => soma + Number(v.valor), 0);
      const valesPendentes = vales.filter(v => v.status === "APROVADO_E_TRANSFERIDO").length;

      const topoResumo = doc.y;
      doc.rect(50, topoResumo, 495, 45).fill('#f8fafc').stroke('#e2e8f0');
      
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569');
      doc.text('TOTAL DE VALES CONCEDIDOS', 65, topoResumo + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text(`${totalVales.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`, 65, topoResumo + 24);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569');
      doc.text('VALES PENDENTES DE ABATE', 230, topoResumo + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#b45309').text(`${valesPendentes} Vales`, 230, topoResumo + 24);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569');
      doc.text('TOTAL DE TRANSAÇÕES', 390, topoResumo + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(`${vales.length} Registos`, 390, topoResumo + 24);

      doc.moveDown(4.5);

      // --- TABELA ---
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Listagem Técnica de Adiantamentos Concedidos', 50, doc.y);
      doc.moveDown(0.5);

      const topoTabela = doc.y;
      doc.rect(50, topoTabela, 495, 20).fill('#1e3a8a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('Cód. Vale', 55, topoTabela + 6);
      doc.text('Colaborador / Contacto', 135, topoTabela + 6);
      doc.text('Data Lançamento', 290, topoTabela + 6);
      doc.text('Estado de Desconto', 380, topoTabela + 6);
      doc.text('Valor Concedido', 465, topoTabela + 6, { width: 75, align: 'right' });

      doc.font('Helvetica').fillColor('#334155');
      let yLinha = topoTabela + 20;

      if (!vales || vales.length === 0) {
        yLinha += 10;
        doc.fontSize(9).text('Nenhum adiantamento registado até ao momento.', 55, yLinha, { align: 'center', width: 485 });
      } else {
        vales.forEach((v, index) => {
          // Check for page overflow
          if (yLinha > 720) {
            doc.addPage();
            yLinha = 50;
            // Draw table header again on new page
            doc.rect(50, yLinha, 495, 20).fill('#1e3a8a');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
            doc.text('Cód. Vale', 55, yLinha + 6);
            doc.text('Colaborador / Contacto', 135, yLinha + 6);
            doc.text('Data Lançamento', 290, yLinha + 6);
            doc.text('Estado de Desconto', 380, yLinha + 6);
            doc.text('Valor Concedido', 465, yLinha + 6, { width: 75, align: 'right' });
            
            doc.font('Helvetica').fillColor('#334155');
            yLinha += 20;
          }

          // Alternating row background
          if (index % 2 === 1) {
            doc.rect(50, yLinha, 495, 20).fill('#f8fafc').stroke('transparent');
          }

          doc.fontSize(8).fillColor('#334155');
          doc.text(v.vale_id || `VALE-${index}`, 55, yLinha + 6);
          doc.text(`${v.nome}\n${v.carteira_movel || 'Carteira Móvel'}`, 135, yLinha + 3, { width: 145 });
          doc.text(v.data_lancamento, 290, yLinha + 6);
          
          const txtStatus = v.status === "APROVADO_E_TRANSFERIDO" ? 'Pendente Folha' : 'Abatido / Pago';
          doc.text(txtStatus, 380, yLinha + 6);
          
          doc.text(Number(v.valor).toFixed(2) + ' MT', 465, yLinha + 6, { width: 75, align: 'right' });

          yLinha += 24;
        });
      }

      // Finaliza o documento
      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera o Mapa de Salários Mensal em formato PDF (Layout Paisagem A4)
 */
export function criarMapaSalariosPDF(
  dadosEmpresa: any,
  listaCalculos: any[],
  periodo: string,
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // --- LOGOTIPO / CABEÇALHO ---
      let textX = 40;
      let drawn = false;
      if (dadosEmpresa.logo && dadosEmpresa.logo.startsWith('data:image/')) {
        try {
          const parts = dadosEmpresa.logo.split(';base64,');
          const mime = parts[0];
          const base64Data = parts[1];
          if (base64Data && (mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg'))) {
            const buffer = Buffer.from(base64Data, 'base64');
            doc.image(buffer, 40, 35, { width: 35 });
            textX = 100;
            drawn = true;
          }
        } catch (err) {
          console.error("Erro ao desenhar logotipo no PDF do mapa de salários:", err);
        }
      }

      if (!drawn) {
        try {
          const caminhoLogotipo = path.join(__dirname, '..', 'public', 'logo-payroll.png');
          const caminhoAlternativo = path.join(process.cwd(), 'public', 'logo-payroll.png');
          if (fs.existsSync(caminhoLogotipo)) {
            doc.image(caminhoLogotipo, 40, 35, { width: 35 });
            textX = 100;
          } else if (fs.existsSync(caminhoAlternativo)) {
            doc.image(caminhoAlternativo, 40, 35, { width: 35 });
            textX = 100;
          }
        } catch (err) {
          console.error("Erro ao desenhar logotipo default no PDF do mapa de salários:", err);
        }
      }

      const nomeEmpresa = (dadosEmpresa.nome || dadosEmpresa.nome_comercial || 'Empresa Cliente').toUpperCase();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text(nomeEmpresa, textX, 35);
      
      doc.fontSize(8).font('Helvetica').fillColor('#475569');
      const nuitEmp = dadosEmpresa.nuit || 'N/A';
      const nuelEmp = dadosEmpresa.nuel || 'N/A';
      const localSede = `${dadosEmpresa.distrito || 'Maputo'}, ${dadosEmpresa.provincia || 'Maputo Cidade'}`;
      doc.text(`NUIT: ${nuitEmp}  |  NUEL: ${nuelEmp}  |  Sede: ${localSede}, Moçambique`, textX, 50);

      // Linha de separação
      doc.moveTo(40, 65).lineTo(802, 65).stroke('#cbd5e1');

      // --- TÍTULO ---
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('MAPA COMPACTO DE REMUNERAÇÕES E ENCARGOS LABORAIS', 40, 78, { align: 'center' });
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#475569').text(`Folha de Pagamento Referente ao Período: ${periodo}`, 40, 93, { align: 'center' });

      // --- TABELA ---
      const topoTabela = 115;
      doc.rect(40, topoTabela, 762, 22).fill('#1e3a8a');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
      
      doc.text('Nome do Trabalhador', 45, topoTabela + 7, { width: 145 });
      doc.text('Cargo / Função', 195, topoTabela + 7, { width: 90 });
      doc.text('Sal. Base', 290, topoTabela + 7, { width: 70, align: 'right' });
      doc.text('Faltas', 365, topoTabela + 7, { width: 55, align: 'right' });
      doc.text('INSS (3%)', 425, topoTabela + 7, { width: 60, align: 'right' });
      doc.text('IRPS Ret.', 490, topoTabela + 7, { width: 60, align: 'right' });
      doc.text('Vales/Adia.', 555, topoTabela + 7, { width: 60, align: 'right' });
      doc.text('INSS Pat. (4%)', 620, topoTabela + 7, { width: 70, align: 'right' });
      doc.text('Líquido Pago', 695, topoTabela + 7, { width: 100, align: 'right' });

      let yLinha = topoTabela + 22;
      doc.font('Helvetica').fillColor('#334155');

      let somaSalBruto = 0;
      let somaFaltas = 0;
      let somaInssFunc = 0;
      let somaIrps = 0;
      let somaVales = 0;
      let somaInssPat = 0;
      let somaLiquido = 0;

      listaCalculos.forEach((calc, index) => {
        // Page overflow check
        if (yLinha > 500) {
          doc.addPage();
          yLinha = 40;
          // Redraw header
          doc.rect(40, yLinha, 762, 22).fill('#1e3a8a');
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
          doc.text('Nome do Trabalhador', 45, yLinha + 7, { width: 145 });
          doc.text('Cargo / Função', 195, yLinha + 7, { width: 90 });
          doc.text('Sal. Base', 290, yLinha + 7, { width: 70, align: 'right' });
          doc.text('Faltas', 365, yLinha + 7, { width: 55, align: 'right' });
          doc.text('INSS (3%)', 425, yLinha + 7, { width: 60, align: 'right' });
          doc.text('IRPS Ret.', 490, yLinha + 7, { width: 60, align: 'right' });
          doc.text('Vales/Adia.', 555, yLinha + 7, { width: 60, align: 'right' });
          doc.text('INSS Pat. (4%)', 620, yLinha + 7, { width: 70, align: 'right' });
          doc.text('Líquido Pago', 695, yLinha + 7, { width: 100, align: 'right' });
          
          yLinha += 22;
          doc.font('Helvetica').fillColor('#334155');
        }

        // Alternating background
        if (index % 2 === 1) {
          doc.rect(40, yLinha, 762, 20).fill('#f8fafc').stroke('transparent');
        }

        doc.fontSize(7).fillColor('#1e293b');
        doc.text(calc.nomeTrabalhador.toUpperCase(), 45, yLinha + 6, { width: 145, height: 12, ellipsis: true });
        doc.text(calc.cargo || 'Geral', 195, yLinha + 6, { width: 90, height: 12, ellipsis: true });
        
        doc.text(calc.salarioBase.toFixed(2), 290, yLinha + 6, { width: 70, align: 'right' });
        doc.text(calc.descontoFaltas.toFixed(2), 365, yLinha + 6, { width: 55, align: 'right' });
        doc.text(calc.inssTrabalhador.toFixed(2), 425, yLinha + 6, { width: 60, align: 'right' });
        doc.text(calc.irpsConstatado.toFixed(2), 490, yLinha + 6, { width: 60, align: 'right' });
        doc.text(calc.descontoVales.toFixed(2), 555, yLinha + 6, { width: 60, align: 'right' });
        
        // Patronal is 4% of Salary after absences
        const patronalInss = calc.inssPatronal || 0;
        doc.text(patronalInss.toFixed(2), 620, yLinha + 6, { width: 70, align: 'right' });
        doc.text(calc.salarioLiquido.toFixed(2), 695, yLinha + 6, { width: 100, align: 'right' });

        somaSalBruto += calc.salarioBase;
        somaFaltas += calc.descontoFaltas;
        somaInssFunc += calc.inssTrabalhador;
        somaIrps += calc.irpsConstatado;
        somaVales += calc.descontoVales;
        somaInssPat += patronalInss;
        somaLiquido += calc.salarioLiquido;

        yLinha += 20;
      });

      // Linha de Totais Finais
      doc.rect(40, yLinha, 762, 22).fill('#f1f5f9');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e3a8a');
      doc.text('TOTAIS CONSOLIDADOS (MT)', 45, yLinha + 7, { width: 240 });
      doc.text(somaSalBruto.toFixed(2), 290, yLinha + 7, { width: 70, align: 'right' });
      doc.text(somaFaltas.toFixed(2), 365, yLinha + 7, { width: 55, align: 'right' });
      doc.text(somaInssFunc.toFixed(2), 425, yLinha + 7, { width: 60, align: 'right' });
      doc.text(somaIrps.toFixed(2), 490, yLinha + 7, { width: 60, align: 'right' });
      doc.text(somaVales.toFixed(2), 555, yLinha + 7, { width: 60, align: 'right' });
      doc.text(somaInssPat.toFixed(2), 620, yLinha + 7, { width: 70, align: 'right' });
      doc.text(somaLiquido.toFixed(2), 695, yLinha + 7, { width: 100, align: 'right' });

      // Assinatura e Notas Regulatórias da Contabilidade
      yLinha += 35;
      if (yLinha > 510) {
        doc.addPage();
        yLinha = 40;
      }
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b').text('CONFORMIDADE FISCAL E SEGURANÇA SOCIAL', 40, yLinha);
      doc.fontSize(7).font('Helvetica').fillColor('#475569')
        .text('Este mapa detalhado foi gerado de forma em conformidade estrita com a Lei de Trabalho Moçambicana (Lei nº 13/2023), Regulamento de Contribuições da Segurança Social (Decreto nº 51/2017) e Código de IRPS.', 40, yLinha + 12, { width: 450 });

      // Linhas de Assinatura
      const xAssinatura = 550;
      doc.moveTo(xAssinatura, yLinha + 25).lineTo(780, yLinha + 25).stroke('#94a3b8');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e293b').text('Departamento de Contabilidade / RH', xAssinatura, yLinha + 29, { align: 'center', width: 230 });
      doc.font('Helvetica').fillColor('#64748b').text('ERP Moçambique (Assinatura Eletrónica)', xAssinatura, yLinha + 39, { align: 'center', width: 230 });

      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera o Relatório Financeiro de Histórico de Operações Mensais em PDF (A4 Retrato)
 */
export function criarRelatorioHistoricoPDF(
  dadosEmpresa: any,
  historicoOperacoes: any[],
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // --- LOGOTIPO / CABEÇALHO ---
      let textX = 50;
      let drawn = false;
      if (dadosEmpresa.logo && dadosEmpresa.logo.startsWith('data:image/')) {
        try {
          const parts = dadosEmpresa.logo.split(';base64,');
          const mime = parts[0];
          const base64Data = parts[1];
          if (base64Data && (mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg'))) {
            const buffer = Buffer.from(base64Data, 'base64');
            doc.image(buffer, 50, 45, { width: 40 });
            textX = 115;
            drawn = true;
          }
        } catch (err) {
          console.error("Erro ao desenhar logotipo no PDF do histórico:", err);
        }
      }

      if (!drawn) {
        try {
          const caminhoLogotipo = path.join(__dirname, '..', 'public', 'logo-payroll.png');
          const caminhoAlternativo = path.join(process.cwd(), 'public', 'logo-payroll.png');
          if (fs.existsSync(caminhoLogotipo)) {
            doc.image(caminhoLogotipo, 50, 45, { width: 40 });
            textX = 115;
          } else if (fs.existsSync(caminhoAlternativo)) {
            doc.image(caminhoAlternativo, 50, 45, { width: 40 });
            textX = 115;
          }
        } catch (err) {
          console.error("Erro ao desenhar logotipo default no PDF do histórico:", err);
        }
      }

      const nomeEmpresa = (dadosEmpresa.nome || dadosEmpresa.nome_comercial || 'Empresa Cliente').toUpperCase();
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text(nomeEmpresa, textX, 45);
      doc.fontSize(8.5).font('Helvetica').fillColor('#475569');
      const nuitEmp = dadosEmpresa.nuit || 'N/A';
      const localSede = `${dadosEmpresa.distrito || 'Maputo'}, ${dadosEmpresa.provincia || 'Maputo Cidade'}`;
      doc.text(`NUIT: ${nuitEmp}  |  Sede: ${localSede}, Moçambique`, textX, 58);

      // Linha de separação estética
      doc.moveTo(50, 78).lineTo(545, 78).stroke('#cbd5e1');

      // --- TÍTULO ---
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text('RELATÓRIO FINANCEIRO E OPERACIONAL ANUAL', 50, 95, { align: 'center' });
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#475569').text(`Histórico Consolidado de Encargos Salariais e Fiscais`, 50, 110, { align: 'center' });

      // --- TABELA ---
      const topoTabela = 135;
      doc.rect(50, topoTabela, 495, 22).fill('#1e3a8a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('Mês / Ano', 55, topoTabela + 7, { width: 90 });
      doc.text('Trabalhadores', 145, topoTabela + 7, { width: 75, align: 'center' });
      doc.text('Líquido Pago', 220, topoTabela + 7, { width: 80, align: 'right' });
      doc.text('IRPS Retido', 300, topoTabela + 7, { width: 75, align: 'right' });
      doc.text('INSS (3%+4%)', 375, topoTabela + 7, { width: 85, align: 'right' });
      doc.text('Taxa Fintech', 460, topoTabela + 7, { width: 80, align: 'right' });

      let yLinha = topoTabela + 22;
      doc.font('Helvetica').fillColor('#334155');

      let totalLiquido = 0;
      let totalIrps = 0;
      let totalInss = 0;
      let totalTaxas = 0;
      let maxTrabalhadores = 0;

      historicoOperacoes.forEach((op, index) => {
        // Page overflow check
        if (yLinha > 700) {
          doc.addPage();
          yLinha = 50;
          doc.rect(50, yLinha, 495, 22).fill('#1e3a8a');
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
          doc.text('Mês / Ano', 55, yLinha + 7, { width: 90 });
          doc.text('Trabalhadores', 145, yLinha + 7, { width: 75, align: 'center' });
          doc.text('Líquido Pago', 220, yLinha + 7, { width: 80, align: 'right' });
          doc.text('IRPS Retido', 300, yLinha + 7, { width: 75, align: 'right' });
          doc.text('INSS (3%+4%)', 375, yLinha + 7, { width: 85, align: 'right' });
          doc.text('Taxa Fintech', 460, yLinha + 7, { width: 80, align: 'right' });
          
          yLinha += 22;
          doc.font('Helvetica').fillColor('#334155');
        }

        if (index % 2 === 1) {
          doc.rect(50, yLinha, 495, 20).fill('#f8fafc').stroke('transparent');
        }

        doc.fontSize(8).fillColor('#1e293b');
        doc.text(`${op.mes} / ${op.ano || 2026}`, 55, yLinha + 6, { width: 90 });
        doc.text(String(op.total_trabalhadores || 0), 145, yLinha + 6, { width: 75, align: 'center' });
        doc.text(Number(op.liquido_pago).toFixed(2), 220, yLinha + 6, { width: 80, align: 'right' });
        doc.text(Number(op.irps_retido).toFixed(2), 300, yLinha + 6, { width: 75, align: 'right' });
        doc.text(Number(op.inss_retido).toFixed(2), 375, yLinha + 6, { width: 85, align: 'right' });
        doc.text(Number(op.taxas_fintech || 0).toFixed(2), 460, yLinha + 6, { width: 80, align: 'right' });

        totalLiquido += Number(op.liquido_pago);
        totalIrps += Number(op.irps_retido);
        totalInss += Number(op.inss_retido);
        totalTaxas += Number(op.taxas_fintech || 0);
        maxTrabalhadores = Math.max(maxTrabalhadores, op.total_trabalhadores || 0);

        yLinha += 20;
      });

      // Linha de totais acumulados
      doc.rect(50, yLinha, 495, 22).fill('#f1f5f9');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e3a8a');
      doc.text('TOTAL ACUMULADO', 55, yLinha + 7, { width: 90 });
      doc.text(String(maxTrabalhadores), 145, yLinha + 7, { width: 75, align: 'center' });
      doc.text(totalLiquido.toFixed(2), 220, yLinha + 7, { width: 80, align: 'right' });
      doc.text(totalIrps.toFixed(2), 300, yLinha + 7, { width: 75, align: 'right' });
      doc.text(totalInss.toFixed(2), 375, yLinha + 7, { width: 85, align: 'right' });
      doc.text(totalTaxas.toFixed(2), 460, yLinha + 7, { width: 80, align: 'right' });

      // Seção de Observações e Informações Fiscais
      yLinha += 40;
      if (yLinha > 680) {
        doc.addPage();
        yLinha = 50;
      }

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('Nota de Conformidade de Fecho Contabilístico', 50, yLinha);
      doc.fontSize(8).font('Helvetica').fillColor('#475569')
        .text('Este relatório contém os dados agregados das folhas de remunerações fechadas e autorizadas no sistema ERP. As retenções do IRPS e INSS aqui sumariadas são as declarações legais correspondentes sob a legislação fiscal de Moçambique, servindo como base fiel de informação para envio à Autoridade Tributária e INSS.', 50, yLinha + 15, { width: 495, align: 'justify' });

      // Rodapé de Emissão
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#94a3b8').text(`Ficheiro auditado digitalmente pela plataforma Fintech em ${new Date().toLocaleDateString('pt-MZ')}.`, 50, yLinha + 65, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera a Guia de Recolhimento de Contribuições do INSS (Fardas Reais SISSMO de Moçambique) em PDF
 */
export function criarGuiaRecolhimentoInssPDF(
  dadosEmpresa: any,
  dadosGuia: {
    periodo: string;
    totalTrabalhadores: number;
    totalRemuneracoes: number;
    contribuicaoTrabalhadores: number;
    contribuicaoPatronal: number;
    totalContribuicoes: number;
    jurosMora: number;
    multas: number;
    totalPagar: number;
    referenciaPagamento: string;
    dataLimite: string;
  },
  caminhoFicheiro: string
): Promise<void> {
  function escreverValorPorExtenso(n: number): string {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const inteiro = Math.floor(n);
    const centavos = Math.round((n - inteiro) * 100);

    function converteGrupo(val: number): string {
      if (val === 0) return '';
      if (val === 100) return 'cem';
      
      let res = '';
      const c = Math.floor(val / 100);
      const d = Math.floor((val % 100) / 10);
      const u = val % 10;

      if (c > 0) {
        res += centenas[c];
      }

      if (d > 0 || u > 0) {
        if (res !== '') res += ' e ';
        if (d === 1) {
          res += especiais[u];
        } else {
          if (d > 1) {
            res += dezenas[d];
            if (u > 0) res += ' e ' + unidades[u];
          } else if (u > 0) {
            res += unidades[u];
          }
        }
      }
      return res;
    }

    if (inteiro === 0) return 'Zero meticais';

    let resultado = '';
    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const resto = inteiro % 1000;

    if (milhoes > 0) {
      resultado += converteGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
    }

    if (milhares > 0) {
      if (resultado !== '') resultado += ' ';
      resultado += converteGrupo(milhares) + ' mil';
    }

    if (resto > 0) {
      if (resultado !== '') resultado += ' e ';
      resultado += converteGrupo(resto);
    }

    resultado += resultado === 'um' ? ' metical' : ' meticais';

    if (centavos > 0) {
      resultado += ' e ' + converteGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    }

    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
  }

  function desenharViaGPC(doc: any, yOffset: number) {
    const startX = 40;
    const endX = 555;
    const width = endX - startX; // 515

    // Título Oficial da GPC
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Guia de Pagamento de Contribuição - GPC', startX, yOffset);

    // --- DESENHO EM VETOR DE ALTA FIDELIDADE DO LOGÓTIPO OFICIAL DO INSS DE MOÇAMBIQUE ---
    const logoX = endX - 110;
    const logoY = yOffset - 5;
    const logoW = 110;
    const logoH = 42;

    // 1. Fundo azul brilhante do logótipo (Sky Blue Oficial do INSS de Moçambique)
    doc.rect(logoX, logoY, logoW, logoH).fill('#00adef'); // Cor azul vibrante oficial do INSS (#00ADEF)

    // Salvar o estado do contexto para desenho com transformações
    doc.save();
    
    // 2. Silhueta Branca do Mapa de Moçambique no lado esquerdo (Traçado de Alta Precisão)
    doc.strokeColor('#ffffff').lineWidth(1);
    doc.moveTo(logoX + 18, logoY + 4); // Topo Norte (Cabo Delgado)
    doc.lineTo(logoX + 22, logoY + 6);
    doc.lineTo(logoX + 24, logoY + 10); // Costa de Nampula
    doc.lineTo(logoX + 20, logoY + 14); // Costa de Zambézia
    doc.lineTo(logoX + 15, logoY + 19); // Curva de Sofala (Beira)
    doc.lineTo(logoX + 16, logoY + 24); // Península de Inhambane
    doc.lineTo(logoX + 12, logoY + 30); // Gaza
    doc.lineTo(logoX + 9, logoY + 38);  // Maputo (Extremo Sul)
    doc.lineTo(logoX + 7, logoY + 38);  // Maputo largura
    doc.lineTo(logoX + 8, logoY + 30);  // Gaza interior
    doc.lineTo(logoX + 11, logoY + 24); // Inhambane interior
    doc.lineTo(logoX + 9, logoY + 20);  // Manica border
    doc.lineTo(logoX + 4, logoY + 19);  // Cunha de Tete (Oeste)
    doc.lineTo(logoX + 7, logoY + 13);  // Tete border
    doc.lineTo(logoX + 10, logoY + 11); // Tete norte
    doc.lineTo(logoX + 9, logoY + 6);   // Niassa (Lago Niassa)
    doc.lineTo(logoX + 13, logoY + 4);  // Niassa norte
    doc.closePath();
    doc.fillAndStroke('#ffffff', '#ffffff');

    // 3. Letras "I", "N", "S", "S" Gigantes em Azul Escuro no fundo (Grade de Logótipo Oficial)
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#092f59');
    doc.text('I', logoX + 32, logoY + 9);
    doc.text('N', logoX + 32, logoY + 21);
    doc.text('S', logoX + 64, logoY + 9);
    doc.text('S', logoX + 64, logoY + 21);

    // 4. Desenho Vetorial das Figuras Brancas da Família (Trabalhador, Mãe, Filho, Filha)
    doc.fillColor('#ffffff').strokeColor('#ffffff').lineWidth(0.5);

    // Figura 1: Menino (Esquerda)
    const boyX = logoX + 38;
    const boyY = logoY + 21;
    doc.circle(boyX, boyY, 1.8).fill(); // Cabeça
    doc.rect(boyX - 1.5, boyY + 2.5, 3, 7).fill(); // Corpo
    doc.rect(boyX - 1.2, boyY + 9.5, 1, 4.5).fill(); // Perna esquerda
    doc.rect(boyX + 0.2, boyY + 9.5, 1, 4.5).fill(); // Perna direita
    doc.rect(boyX - 2.5, boyY + 2.5, 0.8, 5.5).fill(); // Braço esquerdo
    doc.rect(boyX + 1.7, boyY + 2.5, 0.8, 5.5).fill(); // Braço direito

    // Figura 2: Mãe (Feminina)
    const motherX = logoX + 51;
    const motherY = logoY + 15;
    doc.circle(motherX, motherY, 2.2).fill(); // Cabeça
    // Vestido (triângulo estilizado do logótipo)
    doc.polygon(
      [motherX, motherY + 3], // Pescoço
      [motherX - 4.5, motherY + 15], // Canto esquerdo inferior
      [motherX + 4.5, motherY + 15]  // Canto direito inferior
    ).fill();
    doc.rect(motherX - 2.2, motherY + 15, 1.2, 5.5).fill(); // Perna esquerda
    doc.rect(motherX + 1.0, motherY + 15, 1.2, 5.5).fill(); // Perna direita

    // Figura 3: Pai (Masculino)
    const fatherX = logoX + 68;
    const fatherY = logoY + 13;
    doc.circle(fatherX, fatherY, 2.5).fill(); // Cabeça
    doc.rect(fatherX - 2.5, fatherY + 3.5, 5, 10).fill(); // Tronco
    doc.rect(fatherX - 2.2, fatherY + 13.5, 1.8, 7.5).fill(); // Perna esquerda
    doc.rect(fatherX + 0.4, fatherY + 13.5, 1.8, 7.5).fill(); // Perna direita
    doc.rect(fatherX - 3.8, fatherY + 3.5, 1, 8.5).fill(); // Braço esquerdo
    doc.rect(fatherX + 2.8, fatherY + 3.5, 1, 8.5).fill(); // Braço direito

    // Figura 4: Menina (Direita)
    const girlX = logoX + 81;
    const girlY = logoY + 23;
    doc.circle(girlX, girlY, 1.5).fill(); // Cabeça
    // Vestido pequeno
    doc.polygon(
      [girlX, girlY + 2.2],
      [girlX - 3.2, girlY + 11],
      [girlX + 3.2, girlY + 11]
    ).fill();
    doc.rect(girlX - 1.6, girlY + 11, 0.9, 4).fill(); // Perna esquerda
    doc.rect(girlX + 0.7, girlY + 11, 0.9, 4).fill(); // Perna direita

    // Restaurar estado do contexto de desenho
    doc.restore();

    // 5. Textos Oficiais Institucionais em Branco
    doc.fontSize(4).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('INSTITUTO NACIONAL DE', logoX + 40, logoY + 3, { characterSpacing: 0.2 });
    doc.text('SEGURANÇA SOCIAL', logoX + 42, logoY + 8, { characterSpacing: 0.2 });

    doc.fontSize(3.8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('NACIONAL INSTITUTE OF', logoX + 44, logoY + 34, { characterSpacing: 0.1 });
    doc.text('SOCIAL SECURITY', logoX + 48, logoY + 38, { characterSpacing: 0.1 });

    // Grid Principal da GPC
    const gridStartY = yOffset + 42;
    
    // Altura das Linhas da Grelha do Formato GPC Moçambicano Oficial
    const r1_h = 24;
    const r2_h = 24;
    const r3_h = 24;
    const r4_h = 24;
    const r5_h = 24;
    const r6_h = 24;
    const r7_h = 24;
    const r8_h = 32;
    const r9_h = 22;
    const r10_h = 26;

    const totalGridHeight = r1_h + r2_h + r3_h + r4_h + r5_h + r6_h + r7_h + r8_h + r9_h + r10_h; // 248 pts

    // Desenhar a moldura exterior
    doc.lineWidth(1).strokeColor('#000000').rect(startX, gridStartY, width, totalGridHeight).stroke();

    // Desenhar as linhas divisórias horizontais
    let currentY = gridStartY;
    const rowHeights = [r1_h, r2_h, r3_h, r4_h, r5_h, r6_h, r7_h, r8_h, r9_h];
    rowHeights.forEach(h => {
      currentY += h;
      doc.moveTo(startX, currentY).lineTo(endX, currentY).stroke();
    });

    // Helpers para as células
    const writeCellLabel = (label: string, x: number, y: number) => {
      doc.fontSize(6.5).font('Helvetica').fillColor('#334155').text(label, x + 4, y + 2);
    };

    const writeCellVal = (val: string, x: number, y: number, w?: number, align: string = 'left', isBold: boolean = true) => {
      doc.fontSize(8).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
      if (w) {
        doc.text(val, x + 4, y + 10, { width: w - 8, align });
      } else {
        doc.text(val, x + 4, y + 10);
      }
    };

    // --- LINHA 1: Número da Guia (left) | Data limite de Pagamento (right) ---
    const colSplit1 = startX + 250;
    doc.moveTo(colSplit1, gridStartY).lineTo(colSplit1, gridStartY + r1_h).stroke();
    writeCellLabel('Número da Guia', startX, gridStartY);
    writeCellVal(dadosGuia.referenciaPagamento ? dadosGuia.referenciaPagamento.substring(0, 9) : '103904522', startX, gridStartY);

    writeCellLabel('Data limite de Pagamento', colSplit1, gridStartY);
    writeCellVal(dadosGuia.dataLimite || '10/08/2026', colSplit1, gridStartY);

    // --- LINHA 2: Valor Total da Guia (left) | Número do Contribuinte (right) ---
    const row2Y = gridStartY + r1_h;
    doc.moveTo(colSplit1, row2Y).lineTo(colSplit1, row2Y + r2_h).stroke();
    writeCellLabel('Valor Total da Guia', startX, row2Y);
    writeCellVal(dadosGuia.totalPagar.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT', startX, row2Y, 250 - 10, 'right');

    writeCellLabel('Número do Contribuinte', colSplit1, row2Y);
    writeCellVal(dadosEmpresa.nuel || '904688400', colSplit1, row2Y);

    // --- LINHA 3: Valor por Extenso (Full Width) ---
    const row3Y = row2Y + r2_h;
    writeCellLabel('Valor por Extenso', startX, row3Y);
    writeCellVal(escreverValorPorExtenso(dadosGuia.totalPagar), startX, row3Y);

    // --- LINHA 4: Contribuinte (Full Width) ---
    const row4Y = row3Y + r3_h;
    writeCellLabel('Contribuinte', startX, row4Y);
    writeCellVal((dadosEmpresa.nome || 'Payroll Tech Mz Lda').toUpperCase(), startX, row4Y);

    // --- LINHA 5: Tipo de Contribuição (Full Width) ---
    const row5Y = row4Y + r4_h;
    writeCellLabel('Tipo de Contribuição', startX, row5Y);
    writeCellVal('Declaração de pessoa coletiva - Normal', startX, row5Y);

    // --- LINHA 6: Referência | Data de Emissão | Controlo do INSS (Split in 3) ---
    const row6Y = row5Y + r5_h;
    const colSplit6_1 = startX + 130;
    const colSplit6_2 = startX + 260;
    doc.moveTo(colSplit6_1, row6Y).lineTo(colSplit6_1, row6Y + r6_h).stroke();
    doc.moveTo(colSplit6_2, row6Y).lineTo(colSplit6_2, row6Y + r6_h).stroke();

    writeCellLabel('Referência', startX, row6Y);
    writeCellVal(dadosGuia.periodo.toUpperCase(), startX, row6Y);

    writeCellLabel('Data de Emissão', colSplit6_1, row6Y);
    const now = new Date();
    const dataEmissao = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    writeCellVal(dataEmissao, colSplit6_1, row6Y);

    writeCellLabel('Controlo do INSS', colSplit6_2, row6Y);
    const controloHex = '75A2884B6C7DWXYZ07AB78C877D3W7348XY447Z';
    writeCellVal(controloHex, colSplit6_2, row6Y);

    // --- LINHA 7: Valor da Contribuição | Multa | Juros de Mora | Dedução (Split in 4) ---
    const row7Y = row6Y + r6_h;
    const w7 = width / 4; // 128.75
    const col7_1 = startX + w7;
    const col7_2 = startX + w7 * 2;
    const col7_3 = startX + w7 * 3;

    doc.moveTo(col7_1, row7Y).lineTo(col7_1, row7Y + r7_h).stroke();
    doc.moveTo(col7_2, row7Y).lineTo(col7_2, row7Y + r7_h).stroke();
    doc.moveTo(col7_3, row7Y).lineTo(col7_3, row7Y + r7_h).stroke();

    writeCellLabel('Valor da Contribuição', startX, row7Y);
    const valorContr = (dadosGuia.contribuicaoTrabalhadores + dadosGuia.contribuicaoPatronal);
    writeCellVal(valorContr.toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT', startX, row7Y, w7 - 10, 'right');

    writeCellLabel('Multa', col7_1, row7Y);
    writeCellVal((dadosGuia.multas || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT', col7_1, row7Y, w7 - 10, 'right');

    writeCellLabel('Juros de Mora', col7_2, row7Y);
    writeCellVal((dadosGuia.jurosMora || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 }) + ' MT', col7_2, row7Y, w7 - 10, 'right');

    writeCellLabel('Dedução', col7_3, row7Y);
    writeCellVal('0,00 MT', col7_3, row7Y, w7 - 10, 'right');

    // --- LINHA 8: Local de Pagamento (Full Width) ---
    const row8Y = row7Y + r7_h;
    writeCellLabel('Local de Pagamento', startX, row8Y);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
    doc.text('BANCO MAIS, STANDARD BANK, MOZA, NEDBANK, BCI, UBA, MILLENNIUM BIM, FIRST CAPITAL BANK, FNB, ECOBANK, SOCGEN, BARCLAYS e BancABC', startX + 4, row8Y + 11, { width: width - 8 });

    // --- LINHA 9: Instruções (Full Width) ---
    const row9Y = row8Y + r8_h;
    writeCellLabel('Instruções', startX, row9Y);
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Sr Caixa: Antes de quitar a Guia, conferir o valor da mesma com o visualizado no Sistema.', startX + 4, row9Y + 11);

    // --- LINHA 10: Autenticação Bancária (Full Width) ---
    const row10Y = row9Y + r9_h;
    writeCellLabel('Autenticação Bancária', startX, row10Y);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // Desenhar a Primeira Via (Via do Banco) no topo
      desenharViaGPC(doc, 35);

      // Linha de Corte Intermédia (Picotada do modelo oficial)
      doc.save();
      doc.strokeColor('#000000');
      doc.dash(4, { space: 4 });
      doc.moveTo(40, 400).lineTo(555, 400).stroke();
      doc.restore();

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569');
      doc.text('CORTE AQUI (LINHA PICOTADA) - DUAS VIAS OFICIAIS DE RECOLHIMENTO INSS', 40, 406, { align: 'center', width: 515 });

      // Desenhar a Segunda Via (Via do Contribuinte) abaixo
      desenharViaGPC(doc, 430);

      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera a Guia Oficial M/19 de Recolhimento do IRPS de Moçambique em PDF (Alta Fidelidade)
 */
export function criarGuiaIrpsPDF(
  dadosEmpresa: any,
  dadosGuia: {
    periodo: string;
    valorTrabalhoDependente: number;
    jurosCompensatorios: number;
    totalPagar: number;
    dataLimite: string;
    referenciaPagamento: string;
  },
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 35 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      const startX = 35;
      const endX = 560;
      const width = 525;

      // --- CABEÇALHO ---
      const headY = 35;
      const headH = 80;
      
      // Fundo amarelo claro oficial do formulário M/19
      doc.rect(startX, headY, width, headH).fill('#faf9e5').strokeColor('#000000').lineWidth(1).stroke();
      
      // Linhas divisórias das colunas do cabeçalho
      doc.moveTo(215, headY).lineTo(215, headY + headH).stroke();
      doc.moveTo(455, headY).lineTo(455, headY + headH).stroke();

      // Coluna 1: República de Moçambique / Autoridade Tributária
      // Desenho do Emblema de Moçambique (Círculo vermelho com estrela amarela)
      const embX = 55;
      const embY = 72;
      doc.save();
      doc.circle(embX, embY, 16).fill('#dc2626'); // Círculo Vermelho
      doc.circle(embX, embY, 13).fill('#16a34a'); // Círculo Verde Interno
      
      // Estrela amarela de 5 pontas no centro
      const starPoints = [
        [embX, embY - 8],
        [embX + 2.5, embY - 2.5],
        [embX + 8.5, embY - 2.5],
        [embX + 3.5, embY + 1.5],
        [embX + 5.5, embY + 7.5],
        [embX, embY + 3.5],
        [embX - 5.5, embY + 7.5],
        [embX - 3.5, embY + 1.5],
        [embX - 8.5, embY - 2.5],
        [embX - 2.5, embY - 2.5]
      ];
      doc.polygon(...starPoints).fill('#facc15');
      doc.restore();

      // Textos institucionais ao lado do emblema
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('República de Moçambique', 78, 44);
      doc.fontSize(6).font('Helvetica');
      doc.text('Ministério da Economia e Finanças', 78, 56);
      doc.fontSize(6.5).font('Helvetica-Bold');
      doc.text('Autoridade Tributária de Moçambique', 78, 68);
      doc.fontSize(5.5).font('Helvetica');
      doc.text('DIRECÇÃO GERAL DOS IMPOSTOS', 78, 80);

      // Coluna 2: Nome do Imposto
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('IRPS - Imposto Sobre Rendimento das Pessoas', 220, 52, { align: 'center', width: 230 });
      doc.text('Singulares', 220, 65, { align: 'center', width: 230 });
      doc.fontSize(7.5).font('Helvetica-Oblique');
      doc.text('(arts.83 e 87 do CIRPS)', 220, 82, { align: 'center', width: 230 });

      // Coluna 3: Modelo / Identificador
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.text('M/19', 460, 54, { align: 'center', width: 100 });
      doc.fontSize(9.5).font('Helvetica-Bold');
      doc.text('IRPS', 460, 74, { align: 'center', width: 100 });

      // --- SECÇÃO 1 & 2: Nome & NUIT ---
      const s1Y = 125;
      const s1H = 35;
      doc.rect(startX, s1Y, width, s1H).strokeColor('#000000').lineWidth(1).stroke();
      doc.moveTo(385, s1Y).lineTo(385, s1Y + s1H).stroke();

      // Labels
      doc.fontSize(6.5).font('Helvetica').fillColor('#334155');
      doc.text('1 - NOME / DESIGNAÇÃO SOCIAL DO SUJEITO PASSIVO', startX + 4, s1Y + 3);
      doc.text('2 - NUIT', 389, s1Y + 3);

      // Valores
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text((dadosEmpresa.nome || 'Payroll Tech Mz Lda').toUpperCase(), startX + 4, s1Y + 16, { width: 340 });
      doc.text(dadosEmpresa.nuit || '400999999', 389, s1Y + 16);

      // --- SECÇÃO 3: Dísticos Comerciais ---
      const s3Y = 170;
      const s3H = 35;
      doc.rect(startX, s3Y, width, s3H).stroke();
      doc.fontSize(6.5).font('Helvetica').fillColor('#334155');
      doc.text('3 - DÍSTICOS COMERCIAIS USADOS (SE EXISTIREM)', startX + 4, s3Y + 3);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('NENHUM / NÃO APLICÁVEL', startX + 4, s3Y + 16);

      // --- SECÇÃO 4: Endereço ---
      const s4Y = 215;
      const s4H = 100;
      doc.rect(startX, s4Y, width, s4H).stroke();
      
      // Título da secção 4
      doc.rect(startX, s4Y, width, 18).fill('#faf9e5').stroke();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000');
      doc.text('4 - ENDEREÇO DA RESIDÊNCIA DO PROPRIETÁRIO / SEDE DA EMPRESA (EM MOÇAMBIQUE)', startX + 4, s4Y + 5);

      // Linhas da grelha de endereço
      const rowY1 = s4Y + 18; // 233
      const rowY2 = s4Y + 38; // 253
      const rowY3 = s4Y + 58; // 273
      const rowY4 = s4Y + 78; // 293
      const rowYEnd = s4Y + 100; // 315

      doc.moveTo(startX, rowY2).lineTo(endX, rowY2).stroke();
      doc.moveTo(startX, rowY3).lineTo(endX, rowY3).stroke();
      doc.moveTo(startX, rowY4).lineTo(endX, rowY4).stroke();

      // Verticais de Endereço
      // Row 1 vertical dividers
      doc.moveTo(285, rowY1).lineTo(285, rowY2).stroke();
      doc.moveTo(335, rowY1).lineTo(335, rowY2).stroke();
      doc.moveTo(395, rowY1).lineTo(395, rowY2).stroke();

      // Row 2 vertical dividers
      doc.moveTo(195, rowY2).lineTo(195, rowY3).stroke();
      doc.moveTo(295, rowY2).lineTo(295, rowY3).stroke();
      doc.moveTo(395, rowY2).lineTo(395, rowY3).stroke();

      // Row 3 vertical dividers
      doc.moveTo(195, rowY3).lineTo(195, rowY4).stroke();
      doc.moveTo(335, rowY3).lineTo(335, rowY4).stroke();
      doc.moveTo(435, rowY3).lineTo(435, rowY4).stroke();

      // Row 4 vertical dividers
      doc.moveTo(135, rowY4).lineTo(135, rowYEnd).stroke();
      doc.moveTo(255, rowY4).lineTo(255, rowYEnd).stroke();
      doc.moveTo(395, rowY4).lineTo(395, rowYEnd).stroke();

      // Labels e Valores de Endereço
      const writeAddrCell = (label: string, val: string, x: number, y: number) => {
        doc.fontSize(5.5).font('Helvetica').fillColor('#475569').text(label, x + 3, y + 2);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000').text(val, x + 3, y + 10);
      };

      writeAddrCell('Rua / Praça / Avenida', dadosEmpresa.endereco || 'Av. 24 de Julho', startX, rowY1);
      writeAddrCell('n.º', '1500', 285, rowY1);
      writeAddrCell('Andar', '4º', 335, rowY1);
      writeAddrCell('Localidade', dadosEmpresa.distrito || 'Maputo', 395, rowY1);

      writeAddrCell('Bairro', 'Central C', startX, rowY2);
      writeAddrCell('Quarteirão', '14', 195, rowY2);
      writeAddrCell('Célula', 'A', 295, rowY2);
      writeAddrCell('Flat Nr', '402', 395, rowY2);

      writeAddrCell('Província', dadosEmpresa.provincia || 'Cidade de Maputo', startX, rowY3);
      writeAddrCell('Distrito', dadosEmpresa.distrito || 'Maputo', 195, rowY3);
      writeAddrCell('Fax', '+258 21 333 444', 335, rowY3);
      writeAddrCell('Cód. Postal', '1100', 435, rowY3);

      writeAddrCell('DAF', 'Primeira DAF', startX, rowY4);
      writeAddrCell('Telefone Fixo', '+258 21 000 111', 135, rowY4);
      writeAddrCell('Telemóvel', '+258 84 123 4567', 255, rowY4);
      writeAddrCell('E-Mail', dadosEmpresa.email || 'geral@payrolltech.co.mz', 395, rowY4);

      // --- SECÇÃO 5: IMPOSTO A PAGAR ---
      const s5Y = 325;
      const s5TitleH = 20;
      const s5ColH = 30;
      const rowH = 24;
      const s5TotalH = s5TitleH + s5ColH + (11 * rowH); // 20 + 30 + 264 = 314 pt. Ends at y = 639

      doc.rect(startX, s5Y, width, s5TotalH).stroke();

      // Title Bar
      doc.rect(startX, s5Y, width, s5TitleH).fill('#faf9e5').stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
      doc.text('5 - IMPOSTO A PAGAR', startX + 4, s5Y + 6);

      // Column Header Lines
      const colHeadY = s5Y + s5TitleH; // 345
      doc.rect(startX, colHeadY, width, s5ColH).stroke();

      // Column vertical lines
      doc.moveTo(155, colHeadY).lineTo(155, colHeadY + s5ColH + (11 * rowH)).stroke();
      doc.moveTo(415, colHeadY).lineTo(415, colHeadY + s5ColH + (11 * rowH)).stroke();

      // Column Labels
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#334155');
      doc.text('Reservado aos Serviços\nClassificador Económico da Receita', startX, colHeadY + 5, { align: 'center', width: 120 });
      doc.text('TIPO DE RENDIMENTO', 160, colHeadY + 11);
      doc.text('IMPORTÂNCIA A PAGAR EM METICAIS\n(sem centavos)', 420, colHeadY + 5, { align: 'center', width: 135 });

      // Rows Definition
      const rows = [
        { cod: '10-10-10-20-1', desc: 'Trabalho Dependente', val: dadosGuia.valorTrabalhoDependente, labelNum: '10' },
        { cod: '10-10-10-20-1', desc: 'Pensões', val: 0, labelNum: '11' },
        { cod: '10-10-10-20-2', desc: 'Rendimentos Profissionais', val: 0, labelNum: '12' },
        { cod: '10-10-10-20-2', desc: 'Rendimentos Empresariais', val: 0, labelNum: '13' },
        { cod: '10-10-10-20-3', desc: 'Ganho de Jogos e similares (alínea e) n.1 art. 83', val: 0, labelNum: '14' },
        { cod: '10-10-10-20-4', desc: 'Rendimentos de Capitais e Mais Valias', val: 0, labelNum: '15' },
        { cod: '10-10-10-20-5', desc: 'Rendimentos Prediais', val: 0, labelNum: '16' },
        { cod: '10-10-10-20-2', desc: 'Pagamento por conta', val: 0, labelNum: '20' },
        { cod: '', desc: 'Juros Compensatórios', val: dadosGuia.jurosCompensatorios || 0, labelNum: '21' },
        { cod: '10-10-10-20-6', desc: 'Outros Rendimentos', val: 0, labelNum: '22' },
        { cod: '', desc: 'Total a Pagar', val: dadosGuia.totalPagar, labelNum: '30', isTotal: true }
      ];

      const rowsStartY = colHeadY + s5ColH; // 375
      
      rows.forEach((row, i) => {
        const rowY = rowsStartY + (i * rowH);
        
        // Draw horizontal line at the bottom of the row (except the last one which is bounded by the box)
        if (i < 10) {
          doc.moveTo(startX, rowY + rowH).lineTo(endX, rowY + rowH).stroke();
        }

        // Fill background for Total Row
        if (row.isTotal) {
          doc.save();
          doc.rect(startX, rowY, width, rowH).fill('#faf9e5');
          // re-draw vertical boundaries since fill covers them
          doc.strokeColor('#000000').lineWidth(1);
          doc.moveTo(155, rowY).lineTo(155, rowY + rowH).stroke();
          doc.moveTo(415, rowY).lineTo(415, rowY + rowH).stroke();
          doc.restore();
        }

        // Codigo (Col 1)
        if (row.cod) {
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text(row.cod, startX, rowY + 8, { align: 'center', width: 120 });
        }

        // Descrição (Col 2)
        doc.fontSize(7.5).font(row.isTotal ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000');
        doc.text(row.desc, 160, rowY + 8);

        // Caixa de Número de Linha e Caixa de Valor (Col 3)
        // Caixa de ID cinza escuro
        doc.save();
        doc.rect(420, rowY + 4, 18, 16).fill('#475569');
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text(row.labelNum, 420, rowY + 8, { align: 'center', width: 18 });
        doc.restore();

        // Caixa de Valor
        doc.rect(442, rowY + 4, 112, 16).strokeColor('#475569').lineWidth(0.5).stroke();

        // Print value inside the box if greater than 0, or if it is the Total
        if (row.val > 0 || row.isTotal) {
          const displayVal = Math.round(row.val).toLocaleString('pt-MZ').split(',')[0];
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000000');
          doc.text(displayVal, 442, rowY + 8, { align: 'right', width: 108 });
        } else {
          doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
          doc.text('---', 442, rowY + 8, { align: 'center', width: 112 });
        }
      });

      // --- SECÇÃO INFERIOR: AUTENTICAÇÃO E USO DE SERVIÇOS ---
      const bottomY = 650;
      const bottomH = 100;
      const boxW = 168;
      const gap = 10;

      // Três caixas horizontais
      const box1X = startX;
      const box2X = startX + boxW + gap;
      const box3X = startX + (boxW + gap) * 2;

      const drawBottomBox = (title: string, x: number) => {
        doc.rect(x, bottomY, boxW, bottomH).stroke();
        doc.rect(x, bottomY, boxW, 16).fill('#f1f5f9').stroke();
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');
        doc.text(title, x, bottomY + 5, { align: 'center', width: boxW });
      };

      drawBottomBox('AUTENTICAÇÃO DO SUJEITO PASSIVO', box1X);
      drawBottomBox('USO EXCLUSIVO DOS SERVIÇOS (RECEPÇÃO)', box2X);
      drawBottomBox('USO EXCLUSIVO DOS SERVIÇOS (CAIXA)', box3X);

      // Box 1 Content
      doc.fontSize(6).font('Helvetica').fillColor('#334155');
      doc.text('Data: ____ / ____ / __________', box1X + 5, bottomY + 23);
      doc.text(`Nome: ${(dadosEmpresa.nome || 'Payroll Tech Mz Lda').toUpperCase()}`, box1X + 5, bottomY + 38, { width: boxW - 10 });
      doc.text('Ass: ___________________________', box1X + 5, bottomY + 63);
      doc.text('Qualidade: GERENTE / PROCURADOR', box1X + 5, bottomY + 78);

      // Box 2 Content
      doc.text('N de Registo: __________________', box2X + 5, bottomY + 23);
      doc.text('Data da recepção: ____ / ____ / ______', box2X + 5, bottomY + 38);
      doc.text('Nome do Funcionario:', box2X + 5, bottomY + 53);
      doc.text('_______________________________', box2X + 5, bottomY + 63);
      doc.text('Ass: ___________________________', box2X + 5, bottomY + 78);

      // Box 3 Content
      doc.text('N de Registo: __________________', box3X + 5, bottomY + 23);
      doc.text('Data da recepção: ____ / ____ / ______', box3X + 5, bottomY + 38);
      doc.text('Nome do Funcionario:', box3X + 5, bottomY + 53);
      doc.text('_______________________________', box3X + 5, bottomY + 63);
      doc.text('Ass: ___________________________', box3X + 5, bottomY + 78);

      // --- NOTAS DE RODAPÉ ---
      const footerY = 765;
      doc.fontSize(5.5).font('Helvetica-Oblique').fillColor('#94a3b8');
      doc.text('Declaração gerada electronicamente pelo sistema integrado PayrollTech MZ. Os valores declarados de Trabalho Dependente correspondem fielmente às folhas de salário fechadas e liquidadas para o período selecionado. A submissão e quitação devem ser efetuadas em conformidade com as regras fiscais da Direcção Geral dos Impostos e Autoridade Tributária da República de Moçambique.', startX, footerY, { align: 'justify', width: width });

      doc.end();

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gera PDF do Relatório ERP Agrupado (Custos, Despesas, Vendas, Compras, Clientes, Fornecedores, Balancete, Diário Caixa, Fluxo Caixa, Balanço)
 */
export function criarRelatorioAgrupadoERPPDF(
  dadosEmpresa: any,
  tipoRelatorio: string,
  periodo: string,
  dados: any,
  caminhoFicheiro: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(caminhoFicheiro);
      doc.pipe(stream);

      // Logotipo e Cabeçalho
      let textX = 40;
      let drawn = false;
      if (dadosEmpresa.logo && dadosEmpresa.logo.startsWith('data:image/')) {
        try {
          const parts = dadosEmpresa.logo.split(';base64,');
          const mime = parts[0];
          const base64Data = parts[1];
          if (base64Data && (mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg'))) {
            doc.image(Buffer.from(base64Data, 'base64'), 40, 35, { width: 40 });
            textX = 90;
            drawn = true;
          }
        } catch (e) {}
      }
      if (!drawn) {
        try {
          const pathLogo = path.join(process.cwd(), 'public', 'logo-payroll.png');
          if (fs.existsSync(pathLogo)) {
            doc.image(pathLogo, 40, 35, { width: 40 });
            textX = 90;
          }
        } catch (e) {}
      }

      const nomeEmpresa = (dadosEmpresa.nome || 'Payroll Tech Mz Lda').toUpperCase();
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text(nomeEmpresa, textX, 35);
      doc.fontSize(8).font('Helvetica').fillColor('#475569');
      doc.text(`NUIT: ${dadosEmpresa.nuit || '400999999'}  |  Moçambique  |  Período: ${periodo || 'Geral'}`, textX, 48);

      doc.moveTo(40, 65).lineTo(555, 65).stroke('#cbd5e1');

      // Título do Relatório
      let tituloReport = 'RELATÓRIO ERP';
      let subtituloReport = 'Demonstração Financeira & Contabilística';

      if (tipoRelatorio === 'custos_despesas') {
        tituloReport = 'RELATÓRIO AGRUPADO DE CUSTOS E DESPESAS';
        subtituloReport = 'Análise por Categoria Operacional e Encargos';
      } else if (tipoRelatorio === 'vendas') {
        tituloReport = 'RELATÓRIO AGRUPADO DE VENDAS E FACTURAÇÃO';
        subtituloReport = 'Resumo por Cliente e Estados de Cobrança';
      } else if (tipoRelatorio === 'compras') {
        tituloReport = 'RELATÓRIO AGRUPADO DE COMPRAS E AQUISIÇÕES';
        subtituloReport = 'Resumo por Fornecedor e IVA Dedutível';
      } else if (tipoRelatorio === 'clientes') {
        tituloReport = 'EXTRATO CONSOLIDADO DE CLIENTES';
        subtituloReport = 'Posição Financeira e Contas a Receber';
      } else if (tipoRelatorio === 'fornecedores') {
        tituloReport = 'EXTRATO CONSOLIDADO DE FORNECEDORES';
        subtituloReport = 'Posição Financeira e Contas a Pagar';
      } else if (tipoRelatorio === 'balancete') {
        tituloReport = 'BALANCETE DE VERIFICAÇÃO DE CONTAS';
        subtituloReport = 'Sistema Geral de Contabilidade (PGC Moçambique)';
      } else if (tipoRelatorio === 'diario_caixa') {
        tituloReport = 'DIÁRIO DE CAIXA E TESOURARIA';
        subtituloReport = 'Registo Cronológico de Entradas e Saídas';
      } else if (tipoRelatorio === 'fluxo_caixa') {
        tituloReport = 'DEMONSTRAÇÃO DOS FLUXOS DE CAIXA (DFC)';
        subtituloReport = 'Fluxo de Atividades Operacionais e Saldo de Tesouraria';
      } else if (tipoRelatorio === 'balanco') {
        tituloReport = 'BALANÇO PATRIMONIAL';
        subtituloReport = 'Demonstração da Posição Financeira (Activo, Passivo e Capital Próprio)';
      } else if (tipoRelatorio === 'dr' || tipoRelatorio === 'demonstracao_resultados') {
        tituloReport = 'DEMONSTRAÇÃO DE RESULTADOS POR NATUREZA';
        subtituloReport = 'Apuramento das Operações e Resultado Líquido do Exercício (PGC Moçambique)';
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(tituloReport, 40, 75, { align: 'center' });
      doc.fontSize(8.5).font('Helvetica-Oblique').fillColor('#64748b').text(subtituloReport, 40, 90, { align: 'center' });

      let yLinha = 115;

      // Desenhar Tabela / Conteúdo de acordo com o tipo
      if (tipoRelatorio === 'custos_despesas') {
        doc.rect(40, yLinha, 515, 20).fill('#1e3a8a');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Categoria de Custo / Despesa', 45, yLinha + 6, { width: 180 });
        doc.text('Qtd Itens', 230, yLinha + 6, { width: 60, align: 'center' });
        doc.text('Valor Base (MT)', 295, yLinha + 6, { width: 80, align: 'right' });
        doc.text('IVA 16% (MT)', 380, yLinha + 6, { width: 80, align: 'right' });
        doc.text('Total com IVA (MT)', 465, yLinha + 6, { width: 85, align: 'right' });

        yLinha += 20;
        doc.font('Helvetica').fillColor('#334155');

        (dados.categorias || []).forEach((cat: any, idx: number) => {
          if (idx % 2 === 1) doc.rect(40, yLinha, 515, 18).fill('#f8fafc');
          doc.fontSize(8).fillColor('#1e293b');
          doc.text(cat.categoria, 45, yLinha + 5, { width: 180 });
          doc.text(String(cat.qtd), 230, yLinha + 5, { width: 60, align: 'center' });
          doc.text(Number(cat.valor_base).toFixed(2), 295, yLinha + 5, { width: 80, align: 'right' });
          doc.text(Number(cat.valor_iva).toFixed(2), 380, yLinha + 5, { width: 80, align: 'right' });
          doc.text(Number(cat.total).toFixed(2), 465, yLinha + 5, { width: 85, align: 'right' });
          yLinha += 18;
        });

        doc.rect(40, yLinha, 515, 20).fill('#e2e8f0');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('TOTAL DE CUSTOS E DESPESAS', 45, yLinha + 6);
        doc.text(Number(dados.totalGeralBase || 0).toFixed(2), 295, yLinha + 6, { width: 80, align: 'right' });
        doc.text(Number(dados.totalGeralIva || 0).toFixed(2), 380, yLinha + 6, { width: 80, align: 'right' });
        doc.text(Number(dados.totalGeral || 0).toFixed(2), 465, yLinha + 6, { width: 85, align: 'right' });
      } 
      else if (tipoRelatorio === 'vendas' || tipoRelatorio === 'clientes') {
        doc.rect(40, yLinha, 515, 20).fill('#065f46');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Cliente / Entidade', 45, yLinha + 6, { width: 160 });
        doc.text('NUIT', 210, yLinha + 6, { width: 70 });
        doc.text('Valor Base (MT)', 285, yLinha + 6, { width: 80, align: 'right' });
        doc.text('IVA Liquidado', 370, yLinha + 6, { width: 80, align: 'right' });
        doc.text('Total Facturado', 455, yLinha + 6, { width: 95, align: 'right' });

        yLinha += 20;
        doc.font('Helvetica').fillColor('#334155');

        (dados.clientes || []).forEach((c: any, idx: number) => {
          if (idx % 2 === 1) doc.rect(40, yLinha, 515, 18).fill('#f0fdf4');
          doc.fontSize(8).fillColor('#1e293b');
          doc.text(c.cliente, 45, yLinha + 5, { width: 160 });
          doc.text(c.nuit, 210, yLinha + 5, { width: 70 });
          doc.text(Number(c.valor_base).toFixed(2), 285, yLinha + 5, { width: 80, align: 'right' });
          doc.text(Number(c.valor_iva).toFixed(2), 370, yLinha + 5, { width: 80, align: 'right' });
          doc.text(Number(c.total).toFixed(2), 455, yLinha + 5, { width: 95, align: 'right' });
          yLinha += 18;
        });

        doc.rect(40, yLinha, 515, 20).fill('#dcfce7');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#065f46');
        doc.text('TOTAL VENDAS & COBRANÇAS', 45, yLinha + 6);
        doc.text(Number(dados.totalVendas || 0).toFixed(2), 455, yLinha + 6, { width: 95, align: 'right' });
      }
      else if (tipoRelatorio === 'compras' || tipoRelatorio === 'fornecedores') {
        doc.rect(40, yLinha, 515, 20).fill('#92400e');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Fornecedor / Entidade', 45, yLinha + 6, { width: 160 });
        doc.text('NUIT', 210, yLinha + 6, { width: 70 });
        doc.text('Valor Base (MT)', 285, yLinha + 6, { width: 80, align: 'right' });
        doc.text('IVA Dedutível', 370, yLinha + 6, { width: 80, align: 'right' });
        doc.text('Total Compras', 455, yLinha + 6, { width: 95, align: 'right' });

        yLinha += 20;
        doc.font('Helvetica').fillColor('#334155');

        (dados.fornecedores || []).forEach((f: any, idx: number) => {
          if (idx % 2 === 1) doc.rect(40, yLinha, 515, 18).fill('#fffbeb');
          doc.fontSize(8).fillColor('#1e293b');
          doc.text(f.fornecedor, 45, yLinha + 5, { width: 160 });
          doc.text(f.nuit, 210, yLinha + 5, { width: 70 });
          doc.text(Number(f.valor_base).toFixed(2), 285, yLinha + 5, { width: 80, align: 'right' });
          doc.text(Number(f.valor_iva).toFixed(2), 370, yLinha + 5, { width: 80, align: 'right' });
          doc.text(Number(f.total).toFixed(2), 455, yLinha + 5, { width: 95, align: 'right' });
          yLinha += 18;
        });

        doc.rect(40, yLinha, 515, 20).fill('#fef3c7');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#92400e');
        doc.text('TOTAL COMPRAS & PAGAMENTOS', 45, yLinha + 6);
        doc.text(Number(dados.totalCompras || 0).toFixed(2), 455, yLinha + 6, { width: 95, align: 'right' });
      }
      else if (tipoRelatorio === 'balancete') {
        doc.rect(40, yLinha, 515, 20).fill('#312e81');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Conta', 45, yLinha + 6, { width: 45 });
        doc.text('Descrição da Conta (PGC)', 95, yLinha + 6, { width: 175 });
        doc.text('Débito (MT)', 275, yLinha + 6, { width: 70, align: 'right' });
        doc.text('Crédito (MT)', 350, yLinha + 6, { width: 70, align: 'right' });
        doc.text('Saldo Dev.', 425, yLinha + 6, { width: 60, align: 'right' });
        doc.text('Saldo Cred.', 490, yLinha + 6, { width: 60, align: 'right' });

        yLinha += 20;

        (dados.contas || []).forEach((c: any, idx: number) => {
          if (idx % 2 === 1) doc.rect(40, yLinha, 515, 18).fill('#eef2ff');
          doc.fontSize(8).fillColor('#1e293b');
          doc.text(c.codigo, 45, yLinha + 5, { width: 45 });
          doc.text(c.nome, 95, yLinha + 5, { width: 175 });
          doc.text(Number(c.debito).toFixed(2), 275, yLinha + 5, { width: 70, align: 'right' });
          doc.text(Number(c.credito).toFixed(2), 350, yLinha + 5, { width: 70, align: 'right' });
          doc.text(Number(c.saldo_devedor).toFixed(2), 425, yLinha + 5, { width: 60, align: 'right' });
          doc.text(Number(c.saldo_credor).toFixed(2), 490, yLinha + 5, { width: 60, align: 'right' });
          yLinha += 18;
        });

        doc.rect(40, yLinha, 515, 20).fill('#e0e7ff');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#312e81');
        doc.text('TOTAL BALANCETE', 45, yLinha + 6);
        doc.text(Number(dados.totalDebito || 0).toFixed(2), 275, yLinha + 6, { width: 70, align: 'right' });
        doc.text(Number(dados.totalCredito || 0).toFixed(2), 350, yLinha + 6, { width: 70, align: 'right' });
        doc.text(Number(dados.totalSaldoDevedor || 0).toFixed(2), 425, yLinha + 6, { width: 60, align: 'right' });
        doc.text(Number(dados.totalSaldoCredor || 0).toFixed(2), 490, yLinha + 6, { width: 60, align: 'right' });
      }
      else if (tipoRelatorio === 'diario_caixa') {
        doc.rect(40, yLinha, 515, 20).fill('#0f172a');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Data', 45, yLinha + 6, { width: 60 });
        doc.text('Entidade / Descrição', 110, yLinha + 6, { width: 180 });
        doc.text('Tipo', 295, yLinha + 6, { width: 50 });
        doc.text('Valor (MT)', 350, yLinha + 6, { width: 90, align: 'right' });
        doc.text('Saldo Acumulado', 445, yLinha + 6, { width: 105, align: 'right' });

        yLinha += 20;

        (dados.movimentos || []).forEach((m: any, idx: number) => {
          if (idx % 2 === 1) doc.rect(40, yLinha, 515, 18).fill('#f1f5f9');
          doc.fontSize(8).fillColor('#1e293b');
          doc.text(m.data, 45, yLinha + 5, { width: 60 });
          doc.text(`${m.entidade ? m.entidade + ' - ' : ''}${m.descricao}`, 110, yLinha + 5, { width: 180 });
          doc.text(m.tipo, 295, yLinha + 5, { width: 50 });
          doc.text(Number(m.valor).toFixed(2), 350, yLinha + 5, { width: 90, align: 'right' });
          doc.text(Number(m.saldo_apos_movimento).toFixed(2), 445, yLinha + 5, { width: 105, align: 'right' });
          yLinha += 18;
        });

        doc.rect(40, yLinha, 515, 20).fill('#e2e8f0');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('SALDO FINAL DE CAIXA', 45, yLinha + 6);
        doc.text(Number(dados.saldoLiquido || 0).toFixed(2), 445, yLinha + 6, { width: 105, align: 'right' });
      }
      else if (tipoRelatorio === 'fluxo_caixa') {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('1. Fluxos de Caixa das Actividades Operacionais', 40, yLinha);
        yLinha += 15;

        doc.rect(40, yLinha, 515, 18).fill('#f8fafc');
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text('(+) Recebimentos de Clientes (Vendas Cobradas)', 50, yLinha + 4);
        doc.text(Number(dados.entradas?.recebimentoClientes || 0).toFixed(2), 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 18).fill('#ffffff');
        doc.text('(-) Pagamentos a Fornecedores (Compras Pagas)', 50, yLinha + 4);
        doc.text(`-${Number(dados.saidas?.pagamentoFornecedores || 0).toFixed(2)}`, 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 18).fill('#f8fafc');
        doc.text('(-) Pagamentos de Salários & Remunerações', 50, yLinha + 4);
        doc.text(`-${Number(dados.saidas?.pagamentoSalarios || 0).toFixed(2)}`, 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 18).fill('#ffffff');
        doc.text('(-) Pagamentos de Impostos (IRPS / INSS / IVA)', 50, yLinha + 4);
        doc.text(`-${Number(dados.saidas?.pagamentoImpostos || 0).toFixed(2)}`, 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 22).fill('#1e3a8a');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('FLUXO DE CAIXA OPERACIONAL LÍQUIDO', 50, yLinha + 6);
        doc.text(Number(dados.fluxoLiquidoOperacional || 0).toFixed(2), 440, yLinha + 6, { align: 'right', width: 100 });
      }
      else if (tipoRelatorio === 'balanco') {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a8a').text('ACTIVO', 40, yLinha);
        yLinha += 15;

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text('Activo Corrente', 50, yLinha);
        yLinha += 12;

        doc.fontSize(8).font('Helvetica').text('Caixa e Bancos (Disponibilidades)', 60, yLinha);
        doc.text(Number(dados.activo?.corrente?.disponibilidades || 0).toFixed(2), 440, yLinha, { align: 'right', width: 100 });
        yLinha += 12;

        doc.text('Clientes (Contas a Receber)', 60, yLinha);
        doc.text(Number(dados.activo?.corrente?.clientes || 0).toFixed(2), 440, yLinha, { align: 'right', width: 100 });
        yLinha += 12;

        doc.text('Estado - IVA a Recuperar', 60, yLinha);
        doc.text(Number(dados.activo?.corrente?.ivaARecuperar || 0).toFixed(2), 440, yLinha, { align: 'right', width: 100 });
        yLinha += 15;

        doc.rect(40, yLinha, 515, 18).fill('#dbeafe');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e3a8a');
        doc.text('TOTAL DO ACTIVO', 50, yLinha + 5);
        doc.text(Number(dados.activo?.totalActivo || 0).toFixed(2), 440, yLinha + 5, { align: 'right', width: 100 });

        yLinha += 25;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#991b1b').text('PASSIVO E CAPITAL PRÓPRIO', 40, yLinha);
        yLinha += 15;

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text('Passivo Corrente', 50, yLinha);
        yLinha += 12;

        doc.fontSize(8).font('Helvetica').text('Fornecedores (Contas a Pagar)', 60, yLinha);
        doc.text(Number(dados.passivo?.corrente?.fornecedores || 0).toFixed(2), 440, yLinha, { align: 'right', width: 100 });
        yLinha += 12;

        doc.text('Impostos & Retenções a Pagar (IRPS/INSS/IVA)', 60, yLinha);
        doc.text(Number((dados.passivo?.corrente?.ivaAPagar || 0) + (dados.passivo?.corrente?.impostosRetidosAPagar || 0)).toFixed(2), 440, yLinha, { align: 'right', width: 100 });
        yLinha += 15;

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text('Capital Próprio', 50, yLinha);
        yLinha += 12;

        doc.fontSize(8).font('Helvetica').text('Capital Social & Resultados Acumulados', 60, yLinha);
        doc.text(Number(dados.capitalProprio?.totalCapitalProprio || 0).toFixed(2), 440, yLinha, { align: 'right', width: 100 });
        yLinha += 15;

        doc.rect(40, yLinha, 515, 18).fill('#fee2e2');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#991b1b');
        doc.text('TOTAL PASSIVO E CAPITAL PRÓPRIO', 50, yLinha + 5);
        doc.text(Number(dados.totalPassivoEPatrimonio || 0).toFixed(2), 440, yLinha + 5, { align: 'right', width: 100 });
      }
      else if (tipoRelatorio === 'dr' || tipoRelatorio === 'demonstracao_resultados') {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('Rendimentos e Gastos por Natureza (PGC Moçambique)', 40, yLinha);
        yLinha += 15;

        doc.rect(40, yLinha, 515, 18).fill('#f8fafc');
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text('(+) Vendas e Prestação de Serviços (Rendimentos)', 50, yLinha + 4);
        doc.text(Number(dados.vendasLiquidas || 0).toFixed(2), 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 18).fill('#ffffff');
        doc.text('(-) Custos das Mercadorias Vendidas e Matérias Consumidas', 50, yLinha + 4);
        doc.text(`-${Number(dados.custoMercadorias || 0).toFixed(2)}`, 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 18).fill('#f0fdf4');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#166534');
        doc.text('(=) MARGEM BRUTA DE EXPLORAÇÃO', 50, yLinha + 4);
        doc.text(Number(dados.margemBruta || 0).toFixed(2), 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 18).fill('#ffffff');
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text('(-) Gastos com Pessoal (Salários + INSS Patronal 4%)', 50, yLinha + 4);
        doc.text(`-${Number(dados.gastosPessoal || 0).toFixed(2)}`, 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 20).fill('#e0e7ff');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#312e81');
        doc.text('(=) RESULTADO OPERACIONAL (EBIT)', 50, yLinha + 5);
        doc.text(Number(dados.resultadoOperacional || 0).toFixed(2), 440, yLinha + 5, { align: 'right', width: 100 });
        yLinha += 20;

        doc.rect(40, yLinha, 515, 18).fill('#ffffff');
        doc.fontSize(8).font('Helvetica').fillColor('#334155');
        doc.text('(-) Estimativa do Imposto sobre Rendimento (IRPC 32%)', 50, yLinha + 4);
        doc.text(`-${Number(dados.impostoRendimentoEstimado || 0).toFixed(2)}`, 440, yLinha + 4, { align: 'right', width: 100 });
        yLinha += 18;

        doc.rect(40, yLinha, 515, 22).fill('#1e3a8a');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('(=) RESULTADO LÍQUIDO DO EXERCÍCIO', 50, yLinha + 6);
        doc.text(Number(dados.resultadoLiquido || 0).toFixed(2), 440, yLinha + 6, { align: 'right', width: 100 });
        yLinha += 25;
      }

      // Nota de Conformidade com Princípios Contabilísticos
      if (['balancete', 'balanco', 'dr', 'demonstracao_resultados', 'fluxo_caixa'].includes(tipoRelatorio)) {
        yLinha += 15;
        if (yLinha > 700) { doc.addPage(); yLinha = 40; }
        doc.rect(40, yLinha, 515, 42).fill('#f8fafc').stroke('#cbd5e1');
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
        doc.text('NOTA DE COMPLIANCE CONTABILÍSTICA (PGC MOÇAMBIQUE / NIRF):', 45, yLinha + 5);
        doc.fontSize(7).font('Helvetica').fillColor('#475569');
        doc.text('Este relatório obedece estritamente aos Princípios Contabilísticos do PGC Moçambique: Especialização do Exercício (Accrual Basis), Partidas Dobradas, Não Compensação de Saldos, Continuidade e Prudência. Todas as obrigações tributárias (IRPS, INSS e IVA) foram devidamente apuradas.', 45, yLinha + 16, { width: 505 });
      }

      // Rodapé
      yLinha += 40;
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#94a3b8');
      doc.text(`Relatório oficial emitido electronicamente por PayrollTech ERP Moçambique em ${new Date().toLocaleDateString('pt-MZ')}. Ficheiro auditado conforme regulamento fiscal da AT.`, 40, 780, { align: 'center', width: 515 });

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}


