import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { validarSenhaForte, PASSWORD_HINT } from '../utils/passwordPolicy';

export default function MinhaConta() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novaSenha2, setNovaSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');

    const val = validarSenhaForte(novaSenha);
    if (!val.ok) {
      setErro(val.error);
      return;
    }
    if (novaSenha !== novaSenha2) {
      setErro('As senhas não coincidem.');
      return;
    }

    setSalvando(true);
    try {
      const { data } = await authService.changePassword({ senhaAtual, novaSenha });
      setSucesso(data.mensagem || 'Senha atualizada.');
      setSenhaAtual('');
      setNovaSenha('');
      setNovaSenha2('');
      if (data.requerLogin) {
        setTimeout(async () => {
          await logout();
          navigate('/login');
        }, 1800);
      }
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="colaborador-page" style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Minha conta</h1>
      <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>
        {usuario?.email}
        <br />
        A senha de login é usada no app e no navegador. O <strong>PIN do totem</strong> é separado e só o RH altera.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(148,163,184,0.16)',
          borderRadius: 14,
          padding: 16,
          display: 'grid',
          gap: 14,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
            Senha atual
          </label>
          <input
            className="input"
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
            Nova senha
          </label>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px', lineHeight: 1.45 }}>{PASSWORD_HINT}</p>
          <input
            className="input"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>
            Confirmar nova senha
          </label>
          <input
            className="input"
            type="password"
            value={novaSenha2}
            onChange={(e) => setNovaSenha2(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {erro ? (
          <p style={{ margin: 0, color: '#fca5a5', fontSize: 13, lineHeight: 1.45 }}>{erro}</p>
        ) : null}
        {sucesso ? (
          <p style={{ margin: 0, color: '#86efac', fontSize: 13, lineHeight: 1.45 }}>{sucesso}</p>
        ) : null}

        <button type="submit" className="btn btn-primary btn-full" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  );
}
