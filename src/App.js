// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
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
import ComprovantesColaborador from './pages/ComprovantesColaborador';
import AusenciasEmpresa from './pages/AusenciasEmpresa';
import Feriados from './pages/Feriados';
import Ferias from './pages/Ferias';

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RedirecionarInicio />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />

          {/* Colaborador: registro pelo app (e-mail) ou totem (PIN) */}
          <Route path="/meu-ponto" element={
            <RotaProtegida apenasColaborador>
              <MeuPonto />
            </RotaProtegida>
          } />
          <Route path="/comprovantes" element={
            <RotaProtegida apenasColaborador>
              <ComprovantesColaborador />
            </RotaProtegida>
          } />
          <Route path="/totem" element={
            <RotaProtegida>
              <Totem />
            </RotaProtegida>
          } />

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

          {/* Super Admin */}
          <Route path="/super-admin" element={
            <RotaProtegida>
              <SuperAdmin />
            </RotaProtegida>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
