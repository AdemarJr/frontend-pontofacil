// Registro de ponto pelo celular (login e-mail + mesmas regras: geofence, foto, etc.)
import { useState, useRef, useEffect, useCallback } from 'react';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import MeuPontoCamera, { pararStreamCamera } from '../components/meuPonto/MeuPontoCamera';
import {
  obterPosicaoAtual,
  preaquecerDispositivos,
  capturarFotoDoStream,
  obterStreamCamera,
  statusPermissoesDispositivo,
} from '../utils/meuPontoDeviceAccess';
import { useAuth } from '../hooks/useAuth';
import { useColaboradorChrome } from '../context/ColaboradorChromeContext';
import { pontoService, tenantService, escalaService } from '../services/api';
import {
  enqueueMeuPontoOffline,
  flushMeuPontoOfflineQueue,
  getMeuPontoOfflineQueueCount,
  isMeuPontoOfflineTransportError,
  subscribeMeuPontoOfflineQueue,
} from '../services/meuPontoOfflineQueue';
import { getMeuPontoDeviceId } from '../utils/meuPontoDeviceId';
import { runMeuPontoTour } from '../tours/meuPontoTour';
import { publicUrl } from '../utils/branding';
import AppIcon from '../components/AppIcon';
import Modal from '../components/Modal';

const TIPOS_LABEL = {
  ENTRADA: { label: 'Entrada', cor: '#1D9E75', icon: 'dot' },
  SAIDA_ALMOCO: { label: 'Saída Almoço', cor: '#BA7517', icon: 'dot' },
  RETORNO_ALMOCO: { label: 'Retorno Almoço', cor: '#185FA5', icon: 'dot' },
  SAIDA: { label: 'Saída', cor: '#E24B4A', icon: 'dot' },
};

function proximoTipoApos(tipo) {
  const seq = {
    ENTRADA: 'SAIDA_ALMOCO',
    SAIDA_ALMOCO: 'RETORNO_ALMOCO',
    RETORNO_ALMOCO: 'SAIDA',
    SAIDA: 'ENTRADA',
  };
  return seq[tipo] || 'ENTRADA';
}

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
  const { usuario, carregando: authCarregando } = useAuth();
  const [searchParams] = useSearchParams();
  const aba = searchParams.get('tab') === 'pendencias' ? 'pendencias' : 'bater';
  const { setChromeHidden } = useColaboradorChrome();
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
  const [permDispositivo, setPermDispositivo] = useState({ localizacao: 'unknown', camera: 'unknown' });
  const [liberandoPermissoes, setLiberandoPermissoes] = useState(false);
  const proximoTipoRef = useRef(null);
  const lastSelfRegistroAt = useRef(0);
  const [offlinePendentes, setOfflinePendentes] = useState(0);

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
        // Modal só para turno aberto há muitas horas no MESMO dia (não bloqueia virada de dia).
        if (!silent && pend?.aberta) {
          setPendenciaModalAberto(true);
        } else {
          setPendenciaModalAberto(false);
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

  useEffect(() => {
    if (pendenciaCheckin?.diaAnteriorEmAberto) {
      carregarPendencias();
    }
  }, [pendenciaCheckin?.diaAnteriorEmAberto, carregarPendencias]);

  /** Tour guiado na tela principal do Meu ponto (primeira visita) */
  useEffect(() => {
    if (etapa !== 'confirmar') return;
    const t = setTimeout(() => runMeuPontoTour({ force: false }), 900);
    return () => clearTimeout(t);
  }, [etapa]);

  useEffect(() => {
    const hide = ['sucesso', 'erro', 'camera', 'carregando'].includes(etapa);
    setChromeHidden(hide);
    return () => setChromeHidden(false);
  }, [etapa, setChromeHidden]);

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

  const fotoObrigatoriaCfg = tenantCfg ? tenantCfg.fotoObrigatoria : usuario?.tenant?.fotoObrigatoria !== false;
  const cercaVirtualCfg = tenantCfg?.geofenceAtivo ?? usuario?.tenant?.geofenceAtivo;

  useEffect(() => {
    statusPermissoesDispositivo().then(setPermDispositivo);
    if (!navigator?.permissions?.query) return undefined;
    let geoPerm;
    let camPerm;
    (async () => {
      try {
        geoPerm = await navigator.permissions.query({ name: 'geolocation' });
        geoPerm.onchange = () => statusPermissoesDispositivo().then(setPermDispositivo);
      } catch {
        /* ignore */
      }
      try {
        camPerm = await navigator.permissions.query({ name: 'camera' });
        camPerm.onchange = () => statusPermissoesDispositivo().then(setPermDispositivo);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      if (geoPerm) geoPerm.onchange = null;
      if (camPerm) camPerm.onchange = null;
    };
  }, []);

  /** Pré-autoriza GPS/câmera ao abrir a aba Bater ponto (permissão persiste no PWA). */
  useEffect(() => {
    if (!usuario?.id || usuario.role !== 'COLABORADOR' || aba !== 'bater') return;
    preaquecerDispositivos({ precisaGps: true, precisaCamera: Boolean(fotoObrigatoriaCfg) })
      .then(() => {
        localStorage.setItem('meuPontoPermissoesOk', '1');
        return statusPermissoesDispositivo();
      })
      .then((st) => {
        if (st) setPermDispositivo(st);
      })
      .catch(() => {});
  }, [usuario?.id, usuario?.role, aba, fotoObrigatoriaCfg]);

  useEffect(() => {
    return () => pararStreamCamera();
  }, []);

  async function liberarPermissoesDispositivo() {
    setLiberandoPermissoes(true);
    try {
      await preaquecerDispositivos({ precisaGps: true, precisaCamera: Boolean(fotoObrigatoriaCfg) });
      localStorage.setItem('meuPontoPermissoesOk', '1');
      const st = await statusPermissoesDispositivo();
      setPermDispositivo(st);
    } finally {
      setLiberandoPermissoes(false);
    }
  }

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
        flushMeuPontoOfflineQueue().then(() => carregarProximo({ silent: true }));
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

  /** Contador da fila offline (IndexedDB). */
  useEffect(() => {
    if (!usuario?.id || usuario.role !== 'COLABORADOR') return undefined;
    return subscribeMeuPontoOfflineQueue(setOfflinePendentes);
  }, [usuario?.id, usuario?.role]);

  /** Envia fila quando voltar a rede ou periodicamente. */
  useEffect(() => {
    if (!usuario?.id || usuario.role !== 'COLABORADOR') return undefined;
    const runFlush = () => {
      flushMeuPontoOfflineQueue().then(() => {
        carregarProximo({ silent: true });
      });
    };
    window.addEventListener('online', runFlush);
    const id = setInterval(runFlush, 60 * 1000);
    getMeuPontoOfflineQueueCount().then((n) => {
      if (n > 0) runFlush();
    });
    return () => {
      window.removeEventListener('online', runFlush);
      clearInterval(id);
    };
  }, [usuario?.id, usuario?.role, carregarProximo]);

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
      let irParaFilaOffline = null;
      try {
        const tipoParaEnviar = opts.tipo || proximoTipo;
        const forcarNovoTurno = opts.forcarNovoTurno === true;
        const confirmarRegistroCurto = opts.confirmarRegistroCurto === true;
        const cercaAtiva = tenantCfg?.geofenceAtivo ?? usuario?.tenant?.geofenceAtivo;
        let latitude = null;
        let longitude = null;

        if (cercaAtiva) {
          try {
            const pos = await obterPosicaoAtual({ obrigatorio: true, cercaVirtual: true });
            latitude = pos.latitude;
            longitude = pos.longitude;
          } catch (geoErr) {
            if (geoErr?.code === 'GEO_UNAVAILABLE') {
              setMensagem('Este dispositivo não oferece GPS. Não é possível registrar com cerca virtual ativa.');
            } else {
              setMensagem(mensagemErroGeolocalizacao(geoErr));
            }
            setEtapa('erro');
            setTimeout(() => setEtapa('confirmar'), 4500);
            return;
          }
        } else {
          try {
            const pos = await obterPosicaoAtual({ obrigatorio: false, cercaVirtual: false });
            if (pos) {
              latitude = pos.latitude;
              longitude = pos.longitude;
            }
          } catch {
            /* sem cerca: localização opcional */
          }
        }

        const clientRequestId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `pf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const dataHoraCapturada = new Date().toISOString();
        const deviceId = getMeuPontoDeviceId();

        const payload = {
          tipo: tipoParaEnviar,
          latitude,
          longitude,
          origem: 'APP_INDIVIDUAL',
          fotoBase64,
          deviceId,
          clientRequestId,
          dataHoraCapturada,
          ...(forcarNovoTurno ? { forcarNovoTurno: true } : {}),
          ...(confirmarRegistroCurto ? { confirmarRegistroCurto: true } : {}),
        };

        const queueItem = {
          clientRequestId,
          dataHoraCapturada,
          payload: { ...payload },
        };

        irParaFilaOffline = async () => {
          await enqueueMeuPontoOffline(queueItem);
          lastSelfRegistroAt.current = Date.now();
          setProximoTipo(proximoTipoApos(tipoParaEnviar));
          proximoTipoRef.current = proximoTipoApos(tipoParaEnviar);
          setMensagem(
            `Ponto guardado neste aparelho (${TIPOS_LABEL[tipoParaEnviar]?.label}).\n\nSerá enviado automaticamente quando houver internet.`
          );
          setEtapa('sucesso');
          setTimeout(() => {
            setEtapa('confirmar');
            carregarProximo({ silent: true });
          }, 2800);
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          try {
            await irParaFilaOffline();
          } catch (e) {
            setMensagem(e?.message || 'Não foi possível guardar o registro neste aparelho.');
            setEtapa('erro');
            setTimeout(() => setEtapa('confirmar'), 4000);
          }
          return;
        }

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
        if (isMeuPontoOfflineTransportError(err) && irParaFilaOffline) {
          try {
            await irParaFilaOffline();
          } catch (e) {
            setMensagem(e?.message || 'Sem conexão. Não foi possível guardar neste aparelho.');
            setEtapa('erro');
            setTimeout(() => setEtapa('confirmar'), 4000);
          }
          return;
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
    try {
      const stream = await obterStreamCamera();
      fotoBase64 = await capturarFotoDoStream(stream);
    } catch {
      setMensagem(
        'Não foi possível usar a câmera. Toque em "Liberar câmera e localização" ou permita o acesso nas configurações do aparelho.'
      );
      setEtapa('erro');
      setTimeout(() => setEtapa('camera'), 3500);
      return;
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

  const fotoObrigatoria = fotoObrigatoriaCfg;
  const cercaVirtualAtiva = cercaVirtualCfg;

  const permissoesNegadas =
    permDispositivo.localizacao === 'denied' || permDispositivo.camera === 'denied';
  const mostrarCardPermissoes =
    aba === 'bater' &&
    etapa === 'confirmar' &&
    localStorage.getItem('meuPontoPermissoesOk') !== '1';

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
        <div>
          <AppIcon name="ok" size={80} color="#86efac" aria-label="Sucesso" />
        </div>
        <div style={{ color: 'white', fontSize: 22, fontWeight: 700, textAlign: 'center', whiteSpace: 'pre-line' }}>{mensagem}</div>
        <p style={{ color: '#86efac', fontSize: 15 }}>Olá, {usuario.nome}</p>
      </div>
    );
  }

  if (etapa === 'erro') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1c0202', gap: 20, padding: 20 }}>
        <div>
          <AppIcon name="erro" size={70} color="#fca5a5" aria-label="Erro" />
        </div>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 600, textAlign: 'center' }}>{mensagem}</div>
      </div>
    );
  }

  if (etapa === 'camera') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', gap: 20, padding: 20 }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Registro pelo app — {usuario.tenant?.nomeFantasia}</p>
        <h2 style={{ color: 'white', fontSize: 22, marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <AppIcon name={tipoInfo?.icon} size={22} color={tipoInfo?.cor} aria-hidden />
          {tipoInfo?.label}
        </h2>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '3px solid var(--verde)', width: '100%', maxWidth: 400, aspectRatio: '4/3' }}>
          <MeuPontoCamera />
        </div>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 400 }}>
          <button type="button" className="btn btn-secondary btn-full btn-lg" onClick={() => setEtapa('confirmar')}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary btn-full btn-lg" onClick={registrarFoto} disabled={carregando}>
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

  return (
    <div className="colaborador-page">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', textAlign: 'center' }}>
          {aba === 'pendencias' ? 'Pendências' : 'Registrar ponto'}
        </h1>
        {aba === 'bater' ? (
          <button
            type="button"
            onClick={() => runMeuPontoTour({ force: true })}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#e2e8f0',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 999,
              cursor: 'pointer',
            }}
          >
            Como usar
          </button>
        ) : null}
      </div>
      {aba === 'bater' ? (
        <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', maxWidth: 340, margin: '4px 0 0', lineHeight: 1.45 }}>
          {usuario.tenant?.nomeFantasia}
        </p>
      ) : (
        <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', margin: '4px 0 0' }}>
          Batidas faltantes e justificativas enviadas ao RH.
        </p>
      )}
      {aba === 'bater' ? (
        <p
          style={{
            color: '#fde047',
            fontSize: 14,
            fontWeight: 700,
            textAlign: 'center',
            maxWidth: 340,
            margin: '6px 0 0',
            letterSpacing: 0.02,
          }}
        >
          {usuario.nome}
        </p>
      ) : null}
      {mostrarCardPermissoes ? (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            maxWidth: 380,
            width: '100%',
          }}
        >
          <p style={{ margin: 0, color: '#fde68a', fontSize: 13, lineHeight: 1.5 }}>
            {permissoesNegadas
              ? 'O acesso foi bloqueado. Libere localização e câmera nas configurações do aparelho ou do navegador.'
              : (
                <>
                  Autorize <strong>localização</strong>
                  {fotoObrigatoria ? ' e <strong>câmera</strong>' : ''} uma vez neste aparelho. Nas próximas batidas o
                  app reutiliza o acesso, sem pedir de novo.
                </>
              )}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 12, width: '100%' }}
            disabled={liberandoPermissoes}
            onClick={liberarPermissoesDispositivo}
          >
            {liberandoPermissoes ? 'Aguarde…' : 'Liberar câmera e localização'}
          </button>
        </div>
      ) : null}
      {aba === 'bater' && cercaVirtualAtiva ? (
        <p
          style={{
            color: '#86efac',
            fontSize: 12,
            textAlign: 'center',
            maxWidth: 360,
            margin: '8px 0 0',
            lineHeight: 1.45,
            padding: '0 8px',
          }}
        >
          Cerca virtual ativa: o ponto só é aceito na área permitida pela empresa.
        </p>
      ) : null}
      {aba === 'bater' && pendenciaCheckin?.diaAnteriorEmAberto ? (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            maxWidth: 380,
            width: '100%',
          }}
        >
          <p style={{ margin: 0, color: '#bfdbfe', fontSize: 13, lineHeight: 1.5 }}>
            O dia anterior ficou com batidas em aberto. Registre o ponto de <strong>hoje</strong> normalmente abaixo.
            Batidas faltantes do dia anterior estão em{' '}
            <Link to="/meu-ponto?tab=pendencias" style={{ color: '#93c5fd', fontWeight: 700 }}>
              Pendências
            </Link>{' '}
            para justificar ou solicitar ajuste ao RH.
          </p>
        </div>
      ) : null}
      {aba === 'bater' && offlinePendentes > 0 ? (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            maxWidth: 380,
            width: '100%',
          }}
        >
          <p style={{ color: '#fde68a', fontSize: 13, margin: 0, lineHeight: 1.45, textAlign: 'center' }}>
            {offlinePendentes === 1
              ? '1 registro guardado neste aparelho aguardando envio.'
              : `${offlinePendentes} registros guardados neste aparelho aguardando envio.`}{' '}
            Com internet, o envio é feito automaticamente; com cerca virtual, você precisa estar na área permitida.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-full"
            style={{ marginTop: 10, fontSize: 13 }}
            onClick={() => {
              flushMeuPontoOfflineQueue().then(() => carregarProximo({ silent: true }));
            }}
          >
            Tentar enviar agora
          </button>
        </div>
      ) : null}
      {aba === 'bater' && typeof navigator !== 'undefined' && !navigator.onLine ? (
        <p
          style={{
            color: '#fde047',
            fontSize: 12,
            textAlign: 'center',
            maxWidth: 360,
            margin: '10px 0 0',
            lineHeight: 1.45,
            padding: '0 8px',
          }}
        >
          Sem conexão no momento: o ponto pode ser guardado neste aparelho e enviado depois.
        </p>
      ) : null}
      {aba === 'bater' ? (
        <div className="colaborador-page__quick">
          <Link to="/comprovantes">
            <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="ausencias" size={18} aria-hidden />
            </span>
            <span>Atestado</span>
          </Link>
          <Link to="/minhas-ferias">
            <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="ferias" size={18} aria-hidden />
            </span>
            <span>Férias</span>
          </Link>
          <button
            type="button"
            onClick={() =>
              window.open(
                'https://wa.me/5592994764780?text=' +
                  encodeURIComponent('Olá! Preciso de ajuda com o PontoFácil (colaborador).'),
                '_blank'
              )
            }
          >
            <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="whatsapp" size={18} aria-hidden />
            </span>
            <span>Ajuda</span>
          </button>
        </div>
      ) : null}

      {aba === 'bater' ? (
        <div
          id="tour-meu-proximo"
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 'clamp(16px, 4vw, 28px)',
            textAlign: 'center',
            width: '100%',
            maxWidth: 'min(420px, 100%)',
            boxSizing: 'border-box',
          }}
        >
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Próximo registro</p>
          <p style={{ color: 'white', fontSize: 26, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <AppIcon name={tipoInfo?.icon} size={22} color={tipoInfo?.cor} aria-hidden />
            {tipoInfo?.label}
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

      <Modal
        open={!!justificarModal}
        onClose={() => setJustificarModal(null)}
        title="Justificar batida faltante"
        subtitle={justificarModal ? `Dia: ${justificarModal.dia} · Tipo: ${TIPOS_LABEL[justificarModal.tipo]?.label || justificarModal.tipo}` : ''}
        variant="dark"
        maxWidth={520}
        zIndex={9999}
        footer={(
          <>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setJustificarModal(null)}>Cancelar</button>
            <button
              type="button"
              className="btn btn-primary btn-full"
              disabled={salvandoJustificativa || !String(justificarForm.justificativa || '').trim()}
              onClick={salvarJustificativa}
            >
              {salvandoJustificativa ? 'Enviando…' : 'Enviar justificativa'}
            </button>
          </>
        )}
      >
        <div style={{ display: 'grid', gap: 12 }}>
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
      </Modal>

      <Modal
        open={pendenciaModalAberto && !!pendenciaCheckin?.aberta}
        onClose={() => setPendenciaModalAberto(false)}
        title="Turno de hoje ainda em aberto"
        variant="dark"
        maxWidth={520}
        zIndex={9999}
        footer={(
          <>
            <button
              type="button"
              className="btn btn-primary btn-full"
              disabled={carregando}
              onClick={() => {
                setPendenciaModalAberto(false);
                setRegistroOpts(null);
                if (fotoObrigatoria) setEtapa('camera');
                else enviarRegistro(null, {});
              }}
            >
              Continuar ponto de hoje
            </button>
            {pendenciaCheckin?.sugerirNovoTurno ? (
              <button
                type="button"
                className="btn btn-secondary btn-full"
                disabled={carregando}
                onClick={() => {
                  setPendenciaModalAberto(false);
                  setRegistroOpts({ tipo: 'ENTRADA', forcarNovoTurno: true });
                  if (fotoObrigatoria) setEtapa('camera');
                  else enviarRegistro(null, { tipo: 'ENTRADA', forcarNovoTurno: true });
                }}
              >
                Nova entrada (encerrar turno)
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setPendenciaModalAberto(false)}>
              Agora não
            </button>
          </>
        )}
      >
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
          Seu último registro foi há aproximadamente <b>{pendenciaCheckin?.horasAberto}h</b> e pode faltar a saída de hoje.
        </p>
        <p style={{ margin: '10px 0 0', color: '#94a3b8', fontSize: 12, lineHeight: 1.45 }}>
          {pendenciaCheckin?.sugerirNovoTurno
            ? 'Você pode registrar a saída de hoje ou encerrar o turno e começar uma nova entrada (o RH pode ajustar depois).'
            : 'Registre a próxima batida do dia de hoje na sequência normal.'}
        </p>
      </Modal>
    </div>
  );
}
