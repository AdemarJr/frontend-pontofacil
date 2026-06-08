import { useEffect, useState } from 'react';
import { folhaService } from '../../services/api';

export default function FolhaConfigSection() {
  const [config, setConfig] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    folhaService.getConfig()
      .then(({ data }) => setConfig(data))
      .catch((e) => setErro(e.response?.data?.error || e.message));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      const { data } = await folhaService.putConfig(config);
      setConfig(data);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (err) {
      setErro(err.response?.data?.error || err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!config) {
    return (
      <div className="card" id="folha-config">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <form id="folha-config" className="card" onSubmit={salvar}>
      <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Folha de pagamento</h2>
      <p style={{ fontSize: '13px', color: 'var(--cinza-400)', marginBottom: '16px', lineHeight: 1.5 }}>
        Parâmetros CLT, banco de horas e dados bancários para CNAB.
      </p>
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
        <hr style={{ border: 'none', borderTop: '1px solid var(--cinza-200)', margin: '4px 0' }} />
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Dados bancários (CNAB)</h3>
        <label>Banco (código)<input className="input" value={config.bancoCodigo || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoCodigo: e.target.value }))} /></label>
        <label>Agência<input className="input" value={config.bancoAgencia || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoAgencia: e.target.value }))} /></label>
        <label>Conta<input className="input" value={config.bancoConta || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoConta: e.target.value }))} /></label>
        <label>Convênio<input className="input" value={config.bancoConvenio || ''} onChange={(e) => setConfig((c) => ({ ...c, bancoConvenio: e.target.value }))} /></label>
      </div>
      {erro && (
        <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 14 }}>
          {erro}
        </div>
      )}
      {sucesso && (
        <div style={{ background: 'var(--verde-claro)', color: 'var(--verde-escuro)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 14, fontWeight: 500 }}>
          Configuração da folha salva.
        </div>
      )}
      <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }} disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar configuração da folha'}
      </button>
    </form>
  );
}
