/** URLs de assets em `public/` (favicon, PWA, logos). */
export function publicUrl(path) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Logo branca — fundos verdes/escuros (totem, Meu ponto, dark mode). */
export const LOGO_INTERNO = '/logo-interno.png';

/** Logo colorida — fundos claros (sidebar light, login). */
export const LOGO_COLORIDO = '/logo-horizontal.png';

export function logoInternoUrl() {
  return publicUrl(LOGO_INTERNO);
}

export function logoColoridoUrl() {
  return publicUrl(LOGO_COLORIDO);
}

/** Logo adequada ao tema do painel (sidebar). */
export function logoSidebarUrl(theme) {
  return theme === 'dark' ? logoInternoUrl() : logoColoridoUrl();
}
