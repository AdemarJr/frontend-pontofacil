/** Textos amigáveis para status do convite por e-mail após cadastro. */

const EMAIL_MSGS = {
  enviado: {
    type: 'success',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado. E-mail de convite enviado com sucesso.',
  },
  falha_envio: {
    type: 'warning',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado, mas o e-mail de convite não foi enviado. O PIN do totem já vale; você pode reenviar o convite depois.',
  },
  smtp_nao_configurado: {
    type: 'warning',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado, mas o e-mail não foi enviado (envio de e-mail não configurado no servidor). Use “Reenviar convite” quando o SMTP estiver ok.',
  },
  smtp_sem_senha: {
    type: 'warning',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado, mas o e-mail não foi enviado (senha SMTP ausente no servidor).',
  },
  envio_em_segundo_plano: {
    type: 'info',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado. O e-mail de convite está sendo enviado; em instantes deve chegar (verifique o spam).',
  },
  desativado_pelo_admin: {
    type: 'success',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado sem envio de e-mail (conforme solicitado).',
  },
};

export function mensagemAposCriarColaborador(data) {
  if (data?.conviteEmailEnviado) {
    return EMAIL_MSGS.enviado;
  }
  const key = data?.conviteEmailMotivo || 'falha_envio';
  return EMAIL_MSGS[key] || {
    type: 'warning',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado. O e-mail de convite não foi enviado.',
  };
}

export function mensagemLimitePlano(errData) {
  const atual = errData?.atual;
  const max = errData?.maxColaboradores;
  const detalhe =
    atual != null && max != null ? ` Uso atual: ${atual}/${max}.` : '';
  return {
    type: 'error',
    title: 'Limite do plano',
    text:
      errData?.error ||
      `Seu plano chegou ao limite de colaboradores.${detalhe} Fale com o administrador e solicite a mudança de plano.`,
  };
}
