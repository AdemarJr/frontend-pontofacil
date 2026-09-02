/** Chaves localStorage do Totem */
export const TOTEM_TENANT_ID_KEY = 'totemTenantId';
export const TOTEM_TENANT_NOME_KEY = 'totemTenantNome';

/** UUID v1–v5 (aceita maiúsculas; normaliza para minúsculas). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Remove espaços, zero-width e caracteres inválidos de um ID colado.
 * Mantém apenas hex e hífens; retorna em minúsculas.
 */
export function normalizeTenantId(raw) {
  if (raw == null) return '';
  return String(raw)
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/[^0-9a-fA-F-]/g, '')
    .toLowerCase();
}

export function isValidTenantUuid(id) {
  return UUID_RE.test(String(id || ''));
}

export function readStoredTotemTenant() {
  return {
    id: normalizeTenantId(localStorage.getItem(TOTEM_TENANT_ID_KEY) || ''),
    nome: localStorage.getItem(TOTEM_TENANT_NOME_KEY) || '',
  };
}

export function persistTotemTenant(id, nomeFantasia = '') {
  const normalized = normalizeTenantId(id);
  localStorage.setItem(TOTEM_TENANT_ID_KEY, normalized);
  if (nomeFantasia) {
    localStorage.setItem(TOTEM_TENANT_NOME_KEY, String(nomeFantasia));
  } else {
    localStorage.removeItem(TOTEM_TENANT_NOME_KEY);
  }
  return normalized;
}

export function clearStoredTotemTenant() {
  localStorage.removeItem(TOTEM_TENANT_ID_KEY);
  localStorage.removeItem(TOTEM_TENANT_NOME_KEY);
}
