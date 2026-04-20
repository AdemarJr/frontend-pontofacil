// Administrador: fila de comprovantes de ausência (atestado / declaração)
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/dashboard/Layout';
import { comprovanteAusenciaService } from '../services/api';
import { runAusenciasTour } from '../tours/ausenciasTour';

const STATUS_FILTRO = [
  { value: '', label: 'Todos' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'APROVADO', label: 'Aprovados' },
  { value: 'REJEITADO', label: 'Rejeitados' },
];

export default function AusenciasEmpresa() {
  const [filtro, setFiltro] = useState('');
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState('');
  const [decisaoModal, setDecisaoModal] = useState(null); // { item, acao: 'APROVADO' | 'REJEITADO' }
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  /** null | { loading: true } | { loading: false, url, isPdf } | { loading: false, error: string } */
  const [previewArquivo, setPreviewArquivo] = useState(null);
  const [zoomImg, setZoomImg] = useState(1);

  const fecharPreview = useCallback(() => {
    setPreviewArquivo(null);
    setZoomImg(1);
  }, []);

  useEffect(() => {
    if (!previewArquivo) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') fecharPreview();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewArquivo, fecharPreview]);

  async function carregar() {
    setCarregando(true);
    setErroApi('');
    try {
      const { data } = await comprovanteAusenciaService.listar(filtro ? { status: filtro } : {});
      setLista(Array.isArray(data) ? data : []);
    } catch (e) {
      setLista([]);
      const status = e.response?.status;
      const msg = e.response?.data?.error || e.message || 'Falha ao carregar a lista';
      if (status === 403) {
        setErroApi(
          `${msg} Se você usa conta Super Admin, entre como administrador da empresa para ver os comprovantes.`
        );
      } else {
        setErroApi(msg);
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [filtro]);

  useEffect(() => {
    if (carregando) return;
    const t = setTimeout(() => runAusenciasTour({ force: false }), 600);
    return () => clearTimeout(t);
  }, [carregando]);

  async function abrirPreviewComprovante(id) {
    setZoomImg(1);
    setPreviewArquivo({ loading: true });
    try {
      const { data } = await comprovanteAusenciaService.obter(id);
      if (!data.urlVisualizacao) {
        setPreviewArquivo({ loading: false, error: 'Não foi possível obter o arquivo. Verifique o armazenamento (S3) ou tente novamente.' });
        return;
      }
      const isPdf =
        data.tipoArquivo === 'pdf' ||
        (typeof data.urlVisualizacao === 'string' && data.urlVisualizacao.startsWith('data:application/pdf'));
      setPreviewArquivo({ loading: false, url: data.urlVisualizacao, isPdf });
    } catch (e) {
      setPreviewArquivo({ loading: false, error: e.response?.data?.error || e.message || 'Erro ao carregar' });
    }
  }

  async function confirmarDecisao() {
    if (!decisaoModal) return;
    setSalvando(true);
    try {
      await comprovanteAusenciaService.decidir(decisaoModal.item.id, {
        status: decisaoModal.acao,
        observacaoAdmin: obs.trim() || undefined,
      });
      setDecisaoModal(null);
      setObs('');
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  function badge(s) {
    if (s === 'PENDENTE') return <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Pendente</span>;
    if (s === 'APROVADO') return <span className="badge badge-verde">Aprovado</span>;
    return <span className="badge badge-vermelho">Rejeitado</span>;
  }

  return (
    <Layout>
      <div
        id="tour-aus-header"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Ausências e comprovantes</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: 14, marginTop: 4 }}>
            Colaboradores enviam atestado ou documento; você aprova ou rejeita com observação opcional.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select
          id="tour-aus-filtro"
          className="input"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ minWidth: 160 }}
        >
          {STATUS_FILTRO.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => runAusenciasTour({ force: true })}
          style={{
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--verde-escuro)',
            background: 'var(--verde-claro)',
            border: '1px solid rgba(29,158,117,0.35)',
            borderRadius: 8,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Como usar
        </button>
        </div>
      </div>

      {erroApi && (
        <div
          style={{
            background: 'var(--vermelho-claro)',
            color: 'var(--vermelho)',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            lineHeight: 1.45,
          }}
        >
          {erroApi}
        </div>
      )}

      <div id="tour-aus-lista" className="card table-scroll" style={{ padding: 0, maxWidth: '100%' }}>
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <div className="spinner" />
          </div>
        ) : lista.length === 0 && !erroApi ? (
          <p style={{ padding: 32, textAlign: 'center', color: 'var(--cinza-400)' }}>
            Nenhum registro neste filtro. Confira se a migração do banco foi aplicada e se o colaborador é da mesma empresa.
          </p>
        ) : lista.length === 0 ? null : (
          <table className="tabela" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Data(s)</th>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontSize: 13 }}>
                    {c.dataReferencia}
                    {c.dataFim && c.dataFim !== c.dataReferencia ? ` — ${c.dataFim}` : ''}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.usuario?.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{c.usuario?.email}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{c.tipoArquivo === 'pdf' ? 'PDF' : 'Imagem'}</td>
                  <td>{badge(c.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => abrirPreviewComprovante(c.id)}
                      >
                        Ver arquivo
                      </button>
                      {c.status === 'PENDENTE' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: 12, padding: '6px 12px' }}
                            onClick={() => {
                              setObs('');
                              setDecisaoModal({ item: c, acao: 'APROVADO' });
                            }}
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            style={{
                              fontSize: 12,
                              padding: '6px 12px',
                              background: 'transparent',
                              border: '1px solid var(--vermelho)',
                              color: 'var(--vermelho)',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setObs('');
                              setDecisaoModal({ item: c, acao: 'REJEITADO' });
                            }}
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal visualização (imagem com zoom / PDF em iframe) */}
      {previewArquivo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar comprovante"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) fecharPreview();
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 960,
              maxHeight: '95vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderBottom: '1px solid var(--cinza-100)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 15 }}>Visualizar comprovante</span>
              <button type="button" className="btn btn-secondary" onClick={fecharPreview} style={{ padding: '8px 14px' }}>
                Fechar
              </button>
            </div>

            <div style={{ padding: 16, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {previewArquivo.loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                  <div className="spinner" />
                </div>
              ) : previewArquivo.error ? (
                <p style={{ color: 'var(--vermelho)', textAlign: 'center', padding: 24 }}>{previewArquivo.error}</p>
              ) : previewArquivo.isPdf ? (
                <iframe
                  title="Comprovante PDF"
                  src={previewArquivo.url}
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: 480,
                    border: '1px solid var(--cinza-200)',
                    borderRadius: 8,
                    background: '#fff',
                  }}
                />
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--cinza-600)' }}>Zoom</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', minWidth: 40 }}
                      onClick={() => setZoomImg((z) => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
                    >
                      −
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 48, textAlign: 'center' }}>{Math.round(zoomImg * 100)}%</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', minWidth: 40 }}
                      onClick={() => setZoomImg((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
                    >
                      +
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setZoomImg(1)}>
                      Ajustar (100%)
                    </button>
                    <a
                      href={previewArquivo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, marginLeft: 'auto', color: 'var(--azul)' }}
                    >
                      Abrir em nova aba
                    </a>
                  </div>
                  <div
                    style={{
                      overflow: 'auto',
                      flex: 1,
                      minHeight: 320,
                      maxHeight: 'calc(95vh - 200px)',
                      background: '#0f172a',
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        transform: `scale(${zoomImg})`,
                        transformOrigin: 'top center',
                        padding: zoomImg > 1 ? 24 : 0,
                        transition: 'transform 0.12s ease-out',
                      }}
                    >
                      <img
                        src={previewArquivo.url}
                        alt="Comprovante enviado pelo colaborador"
                        style={{
                          maxWidth: 'min(100%, 880px)',
                          width: 'auto',
                          height: 'auto',
                          display: 'block',
                          verticalAlign: 'top',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {decisaoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ maxWidth: 420, width: '100%', padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
              {decisaoModal.acao === 'APROVADO' ? 'Aprovar comprovante' : 'Rejeitar comprovante'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--cinza-600)', marginBottom: 16 }}>
              {decisaoModal.item.usuario?.nome} · {decisaoModal.item.dataReferencia}
            </p>
            <label style={{ fontSize: 13, color: 'var(--cinza-600)' }}>Observação (opcional, visível ao colaborador)</label>
            <textarea className="input" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} style={{ width: '100%', marginTop: 8, marginBottom: 20 }} placeholder="Ex.: deferido conforme documento médico" />
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setDecisaoModal(null)} disabled={salvando}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-full"
                style={decisaoModal.acao === 'REJEITADO' ? { background: 'var(--vermelho)', color: '#fff', border: 'none' } : {}}
                onClick={confirmarDecisao}
                disabled={salvando}
              >
                {salvando ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
