import { Helmet } from 'react-helmet-async';
import { getSiteUrl } from '../../utils/siteUrl';

const SITE_NAME = 'PontoFácil';

const TITLE =
  'Ponto digital para empresas — controle de ponto eletrônico (totem e celular) | PontoFácil';

const DESCRIPTION =
  'PontoFácil: sistema web e PWA com totem (PIN), Meu ponto, cerca virtual, jornadas, espelho de ponto e exportação CSV. Ideal para empresas no Brasil.';

const KEYWORDS = [
  'ponto digital para empresas',
  'controle de ponto eletrônico',
  'melhor sistema de ponto',
  'ponto eletrônico web',
  'totem de ponto',
  'espelho de ponto',
  'cerca virtual ponto',
  'PWA ponto',
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
          'Sistema web e PWA para controle de ponto: totem com PIN, registro pelo celular (Meu ponto), cerca virtual, jornadas, espelho de ponto e exportações.',
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
