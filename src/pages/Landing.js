// src/pages/Landing.js — landing pública SaaS B2B
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { publicUrl } from '../utils/branding';
import { trackLandingPageView } from '../utils/googleAnalyticsLanding';
import AppIcon from '../components/AppIcon';
import LandingSeo from '../components/seo/LandingSeo';
import '../styles/landing.css';

const WA_NUMBER = '5592994764780';

function waHref(message) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

const WA_DEMO = waHref(
  'Olá! Quero uma demonstração do PontoFácil — controle de ponto web/PWA para minha empresa ou órgão público.'
);
const WA_ESPECIALISTA = waHref(
  'Olá! Gostaria de falar com um especialista sobre o PontoFácil.'
);
const WA_ORCAMENTO = waHref(
  'Olá! Gostaria de solicitar um orçamento do PontoFácil para minha empresa.'
);

const LOGO_LANDING = '/logo-horizontal.png';

const NAV_LINKS = [
  { href: '#inicio', label: 'Início' },
  { href: '#produto', label: 'PontoFácil' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#registro', label: 'INPI' },
  { href: '#planos', label: 'Planos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#contato', label: 'Contato' },
];

const PONTO_BENEFITS = [
  'Registro apenas no local autorizado (cerca digital)',
  'Funciona online e offline',
  'Integração com folha de pagamento',
  'Registro pelo celular (PWA)',
  'Totem com PIN',
  'Dashboard em tempo real',
  'Relatórios inteligentes e espelho',
  'Auditoria de alterações',
];

const PILLAR_FEATURES = [
  { icon: 'mapa', title: 'Registro no local autorizado', text: 'A cerca digital libera a batida só dentro da área permitida pela empresa.' },
  { icon: 'lock', title: 'Mais segurança e confiabilidade', text: 'Marcações rastreadas, com auditoria e isolamento por empresa.' },
  { icon: 'relatorios', title: 'Relatórios inteligentes', text: 'Espelho, indicadores e exportações para decisões do RH e da gestão.' },
  { icon: 'wifi', title: 'Online e offline', text: 'O colaborador registra no celular mesmo sem rede; a fila sincroniza depois.' },
  { icon: 'folha', title: 'Integração com a folha', text: 'Horas do espelho alimentam folha mensal, férias, 13º e rescisão.' },
];

const FEATURES = [
  { icon: 'dashboard', title: 'Dashboard do gestor', text: 'Visão do dia, equipe e configurações em um só lugar.', bento: '2x2', highlight: true },
  { icon: 'mapa', title: 'Cerca digital', text: 'Registro apenas no local autorizado — menos contestações e mais controle.', bento: '2x1', highlight: true },
  { icon: 'monitor', title: 'Registro pelo celular', text: 'PWA no smartphone — colaborador registra com as regras da empresa.', bento: '2x1', highlight: true },
  { icon: 'wifi', title: 'Online e offline', text: 'Batidas no celular mesmo sem internet; sincronização automática ao reconectar.', bento: '2x1', highlight: true },
  { icon: 'folha', title: 'Folha de pagamento', text: 'Módulo opcional: processa horas, HE, faltas, férias, 13º e rescisão.', bento: '2x1', highlight: true },
  { icon: 'monitor', title: 'Totem com PIN', text: 'Tablet na recepção com teclado numérico e registro rápido.', bento: '1x1' },
  { icon: 'jornadas', title: 'Jornadas e escalas', text: 'Horários flexíveis por colaborador ou escala reutilizável, inclusive plantão noturno.', bento: '2x1' },
  { icon: 'relatorios', title: 'Espelho de ponto', text: 'Fechamento mensal com exportação CSV, Excel e PDF.', bento: '1x1' },
  { icon: 'relatorios', title: 'Relatórios inteligentes', text: 'Resumos e análises para RH e gestão operacional.', bento: '1x1' },
  { icon: 'shield', title: 'Auditoria', text: 'Rastreabilidade de ajustes, configurações e registros.', bento: '2x1', highlight: true },
  { icon: 'inpi', title: 'Registro no INPI', text: 'Programa de computador registrado no INPI.', bento: '1x1', highlight: true },
  { icon: 'empresa', title: 'Multiempresa', text: 'Cada cliente isolado no SaaS com políticas próprias.', bento: '1x1' },
  { icon: 'empresa', title: 'Gestão em nuvem', text: 'Acesso seguro de qualquer lugar, sem instalação local.', bento: '1x1' },
];

const STEPS = [
  { num: '01', title: 'Registre', text: 'O colaborador registra o ponto pelo celular, tablet ou totem.' },
  { num: '02', title: 'Gerencie', text: 'O gestor acompanha a jornada da equipe em tempo real.' },
  { num: '03', title: 'Analise', text: 'Relatórios e espelhos ajudam o RH a tomar decisões.' },
  { num: '04', title: 'Evolua', text: 'Tenha mais controle e reduza o trabalho operacional.' },
];

const PLANS = [
  {
    id: 'residencial',
    name: 'Residencial',
    price: '69,90',
    limit: 'Até 5 funcionários',
    features: ['Registro de ponto digital', 'App PWA', 'Totem com PIN', 'Dashboard', 'Espelho de ponto', 'Relatórios'],
    cta: 'Começar agora',
    wa: waHref('Olá! Tenho interesse no plano Residencial do PontoFácil (até 5 funcionários).'),
    featured: false,
    premium: false,
  },
  {
    id: 'residencial-plus',
    name: 'Residencial Plus',
    price: '160,00',
    limit: 'Até 15 funcionários',
    features: [
      'Tudo do plano Residencial',
      'Gestão de equipe ampliada',
      'Jornadas e escalas',
      'Cerca digital',
      'Registro online e offline',
      'Relatórios completos',
      'Suporte especializado',
    ],
    cta: 'Começar agora',
    wa: waHref('Olá! Tenho interesse no plano Residencial Plus do PontoFácil (até 15 funcionários).'),
    featured: true,
    premium: false,
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: '320,00',
    limit: 'Até 40 funcionários',
    features: [
      'Tudo do Residencial Plus',
      'Gestão para equipes maiores',
      'Multiunidade',
      'Recursos avançados',
      'Auditoria e controle',
      'Módulo de folha de pagamento',
      'Suporte à implantação',
    ],
    cta: 'Falar com especialista',
    wa: waHref('Olá! Tenho interesse no plano Profissional do PontoFácil (até 40 funcionários).'),
    featured: false,
    premium: false,
  },
  {
    id: 'empresarial-plus',
    name: 'Empresarial Plus',
    price: null,
    priceLabel: 'Personalizado',
    limit: 'Acima de 40 funcionários',
    features: [
      'Tudo do plano Profissional',
      'Estrutura personalizada',
      'Grandes equipes e multiempresa',
      'Integrações avançadas',
      'Implantação dedicada',
      'Atendimento prioritário',
    ],
    cta: 'Solicitar proposta',
    wa: waHref('Olá! Gostaria de solicitar proposta para o plano Empresarial Plus do PontoFácil.'),
    featured: false,
    premium: true,
  },
];

const STATS = [
  { icon: 'inpi', title: 'INPI', text: 'Programa de computador registrado no INPI.' },
  { icon: 'mapa', title: 'Cerca digital', text: 'Batida só no local autorizado.' },
  { icon: 'wifi', title: 'Online e offline', text: 'Registra no celular mesmo sem rede.' },
  { icon: 'folha', title: 'Folha', text: 'Horas do espelho na folha de pagamento.' },
  { icon: 'shield', title: 'Seguro', text: 'Dados protegidos e separados por empresa.' },
];

const PRODUCT_SHOTS = [
  {
    src: '/landing-painel-gestor.png',
    alt: 'Painel do gestor PontoFácil — resumo do dia, presentes e registros',
    caption: 'Painel do gestor',
    width: 1024,
    height: 920,
    frame: 'browser',
  },
  {
    src: '/landing-app-meu-ponto.png',
    alt: 'App Meu ponto — registro de ponto no celular com cerca virtual',
    caption: 'Meu ponto (PWA)',
    width: 472,
    height: 1024,
    frame: 'phone',
  },
  {
    src: '/landing-totem-pin.png',
    alt: 'Totem PontoFácil — tela de PIN para registro na recepção',
    caption: 'Totem com PIN',
    width: 472,
    height: 1024,
    frame: 'phone',
  },
];

const REP_P_FEATURES = [
  { title: 'NSR sequencial', text: 'Numeração única por empresa em cada marcação, pronta para auditoria.' },
  { title: 'Comprovante PDF', text: 'Colaborador recebe comprovante após a batida (CRP administrativo).' },
  { title: 'Log de auditoria', text: 'Registros, ajustes e configurações ficam rastreados.' },
  { title: 'Pré-AFD e AEJ', text: 'Exportações para arquivo interno e análise de jornada/extras.' },
  { title: '2 ou 4 batidas', text: 'Entrada/saída simples ou com intervalo — definido por empresa.' },
  { title: 'Modo inviolável', text: 'Opcional: bloqueia exclusão de registros quando exigido pela política.' },
];

const SECURITY = [
  { icon: 'shield', title: 'Controle de acesso', desc: 'Perfis de gestor, colaborador e super admin com permissões claras.' },
  { icon: 'lock', title: 'Proteção de credenciais', desc: 'Senhas e PIN armazenados com padrões de mercado.' },
  { icon: 'key', title: 'Limites anti-abuso', desc: 'Proteção contra registros em massa ou tentativas suspeitas.' },
  { icon: 'camera', title: 'Privacidade', desc: 'Dados isolados por empresa (multi-tenant) e consentimento LGPD no app.' },
];

const HERO_FLOATS = [
  { label: 'Registro realizado', className: 'landing-float--a' },
  { label: 'Geofence ativo', className: 'landing-float--b' },
  { label: 'Equipe online', className: 'landing-float--c' },
  { label: 'Controle em tempo real', className: 'landing-float--d' },
];

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = root.querySelectorAll('.landing-reveal');
    if (reduced) {
      els.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pageRef = useScrollReveal();

  useEffect(() => {
    trackLandingPageView();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing" ref={pageRef}>
      <LandingSeo />

      <header className={`landing-header${scrolled ? ' landing-header--scrolled' : ''}`}>
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo" aria-label="PontoFácil — início" onClick={closeMenu}>
            <img src={publicUrl(LOGO_LANDING)} alt="PontoFácil" className="landing-logo-img" width={280} height={72} />
          </Link>

          <nav className="landing-nav" aria-label="Seções principais">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <div className="landing-header-actions">
            <Link to="/login" className="landing-btn-header landing-btn-header--login">
              Entrar
            </Link>
            <a href={WA_ESPECIALISTA} target="_blank" rel="noopener noreferrer" className="landing-btn-header landing-btn-header--primary landing-btn-header--desktop">
              Falar com especialista
            </a>
            <button
              type="button"
              className={`landing-menu-toggle${menuOpen ? ' is-open' : ''}`}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        <div className={`landing-mobile-nav${menuOpen ? ' is-open' : ''}`} aria-hidden={!menuOpen}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={closeMenu}>{l.label}</a>
          ))}
          <Link to="/login" className="landing-btn-header landing-btn-header--ghost landing-btn-header--menu" onClick={closeMenu}>
            Entrar no sistema
          </Link>
          <a href={WA_ESPECIALISTA} target="_blank" rel="noopener noreferrer" className="landing-btn-header landing-btn-header--primary landing-btn-header--menu" onClick={closeMenu}>
            Falar com especialista
          </a>
        </div>
      </header>

      <section id="inicio" className="landing-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="landing-hero-inner landing-reveal">
          <div className="landing-hero-copy">
            <p className="landing-kicker landing-kicker--hero">Gestão de jornada inteligente</p>
            <div className="landing-hero-badges">
              <span className="landing-badge landing-badge--inpi">Software registrado no INPI</span>
              <span className="landing-badge">100% digital</span>
              <span className="landing-badge">Web + PWA</span>
              <span className="landing-badge">Cerca digital</span>
            </div>
            <h1>Ponto digital com <span>cerca digital</span>.</h1>
            <p className="lead">
              Mais segurança e controle para a sua empresa. Registro só no local autorizado, funcionamento online e offline e integração com a folha de pagamento.
            </p>
            <div className="landing-hero-ctas">
              <a href="#produto" className="landing-btn-primary">Conheça o PontoFácil</a>
              <Link to="/login" className="landing-btn-secondary landing-btn-secondary--outline">Entrar no sistema</Link>
              <a href={WA_ESPECIALISTA} target="_blank" rel="noopener noreferrer" className="landing-btn-secondary">
                <AppIcon name="whatsapp" size={18} aria-hidden />
                Falar com especialista
              </a>
            </div>
          </div>

          <div className="landing-hero-visual" aria-hidden>
            <div className="landing-hero-mockup-stack">
              <figure className="landing-hero-mockup landing-hero-mockup--main">
                <img
                  src={publicUrl('/landing-painel-gestor.png')}
                  alt=""
                  width={1024}
                  height={920}
                  loading="eager"
                  decoding="async"
                />
              </figure>
              <figure className="landing-hero-mockup landing-hero-mockup--phone">
                <img
                  src={publicUrl('/landing-app-meu-ponto.png')}
                  alt=""
                  width={472}
                  height={1024}
                  loading="eager"
                  decoding="async"
                />
              </figure>
              <figure className="landing-hero-mockup landing-hero-mockup--tablet">
                <img
                  src={publicUrl('/landing-totem-pin.png')}
                  alt=""
                  width={472}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </div>
            {HERO_FLOATS.map((f) => (
              <div key={f.label} className={`landing-float ${f.className}`}>{f.label}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--soft landing-pillars" aria-label="Diferenciais">
        <div className="landing-section-inner landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Tecnologia que protege</p>
            <h2>O que muda no <span>dia a dia</span> da sua operação</h2>
            <p className="sub">Cerca digital, registro confiável, relatórios para decisão, uso offline e ponte com a folha.</p>
          </div>
          <div className="landing-pillars-grid">
            {PILLAR_FEATURES.map((item) => (
              <article key={item.title} className="landing-pillar-card">
                <div className="landing-pillar-icon"><AppIcon name={item.icon} size={22} /></div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="produto" className="landing-section">
        <div className="landing-section-inner landing-product-split landing-reveal">
          <div className="landing-product-copy">
            <p className="landing-kicker landing-kicker--blue">PontoFácil</p>
            <h2>Ponto digital com <span>cerca digital</span> — mais simples, mais inteligente.</h2>
            <p className="sub landing-sub--left">
              O PontoFácil centraliza a jornada da equipe: batida só no local autorizado, operação online e offline, relatórios e módulo de folha.
            </p>
            <ul className="landing-check-list">
              {PONTO_BENEFITS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="landing-hero-ctas landing-hero-ctas--left">
              <a href={WA_DEMO} target="_blank" rel="noopener noreferrer" className="landing-btn-primary">Solicitar demonstração</a>
              <Link to="/login" className="landing-btn-secondary landing-btn-secondary--outline">Entrar no sistema</Link>
            </div>
          </div>
          <div className="landing-product-visual">
            <figure className="landing-showcase-frame landing-showcase-frame--browser">
              <img
                src={publicUrl('/landing-painel-gestor.png')}
                alt="Painel do gestor PontoFácil com resumo do dia e registros"
                className="landing-showcase-img"
                width={1024}
                height={920}
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </div>
        <div className="landing-section-inner landing-product-shots landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Na prática</p>
            <h2 className="landing-product-shots-title">Painel, celular e totem — a <span>mesma operação</span></h2>
          </div>
          <div className="landing-shots-grid">
            {PRODUCT_SHOTS.map((shot) => (
              <figure
                key={shot.src}
                className={`landing-shot landing-shot--${shot.frame}`}
              >
                <div className="landing-shot-frame">
                  <img
                    src={publicUrl(shot.src)}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="landing-section landing-section--soft">
        <div className="landing-section-inner landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Funcionalidades</p>
            <h2>Pensadas para o <span>dia a dia</span></h2>
            <p className="sub">Do registro com cerca digital ao fechamento da folha — tudo na mesma plataforma.</p>
          </div>
          <div className="landing-bento landing-bento--extended">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className={[
                  'landing-bento-card',
                  f.bento === '2x2' ? 'landing-bento-card--2x2' : f.bento === '2x1' ? 'landing-bento-card--2x1' : 'landing-bento-card--1x1',
                  f.highlight ? 'landing-bento-card--glow' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="landing-bento-card-inner">
                  <div className="icon"><AppIcon name={f.icon} size={22} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="landing-section">
        <div className="landing-section-inner landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Como funciona</p>
            <h2>Quatro passos até a <span>gestão inteligente</span></h2>
            <p className="sub">Do registro à gestão inteligente da jornada.</p>
          </div>
          <div className="landing-timeline">
            {STEPS.map((s, i) => (
              <article key={s.num} className="landing-timeline-step">
                <div className="landing-timeline-num">{s.num}</div>
                {i < STEPS.length - 1 && <div className="landing-timeline-line" aria-hidden />}
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="landing-section landing-section--soft">
        <div className="landing-section-inner landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Planos</p>
            <h2>Para cada <span>porte de equipe</span></h2>
            <p className="sub">Escolha o plano ideal e comece a digitalizar o controle de ponto da sua operação.</p>
          </div>
          <div className="landing-plans landing-plans--4">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={[
                  'landing-plan',
                  plan.featured ? 'landing-plan--featured' : '',
                  plan.premium ? 'landing-plan--premium' : '',
                ].filter(Boolean).join(' ')}
              >
                {plan.featured && <span className="landing-plan-badge">Mais escolhido</span>}
                <h3>{plan.name}</h3>
                <div className="landing-plan-price">
                  {plan.price ? (
                    <>
                      <span className="landing-plan-currency">R$</span>
                      <span className="landing-plan-amount">{plan.price}</span>
                      <span className="landing-plan-period">/mês</span>
                    </>
                  ) : (
                    <span className="landing-plan-custom">{plan.priceLabel}</span>
                  )}
                </div>
                <p className="landing-plan-limit">{plan.limit}</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  href={plan.wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`landing-btn-plan ${plan.featured ? 'landing-btn-plan--primary' : plan.premium ? 'landing-btn-plan--premium' : 'landing-btn-plan--secondary'} btn-full`}
                >
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Diferenciais</p>
            <h2>Por que escolher o <span>PontoFácil</span></h2>
          </div>
          <div className="landing-stats-grid">
            {STATS.map((s) => (
              <article key={s.title} className="landing-stat-card">
                <div className="landing-stat-icon"><AppIcon name={s.icon} size={22} /></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguranca" className="landing-section">
        <div className="landing-section-inner landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Segurança</p>
            <h2>Segurança e <span>confiabilidade</span></h2>
            <p className="sub">Arquitetura em nuvem com boas práticas — dados separados por empresa e operações protegidas.</p>
          </div>
          <div className="landing-security">
            {SECURITY.map((s) => (
              <div key={s.title} className="landing-security-item">
                <span className="landing-security-icon"><AppIcon name={s.icon} size={20} /></span>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="conformidade" className="landing-section landing-section--soft">
        <div className="landing-section-inner landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">Conformidade</p>
            <h2>Conformidade <span>REP-P</span> (controle administrativo web)</h2>
            <p className="sub">
              O PontoFácil é um <strong>Registrador Eletrônico de Ponto por Programa (REP-P)</strong>: tudo roda no navegador ou PWA — não substitui relógio físico (REP-C). Recursos alinhados à Portaria MTE 671/2021 para gestão e auditoria interna.
            </p>
          </div>
          <div className="landing-rep-grid">
            {REP_P_FEATURES.map((item) => (
              <div key={item.title} className="landing-rep-item">
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <p className="landing-rep-disclaimer">
            <strong>Transparência:</strong> comprovantes e exportações atuais são <em>administrativos</em> (sem assinatura ICP-Brasil). Certificação formal REP-P junto ao MTE/INMETRO e AFD oficial com CAdES/PAdES estão previstos em fase futura — consulte nosso time o que já está disponível para o seu caso.
          </p>
        </div>
      </section>

      <section id="registro" className="landing-section landing-inpi">
        <div className="landing-section-inner landing-section-inner--center landing-reveal">
          <div className="landing-inpi-seal" aria-hidden>
            <AppIcon name="inpi" size={28} />
          </div>
          <p className="landing-kicker">INPI</p>
          <h2>Software registrado no <span>INPI</span></h2>
          <p className="sub landing-sub--tight">
            Programa de computador com registro no Instituto Nacional da Propriedade Industrial —
            autoria e código-fonte protegidos (Lei 9.609/98).
          </p>
        </div>
      </section>

      <section className="landing-section landing-section--pwa">
        <div className="landing-section-inner landing-section-inner--center landing-reveal">
          <div className="landing-section-title">
            <p className="landing-kicker">PWA</p>
            <h2>Uso no celular, tablet ou totem — <span>sem complicação</span></h2>
            <p className="sub landing-sub--tight">
              O PontoFácil é uma PWA: seu time pode instalar no aparelho, abrir em tela cheia no totem e operar sem depender de loja de aplicativos.
            </p>
          </div>
          <div className="landing-pwa-actions">
            <Link to="/meu-ponto" className="landing-btn-primary">Abrir Meu ponto</Link>
            <Link to="/totem" className="landing-btn-secondary landing-btn-secondary--outline">Abrir Totem</Link>
          </div>
          <div className="landing-pwa-grid">
            <div className="landing-card landing-pwa-card">
              <h3>Como instalar o PWA do Meu Ponto (colaborador)</h3>
              <p>Abra o link do Meu ponto no celular e adicione à tela inicial.</p>
              <div className="landing-pwa-columns">
                <div className="landing-pwa-instructions">
                  <strong>Android (Google Chrome)</strong>
                  <ol>
                    <li>Abra o Chrome e acesse o Meu ponto.</li>
                    <li>Se aparecer &quot;Adicionar à tela inicial&quot;, toque nele.</li>
                    <li>Ou: menu ⋮ → Instalar aplicativo / Adicionar à tela inicial.</li>
                    <li>Confirme em Instalar.</li>
                  </ol>
                </div>
                <div className="landing-pwa-instructions">
                  <strong>iOS / iPhone (Safari)</strong>
                  <ol>
                    <li>Abra o Safari e acesse o Meu ponto.</li>
                    <li>Toque em Compartilhar → Adicionar à Tela de Início.</li>
                    <li>Confirme em Adicionar.</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="landing-card landing-pwa-card">
              <h3>Como instalar o PWA do Totem (tablet/recepção)</h3>
              <p>Instale para operar em tela cheia e configure o ID da empresa no Totem.</p>
              <div className="landing-pwa-columns">
                <div className="landing-pwa-instructions">
                  <strong>Android (Google Chrome)</strong>
                  <ol>
                    <li>Abra o Chrome e acesse o Totem.</li>
                    <li>Menu ⋮ → Instalar aplicativo.</li>
                    <li>Abra o ícone e informe o ID da empresa.</li>
                  </ol>
                </div>
                <div className="landing-pwa-instructions">
                  <strong>iOS / iPad (Safari)</strong>
                  <ol>
                    <li>Abra o Safari e acesse o Totem.</li>
                    <li>Compartilhar → Adicionar à Tela de Início.</li>
                    <li>Configure o ID da empresa ao abrir.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contato" className="landing-cta">
        <div className="landing-cta-inner landing-reveal">
          <h2>Sua empresa está pronta para digitalizar o ponto?</h2>
          <p>
            Fale com nossa equipe e descubra o plano ideal para controlar a jornada da sua equipe com cerca digital, relatórios e folha integrada.
          </p>
          <div className="landing-cta-buttons">
            <a href={WA_ESPECIALISTA} target="_blank" rel="noopener noreferrer" className="landing-btn-wa landing-btn-wa--lg">
              <AppIcon name="whatsapp" size={20} aria-hidden />
              Falar com um especialista
            </a>
            <a href={WA_ORCAMENTO} target="_blank" rel="noopener noreferrer" className="landing-btn-secondary landing-btn-secondary--light">
              Solicitar orçamento
            </a>
          </div>
          <p className="landing-cta-wa">WhatsApp: <strong>(92) 99476-4780</strong></p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <img src={publicUrl(LOGO_LANDING)} alt="PontoFácil" className="landing-footer-logo" width={240} height={52} decoding="async" />
          <p className="landing-footer-tagline">
            <strong>Tecnologia que protege. Gestão que conecta.</strong><br />
            Ponto digital com cerca virtual — online, offline e integrado à folha.
          </p>
          <nav className="landing-footer-nav" aria-label="Rodapé">
            <a href="#produto">PontoFácil</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#registro">INPI</a>
            <a href="#planos">Planos</a>
            <a href="#contato">Contato</a>
            <Link to="/login">Entrar</Link>
          </nav>
          <p className="landing-footer-copy">
            PontoFácil — software registrado no INPI ·{' '}
            <a href="https://pontofacil.digital" target="_blank" rel="noopener noreferrer">pontofacil.digital</a>
          </p>
        </div>
      </footer>

      <a
        href={WA_ESPECIALISTA}
        target="_blank"
        rel="noopener noreferrer"
        className="landing-wa-float"
        aria-label="Falar com especialista no WhatsApp"
      >
        <AppIcon name="whatsapp" size={26} aria-hidden />
      </a>
    </div>
  );
}
