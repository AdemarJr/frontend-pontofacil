import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { feriasService, usuarioService } from '../services/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function isoHoje() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TABS = [
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'APROVADA', label: 'Aprovadas' },
  { value: 'REJEITADA', label: 'Recusadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: '', label: 'Todas' },
];

function badgeStatus(s) {
  if (s === 'PENDENTE') return <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Pendente</span>;
  if (s === 'APROVADA') return <span className="badge badge-verde">Aprovada</span>;
  if (s === 'REJEITADA') return <span className="badge badge-vermelho">Recusada</span>;
  return <span className="badge badge-cinza">Cancelada</span>;
}

export default function Ferias() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tab, setTab] = useState('PENDENTE');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalLancar, setModalLancar] = useState(false);
  const [form, setForm] = useState({ usuarioId: '', dataInicio: isoHoje(), dataFim: isoHoje(), observacao: '' });
  const [salvando, setSalvando] = useState(false);

  const [decidirModal, setDecidirModal] = useState(null);
  const [decidirForm, setDecidirForm] = useState({ resposta: '' });
  const [decidindo, setDecidindo] = useState(false);

  async function carregarUsuarios() {
    try {
      const { data } = await usuarioService.listar();
      setUsuarios((Array.isArray(data) ? data : []).filter((u) => u.role === 'COLABORADOR'));
    } catch {
      setUsuarios([]);
    }
  }

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const { data } = await feriasService.listar({
        ...(usuarioId ? { usuarioId } : {}),
      });
      setLista(Array.isArray(data) ? data : []);
    } catch (e) {
      setLista([]);
      setErro(e.response?.data?.error || e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    setPage(1);
    carregar();
  }, [usuarioId]);

  const contagem = useMemo(() => {
    const c = { PENDENTE: 0, APROVADA: 0, REJEITADA: 0, CANCELADA: 0 };
    for (const f of lista) {
      if (c[f.status] != null) c[f.status] += 1;
    }
    return c;
  }, [lista]);

  const filtrados = useMemo(() => {
    if (!tab) return lista;
    return lista.filter((f) => f.status === tab);
  }, [lista, tab]);

  const pendentesLista = useMemo(() => lista.filter((f) => f.status === 'PENDENTE'), [lista]);

  const { pageItems, total, safePage } = useMemo(() => slicePaged(filtrados, page, pageSize), [filtrados, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  function abrirLancar() {
    setForm({ usuarioId: usuarioId || '', dataInicio: isoHoje(), dataFim: isoHoje(), observacao: '' });
    setModalLancar(true);
    setErro('');
  }

  async function salvarLancamento() {
    setSalvando(true);
    setErro('');
    try {
      await feriasService.criar({
        usuarioId: form.usuarioId,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        observacao: form.observacao || undefined,
        status: 'APROVADA',
      });
      setModalLancar(false);
      await carregar();
      setTab('APROVADA');
    } catch (e) {
      setErro(e.response?.data?.error || e.message || 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function cancelarAprovada(item) {
    if (!window.confirm(`Cancelar férias aprovadas de ${item.usuario?.nome || 'colaborador'} (${item.dataInicio} → ${item.dataFim})?`)) return;
    try {
      await feriasService.atualizar(item.id, { status: 'CANCELADA' });
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Falha ao cancelar');
    }
  }

  async function confirmarDecisao() {
    if (!decidirModal) return;
    setDecidindo(true);
    try {
      await feriasService.decidir(decidirModal.id, {
        acao: decidirModal.acao,
        respostaAdmin: decidirForm.resposta.trim() || undefined,
      });
      setDecidirModal(null);
      setDecidirForm({ resposta: '' });
      await carregar();
      window.dispatchEvent(new Event('pf:ferias-pendentes'));
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Falha ao registrar decisão');
    } finally {
      setDecidindo(false);
    }
  }

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Férias</h1>
            <p style={{ color: 'var(--cinza-400)', fontSize: 14, marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>
              Fluxo padrão de mercado: o colaborador solicita em <strong>Meu ponto → Minhas férias</strong>; você aprova ou recusa aqui. Lançamentos diretos (já aprovados) continuam disponíveis para o RH.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={abrirLancar}>
            + Lançar férias (aprovado)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--cinza-400)', marginBottom: 6 }}>COLABORADOR</label>
            <select className="input" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {TABS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => setTab(t.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: tab === t.value ? '2px solid var(--verde)' : '1px solid var(--cinza-200)',
                background: tab === t.value ? 'var(--verde-claro)' : 'white',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--cinza-900)',
              }}
            >
              {t.label}
              {t.value === 'PENDENTE' && contagem.PENDENTE > 0 ? ` (${contagem.PENDENTE})` : ''}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '12px 16px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      {!carregando && pendentesLista.length > 0 && tab === 'PENDENTE' && (
        <div className="card" style={{ marginBottom: 16, padding: 18, border: '2px solid rgba(251,191,36,0.35)', background: 'linear-gradient(135deg, rgba(254,243,199,0.35), rgba(255,255,255,0.9))' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>Fila de aprovação</h2>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--cinza-600)' }}>Revise o período e o comentário do colaborador. Aprovar aplica as férias no espelho; recusar notifica o motivo (opcional).</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendentesLista.slice(0, 5).map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: 14,
                  borderRadius: 12,
                  background: 'white',
                  border: '1px solid var(--cinza-200)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{f.usuario?.nome || 'Colaborador'}</div>
                  <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{f.usuario?.email}</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', marginTop: 6 }}>
                    {f.dataInicio} → {f.dataFim}
                  </div>
                  {f.observacao ? <div style={{ fontSize: 13, marginTop: 8, color: 'var(--cinza-700)' }}>“{f.observacao}”</div> : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => { setDecidirModal({ id: f.id, acao: 'APROVAR', titulo: f.usuario?.nome }); setDecidirForm({ resposta: '' }); }}>
                    Aprovar
                  </button>
                  <button
                    type="button"
                    style={{ fontSize: 13, padding: '8px 14px', background: 'white', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => { setDecidirModal({ id: f.id, acao: 'REJEITAR', titulo: f.usuario?.nome }); setDecidirForm({ resposta: '' }); }}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
            {pendentesLista.length > 5 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--cinza-400)' }}>Há mais pendentes na tabela abaixo.</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: 'auto', maxWidth: '100%' }}>
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" />
          </div>
        ) : filtrados.length === 0 ? (
          <p style={{ padding: 28, textAlign: 'center', color: 'var(--cinza-400)' }}>Nenhum registro neste filtro.</p>
        ) : (
          <table className="tabela" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Período</th>
                <th>Observação</th>
                <th>Status</th>
                <th>Retorno RH</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{f.usuario?.nome || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{f.usuario?.email || ''}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {f.dataInicio} → {f.dataFim}
                    <div style={{ fontSize: 11, color: 'var(--cinza-400)', marginTop: 4 }}>
                      Inclui {format(parseISO(f.dataInicio + 'T12:00:00'), 'dd/MM', { locale: ptBR })} a{' '}
                      {format(parseISO(f.dataFim + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, maxWidth: 220 }}>{f.observacao || '—'}</td>
                  <td>{badgeStatus(f.status)}</td>
                  <td style={{ fontSize: 12, color: 'var(--cinza-600)' }}>{f.respostaAdmin || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {f.status === 'PENDENTE' && (
                        <>
                          <button type="button" className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { setDecidirModal({ id: f.id, acao: 'APROVAR', titulo: f.usuario?.nome }); setDecidirForm({ resposta: '' }); }}>
                            Aprovar
                          </button>
                          <button
                            type="button"
                            style={{ fontSize: 12, padding: '6px 12px', background: 'transparent', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 8, cursor: 'pointer' }}
                            onClick={() => { setDecidirModal({ id: f.id, acao: 'REJEITAR', titulo: f.usuario?.nome }); setDecidirForm({ resposta: '' }); }}
                          >
                            Recusar
                          </button>
                        </>
                      )}
                      {f.status === 'APROVADA' && (
                        <button
                          type="button"
                          style={{ fontSize: 12, padding: '6px 12px', background: 'transparent', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 8, cursor: 'pointer' }}
                          onClick={() => cancelarAprovada(f)}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!carregando && total > 0 && (
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--cinza-100)' }}>
            <ListPagination
              page={safePage}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {modalLancar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Lançar férias (já aprovadas)</h3>
            <p style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: -8, marginBottom: 16 }}>Use para períodos acordados fora do fluxo de solicitação (ex.: desligamento, acordo coletivo).</p>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--cinza-700)', marginBottom: 6 }}>Colaborador</label>
                <select className="input" value={form.usuarioId} onChange={(e) => setForm((p) => ({ ...p, usuarioId: e.target.value }))}>
                  <option value="">Selecione…</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--cinza-700)', marginBottom: 6 }}>Início</label>
                  <input className="input" type="date" value={form.dataInicio} onChange={(e) => setForm((p) => ({ ...p, dataInicio: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--cinza-700)', marginBottom: 6 }}>Fim</label>
                  <input className="input" type="date" value={form.dataFim} onChange={(e) => setForm((p) => ({ ...p, dataFim: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--cinza-700)', marginBottom: 6 }}>Observação (opcional)</label>
                <input className="input" value={form.observacao} onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))} placeholder="Ex.: homologado em ata" />
              </div>
            </div>

            {erro && (
              <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 14 }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setModalLancar(false)} disabled={salvando}>
                Fechar
              </button>
              <button type="button" className="btn btn-primary btn-full" onClick={salvarLancamento} disabled={salvando || !form.usuarioId}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {decidirModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1150, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>
              {decidirModal.acao === 'APROVAR' ? 'Aprovar férias' : 'Recusar solicitação'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--cinza-600)', marginBottom: 16 }}>Colaborador: <strong>{decidirModal.titulo}</strong></p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--cinza-700)', marginBottom: 6 }}>
              Mensagem para o colaborador (opcional{decidirModal.acao === 'REJEITAR' ? '; recomendado em recusa' : ''})
            </label>
            <textarea className="input" rows={3} value={decidirForm.resposta} onChange={(e) => setDecidirForm({ resposta: e.target.value })} placeholder="Ex.: período ajustado com o gestor / motivo da recusa" style={{ width: '100%' }} />

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setDecidirModal(null)} disabled={decidindo}>
                Voltar
              </button>
              <button
                type="button"
                className="btn btn-full"
                style={decidirModal.acao === 'REJEITAR' ? { background: 'var(--vermelho)', color: '#fff', border: 'none' } : {}}
                onClick={confirmarDecisao}
                disabled={decidindo}
              >
                {decidindo ? '…' : decidirModal.acao === 'APROVAR' ? 'Confirmar aprovação' : 'Confirmar recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
