import { startModuleTour } from './tourHelpers';

/** v2: passos explícitos para cadastrar, PIN, editar, desativar e excluir */
export const STORAGE_TOUR_COLABORADORES = 'pontofacil_tour_colaboradores_v2';

function steps() {
  return [
    {
      element: '#tour-colab-header',
      popover: {
        title: 'Colaboradores',
        description:
          'Central de cadastro da equipe: totem (PIN), app Meu ponto (e-mail/senha), cargos e vínculo a local, se a empresa usar várias filiais na cerca virtual.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#tour-colab-btn-novo',
      popover: {
        title: 'Cadastrar novo colaborador',
        description:
          'Clique em "+ Novo Colaborador" para abrir o formulário: nome, e-mail, PIN numérico para o totem, cargo, departamento, função (Colaborador ou Admin) e, se existirem locais cadastrados em Configurações, restrição de local. Você pode enviar convite por e-mail para o colaborador definir a senha do app.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-colab-busca',
      popover: {
        title: 'Busca',
        description: 'Filtre a lista por nome, e-mail ou cargo para achar alguém rapidamente.',
        side: 'bottom',
      },
    },
    {
      element: '#tour-colab-tabela',
      popover: {
        title: 'Lista da equipe',
        description:
          'Aqui aparecem todos os usuários da empresa com função (Colaborador ou Admin), status Ativo/Inativo e dados cadastrais.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#tour-colab-th-pin',
      popover: {
        title: 'PIN do totem',
        description:
          'O PIN é o código numérico no tablet na entrada. Por segurança aparece oculto: use mostrar/ocultar para revelar o último PIN conhecido ou "Reset PIN" para gerar um novo (o anterior deixa de valer).',
        side: 'bottom',
      },
    },
    {
      element: '#tour-colab-th-acoes',
      popover: {
        title: 'Editar, desativar ou excluir',
        description:
          'Editar — altera dados, PIN, cargo, local e permissões.\n\nDesativar — suspende o acesso (app e totem) sem apagar histórico; o status fica Inativo. Use Ativar para liberar de novo.\n\nExcluir — remove o cadastro e o histórico de forma definitiva (exige digitar o nome para confirmar). Prefira Desativar se precisar dos dados depois. Não é possível excluir o próprio usuário logado.',
        side: 'bottom',
        align: 'end',
      },
    },
  ];
}

export function runColaboradoresTour(opts = {}) {
  startModuleTour({ storageKey: STORAGE_TOUR_COLABORADORES, steps: steps(), force: opts.force === true });
}
