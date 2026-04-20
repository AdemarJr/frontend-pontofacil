import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { feriasService, usuarioService } from '../services/api';

function isoHoje() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Ferias() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [status, setStatus] = useState('APROVADA');
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ usuarioId: '', dataInicio: isoHoje(), dataFim: isoHoje(), observacao: '' });
  const [salvando, setSalvando] = useState(false);

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
        ...(status ? { status } : {}),
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
    carregar();
  }, []);

  useEffect(() => {
    setPage(1);
    carregar();
  }, [usuarioId, status]);

  const { pageItems, total, safePage } = useMemo(() => slicePaged(lista, page, pageSize), [lista, page, pageSize]);

  function abrirCriar() {
    setForm({ usuarioId: usuarioId || '', dataInicio: isoHoje(), dataFim: isoHoje(), observacao: '' });
    setModal(true);
    setErro('');
  }

  async function salvar() {
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
      setModal(false);
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.error || e.message || 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar(item) {
    if (!window.confirm(`Cancelar férias de ${item.usuario?.nome || 'colaborador'} (${item.dataInicio} → ${item.dataFim})?`)) return;
    try {
      await feriasService.atualizar(item.id, { status: 'CANCELADA' });
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Falha ao cancelar');
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Férias</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: 14, marginTop: 2 }}>
            Períodos aprovados suspendem expediente do colaborador no espelho e no resumo do dia.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={abrirCriar}>
          + Lançar férias
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220, flex: 1 }}>
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
          <div style={{ minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--cinza-400)', marginBottom: 6 }}>STATUS</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="APROVADA">Aprovadas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="">Todas</option>
            </select>
          </div>
        </div>
      </div>

      {erro && (
        <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '12px 16px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" />
          </div>
        ) : lista.length === 0 ? (
          <p style={{ padding: 28, textAlign: 'center', color: 'var(--cinza-400)' }}>Nenhum período cadastrado.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Período</th>
                <th>Status</th>
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
                  <td style={{ fontFamily: 'monospace' }}>
                    {f.dataInicio} → {f.dataFim}
                  </td>
                  <td>{f.status === 'APROVADA' ? <span className="badge badge-verde">Aprovada</span> : <span className="badge badge-cinza">Cancelada</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {f.status === 'APROVADA' && (
                        <button
                          type="button"
                          style={{ fontSize: 12, padding: '6px 12px', background: 'transparent', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 8, cursor: 'pointer' }}
                          onClick={() => cancelar(f)}
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

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Lançar férias</h3>

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
                <input className="input" value={form.observacao} onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))} placeholder="Ex.: férias coletivas" />
              </div>
            </div>

            {erro && (
              <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 14 }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setModal(false)} disabled={salvando}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-full" onClick={salvar} disabled={salvando || !form.usuarioId}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

