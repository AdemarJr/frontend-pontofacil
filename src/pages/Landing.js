// src/pages/Landing.js — página pública de vendas
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicUrl } from '../utils/branding';
import { trackLandingPageView } from '../utils/googleAnalyticsLanding';
import AppIcon from '../components/AppIcon';
import LandingSeo from '../components/seo/LandingSeo';
import '../styles/landing.css';

const WA_NUMBER = '5592994764780';
const WA_TEXT = encodeURIComponent(
  'Olá! Quero uma demonstração do PontoFácil — controle de ponto web/PWA para minha empresa ou órgão público.'
);
const WA_HREF = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

/** Logo no header (fundo claro) — `public/logo-horizontal.png`; rodapé usa filtro claro em CSS */
const LOGO_LANDING = '/logo-horizontal.png';

/** Dores comuns que a landing aborda (problema → solução). */
const PAIN_POINTS = [
  {
    icon: 'relatorios',
    title: 'Planilhas e papel no fim do mês',
    text: 'RH perde horas fechando espelho, caçando ajustes e respondendo dúvidas do contador.',
  },
  {
    icon: 'mapa',
    title: 'Registro fora do local',
    text: 'Sem regra clara de local, fica difícil confiar no ponto e evitar contestações.',
  },
  {
    icon: 'jornadas',
    title: 'Jornadas diferentes por equipe',
    text: 'Escalas variadas, turnos e exceções viram retrabalho quando o sistema não acompanha.',
  },
  {
    icon: 'shield',
    title: 'Auditoria e conformidade',
    text: 'Prefeituras e empresas precisam de rastreabilidade — quem alterou, quando e por quê.',
  },
];

/** Segmentos B2B (prova de encaixe / prova social leve). */
const SEGMENTS = [
  {
    title: 'Empresas privadas',
    text: 'Comércio, serviços e indústria com totem na recepção, app no celular e painel para o gestor.',
  },
  {
    title: 'Prefeituras e órgãos públicos',
    text: 'Modo entrada e saída (2 batidas), espelho mensal e exportações para controle interno e TC/TCE.',
  },
  {
    title: 'Operações multi-unidade',
    text: 'Cada cliente isolado no SaaS, com políticas próprias de cerca virtual, foto e tolerâncias.',
  },
];

/** Recursos REP-P administrativos (sem prometer certificação MTE). */
const REP_P_FEATURES = [
  { title: 'NSR sequencial', text: 'Numeração única por empresa em cada marcação, pronta para auditoria.' },
  { title: 'Comprovante PDF', text: 'Colaborador recebe comprovante após a batida (CRP administrativo).' },
  { title: 'Log de auditoria', text: 'Registros, ajustes e configurações ficam rastreados.' },
  { title: 'Pré-AFD e AEJ', text: 'Exportações para arquivo interno e análise de jornada/extras.' },
  { title: '2 ou 4 batidas', text: 'Entrada/saída simples ou com intervalo — definido por empresa.' },
  { title: 'Modo inviolável', text: 'Opcional: bloqueia exclusão de registros quando exigido pela política.' },
];

/** Ordem e tamanhos otimizados para o grid Bento (desktop). */
const FEATURES = [
  {
    icon: 'dashboard',
    title: 'Dashboard do gestor',
    text: 'Visão do dia, colaboradores, configurações da empresa e gestão de equipe em um só lugar.',
    bento: '2x2',
    highlight: true,
  },
  {
    icon: 'mapa',
    title: 'Cerca virtual',
    text: 'Defina áreas permitidas para registro e reduza risco de marcação fora do local.',
    bento: '2x1',
    highlight: true,
  },
  {
    icon: 'jornadas',
    title: 'Jornadas e escalas',
    text: 'Horários flexíveis por colaborador ou escala reutilizável — o espelho acompanha a regra.',
    bento: '2x1',
    highlight: true,
  },
  {
    icon: 'monitor',
    title: 'Totem com PIN',
    text: 'Tablet na entrada com teclado numérico, registro rápido por PIN e foto opcional.',
    bento: '2x1',
  },
  {
    icon: 'relatorios',
    title: 'Espelho e relatórios',
    text: 'Espelho mensal, exportação CSV/Excel/PDF, ajustes com motivo e trilha de auditoria.',
    bento: '2x1',
  },
  {
    icon: 'shield',
    title: 'REP-P web (Portaria 671)',
    text: 'NSR, comprovante, auditoria e exportações administrativas — sistema 100% web/PWA, sem relógio físico.',
    bento: '2x1',
    highlight: true,
  },
  {
    icon: 'empresa',
    title: 'Multi-empresa (SaaS)',
    text: 'Isolamento total por tenant: cada cliente com dados, usuários e políticas próprias.',
    bento: '2x1',
  },
];

const SECURITY = [
  { icon: 'shield', title: 'Acesso seguro', desc: 'Login com renovação automática de sessão e proteção extra no totem, para quem só bate ponto.' },
  { icon: 'lock', title: 'Senhas e PIN protegidos', desc: 'Credenciais armazenadas com padrão de mercado; PIN numérico rápido para o colaborador no totem.' },
  { icon: 'key', title: 'Proteção contra abuso', desc: 'Limites de uso que ajudam a evitar registros em massa ou tentativas suspeitas.' },
  { icon: 'camera', title: 'Privacidade das fotos', desc: 'Evidências com acesso restrito; dados de rede tratados de forma a apoiar auditoria sem expor informação sensível.' },
];

export default function Landing() {
  useEffect(() => {
    trackLandingPageView();
  }, []);

  return (
    <div className="landing">
      <LandingSeo />
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo" aria-label="Ponto Fácil — início">
            <img
              src={publicUrl(LOGO_LANDING)}
              alt="Ponto Fácil"
              className="landing-logo-img"
            />
          </Link>
          <nav className="landing-nav" aria-label="Seções">
            <a href="#desafios">Desafios</a>
            <a href="#produto">Produto</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#conformidade">Conformidade</a>
            <a href="#planos">Planos</a>
            <a href="#como-funciona">Como funciona</a>
          </nav>
          <div className="landing-header-actions">
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-header landing-btn-header--primary">
              Fale com um consultor
            </a>
            <Link to="/login" className="landing-btn-header landing-btn-header--ghost">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-hero-kicker">REP-P web · PWA no celular · Totem · Sem relógio físico</p>
            <h1>
              Ponto eletrônico <span className="landing-text-brand">100% digital</span> para empresas e órgãos públicos
            </h1>
            <p className="lead">
              O PontoFácil centraliza marcações, jornadas e espelho de ponto em um painel na nuvem. Colaboradores
              registram pelo celular (PWA) ou totem com PIN; o RH acompanha em tempo real, com cerca virtual,
              auditoria e exportações para controle interno — incluindo modo <strong>entrada e saída</strong> para
              prefeituras.
            </p>
            <div className="landing-pill-row" aria-hidden>
              <span className="landing-pill">PWA + Totem</span>
              <span className="landing-pill">Cerca virtual</span>
              <span className="landing-pill">2 ou 4 batidas</span>
              <span className="landing-pill">NSR e auditoria</span>
            </div>
            <div className="landing-hero-ctas">
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-wa">
                <span className="landing-btn-wa-icon" aria-hidden>
                  <AppIcon name="whatsapp" size={18} />
                </span>
                Fale com nossos consultores
              </a>
              <Link to="/login" className="landing-btn-outline-light">
                Já sou cliente!
              </Link>
            </div>
          </div>
          <div className="landing-hero-bento" aria-hidden>
            <div className="landing-hero-glass landing-hero-glass--a">
              <span className="landing-hero-glass-label">Painel</span>
              <strong>Registros hoje</strong>
              <span className="landing-hero-glass-stat">+16</span>
            </div>
            <div className="landing-hero-glass landing-hero-glass--b">
              <span className="landing-hero-glass-label">Cerca virtual</span>
              <strong>Geofence ativo</strong>
              <span className="landing-hero-glass-pill">Dentro da área</span>
            </div>
            <div className="landing-hero-glass landing-hero-glass--c">
              <span className="landing-hero-glass-label">PIN</span>
              <div className="landing-hero-mini-grid">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="landing-hero-mini-dot" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="desafios" className="landing-section alt">
        <div className="landing-section-inner">
          <h2>Reconhece esses desafios no seu RH?</h2>
          <p className="sub">
            Muitas equipes ainda fecham o mês no improviso. O PontoFácil foi pensado para substituir planilha e
            papel por um fluxo digital claro — do registro à exportação para o contador.
          </p>
          <div className="landing-pain-grid">
            {PAIN_POINTS.map((item) => (
              <article key={item.title} className="landing-card landing-pain-card">
                <div className="icon" aria-hidden>
                  <AppIcon name={item.icon} size={22} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="para-quem" className="landing-section">
        <div className="landing-section-inner">
          <h2>Para quem é o PontoFácil</h2>
          <p className="sub">
            Solução B2B em nuvem: implantação rápida, sem hardware de relógio de ponto e com regras configuráveis
            por cliente.
          </p>
          <div className="landing-segments">
            {SEGMENTS.map((s) => (
              <article key={s.title} className="landing-segment-card">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="produto" className="landing-section landing-showcase-section alt">
        <div className="landing-section-inner">
          <h2>O sistema em ação</h2>
          <p className="sub">
            Painel para o gestor acompanhar o dia e o app no celular para o colaborador registrar ponto com as regras da
            empresa.
          </p>
          <div className="landing-showcase-stack">
            <figure className="landing-showcase-figure landing-showcase-figure--hero">
              <figcaption className="landing-showcase-caption">Painel do gestor</figcaption>
              <div className="landing-showcase-frame landing-showcase-frame--browser">
                <img
                  src={publicUrl('/landing-painel-gestor.png')}
                  alt="Painel de controle com resumo do dia, colaboradores e registros de ponto"
                  className="landing-showcase-img"
                  width={1200}
                  height={675}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </figure>
            <div className="landing-showcase-devices">
              <figure className="landing-showcase-figure landing-showcase-figure--phone">
                <figcaption className="landing-showcase-caption">App do colaborador</figcaption>
                <div className="landing-showcase-frame landing-showcase-frame--phone">
                  <img
                    src={publicUrl('/landing-app-meu-ponto.png')}
                    alt="Tela Meu ponto no celular, com próximo registro e abertura da câmera"
                    className="landing-showcase-img"
                    width={390}
                    height={844}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </figure>
              <figure className="landing-showcase-figure landing-showcase-figure--phone">
                <figcaption className="landing-showcase-caption">Login no app</figcaption>
                <div className="landing-showcase-frame landing-showcase-frame--phone">
                  <img
                    src={publicUrl('/landing-app-login.png')}
                    alt="Tela de login do app para o colaborador"
                    className="landing-showcase-img"
                    width={390}
                    height={844}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </figure>
              <figure className="landing-showcase-figure landing-showcase-figure--tablet">
                <figcaption className="landing-showcase-caption">Totem · PIN</figcaption>
                <div className="landing-showcase-frame landing-showcase-frame--tablet">
                  <img
                    src={publicUrl('/landing-totem-pin.png')}
                    alt="Totem com teclado numérico para digitar PIN e registrar ponto"
                    className="landing-showcase-img"
                    width={390}
                    height={844}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="landing-section">
        <div className="landing-section-inner">
          <h2>O que você ganha com o PontoFácil</h2>
          <p className="sub">
            Funcionalidades pensadas para o gestor e para o RH: menos retrabalho, mais clareza no espelho de
            ponto e regras que acompanham a realidade da sua operação.
          </p>
          <div className="landing-bento">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className={[
                  'landing-bento-card',
                  f.bento === '2x2' ? 'landing-bento-card--2x2' : 'landing-bento-card--2x1',
                  f.highlight ? 'landing-bento-card--glow' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="landing-bento-card-inner">
                  <div className="icon" aria-hidden>
                    <AppIcon name={f.icon} size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="conformidade" className="landing-section alt">
        <div className="landing-section-inner">
          <h2>Conformidade REP-P (controle administrativo web)</h2>
          <p className="sub">
            O PontoFácil é um <strong>Registrador Eletrônico de Ponto por Programa (REP-P)</strong>: tudo roda no
            navegador ou PWA — não substitui relógio físico (REP-C). Recursos alinhados à Portaria MTE 671/2021
            para gestão e auditoria interna.
          </p>
          <div className="landing-rep-grid">
            {REP_P_FEATURES.map((item) => (
              <div key={item.title} className="landing-rep-item">
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <p className="landing-rep-disclaimer">
            <strong>Transparência:</strong> comprovantes e exportações atuais são <em>administrativos</em> (sem
            assinatura ICP-Brasil). Certificação formal REP-P junto ao MTE/INMETRO e AFD oficial com CAdES/PAdES
            estão previstos em fase futura — consulte nosso time o que já está disponível para o seu caso.
          </p>
        </div>
      </section>

      <section id="como-funciona" className="landing-section">
        <div className="landing-section-inner">
          <h2>Como funciona na prática</h2>
          <p className="sub">
            Em três passos você coloca a empresa no ar: configurar regras, cadastrar pessoas e acompanhar o
            ponto com relatórios prontos para o dia a dia.
          </p>
          <div className="landing-steps">
            <article className="landing-card landing-card--step">
              <div className="icon">1️⃣</div>
              <h3>Configure sua operação</h3>
              <p>
                Escolha o plano pelo tamanho da equipe, preencha os dados da empresa e defina se quer cerca
                virtual, foto obrigatória e tolerâncias — tudo em um painel simples.
              </p>
            </article>
            <article className="landing-card landing-card--step">
              <div className="icon">2️⃣</div>
              <h3>Cadastre e organize a jornada</h3>
              <p>
                Inclua colaboradores, cargos e departamentos; defina horários e escalas com a flexibilidade que
                o seu negócio pede. No totem, o time registra ponto com PIN, rápido e sem fila.
              </p>
            </article>
            <article className="landing-card landing-card--step">
              <div className="icon">3️⃣</div>
              <h3>Acompanhe com relatórios</h3>
              <p>
                Veja espelho de ponto, resumo do dia e exportações para análise ou contador. Ajustes manuais
                ficam registrados com motivo, para auditoria interna transparente.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="planos" className="landing-section">
        <div className="landing-section-inner">
          <h2>Planos por porte da equipe</h2>
          <p className="sub">
            Contrate pelo número de colaboradores que vão usar o sistema. Valores e implantação combinamos com
            você — fale com um consultor e receba uma proposta alinhada à sua empresa.
          </p>
          <div className="landing-plans">
            <div className="landing-plan">
              <h3>Básico</h3>
              <p className="price-note">Até 10 usuários</p>
              <ul>
                <li>Totem + PIN e app PWA</li>
                <li>Dashboard, colaboradores e espelho</li>
                <li>Jornadas, escalas e cerca virtual</li>
                <li>Modo 2 batidas (entrada/saída) ou 4 batidas</li>
              </ul>
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-plan landing-btn-plan--secondary btn-full">
                Solicitar proposta
              </a>
            </div>
            <div className="landing-plan featured">
              <h3>Profissional</h3>
              <p className="price-note">Até 50 usuários</p>
              <ul>
                <li>Tudo do Básico</li>
                <li>Mais capacidade para médias empresas</li>
                <li>Ideal para filiais e times maiores</li>
                <li>Suporte à implantação com consultor</li>
              </ul>
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-plan landing-btn-plan--primary btn-full">
                Fale com consultor
              </a>
            </div>
            <div className="landing-plan">
              <h3>Enterprise</h3>
              <p className="price-note">Usuários ilimitados</p>
              <ul>
                <li>Volume e requisitos corporativos</li>
                <li>Condições sob medida</li>
                <li>Integrações e roadmap alinhado</li>
                <li>Atendimento dedicado</li>
              </ul>
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-plan landing-btn-plan--secondary btn-full">
                Solicitar proposta
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="seguranca" className="landing-section alt">
        <div className="landing-section-inner">
          <h2>Segurança que você pode explicar ao seu time</h2>
          <p className="sub">
            Por trás do PontoFácil há uma arquitetura em nuvem com boas práticas de mercado — seus dados
            separados por empresa e operações protegidas contra uso indevido.
          </p>
          <div className="landing-security">
            {SECURITY.map((s) => (
              <div key={s.title} className="landing-security-item">
                <span className="landing-security-icon" aria-hidden>
                  <AppIcon name={s.icon} size={18} />
                </span>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="landing-security-footnote">
            Dados isolados por empresa (multi-tenant), consentimento LGPD no app do colaborador e evolução contínua
            do produto — folha de pagamento, notificações e integrações conforme o plano contratado.
          </p>
        </div>
      </section>

      <section className="landing-section landing-section--pwa">
        <div className="landing-section-inner landing-section-inner--center">
          <h2>Uso no celular, tablet ou totem — sem complicação</h2>
          <p className="sub landing-sub--tight">
            O PontoFácil é uma PWA: seu time pode &quot;instalar&quot; no aparelho, abrir em tela cheia no totem e
            usar gestos naturais, sem depender de publicação em loja de aplicativos para começar a operar.
          </p>

          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/meu-ponto" className="landing-btn-header landing-btn-header--primary">
              Abrir Meu ponto
            </Link>
            <Link to="/totem" className="landing-btn-header landing-btn-header--ghost">
              Abrir Totem
            </Link>
          </div>

          <div style={{ marginTop: 26, display: 'grid', gap: 14, width: '100%', maxWidth: 980 }}>
            <div className="landing-card" style={{ textAlign: 'left' }}>
              <h3 style={{ marginTop: 0 }}>📲 Como instalar o PWA do Meu-Ponto (colaborador)</h3>
              <p style={{ marginTop: 8, color: 'var(--cinza-400)' }}>
                Abra o link do Meu ponto no celular e adicione à tela inicial para usar como app.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
                <div style={{ border: '1px solid var(--cinza-200)', borderRadius: 12, padding: 14 }}>
                  <strong>📱 No Android (Google Chrome)</strong>
                  <ol style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, color: 'var(--cinza-700)', lineHeight: 1.55 }}>
                    <li>Abra o Chrome e acesse o Meu ponto.</li>
                    <li>Aguarde carregar. Se aparecer o banner “Adicionar à tela inicial”, toque nele.</li>
                    <li>Se não aparecer: toque em <strong>⋮</strong> (três pontinhos).</li>
                    <li>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                    <li>Confirme em <strong>Instalar</strong>.</li>
                  </ol>
                </div>
                <div style={{ border: '1px solid var(--cinza-200)', borderRadius: 12, padding: 14 }}>
                  <strong>🍎 No iOS / iPhone (Safari)</strong>
                  <ol style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, color: 'var(--cinza-700)', lineHeight: 1.55 }}>
                    <li>Abra o Safari e acesse o Meu ponto.</li>
                    <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
                    <li>Role e toque em <strong>Adicionar à Tela de Início</strong>.</li>
                    <li>Se quiser, edite o nome do ícone.</li>
                    <li>Toque em <strong>Adicionar</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="landing-card" style={{ textAlign: 'left' }}>
              <h3 style={{ marginTop: 0 }}>🖥️ Como instalar o PWA do Totem (tablet/recepção)</h3>
              <p style={{ marginTop: 8, color: 'var(--cinza-400)' }}>
                Abra o link do Totem no tablet/celular e instale para operar em tela cheia. Depois, configure o <strong>ID da empresa</strong> no próprio Totem.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
                <div style={{ border: '1px solid var(--cinza-200)', borderRadius: 12, padding: 14 }}>
                  <strong>📱 No Android (Google Chrome)</strong>
                  <ol style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, color: 'var(--cinza-700)', lineHeight: 1.55 }}>
                    <li>Abra o Chrome e acesse o Totem.</li>
                    <li>Toque em <strong>⋮</strong> (três pontinhos).</li>
                    <li>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                    <li>Confirme em <strong>Instalar</strong>.</li>
                    <li>Abra o ícone instalado e cole o <strong>ID da empresa</strong> quando solicitado.</li>
                  </ol>
                </div>
                <div style={{ border: '1px solid var(--cinza-200)', borderRadius: 12, padding: 14 }}>
                  <strong>🍎 No iOS / iPhone/iPad (Safari)</strong>
                  <ol style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, color: 'var(--cinza-700)', lineHeight: 1.55 }}>
                    <li>Abra o Safari e acesse o Totem.</li>
                    <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
                    <li>Toque em <strong>Adicionar à Tela de Início</strong>.</li>
                    <li>Toque em <strong>Adicionar</strong>.</li>
                    <li>Abra o ícone instalado e configure o <strong>ID da empresa</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Quer uma demonstração para sua empresa ou órgão?</h2>
          <p>
            Conte o porte da equipe, se usam só entrada/saída ou intervalo, e como registram ponto hoje. Montamos
            uma proposta com plano, implantação e próximos passos — sem compromisso.
          </p>
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-wa landing-btn-wa--lg">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <AppIcon name="whatsapp" size={20} aria-hidden />
              Fale com um de nossos consultores
            </span>
          </a>
          <p className="landing-cta-wa">
            WhatsApp: <strong>(92) 99476-4780</strong>
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <img
            src={publicUrl(LOGO_LANDING)}
            alt="Ponto Fácil"
            className="landing-footer-logo"
            width={320}
            height={72}
            decoding="async"
          />
        </div>
        <p>
          <strong>PontoFácil</strong> — Sistema SaaS de controle de ponto digital - Desenvolvido pela <a href="https://www.pyrou.com.br" target="_blank" rel="noopener noreferrer">Pyrou Web</a>
        </p>
        <p className="landing-footer-links">
          <Link to="/login">Acesso ao sistema</Link>
          {' · '}
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer">
            Contato comercial
          </a>
        </p>
      </footer>
    </div>
  );
}
