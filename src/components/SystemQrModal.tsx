/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
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

function getLiveDomainUrl(): string {
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

interface GeneratedQrAsset {
  dataUrl: string;
  svg: string;
}

export default function SystemQrModal({
  isOpen,
  onClose
}: SystemQrModalProps) {
  const liveDomainUrl = useMemo(() => getLiveDomainUrl(), [isOpen]);
  const [qrAsset, setQrAsset] = useState<GeneratedQrAsset | null>(null);

  useEffect(() => {
    if (!isOpen || !liveDomainUrl) {
      setQrAsset(null);
      return;
    }

    let cancelled = false;

    const generateQr = async () => {
      try {
        const [png, svg] = await Promise.all([
          QRCode.toDataURL(liveDomainUrl, {
            width: 1024,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#0F172A', light: '#FFFFFF' }
          }),
          QRCode.toString(liveDomainUrl, {
            type: 'svg',
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#0F172A', light: '#FFFFFF' }
          })
        ]);

        if (!cancelled) {
          setQrAsset({ dataUrl: png, svg });
        }
      } catch (err) {
        console.error('Erro ao gerar código QR:', err);
      }
    };

    generateQr();
    return () => {
      cancelled = true;
    };
  }, [isOpen, liveDomainUrl]);

  if (!isOpen) {
    return null;
  }

  const handleDownloadPng = () => {
    if (!qrAsset?.dataUrl) return;
    const link = document.createElement('a');
    link.href = qrAsset.dataUrl;
    link.download = 'clickpay-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSvg = () => {
    if (!qrAsset?.svg) return;
    const blob = new Blob([qrAsset.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clickpay-qr.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
              {qrAsset ? (
                <img
                  src={qrAsset.dataUrl}
                  alt="Código QR ClickPay"
                  className="w-56 h-56 object-contain rounded-lg bg-white p-2.5 border border-slate-200"
                />
              ) : (
                <div className="text-xs text-slate-400">A gerar código QR...</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!qrAsset}
                onClick={handleDownloadPng}
                className="px-3 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={14} />
                <span>Baixar PNG</span>
              </button>
              <button
                type="button"
                disabled={!qrAsset}
                onClick={handleDownloadSvg}
                className="px-3 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={14} />
                <span>Baixar SVG</span>
              </button>
              <button
                type="button"
                disabled={!qrAsset}
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

            {qrAsset && (
              <img
                src={qrAsset.dataUrl}
                alt="Código QR ClickPay"
                className="w-72 h-72 mx-auto object-contain border border-slate-200 rounded-xl p-3 bg-white"
              />
            )}
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
