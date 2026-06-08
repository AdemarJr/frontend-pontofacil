/** Módulo folha habilitado para o tenant (aceita vários formatos da API). */
export function isFolhaHabilitada(features) {
  if (!features) return false;
  const v = features.payrollModuleEnabled;
  return v === true || v === 'true' || v === 1;
}

export function featuresPadrao(tenantId = null) {
  return { tenantId, payrollModuleEnabled: false };
}
