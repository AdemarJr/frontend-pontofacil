import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { feriadoService } from '../services/api';

function hojeIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Feriados() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modal, setModal] = useState(null); // null | 'criar' | item
  const [form, setForm] = useState({ data: hojeIso(), nome: '', suspendeExpediente: true });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const { data } = await feriadoService.listar();
      setLista(Array.isArray(data) ? data : []);
    } catch (e) {
      setLista([]);
      setErro(e.response?.data?.error || e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [busca]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((f) => (f.nome || '').toLowerCase().includes(q) || String(f.data || '').includes(q));
  }, [lista, busca]);

  const { pageItems, total, safePage } = slicePaged(filtrados, page, pageSize);

  function abrirCriar() {
    setForm({ data: hojeIso(), nome: '', suspendeExpediente: true });
    setModal('criar');
    setErro('');
  }

  function abrirEditar(item) {
    setForm({
      data: item.data,
      nome: item.nome || '',
      suspendeExpediente: item.suspendeExpediente !== false,
    });
    setModal(item);
    setErro('');
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      const payload = {
        data: form.data,
        nome: form.nome,
        suspendeExpediente: Boolean(form.suspendeExpediente),
      };
      if (modal === 'criar') await feriadoService.criar(payload);
      else await feriadoService.atualizar(modal.id, payload);
      setModal(null);
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.error || e.message || 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir o feriado "${item.nome}" (${item.data})?`)) return;
    try {
      await feriadoService.remover(item.id);
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Falha ao excluir');
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Feriados</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: 14, marginTop: 2 }}>
            Dias cadastrados aqui podem suspender o expediente e não contam como falta/esperado.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={abrirCriar}>
          + Novo feriado
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input className="input" placeholder="🔍 Buscar por nome ou data (YYYY-MM-DD)" value={busca} onChange={(e) => setBusca(e.target.value)} />
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
        ) : filtrados.length === 0 ? (
          <p style={{ padding: 28, textAlign: 'center', color: 'var(--cinza-400)' }}>Nenhum feriado cadastrado.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>Expediente</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontFamily: 'monospace' }}>{f.data}</td>
                  <td style={{ fontWeight: 600 }}>{f.nome}</td>
                  <td>
                    {f.suspendeExpediente !== false ? (
                      <span className="badge badge-vermelho">Suspenso</span>
                    ) : (
                      <span className="badge badge-cinza">Normal</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => abrirEditar(f)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        style={{ fontSize: 12, padding: '6px 12px', background: 'transparent', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 8, cursor: 'pointer' }}
                        onClick={() => excluir(f)}
                      >
                        Excluir
                      </button>
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
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{modal === 'criar' ? 'Novo feriado' : 'Editar feriado'}</h3>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--cinza-700)', marginBottom: 6 }}>Data</label>
                <input className="input" type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--cinza-700)', marginBottom: 6 }}>Nome</label>
                <input className="input" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex.: Tiradentes" />
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--cinza-700)' }}>
                <input type="checkbox" checked={form.suspendeExpediente} onChange={(e) => setForm((p) => ({ ...p, suspendeExpediente: e.target.checked }))} />
                Suspende expediente (não exige batida / esperado = 0)
              </label>
            </div>

            {erro && (
              <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 14 }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setModal(null)} disabled={salvando}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-full" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

