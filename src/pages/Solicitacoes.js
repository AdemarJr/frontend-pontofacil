// src/pages/Solicitacoes.js
import { useEffect, useState } from 'react';
import Layout from '../components/dashboard/Layout';
import { relatorioService } from '../services/api';
import { format } from 'date-fns';

const TIPOS_LABEL = { ENTRADA: 'Entrada', SAIDA_ALMOCO: 'Saída Almoço', RETORNO_ALMOCO: 'Retorno', SAIDA: 'Saída' };

export default function Solicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await relatorioService.solicitacoesAjuste({ status: 'PENDENTE', limite: 100 });
      setSolicitacoes(Array.isArray(data?.solicitacoes) ? data.solicitacoes : []);
    } catch {
      setSolicitacoes([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function decidir(sol, acao) {
    if (!sol?.id) return;
    if (acao === 'REJEITAR') {
      const resp = window.prompt('Motivo da rejeição (opcional):') || '';
      try {
        await relatorioService.decidirSolicitacaoAjuste(sol.id, { acao: 'REJEITAR', respostaAdmin: resp });
        await carregar();
      } catch (e) {
        alert(e?.response?.data?.error || e?.message || 'Não foi possível rejeitar.');
      }
      return;
    }

    const sugestao = sol.dataHoraSugerida ? format(new Date(sol.dataHoraSugerida), "yyyy-MM-dd'T'HH:mm") : '';
    const dh = window.prompt(
      `Aprovar e inserir a batida?\n\nColaborador: ${sol.usuario?.nome}\nDia: ${sol.dia}\nTipo: ${TIPOS_LABEL[sol.tipo] || sol.tipo}\n\nInforme a data/hora (YYYY-MM-DDTHH:mm):`,
      sugestao || `${sol.dia}T08:00`
    );
    if (!dh) return;
    try {
      await relatorioService.decidirSolicitacaoAjuste(sol.id, { acao: 'APROVAR', dataHoraEfetiva: dh });
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível aprovar.');
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Solicitações</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: 14, marginTop: 4 }}>
            Aprovações e recusas de justificativas enviadas pelos colaboradores.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={carregar} disabled={carregando}>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      <div className="card">
        {solicitacoes.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--cinza-400)', margin: 0 }}>
            Nenhuma solicitação pendente.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {solicitacoes.map((s) => (
              <div
                key={s.id}
                style={{
                  border: '1px solid var(--cinza-100)',
                  borderRadius: 12,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 200px', minWidth: 0, maxWidth: '100%' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, overflowWrap: 'anywhere' }}>
                    {s.usuario?.nome} — {s.dia} — {TIPOS_LABEL[s.tipo] || s.tipo}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 6, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                    {s.justificativa}
                  </div>
                  {s.dataHoraSugerida ? (
                    <div style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 6 }}>
                      Sugestão: {format(new Date(s.dataHoraSugerida), 'dd/MM/yyyy HH:mm')}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => decidir(s, 'REJEITAR')}>
                    Negar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => decidir(s, 'APROVAR')}>
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

