/** ID estável neste navegador/aparelho (auditoria + fila offline). */
export function getMeuPontoDeviceId() {
  const k = 'meuPontoDeviceId';
  try {
    let id = localStorage.getItem(k);
    if (!id && typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
      localStorage.setItem(k, id);
    }
    return id || 'unknown';
  } catch {
    return 'unknown';
  }
}
