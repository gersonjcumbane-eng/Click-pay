/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Document, Paragraph, TextRun, AlignmentType, HeadingLevel, UnderlineType, Packer, BorderStyle, ImageRun } from 'docx';

export interface CartaApoioOptions {
  destinatario?: string;
  ministerio?: string;
  localidade?: string;
  empresaNome?: string;
  dataExtenso?: string;
  representanteNome?: string;
  cargo?: string;
  contacto?: string;
  email?: string;
  website?: string;
}

export async function gerarCartaApoioDocx(options: CartaApoioOptions = {}): Promise<Buffer> {
  const destinatario = options.destinatario || 'À\nMinistério da Ciência, Tecnologia e Ensino Superior – MCTD\nMaputo, Moçambique';
  const empresaNome = options.empresaNome || 'ClickPay / Payroll Tech MZ';
  const dataExtenso = options.dataExtenso || 'Maputo, 27 de Agosto de 2026';
  const representanteNome = options.representanteNome || 'Gerson José Cumbane';
  const cargo = options.cargo || 'Representante / Fundador da Startup';
  const contacto = options.contacto || '+258 86 139 0061';
  const email = options.email || 'gersonjcumbane@gmail.com';
  const website = options.website || 'clickpay.co.mz';

  let logoImageRun: ImageRun | null = null;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-payroll.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      logoImageRun = new ImageRun({
        type: 'png',
        data: logoData,
        transformation: {
          width: 120,
          height: 60,
        },
      });
    }
  } catch (err) {
    console.error('Não foi possível carregar o logótipo para o Word:', err);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch / 2.54cm
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          ...(logoImageRun
            ? [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 200 },
                  children: [logoImageRun],
                }),
              ]
            : []),

          // Header / Destinatário
          new Paragraph({
            spacing: { after: 120, line: 276 },
            children: [
              new TextRun({
                text: 'À',
                bold: true,
                size: 24, // 12pt
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60, line: 276 },
            children: [
              new TextRun({
                text: 'Ministério da Ciência, Tecnologia e Ensino Superior – MCTD',
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 360, line: 276 },
            children: [
              new TextRun({
                text: 'Maputo, Moçambique',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Assunto
          new Paragraph({
            spacing: { after: 240, line: 276 },
            children: [
              new TextRun({
                text: 'Assunto: ',
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: 'Pedido de Apoio para Participação no Stand do MCTD',
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Saudação
          new Paragraph({
            spacing: { after: 200, line: 276 },
            children: [
              new TextRun({
                text: 'Exmos. Senhores,',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Parágrafo 1
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 276 },
            children: [
              new TextRun({
                text: 'A ',
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: empresaNome,
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: ', startup moçambicana dedicada ao desenvolvimento de soluções digitais inovadoras para a gestão de recursos humanos, processamento salarial, inclusão financeira e automatização de conformidade fiscal e regulatória moçambicana (IRPS, IVA, INSS/SISSMO e PGC-NIRF), vem, por meio desta, solicitar o vosso apoio para a sua participação no ',
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: 'Stand do MCTD',
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: '.',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Parágrafo 2
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 276 },
            children: [
              new TextRun({
                text: 'A participação neste evento constitui uma importante oportunidade para apresentar a nossa solução, divulgar o trabalho desenvolvido pela startup, estabelecer contactos estratégicos e contribuir para o fortalecimento do ecossistema de inovação e empreendedorismo tecnológico em Moçambique.',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Parágrafo 3
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 276 },
            children: [
              new TextRun({
                text: 'Contudo, a ',
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: empresaNome,
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: ' ',
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: 'não dispõe, neste momento, de condições financeiras para suportar os custos associados à participação no stand',
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
              new TextRun({
                text: '. Por se encontrar numa fase inicial de desenvolvimento e tração, os recursos disponíveis estão prioritariamente direcionados para o desenvolvimento e aperfeiçoamento da solução, validação do modelo de negócio e preparação para a escala no mercado nacional.',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Parágrafo 4
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 276 },
            children: [
              new TextRun({
                text: 'Deste modo, solicitamos respeitosamente o apoio do MCTD para viabilizar a nossa participação, permitindo-nos aproveitar esta oportunidade de exposição, aprendizagem e criação de parcerias que poderão contribuir significativamente para o crescimento da startup.',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Parágrafo 5
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 276 },
            children: [
              new TextRun({
                text: 'Agradecemos antecipadamente a atenção e consideração dispensadas ao presente pedido e esperamos poder contar com o vosso apoio.',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Parágrafo 6
          new Paragraph({
            spacing: { after: 400, line: 276 },
            children: [
              new TextRun({
                text: 'Sem outro assunto de momento, apresentamos os nossos melhores cumprimentos.',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Data
          new Paragraph({
            spacing: { after: 360, line: 276 },
            children: [
              new TextRun({
                text: dataExtenso,
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Assinatura
          new Paragraph({
            spacing: { after: 500, line: 276 },
            children: [
              new TextRun({
                text: `Pela ${empresaNome}`,
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Linha de assinatura
          new Paragraph({
            spacing: { after: 120, line: 276 },
            children: [
              new TextRun({
                text: '____________________________________________________',
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Nome do representante
          new Paragraph({
            spacing: { after: 40, line: 276 },
            children: [
              new TextRun({
                text: representanteNome,
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
            ],
          }),

          // Cargo
          new Paragraph({
            spacing: { after: 300, line: 276 },
            children: [
              new TextRun({
                text: cargo,
                size: 22, // 11pt
                font: 'Calibri',
              }),
            ],
          }),

          // Contactos
          new Paragraph({
            spacing: { after: 40, line: 240 },
            children: [
              new TextRun({
                text: `Contacto: ${contacto}`,
                size: 20, // 10pt
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40, line: 240 },
            children: [
              new TextRun({
                text: `E-mail: ${email}`,
                size: 20,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40, line: 240 },
            children: [
              new TextRun({
                text: `Website: ${website}`,
                size: 20,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
