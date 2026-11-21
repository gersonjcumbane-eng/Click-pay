/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN_PAYROLL';

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('paytek_token') || '';
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
