/** URLs de assets em `public/` (favicon, PWA, logos). */
export function publicUrl(path) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Logo branca — painel, Super Admin, totem e Meu ponto (fundo verde ou escuro). */
export const LOGO_INTERNO = '/logo-interno.png';

export function logoInternoUrl() {
  return publicUrl(LOGO_INTERNO);
}
