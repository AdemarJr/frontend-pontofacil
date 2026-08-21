/** URLs de assets em `public/` (favicon, PWA, logos). */
export function publicUrl(path) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Logo clara (texto branco + ícone verde) — fundos escuros/verdes, dark mode, login, totem. */
export const LOGO_DARK = '/logo-dark.png';

/** Alias legado — mesma arte dark (headers verdes / dark). */
export const LOGO_INTERNO = LOGO_DARK;

/** Logo empilhada dark (auth stacked). */
export const LOGO_STACKED = LOGO_DARK;

/** Marca empilhada (ícone + texto verde) — sidebar recolhida. */
export const LOGO_MARK = '/logo-mark.png';

/** Logo colorida — fundos claros (sidebar light, landing). */
export const LOGO_COLORIDO = '/logo-horizontal.png';

export function logoDarkUrl() {
  return publicUrl(LOGO_DARK);
}

export function logoInternoUrl() {
  return logoDarkUrl();
}

export function logoStackedUrl() {
  return logoDarkUrl();
}

export function logoMarkUrl() {
  return publicUrl(LOGO_MARK);
}

export function logoColoridoUrl() {
  return publicUrl(LOGO_COLORIDO);
}

/** Logo adequada ao tema do painel (sidebar). */
export function logoSidebarUrl(theme, collapsed = false) {
  if (collapsed) return logoMarkUrl();
  return theme === 'dark' ? logoDarkUrl() : logoColoridoUrl();
}
