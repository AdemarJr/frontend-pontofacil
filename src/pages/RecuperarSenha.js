// src/pages/RecuperarSenha.js
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { publicUrl } from '../utils/branding';

export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setOk('');
    setCarregando(true);
    try {
      const { data } = await authService.forgotPassword({ email: email.trim() });
      setOk(data.mensagem || 'Se o e-mail existir, você receberá instruções.');
    } catch (err) {
      // Axios sem `response` normalmente significa falha de rede/CORS/DNS/API_URL inválida.
      if (!err.response) {
        setErro(
          'Não foi possível conectar ao servidor. Verifique sua internet e se o backend está online e acessível (REACT_APP_API_URL).'
        );
        return;
      }

      const d = err.response?.data;
      if (d?.code === 'TENANT_ID_OBRIGATORIO') {
        setErro(
          d.error ||
            'Este e-mail está em mais de uma empresa. Entre em contato com o administrador da sua empresa para informar o ID da empresa (Totem) ou use o e-mail exclusivo da sua conta.'
        );
      } else {
        setErro(d?.error || 'Não foi possível enviar. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card" style={{ maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={publicUrl('/logo-stacked.png')}
            alt="Ponto Fácil"
            style={{ maxHeight: 72, width: 'auto', maxWidth: '100%', objectFit: 'contain', margin: '0 auto 16px', display: 'block' }}
          />
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Recuperar senha</h1>
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            Enviaremos um link para o e-mail cadastrado na empresa.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field" style={{ marginBottom: 20 }}>
            <label htmlFor="recuperar-email">E-mail</label>
            <input
              id="recuperar-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          {erro && (
            <div className="alert alert-error" style={{ marginBottom: 16 }} role="alert">
              {erro}
            </div>
          )}

          {ok && (
            <div className="alert alert-success" style={{ marginBottom: 16 }} role="status">
              {ok}
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={carregando}>
            {carregando ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Enviar link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
          <Link to="/login" style={{ color: 'var(--verde)', fontWeight: 600, textDecoration: 'none' }}>
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
