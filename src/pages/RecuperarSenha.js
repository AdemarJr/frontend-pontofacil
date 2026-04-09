// src/pages/RecuperarSenha.js
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    setCarregando(true);
    try {
      const body = { email: email.trim() };
      const tid = tenantId.trim();
      if (tid) body.tenantId = tid;
      const { data } = await authService.forgotPassword(body);
      setOk(data.mensagem || 'Se o e-mail existir, você receberá instruções.');
    } catch (err) {
      const d = err.response?.data;
      setErro(d?.error || 'Não foi possível enviar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1D9E75 0%, #085041 100%)',
        padding: '20px',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--cinza-900)' }}>Recuperar senha</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: '14px', marginTop: '8px', lineHeight: 1.5 }}>
            Enviaremos um link para o e-mail cadastrado. Se o mesmo e-mail existir em mais de uma empresa, informe o{' '}
            <strong>ID do Totem</strong> (Configurações no painel).
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--cinza-700)', marginBottom: '6px' }}>
              E-mail
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--cinza-700)', marginBottom: '6px' }}>
              ID da empresa (opcional)
            </label>
            <input
              className="input"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="UUID — só se o sistema pedir"
              autoComplete="off"
            />
          </div>

          {erro && (
            <div
              style={{
                background: 'var(--vermelho-claro)',
                color: 'var(--vermelho)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            >
              {erro}
            </div>
          )}

          {ok && (
            <div
              style={{
                background: 'rgba(29, 158, 117, 0.12)',
                color: 'var(--verde-escuro, #085041)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                marginBottom: '16px',
                lineHeight: 1.5,
              }}
            >
              {ok}
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={carregando}>
            {carregando ? <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : 'Enviar link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
          <Link to="/login" style={{ color: 'var(--verde)', fontWeight: '500', textDecoration: 'none' }}>
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
