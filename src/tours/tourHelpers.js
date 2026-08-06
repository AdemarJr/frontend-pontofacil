/**
 * Base para tours (driver.js) — progresso, textos em PT, persistência em localStorage.
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

/** Mantém só passos cujo seletor existe (útil quando parte da tela só aparece após escolha, ex.: escala com colaborador). */
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
 * Tour sob demanda: use force:true no botão "Como usar".
 * Auto (force:false) só deve ser chamado no 1º login (Início / Meu ponto).
 *
 * @param {{ storageKey: string, steps: import('driver.js').DriveStep[], force?: boolean }} opts
 */
export function startModuleTour(opts) {
  const { storageKey, steps, force = false } = opts;
  if (typeof window === 'undefined') return;

  if (!force) {
    try {
      if (localStorage.getItem(storageKey) === '1') return;
    } catch {
      /* ignore */
    }
  }

  const resolved = filterStepsPresent(steps);
  if (resolved.length === 0) return;

  const driverObj = driver({
    ...DEFAULT_CONFIG,
    steps: resolved,
    onDestroyed: () => {
      try {
        localStorage.setItem(storageKey, '1');
      } catch {
        /* ignore */
      }
    },
  });

  driverObj.drive();
}
