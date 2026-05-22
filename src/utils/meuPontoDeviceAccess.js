/**
 * GPS e câmera no Meu Ponto (PWA): pede permissão uma vez e reutiliza nas próximas batidas.
 * O navegador guarda a permissão por site; aqui evitamos reabrir fluxos que disparam prompt de novo.
 */

const GEO_CACHE_MS_OPCIONAL = 10 * 60 * 1000; // 10 min — localização opcional
const GEO_CACHE_MS_CERCA = 3 * 60 * 1000; // 3 min — cerca virtual (ainda válido sem novo prompt)

let geoCache = null; // { latitude, longitude, accuracy, ts }
let cameraStream = null;
let preaquecendo = null;

function temGeolocation() {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
}

function temCamera() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Consulta estado (quando o navegador suporta Permissions API). */
export async function statusPermissoesDispositivo() {
  const out = { localizacao: 'unknown', camera: 'unknown' };
  if (!navigator?.permissions?.query) return out;
  try {
    const geo = await navigator.permissions.query({ name: 'geolocation' });
    out.localizacao = geo.state;
  } catch {
    /* Safari / PWA podem não expor geolocation na API */
  }
  try {
    const cam = await navigator.permissions.query({ name: 'camera' });
    out.camera = cam.state;
  } catch {
    /* idem */
  }
  return out;
}

function geoCacheValido(maxAgeMs) {
  if (!geoCache) return false;
  return Date.now() - geoCache.ts < maxAgeMs;
}

/**
 * Obtém coordenadas; reutiliza cache em memória para não chamar GPS a cada batida.
 * @param {{ obrigatorio?: boolean, cercaVirtual?: boolean }} opts
 */
export async function obterPosicaoAtual(opts = {}) {
  const { obrigatorio = false, cercaVirtual = false } = opts;
  const maxAgeMs = cercaVirtual ? GEO_CACHE_MS_CERCA : GEO_CACHE_MS_OPCIONAL;

  if (!temGeolocation()) {
    if (obrigatorio) throw Object.assign(new Error('GEO_UNAVAILABLE'), { code: 'GEO_UNAVAILABLE' });
    return null;
  }

  if (geoCacheValido(maxAgeMs)) {
    return {
      latitude: geoCache.latitude,
      longitude: geoCache.longitude,
      accuracy: geoCache.accuracy,
      fromCache: true,
    };
  }

  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: cercaVirtual ? 15000 : 10000,
      enableHighAccuracy: cercaVirtual,
      maximumAge: maxAgeMs,
    });
  });

  geoCache = {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    ts: Date.now(),
  };

  return {
    latitude: geoCache.latitude,
    longitude: geoCache.longitude,
    accuracy: geoCache.accuracy,
    fromCache: false,
  };
}

/** Pré-aquece GPS (e opcionalmente câmera) ao abrir Meu Ponto — uma vez por sessão. */
export function preaquecerDispositivos(opts = {}) {
  const { precisaGps = true, precisaCamera = false } = opts;
  if (preaquecendo) return preaquecendo;

  preaquecendo = (async () => {
    const tasks = [];
    if (precisaGps && temGeolocation()) {
      tasks.push(
        obterPosicaoAtual({ obrigatorio: false, cercaVirtual: false }).catch(() => null)
      );
    }
    if (precisaCamera && temCamera()) {
      tasks.push(obterStreamCamera().catch(() => null));
    }
    await Promise.all(tasks);
  })().finally(() => {
    preaquecendo = null;
  });

  return preaquecendo;
}

/** Stream de vídeo reutilizado entre aberturas da tela de câmera. */
export async function obterStreamCamera() {
  if (!temCamera()) {
    throw Object.assign(new Error('CAMERA_UNAVAILABLE'), { code: 'CAMERA_UNAVAILABLE' });
  }
  if (cameraStream) {
    const track = cameraStream.getVideoTracks()[0];
    if (track && track.readyState === 'live') return cameraStream;
    pararStreamCamera();
  }
  cameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
  });
  return cameraStream;
}

export function pararStreamCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((t) => t.stop());
  cameraStream = null;
}

/** Captura JPEG a partir do stream já autorizado (sem novo getUserMedia). */
export async function capturarFotoDoStream(stream, { quality = 0.72 } = {}) {
  if (!stream) return null;

  const video = document.createElement('video');
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  video.srcObject = stream;

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(resolve).catch(reject);
    };
    video.onerror = () => reject(new Error('VIDEO_ERROR'));
  });

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);
  video.srcObject = null;

  return canvas.toDataURL('image/jpeg', quality);
}

export function limparCacheGeo() {
  geoCache = null;
}
