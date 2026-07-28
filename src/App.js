// src/App.js
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { publicUrl } from './utils/branding';
import './styles/global.css';
import './styles/tour-overrides.css';

// Páginas
import Login from './pages/Login';
import RecuperarSenha from './pages/RecuperarSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Totem from './pages/Totem';
import Dashboard from './pages/Dashboard';
import Colaboradores from './pages/Colaboradores';
import Relatorios from './pages/Relatorios';
import AjustesPonto from './pages/AjustesPonto';
import Solicitacoes from './pages/Solicitacoes';
import Configuracoes from './pages/Configuracoes';
import Escalas from './pages/Escalas';
import SuperAdmin from './pages/SuperAdmin';
import Landing from './pages/Landing';
import MeuPonto from './pages/MeuPonto';
import MinhasFerias from './pages/MinhasFerias';
import MinhaConta from './pages/MinhaConta';
import ComprovantesColaborador from './pages/ComprovantesColaborador';
import FechamentoMes from './pages/FechamentoMes';
import ColaboradorAppLayout from './components/colaborador/ColaboradorAppLayout';
import AusenciasEmpresa from './pages/AusenciasEmpresa';
import Feriados from './pages/Feriados';
import Ferias from './pages/Ferias';
import FolhaProcessar from './pages/FolhaProcessar';
import FolhaFerias from './pages/FolhaFerias';
import FolhaDecimo from './pages/FolhaDecimo';
import FolhaRescisao from './pages/FolhaRescisao';
import ContratoExpirado from './pages/ContratoExpirado';
import PagamentoRetorno from './pages/PagamentoRetorno';

function RotaFolha({ children }) {
  const { folhaHabilitada, carregando } = useAuth();
  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!folhaHabilitada) return <Navigate to="/dashboard" replace />;
  return children;
}

function RotaProtegida({ children, apenasAdmin = false, apenasColaborador = false }) {
  const { usuario, carregando, isAdmin } = useAuth();
  if (carregando) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><div className="spinner" /></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (apenasColaborador && usuario.role !== 'COLABORADOR') {
    if (usuario.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  if (apenasAdmin && !isAdmin) {
    return <Navigate to={usuario.role === 'COLABORADOR' ? '/meu-ponto' : '/login'} replace />;
  }
  return children;
}

function RotaSuperAdmin({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.role !== 'SUPER_ADMIN') {
    if (usuario.role === 'ADMIN') return <Navigate to="/dashboard" replace />;
    if (usuario.role === 'COLABORADOR') return <Navigate to="/meu-ponto" replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RedirecionarInicio() {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!usuario) return <Landing />;
  if (usuario.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
  if (usuario.role === 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/meu-ponto" replace />;
}

/** Manifest correto por rota: Totem instalável abre em /totem; demais fluxos usam o manifest padrão. */
function ManifestPorRota() {
  const { pathname } = useLocation();
  const totem = pathname === '/totem' || pathname.startsWith('/totem/');
  const href = publicUrl(totem ? '/manifest-totem.json' : '/manifest.json');
  return (
    <Helmet>
      <link rel="manifest" href={href} key={href} />
    </Helmet>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ManifestPorRota />
        <Routes>
          <Route path="/" element={<RedirecionarInicio />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contrato-expirado" element={<ContratoExpirado />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/pagamento/retorno" element={<PagamentoRetorno />} />

          {/* Colaborador: shell tipo app (tab bar + header) */}
          <Route element={
            <RotaProtegida apenasColaborador>
              <ColaboradorAppLayout />
            </RotaProtegida>
          }>
            <Route path="meu-ponto" element={<MeuPonto />} />
            <Route path="comprovantes" element={<ComprovantesColaborador />} />
            <Route path="minhas-ferias" element={<MinhasFerias />} />
            <Route path="minha-conta" element={<MinhaConta />} />
            <Route path="fechamento" element={<FechamentoMes />} />
          </Route>
          <Route path="/totem" element={<Totem />} />

          {/* Dashboard do gerente */}
          <Route path="/dashboard" element={
            <RotaProtegida apenasAdmin>
              <Dashboard />
            </RotaProtegida>
          } />
          <Route path="/colaboradores" element={
            <RotaProtegida apenasAdmin>
              <Colaboradores />
            </RotaProtegida>
          } />
          <Route path="/relatorios" element={
            <RotaProtegida apenasAdmin>
              <Relatorios />
            </RotaProtegida>
          } />
          <Route path="/ajustes-ponto" element={
            <RotaProtegida apenasAdmin>
              <AjustesPonto />
            </RotaProtegida>
          } />
          <Route path="/solicitacoes" element={
            <RotaProtegida apenasAdmin>
              <Solicitacoes />
            </RotaProtegida>
          } />
          <Route path="/escalas" element={
            <RotaProtegida apenasAdmin>
              <Escalas />
            </RotaProtegida>
          } />
          <Route path="/ausencias" element={
            <RotaProtegida apenasAdmin>
              <AusenciasEmpresa />
            </RotaProtegida>
          } />
          <Route path="/feriados" element={
            <RotaProtegida apenasAdmin>
              <Feriados />
            </RotaProtegida>
          } />
          <Route path="/ferias" element={
            <RotaProtegida apenasAdmin>
              <Ferias />
            </RotaProtegida>
          } />
          <Route path="/configuracoes" element={
            <RotaProtegida apenasAdmin>
              <Configuracoes />
            </RotaProtegida>
          } />
          <Route path="/folha" element={
            <RotaProtegida apenasAdmin>
              <RotaFolha>
                <Navigate to="/folha/processar" replace />
              </RotaFolha>
            </RotaProtegida>
          } />
          <Route path="/folha/config" element={<Navigate to="/configuracoes#folha-config" replace />} />
          <Route path="/folha/processar" element={
            <RotaProtegida apenasAdmin>
              <RotaFolha>
                <FolhaProcessar />
              </RotaFolha>
            </RotaProtegida>
          } />
          <Route path="/folha/ferias" element={
            <RotaProtegida apenasAdmin>
              <RotaFolha>
                <FolhaFerias />
              </RotaFolha>
            </RotaProtegida>
          } />
          <Route path="/folha/decimo" element={
            <RotaProtegida apenasAdmin>
              <RotaFolha>
                <FolhaDecimo />
              </RotaFolha>
            </RotaProtegida>
          } />
          <Route path="/folha/rescisao" element={
            <RotaProtegida apenasAdmin>
              <RotaFolha>
                <FolhaRescisao />
              </RotaFolha>
            </RotaProtegida>
          } />

          {/* Super Admin */}
          <Route path="/super-admin" element={
            <RotaSuperAdmin>
              <SuperAdmin />
            </RotaSuperAdmin>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
