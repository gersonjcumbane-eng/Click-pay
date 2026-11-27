/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Printer,
  QrCode,
  X
} from 'lucide-react';

interface SystemQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function getLiveDomainUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://clickpay.co.mz/';
  }
  const { origin, pathname } = window.location;
  const cleanPath = pathname.endsWith('/index.html')
    ? pathname.slice(0, -'index.html'.length)
    : pathname;
  const normalizedPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
  return `${origin}${normalizedPath}`;
}

interface QrMatrixData {
  size: number;
  path: string;
  data: Uint8Array | number[];
}

export function buildLiveQrMatrix(targetUrl: string): QrMatrixData | null {
  try {
    const createFn =
      (QRCode as unknown as { create?: typeof QRCode.create; default?: { create?: typeof QRCode.create } })
        ?.create ||
      (QRCode as unknown as { default?: { create?: typeof QRCode.create } })?.default?.create;

    if (!createFn) {
      return null;
    }

    const qr = createFn(targetUrl, { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const parts: string[] = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (data[y * size + x]) {
          parts.push(`M${x},${y}h1v1h-1z`);
        }
      }
    }

    return {
      size,
      path: parts.join(''),
      data
    };
  } catch (err) {
    console.error('Erro ao construir matriz QR:', err);
    return null;
  }
}

export function buildQrSvgMarkup(matrix: QrMatrixData, quietZone = 2): string {
  const total = matrix.size + quietZone * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Código QR ClickPay">`,
    `<rect width="${total}" height="${total}" fill="#FFFFFF"/>`,
    `<g transform="translate(${quietZone},${quietZone})">`,
    `<path d="${matrix.path}" fill="#0F172A"/>`,
    `</g>`,
    `</svg>`
  ].join('');
}

export function downloadLiveQrPng(targetUrl?: string): void {
  const url = targetUrl || getLiveDomainUrl();
  const matrix = buildLiveQrMatrix(url);
  if (!matrix || typeof document === 'undefined') return;

  const quietZone = 2;
  const totalModules = matrix.size + quietZone * 2;
  const canvasSize = 1024;
  const scale = Math.floor(canvasSize / totalModules);
  const actualSize = totalModules * scale;

  const canvas = document.createElement('canvas');
  canvas.width = actualSize;
  canvas.height = actualSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, actualSize, actualSize);
  ctx.fillStyle = '#0F172A';

  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.data[y * matrix.size + x]) {
        ctx.fillRect((x + quietZone) * scale, (y + quietZone) * scale, scale, scale);
      }
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'clickpay-qr.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadLiveQrSvg(targetUrl?: string): void {
  const url = targetUrl || getLiveDomainUrl();
  const matrix = buildLiveQrMatrix(url);
  if (!matrix || typeof document === 'undefined') return;

  const svgMarkup = buildQrSvgMarkup(matrix);
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = 'clickpay-qr.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

export function SystemQrCodeSvg({
  className = 'w-56 h-56'
}: {
  className?: string;
}) {
  const liveDomainUrl = useMemo(() => getLiveDomainUrl(), []);
  const matrix = useMemo(() => buildLiveQrMatrix(liveDomainUrl), [liveDomainUrl]);

  if (!matrix) {
    return (
      <div className="text-xs text-slate-500 py-8 text-center">
        Não foi possível gerar o código QR.
      </div>
    );
  }

  const quietZone = 2;
  const total = matrix.size + quietZone * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Código QR ClickPay"
      className={className}
    >
      <rect width={total} height={total} fill="#FFFFFF" />
      <g transform={`translate(${quietZone},${quietZone})`}>
        <path d={matrix.path} fill="#0F172A" />
      </g>
    </svg>
  );
}

export default function SystemQrModal({
  isOpen,
  onClose
}: SystemQrModalProps) {
  const liveDomainUrl = useMemo(() => getLiveDomainUrl(), [isOpen]);
  const hasQr = useMemo(() => Boolean(buildLiveQrMatrix(liveDomainUrl)), [liveDomainUrl]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-qr-modal-title"
      >
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                <QrCode size={18} />
              </div>
              <h2 id="system-qr-modal-title" className="text-base font-semibold text-slate-950">
                Código QR ClickPay
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
              aria-label="Fechar janela do código QR"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body — Apenas QR e Opções de Baixar */}
          <div className="p-6 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex items-center justify-center min-h-[268px]">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <SystemQrCodeSvg className="w-56 h-56 block" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!hasQr}
                onClick={() => downloadLiveQrPng(liveDomainUrl)}
                className="px-3 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={14} />
                <span>Baixar PNG</span>
              </button>
              <button
                type="button"
                disabled={!hasQr}
                onClick={() => downloadLiveQrSvg(liveDomainUrl)}
                className="px-3 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={14} />
                <span>Baixar SVG</span>
              </button>
              <button
                type="button"
                disabled={!hasQr}
                onClick={() => window.print()}
                className="px-3 py-2.5 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer size={14} />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Folha A4 Isolada para Impressão Directa */}
      <div
        data-a4-print-sheet="true"
        className="hidden print:block p-10 bg-white text-slate-950 font-sans"
      >
        <div className="max-w-lg mx-auto border border-slate-300 rounded-2xl p-8 space-y-8 text-center a4-avoid-break">
          <div className="flex items-center justify-center gap-3 border-b border-slate-200 pb-6">
            <img
              src={`${liveDomainUrl}clickpay-logo.png`}
              alt="ClickPay"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="text-left">
              <h1 className="text-xl font-semibold text-slate-950">ClickPay Moçambique</h1>
              <p className="text-xs text-slate-600">
                Facturação em Meticais &amp; Gestão Empresarial
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-950">
              Aponte a câmara do telemóvel para aceder
            </h2>

            <div className="inline-block border border-slate-200 rounded-xl p-3 bg-white">
              <SystemQrCodeSvg className="w-72 h-72 block" />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-500">
            <span>NUIT 402302399 · NUEL 105086659</span>
            <span>+258 84 201 4173 · click@payrolltech.co.mz</span>
          </div>
        </div>
      </div>
    </>
  );
}
