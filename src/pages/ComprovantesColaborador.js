// Enviar foto ou PDF de atestado / comprovante para análise do RH
import { useState, useEffect } from 'react';
import { comprovanteAusenciaService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ComprovantesColaborador() {
  const { usuario } = useAuth();
  const [dataReferencia, setDataReferencia] = useState(hojeISO);
  const [dataFim, setDataFim] = useState('');
  const [descricao, setDescricao] = useState('');
  const [arquivoBase64, setArquivoBase64] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erro, setErro] = useState('');

  async function carregarLista() {
    try {
      const { data } = await comprovanteAusenciaService.minhas();
      setLista(data);
    } catch {
      setLista([]);
    } finally {
      setCarregandoLista(false);
    }
  }

  useEffect(() => {
    carregarLista();
  }, []);

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 9 * 1024 * 1024) {
      setErro('Arquivo muito grande (máx. ~8 MB para PDF, 5 MB para imagem).');
      return;
    }
    setNomeArquivo(f.name);
    setErro('');
    const reader = new FileReader();
    reader.onload = () => {
      setArquivoBase64(reader.result);
    };
    reader.readAsDataURL(f);
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!arquivoBase64) {
      setErro('Selecione uma foto ou um PDF.');
      return;
    }
    setCarregando(true);
    try {
      await comprovanteAusenciaService.criar({
        dataReferencia,
        dataFim: dataFim || undefined,
        descricao: descricao.trim() || undefined,
        arquivoBase64,
        nomeArquivoOriginal: nomeArquivo || undefined,
      });
      setArquivoBase64('');
      setNomeArquivo('');
      setDescricao('');
      await carregarLista();
      alert('Enviado com sucesso. Acompanhe o status abaixo; o gestor analisa em Ausências no painel.');
    } catch (err) {
      setErro(err.response?.data?.error || err.message || 'Erro ao enviar');
    } finally {
      setCarregando(false);
    }
  }

  function badgeStatus(s) {
    if (s === 'PENDENTE') return { label: 'Pendente', bg: 'rgba(251,191,36,0.2)', color: '#fbbf24' };
    if (s === 'APROVADO') return { label: 'Aprovado', bg: 'rgba(34,197,94,0.2)', color: '#86efac' };
    return { label: 'Rejeitado', bg: 'rgba(248,113,113,0.2)', color: '#fca5a5' };
  }

  return (
    <div className="colaborador-page">
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Atestados e ausências</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 22, lineHeight: 1.55 }}>
        Envie foto do atestado ou PDF. O RH da <strong style={{ color: '#e2e8f0' }}>{usuario?.tenant?.nomeFantasia}</strong> analisa e registra a decisão.
      </p>

      <form
        onSubmit={enviar}
        style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 28,
          border: '1px solid rgba(148,163,184,0.12)',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: 13, marginBottom: 6 }}>Data da falta (início)</label>
          <input
            type="date"
            className="input"
            value={dataReferencia}
            onChange={(e) => setDataReferencia(e.target.value)}
            required
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>Último dia (opcional — vários dias)</label>
          <input
            type="date"
            className="input"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            min={dataReferencia}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>Observação (opcional)</label>
          <textarea
            className="input"
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: consulta médica, acompanhamento..."
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: 13, marginBottom: 6 }}>Foto ou PDF</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={onFile} />
          {nomeArquivo ? (
            <p style={{ color: '#86efac', fontSize: 12, marginTop: 8 }}>✓ {nomeArquivo}</p>
          ) : (
            <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>JPG, PNG, WebP ou PDF · câmera ou arquivo</p>
          )}
        </div>
        {erro && (
          <div style={{ background: 'rgba(248,113,113,0.15)', color: '#fecaca', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {erro}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-full" disabled={carregando}>
          {carregando ? 'Enviando…' : 'Enviar comprovante'}
        </button>
      </form>

      <h2 style={{ color: 'white', fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Meus envios</h2>
      {carregandoLista ? (
        <div className="spinner" style={{ margin: '24px auto' }} />
      ) : lista.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 14 }}>Nenhum comprovante enviado ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map((c) => {
            const b = badgeStatus(c.status);
            return (
              <div
                key={c.id}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 13,
                  border: '1px solid rgba(148,163,184,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#e2e8f0' }}>
                    {c.dataReferencia}
                    {c.dataFim && c.dataFim !== c.dataReferencia ? ` → ${c.dataFim}` : ''}
                  </span>
                  <span style={{ background: b.bg, color: b.color, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    {b.label}
                  </span>
                </div>
                {c.descricao && <p style={{ color: '#94a3b8', margin: '8px 0 0' }}>{c.descricao}</p>}
                {c.observacaoAdmin && (
                  <p style={{ color: '#cbd5e1', margin: '8px 0 0', fontSize: 12 }}>
                    <strong>Resposta:</strong> {c.observacaoAdmin}
                  </p>
                )}
                {c.urlVisualizacao && (
                  <a
                    href={c.urlVisualizacao}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 10, color: '#4ade80', fontSize: 13 }}
                  >
                    Abrir arquivo enviado
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p style={{ color: '#64748b', fontSize: 12, marginTop: 28, lineHeight: 1.5 }}>
        Dúvidas sobre documentos? Use <strong style={{ color: '#94a3b8' }}>Ajuda</strong> na tela inicial ou fale com o RH.
      </p>
    </div>
  );
}
