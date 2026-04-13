// src/pages/Landing.js — página pública de vendas
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicUrl } from '../utils/branding';
import { trackLandingPageView } from '../utils/googleAnalyticsLanding';
import '../styles/landing.css';

const WA_NUMBER = '5592994764780';
const WA_TEXT = encodeURIComponent(
  'Olá! Gostaria de falar com um consultor sobre o PontoFácil — controle de ponto digital.'
);
const WA_HREF = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

/** Logo horizontal (fundo escuro) — `public/logo-landing.png` */
const LOGO_LANDING = '/logo-landing.png';

/** Ordem e tamanhos otimizados para o grid Bento (desktop). */
const FEATURES = [
  {
    icon: '📊',
    title: 'Dashboard do gestor',
    text: 'Visão do dia, colaboradores, configurações da empresa e gestão de equipe em um só lugar.',
    bento: '2x2',
    highlight: true,
  },
  {
    icon: '📍',
    title: 'Cerca virtual',
    text: 'Defina as áreas permitidas para registro de ponto e evite fraudes.',
    bento: '2x1',
    highlight: true,
  },
  {
    icon: '🕐',
    title: 'Jornadas e escalas',
    text: 'Configure horários e escalas com flexibilidade, de acordo com a necessidade da sua empresa.',
    bento: '2x1',
    highlight: true,
  },
  {
    icon: '🖥️',
    title: 'Totem com PIN',
    text: 'Tablet na entrada com teclado numérico, registro rápido por PIN e foto opcional — ideal para recepção.',
    bento: '2x1',
  },
  {
    icon: '📋',
    title: 'Espelho de ponto e relatórios',
    text: 'Espelho mensal por colaborador, exportação CSV, ajustes manuais com motivo e auditoria.',
    bento: '2x1',
  },
  {
    icon: '📷',
    title: 'Foto no registro',
    text: 'Evidência visual integrada (armazenamento seguro; modo desenvolvimento sem S3 também disponível).',
    bento: '2x1',
  },
  {
    icon: '🏢',
    title: 'Multi-empresa (SaaS)',
    text: 'Isolamento total por tenant: cada cliente com seus dados, usuários e políticas próprias.',
    bento: '2x1',
  },
];

const SECURITY = [
  { icon: '🔐', title: 'Acesso seguro', desc: 'Login com renovação automática de sessão e proteção extra no totem, para quem só bate ponto.' },
  { icon: '🔒', title: 'Senhas e PIN protegidos', desc: 'Credenciais armazenadas com padrão de mercado; PIN numérico rápido para o colaborador no totem.' },
  { icon: '🛡️', title: 'Proteção contra abuso', desc: 'Limites de uso que ajudam a evitar registros em massa ou tentativas suspeitas.' },
  { icon: '📸', title: 'Privacidade das fotos', desc: 'Evidências com acesso restrito; dados de rede tratados de forma a apoiar auditoria sem expor informação sensível.' },
];

export default function Landing() {
  useEffect(() => {
    trackLandingPageView();
  }, []);

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo" aria-label="Ponto Fácil — início">
            <img
              src={publicUrl(LOGO_LANDING)}
              alt="Ponto Fácil"
              className="landing-logo-img"
              width={360}
              height={80}
            />
          </Link>
          <nav className="landing-nav" aria-label="Seções">
            <a href="#produto">Produto</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#planos">Planos</a>
            <a href="#seguranca">Segurança</a>
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
            <p className="landing-hero-kicker">Para empresas que querem ponto simples, seguro e sob controle</p>
            <h1>Controle de ponto digital que sua empresa merece</h1>
            <p className="lead">
              Com o PontoFácil você organiza jornadas e escalas, reduz risco de registro fora do local com cerca
              virtual e acompanha tudo em um painel — totem com PIN, relatórios e multi-empresa em uma solução que
              roda no navegador ou instalada no tablet e no celular (PWA).
            </p>
            <div className="landing-pill-row" aria-hidden>
              <span className="landing-pill">Jornadas e escalas</span>
              <span className="landing-pill">Cerca virtual</span>
              <span className="landing-pill">Totem com PIN</span>
              <span className="landing-pill">Multi-empresa</span>
            </div>
            <div className="landing-hero-ctas">
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-wa">
                <span className="landing-btn-wa-icon" aria-hidden>💬</span>
                Fale com um de nossos consultores
              </a>
              <Link to="/login" className="landing-btn-outline-light">
                Já sou cliente — Entrar
              </Link>
            </div>
            <p className="landing-hero-wa-note">
              WhatsApp: <strong>(92) 99476-4780</strong>
            </p>
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

      <section id="produto" className="landing-section landing-showcase-section">
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
                  <div className="icon" aria-hidden>{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="landing-section alt">
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
                <li>Totem + PIN</li>
                <li>Dashboard e colaboradores</li>
                <li>Jornadas, escalas e espelho de ponto</li>
                <li>Cerca virtual e foto configuráveis</li>
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
                <span className="landing-security-icon" aria-hidden>{s.icon}</span>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="landing-security-footnote">
            Em evolução: mais integrações com folha, notificações e outras melhorias. Pergunte ao consultor o
            que já está disponível hoje e o que vem na sequência para o seu caso.
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
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Quer ver o PontoFácil no seu cenário?</h2>
          <p>
            Conte para a gente o tamanho da equipe e como vocês registram ponto hoje. Respondemos com plano,
            próximos passos e tudo o que precisa para decidir com segurança.
          </p>
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-wa landing-btn-wa--lg">
            💬 Fale com um de nossos consultores
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
          <strong>PontoFácil</strong> — Sistema SaaS de controle de ponto digital
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
