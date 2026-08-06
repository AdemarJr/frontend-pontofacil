import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/dashboard/Layout';
import { folhaService } from '../services/api';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FolhaAdiantamento() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [percent, setPercent] = useState(40);
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [erros, setErros] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    folhaService.getConfig().then(({ data }) => {
      if (data?.adiantamentoPercent != null) setPercent(data.adiantamentoPercent);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    folhaService.listarAdiantamentoRuns({ ano }).then(({ data }) => setRuns(data || []));
  }, [ano]);

  async function calcular() {
    setCarregando(true);
    try {
      const { data } = await folhaService.calcularAdiantamento({ mes, ano, percent });
      setRun(data.run);
      setErros(data.erros || []);
      const { data: lista } = await folhaService.listarAdiantamentoRuns({ ano });
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
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Adiantamento salarial</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 13, marginBottom: 16 }}>
          Pagamento no meio do mês (% do salário base), sem INSS/IRRF no adiantamento.
          O desconto entra na <Link to="/folha/processar">folha mensal</Link> do mesmo mês (se configurado).
        </p>

        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label>
            Mês
            <select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ width: 160 }}>
              {MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>{nome}</option>
              ))}
            </select>
          </label>
          <label>
            Ano
            <input className="input" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: 100 }} />
          </label>
          <label>
            Percentual (%)
            <input
              className="input"
              type="number"
              min={1}
              max={100}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              style={{ width: 100 }}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={calcular} disabled={carregando}>
            {carregando ? 'Calculando…' : 'Calcular adiantamento'}
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
              {MESES[run.mes - 1]}/{run.ano} — {run.percent}% ({run.holerites.length} colaboradores)
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>%</th>
                  <th>Líquido</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {run.holerites.map((h) => (
                  <tr key={h.id}>
                    <td>{h.usuario?.nome}</td>
                    <td>{h.percent}%</td>
                    <td>{fmtBRL(h.liquido)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12 }}
                        onClick={() => folhaService.downloadAdiantamentoPdf(h.id)}
                      >
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
                  {String(r.mes).padStart(2, '0')}/{r.ano} — {r.percent}% · {r._count?.holerites ?? 0} holerites · {r.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
