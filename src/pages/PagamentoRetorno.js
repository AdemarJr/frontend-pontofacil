// Retorno do checkout InfinitePay (redirect_url)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pagamentoService } from '../services/api';

export default function PagamentoRetorno() {
  const [params] = useSearchParams();
  const [estado, setEstado] = useState({ carregando: true, erro: '', dados: null });

  useEffect(() => {
    async function confirmar() {
      const orderNsu = params.get('order_nsu') || params.get('orderNsu');
      if (!orderNsu) {
        setEstado({ carregando: false, erro: 'Parâmetro order_nsu não encontrado na URL.', dados: null });
        return;
      }
      try {
        const { data } = await pagamentoService.confirmar({
          order_nsu: orderNsu,
          transaction_nsu: params.get('transaction_nsu') || params.get('transactionNsu') || undefined,
          slug: params.get('slug') || undefined,
        });
        setEstado({ carregando: false, erro: '', dados: data });
      } catch (e) {
        setEstado({
          carregando: false,
          erro: e.response?.data?.error || 'Não foi possível confirmar o pagamento.',
          dados: null,
        });
      }
    }
    confirmar();
  }, [params]);

  const pago = estado.dados?.status === 'PAGO';

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--cinza-50)' }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', padding: 32, textAlign: 'center' }}>
        {estado.carregando && (
          <>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p>Confirmando pagamento…</p>
          </>
        )}
        {!estado.carregando && estado.erro && (
          <>
            <h1 style={{ fontSize: 22, color: 'var(--vermelho)' }}>Pagamento</h1>
            <p style={{ color: 'var(--cinza-600)', marginTop: 12 }}>{estado.erro}</p>
          </>
        )}
        {!estado.carregando && !estado.erro && pago && (
          <>
            <h1 style={{ fontSize: 22, color: 'var(--verde)' }}>Pagamento confirmado</h1>
            <p style={{ color: 'var(--cinza-600)', marginTop: 12 }}>
              Plano <strong>{estado.dados?.pagamento?.planoComercial?.nome}</strong>
              {estado.dados?.tenant?.nomeFantasia ? (
                <> vinculado à empresa <strong>{estado.dados.tenant.nomeFantasia}</strong>.</>
              ) : (
                <> ativado com sucesso.</>
              )}
            </p>
          </>
        )}
        {!estado.carregando && !estado.erro && !pago && (
          <>
            <h1 style={{ fontSize: 22 }}>Pagamento pendente</h1>
            <p style={{ color: 'var(--cinza-600)', marginTop: 12 }}>
              Ainda não identificamos a confirmação. Se já pagou, aguarde alguns instantes ou entre em contato com o suporte.
            </p>
          </>
        )}
        <div style={{ marginTop: 24 }}>
          <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Ir para o login</Link>
        </div>
      </div>
    </div>
  );
}
