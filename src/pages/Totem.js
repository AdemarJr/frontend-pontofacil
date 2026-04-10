// src/pages/Totem.js
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { authService, pontoService } from '../services/api';
import { logoInternoUrl } from '../utils/branding';

const TENANT_ID = localStorage.getItem('totemTenantId') || '';

const TIPOS_LABEL = {
  ENTRADA: { label: 'Entrada', cor: '#1D9E75', emoji: '🟢' },
  SAIDA_ALMOCO: { label: 'Saída Almoço', cor: '#BA7517', emoji: '🟡' },
  RETORNO_ALMOCO: { label: 'Retorno Almoço', cor: '#185FA5', emoji: '🔵' },
  SAIDA: { label: 'Saída', cor: '#E24B4A', emoji: '🔴' },
};

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
    try {
      let fotoBase64 = null;
      if (webcamRef.current) {
        fotoBase64 = webcamRef.current.getScreenshot();
      }

      // Pega geolocalização se disponível
      let latitude = null, longitude = null;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {}

      // Usa token do totem para registrar
      const tokenOriginal = localStorage.getItem('accessToken');
      localStorage.setItem('accessToken', totemToken);

      await pontoService.registrar({
        tipo: proximoTipo,
        latitude,
        longitude,
        deviceId: getDeviceId(),
        fotoBase64,
      });

      localStorage.setItem('accessToken', tokenOriginal);

      setMensagem(`Ponto registrado com sucesso!\n${TIPOS_LABEL[proximoTipo]?.label} — ${new Date().toLocaleTimeString('pt-BR')}`);
      setEtapa('sucesso');
      setTimeout(resetar, 4000);
    } catch (err) {
      setMensagem(err.response?.data?.error || 'Erro ao registrar ponto');
      setEtapa('erro');
      setTimeout(resetar, 4000);
    } finally {
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
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0f2027', padding:'40px', gap:'20px' }}>
        <div style={{ fontSize:'48px' }}>⚙️</div>
        <h2 style={{ color:'white', fontSize:'22px', textAlign:'center' }}>Configuração do Totem</h2>
        <p style={{ color:'#9CA3AF', fontSize:'14px', textAlign:'center' }}>Cole o ID da empresa fornecido pelo administrador</p>
        <input
          className="input"
          style={{ maxWidth:'400px', textAlign:'center', fontFamily:'monospace', fontSize:'13px' }}
          placeholder="ID da empresa (UUID)"
          value={tenantIdInput}
          onChange={e => setTenantIdInput(e.target.value)}
        />
        <button className="btn btn-primary btn-lg" onClick={salvarTenant}>Confirmar</button>
      </div>
    );
  }

  // Tela de sucesso
  if (etapa === 'sucesso') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#052e16', gap:'24px' }}>
        <div style={{ fontSize:'80px' }}>✅</div>
        <div style={{ color:'white', fontSize:'28px', fontWeight:'700', textAlign:'center', whiteSpace:'pre-line' }}>{mensagem}</div>
        <p style={{ color:'#86efac', fontSize:'16px' }}>Obrigado, {usuario?.nome}!</p>
      </div>
    );
  }

  // Tela de erro
  if (etapa === 'erro') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#1c0202', gap:'24px' }}>
        <div style={{ fontSize:'80px' }}>❌</div>
        <div style={{ color:'white', fontSize:'24px', fontWeight:'600', textAlign:'center' }}>{mensagem}</div>
        <p style={{ color:'#fca5a5', fontSize:'14px' }}>Retornando em instantes...</p>
      </div>
    );
  }

  // Tela da câmera
  if (etapa === 'camera') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0f172a', gap:'24px', padding:'20px' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ color:'#94a3b8', fontSize:'14px' }}>Olhe para a câmera</p>
          <h2 style={{ color:'white', fontSize:'22px', marginTop:'4px' }}>{tipoInfo?.emoji} {tipoInfo?.label}</h2>
        </div>

        <div style={{ borderRadius:'16px', overflow:'hidden', border:'3px solid var(--verde)', width:'100%', maxWidth:'400px', aspectRatio:'4/3' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.7}
            videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
            style={{ width:'100%', height:'100%', objectFit:'cover' }}
          />
        </div>

        <div style={{ display:'flex', gap:'16px', width:'100%', maxWidth:'400px' }}>
          <button className="btn btn-secondary btn-full btn-lg" onClick={resetar}>Cancelar</button>
          <button className="btn btn-primary btn-full btn-lg" onClick={capturarFoto} disabled={carregando}>
            {carregando ? <span className="spinner" style={{ width:'22px', height:'22px', borderWidth:'2px', borderTopColor:'white' }} /> : '📸 Registrar'}
          </button>
        </div>
      </div>
    );
  }

  // Tela de confirmação (após PIN correto)
  if (etapa === 'confirmar') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0f172a', gap:'28px', padding:'40px' }}>
        <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'var(--verde)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px' }}>
          {usuario?.nome?.[0]?.toUpperCase()}
        </div>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ color:'white', fontSize:'28px', fontWeight:'700' }}>{usuario?.nome}</h2>
          <p style={{ color:'#94a3b8', marginTop:'4px' }}>{usuario?.cargo}</p>
        </div>
        <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:'16px', padding:'20px 40px', textAlign:'center' }}>
          <p style={{ color:'#94a3b8', fontSize:'14px' }}>Registrar</p>
          <p style={{ color:'white', fontSize:'24px', fontWeight:'700', marginTop:'4px' }}>
            {tipoInfo?.emoji} {tipoInfo?.label}
          </p>
          <p style={{ color:'#94a3b8', fontSize:'14px', marginTop:'8px' }}>
            {new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
        <div style={{ display:'flex', gap:'16px', width:'100%', maxWidth:'360px' }}>
          <button className="btn btn-secondary btn-full btn-lg" onClick={resetar}>Cancelar</button>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => setEtapa('camera')}>
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // Tela principal do Totem: teclado numérico
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(180deg, #0f2027 0%, #203a43 50%, #0f2027 100%)', padding:'20px', gap:'32px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 400 }}>
        <div
          style={{
            padding: '18px 22px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #085041 0%, #1D9E75 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src={logoInternoUrl()}
            alt="Ponto Fácil"
            style={{ maxHeight: 72, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>
        <p style={{ color:'#94a3b8', marginTop:'16px', fontSize:'16px' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })}
        </p>
        <p style={{ color:'#1D9E75', fontSize:'28px', fontWeight:'600', marginTop:'4px' }}>
          {new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
        </p>
      </div>

      {/* Display do PIN */}
      <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:'16px', padding:'20px 40px', minWidth:'240px', textAlign:'center' }}>
        <p style={{ color:'#64748b', fontSize:'13px', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.1em' }}>Digite seu PIN</p>
        <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
          {[...Array(Math.max(pin.length, 4))].map((_, i) => (
            <div key={i} style={{
              width:'16px', height:'16px', borderRadius:'50%',
              background: i < pin.length ? 'var(--verde)' : 'rgba(255,255,255,0.15)',
              transition:'background 0.15s'
            }} />
          ))}
        </div>
      </div>

      {/* Teclado numérico */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px', width:'100%', maxWidth:'300px' }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="totem-key" onClick={() => pressKey(String(n))}>
            {n}
          </button>
        ))}
        <button className="totem-key" style={{ fontSize:'20px', color:'var(--vermelho)', background:'rgba(226,75,74,0.1)' }} onClick={resetar}>✕</button>
        <button className="totem-key" onClick={() => pressKey('0')}>0</button>
        <button className="totem-key" style={{ fontSize:'20px', background:'rgba(29,158,117,0.1)', color:'var(--verde)' }} onClick={confirmarPin} disabled={pin.length < 4 || carregando}>
          {carregando ? '...' : '→'}
        </button>
      </div>

      {/* Config admin (toque longo no rodapé) */}
      <button
        style={{ position:'fixed', bottom:'16px', right:'16px', background:'transparent', border:'none', color:'rgba(255,255,255,0.15)', fontSize:'11px', cursor:'pointer' }}
        onClick={() => setConfigTenant(true)}
      >
        ⚙ config
      </button>
    </div>
  );
}
