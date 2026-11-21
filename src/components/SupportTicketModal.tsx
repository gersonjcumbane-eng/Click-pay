import React, { useState, useEffect } from 'react';
import { X, Mail, MessageCircle, Send, CheckCircle2, Phone } from 'lucide-react';
import { syncSupportTicketToFirestore } from '../lib/firebase';

export const CLICKPAY_SUPPORT = {
  emailPrimary: 'click@payrolltech.co.mz',
  emailCc: 'gersonjcumbane@gmail.com',
  whatsappPrimaryNumber: '258842014173',
  whatsappPrimaryDisplay: '+258 84 201 4173',
  whatsappSecondaryNumber: '258861390061',
  whatsappSecondaryDisplay: '+258 86 139 0061',
  address: 'Bairro São Dâmaso, Machava Q4'
} as const;

export function buildSupportMailtoUrl(params?: {
  subject?: string;
  body?: string;
}): string {
  const subject = params?.subject || 'Suporte Técnico - ClickPay Moçambique';
  const body =
    params?.body ||
    'Olá Equipa de Suporte ClickPay,\n\nPreciso de apoio técnico na plataforma.\n\nEmpresa:\nContacto:\nDescrição do pedido:\n';
  return `mailto:${CLICKPAY_SUPPORT.emailPrimary}?cc=${encodeURIComponent(
    CLICKPAY_SUPPORT.emailCc
  )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildSupportWhatsAppUrl(params?: {
  number?: string;
  message?: string;
}): string {
  const num = (params?.number || CLICKPAY_SUPPORT.whatsappPrimaryNumber).replace(/[^0-9]/g, '');
  const msg =
    params?.message ||
    'Olá Equipa ClickPay, preciso de suporte técnico na plataforma ClickPay ERP.';
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  canalOrigem?: string;
  defaultEmpresa?: string;
  defaultEmail?: string;
  defaultTelefone?: string;
  defaultAssunto?: string;
}

interface SubmittedLinks {
  ticketId: string;
  whatsappPrimaryUrl: string;
  whatsappSecondaryUrl: string;
  mailtoUrl: string;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  canalOrigem = 'ClickPay ERP',
  defaultEmpresa = '',
  defaultEmail = '',
  defaultTelefone = '',
  defaultAssunto = ''
}) => {
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState(defaultEmpresa);
  const [email, setEmail] = useState(defaultEmail);
  const [telefone, setTelefone] = useState(defaultTelefone);
  const [assunto, setAssunto] = useState(defaultAssunto || 'Apoio Técnico & Configuração');
  const [prioridade, setPrioridade] = useState<'Normal' | 'Alta' | 'Urgente'>('Normal');
  const [mensagem, setMensagem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedLinks | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultEmpresa && !empresa) setEmpresa(defaultEmpresa);
      if (defaultEmail && !email) setEmail(defaultEmail);
      if (defaultTelefone && !telefone) setTelefone(defaultTelefone);
      if (defaultAssunto) setAssunto(defaultAssunto);
    }
  }, [isOpen, defaultEmpresa, defaultEmail, defaultTelefone, defaultAssunto]);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMsg(null);
    setSubmitted(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nomeTrim = nome.trim();
    const empresaTrim = empresa.trim() || 'Empresa Cliente';
    const emailTrim = email.trim().toLowerCase();
    const telefoneTrim = telefone.trim();
    const assuntoTrim = assunto.trim() || 'Pedido de Suporte Técnico';
    const mensagemTrim = mensagem.trim();

    if (!nomeTrim || !emailTrim || !telefoneTrim || !mensagemTrim) {
      setErrorMsg('Preencha Nome, E-mail, Telemóvel/WhatsApp e a descrição do pedido.');
      return;
    }

    setSubmitting(true);
    const fallbackTicketId = `SUP_${Date.now()}`;
    const whatsappText = [
      `*SUPORTE TÉCNICO CLICKPAY (#${fallbackTicketId})*`,
      `Prioridade: *${prioridade}*`,
      `Empresa: ${empresaTrim}`,
      `Nome: ${nomeTrim}`,
      `E-mail: ${emailTrim}`,
      `Contacto: ${telefoneTrim}`,
      `Assunto: *${assuntoTrim}*`,
      '',
      'Mensagem:',
      mensagemTrim
    ].join('\n');

    const mailSubject = `[Suporte ClickPay #${fallbackTicketId}] (${prioridade}) ${assuntoTrim} — ${empresaTrim}`;
    const mailBody = [
      `Ticket: ${fallbackTicketId}`,
      `Prioridade: ${prioridade}`,
      `Empresa: ${empresaTrim}`,
      `Nome: ${nomeTrim}`,
      `E-mail: ${emailTrim}`,
      `Telemóvel/WhatsApp: ${telefoneTrim}`,
      '',
      mensagemTrim
    ].join('\n');

    let finalLinks: SubmittedLinks = {
      ticketId: fallbackTicketId,
      whatsappPrimaryUrl: buildSupportWhatsAppUrl({
        number: CLICKPAY_SUPPORT.whatsappPrimaryNumber,
        message: whatsappText
      }),
      whatsappSecondaryUrl: buildSupportWhatsAppUrl({
        number: CLICKPAY_SUPPORT.whatsappSecondaryNumber,
        message: whatsappText
      }),
      mailtoUrl: buildSupportMailtoUrl({
        subject: mailSubject,
        body: mailBody
      })
    };

    try {
      const apiPromise = fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeTrim,
          empresa: empresaTrim,
          email: emailTrim,
          telefone: telefoneTrim,
          assunto: assuntoTrim,
          prioridade,
          mensagem: mensagemTrim,
          canalOrigem
        })
      }).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);

      const [apiRes] = await Promise.all([
        apiPromise,
        syncSupportTicketToFirestore({
          id: fallbackTicketId,
          nome: nomeTrim,
          empresa: empresaTrim,
          email: emailTrim,
          telefone: telefoneTrim,
          assunto: assuntoTrim,
          prioridade,
          mensagem: mensagemTrim,
          canalOrigem,
          emailDestino: CLICKPAY_SUPPORT.emailPrimary,
          whatsappDestino: CLICKPAY_SUPPORT.whatsappPrimaryDisplay
        })
      ]);

      if (apiRes?.sucesso && apiRes?.links) {
        finalLinks = {
          ticketId: apiRes.ticket?.id || fallbackTicketId,
          whatsappPrimaryUrl: apiRes.links.whatsappPrimaryUrl || finalLinks.whatsappPrimaryUrl,
          whatsappSecondaryUrl: apiRes.links.whatsappSecondaryUrl || finalLinks.whatsappSecondaryUrl,
          mailtoUrl: apiRes.links.mailtoUrl || finalLinks.mailtoUrl
        };
      }

      setSubmitted(finalLinks);
      setMensagem('');
    } catch {
      setSubmitted(finalLinks);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-blue-300">
              Atendimento em Moçambique · E-mail &amp; WhatsApp
            </p>
            <h2 id="support-modal-title" className="text-base font-semibold tracking-tight">
              Suporte Técnico ClickPay
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar janela de suporte"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Direct Quick Channels */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={buildSupportWhatsAppUrl({ number: CLICKPAY_SUPPORT.whatsappPrimaryNumber })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold transition-colors"
            >
              <MessageCircle size={14} />
              <span>WhatsApp {CLICKPAY_SUPPORT.whatsappPrimaryDisplay}</span>
            </a>
            <a
              href={buildSupportMailtoUrl()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold transition-colors"
            >
              <Mail size={14} />
              <span>{CLICKPAY_SUPPORT.emailPrimary}</span>
            </a>
          </div>
          <a
            href={`tel:+${CLICKPAY_SUPPORT.whatsappSecondaryNumber}`}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-950 font-mono text-[11px]"
          >
            <Phone size={12} />
            <span>{CLICKPAY_SUPPORT.whatsappSecondaryDisplay}</span>
          </a>
        </div>

        {/* Body */}
        <div className="p-5">
          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-950">
                    Pedido registado ({submitted.ticketId})
                  </p>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    O seu pedido foi encaminhado para{' '}
                    <span className="font-semibold">{CLICKPAY_SUPPORT.emailPrimary}</span> e registado na fila de WhatsApp ({CLICKPAY_SUPPORT.whatsappPrimaryDisplay}). Clique abaixo para iniciar imediatamente a conversa no WhatsApp ou abrir o seu cliente de e-mail:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={submitted.whatsappPrimaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-white text-xs font-semibold transition-colors"
                >
                  <MessageCircle size={15} />
                  <span>Enviar no WhatsApp Principal</span>
                </a>
                <a
                  href={submitted.mailtoUrl}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold transition-colors"
                >
                  <Mail size={15} />
                  <span>Abrir no E-mail ({CLICKPAY_SUPPORT.emailPrimary})</span>
                </a>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <a
                  href={submitted.whatsappSecondaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium text-slate-600 hover:text-blue-900 underline"
                >
                  Alternativo: WhatsApp {CLICKPAY_SUPPORT.whatsappSecondaryDisplay}
                </a>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Seu Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Machava"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Nome da empresa"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    E-mail para Resposta *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.co.mz"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Telemóvel / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="+258 84 000 0000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Assunto *
                  </label>
                  <input
                    type="text"
                    required
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    placeholder="Ex: Dúvida sobre IRPS / SISSMO / Acesso"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as 'Normal' | 'Alta' | 'Urgente')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Descreva o pedido *
                </label>
                <textarea
                  required
                  rows={3}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Explique o que precisa para que a nossa equipa responda por E-mail e WhatsApp..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-950 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Send size={14} />
                  <span>{submitting ? 'A encaminhar...' : 'Enviar para E-mail & WhatsApp'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTicketModal;
