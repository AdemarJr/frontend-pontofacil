/** URL pública canônica (sem barra final). Build: defina `REACT_APP_SITE_URL`. */
export function getSiteUrl() {
  const raw = (process.env.REACT_APP_SITE_URL || 'https://pontofacil.digital').trim();
  return raw.replace(/\/+$/, '');
}
