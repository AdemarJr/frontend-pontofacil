import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/dashboard/Layout';
import { folhaService } from '../services/api';

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FolhaProcessar() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [run, setRun] = useState(null);
  const [pendencias, setPendencias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [fechando, setFechando] = useState(false);

  async function calcular() {
    setCarregando(true);
    try {
      const { data } = await folhaService.calcular({ mes, ano });
      setRun(data.run);
      setPendencias(data.pendencias || []);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setCarregando(false);
    }
  }

  async function fechar() {
    if (!run?.id) return;
    if (pendencias.length && !window.confirm('Há pendências. Deseja continuar mesmo assim?')) return;
    setFechando(true);
    try {
      const { data } = await folhaService.fechar(run.id);
      setRun(data);
      alert('Folha fechada. PDFs gerados.');
    } catch (e) {
      alert(e.response?.data?.error || (e.response?.data?.pendencias ? 'Pendências impedem o fechamento' : e.message));
    } finally {
      setFechando(false);
    }
  }

  async function exportCnab() {
    if (!run?.id) return;
    try {
      await folhaService.downloadCnab(run.id);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  }

  return (
    <Layout>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Processar Folha</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 13, marginBottom: 16 }}>
          Calcula proventos e descontos a partir do espelho de ponto.{' '}
          <Link to="/folha/config">Configuração</Link>
        </p>

        <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 20 }}>
          <label>
            Mês
            <select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
            </select>
          </label>
          <label>
            Ano
            <input className="input" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: 100 }} />
          </label>
          <button type="button" className="btn btn-primary" onClick={calcular} disabled={carregando}>
            {carregando ? 'Calculando…' : 'Calcular folha'}
          </button>
          {run?.status === 'CALCULADA' && (
            <button type="button" className="btn btn-secondary" onClick={fechar} disabled={fechando}>
              {fechando ? 'Fechando…' : 'Fechar folha'}
            </button>
          )}
          {run?.status === 'FECHADA' && (
            <button type="button" className="btn btn-secondary" onClick={exportCnab}>Exportar CNAB</button>
          )}
        </div>

        {pendencias.length > 0 && (
          <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--amarelo)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Pendências ({pendencias.length})</h3>
            <ul style={{ fontSize: 13, margin: 0, paddingLeft: 20 }}>
              {pendencias.map((p, i) => (
                <li key={i}>{p.nome}: {p.tipo}{p.mensagem ? ` — ${p.mensagem}` : ''}</li>
              ))}
            </ul>
          </div>
        )}

        {run?.holerites?.length > 0 && (
          <div className="card table-scroll" style={{ padding: 0 }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Líquido</th>
                  <th>Status folha</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {run.holerites.map((h) => (
                  <tr key={h.id}>
                    <td>{h.usuario?.nome}</td>
                    <td>{fmtBRL(h.liquido)}</td>
                    <td><span className="badge badge-cinza">{run.status}</span></td>
                    <td>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => folhaService.downloadHoleritePdf(h.id)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
