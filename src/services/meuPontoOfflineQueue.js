import { pontoService } from './api';

const DB_NAME = 'pontofacil-meu-ponto';
const DB_VERSION = 1;
const STORE = 'offlineRegistros';

function dispatchChanged() {
  try {
    window.dispatchEvent(new CustomEvent('meu-ponto-offline-queue'));
  } catch {
    // ignore
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientRequestId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

/** Erro de rede típico (sem resposta HTTP). */
export function isMeuPontoOfflineTransportError(err) {
  if (!err || err.response) return false;
  if (err.code === 'ERR_NETWORK') return true;
  const msg = String(err.message || '');
  return msg.includes('Network Error');
}

/**
 * @param {{ clientRequestId: string, dataHoraCapturada: string, payload: object }} item
 */
export async function enqueueMeuPontoOffline(item) {
  if (typeof indexedDB === 'undefined') {
    throw new Error('Este dispositivo não suporta armazenamento offline.');
  }
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(item);
  });
  db.close();
  dispatchChanged();
}

export async function getMeuPontoOfflineQueueCount() {
  if (typeof indexedDB === 'undefined') return 0;
  try {
    const db = await openDb();
    const n = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return n;
  } catch {
    return 0;
  }
}

async function getAllSorted() {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows.sort((a, b) => {
    const ta = new Date(a.dataHoraCapturada || 0).getTime();
    const tb = new Date(b.dataHoraCapturada || 0).getTime();
    return ta - tb;
  });
}

async function removeId(clientRequestId) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(clientRequestId);
  });
  db.close();
}

async function putItem(item) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(item);
  });
  db.close();
}

/**
 * Envia fila em ordem. Para em erro de auth, geofence ou rede.
 * @returns {Promise<{ enviados: number, parou?: string }>}
 */
export async function flushMeuPontoOfflineQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { enviados: 0, parou: 'offline' };
  }
  const items = await getAllSorted();
  let enviados = 0;

  for (const item of items) {
    const send = async (payload) => {
      const res = await pontoService.registrar(payload);
      await removeId(item.clientRequestId);
      enviados += 1;
      dispatchChanged();
      return res;
    };

    try {
      await send(item.payload);
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 401) {
        return { enviados, parou: 'auth' };
      }

      if (status === 409 && code === 'REGISTRO_MUITO_CEDO' && !item.payload.confirmarRegistroCurto) {
        const updated = {
          ...item,
          payload: { ...item.payload, confirmarRegistroCurto: true },
        };
        await putItem(updated);
        try {
          await send(updated.payload);
        } catch (err2) {
          const c2 = err2?.response?.data?.code;
          const s2 = err2?.response?.status;
          if (s2 === 409 && (c2 === 'DUPLICADO_DIA' || c2 === 'REGISTRO_MUITO_RAPIDO')) {
            await removeId(item.clientRequestId);
            dispatchChanged();
            continue;
          }
          return { enviados, parou: 'erro' };
        }
        continue;
      }

      if (status === 409 && (code === 'DUPLICADO_DIA' || code === 'REGISTRO_MUITO_RAPIDO')) {
        await removeId(item.clientRequestId);
        dispatchChanged();
        continue;
      }

      if (status === 403 && code === 'FORA_GEOFENCE') {
        return { enviados, parou: 'geofence' };
      }

      if (isMeuPontoOfflineTransportError(err)) {
        return { enviados, parou: 'rede' };
      }

      if (status === 409 && code === 'TIPO_INESPERADO') {
        return { enviados, parou: 'sequencia' };
      }

      return { enviados, parou: 'erro' };
    }
  }

  return { enviados };
}

export function subscribeMeuPontoOfflineQueue(cb) {
  const fn = () => {
    getMeuPontoOfflineQueueCount().then(cb);
  };
  window.addEventListener('meu-ponto-offline-queue', fn);
  fn();
  return () => window.removeEventListener('meu-ponto-offline-queue', fn);
}
