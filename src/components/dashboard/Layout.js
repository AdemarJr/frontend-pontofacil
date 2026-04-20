// src/components/dashboard/Layout.js
import { useEffect, useState, useCallback, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logoInternoUrl } from '../../utils/branding';
import { feriasService } from '../../services/api';

const MENU = [
  { path: '/dashboard', label: 'Início', icon: '📊' },
  { path: '/colaboradores', label: 'Colaboradores', icon: '👥' },
  { path: '/escalas', label: 'Jornadas', icon: '🕐' },
  { path: '/ausencias', label: 'Ausências', icon: '📎' },
  { path: '/feriados', label: 'Feriados', icon: '📅' },
  { path: '/ferias', label: 'Férias', icon: '🌴' },
  { path: '/relatorios', label: 'Relatórios', icon: '📋' },
  { path: '/ajustes-ponto', label: 'Ajustes de ponto', icon: '🛠️' },
  { path: '/solicitacoes', label: 'Solicitações', icon: '🧾' },
  { path: '/configuracoes', label: 'Configurações', icon: '⚙️' },
];

export default function Layout({ children }) {
  const { usuario, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [feriasPendentes, setFeriasPendentes] = useState(0);
  const [navAberto, setNavAberto] = useState(false);
  const [mobile, setMobile] = useState(false);

  const atualizarBadgeFerias = useCallback(async () => {
    if (!isAdmin) {
      setFeriasPendentes(0);
      return;
    }
    try {
      const { data } = await feriasService.pendentesContagem();
      const n = typeof data?.count === 'number' ? data.count : 0;
      setFeriasPendentes(n);
    } catch {
      setFeriasPendentes(0);
    }
  }, [isAdmin]);

  useEffect(() => {
    atualizarBadgeFerias();
    if (!isAdmin) return undefined;
    const t = setInterval(atualizarBadgeFerias, 45000);
    const onFocus = () => atualizarBadgeFerias();
    const onVis = () => {
      if (document.visibilityState === 'visible') atualizarBadgeFerias();
    };
    const onFerias = () => atualizarBadgeFerias();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pf:ferias-pendentes', onFerias);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pf:ferias-pendentes', onFerias);
    };
  }, [isAdmin, atualizarBadgeFerias]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const fn = () => setMobile(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    setNavAberto(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const tituloPagina = useMemo(() => {
    const p = location.pathname;
    const ex = MENU.find((m) => m.path === p);
    if (ex) return ex.label;
    const candidates = MENU.filter((m) => p.startsWith(`${m.path}/`));
    candidates.sort((a, b) => b.path.length - a.path.length);
    return candidates[0]?.label || 'Painel';
  }, [location.pathname]);

  return (
    <div className="admin-shell">
      {mobile && navAberto ? (
        <button
          type="button"
          className="admin-shell__overlay admin-shell__overlay--open"
          aria-label="Fechar menu"
          onClick={() => setNavAberto(false)}
        />
      ) : null}

      <aside
        id="tour-sidebar"
        className={`admin-shell__sidebar${navAberto && mobile ? ' admin-shell__sidebar--open' : ''}`}
      >
        <div
          style={{
            padding: '22px 16px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            background: 'linear-gradient(135deg, #085041 0%, #1D9E75 100%)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <img
              src={logoInternoUrl()}
              alt="Ponto Fácil"
              style={{
                maxWidth: '100%',
                height: 'auto',
                maxHeight: '64px',
                objectFit: 'contain',
                objectPosition: 'left',
              }}
            />
            {usuario?.tenant?.nomeFantasia && (
              <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '11px', lineHeight: '1.35', margin: 0 }}>
                {usuario.tenant.nomeFantasia}
              </p>
            )}
          </div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
          {MENU.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              onClick={() => mobile && setNavAberto(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 12px',
                borderRadius: '10px',
                marginBottom: '4px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600',
                color: isActive ? 'white' : '#94a3b8',
                background: isActive ? 'rgba(29,158,117,0.22)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
              {item.path === '/ferias' && isAdmin && feriasPendentes > 0 ? (
                <span
                  title={`${feriasPendentes} solicitação(ões) de férias aguardando`}
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: '0 7px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(234,88,12,0.45)',
                  }}
                >
                  {feriasPendentes > 99 ? '99+' : feriasPendentes}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--verde)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: 'white',
                fontWeight: '600',
              }}
            >
              {usuario?.nome?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {usuario?.nome}
              </p>
              <p style={{ color: '#64748b', fontSize: '11px' }}>{usuario?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(226,75,74,0.15)',
              border: 'none',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="admin-shell__topbar">
          <button
            type="button"
            className="admin-shell__menu-toggle"
            aria-label="Abrir menu"
            onClick={() => setNavAberto(true)}
          >
            ☰
          </button>
          <span className="admin-shell__topbar-title">{tituloPagina}</span>
        </header>
        <main className="admin-shell__main">{children}</main>
      </div>
    </div>
  );
}
