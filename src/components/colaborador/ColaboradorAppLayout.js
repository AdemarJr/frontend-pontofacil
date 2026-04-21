import { useState, useMemo } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logoInternoUrl } from '../../utils/branding';
import { ColaboradorChromeContext } from '../../context/ColaboradorChromeContext';

function primeiroNome(nome) {
  if (!nome) return '';
  return String(nome).trim().split(/\s+/)[0] || '';
}

const NAV = [
  { to: '/meu-ponto', match: (p, s) => p === '/meu-ponto' && (!s.get('tab') || s.get('tab') === 'bater'), label: 'Início', icon: '◉' },
  { to: '/meu-ponto?tab=pendencias', match: (p, s) => p === '/meu-ponto' && s.get('tab') === 'pendencias', label: 'Pendências', icon: '!' },
  { to: '/comprovantes', match: (p) => p === '/comprovantes', label: 'Atestado', icon: '📎' },
  { to: '/minhas-ferias', match: (p) => p === '/minhas-ferias', label: 'Férias', icon: '🌴' },
  { to: '/fechamento', match: (p) => p === '/fechamento', label: 'Fechar', icon: '🖊️' },
];

export default function ColaboradorAppLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chromeHidden, setChromeHidden] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const ctxValue = useMemo(() => ({ setChromeHidden }), []);
  const nome = primeiroNome(usuario?.nome);

  function sair() {
    setMenuAberto(false);
    logout();
    navigate('/login');
  }

  return (
    <ColaboradorChromeContext.Provider value={ctxValue}>
      <div className="colaborador-app">
        {!chromeHidden ? (
          <header className="colaborador-app__header" id="tour-meu-header">
            <div className="colaborador-app__header-inner">
              <img src={logoInternoUrl()} alt="Ponto Fácil" className="colaborador-app__logo" />
              <div className="colaborador-app__header-text">
                <span className="colaborador-app__title">Olá, {nome}</span>
                <span className="colaborador-app__subtitle">{usuario?.tenant?.nomeFantasia || '\u00A0'}</span>
              </div>
              <button
                type="button"
                className="colaborador-app__menu-btn"
                aria-label="Menu"
                aria-expanded={menuAberto}
                onClick={() => setMenuAberto((v) => !v)}
              >
                ⋮
              </button>
              {menuAberto ? (
                <div className="colaborador-app__menu-pop" role="menu">
                  <button type="button" className="colaborador-app__menu-item" onClick={sair}>
                    Sair da conta
                  </button>
                </div>
              ) : null}
            </div>
          </header>
        ) : null}

        <main className={`colaborador-app__main ${chromeHidden ? 'colaborador-app__main--fullscreen' : ''}`}>
          <Outlet />
        </main>

        {!chromeHidden ? (
          <nav className="colaborador-app__tabbar" aria-label="Navegação principal">
            {NAV.map((item) => {
              const active = item.match(location.pathname, searchParams);
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={`colaborador-app__tab${active ? ' colaborador-app__tab--active' : ''}`}
                  onClick={() => setMenuAberto(false)}
                >
                  <span className="colaborador-app__tab-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="colaborador-app__tab-label">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        ) : null}
      </div>
    </ColaboradorChromeContext.Provider>
  );
}
