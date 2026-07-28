import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/dashboard/Layout';
import { folhaService } from '../services/api';

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FolhaDecimo() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [parcela, setParcela] = useState(1);
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [erros, setErros] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    folhaService.listarDecimoRuns({ ano }).then(({ data }) => setRuns(data || []));
  }, [ano]);

  async function calcular() {
    setCarregando(true);
    try {
      const { data } = await folhaService.calcularDecimo({ ano, parcela });
      setRun(data.run);
      setErros(data.erros || []);
      const { data: lista } = await folhaService.listarDecimoRuns({ ano });
      setRuns(lista || []);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Layout>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>13º Salário</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 13, marginBottom: 16 }}>
          1ª parcela: 50% sem INSS · 2ª parcela: saldo com INSS/IRRF sobre o 13º integral (simplificado).{' '}
          <Link to="/folha/processar">Folha mensal</Link>
        </p>

        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label>
            Ano
            <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: 100 }} />
          </label>
          <label>
            Parcela
            <select value={parcela} onChange={(e) => setParcela(Number(e.target.value))}>
              <option value={1}>1ª (novembro)</option>
              <option value={2}>2ª (dezembro)</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={calcular} disabled={carregando}>
            {carregando ? 'Calculando…' : 'Calcular 13º'}
          </button>
        </div>

        {erros.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'var(--amarelo-500)' }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Avisos ({erros.length})</p>
            <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
              {erros.map((e) => (
                <li key={e.usuarioId}>{e.nome}: {e.mensagem}</li>
              ))}
            </ul>
          </div>
        )}

        {run?.holerites?.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>
              {ano} — {parcela}ª parcela ({run.holerites.length} colaboradores)
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Avos</th>
                  <th>Líquido</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {run.holerites.map((h) => (
                  <tr key={h.id}>
                    <td>{h.usuario?.nome}</td>
                    <td>{h.mesesTrabalhados}/12</td>
                    <td>{fmtBRL(h.liquido)}</td>
                    <td>
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => folhaService.downloadDecimoPdf(h.id)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Histórico {ano}</h2>
          {runs.length === 0 ? (
            <p style={{ color: 'var(--cinza-400)', fontSize: 13 }}>Nenhum cálculo neste ano.</p>
          ) : (
            <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
              {runs.map((r) => (
                <li key={r.id}>
                  {r.ano} — {r.parcela}ª parcela · {r._count?.holerites ?? 0} holerites · {r.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
