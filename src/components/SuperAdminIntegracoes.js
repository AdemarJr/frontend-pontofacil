// Configuração InfinitePay no Super Admin
import { useEffect, useState } from 'react';
import { superAdminService } from '../services/api';

function copiar(texto) {
  if (!texto) return;
  navigator.clipboard?.writeText(texto).then(() => alert('Copiado!')).catch(() => alert(texto));
}

export default function SuperAdminIntegracoes() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    ativo: false,
    handle: '',
    apiPublicUrl: '',
    webhookUrl: '',
    redirectUrl: '',
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await superAdminService.obterIntegracaoInfinitipay();
      setConfig(data);
      setForm({
        ativo: Boolean(data.ativo),
        handle: data.handle || '',
        apiPublicUrl: data.apiPublicUrl || '',
        webhookUrl: data.webhookUrl || '',
        redirectUrl: data.redirectUrl || '',
      });
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao carregar integração InfinitePay');
    } finally {
      setCarregando(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      const { data } = await superAdminService.salvarIntegracaoInfinitipay(form);
      setConfig(data);
      alert('Configuração InfinitePay salva.');
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    setTestando(true);
    try {
      await salvar();
      const { data } = await superAdminService.testarIntegracaoInfinitipay();
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
      alert(data.mensagem || 'Teste OK');
    } catch (e) {
      alert(e.response?.data?.error || 'Falha no teste de integração');
    } finally {
      setTestando(false);
    }
  }

  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="spinner" />
      </div>
    );
  }

  const statusOk = config?.configurado;

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 720 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Integração InfinitePay</h2>
        <p style={{ margin: '8px 0 0', color: 'var(--cinza-400)', fontSize: 14, lineHeight: 1.5 }}>
          Configure o Checkout Integrado para cobrar os planos comerciais (Pix e cartão).
          {' '}
          <a href={config?.docsUrl || 'https://www.infinitepay.io/checkout-documentacao'} target="_blank" rel="noreferrer">
            Documentação InfinitePay
          </a>
        </p>
      </div>

      <div className="card" style={{ borderLeft: `4px solid ${statusOk ? 'var(--verde)' : 'var(--amarelo)'}` }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          Status: {statusOk ? 'Ativa e pronta para cobranças' : 'Pendente de configuração'}
        </p>
        {!statusOk && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--cinza-500)' }}>
            Informe a InfiniteTag e marque &quot;Integração ativa&quot; para habilitar o botão Cobrar plano nas empresas.
          </p>
        )}
        {config?.handleFonte === 'env' && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--cinza-400)' }}>
            Handle em uso vem do ambiente (INFINITEPAY_HANDLE). Salve aqui para migrar para o painel.
          </p>
        )}
      </div>

      <div className="card" style={{ display: 'grid', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
          />
          Integração InfinitePay ativa
        </label>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
            InfiniteTag (handle) *
          </label>
          <input
            className="input"
            value={form.handle}
            onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/^\$/, '') })}
            placeholder="sua_infinite_tag (sem o $)"
          />
          <p style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 6 }}>
            Nome de usuário no app InfinitePay, sem o símbolo $.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
            URL pública do backend (API)
          </label>
          <input
            className="input"
            value={form.apiPublicUrl}
            onChange={(e) => setForm({ ...form, apiPublicUrl: e.target.value })}
            placeholder="https://backend-pontofacil-hom-production.up.railway.app"
          />
          <p style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 6 }}>
            Usada para montar a URL do webhook automaticamente.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
            Webhook (opcional — sobrescreve o padrão)
          </label>
          <input
            className="input"
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            placeholder="Deixe vazio para usar URL calculada"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
            URL de retorno após pagamento (opcional)
          </label>
          <input
            className="input"
            value={form.redirectUrl}
            onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })}
            placeholder="Deixe vazio para usar /pagamento/retorno no frontend"
          />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" disabled={salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Salvar configuração'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={testando} onClick={testar}>
            {testando ? 'Testando…' : 'Testar (link R$ 1,00)'}
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>URLs efetivas (copie para a InfinitePay)</h3>
        <UrlCopiavel label="Webhook" url={config?.webhookUrlEfetiva} onCopiar={copiar} />
        <UrlCopiavel label="Retorno (redirect)" url={config?.redirectUrlEfetiva} onCopiar={copiar} />
        {config?.updatedAt && (
          <p style={{ fontSize: 12, color: 'var(--cinza-400)', margin: 0 }}>
            Última alteração: {new Date(config.updatedAt).toLocaleString('pt-BR')}
            {config.updatedByEmail ? ` · ${config.updatedByEmail}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function UrlCopiavel({ label, url, onCopiar }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <code style={{ fontSize: 12, wordBreak: 'break-all', flex: 1, background: 'var(--cinza-50)', padding: '8px 10px', borderRadius: 6 }}>
          {url || '— configure a URL do backend —'}
        </code>
        {url && (
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => onCopiar(url)}>
            Copiar
          </button>
        )}
      </div>
    </div>
  );
}
