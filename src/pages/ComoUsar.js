import { Link } from 'react-router-dom';
import { publicUrl } from '../utils/branding';
import AppIcon from '../components/AppIcon';
import '../styles/landing.css';
import '../styles/como-usar.css';

const LOGO_LANDING = '/logo-landing.png';

function AnchorCard({ id, icon, title, children }) {
  return (
    <article id={id} className="landing-card como-usar-card" style={{ scrollMarginTop: 96 }}>
      <div className="icon" aria-hidden>
        <AppIcon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      <div className="como-usar-card__body">{children}</div>
    </article>
  );
}

export default function ComoUsar() {
  return (
    <div className="landing como-usar">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo" aria-label="Ponto Fácil — início">
            <img src={publicUrl(LOGO_LANDING)} alt="Ponto Fácil" className="landing-logo-img" />
          </Link>
          <nav className="landing-nav" aria-label="Seções">
            <a href="#gestor">Para o gestor</a>
            <a href="#colaborador">Para o colaborador</a>
            <a href="#totem">Totem</a>
            <a href="#boas-praticas">Boas práticas</a>
          </nav>
          <div className="landing-header-actions">
            <Link to="/login" className="landing-btn-header landing-btn-header--primary">
              Entrar
            </Link>
            <Link to="/" className="landing-btn-header landing-btn-header--ghost">
              Voltar à landing
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero como-usar-hero">
        <div className="landing-hero-bg" aria-hidden />
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-hero-kicker">Guia rápido · PontoFácil</p>
            <h1>Como usar o sistema no dia a dia</h1>
            <p className="lead">
              Aqui você encontra o passo a passo do PontoFácil para o <strong>gestor/RH</strong> e para o{' '}
              <strong>colaborador</strong>. A ideia é simples: configurar regras uma vez, registrar ponto com as
              regras da empresa e acompanhar tudo com relatórios e auditoria.
            </p>
            <div className="landing-pill-row" aria-hidden>
              <span className="landing-pill">Painel do gestor</span>
              <span className="landing-pill">Meu Ponto (celular)</span>
              <span className="landing-pill">Totem com PIN</span>
              <span className="landing-pill">Relatórios</span>
            </div>

            <div className="como-usar-jump">
              <a className="como-usar-jump__item" href="#gestor">
                <AppIcon name="dashboard" size={18} aria-hidden /> Gestor
              </a>
              <a className="como-usar-jump__item" href="#colaborador">
                <AppIcon name="colaboradores" size={18} aria-hidden /> Colaborador
              </a>
              <a className="como-usar-jump__item" href="#totem">
                <AppIcon name="monitor" size={18} aria-hidden /> Totem
              </a>
              <a className="como-usar-jump__item" href="#boas-praticas">
                <AppIcon name="shield" size={18} aria-hidden /> Boas práticas
              </a>
            </div>
          </div>
          <div className="landing-hero-bento" aria-hidden>
            <div className="landing-hero-glass landing-hero-glass--a">
              <span className="landing-hero-glass-label">Gestor</span>
              <strong>Dashboard + relatórios</strong>
              <span className="landing-hero-glass-stat">Controle</span>
            </div>
            <div className="landing-hero-glass landing-hero-glass--b">
              <span className="landing-hero-glass-label">Colaborador</span>
              <strong>Meu Ponto</strong>
              <span className="landing-hero-glass-pill">Registro rápido</span>
            </div>
            <div className="landing-hero-glass landing-hero-glass--c">
              <span className="landing-hero-glass-label">Totem</span>
              <strong>PIN + foto (opcional)</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-inner">
          <h2>Fluxo ideal (do começo ao fim)</h2>
          <p className="sub">
            O objetivo é deixar o registro de ponto simples para o time e previsível para o RH: regras claras, menos
            exceções e um espelho mensal fácil de conferir.
          </p>
          <div className="landing-steps">
            <article className="landing-card landing-card--step">
              <div className="icon" aria-hidden>1️⃣</div>
              <h3>Configurar</h3>
              <p>Gestor define regras, escalas, permissões e (se quiser) cerca virtual e foto.</p>
            </article>
            <article className="landing-card landing-card--step">
              <div className="icon" aria-hidden>2️⃣</div>
              <h3>Operar</h3>
              <p>Colaborador registra via celular (Meu Ponto) ou via Totem (PIN), seguindo as regras da empresa.</p>
            </article>
            <article className="landing-card landing-card--step">
              <div className="icon" aria-hidden>3️⃣</div>
              <h3>Conferir</h3>
              <p>Gestor acompanha o dia, trata pendências e fecha o mês com relatórios e espelho.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section alt">
        <div className="landing-section-inner">
          <h2>Detalhado por perfil</h2>
          <p className="sub">Clique para ir direto ao seu perfil e ao modo de registro que sua empresa usa.</p>

          <div className="como-usar-grid">
            <AnchorCard id="gestor" icon="dashboard" title="Gestor / RH (painel)">
              <ol className="como-usar-list">
                <li>
                  <strong>Acesse</strong> em <Link to="/login">/login</Link> com usuário administrador.
                </li>
                <li>
                  <strong>Cadastre colaboradores</strong> em <Link to="/colaboradores">Colaboradores</Link> (nome, cargo, local e PIN se usar totem).
                </li>
                <li>
                  <strong>Defina jornadas e escalas</strong> em <Link to="/escalas">Escalas</Link> (hora início/fim e regras do turno).
                </li>
                <li>
                  <strong>Ajuste as configurações da empresa</strong> em <Link to="/configuracoes">Configurações</Link> (cerca virtual, foto obrigatória e tolerâncias).
                </li>
                <li>
                  <strong>Acompanhe o dia</strong> em <Link to="/dashboard">Dashboard</Link>: registros, presentes/ausentes e origem (Meu Ponto, Totem, manual).
                </li>
                <li>
                  <strong>Trate exceções</strong> em <Link to="/ajustes-ponto">Ajustes</Link>: corrija registros com motivo (auditoria) e evite retrabalho no fechamento.
                </li>
                <li>
                  <strong>Gere relatórios</strong> em <Link to="/relatorios">Relatórios</Link> e exporte quando necessário (ex.: conferência, contabilidade).
                </li>
              </ol>
              <div className="como-usar-tip">
                <AppIcon name="alert" size={16} aria-hidden /> Dica: comece definindo 1 escala padrão e só depois crie variações por equipe/turno.
              </div>
            </AnchorCard>

            <AnchorCard id="colaborador" icon="colaboradores" title="Colaborador (Meu Ponto no celular)">
              <ol className="como-usar-list">
                <li>
                  <strong>Entre no Meu Ponto</strong> pelo celular em <Link to="/meu-ponto">/meu-ponto</Link> (após login).
                </li>
                <li>
                  <strong>Permita a localização</strong> quando solicitado. Se a empresa usa cerca virtual, o registro só é aceito na área permitida.
                </li>
                <li>
                  <strong>Registre</strong> o próximo tipo sugerido (Entrada, Saída Almoço, Retorno, Saída).
                </li>
                <li>
                  <strong>Foto</strong>: se a empresa exigir, o app abre a câmera para registrar com evidência.
                </li>
                <li>
                  <strong>Pendências</strong>: se faltar alguma batida, vá na aba de Pendências e envie uma justificativa para o RH/gestor.
                </li>
                <li>
                  <strong>Lembretes</strong>: ative notificações no Meu Ponto para não perder horário de registro.
                </li>
              </ol>
              <div className="como-usar-tip">
                <AppIcon name="shield" size={16} aria-hidden /> Dica: se o GPS falhar, verifique permissões do navegador e ative “alta precisão” no aparelho.
              </div>
            </AnchorCard>

            <AnchorCard id="totem" icon="monitor" title="Totem (tablet/recepção) — PIN">
              <ol className="como-usar-list">
                <li>
                  <strong>Abra o Totem</strong> em <Link to="/totem">/totem</Link> no tablet.
                </li>
                <li>
                  <strong>Configure o ID da empresa</strong> quando solicitado (informado pelo gestor no momento da implantação).
                </li>
                <li>
                  <strong>Cadastro do PIN</strong>: o gestor define o PIN de cada colaborador (evita filas e facilita o uso).
                </li>
                <li>
                  <strong>Registro</strong>: o colaborador digita o PIN e confirma a batida. Foto pode ser opcional, conforme regra da empresa.
                </li>
              </ol>
              <div className="como-usar-tip">
                <AppIcon name="camera" size={16} aria-hidden /> Dica: se usar foto no totem, mantenha boa iluminação na recepção para evidências mais nítidas.
              </div>
            </AnchorCard>

            <AnchorCard id="boas-praticas" icon="shield" title="Boas práticas (para dar certo no mês)">
              <ul className="como-usar-list">
                <li>
                  <strong>Padronize</strong>: defina uma escala principal e comunique os horários oficiais para o time.
                </li>
                <li>
                  <strong>Reduza exceções</strong>: trate pendências diariamente (menos dor no fechamento).
                </li>
                <li>
                  <strong>Motivo em ajustes</strong>: sempre preencha motivo ao ajustar um ponto (auditoria e clareza).
                </li>
                <li>
                  <strong>Totem em local fixo</strong>: mantenha o tablet carregando e com rede estável.
                </li>
                <li>
                  <strong>Cerca virtual</strong>: revise o raio/posição quando houver mudança de endereço ou obra/reforma.
                </li>
              </ul>
            </AnchorCard>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Pronto para começar?</h2>
          <p>Se você já tem acesso, entre no sistema. Se você é colaborador, abra o Meu Ponto no celular.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="landing-btn-outline-light">
              Entrar no sistema
            </Link>
            <Link to="/meu-ponto" className="landing-btn-header landing-btn-header--primary" style={{ padding: '16px 28px', borderRadius: 14 }}>
              Abrir Meu Ponto
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <img src={publicUrl(LOGO_LANDING)} alt="Ponto Fácil" className="landing-footer-logo" width={320} height={72} decoding="async" />
        </div>
        <p>
          <strong>PontoFácil</strong> — Guia de uso do sistema
        </p>
        <p className="landing-footer-links">
          <Link to="/">Voltar</Link>
          {' · '}
          <Link to="/login">Acesso ao sistema</Link>
        </p>
      </footer>
    </div>
  );
}

