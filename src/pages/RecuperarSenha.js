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
          <img
            src={publicUrl('/logo-stacked.png')}
            alt="Ponto Fácil"
            style={{ maxHeight: '72px', width: 'auto', maxWidth: '100%', objectFit: 'contain', margin: '0 auto 16px', display: 'block' }}
          />
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--cinza-900)' }}>Recuperar senha</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: '14px', marginTop: '8px', lineHeight: 1.5 }}>
            Enviaremos um link para o e-mail cadastrado na empresa.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
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
