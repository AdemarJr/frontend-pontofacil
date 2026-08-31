// src/pages/Totem.js
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { authService, pontoService } from '../services/api';
import { logoInternoUrl } from '../utils/branding';
import AppIcon from '../components/AppIcon';
import { useTheme } from '../hooks/useTheme';

const TENANT_ID = localStorage.getItem('totemTenantId') || '';

const TIPOS_LABEL = {
  ENTRADA: { label: 'Entrada', cor: '#1D9E75', icon: 'dot' },
  SAIDA_ALMOCO: { label: 'Saída Almoço', cor: '#BA7517', icon: 'dot' },
  RETORNO_ALMOCO: { label: 'Retorno Almoço', cor: '#185FA5', icon: 'dot' },
  SAIDA: { label: 'Saída', cor: '#E24B4A', icon: 'dot' },
};

function TotemThemeBtn() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className="colaborador-app__theme-btn totem-shell__theme"
      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      onClick={toggleTheme}
      style={{
        background: 'var(--pwa-card)',
        border: '1px solid var(--pwa-card-border)',
        color: 'var(--pwa-fg)',
      }}
    >
      <AppIcon name={theme === 'dark' ? 'sun' : 'moon'} size={18} color="var(--pwa-fg)" />
    </button>
  );
}

export default function Totem() {
  const [etapa, setEtapa] = useState('pin'); // pin | confirmar | camera | sucesso | erro
  const [pin, setPin] = useState('');
  const [tenantId, setTenantId] = useState(TENANT_ID);
  const [tenantIdInput, setTenantIdInput] = useState('');
  const [configTenant, setConfigTenant] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [totemToken, setTotemToken] = useState(null);
  const [proximoTipo, setProximoTipo] = useState('ENTRADA');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const webcamRef = useRef(null);

  // Oculta navegação do browser no modo totem
  useEffect(() => {
    document.body.classList.add('totem-mode');
    return () => document.body.classList.remove('totem-mode');
  }, []);

  // Resetar após 30s de inatividade
  useEffect(() => {
    if (etapa === 'pin' && pin === '') return;
    const timer = setTimeout(resetar, 30000);
    return () => clearTimeout(timer);
  }, [etapa, pin]);

  function resetar() {
    setPin('');
    setEtapa('pin');
    setUsuario(null);
    setTotemToken(null);
    setMensagem('');
  }

  function pressKey(tecla) {
    if (pin.length >= 6) return;
    setPin(prev => prev + tecla);
  }

  function apagar() {
    setPin(prev => prev.slice(0, -1));
  }

  async function confirmarPin() {
    if (pin.length < 4) return;
    if (!tenantId) {
      setConfigTenant(true);
      return;
    }
    setCarregando(true);
    try {
      const { data } = await authService.loginPin(pin, tenantId, getDeviceId());
      setUsuario(data.usuario);
      setTotemToken(data.totemToken);
      localStorage.setItem('accessToken', data.totemToken);

      // Busca próximo ponto esperado (requer JWT no header)
      const { data: ultimo } = await pontoService.ultimoPonto(data.usuario.id);
      setProximoTipo(ultimo.proximoTipo || 'ENTRADA');

      setEtapa('confirmar');
    } catch (err) {
      setMensagem(err.response?.data?.error || 'PIN inválido');
      setEtapa('erro');
      setTimeout(resetar, 3000);
    } finally {
      setCarregando(false);
    }
  }

  const capturarFoto = useCallback(async () => {
    setCarregando(true);
    const tokenAntes = localStorage.getItem('accessToken');
    try {
      let fotoBase64 = null;
      if (webcamRef.current) {
        fotoBase64 = webcamRef.current.getScreenshot();
      }

      // Pega geolocalização se disponível
      let latitude = null;
      let longitude = null;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        /* geolocalização opcional no totem */
      }

      if (totemToken) {
        localStorage.setItem('accessToken', totemToken);
      }

      const payloadBase = {
        tipo: proximoTipo,
        latitude,
        longitude,
        deviceId: getDeviceId(),
        fotoBase64,
      };

      async function registrarComOpts(extra = {}) {
        const { data } = await pontoService.registrar({ ...payloadBase, ...extra });
        return data;
      }

      let resData;
      try {
        resData = await registrarComOpts();
      } catch (err) {
        // Mesmo fluxo do Meu Ponto: aviso de cedo demais com opção de confirmar
        if (err?.response?.data?.code === 'REGISTRO_MUITO_CEDO') {
          const d = err.response.data;
          const minutos = Number(d.minutosDecorridos ?? 0);
          const minimo = Number(d.minimoMinutos ?? 0);
          const faltam = Math.max(0, minimo - minutos);
          const ok = window.confirm(
            (d.error || 'Registro muito cedo.') +
              `\n\nDecorridos: ${minutos} min\nMínimo: ${minimo} min` +
              (faltam > 0 ? `\nFaltam: ${faltam} min` : '') +
              '\n\nDeseja registrar mesmo assim?'
          );
          if (ok) {
            resData = await registrarComOpts({ confirmarRegistroCurto: true });
          } else {
            setMensagem(d.error || 'Registro cancelado.');
            setEtapa('erro');
            setTimeout(resetar, 4000);
            return;
          }
        } else {
          throw err;
        }
      }

      const nsrTxt = resData?.registro?.nsr ? `\nNSR: ${resData.registro.nsr}` : '';
      setMensagem(
        `Ponto registrado com sucesso!\n${TIPOS_LABEL[proximoTipo]?.label} — ${new Date().toLocaleTimeString('pt-BR')}${nsrTxt}`
      );
      if (resData?.proximoTipo) setProximoTipo(resData.proximoTipo);
      setEtapa('sucesso');
      setTimeout(resetar, 4000);
    } catch (err) {
      const data = err?.response?.data;
      let msg = data?.error || 'Erro ao registrar ponto';
      if (data?.code === 'TIPO_INESPERADO' && data?.esperado) {
        const label = TIPOS_LABEL[data.esperado]?.label || data.esperado;
        msg = `Tipo inesperado. Próximo esperado: ${label}. Tente novamente.`;
        if (data.esperado) setProximoTipo(data.esperado);
      } else if (data?.code === 'REGISTRO_MUITO_RAPIDO') {
        msg = data.error || 'Aguarde alguns segundos e tente novamente.';
      } else if (data?.code === 'DUPLICADO_DIA') {
        const label = data.tipo ? TIPOS_LABEL[data.tipo]?.label || data.tipo : 'este tipo';
        msg = `Você já registrou ${label} hoje.`;
      }
      setMensagem(msg);
      setEtapa('erro');
      setTimeout(resetar, 4000);
    } finally {
      if (tokenAntes != null) localStorage.setItem('accessToken', tokenAntes);
      else localStorage.removeItem('accessToken');
      setCarregando(false);
    }
  }, [totemToken, proximoTipo]);

  function getDeviceId() {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substr(2, 12);
      localStorage.setItem('deviceId', id);
    }
    return id;
  }

  function salvarTenant() {
    if (!tenantIdInput.trim()) return;
    localStorage.setItem('totemTenantId', tenantIdInput.trim());
    setTenantId(tenantIdInput.trim());
    setConfigTenant(false);
  }

  const tipoInfo = TIPOS_LABEL[proximoTipo];

  // Config inicial do Tenant
  if (configTenant || !tenantId) {
    return (
      <div className="totem-shell">
        <TotemThemeBtn />
        <AppIcon name="configuracoes" size={52} color="var(--pwa-title)" aria-label="Configuração" />
        <h2 style={{ color: 'var(--pwa-title)', fontSize: 22, textAlign: 'center', margin: 0 }}>Configuração do Totem</h2>
        <p style={{ color: 'var(--pwa-muted)', fontSize: 14, textAlign: 'center', margin: 0, maxWidth: 360 }}>
          Cole o ID da empresa fornecido pelo administrador
        </p>
        <input
          className="input"
          style={{ maxWidth: 400, width: '100%', textAlign: 'center', fontFamily: 'monospace', fontSize: 13 }}
          placeholder="ID da empresa (UUID)"
          value={tenantIdInput}
          onChange={(e) => setTenantIdInput(e.target.value)}
        />
        <button type="button" className="btn btn-primary btn-lg" onClick={salvarTenant}>Confirmar</button>
      </div>
    );
  }

  // Tela de sucesso
  if (etapa === 'sucesso') {
    return (
      <div className="pwa-state pwa-state--success totem-shell" style={{ gap: 24 }}>
        <TotemThemeBtn />
        <AppIcon name="ok" size={88} color="var(--pwa-success-fg)" aria-label="Sucesso" />
        <div className="pwa-state__title" style={{ fontSize: 28 }}>{mensagem}</div>
        <p className="pwa-state__meta">Obrigado, {usuario?.nome}!</p>
      </div>
    );
  }

  // Tela de erro
  if (etapa === 'erro') {
    return (
      <div className="pwa-state pwa-state--error totem-shell" style={{ gap: 24 }}>
        <TotemThemeBtn />
        <AppIcon name="erro" size={88} color="var(--pwa-error-fg)" aria-label="Erro" />
        <div className="pwa-state__title" style={{ fontSize: 24 }}>{mensagem}</div>
        <p className="pwa-state__meta">Retornando em instantes...</p>
      </div>
    );
  }

  // Tela da câmera
  if (etapa === 'camera') {
    return (
      <div className="totem-shell" style={{ gap: 24 }}>
        <TotemThemeBtn />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--pwa-muted)', fontSize: 14, margin: 0 }}>Olhe para a câmera</p>
          <h2 style={{ color: 'var(--pwa-title)', fontSize: 22, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <AppIcon name={tipoInfo?.icon} size={22} color={tipoInfo?.cor} aria-hidden />
            {tipoInfo?.label}
          </h2>
        </div>

        <div style={{ borderRadius: 16, overflow: 'hidden', border: '3px solid var(--verde)', width: '100%', maxWidth: 400, aspectRatio: '4/3' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.7}
            videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 400 }}>
          <button type="button" className="btn btn-secondary btn-full btn-lg" onClick={resetar}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-full btn-lg" onClick={capturarFoto} disabled={carregando}>
            {carregando ? (
              <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2, borderTopColor: 'white' }} />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <AppIcon name="camera" size={18} aria-hidden />
                Registrar
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Tela de confirmação (após PIN correto)
  if (etapa === 'confirmar') {
    return (
      <div className="totem-shell" style={{ gap: 28 }}>
        <TotemThemeBtn />
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'var(--verde)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, color: '#fff', fontWeight: 700,
        }}>
          {usuario?.nome?.[0]?.toUpperCase()}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--pwa-title)', fontSize: 28, fontWeight: 700, margin: 0 }}>{usuario?.nome}</h2>
          <p style={{ color: 'var(--pwa-muted)', marginTop: 4 }}>{usuario?.cargo}</p>
        </div>
        <div className="pwa-card pwa-card--center" style={{ maxWidth: 320 }}>
          <p style={{ color: 'var(--pwa-muted)', fontSize: 14, margin: 0 }}>Registrar</p>
          <p style={{ color: 'var(--pwa-title)', fontSize: 24, fontWeight: 700, marginTop: 4, marginBottom: 0 }}>
            {tipoInfo?.label}
          </p>
          <p style={{ color: 'var(--pwa-muted)', fontSize: 14, marginTop: 8, marginBottom: 0 }}>
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 360 }}>
          <button type="button" className="btn btn-secondary btn-full btn-lg" onClick={resetar}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-full btn-lg" onClick={() => setEtapa('camera')}>
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // Tela principal do Totem: teclado numérico
  return (
    <div className="totem-shell" style={{ gap: 28 }}>
      <TotemThemeBtn />
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 400 }}>
        <div className="totem-brand">
          <img
            src={logoInternoUrl()}
            alt="Ponto Fácil"
            style={{ maxHeight: 110, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>
        <p style={{ color: 'var(--pwa-muted)', marginTop: 16, fontSize: 15, marginBottom: 0 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
        <p style={{ color: 'var(--verde)', fontSize: 28, fontWeight: 600, marginTop: 4, marginBottom: 0 }}>
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="totem-pin-display">
        <p style={{
          color: 'var(--pwa-subtle)', fontSize: 13, marginBottom: 12, marginTop: 0,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          Digite seu PIN
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {[...Array(Math.max(pin.length, 4))].map((_, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: i < pin.length ? 'var(--verde)' : 'var(--pwa-card-border)',
                transition: 'background 0.15s',
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 300 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" className="totem-key" onClick={() => pressKey(String(n))}>
            {n}
          </button>
        ))}
        <button
          type="button"
          className="totem-key"
          style={{ fontSize: 20, color: 'var(--vermelho)', background: 'rgba(226,75,74,0.1)' }}
          onClick={resetar}
        >
          ✕
        </button>
        <button type="button" className="totem-key" onClick={() => pressKey('0')}>0</button>
        <button
          type="button"
          className="totem-key"
          style={{ fontSize: 20, background: 'rgba(29,158,117,0.12)', color: 'var(--verde)' }}
          onClick={confirmarPin}
          disabled={pin.length < 4 || carregando}
        >
          {carregando ? '...' : '→'}
        </button>
      </div>

      <button
        type="button"
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          background: 'transparent',
          border: 'none',
          color: 'var(--pwa-subtle)',
          fontSize: 11,
          cursor: 'pointer',
          opacity: 0.55,
        }}
        onClick={() => setConfigTenant(true)}
      >
        ⚙ config
      </button>
    </div>
  );
}
