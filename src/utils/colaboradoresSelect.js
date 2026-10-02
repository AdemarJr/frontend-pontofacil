/**
 * Helpers para selects de colaborador no painel.
 * Colaboradores desativados (ativo === false) não devem ser selecionáveis
 * em módulos operacionais (escalas, férias, folha, filtros de ação).
 */

export function isColaboradorAtivo(u) {
  return Boolean(u) && u.ativo !== false;
}

/**
 * @param {Array} lista
 * @param {{ role?: string|null, apenasAtivos?: boolean, roles?: string[] }} [opts]
 */
export function filtrarColaboradoresSelect(lista, opts = {}) {
  const {
    role = 'COLABORADOR',
    roles = null,
    apenasAtivos = true,
  } = opts;

  return (Array.isArray(lista) ? lista : []).filter((u) => {
    if (!u) return false;
    if (apenasAtivos && !isColaboradorAtivo(u)) return false;
    if (roles && roles.length) {
      if (!roles.includes(u.role)) return false;
    } else if (role && u.role !== role) {
      return false;
    }
    return true;
  });
}

/** Rótulo amigável (útil se algum lugar ainda listar inativos). */
export function labelColaboradorSelect(u) {
  if (!u) return '';
  return isColaboradorAtivo(u) ? u.nome : `${u.nome} (Inativo)`;
}
