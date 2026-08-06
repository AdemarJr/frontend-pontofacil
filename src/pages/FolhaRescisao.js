import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/dashboard/Layout';
import { folhaService, usuarioService } from '../services/api';

const TIPOS = [
  { value: 'SEM_JUSTA_CAUSA', label: 'Sem justa causa' },
  { value: 'PEDIDO_DEMISSAO', label: 'Pedido de demissão' },
  { value: 'ACORDO', label: 'Acordo (art. 484-A)' },
  { value: 'JUSTA_CAUSA', label: 'Justa causa' },
];

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FolhaRescisao() {
  const [colaboradores, setColaboradores] = useState([]);
  const [rescisoes, setRescisoes] = useState([]);
  const [form, setForm] = useState({
    usuarioId: '',
    tipo: 'SEM_JUSTA_CAUSA',
    dataDesligamento: new Date().toISOString().slice(0, 10),
    avisoPrevioIndenizado: false,
    diasAvisoPrevio: 30,
    observacoes: '',
  });
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    usuarioService.listar().then(({ data }) => {
      setColaboradores((data || []).filter((u) => u.role === 'COLABORADOR' && u.tipoContrato === 'CLT' && u.ativo));
    });
    folhaService.listarRescisoes().then(({ data }) => setRescisoes(data || []));
  }, []);

  async function calcular(e) {
    e.preventDefault();
    if (!form.usuarioId) return alert('Selecione o colaborador');
    setCarregando(true);
    try {
      const { data } = await folhaService.calcularRescisao(form);
      setResultado(data);
      const { data: lista } = await folhaService.listarRescisoes();
      setRescisoes(lista || []);
      alert('Rescisão calculada.');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Layout>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Rescisão</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 13, marginBottom: 16 }}>
          Demonstrativo simplificado: saldo salário, 13º prop., férias + 1/3, aviso prévio e multa FGTS estimada.{' '}
          <Link to="/folha/processar">Folha mensal</Link>
        </p>

        <form className="card" onSubmit={calcular} style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <label>
              Colaborador CLT
              <select
                className="input"
                value={form.usuarioId}
                onChange={(e) => setForm((f) => ({ ...f, usuarioId: e.target.value }))}
                required
              >
                <option value="">Selecione…</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select className="input" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label>
              Data desligamento
              <input
                className="input"
                type="date"
                value={form.dataDesligamento}
                onChange={(e) => setForm((f) => ({ ...f, dataDesligamento: e.target.value }))}
                required
              />
            </label>
            <label>
              Dias aviso prévio
              <input
                className="input"
                type="number"
                min={0}
                value={form.diasAvisoPrevio}
                onChange={(e) => setForm((f) => ({ ...f, diasAvisoPrevio: e.target.value }))}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
              <input
                type="checkbox"
                checked={form.avisoPrevioIndenizado}
                onChange={(e) => setForm((f) => ({ ...f, avisoPrevioIndenizado: e.target.checked }))}
              />
              Aviso prévio indenizado
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Observações
              <textarea
                className="input"
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={carregando} style={{ marginTop: 12 }}>
            {carregando ? 'Calculando…' : 'Calcular rescisão'}
          </button>
        </form>

        {resultado?.rescisao && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{resultado.rescisao.usuario?.nome}</h2>
            <p>Líquido: <strong>{fmtBRL(resultado.rescisao.liquido)}</strong></p>
            {resultado.rescisao.multaFgtsEstimada != null && (
              <p style={{ fontSize: 13 }}>Multa FGTS estimada: {fmtBRL(resultado.rescisao.multaFgtsEstimada)}</p>
            )}
            {resultado.detalhes && (
              <p style={{ fontSize: 12, color: 'var(--cinza-400)' }}>
                Saldo salário: {resultado.detalhes.diasSaldoSalario}d · 13º: {resultado.detalhes.mesesDecimo}/12 · Férias: {resultado.detalhes.diasFerias}d
              </p>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => folhaService.downloadRescisaoPdf(resultado.rescisao.id)}>
              Baixar PDF
            </button>
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Histórico</h2>
          {rescisoes.length === 0 ? (
            <p style={{ color: 'var(--cinza-400)', fontSize: 13 }}>Nenhuma rescisão registrada.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Tipo</th>
                  <th>Desligamento</th>
                  <th>Líquido</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rescisoes.map((r) => (
                  <tr key={r.id}>
                    <td>{r.usuario?.nome}</td>
                    <td>{r.tipo.replace(/_/g, ' ')}</td>
                    <td>{new Date(r.dataDesligamento).toLocaleDateString('pt-BR')}</td>
                    <td>{fmtBRL(r.liquido)}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => folhaService.downloadRescisaoPdf(r.id)}>
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
