import { startModuleTour } from './tourHelpers';

/** v3: inclui presets 5x2/6x1/12x36 e programação Trabalho/Folga/DSR */
export const STORAGE_TOUR_ESCALAS = 'pontofacil_tour_escalas_v3';

function steps() {
  return [
    {
      element: '#tour-escalas-header',
      popover: {
        title: 'Jornadas e escalas',
        description:
          'Aqui você define a jornada do colaborador: tipo de escala (5x2, 6x1, 12x36 ou personalizada), horários e programação por dia (Trabalho, Folga ou DSR). O espelho e a folha usam a escala vigente — sábado e domingo só são descanso se a escala disser isso. Use o botão “Tipos de escala” para ver a explicação de cada preset.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-escalas-colaborador',
      popover: {
        title: 'Escolha o colaborador',
        description:
          'Cada pessoa pode ter uma ou mais escalas (com vigências diferentes). Selecione alguém na lista para carregar e cadastrar as jornadas dele.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-escalas-dica',
      popover: {
        title: 'Como funciona o fluxo',
        description:
          '1) Selecione um colaborador.\n2) Em Nova escala: escolha o tipo (5x2, 6x1, personalizada ou 12x36), horários, programação dos dias e clique em Adicionar escala.\n3) Na lista abaixo, ative, desative ou exclua escalas.\n\nSe ainda não escolheu ninguém, os passos seguintes aparecem depois da seleção.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-escalas-form',
      popover: {
        title: 'Nova escala — identificação',
        description:
          'Comece pelo tipo/preset e depois dê um nome à jornada (ex.: Padrão, Sábado, Plantão 12x36).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-escalas-preset',
      popover: {
        title: 'Tipo / preset',
        description:
          '5x2: seg–sex trabalho, sáb folga, dom DSR.\n6x1: trabalha 6 dias, 1 de descanso (padrão no domingo).\nPersonalizada: você define cada dia.\n12x36: ciclo de plantão a partir de uma data-base.\n\nClique em “Ver explicação dos tipos de escala” para o guia completo.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-escalas-horarios',
      popover: {
        title: 'Entrada e saída',
        description:
          'Entrada e Saída são o início e o fim do expediente esperados. Turnos noturnos (ex.: 19:00→07:00) são aceitos.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-escalas-almoco',
      popover: {
        title: 'Intervalo de almoço (esperado)',
        description:
          'Saída almoço e Retorno almoço entram na sequência de batidas no espelho. Em plantões 12x36 sem intervalo, esses campos podem ficar vazios.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-escalas-carga',
      popover: {
        title: 'Carga horária e intervalo mínimo',
        description:
          'Carga horária líquida ajuda nos cálculos. Intervalo mínimo (em minutos) é o tempo mínimo de almoço — em turnos noturnos de vigilância pode ser 0.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-escalas-dias',
      popover: {
        title: 'Programação semanal',
        description:
          'Para cada dia escolha Trabalho, Folga ou DSR. O sistema só gera falta em dia de Trabalho sem batida. Em 12x36 o ciclo da data-base prevalece na apuração.',
        side: 'top',
      },
    },
    {
      element: '#tour-escalas-salvar',
      popover: {
        title: 'Salvar a escala',
        description:
          'Clique em Adicionar escala para gravar. Use vigência início/fim ao trocar de escala sem alterar o histórico.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-escalas-lista',
      popover: {
        title: 'Escalas cadastradas',
        description:
          'Cada item mostra tipo, horários, programação e vigência. Use Desativar para parar de usar nos cálculos sem apagar, ou Excluir para remover.',
        side: 'top',
        align: 'start',
      },
    },
  ];
}

export function runEscalasTour(opts = {}) {
  startModuleTour({ storageKey: STORAGE_TOUR_ESCALAS, steps: steps(), force: opts.force === true });
}
