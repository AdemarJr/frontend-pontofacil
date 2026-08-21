// src/components/dashboard/Layout.js
import { useEffect, useState, useCallback, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { logoSidebarUrl } from '../../utils/branding';
import { feriasService } from '../../services/api';
import AppIcon from '../AppIcon';
import Breadcrumb from '../ui/Breadcrumb';
import OfflineStatus from '../ui/OfflineStatus';
import { destroyActiveTour } from '../../tours/tourHelpers';

const MENU = [
  { path: '/dashboard', label: 'Início', icon: 'dashboard', section: 'principal' },
  { path: '/colaboradores', label: 'Colaboradores', icon: 'colaboradores', section: 'principal' },
  { path: '/escalas', label: 'Jornadas', icon: 'jornadas', section: 'principal' },
  { path: '/ausencias', label: 'Ausências', icon: 'ausencias', section: 'principal' },
  { path: '/feriados', label: 'Feriados', icon: 'feriados', section: 'principal' },
  { path: '/ferias', label: 'Férias', icon: 'ferias', section: 'principal' },
  { path: '/relatorios', label: 'Relatórios / Espelho', icon: 'relatorios', section: 'principal' },
  { path: '/folha/processar', label: 'Folha mensal', icon: 'relatorios', folha: true, section: 'folha' },
  { path: '/folha/adiantamento', label: 'Adiantamento', icon: 'relatorios', folha: true, section: 'folha' },
  { path: '/folha/ferias', label: 'Férias (R$)', icon: 'ferias', folha: true, section: 'folha' },
  { path: '/folha/decimo', label: '13º salário', icon: 'relatorios', folha: true, section: 'folha' },
  { path: '/folha/rescisao', label: 'Rescisão', icon: 'colaboradores', folha: true, section: 'folha' },
  { path: '/ajustes-ponto', label: 'Ajustes de ponto', icon: 'ajustes', section: 'gestao' },
  { path: '/solicitacoes', label: 'Solicitações', icon: 'solicitacoes', section: 'gestao' },
  { path: '/configuracoes', label: 'Configurações', icon: 'configuracoes', section: 'gestao' },
];

const SECTIONS = [
  { id: 'principal', label: 'Ponto' },
  { id: 'folha', label: 'Folha' },
  { id: 'gestao', label: 'Gestão' },
];

const COLLAPSE_KEY = 'pf-sidebar-collapsed';

export default function Layout({ children }) {
  const { usuario, logout, isAdmin, isSuperAdmin, refreshTenantFeatures, folhaHabilitada } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [feriasPendentes, setFeriasPendentes] = useState(0);
  const [navAberto, setNavAberto] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [buscaNav, setBuscaNav] = useState('');
  const payrollEnabled = folhaHabilitada;

  useEffect(() => {
    destroyActiveTour();
    setNavAberto(false);
  }, [location.pathname]);

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
    const mq = window.matchMedia('(max-width: 1023px)');
    const fn = () => setMobile(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    setNavAberto(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

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

  const menuVisivel = useMemo(
    () => MENU.filter((item) => !(item.folha && !payrollEnabled)),
    [payrollEnabled]
  );

  const menuFiltrado = useMemo(() => {
    const q = buscaNav.trim().toLowerCase();
    if (!q) return menuVisivel;
    return menuVisivel.filter((m) => m.label.toLowerCase().includes(q));
  }, [menuVisivel, buscaNav]);

  const breadcrumbItems = useMemo(
    () => [
      { label: 'Painel', to: '/dashboard' },
      { label: tituloPagina },
    ],
    [tituloPagina]
  );

  const shellClass = [
    'admin-shell',
    !mobile && collapsed ? 'admin-shell--collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
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
        aria-label="Navegação principal"
      >
        <div className="admin-shell__brand">
          <div className="admin-shell__brand-inner">
            <img
              src={logoSidebarUrl(theme, collapsed)}
              alt="Ponto Fácil"
              className="admin-shell__logo"
            />
            {usuario?.tenant?.nomeFantasia && (
              <p className="admin-shell__tenant">{usuario.tenant.nomeFantasia}</p>
            )}
          </div>
          {!mobile ? (
            <button
              type="button"
              className="admin-shell__collapse-btn"
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              onClick={() => setCollapsed((v) => !v)}
            >
              <AppIcon name={collapsed ? 'panelOpen' : 'panelClose'} size={16} />
            </button>
          ) : null}
        </div>

        <nav className="admin-shell__nav" aria-label="Menu principal">
          {SECTIONS.map((sec) => {
            const items = menuFiltrado.filter((m) => m.section === sec.id);
            if (!items.length) return null;
            return (
              <div key={sec.id} className="admin-shell__section">
                <p className="admin-shell__section-label">{sec.label}</p>
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    title={item.label}
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
                ))}
              </div>
            );
          })}
        </nav>

        <div className="admin-shell__user">
          <div className="admin-shell__user-row">
            <div className="admin-shell__avatar" aria-hidden="true">
              {usuario?.nome?.[0]}
            </div>
            <div className="admin-shell__user-meta" style={{ flex: 1, minWidth: 0 }}>
              <p className="admin-shell__user-name">{usuario?.nome}</p>
              <p className="admin-shell__user-role">
                {usuario?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="admin-shell__logout" title="Sair">
            <span className="admin-shell__logout-label">Sair</span>
          </button>
        </div>
      </aside>

      <div className="admin-shell__content">
        <header className="admin-shell__topbar">
          {mobile ? (
            <button
              type="button"
              className="admin-shell__menu-toggle"
              aria-label="Abrir menu"
              onClick={() => setNavAberto(true)}
            >
              <AppIcon name="menu" size={20} aria-label="Abrir menu" />
            </button>
          ) : null}

          <div className="admin-shell__topbar-text">
            <Breadcrumb items={breadcrumbItems} />
            <span className="admin-shell__topbar-title">{tituloPagina}</span>
          </div>

          <div className="admin-shell__topbar-actions">
            <label className="admin-shell__search" aria-label="Buscar no menu">
              <AppIcon name="search" size={16} />
              <input
                type="search"
                placeholder="Buscar menu…"
                value={buscaNav}
                onChange={(e) => setBuscaNav(e.target.value)}
                autoComplete="off"
              />
            </label>

            <OfflineStatus />

            <button
              type="button"
              className="btn btn-icon btn-ghost"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              onClick={toggleTheme}
            >
              <AppIcon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>

            <div className="admin-shell__topbar-user" title={usuario?.email || usuario?.nome}>
              <span className="admin-shell__topbar-avatar">{usuario?.nome?.[0]}</span>
              {!mobile ? <span className="admin-shell__topbar-name">{usuario?.nome?.split(' ')[0]}</span> : null}
            </div>
          </div>
        </header>
        <main className="admin-shell__main">
          <div className="admin-shell__main-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
