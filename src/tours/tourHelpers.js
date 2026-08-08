/**
 * Base para tours (driver.js) — progresso, textos em PT, persistência em localStorage.
 * Mantém no máx. 1 tour ativo; destroi ao sair da rota / iniciar outro.
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const DEFAULT_CONFIG = {
  showProgress: true,
  progressText: '{{current}} de {{total}}',
  nextBtnText: 'Próximo',
  prevBtnText: 'Anterior',
  doneBtnText: 'Concluir',
  overlayColor: '#0f172a',
  overlayOpacity: 0.72,
  smoothScroll: true,
  animate: true,
  stagePadding: 8,
  stageRadius: 10,
};

/** @type {ReturnType<typeof driver> | null} */
let activeTour = null;

/** Se true, onDestroyed grava "visto" no localStorage (só conclusão real). */
let persistSeenOnDestroy = false;

/** Encerra tour aberto (evita tela embaçada / pointer-events:none ao navegar). */
export function destroyActiveTour() {
  if (!activeTour) return;
  persistSeenOnDestroy = false;
  try {
    activeTour.destroy();
  } catch {
    /* ignore */
  }
  activeTour = null;
  try {
    document.body.classList.remove('driver-active', 'driver-fade', 'driver-no-interaction');
    document.documentElement.classList.remove('driver-active', 'driver-fade', 'driver-no-interaction');
  } catch {
    /* ignore */
  }
}

/** Mantém só passos cujo seletor existe. */
export function filterStepsPresent(steps) {
  return steps.filter((step) => {
    if (!step.element) return true;
    const sel = typeof step.element === 'string' ? step.element : null;
    if (!sel) return true;
    return document.querySelector(sel) != null;
  });
}

/** @deprecated use filterStepsPresent + length check */
export function tourTargetsReady(steps) {
  return filterStepsPresent(steps).length === steps.length;
}

/**
 * @param {{ storageKey: string, steps: import('driver.js').DriveStep[], force?: boolean, driverConfig?: object }} opts
 * @returns {(() => void) | undefined} cleanup para useEffect
 */
export function startModuleTour(opts) {
  const { storageKey, steps, force = false, driverConfig = {} } = opts;
  if (typeof window === 'undefined') return undefined;

  if (!force) {
    try {
      if (localStorage.getItem(storageKey) === '1') return undefined;
    } catch {
      /* ignore */
    }
  }

  const resolved = filterStepsPresent(steps);
  if (resolved.length === 0) return undefined;

  destroyActiveTour();

  persistSeenOnDestroy = false;

  /** @type {ReturnType<typeof driver>} */
  let driverObj;
  driverObj = driver({
    ...DEFAULT_CONFIG,
    ...driverConfig,
    steps: resolved,
    onNextClick: () => {
      if (driverObj.isLastStep()) {
        persistSeenOnDestroy = true;
        driverObj.destroy();
        return;
      }
      driverObj.moveNext();
    },
    onCloseClick: () => {
      persistSeenOnDestroy = false;
      driverObj.destroy();
    },
    onDestroyed: () => {
      if (activeTour === driverObj) activeTour = null;
      if (!persistSeenOnDestroy) return;
      persistSeenOnDestroy = false;
      try {
        localStorage.setItem(storageKey, '1');
      } catch {
        /* ignore */
      }
    },
  });

  activeTour = driverObj;
  driverObj.drive();

  return () => {
    if (activeTour === driverObj) destroyActiveTour();
  };
}
