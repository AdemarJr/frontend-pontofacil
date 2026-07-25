import { Helmet } from 'react-helmet-async';
import { getSiteUrl } from '../../utils/siteUrl';

const SITE_NAME = 'PontoFácil';

const TITLE =
  'PontoFácil — Ponto eletrônico web/PWA para empresas e órgãos públicos | REP-P';

const DESCRIPTION =
  'Sistema REP-P 100% web: PWA no celular, totem com PIN, cerca virtual, jornadas, espelho de ponto, NSR, auditoria e exportações. Modo entrada/saída para prefeituras.';

const KEYWORDS = [
  'ponto eletrônico web',
  'REP-P',
  'controle de ponto digital',
  'ponto para prefeitura',
  'ponto entrada e saída',
  'totem de ponto',
  'espelho de ponto',
  'cerca virtual ponto',
  'PWA ponto',
  'Portaria 671',
].join(', ');

function buildJsonLd(base) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: SITE_NAME,
        url: base,
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        name: SITE_NAME,
        url: base,
        publisher: { '@id': `${base}/#organization` },
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description:
          'Sistema REP-P web e PWA: totem com PIN, Meu ponto no celular, cerca virtual, jornadas, espelho de ponto, NSR, auditoria e exportações administrativas.',
        url: base,
        publisher: { '@id': `${base}/#organization` },
      },
    ],
  };
}

/** Meta tags + JSON-LD para a landing pública (`/` logado off e `/landing`). */
export default function LandingSeo() {
  const base = getSiteUrl();
  const canonicalUrl = `${base}/`;
  const ogImage = `${base}/landing-painel-gestor.png`;
  const jsonLd = buildJsonLd(base);

  return (
    <Helmet prioritizeSeoTags>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
      <meta name="keywords" content={KEYWORDS} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="Painel do gestor PontoFácil — resumo do dia e registros" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={TITLE} />
      <meta name="twitter:description" content={DESCRIPTION} />
      <meta name="twitter:image" content={ogImage} />

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
