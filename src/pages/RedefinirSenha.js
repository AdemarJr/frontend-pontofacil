// src/pages/RedefinirSenha.js
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token') || '';
    setToken(t);
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== senha2) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (!token) {
      setErro('Link inválido. Solicite um novo e-mail de recuperação ou convite.');
      return;
    }
    setCarregando(true);
    try {
      await authService.resetPassword({ token, senha });
      setOk(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível redefinir. O link pode ter expirado.');
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
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--cinza-900)' }}>Nova senha</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: '14px', marginTop: '8px' }}>
            Defina uma senha para acessar pelo navegador (painel ou Meu ponto). Seu PIN do totem não é alterado aqui.
          </p>
        </div>

        {ok ? (
          <div
            style={{
              background: 'rgba(29, 158, 117, 0.12)',
              color: '#085041',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '15px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Senha atualizada. Redirecionando para o login…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--cinza-700)', marginBottom: '6px' }}>
                Nova senha (mín. 6 caracteres)
              </label>
              <input
                className="input"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--cinza-700)', marginBottom: '6px' }}>
                Confirmar senha
              </label>
              <input
                className="input"
                type="password"
                value={senha2}
                onChange={(e) => setSenha2(e.target.value)}
                autoComplete="new-password"
                required
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

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={carregando || !token}>
              {carregando ? <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : 'Salvar senha'}
            </button>
            {!token && (
              <p style={{ fontSize: '13px', color: 'var(--vermelho)', marginTop: '12px', textAlign: 'center' }}>
                Link incompleto. Abra o endereço que veio no e-mail ou solicite nova recuperação.
              </p>
            )}
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
          <Link to="/login" style={{ color: 'var(--verde)', fontWeight: '500', textDecoration: 'none' }}>
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
