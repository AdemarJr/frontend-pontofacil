// src/pages/Login.js
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/api';
import { publicUrl } from '../utils/branding';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const { data } = await authService.login(email, senha);
      await login(data.usuario, data.accessToken);
      if (data.usuario.role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (data.usuario.role === 'ADMIN') navigate('/dashboard');
      else navigate('/meu-ponto');
    } catch (err) {
      if (err.response?.data?.code === 'CONTRACT_EXPIRED') {
        navigate('/contrato-expirado');
        return;
      }
      setErro(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src={publicUrl('/logo-horizontal.png')}
            alt="Ponto Fácil"
            style={{ maxWidth: '100%', width: 'auto', height: 'auto', maxHeight: 52, objectFit: 'contain', margin: '0 auto 14px', display: 'block' }}
          />
          <p className="page-subtitle" style={{ margin: 0 }}>Sistema de Controle de Ponto Digital</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="login-email">E-mail</label>
            <input id="login-email" className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus autoComplete="email" />
          </div>
          <div className="form-field" style={{ marginBottom: 24 }}>
            <label htmlFor="login-senha">Senha</label>
            <input id="login-senha" className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          </div>

          {erro && (
            <div className="alert alert-error" style={{ marginBottom: 16 }} role="alert">
              {erro}
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={carregando}>
            {carregando ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
          <Link to="/recuperar-senha" style={{ color: 'var(--verde)', fontWeight: 600, textDecoration: 'none' }}>
            Esqueci minha senha
          </Link>
        </p>

        <p className="page-subtitle" style={{ textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          Colaborador: após entrar, use <strong>Meu ponto</strong> no celular (mesmas regras da empresa).
          <br />
          Totem compartilhado (PIN)?{' '}
          <a href="/totem" style={{ color: 'var(--verde)', textDecoration: 'none', fontWeight: 600 }}>Abrir totem</a>
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Link
            to="/"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
            title="Voltar para a página inicial"
          >
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
