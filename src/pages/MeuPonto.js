// Registro de ponto pelo celular (login e-mail + mesmas regras: geofence, foto, etc.)
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { pontoService } from '../services/api';
import { publicUrl, logoInternoUrl } from '../utils/branding';

const TIPOS_LABEL = {
  ENTRADA: { label: 'Entrada', cor: '#1D9E75', emoji: '🟢' },
  SAIDA_ALMOCO: { label: 'Saída Almoço', cor: '#BA7517', emoji: '🟡' },
  RETORNO_ALMOCO: { label: 'Retorno Almoço', cor: '#185FA5', emoji: '🔵' },
  SAIDA: { label: 'Saída', cor: '#E24B4A', emoji: '🔴' },
};

/** Texto do lembrete por horário (entrada, intervalos, saída) */
function textoLembreteHorario(tipo) {
  const map = {
    ENTRADA: 'Entrada — registre sua chegada.',
    SAIDA_ALMOCO: 'Intervalo: saída para almoço — registre ao sair.',
    RETORNO_ALMOCO: 'Intervalo: retorno do almoço — registre ao voltar.',
    SAIDA: 'Saída — registre o fim do expediente.',
  };
  return map[tipo] || `Registre: ${TIPOS_LABEL[tipo]?.label || tipo}`;
}

/** Quando o servidor indica outro “próximo” (ex.: ajuste, outro dispositivo) */
function textoAlteracaoAtividade(novoTipo) {
  const map = {
    ENTRADA: 'Seu próximo passo agora é registrar a Entrada. Abra o Meu Ponto.',
    SAIDA_ALMOCO: 'Seu próximo passo agora é a saída para o intervalo (almoço).',
    RETORNO_ALMOCO: 'Seu próximo passo agora é o retorno do intervalo.',
    SAIDA: 'Seu próximo passo agora é a Saída do expediente.',
  };
  return map[novoTipo] || `Próximo registro esperado: ${TIPOS_LABEL[novoTipo]?.label || novoTipo}. Abra o Meu Ponto.`;
}

export default function MeuPonto() {
  const { usuario, logout, carregando: authCarregando } = useAuth();
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState('carregando');
  const [proximoTipo, setProximoTipo] = useState('ENTRADA');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [lembretesAtivos, setLembretesAtivos] = useState(() => localStorage.getItem('meuPontoLembretesAtivos') === '1');
  const [permissaoNotificacao, setPermissaoNotificacao] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const webcamRef = useRef(null);
  const proximoTipoRef = useRef(null);
  const lastSelfRegistroAt = useRef(0);

  function humanizarErroRegistro(err) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    const errorMsg = err?.response?.data?.error;

    if (code === 'FORA_GEOFENCE') {
      return (
        'Você está fora da localização programada no painel.\n' +
        'Para bater o ponto, vá para o local correto e tente novamente.'
      );
    }
    if (code === 'LOCAL_INVALIDO') {
      return 'Seu cadastro está vinculado a um local inválido. Fale com o RH/Administrador.';
    }
    if (status === 403) {
      // fallback genérico para outros 403 (sem mascarar mensagens específicas)
      return errorMsg || 'Acesso negado.';
    }
    if (status === 400 && errorMsg === 'Localização obrigatória para este tenant') {
      return (
        'A localização é obrigatória para bater ponto nesta empresa.\n' +
        'Ative o GPS/permissão de localização e tente novamente.'
      );
    }
    return errorMsg || 'Não foi possível registrar';
  }

  function obterConfigLembretes() {
    const raw = localStorage.getItem('meuPontoLembretesConfig');
    if (raw) {
      try {
        const j = JSON.parse(raw);
        if (j && typeof j === 'object') return j;
      } catch {}
    }
    // padrão “horário comercial” (janela larga para não perder o lembrete)
    return {
      ENTRADA: '08:00',
      SAIDA_ALMOCO: '12:00',
      RETORNO_ALMOCO: '13:00',
      SAIDA: '17:00',
      toleranciaMinutos: 20,
    };
  }

  function salvarConfigLembretes(cfg) {
    localStorage.setItem('meuPontoLembretesConfig', JSON.stringify(cfg));
  }

  function hhmm(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function mesmaDataKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function podeNotificarHoje(tipo) {
    const k = `meuPontoLembreteNotificado:${mesmaDataKey()}:${tipo}`;
    return !localStorage.getItem(k);
  }

  function marcarNotificado(tipo) {
    const k = `meuPontoLembreteNotificado:${mesmaDataKey()}:${tipo}`;
    localStorage.setItem(k, String(Date.now()));
  }

  const notificar = useCallback(async (title, body, tag = 'meu-ponto-lembrete') => {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission !== 'granted') return false;
    const iconUrl = publicUrl('/logo192.png');
    const opts = {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag,
      renotify: true,
    };
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, opts);
        return true;
      }
    } catch (e) {
      console.warn('[meu-ponto] showNotification (SW):', e?.message);
    }
    try {
      new Notification(title, opts);
      return true;
    } catch (e) {
      console.warn('[meu-ponto] Notification API:', e?.message);
      return false;
    }
  }, []);

  async function ativarLembretes() {
    if (typeof Notification === 'undefined') {
      alert('Seu navegador não suporta notificações.');
      return;
    }
    const perm = await Notification.requestPermission();
    setPermissaoNotificacao(perm);
    if (perm !== 'granted') {
      alert('Permissão negada. Ative nas configurações do navegador para receber lembretes.');
      return;
    }
    localStorage.setItem('meuPontoLembretesAtivos', '1');
    setLembretesAtivos(true);
    // garante que existe config padrão salva
    const cfg = obterConfigLembretes();
    salvarConfigLembretes(cfg);
    alert(
      'Lembretes ativados.\n\nNo iPhone: notificações no PWA podem ser limitadas — use Safari, adicione à Tela Início e mantenha o app aberto nos horários, se possível.'
    );
  }

  function desativarLembretes() {
    localStorage.setItem('meuPontoLembretesAtivos', '0');
    setLembretesAtivos(false);
  }

  const carregarProximo = useCallback(
    async (opts = {}) => {
      if (!usuario?.id) return;
      const silent = opts.silent === true;
      try {
        const { data } = await pontoService.ultimoPonto(usuario.id);
        const novo = data.proximoTipo || 'ENTRADA';
        const anterior = proximoTipoRef.current;
        proximoTipoRef.current = novo;
        setProximoTipo(novo);
        setEtapa('confirmar');

        const mudou = anterior !== null && anterior !== novo;
        const poucoDepoisDoProprioRegistro = Date.now() - lastSelfRegistroAt.current < 12000;
        if (
          !silent &&
          mudou &&
          !poucoDepoisDoProprioRegistro &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          notificar(
            'PontoFácil — atualização',
            textoAlteracaoAtividade(novo),
            'meu-ponto-alteracao'
          );
        }
      } catch {
        setEtapa('confirmar');
        const novo = 'ENTRADA';
        proximoTipoRef.current = novo;
        setProximoTipo(novo);
      }
    },
    [usuario?.id, notificar]
  );

  useEffect(() => {
    document.body.classList.add('totem-mode');
    return () => document.body.classList.remove('totem-mode');
  }, []);

  useEffect(() => {
    if (usuario?.id) carregarProximo();
  }, [usuario?.id, carregarProximo]);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPermissaoNotificacao(Notification.permission);
    const onVisibility = () => {
      if (typeof Notification !== 'undefined') setPermissaoNotificacao(Notification.permission);
      if (document.visibilityState === 'visible' && usuario?.id) {
        carregarProximo({ silent: false });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [usuario?.id, carregarProximo]);

  /** Sincroniza com o servidor (ajuste pelo RH, outro aparelho, etc.) */
  useEffect(() => {
    if (!usuario?.id) return;
    const id = setInterval(() => carregarProximo({ silent: false }), 4 * 60 * 1000);
    return () => clearInterval(id);
  }, [usuario?.id, carregarProximo]);

  // Lembretes: checa a cada 15s (evita perder a janela de 1 min) + Service Worker para PWA
  useEffect(() => {
    if (!usuario?.id) return;
    if (!lembretesAtivos) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const cfg = obterConfigLembretes();
    const tolerancia = parseInt(cfg.toleranciaMinutos || 20, 10);

    function tick() {
      const agora = new Date();
      const horarioAlvo = cfg[proximoTipo];
      if (!horarioAlvo) return;
      if (!podeNotificarHoje(proximoTipo)) return;

      const [h, m] = String(horarioAlvo).split(':').map((x) => parseInt(x, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) return;
      const inicio = new Date(agora);
      inicio.setHours(h, m, 0, 0);
      const fim = new Date(inicio.getTime() + tolerancia * 60 * 1000);

      if (agora >= inicio && agora <= fim) {
        const titulo = 'Hora de bater o ponto';
        const corpo = textoLembreteHorario(proximoTipo);
        notificar(titulo, corpo, `meu-ponto-lembrete-${proximoTipo}`).then((ok) => {
          if (ok) marcarNotificado(proximoTipo);
        });
      }
    }

    tick();
    const timer = setInterval(tick, 15 * 1000);
    return () => clearInterval(timer);
  }, [usuario?.id, lembretesAtivos, proximoTipo, notificar]);

  const enviarRegistro = useCallback(
    async (fotoBase64) => {
      setCarregando(true);
      try {
        let latitude = null;
        let longitude = null;
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true })
          );
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {
          /* se cerca ativa, o backend retorna erro */
        }

        await pontoService.registrar({
          tipo: proximoTipo,
          latitude,
          longitude,
          origem: 'APP_INDIVIDUAL',
          fotoBase64,
        });

        lastSelfRegistroAt.current = Date.now();

        setMensagem(
          `Ponto registrado!\n${TIPOS_LABEL[proximoTipo]?.label} — ${new Date().toLocaleTimeString('pt-BR')}`
        );
        setEtapa('sucesso');
        setTimeout(() => {
          setEtapa('confirmar');
          carregarProximo({ silent: true });
        }, 2800);
      } catch (err) {
        setMensagem(humanizarErroRegistro(err));
        setEtapa('erro');
        setTimeout(() => setEtapa('confirmar'), 3500);
      } finally {
        setCarregando(false);
      }
    },
    [proximoTipo, carregarProximo]
  );

  const registrarFoto = useCallback(async () => {
    let fotoBase64 = null;
    if (webcamRef.current) {
      fotoBase64 = webcamRef.current.getScreenshot();
    }
    await enviarRegistro(fotoBase64);
  }, [enviarRegistro]);

  const tipoInfo = TIPOS_LABEL[proximoTipo];

  if (authCarregando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  if (usuario.role !== 'COLABORADOR') {
    return <Navigate to="/dashboard" replace />;
  }

  const fotoObrigatoria = usuario.tenant?.fotoObrigatoria !== false;

  if (etapa === 'carregando') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (etapa === 'sucesso') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#052e16', gap: 24, padding: 20 }}>
        <div style={{ fontSize: 72 }}>✅</div>
        <div style={{ color: 'white', fontSize: 22, fontWeight: 700, textAlign: 'center', whiteSpace: 'pre-line' }}>{mensagem}</div>
        <p style={{ color: '#86efac', fontSize: 15 }}>Olá, {usuario.nome}</p>
      </div>
    );
  }

  if (etapa === 'erro') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c0202', gap: 20, padding: 20 }}>
        <div style={{ fontSize: 64 }}>❌</div>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 600, textAlign: 'center' }}>{mensagem}</div>
      </div>
    );
  }

  if (etapa === 'camera') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', gap: 20, padding: 20 }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Registro pelo app — {usuario.tenant?.nomeFantasia}</p>
        <h2 style={{ color: 'white', fontSize: 22, marginTop: 0 }}>
          {tipoInfo?.emoji} {tipoInfo?.label}
        </h2>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '3px solid var(--verde)', width: '100%', maxWidth: 400, aspectRatio: '4/3' }}>
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.72}
            videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 400 }}>
          <button type="button" className="btn btn-secondary btn-full btn-lg" onClick={() => setEtapa('confirmar')}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary btn-full btn-lg" onClick={registrarFoto} disabled={carregando}>
            {carregando ? <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2, borderTopColor: 'white' }} /> : '📸 Registrar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(180deg,#0f2027 0%,#203a43 100%)',
        paddingTop: 0,
        paddingBottom: 24,
        gap: 24,
      }}
    >
      <header
        style={{
          width: '100%',
          padding: '18px 56px 18px 20px',
          background: 'linear-gradient(135deg, #085041 0%, #1D9E75 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={logoInternoUrl()}
          alt="Ponto Fácil"
          style={{ maxHeight: 64, width: 'auto', maxWidth: 'min(340px, 82vw)', objectFit: 'contain' }}
        />
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.15)',
            border: 'none',
            color: 'rgba(255,255,255,0.95)',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          gap: 24,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>Meu ponto</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', maxWidth: 320, margin: 0 }}>
        {usuario.tenant?.nomeFantasia}
      </p>

      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 28, textAlign: 'center', minWidth: 280 }}>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Próximo registro</p>
        <p style={{ color: 'white', fontSize: 26, fontWeight: 700 }}>
          {tipoInfo?.emoji} {tipoInfo?.label}
        </p>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>
          {new Date().toLocaleString('pt-BR')}
        </p>
      </div>

      <p style={{ color: '#64748b', fontSize: 12, textAlign: 'center', maxWidth: 340, lineHeight: 1.5 }}>
        Você já está logado com seu e-mail. Localização e foto seguem as regras da empresa (cerca virtual e foto obrigatória, se ativas). Salve este link ou use o PWA no celular.
      </p>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: 'white', fontSize: 14, fontWeight: 700, margin: 0 }}>🔔 Lembretes de ponto</p>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 6, marginBottom: 0, lineHeight: 1.4 }}>
                Lembra no horário do próximo passo: <strong>Entrada</strong>, <strong>intervalo</strong> (saída e retorno do almoço) e <strong>Saída</strong>. Se o próximo ponto mudar (ex.: ajuste no sistema), você também recebe um aviso — com permissão de notificação. No iOS o suporte varia.
              </p>
              {permissaoNotificacao !== 'granted' && (
                <p style={{ color: '#fbbf24', fontSize: 12, marginTop: 8, marginBottom: 0, lineHeight: 1.4 }}>
                  Permissão de notificação: {permissaoNotificacao === 'denied' ? 'bloqueada' : 'não concedida'}.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {lembretesAtivos ? (
                <button type="button" className="btn btn-secondary" onClick={desativarLembretes} style={{ whiteSpace: 'nowrap' }}>
                  Desativar
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={ativarLembretes} style={{ whiteSpace: 'nowrap' }}>
                  Ativar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
        {fotoObrigatoria ? (
          <button type="button" className="btn btn-primary btn-full btn-lg" onClick={() => setEtapa('camera')}>
            Abrir câmera →
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary btn-full btn-lg"
              disabled={carregando}
              onClick={() => enviarRegistro(null)}
            >
              {carregando ? 'Registrando…' : 'Registrar agora (sem foto)'}
            </button>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setEtapa('camera')}>
              Registrar com foto
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
