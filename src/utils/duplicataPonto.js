import { format } from 'date-fns';

const TIPOS_LABEL = {
  ENTRADA: 'Entrada',
  SAIDA_ALMOCO: 'Saída almoço',
  RETORNO_ALMOCO: 'Retorno almoço',
  SAIDA: 'Saída',
};

const ORIGEM_LABEL = {
  TOTEM: 'Totem',
  APP_INDIVIDUAL: 'Meu ponto',
  ADMIN_MANUAL: 'Manual',
};

/**
 * @param {object} data resposta 409 do backend (code DUPLICADO_DIA)
 */
export function mensagemDuplicataDia(data) {
  const tipoLabel = TIPOS_LABEL[data?.tipo] || data?.tipo || 'batida';
  const horaRaw = data?.dataHoraEfetiva || data?.dataHora;
  let horaFmt = '';
  if (horaRaw) {
    const d = new Date(horaRaw);
    if (!Number.isNaN(d.getTime())) horaFmt = format(d, 'dd/MM/yyyy HH:mm');
  }
  const origem = data?.origem ? ORIGEM_LABEL[data.origem] || data.origem : '';
  const partes = [
    `Já existe ${tipoLabel} neste dia`,
    horaFmt ? `(${horaFmt})` : '',
    origem ? `— origem: ${origem}` : '',
    data?.ajustado ? '— já ajustada' : '',
  ].filter(Boolean);
  return `${partes.join(' ')}.\n\nEm vez de inserir, use ✏️ Ajustar na batida existente (lista abaixo do dia).`;
}

export { TIPOS_LABEL as TIPOS_LABEL_DUPLICATA };
