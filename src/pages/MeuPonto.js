// Registro de ponto pelo celular (login e-mail + mesmas regras: geofence, foto, etc.)
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { pontoService, tenantService, escalaService } from '../services/api';
import { runMeuPontoTour } from '../tours/meuPontoTour';
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

function mensagemErroGeolocalizacao(err) {
  const c = err?.code;
  if (c === 1) {
    return (
      'Acesso à localização negado.\n' +
      'Nas configurações do navegador ou do celular, permita localização para este site/app e tente de novo.'
    );
  }
  if (c === 2) {
    return 'Não foi possível obter a posição. Ative o GPS e tente novamente.';
  }
  if (c === 3) {
    return 'Tempo esgotado ao obter o GPS. Verifique o sinal e tente de novo.';
  }
  return 'Não foi possível obter sua localização. Ative o GPS e as permissões e tente novamente.';
}

export default function MeuPonto() {
  const { usuario, logout, carregando: authCarregando } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState('bater'); // bater | pendencias | ausencias
  const [etapa, setEtapa] = useState('carregando');
  const [proximoTipo, setProximoTipo] = useState('ENTRADA');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [lembretesAtivos, setLembretesAtivos] = useState(() => localStorage.getItem('meuPontoLembretesAtivos') === '1');
  const [permissaoNotificacao, setPermissaoNotificacao] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  /** Atualizado pelo servidor (cerca e foto podem mudar sem novo login). */
  const [tenantCfg, setTenantCfg] = useState(null);
  const [pendenciaCheckin, setPendenciaCheckin] = useState(null);
  const [pendenciaModalAberto, setPendenciaModalAberto] = useState(false);
  const [registroOpts, setRegistroOpts] = useState(null);
  const [avisoEscala, setAvisoEscala] = useState(null);
  const [pendenciasDias, setPendenciasDias] = useState([]);
  const [carregandoPendencias, setCarregandoPendencias] = useState(false);
  const [justificarModal, setJustificarModal] = useState(null); // { dia, tipo }
  const [justificarForm, setJustificarForm] = useState({ dataHoraSugerida: '', justificativa: '' });
  const [salvandoJustificativa, setSalvandoJustificativa] = useState(false);
  const webcamRef = useRef(null);
  const proximoTipoRef = useRef(null);
  const lastSelfRegistroAt = useRef(0);

  /** Erro típico de extensão do navegador — não vem do PontoFácil. */
  function humanizarErroRegistro(err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const code = typeof data === 'object' && data ? data.code : undefined;
    const errorMsg = typeof data === 'object' && data ? data.error : undefined;

    if (code === 'DB_SCHEMA_OUTDATED') {
      return (
        'O servidor foi atualizado, mas o banco de dados ainda não.\n' +
        'Peça para o administrador aplicar as migrations no Railway:\n' +
        'npx prisma migrate deploy\n' +
        'e reiniciar o backend.'
      );
    }
    if (code === 'FORA_GEOFENCE') {
      return (
        'Você está fora da área permitida para registro (cerca virtual).\n' +
        'Dirija-se ao local da empresa (ou ao local vinculado ao seu cadastro) e tente de novo.'
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
    if (code === 'TIPO_INESPERADO') {
      const esperado = data?.esperado ? ` (esperado: ${TIPOS_LABEL[data.esperado]?.label || data.esperado})` : '';
      return `Seu app estava desatualizado em relação ao último registro${esperado}. Atualizando a tela…`;
    }
    if (code === 'DUPLICADO_DIA') {
      const tipo = data?.tipo ? (TIPOS_LABEL[data.tipo]?.label || data.tipo) : 'este tipo';
      const when = data?.dataHora ? `\nHorário já registrado: ${new Date(data.dataHora).toLocaleTimeString('pt-BR')}` : '';
      return `Você já registrou ${tipo} hoje.${when}`;
    }
    if (status === 500) {
      return errorMsg || 'Servidor com erro no momento. Tente novamente em instantes.';
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
        const pend = data.pendenciaCheckin || null;
        setPendenciaCheckin(pend);
        if (!silent && pend?.aberta) {
          setPendenciaModalAberto(true);
        }
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
        setPendenciaCheckin(null);
        setPendenciaModalAberto(false);
      }
    },
    [usuario?.id, notificar]
  );

  useEffect(() => {
    // O modo "totem" desabilita scroll/toque (global.css). No Meu Ponto (app do colaborador),
    // isso quebra o scroll no iPhone. Portanto, não aplicamos totem-mode aqui.
    return undefined;
  }, []);

  useEffect(() => {
    if (usuario?.id) carregarProximo();
  }, [usuario?.id, carregarProximo]);

  const carregarPendencias = useCallback(async () => {
    if (!usuario?.id || usuario.role !== 'COLABORADOR') return;
    setCarregandoPendencias(true);
    try {
      const { data } = await pontoService.pendencias({ dias: 14 });
      setPendenciasDias(Array.isArray(data?.pendencias) ? data.pendencias : []);
    } catch {
      setPendenciasDias([]);
    } finally {
      setCarregandoPendencias(false);
    }
  }, [usuario?.id, usuario?.role]);

  useEffect(() => {
    carregarPendencias();
  }, [carregarPendencias]);

  /** Tour guiado na tela principal do Meu ponto (primeira visita) */
  useEffect(() => {
    if (etapa !== 'confirmar') return;
    const t = setTimeout(() => runMeuPontoTour({ force: false }), 900);
    return () => clearTimeout(t);
  }, [etapa]);

  useEffect(() => {
    if (!usuario?.id || usuario.role !== 'COLABORADOR') return;
    tenantService
      .meu()
      .then(({ data }) => {
        setTenantCfg({
          geofenceAtivo: Boolean(data.geofenceAtivo),
          fotoObrigatoria: data.fotoObrigatoria !== false,
        });
      })
      .catch(() => {
        setTenantCfg({
          geofenceAtivo: Boolean(usuario.tenant?.geofenceAtivo),
          fotoObrigatoria: usuario.tenant?.fotoObrigatoria !== false,
        });
      });
  }, [usuario?.id, usuario?.role, usuario?.tenant?.geofenceAtivo, usuario?.tenant?.fotoObrigatoria]);

  // Aviso quando a escala foi criada/atualizada para o colaborador
  useEffect(() => {
    if (!usuario?.id || usuario.role !== 'COLABORADOR') return;
    escalaService
      .minha()
      .then(({ data }) => {
        const escala = data?.escala || null;
        if (!escala?.id) return;
        const lastId = localStorage.getItem('meuPontoUltimaEscalaId');
        const lastUpdatedAt = localStorage.getItem('meuPontoUltimaEscalaUpdatedAt');
        const updatedAt = escala.updatedAt ? String(escala.updatedAt) : '';
        const mudou = (lastId && lastId !== escala.id) || (lastUpdatedAt && updatedAt && lastUpdatedAt !== updatedAt);
        if (!lastId || mudou) {
          setAvisoEscala({
            nome: escala.nome,
            horaInicio: escala.horaInicio,
            horaFim: escala.horaFim,
          });
        }
        localStorage.setItem('meuPontoUltimaEscalaId', escala.id);
        if (updatedAt) localStorage.setItem('meuPontoUltimaEscalaUpdatedAt', updatedAt);
      })
      .catch(() => {});
  }, [usuario?.id, usuario?.role]);

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

  async function salvarJustificativa() {
    if (!justificarModal?.dia || !justificarModal?.tipo) return;
    const justificativa = String(justificarForm.justificativa || '').trim();
    if (!justificativa) {
      alert('Informe a justificativa.');
      return;
    }
    setSalvandoJustificativa(true);
    try {
      await pontoService.solicitarAjuste({
        dia: justificarModal.dia,
        tipo: justificarModal.tipo,
        dataHoraSugerida: justificarForm.dataHoraSugerida || undefined,
        justificativa,
      });
      alert('Justificativa enviada ao administrador/RH.');
      setJustificarModal(null);
      setJustificarForm({ dataHoraSugerida: '', justificativa: '' });
      carregarPendencias();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível enviar a justificativa.');
    } finally {
      setSalvandoJustificativa(false);
    }
  }

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
    async (fotoBase64, opts = {}) => {
      setCarregando(true);
      try {
        const tipoParaEnviar = opts.tipo || proximoTipo;
        const forcarNovoTurno = opts.forcarNovoTurno === true;
        const confirmarRegistroCurto = opts.confirmarRegistroCurto === true;
        const cercaAtiva = tenantCfg?.geofenceAtivo ?? usuario?.tenant?.geofenceAtivo;
        let latitude = null;
        let longitude = null;

        if (cercaAtiva) {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setMensagem('Este dispositivo não oferece GPS. Não é possível registrar com cerca virtual ativa.');
            setEtapa('erro');
            setTimeout(() => setEtapa('confirmar'), 4000);
            return;
          }
          try {
            const pos = await new Promise((res, rej) => {
              navigator.geolocation.getCurrentPosition(res, rej, {
                timeout: 15000,
                enableHighAccuracy: true,
                maximumAge: 0,
              });
            });
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          } catch (geoErr) {
            setMensagem(mensagemErroGeolocalizacao(geoErr));
            setEtapa('erro');
            setTimeout(() => setEtapa('confirmar'), 4500);
            return;
          }
        } else {
          try {
            const pos = await new Promise((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true })
            );
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          } catch {
            /* sem cerca: localização opcional */
          }
        }

        const payload = {
          tipo: tipoParaEnviar,
          latitude,
          longitude,
          origem: 'APP_INDIVIDUAL',
          fotoBase64,
          ...(forcarNovoTurno ? { forcarNovoTurno: true } : {}),
          ...(confirmarRegistroCurto ? { confirmarRegistroCurto: true } : {}),
        };

        const res = await pontoService.registrar(payload);
        const aviso = res?.data?.aviso;

        lastSelfRegistroAt.current = Date.now();

        const baseMsg = `Ponto registrado!\n${TIPOS_LABEL[tipoParaEnviar]?.label} — ${new Date().toLocaleTimeString('pt-BR')}`;
        if (aviso?.code === 'PENDENCIA_DIA_ANTERIOR') {
          setMensagem(
            baseMsg +
              `\n\nAtenção: existe um ponto do dia anterior para ajuste pelo administrador/RH.`
          );
        } else {
          setMensagem(baseMsg);
        }
        setEtapa('sucesso');
        setTimeout(() => {
          setEtapa('confirmar');
          carregarProximo({ silent: true });
        }, 2800);
      } catch (err) {
        // Aviso de "registro cedo demais" — permite confirmar e registrar mesmo assim.
        if (err?.response?.data?.code === 'REGISTRO_MUITO_CEDO' && opts.confirmarRegistroCurto !== true) {
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
            return await enviarRegistro(fotoBase64, { ...opts, confirmarRegistroCurto: true });
          }
        }
        const msg = humanizarErroRegistro(err);
        setMensagem(msg);
        setEtapa('erro');
        // Se o servidor retornou "tipo inesperado", recarrega o próximo e volta rápido
        if (err?.response?.data?.code === 'TIPO_INESPERADO') {
          setTimeout(() => {
            setEtapa('confirmar');
            carregarProximo({ silent: true });
          }, 1400);
        } else {
          setTimeout(() => setEtapa('confirmar'), 3500);
        }
      } finally {
        setCarregando(false);
      }
    },
    [proximoTipo, carregarProximo, tenantCfg?.geofenceAtivo, usuario?.tenant?.geofenceAtivo]
  );

  const registrarFoto = useCallback(async () => {
    let fotoBase64 = null;
    if (webcamRef.current) {
      fotoBase64 = webcamRef.current.getScreenshot();
    }
    const opts = registroOpts || {};
    setRegistroOpts(null);
    await enviarRegistro(fotoBase64, opts);
  }, [enviarRegistro, registroOpts]);

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

  const fotoObrigatoria = tenantCfg ? tenantCfg.fotoObrigatoria : usuario.tenant?.fotoObrigatoria !== false;
  const cercaVirtualAtiva = tenantCfg?.geofenceAtivo ?? usuario?.tenant?.geofenceAtivo;

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
        paddingBottom: 0,
        gap: 0,
        overflow: 'hidden',
      }}
    >
      <header
        id="tour-meu-header"
        style={{
          width: '100%',
          padding: '18px 56px 18px 20px',
          background: 'linear-gradient(135deg, #085041 0%, #1D9E75 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxSizing: 'border-box',
          flexShrink: 0,
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
          padding: '0 24px',
          gap: 24,
          width: '100%',
          boxSizing: 'border-box',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingTop: 18,
          paddingBottom: 88, // espaço para o menu inferior (mobile)
          minHeight: 0,
        }}
      >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>Meu ponto</h1>
        <button
          type="button"
          onClick={() => runMeuPontoTour({ force: true })}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#e2e8f0',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Como usar o Meu ponto
        </button>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', maxWidth: 320, margin: 0 }}>
        {usuario.tenant?.nomeFantasia}
      </p>
      <p
        style={{
          color: '#facc15',
          fontSize: 15,
          fontWeight: 800,
          textAlign: 'center',
          maxWidth: 320,
          margin: 0,
          letterSpacing: 0.2,
          textShadow: '0 1px 10px rgba(0,0,0,0.25)',
        }}
      >
        {usuario.nome}
      </p>
      {cercaVirtualAtiva ? (
        <p
          style={{
            color: '#86efac',
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 340,
            margin: 0,
            lineHeight: 1.45,
            padding: '0 8px',
          }}
        >
          Cerca virtual ativa: o ponto só é aceito dentro da área permitida pela empresa.
        </p>
      ) : null}
      {aba === 'bater' ? (
        <button
          type="button"
          onClick={() => {
            setAba('ausencias');
            try {
              const el = document.scrollingElement;
              if (el) el.scrollTop = 0;
            } catch {}
          }}
          style={{
            marginTop: 12,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#e2e8f0',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 14,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          📎 Atestado ou abono de ausência
        </button>
      ) : null}

      {aba === 'bater' ? (
        <div id="tour-meu-proximo" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 28, textAlign: 'center', minWidth: 280 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Próximo registro</p>
          <p style={{ color: 'white', fontSize: 26, fontWeight: 700 }}>
            {tipoInfo?.emoji} {tipoInfo?.label}
          </p>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>
            {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      ) : null}

      {avisoEscala ? (
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div
            style={{
              background: 'rgba(29,158,117,0.12)',
              border: '1px solid rgba(29,158,117,0.28)',
              borderRadius: 14,
              padding: 14,
              color: '#dcfce7',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>Sua escala foi criada/atualizada</p>
            <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: '#bbf7d0', lineHeight: 1.45 }}>
              {avisoEscala.nome} — {avisoEscala.horaInicio} até {avisoEscala.horaFim}
            </p>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: 12 }}
                onClick={() => setAvisoEscala(null)}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {aba === 'bater' ? (
      <div id="tour-meu-lembretes" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: 'white', fontSize: 14, fontWeight: 700, margin: 0 }}>🔔 Lembretes de ponto</p>
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
      ) : null}

      {aba === 'bater' ? (
      <div id="tour-meu-acao" style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
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
              onClick={() => {
                const opts = registroOpts || {};
                setRegistroOpts(null);
                enviarRegistro(null, opts);
              }}
            >
              {carregando ? 'Registrando…' : 'Registrar agora (sem foto)'}
            </button>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setEtapa('camera')}>
              Registrar com foto
            </button>
          </>
        )}
      </div>
      ) : null}

      {/* Pendências do colaborador (batidas faltantes) */}
      {aba === 'pendencias' ? (
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, border: '1px solid rgba(148,163,184,0.14)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: 0 }}>🧾 Pendências de ponto</p>
              <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 6, marginBottom: 0, lineHeight: 1.4 }}>
                Veja dias com batidas faltantes e envie uma justificativa para o administrador/RH.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={carregandoPendencias}
              onClick={carregarPendencias}
              style={{ whiteSpace: 'nowrap' }}
            >
              {carregandoPendencias ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>

          {carregandoPendencias ? (
            <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 12, marginBottom: 0 }}>Carregando…</p>
          ) : pendenciasDias.length === 0 ? (
            <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 12, marginBottom: 0 }}>Nenhuma pendência recente.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {pendenciasDias.slice(0, 8).map((p) => (
                <div
                  key={`${p.dia}-${p.faltando?.join(',')}`}
                  style={{
                    background: 'rgba(2,6,23,0.35)',
                    border: '1px solid rgba(148,163,184,0.16)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, color: 'white', fontSize: 13, fontWeight: 800 }}>{p.dia}</p>
                    <p style={{ marginTop: 6, marginBottom: 0, color: '#fbbf24', fontSize: 12 }}>
                      Faltando: {(p.faltando || []).map((t) => TIPOS_LABEL[t]?.label || t).join(', ')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(p.faltando || []).slice(0, 2).map((tipo) => (
                      <button
                        key={`${p.dia}-${tipo}`}
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '8px 10px', fontSize: 12 }}
                        onClick={() => {
                          setJustificarModal({ dia: p.dia, tipo });
                          setJustificarForm({ dataHoraSugerida: `${p.dia}T08:00`, justificativa: '' });
                        }}
                      >
                        Justificar {TIPOS_LABEL[tipo]?.label || tipo}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {pendenciasDias.length > 8 ? (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>
                  Mostrando 8 pendências. Ajuste com o administrador/RH se houver mais.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
      ) : null}

      {/* Ausências / comprovantes */}
      {aba === 'ausencias' ? (
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, border: '1px solid rgba(148,163,184,0.14)' }}>
            <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: 0 }}>📎 Atestado / abono de ausência</p>
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 6, marginBottom: 0, lineHeight: 1.4 }}>
              Envie um comprovante (atestado/declaração) para análise do administrador/RH.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/comprovantes')}>
                Abrir meus comprovantes
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.open('https://wa.me/5592994764780?text=' + encodeURIComponent('Olá! Preciso de ajuda com envio de comprovante/abono no PontoFácil.'), '_blank')}
              >
                Preciso de ajuda
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal de justificativa */}
      {justificarModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
          onClick={() => setJustificarModal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#0b1220',
              border: '1px solid rgba(148,163,184,0.18)',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 20px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: 0, color: 'white', fontSize: 16, fontWeight: 900 }}>
              Justificar batida faltante
            </p>
            <p style={{ marginTop: 10, marginBottom: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
              Dia: <b>{justificarModal.dia}</b> · Tipo: <b>{TIPOS_LABEL[justificarModal.tipo]?.label || justificarModal.tipo}</b>
            </p>

            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                  Sugestão de horário (opcional)
                </label>
                <input
                  className="input"
                  type="datetime-local"
                  value={justificarForm.dataHoraSugerida}
                  onChange={(e) => setJustificarForm((p) => ({ ...p, dataHoraSugerida: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                  Justificativa *
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={justificarForm.justificativa}
                  onChange={(e) => setJustificarForm((p) => ({ ...p, justificativa: e.target.value }))}
                  placeholder="Ex: Esqueci de registrar a saída do intervalo."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setJustificarModal(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={salvandoJustificativa || !String(justificarForm.justificativa || '').trim()}
                onClick={salvarJustificativa}
              >
                {salvandoJustificativa ? 'Enviando…' : 'Enviar justificativa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendenciaModalAberto && pendenciaCheckin?.aberta ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
          onClick={() => setPendenciaModalAberto(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#0b1220',
              border: '1px solid rgba(148,163,184,0.18)',
              borderRadius: 16,
              padding: 18,
              boxShadow: '0 20px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: 0, color: 'white', fontSize: 16, fontWeight: 800 }}>
              Identificamos um registro em aberto
            </p>
            <p style={{ marginTop: 10, marginBottom: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
              Seu último registro foi há aproximadamente <b>{pendenciaCheckin.horasAberto}h</b>. Isso pode indicar que a saída não foi registrada.
            </p>
            <p style={{ marginTop: 10, marginBottom: 0, color: '#94a3b8', fontSize: 12, lineHeight: 1.45 }}>
              Você pode registrar a saída agora (se fizer sentido) ou iniciar um novo turno e o sistema sinaliza pendência para ajuste pelo gestor/RH.
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              {!pendenciaCheckin.sugerirNovoTurno ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={carregando}
                  onClick={() => {
                    setPendenciaModalAberto(false);
                    setRegistroOpts(null);
                    if (fotoObrigatoria) setEtapa('camera');
                    else enviarRegistro(null, {});
                  }}
                >
                  Registrar saída agora
                </button>
              ) : null}

              <button
                type="button"
                className="btn btn-secondary"
                disabled={carregando}
                onClick={() => {
                  setPendenciaModalAberto(false);
                  setRegistroOpts({ tipo: 'ENTRADA', forcarNovoTurno: true });
                  if (fotoObrigatoria) setEtapa('camera');
                  else enviarRegistro(null, { tipo: 'ENTRADA', forcarNovoTurno: true });
                }}
              >
                Iniciar novo turno
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendenciaModalAberto(false)}
                style={{ marginLeft: 'auto' }}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Menu inferior (mobile) */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: 'rgba(2,6,23,0.92)',
          borderTop: '1px solid rgba(148,163,184,0.18)',
          zIndex: 9998,
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '10px 12px' }}>
          <button
            type="button"
            onClick={() => setAba('bater')}
            style={{
              background: aba === 'bater' ? 'rgba(29,158,117,0.22)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(148,163,184,0.18)',
              color: 'white',
              borderRadius: 12,
              padding: '10px 8px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🕐 Bater ponto
          </button>
          <button
            type="button"
            onClick={() => setAba('pendencias')}
            style={{
              background: aba === 'pendencias' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(148,163,184,0.18)',
              color: 'white',
              borderRadius: 12,
              padding: '10px 8px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🧾 Pendências
          </button>
          <button
            type="button"
            onClick={() => setAba('ausencias')}
            style={{
              background: aba === 'ausencias' ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(148,163,184,0.18)',
              color: 'white',
              borderRadius: 12,
              padding: '10px 8px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            📎 Ausências
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
