/**
 * Chaves de sessão que devem ser removidas no logout / token inválido.
 * Preferências de UI (tema, tours, lembretes) NÃO entram aqui.
 */
const AUTH_SESSION_KEYS = [
  'accessToken',
  'refreshToken',
  'usuario',
];

/** Flags de tour por módulo — devem sobreviver ao logout. */
export const TOUR_STORAGE_KEYS = [
  'pontofacil_tour_admin_dashboard_v1',
  'pontofacil_tour_meu_ponto_v1',
  'pontofacil_tour_escalas_v2',
  'pontofacil_tour_colaboradores_v2',
  'pontofacil_tour_configuracoes_v1',
  'pontofacil_tour_relatorios_v1',
  'pontofacil_tour_ausencias_v1',
];

/**
 * Limpa só a sessão de autenticação.
 * Não usa localStorage.clear() — isso apagava tours/tema e fazia o tour
 * reaparecer em todo login.
 */
export function clearAuthSession() {
  try {
    AUTH_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

/** Marca todos os tours de módulo como já vistos (migração / usuário existente). */
export function markAllModuleToursSeen() {
  try {
    TOUR_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, '1'));
  } catch {
    /* ignore */
  }
}

/**
 * Se o navegador já tinha uso anterior do app, marca tours como vistos
 * para não reabrir o guia após o bug do localStorage.clear() no logout.
 * Instalação nova (sem rastros) continua com tour no 1º acesso.
 */
export function migrateTourFlagsForExistingUsers() {
  try {
    if (localStorage.getItem('pontofacil_tour_persist_v1') === '1') return;

    const hadPriorUse = !!(
      localStorage.getItem('pf-theme') ||
      localStorage.getItem('pf-theme-v2') ||
      localStorage.getItem('usuario') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('meuPontoPermissoesOk') ||
      localStorage.getItem('deviceId') ||
      TOUR_STORAGE_KEYS.some((k) => localStorage.getItem(k))
    );

    if (hadPriorUse) {
      markAllModuleToursSeen();
    }
    localStorage.setItem('pontofacil_tour_persist_v1', '1');
  } catch {
    /* ignore */
  }
}
