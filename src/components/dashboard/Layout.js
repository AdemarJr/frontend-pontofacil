// src/components/dashboard/Layout.js
import { useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  const [feriasPendentes, setFeriasPendentes] = useState(0);

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

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Sidebar */}
      <aside id="tour-sidebar" style={{ width:'240px', background:'var(--cinza-900)', display:'flex', flexDirection:'column', flexShrink:0, position:'fixed', height:'100vh', zIndex:100 }}>
        {/* Logo */}
        <div
          style={{
            padding: '24px 16px 20px',
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
                maxHeight: '72px',
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

        {/* Nav */}
        <nav style={{ padding:'16px 12px', flex:1 }}>
          {MENU.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:'10px',
                padding:'10px 12px', borderRadius:'8px', marginBottom:'4px',
                textDecoration:'none', fontSize:'14px', fontWeight:'500',
                color: isActive ? 'white' : '#94a3b8',
                background: isActive ? 'rgba(29,158,117,0.2)' : 'transparent',
                transition:'all 0.15s',
              })}
            >
              <span style={{ fontSize:'18px' }}>{item.icon}</span>
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

        {/* Footer */}
        <div style={{ padding:'16px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'var(--verde)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'white', fontWeight:'600' }}>
              {usuario?.nome?.[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ color:'white', fontSize:'13px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{usuario?.nome}</p>
              <p style={{ color:'#64748b', fontSize:'11px' }}>{usuario?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:'100%', padding:'8px', background:'rgba(226,75,74,0.15)', border:'none', borderRadius:'8px', color:'#f87171', fontSize:'13px', cursor:'pointer', fontWeight:'500' }}>
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main style={{ flex:1, marginLeft:'240px', padding:'32px', minHeight:'100vh', background:'var(--cinza-100)' }}>
        {children}
      </main>
    </div>
  );
}
