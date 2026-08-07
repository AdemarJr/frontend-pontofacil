/**
 * Tour guiado do app Meu ponto (colaborador).
 */
import { startModuleTour } from './tourHelpers';

export const STORAGE_TOUR_MEU_PONTO = 'pontofacil_tour_meu_ponto_v1';

function steps() {
  return [
    {
      element: '#tour-meu-header',
      popover: {
        title: 'Seu ponto digital',
        description:
          'Seu nome, empresa e menu (⋮) para sair. Em baixo, navegue entre Início, Pendências, Atestado e Férias. O registro segue as regras do administrador.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-meu-proximo',
      popover: {
        title: 'Próximo registro',
        description:
          'O sistema indica qual batida é esperada agora (entrada, intervalos ou saída), conforme a jornada e os registros anteriores.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-meu-lembretes',
      popover: {
        title: 'Lembretes',
        description: 'Opcional: ative notificações para lembrar dos horários de registro (depende do navegador e do aparelho).',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-meu-acao',
      popover: {
        title: 'Registrar ponto',
        description:
          'Abra a câmera para registrar com foto (se a empresa exigir) ou use o fluxo indicado. Com cerca virtual ativa, é preciso estar no local permitido.',
        side: 'top',
        align: 'center',
      },
    },
  ];
}

/**
 * @param {{ force?: boolean }} opts
 * @returns {(() => void) | undefined}
 */
export function runMeuPontoTour(opts = {}) {
  return startModuleTour({
    storageKey: STORAGE_TOUR_MEU_PONTO,
    steps: steps(),
    force: opts.force === true,
    driverConfig: {
      overlayColor: '#020617',
      overlayOpacity: 0.78,
      stagePadding: 10,
      stageRadius: 14,
    },
  });
}
