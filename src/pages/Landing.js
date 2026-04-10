// src/pages/Landing.js — página pública de vendas
import { Link } from 'react-router-dom';
import { publicUrl } from '../utils/branding';
import '../styles/landing.css';

const WA_NUMBER = '5592994764780';
const WA_TEXT = encodeURIComponent(
  'Olá! Gostaria de falar com um consultor sobre o PontoFácil — controle de ponto digital.'
);
const WA_HREF = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

const FEATURES = [
  {
    icon: '🖥️',
    title: 'Totem com PIN',
    text: 'Tablet na entrada com teclado numérico, registro rápido por PIN e foto opcional — ideal para recepção.',
  },
  {
    icon: '🕐',
    title: 'Defina a jornada de trabalho do seu colaborador',
    text: 'Configure horários e escalas com flexibilidade, de acordo com a necessidade da sua empresa.',
    highlight: true,
  },
  {
    icon: '📍',
    title: 'Controle de ponto com cerca virtual',
    text: 'Defina as áreas permitidas para registro de ponto e evite fraudes.',
    highlight: true,
  },
  {
    icon: '📊',
    title: 'Dashboard do gestor',
    text: 'Visão do dia, colaboradores, configurações da empresa e gestão de equipe em um só lugar.',
  },
  {
    icon: '📋',
    title: 'Espelho de ponto e relatórios',
    text: 'Espelho mensal por colaborador, exportação CSV, ajustes manuais com motivo e auditoria.',
  },
  {
    icon: '📷',
    title: 'Foto no registro',
    text: 'Evidência visual integrada (armazenamento seguro; modo desenvolvimento sem S3 também disponível).',
  },
  {
    icon: '🏢',
    title: 'Multi-empresa (SaaS)',
    text: 'Isolamento total por tenant: cada cliente com seus dados, usuários e políticas próprias.',
  },
];

const SECURITY = [
  { icon: '🔐', title: 'Acesso seguro', desc: 'Login com renovação automática de sessão e proteção extra no totem, para quem só bate ponto.' },
  { icon: '🔒', title: 'Senhas e PIN protegidos', desc: 'Credenciais armazenadas com padrão de mercado; PIN numérico rápido para o colaborador no totem.' },
  { icon: '🛡️', title: 'Proteção contra abuso', desc: 'Limites de uso que ajudam a evitar registros em massa ou tentativas suspeitas.' },
  { icon: '📸', title: 'Privacidade das fotos', desc: 'Evidências com acesso restrito; dados de rede tratados de forma a apoiar auditoria sem expor informação sensível.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo" aria-label="Ponto Fácil — início">
            <img
              src={publicUrl('/logo-horizontal.png')}
              alt="Ponto Fácil"
              className="landing-logo-img"
              width={360}
              height={72}
            />
          </Link>
          <nav className="landing-nav" aria-label="Seções">
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#planos">Planos</a>
            <a href="#seguranca">Segurança</a>
            <a href="#como-funciona">Como funciona</a>
          </nav>
          <div className="landing-header-actions">
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '14px' }}>
              Fale com um consultor
            </a>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '10px 18px', fontSize: '14px' }}>
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
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
              <span style={{ fontSize: '1.35rem' }} aria-hidden>💬</span>
              Fale com um de nossos consultores
            </a>
            <Link to="/login" className="landing-btn-outline-light">
              Já sou cliente — Entrar
            </Link>
          </div>
          <p style={{ marginTop: '20px', fontSize: '13px', opacity: 0.75 }}>
            WhatsApp: <strong style={{ fontWeight: 600 }}>(92) 99476-4780</strong>
          </p>
        </div>
      </section>

      <section id="funcionalidades" className="landing-section">
        <div className="landing-section-inner">
          <h2>O que você ganha com o PontoFácil</h2>
          <p className="sub">
            Funcionalidades pensadas para o gestor e para o RH: menos retrabalho, mais clareza no espelho de
            ponto e regras que acompanham a realidade da sua operação.
          </p>
          <div className="landing-grid-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className={`landing-card${f.highlight ? ' landing-card--highlight' : ''}`}
              >
                <div className="icon" aria-hidden>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
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
          <div className="landing-grid-3">
            <article className="landing-card">
              <div className="icon">1️⃣</div>
              <h3>Configure sua operação</h3>
              <p>
                Escolha o plano pelo tamanho da equipe, preencha os dados da empresa e defina se quer cerca
                virtual, foto obrigatória e tolerâncias — tudo em um painel simples.
              </p>
            </article>
            <article className="landing-card">
              <div className="icon">2️⃣</div>
              <h3>Cadastre e organize a jornada</h3>
              <p>
                Inclua colaboradores, cargos e departamentos; defina horários e escalas com a flexibilidade que
                o seu negócio pede. No totem, o time registra ponto com PIN, rápido e sem fila.
              </p>
            </article>
            <article className="landing-card">
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
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full">
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
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-full">
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
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-full">
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
                <span style={{ fontSize: '1.5rem' }} aria-hidden>{s.icon}</span>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '14px', color: 'var(--cinza-400)', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
            Em evolução: mais integrações com folha, notificações e outras melhorias. Pergunte ao consultor o
            que já está disponível hoje e o que vem na sequência para o seu caso.
          </p>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <h2>Uso no celular, tablet ou totem — sem complicação</h2>
          <p className="sub" style={{ marginBottom: '0' }}>
            O PontoFácil é uma PWA: seu time pode &quot;instalar&quot; no aparelho, abrir em tela cheia no totem e
            usar gestos naturais, sem depender de publicação em loja de aplicativos para começar a operar.
          </p>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Quer ver o PontoFácil no seu cenário?</h2>
        <p>
          Conte para a gente o tamanho da equipe e como vocês registram ponto hoje. Respondemos com plano,
          próximos passos e tudo o que precisa para decidir com segurança.
        </p>
        <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="landing-btn-wa" style={{ fontSize: '17px' }}>
          💬 Fale com um de nossos consultores
        </a>
        <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--cinza-700)' }}>
          WhatsApp: <strong>(92) 99476-4780</strong>
        </p>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <img
            src={publicUrl('/logo-stacked.png')}
            alt="Ponto Fácil"
            className="landing-footer-logo"
            width={140}
            height={120}
            decoding="async"
          />
        </div>
        <p>
          <strong>PontoFácil</strong> — Sistema SaaS de controle de ponto digital
        </p>
        <p style={{ marginTop: '8px' }}>
          <Link to="/login" style={{ color: 'var(--verde)' }}>Acesso ao sistema</Link>
          {' · '}
          <a href={WA_HREF} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--verde)' }}>
            Contato comercial
          </a>
        </p>
      </footer>
    </div>
  );
}
