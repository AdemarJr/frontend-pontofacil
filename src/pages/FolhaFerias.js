import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/dashboard/Layout';
import { folhaService, usuarioService, feriasService } from '../services/api';

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FolhaFerias() {
  const [colaboradores, setColaboradores] = useState([]);
  const [feriasAprovadas, setFeriasAprovadas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [form, setForm] = useState({
    usuarioId: '',
    feriasId: '',
    diasFerias: 30,
    diasAbono: 0,
    adiantamentoUmTerco: true,
  });
  const [carregando, setCarregando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    usuarioService.listar().then(({ data }) => {
      setColaboradores((data || []).filter((u) => u.role === 'COLABORADOR' && u.tipoContrato === 'CLT' && u.ativo));
    });
    folhaService.listarFeriasPagamentos().then(({ data }) => setPagamentos(data || []));
    feriasService.listar({ status: 'APROVADA' }).then(({ data }) => setFeriasAprovadas(data || []));
  }, []);

  async function carregarSaldo(usuarioId) {
    if (!usuarioId) return;
    try {
      const { data } = await folhaService.saldoFerias(usuarioId);
      setForm((f) => ({ ...f, saldoInfo: data }));
    } catch {
      setForm((f) => ({ ...f, saldoInfo: null }));
    }
  }

  async function calcular(e) {
    e.preventDefault();
    if (!form.usuarioId) return alert('Selecione o colaborador');
    setCarregando(true);
    try {
      const { data } = await folhaService.calcularFerias({
        usuarioId: form.usuarioId,
        feriasId: form.feriasId || undefined,
        diasFerias: form.feriasId ? undefined : Number(form.diasFerias) || 0,
        diasAbono: Number(form.diasAbono) || 0,
        adiantamentoUmTerco: form.adiantamentoUmTerco,
      });
      setDetalhe(data.pagamento);
      const { data: lista } = await folhaService.listarFeriasPagamentos();
      setPagamentos(lista || []);
      alert('Pagamento de férias calculado.');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setCarregando(false);
    }
  }

  const feriasDoColab = feriasAprovadas.filter((f) => f.usuarioId === form.usuarioId);

  return (
    <Layout>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Pagamento de Férias</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 13, marginBottom: 16 }}>
          Calcula férias + 1/3 constitucional, abono pecuniário e adiantamento de 1/3.{' '}
          <Link to="/folha/processar">Folha mensal</Link>
        </p>

        <form className="card" onSubmit={calcular} style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <label>
              Colaborador CLT
              <select
                value={form.usuarioId}
                onChange={(e) => {
                  const id = e.target.value;
                  setForm((f) => ({ ...f, usuarioId: id, feriasId: '' }));
                  carregarSaldo(id);
                }}
                required
              >
                <option value="">Selecione…</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Férias aprovadas (opcional)
              <select
                value={form.feriasId}
                onChange={(e) => setForm((f) => ({ ...f, feriasId: e.target.value }))}
              >
                <option value="">Informar dias manualmente depois</option>
                {feriasDoColab.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.dataInicio} → {f.dataFim}
                  </option>
                ))}
              </select>
            </label>
            {!form.feriasId && (
              <label>
                Dias de férias
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={form.diasFerias}
                  onChange={(e) => setForm((f) => ({ ...f, diasFerias: e.target.value }))}
                  required
                />
              </label>
            )}
            <label>
              Dias de abono (máx. 10)
              <input
                type="number"
                min={0}
                max={10}
                value={form.diasAbono}
                onChange={(e) => setForm((f) => ({ ...f, diasAbono: e.target.value }))}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
              <input
                type="checkbox"
                checked={form.adiantamentoUmTerco}
                onChange={(e) => setForm((f) => ({ ...f, adiantamentoUmTerco: e.target.checked }))}
              />
              Descontar adiantamento de 1/3
            </label>
          </div>
          {form.saldoInfo && (
            <p style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 8 }}>
              Saldo férias: {form.saldoInfo.saldo} dias (direito {form.saldoInfo.direitoTotal}, usados {form.saldoInfo.diasUsados})
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={carregando} style={{ marginTop: 12 }}>
            {carregando ? 'Calculando…' : 'Calcular pagamento'}
          </button>
        </form>

        {detalhe && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Último cálculo — {detalhe.usuario?.nome}</h2>
            <p>Líquido: <strong>{fmtBRL(detalhe.liquido)}</strong></p>
            <button type="button" className="btn btn-secondary" onClick={() => folhaService.downloadFeriasPdf(detalhe.id)}>
              Baixar PDF
            </button>
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Histórico</h2>
          {pagamentos.length === 0 ? (
            <p style={{ color: 'var(--cinza-400)', fontSize: 13 }}>Nenhum pagamento registrado.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Período</th>
                  <th>Ref.</th>
                  <th>Líquido</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.usuario?.nome}</td>
                    <td>{p.dataInicio} → {p.dataFim}</td>
                    <td>{String(p.mesReferencia).padStart(2, '0')}/{p.anoReferencia}</td>
                    <td>{fmtBRL(p.liquido)}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => folhaService.downloadFeriasPdf(p.id)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
