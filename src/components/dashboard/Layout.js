// src/components/dashboard/Layout.js
import { useEffect, useState, useCallback, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { logoInternoUrl } from '../../utils/branding';
import { feriasService } from '../../services/api';
import AppIcon from '../AppIcon';

const MENU = [
  { path: '/dashboard', label: 'Início', icon: 'dashboard' },
  { path: '/colaboradores', label: 'Colaboradores', icon: 'colaboradores' },
  { path: '/escalas', label: 'Jornadas', icon: 'jornadas' },
  { path: '/ausencias', label: 'Ausências', icon: 'ausencias' },
  { path: '/feriados', label: 'Feriados', icon: 'feriados' },
  { path: '/ferias', label: 'Férias', icon: 'ferias' },
  { path: '/relatorios', label: 'Relatórios / Espelho de ponto', icon: 'relatorios' },
  { path: '/folha/processar', label: 'Folha mensal', icon: 'relatorios', folha: true },
  { path: '/folha/ferias', label: 'Férias (R$)', icon: 'ferias', folha: true },
  { path: '/folha/decimo', label: '13º salário', icon: 'relatorios', folha: true },
  { path: '/folha/rescisao', label: 'Rescisão', icon: 'colaboradores', folha: true },
  { path: '/ajustes-ponto', label: 'Ajustes de ponto', icon: 'ajustes' },
  { path: '/solicitacoes', label: 'Solicitações', icon: 'solicitacoes' },
  { path: '/configuracoes', label: 'Configurações', icon: 'configuracoes' },
];

export default function Layout({ children }) {
  const { usuario, logout, isAdmin, isSuperAdmin, refreshTenantFeatures, folhaHabilitada } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [feriasPendentes, setFeriasPendentes] = useState(0);
  const [navAberto, setNavAberto] = useState(false);
  const [mobile, setMobile] = useState(false);
  const payrollEnabled = folhaHabilitada;

  useEffect(() => {
    if (isSuperAdmin || !isAdmin || !usuario?.tenant?.id) return undefined;
    refreshTenantFeatures();
    const onFocus = () => refreshTenantFeatures();
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshTenantFeatures();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAdmin, isSuperAdmin, usuario?.tenant?.id, refreshTenantFeatures]);

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
        <div className="admin-shell__brand">
          <div className="admin-shell__brand-inner">
            <img
              src={logoInternoUrl()}
              alt="Ponto Fácil"
              className="admin-shell__logo"
            />
            {usuario?.tenant?.nomeFantasia && (
              <p className="admin-shell__tenant">{usuario.tenant.nomeFantasia}</p>
            )}
          </div>
        </div>

        <nav className="admin-shell__nav" aria-label="Menu principal">
          {MENU.map((item) => {
            if (item.folha && !payrollEnabled) return null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => mobile && setNavAberto(false)}
                className={({ isActive }) =>
                  `admin-shell__link${isActive ? ' admin-shell__link--active' : ''}`
                }
              >
                <span className="admin-shell__link-icon">
                  <AppIcon name={item.icon} size={18} />
                </span>
                <span className="admin-shell__link-label">{item.label}</span>
                {item.path === '/ferias' && isAdmin && feriasPendentes > 0 ? (
                  <span
                    className="admin-shell__badge"
                    title={`${feriasPendentes} solicitação(ões) de férias aguardando`}
                  >
                    {feriasPendentes > 99 ? '99+' : feriasPendentes}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-shell__user">
          <div className="admin-shell__user-row">
            <div className="admin-shell__avatar" aria-hidden="true">
              {usuario?.nome?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="admin-shell__user-name">{usuario?.nome}</p>
              <p className="admin-shell__user-role">
                {usuario?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="admin-shell__logout">
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
            <AppIcon name="menu" size={20} aria-label="Abrir menu" />
          </button>
          <span
            className="admin-shell__topbar-title"
            style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {tituloPagina}
          </span>
        </header>
        <main className="admin-shell__main">{children}</main>
      </div>
    </div>
  );
}
