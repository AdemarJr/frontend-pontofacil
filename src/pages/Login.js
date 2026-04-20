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
      login(data.usuario, data.accessToken, data.refreshToken);
      if (data.usuario.role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (data.usuario.role === 'ADMIN') navigate('/dashboard');
      else navigate('/meu-ponto');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #1D9E75 0%, #085041 100%)', padding:'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))', boxSizing:'border-box', width:'100%', maxWidth:'100%', overflowX:'clip' }}>
      <div className="card" style={{ width:'100%', maxWidth:'400px', padding:'clamp(24px, 5vw, 40px)', boxSizing:'border-box' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <img
            src={publicUrl('/logo-horizontal.png')}
            alt="Ponto Fácil"
            style={{ maxWidth: '100%', width: 'auto', height: 'auto', maxHeight: '52px', objectFit: 'contain', margin: '0 auto 14px', display: 'block' }}
          />
          <p style={{ color:'var(--cinza-400)', fontSize:'14px', marginTop:'4px', marginBottom: 0 }}>Sistema de Controle de Ponto Digital</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>E-mail</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus autoComplete="email" />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>Senha</label>
            <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          </div>

          {erro && (
            <div style={{ background:'var(--vermelho-claro)', color:'var(--vermelho)', padding:'12px', borderRadius:'var(--radius-sm)', fontSize:'14px', marginBottom:'16px' }}>
              {erro}
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={carregando}>
            {carregando ? <span className="spinner" style={{ width:'20px', height:'20px', borderWidth:'2px' }} /> : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
          <Link to="/recuperar-senha" style={{ color: 'var(--verde)', fontWeight: '500', textDecoration: 'none' }}>
            Esqueci minha senha
          </Link>
        </p>

        <p style={{ textAlign:'center', marginTop:'24px', fontSize:'13px', color:'var(--cinza-400)', lineHeight: 1.6 }}>
          Colaborador: após entrar, use <strong>Meu ponto</strong> no celular (mesmas regras da empresa).
          <br />
          Totem compartilhado (PIN)?{' '}
          <a href="/totem" style={{ color:'var(--verde)', textDecoration:'none', fontWeight:'500' }}>Abrir totem</a>
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
