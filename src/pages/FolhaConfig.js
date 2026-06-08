import { useEffect, useState } from 'react';
import Layout from '../components/dashboard/Layout';
import { folhaService } from '../services/api';

export default function FolhaConfig() {
  const [config, setConfig] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    folhaService.getConfig().then(({ data }) => setConfig(data)).catch((e) => alert(e.response?.data?.error || e.message));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data } = await folhaService.putConfig(config);
      setConfig(data);
      alert('Configuração salva.');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!config) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Configuração da Folha</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 13, marginBottom: 24 }}>
          Parâmetros CLT, banco de horas e dados bancários para CNAB.
        </p>
        <form className="card" onSubmit={salvar}>
          <div style={{ display: 'grid', gap: 16 }}>
            <label>
              Modo banco de horas
              <select className="input" value={config.modoBancoHoras} onChange={(e) => setConfig((c) => ({ ...c, modoBancoHoras: e.target.value }))}>
                <option value="COMPENSAR">Compensar (não desconta em dinheiro)</option>
                <option value="PAGAR">Pagar (saldo negativo vira desconto)</option>
              </select>
            </label>
            <label>
              Hora extra dia útil (%)
              <input className="input" type="number" value={config.heDiaUtilPercent} onChange={(e) => setConfig((c) => ({ ...c, heDiaUtilPercent: Number(e.target.value) }))} />
            </label>
            <label>
              Hora extra domingo/feriado (%)
              <input className="input" type="number" value={config.heDomingoFeriadoPercent} onChange={(e) => setConfig((c) => ({ ...c, heDomingoFeriadoPercent: Number(e.target.value) }))} />
            </label>
            <label>
              Adicional noturno (%)
              <input className="input" type="number" value={config.adicionalNoturnoPercent} onChange={(e) => setConfig((c) => ({ ...c, adicionalNoturnoPercent: Number(e.target.value) }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={config.pagarDSR} onChange={(e) => setConfig((c) => ({ ...c, pagarDSR: e.target.checked }))} />
              Pagar DSR sobre horas extras
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={config.permitirFolhaSemAssinatura} onChange={(e) => setConfig((c) => ({ ...c, permitirFolhaSemAssinatura: e.target.checked }))} />
              Permitir folha sem espelho assinado
            </label>
            <hr />
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Dados bancários (CNAB)</h3>
            <label>Banco (código)<input className="input" value={config.bancoCodigo || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoCodigo: e.target.value }))} /></label>
            <label>Agência<input className="input" value={config.bancoAgencia || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoAgencia: e.target.value }))} /></label>
            <label>Conta<input className="input" value={config.bancoConta || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoConta: e.target.value }))} /></label>
            <label>Convênio<input className="input" value={config.bancoConvenio || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoConvenio: e.target.value }))} /></label>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
