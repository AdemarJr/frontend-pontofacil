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
  'Olá! Gostaria de solicitar um orçamento para soluções digitais da Pyrou Web / PontoFácil.'
);

const LOGO_LANDING = '/logo-horizontal.png';

const NAV_LINKS = [
  { href: '#inicio', label: 'Início' },
  { href: '#solucoes', label: 'Soluções' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#planos', label: 'Planos' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#contato', label: 'Contato' },
];

const POSITIONING = [
  { icon: 'monitor', title: 'Sistemas Web', text: 'Soluções personalizadas para as necessidades do seu negócio.' },
  { icon: 'empresa', title: 'SaaS', text: 'Plataformas completas disponíveis na nuvem e acessíveis de qualquer lugar.' },
  { icon: 'ajustes', title: 'Automação', text: 'Reduza tarefas manuais e aumente a produtividade da sua equipe.' },
  { icon: 'relatorios', title: 'Integrações', text: 'Conecte sistemas, APIs e ferramentas em um único ecossistema.' },
];

const PONTO_BENEFITS = [
  'Registro pelo celular (PWA)',
  'Totem com PIN',
  'Dashboard em tempo real',
  'Cerca virtual',
  'Jornadas e escalas',
  'Relatórios e espelho',
  'Auditoria de alterações',
  'Gestão em nuvem',
];

const FEATURES = [
  { icon: 'dashboard', title: 'Dashboard do gestor', text: 'Visão do dia, equipe e configurações em um só lugar.', bento: '2x2', highlight: true },
  { icon: 'monitor', title: 'Registro pelo celular', text: 'PWA no smartphone — colaborador registra com as regras da empresa.', bento: '2x1', highlight: true },
  { icon: 'monitor', title: 'Totem com PIN', text: 'Tablet na recepção com teclado numérico e registro rápido.', bento: '1x1' },
  { icon: 'mapa', title: 'Cerca virtual', text: 'Áreas permitidas para registro e menos contestações.', bento: '2x1', highlight: true },
  { icon: 'jornadas', title: 'Jornadas e escalas', text: 'Horários flexíveis por colaborador ou escala reutilizável.', bento: '2x1' },
  { icon: 'relatorios', title: 'Espelho de ponto', text: 'Fechamento mensal com exportação CSV, Excel e PDF.', bento: '1x1' },
  { icon: 'relatorios', title: 'Relatórios', text: 'Resumos e análises para RH e gestão operacional.', bento: '1x1' },
  { icon: 'shield', title: 'Auditoria', text: 'Rastreabilidade de ajustes, configurações e registros.', bento: '2x1', highlight: true },
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
      'Cerca virtual',
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
    limit: 'Até 50 funcionários',
    features: [
      'Tudo do Residencial Plus',
      'Gestão para equipes maiores',
      'Multiunidade',
      'Recursos avançados',
      'Auditoria e controle',
      'Suporte à implantação',
    ],
    cta: 'Falar com especialista',
    wa: WA_ESPECIALISTA,
    featured: false,
    premium: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceLabel: 'Personalizado',
    limit: 'Acima de 50 funcionários',
    features: [
      'Estrutura personalizada',
      'Grandes equipes',
      'Multiempresa',
      'Integrações',
      'Implantação personalizada',
      'Atendimento dedicado',
    ],
    cta: 'Solicitar proposta',
    wa: waHref('Olá! Gostaria de solicitar proposta para o plano Enterprise do PontoFácil.'),
    featured: false,
    premium: true,
  },
];

const STATS = [
  { icon: 'monitor', title: '100% Web', text: 'Acesse de qualquer lugar.' },
  { icon: 'home', title: 'PWA', text: 'Use no celular, tablet ou computador.' },
  { icon: 'empresa', title: 'Em nuvem', text: 'Tenha sua operação centralizada.' },
  { icon: 'empresa', title: 'Multiempresa', text: 'Gerencie diferentes operações.' },
  { icon: 'shield', title: 'Seguro', text: 'Dados protegidos e separados por empresa.' },
];

const PYROU_SERVICES = [
  { title: 'Desenvolvimento de Sistemas', text: 'Criamos plataformas web personalizadas para automatizar processos.' },
  { title: 'Sistemas SaaS', text: 'Transforme sua solução em uma plataforma escalável na nuvem.' },
  { title: 'Aplicações Web', text: 'Interfaces modernas, rápidas e responsivas para empresas.' },
  { title: 'Integrações e APIs', text: 'Conectamos sistemas, bancos de dados e serviços externos.' },
  { title: 'Automação de Processos', text: 'Automatize tarefas repetitivas e reduza custos operacionais.' },
  { title: 'Inteligência Artificial', text: 'Agentes de IA e automações inteligentes para atendimento e negócios.' },
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
            <img src={publicUrl(LOGO_LANDING)} alt="PontoFácil" className="landing-logo-img" width={200} height={52} />
          </Link>

          <nav className="landing-nav" aria-label="Seções principais">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <div className="landing-header-actions">
            <Link to="/login" className="landing-btn-header landing-btn-header--ghost">Entrar no sistema</Link>
            <a href={WA_ESPECIALISTA} target="_blank" rel="noopener noreferrer" className="landing-btn-header landing-btn-header--primary">
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
          <Link to="/login" className="landing-btn-header landing-btn-header--ghost" onClick={closeMenu}>Entrar no sistema</Link>
          <a href={WA_ESPECIALISTA} target="_blank" rel="noopener noreferrer" className="landing-btn-header landing-btn-header--primary" onClick={closeMenu}>
            Falar com especialista
          </a>
        </div>
      </header>

      <section id="inicio" className="landing-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="landing-hero-inner landing-reveal">
          <div className="landing-hero-copy">
            <div className="landing-hero-badges">
              <span className="landing-badge">100% digital</span>
              <span className="landing-badge">Web + PWA</span>
              <span className="landing-badge">Celular + Tablet + Totem</span>
            </div>
            <h1>Controle de ponto inteligente para empresas que querem crescer.</h1>
            <p className="lead">
              Tenha mais controle sobre a jornada da sua equipe com uma plataforma moderna, segura e acessível de qualquer lugar.
            </p>
            <div className="landing-hero-ctas">
              <a href="#solucoes" className="landing-btn-primary">Conheça o PontoFácil</a>
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
                  width={1200}
                  height={675}
                  loading="eager"
                  decoding="async"
                />
              </figure>
              <figure className="landing-hero-mockup landing-hero-mockup--phone">
                <img
                  src={publicUrl('/landing-app-meu-ponto.png')}
                  alt=""
                  width={390}
                  height={844}
                  loading="eager"
                  decoding="async"
                />
              </figure>
              <figure className="landing-hero-mockup landing-hero-mockup--tablet">
                <img
                  src={publicUrl('/landing-totem-pin.png')}
                  alt=""
                  width={390}
                  height={844}
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

      <section id="solucoes" className="landing-section landing-section--soft">
        <div className="landing-section-inner landing-reveal">
          <p className="landing-kicker">Pyrou Web</p>
          <h2>Tecnologia para simplificar a gestão da sua empresa.</h2>
          <p className="sub">
            A Pyrou Web desenvolve sistemas e soluções digitais para transformar processos complexos em experiências simples, rápidas e inteligentes.
          </p>
          <div className="landing-position-grid">
            {POSITIONING.map((item) => (
              <article key={item.title} className="landing-position-card">
                <div className="landing-position-icon"><AppIcon name={item.icon} size={22} /></div>
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
            <h2>Seu controle de ponto. Mais simples. Mais inteligente.</h2>
            <p className="sub landing-sub--left">
              O PontoFácil centraliza a gestão da jornada dos colaboradores em uma plataforma moderna, segura e acessível de qualquer lugar.
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
                width={1200}
                height={675}
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="landing-section landing-section--soft">
        <div className="landing-section-inner landing-reveal">
          <h2>Funcionalidades pensadas para o dia a dia</h2>
          <p className="sub">Tudo o que gestores e RH precisam — do registro ao fechamento do mês.</p>
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
          <h2>Como funciona</h2>
          <p className="sub">Quatro passos do registro à gestão inteligente da jornada.</p>
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
          <h2>Planos para cada porte de equipe</h2>
          <p className="sub">Escolha o plano ideal e comece a digitalizar o controle de ponto da sua operação.</p>
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
          <h2>Por que escolher o PontoFácil</h2>
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

      <section id="servicos" className="landing-section landing-section--soft">
        <div className="landing-section-inner landing-reveal">
          <h2>Além do PontoFácil, criamos tecnologia para o seu negócio.</h2>
          <p className="sub">A Pyrou Web atua como software house — do sistema sob medida ao SaaS escalável.</p>
          <div className="landing-services-grid">
            {PYROU_SERVICES.map((s) => (
              <article key={s.title} className="landing-service-card">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seguranca" className="landing-section">
        <div className="landing-section-inner landing-reveal">
          <h2>Segurança e confiabilidade</h2>
          <p className="sub">Arquitetura em nuvem com boas práticas — dados separados por empresa e operações protegidas.</p>
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
          <h2>Conformidade REP-P (controle administrativo web)</h2>
          <p className="sub">
            O PontoFácil é um <strong>Registrador Eletrônico de Ponto por Programa (REP-P)</strong>: tudo roda no navegador ou PWA — não substitui relógio físico (REP-C). Recursos alinhados à Portaria MTE 671/2021 para gestão e auditoria interna.
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
            <strong>Transparência:</strong> comprovantes e exportações atuais são <em>administrativos</em> (sem assinatura ICP-Brasil). Certificação formal REP-P junto ao MTE/INMETRO e AFD oficial com CAdES/PAdES estão previstos em fase futura — consulte nosso time o que já está disponível para o seu caso.
          </p>
        </div>
      </section>

      <section className="landing-section landing-section--pwa">
        <div className="landing-section-inner landing-section-inner--center landing-reveal">
          <h2>Uso no celular, tablet ou totem — sem complicação</h2>
          <p className="sub landing-sub--tight">
            O PontoFácil é uma PWA: seu time pode instalar no aparelho, abrir em tela cheia no totem e operar sem depender de loja de aplicativos.
          </p>
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
          <h2>Sua empresa está pronta para dar o próximo passo?</h2>
          <p>
            Conte-nos sobre o seu projeto. Nossa equipe pode ajudar você a transformar sua ideia ou processo em uma solução digital.
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
            <strong>Pyrou Web</strong><br />
            Sistemas • SaaS • Automação • Inteligência Artificial
          </p>
          <nav className="landing-footer-nav" aria-label="Rodapé">
            <a href="#solucoes">Soluções</a>
            <a href="#produto">PontoFácil</a>
            <a href="#servicos">Serviços</a>
            <a href="#planos">Planos</a>
            <a href="#contato">Contato</a>
            <Link to="/login">Entrar</Link>
          </nav>
          <p className="landing-footer-copy">
            PontoFácil — desenvolvido pela{' '}
            <a href="https://www.pyrou.com.br" target="_blank" rel="noopener noreferrer">Pyrou Web</a>
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
