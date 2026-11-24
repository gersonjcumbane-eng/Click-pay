/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN_PAYROLL';

export const FOUNDER_EMAILS = [
  'gersonjcumbane@gmail.com',
  'admin@clickpay.co.mz',
  'admin@payrolltech.co.mz',
  'click@payrolltech.co.mz'
] as const;

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('paytek_token') || '';
}

export function getAuthUserEmail(): string {
  if (typeof window === 'undefined') return '';
  return String(localStorage.getItem('paytek_user') || '').toLowerCase().trim();
}

export function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(extraHeaders || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function isSuperAdminRole(role?: string | null): boolean {
  const localRole = typeof window !== 'undefined' ? localStorage.getItem('paytek_role') : null;
  const effective = role !== undefined && role !== null ? role : localRole;
  return effective === SUPER_ADMIN_ROLE;
}

export function isFounderEmail(email?: string | null): boolean {
  const localEmail = getAuthUserEmail();
  const effective = String(email !== undefined && email !== null ? email : localEmail)
    .toLowerCase()
    .trim();
  if (!effective) return false;
  return (FOUNDER_EMAILS as readonly string[]).includes(effective);
}

export const PAYMENTS_MODULE_LOCKED = true;
export const SYSTEM_MODE = 'apenas_facturacao' as const;
export const PAYMENTS_LOCKED_MESSAGE =
  'Todas as funcionalidades de pagamento estão bloqueadas. O sistema encontra-se configurado exclusivamente para Facturação.';

export function isPaymentsLocked(): boolean {
  return PAYMENTS_MODULE_LOCKED;
}

export function isFounderUser(role?: string | null, email?: string | null): boolean {
  return isSuperAdminRole(role) && isFounderEmail(email);
}
