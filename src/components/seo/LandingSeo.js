import { Helmet } from 'react-helmet-async';
import { getSiteUrl } from '../../utils/siteUrl';

const SITE_NAME = 'PontoFácil';

const TITLE =
  'PontoFácil — Ponto digital com cerca digital | Software registrado no INPI';

const DESCRIPTION =
  'Ponto eletrônico web/PWA com cerca digital, registro online e offline, totem com PIN, espelho, NSR e integração com folha. Software registrado no INPI. Pyrou Web.';

const KEYWORDS = [
  'ponto eletrônico web',
  'cerca digital',
  'geofence ponto',
  'REP-P',
  'controle de ponto digital',
  'ponto para prefeitura',
  'totem de ponto',
  'espelho de ponto',
  'folha de pagamento',
  'PWA ponto',
  'software registrado INPI',
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
          'Sistema REP-P web e PWA com cerca digital, registro online e offline, totem com PIN, espelho de ponto e folha. Software registrado no INPI.',
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
