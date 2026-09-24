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
    text: 'Colaborador cadastrado. O convite por e-mail não saiu agora; o PIN do totem já vale. Você pode reenviar o convite depois.',
  },
  smtp_nao_configurado: {
    type: 'warning',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado. O convite por e-mail não saiu agora; o PIN do totem já vale. Você pode reenviar o convite depois.',
  },
  smtp_sem_senha: {
    type: 'warning',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado. O convite por e-mail não saiu agora; o PIN do totem já vale. Você pode reenviar o convite depois.',
  },
  envio_em_segundo_plano: {
    type: 'info',
    title: 'Cadastro concluído',
    text: 'Colaborador cadastrado. O e-mail de convite está a caminho (verifique o spam).',
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
