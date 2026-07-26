/**
 * Política de senha (espelha backend/src/shared/passwordPolicy.js).
 */
export function validarSenhaForte(senha) {
  const s = String(senha || '');
  if (s.length < 8) {
    return {
      ok: false,
      error: 'Senha deve ter no mínimo 8 caracteres.',
    };
  }

  if (s.length >= 12) {
    return { ok: true };
  }

  const hasUpper = /[A-Z]/.test(s);
  const hasLower = /[a-z]/.test(s);
  const hasDigit = /\d/.test(s);
  const hasSpecial = /[^A-Za-z0-9]/.test(s);
  const tipos = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

  if (tipos >= 3) {
    return { ok: true };
  }

  return {
    ok: false,
    error:
      'Use pelo menos 12 caracteres, ou 8+ com três tipos entre maiúscula, minúscula, número e símbolo.',
  };
}

export const PASSWORD_HINT =
  'Mínimo 8 caracteres (12+ recomendado) ou 8+ com maiúscula, minúscula, número e símbolo.';
