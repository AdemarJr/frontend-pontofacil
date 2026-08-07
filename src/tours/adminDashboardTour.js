/**
 * Tour guiado do painel (gestor) — sequência de balões próximos aos elementos.
 */
import { startModuleTour } from './tourHelpers';

export const STORAGE_TOUR_ADMIN_DASHBOARD = 'pontofacil_tour_admin_dashboard_v1';

function steps() {
  return [
    {
      element: '#tour-sidebar',
      popover: {
        title: 'Menu principal',
        description:
          'Use o menu para acessar Início, Colaboradores, Jornadas, Ausências, Relatórios e Configurações. Daqui você gerencia toda a operação de ponto.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-dashboard-header',
      popover: {
        title: 'Painel de controle',
        description: 'Visualize a data de referência e o contexto do dia para acompanhar sua equipe.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-dashboard-metrics',
      popover: {
        title: 'Indicadores do dia',
        description:
          'Resumo rápido: total de colaboradores, presentes, ausentes e quantidade de registros de ponto hoje.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-dashboard-registros',
      popover: {
        title: 'Registros de hoje',
        description:
          'Últimas batidas do dia com tipo, horário e localização. Toque em Atualizar para recarregar a lista.',
        side: 'top',
        align: 'start',
      },
    },
  ];
}

/**
 * @param {{ force?: boolean }} opts — force=true ignora "já vi o tour" (ex.: botão Como usar)
 * @returns {(() => void) | undefined}
 */
export function runAdminDashboardTour(opts = {}) {
  return startModuleTour({
    storageKey: STORAGE_TOUR_ADMIN_DASHBOARD,
    steps: steps(),
    force: opts.force === true,
  });
}
