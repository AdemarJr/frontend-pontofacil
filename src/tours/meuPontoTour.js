/**
 * Tour guiado do app Meu ponto (colaborador).
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const STORAGE_TOUR_MEU_PONTO = 'pontofacil_tour_meu_ponto_v1';

function buildSteps() {
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

function allTargetsPresent() {
  return ['#tour-meu-header', '#tour-meu-proximo', '#tour-meu-lembretes', '#tour-meu-acao'].every((sel) =>
    document.querySelector(sel)
  );
}

export function runMeuPontoTour(opts = {}) {
  const { force = false } = opts;
  if (typeof window === 'undefined') return;

  if (!force) {
    try {
      if (localStorage.getItem(STORAGE_TOUR_MEU_PONTO) === '1') return;
    } catch {
      /* ignore */
    }
  }

  if (!allTargetsPresent()) return;

  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Próximo',
    prevBtnText: 'Anterior',
    doneBtnText: 'Concluir',
    overlayColor: '#020617',
    overlayOpacity: 0.78,
    smoothScroll: true,
    animate: true,
    stagePadding: 10,
    stageRadius: 14,
    steps: buildSteps(),
    onDestroyed: () => {
      try {
        localStorage.setItem(STORAGE_TOUR_MEU_PONTO, '1');
      } catch {
        /* ignore */
      }
    },
  });

  driverObj.drive();
}
