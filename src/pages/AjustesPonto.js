// src/pages/AjustesPonto.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { pontoService, relatorioService, usuarioService } from '../services/api';
import { useSearchParams } from 'react-router-dom';

const TIPOS_LABEL = { ENTRADA: 'Entrada', SAIDA_ALMOCO: 'Saída Almoço', RETORNO_ALMOCO: 'Retorno', SAIDA: 'Saída' };
const TIPOS_COR = { ENTRADA: 'var(--verde)', SAIDA_ALMOCO: 'var(--amarelo)', RETORNO_ALMOCO: 'var(--azul)', SAIDA: 'var(--vermelho)' };
const ORIGEM_LABEL = { TOTEM: 'Totem', APP_INDIVIDUAL: 'Meu ponto', ADMIN_MANUAL: 'Manual' };

/** Evita o backend (UTC) interpretar "YYYY-MM-DDTHH:mm" como horário UTC em vez do fuso do gerente. */
function datetimeLocalParaIsoUtc(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toISOString();
}

export default function AjustesPonto() {
  const hoje = new Date();
  const [searchParams] = useSearchParams();
  const initFromQueryDone = useRef(false);
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [relatorio, setRelatorio] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const [ajusteModal, setAjusteModal] = useState(null);
  const [ajusteForm, setAjusteForm] = useState({ dataHoraNova: '', motivo: '' });
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);

  const [inserirModal, setInserirModal] = useState(null);
  const [inserirForm, setInserirForm] = useState({ tipo: 'ENTRADA', dataHora: '', motivo: '' });
  const [salvandoInsercao, setSalvandoInsercao] = useState(false);

  const [espelhoPage, setEspelhoPage] = useState(1);
  const [espelhoPageSize, setEspelhoPageSize] = useState(5);

  useEffect(() => {
    usuarioService.listar().then(({ data }) => setUsuarios(data));
  }, []);

  // Permite abrir esta tela já filtrada via query string (atalhos vindos de Espelho/Assinaturas).
  useEffect(() => {
    if (initFromQueryDone.current) return;
    initFromQueryDone.current = true;
    const uid = searchParams.get('usuarioId') || '';
    const qMes = parseInt(searchParams.get('mes') || '', 10);
    const qAno = parseInt(searchParams.get('ano') || '', 10);
    if (uid) setUsuarioFiltro(uid);
    if (!Number.isNaN(qMes) && qMes >= 1 && qMes <= 12) setMes(qMes);
    if (!Number.isNaN(qAno) && qAno >= 2000 && qAno <= 2100) setAno(qAno);
  }, [searchParams]);

  useEffect(() => {
    setEspelhoPage(1);
  }, [mes, ano, usuarioFiltro]);

  useEffect(() => {
    buscar();
  }, [mes, ano, usuarioFiltro]);

  async function buscar() {
    setCarregando(true);
    try {
      const { data } = await relatorioService.espelhoPonto({
        mes,
        ano,
        ...(usuarioFiltro && { usuarioId: usuarioFiltro }),
      });
      setRelatorio(data.relatorio || []);
    } finally {
      setCarregando(false);
    }
  }

  async function salvarAjuste() {
    if (!ajusteForm.dataHoraNova) {
      alert('Selecione o novo horário.');
      return;
    }
    if (!String(ajusteForm.motivo || '').trim()) {
      alert('Informe o motivo do ajuste.');
      return;
    }
    setSalvandoAjuste(true);
    try {
      await relatorioService.ajustarPonto({
        registroId: ajusteModal.id,
        dataHoraNova: datetimeLocalParaIsoUtc(ajusteForm.dataHoraNova),
        motivo: String(ajusteForm.motivo).trim(),
      });
      setAjusteModal(null);
      buscar();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível salvar o ajuste.');
    } finally {
      setSalvandoAjuste(false);
    }
  }

  async function salvarInsercao() {
    if (!inserirModal?.usuarioId) {
      alert('Selecione um colaborador para inserir a batida.');
      return;
    }
    if (!inserirForm.tipo) {
      alert('Selecione o tipo da batida.');
      return;
    }
    if (!inserirForm.dataHora) {
      alert('Selecione a data/hora da batida.');
      return;
    }
    if (!String(inserirForm.motivo || '').trim()) {
      alert('Informe a justificativa para inserir a batida.');
      return;
    }
    setSalvandoInsercao(true);
    try {
      await relatorioService.inserirPontoManual({
        usuarioId: inserirModal.usuarioId,
        tipo: inserirForm.tipo,
        dataHora: datetimeLocalParaIsoUtc(inserirForm.dataHora),
        motivo: String(inserirForm.motivo).trim(),
      });
      setInserirModal(null);
      buscar();
    } catch (e) {
      const code = e?.response?.data?.code;
      if (code === 'DUPLICADO_DIA') {
        alert('Já existe uma batida desse tipo nesse dia. Em vez de inserir, ajuste o horário da batida existente.');
      } else {
        alert(e?.response?.data?.error || e?.message || 'Não foi possível inserir a batida.');
      }
    } finally {
      setSalvandoInsercao(false);
    }
  }

  async function excluirBatida(ponto) {
    const motivo = window.prompt(
      `Excluir batida "${TIPOS_LABEL[ponto.tipo] || ponto.tipo}" (${format(new Date(ponto.dataHora), 'dd/MM/yyyy HH:mm')})?\n\nInforme o motivo (obrigatório):`
    );
    if (!motivo || !String(motivo).trim()) return;
    try {
      await pontoService.excluir(ponto.id, String(motivo).trim());
      await buscar();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível excluir a batida.');
    }
  }

  const { pageItems: relatorioPagina, total: totalEspelho, safePage: espelhoSafePage } = useMemo(
    () => slicePaged(relatorio, espelhoPage, espelhoPageSize),
    [relatorio, espelhoPage, espelhoPageSize]
  );

  function labelMes(i) {
    return format(new Date(2024, i, 1), 'MMMM', { locale: ptBR });
  }

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Ajustes de ponto</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 14, marginTop: 4 }}>
          Operações (ajustar/inserir/excluir) com motivo e auditoria.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--cinza-400)', marginBottom: 6 }}>
              MÊS
            </label>
            <select className="input" style={{ width: 140 }} value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {labelMes(i)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--cinza-400)', marginBottom: 6 }}>
              ANO
            </label>
            <select className="input" style={{ width: 100 }} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              {[2024, 2025, 2026].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--cinza-400)', marginBottom: 6 }}>
              COLABORADOR
            </label>
            <select className="input" value={usuarioFiltro} onChange={(e) => setUsuarioFiltro(e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : totalEspelho === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--cinza-400)', margin: 0 }}>Nenhum dado no período.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {relatorioPagina.map((r) => {
              const dias = r.diasTrabalhados || {};
              const keys = Object.keys(dias).sort().reverse();
              return (
                <div key={r.usuario?.id || r.usuario?.nome} style={{ border: '1px solid var(--cinza-100)', borderRadius: 12, padding: 12, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, minWidth: 0, overflowWrap: 'anywhere' }}>
                      {r.usuario?.nome} <span style={{ color: 'var(--cinza-400)', fontWeight: 500 }}>— {r.usuario?.cargo || ''}</span>
                    </div>
                    <div style={{ color: 'var(--cinza-400)', fontSize: 12, minWidth: 0, overflowWrap: 'anywhere' }}>{r.usuario?.departamento || ''}</div>
                  </div>

                  <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                    {keys.slice(0, 10).map((dia) => {
                      const dados = dias[dia];
                      const pontos = dados?.pontos || [];
                      const faltando = dados?.flags?.faltandoMarcacao;
                      const itens = [
                        { t: 'ENTRADA', label: 'Entrada', v: dados?.marcacoes?.entrada, k: `${dia}-e` },
                        { t: 'SAIDA_ALMOCO', label: 'Saída', v: dados?.marcacoes?.saidaAlmoco, k: `${dia}-sa` },
                        { t: 'RETORNO_ALMOCO', label: 'Retorno', v: dados?.marcacoes?.retornoAlmoco, k: `${dia}-ra` },
                        { t: 'SAIDA', label: 'Saída', v: dados?.marcacoes?.saida, k: `${dia}-s` },
                      ];

                      return (
                        <div key={dia} style={{ border: '1px solid var(--cinza-100)', borderRadius: 12, padding: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ fontWeight: 800 }}>{dia}</div>
                            {faltando ? <span className="badge badge-vermelho">Faltando marcação</span> : <span className="badge badge-verde">OK</span>}
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, width: '100%', minWidth: 0 }}>
                            {itens.map((it) => (
                              <div
                                key={it.k}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 10,
                                  background: !it.v ? 'rgba(226,75,74,0.08)' : 'rgba(255,255,255,0.06)',
                                  border: `1px solid ${!it.v ? 'rgba(226,75,74,0.25)' : 'rgba(148,163,184,0.18)'}`,
                                  borderRadius: 10,
                                  padding: '8px 10px',
                                  flex: '1 1 140px',
                                  minWidth: 0,
                                  maxWidth: '100%',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: 11, color: !it.v ? 'var(--vermelho)' : 'var(--cinza-400)', fontWeight: 700 }}>
                                    {it.label}
                                  </span>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'white' }}>{it.v || '—'}</span>
                                  {it.v && dados?.origens?.[it.k] ? (
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                                      {ORIGEM_LABEL[dados.origens[it.k]] || dados.origens[it.k]}
                                    </span>
                                  ) : null}
                                </div>
                                {!it.v ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                                    onClick={() => {
                                      setInserirModal({ usuarioId: r.usuario.id, dia, nome: r.usuario.nome });
                                      setInserirForm({
                                        tipo: it.t,
                                        dataHora: `${dia}T${it.t === 'ENTRADA' ? '08:00' : it.t === 'SAIDA' ? '17:00' : it.t === 'SAIDA_ALMOCO' ? '12:00' : '13:00'}`,
                                        motivo: '',
                                      });
                                    }}
                                  >
                                    + Inserir
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, width: '100%', minWidth: 0 }}>
                            {pontos.map((p) => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--cinza-100)', borderRadius: 8, padding: '6px 10px', maxWidth: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIPOS_COR[p.tipo], flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: 'var(--cinza-700)' }}>{TIPOS_LABEL[p.tipo]}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                                  {format(new Date(p.dataHora), 'HH:mm')}
                                </span>
                                {p.origem ? (
                                  <span
                                    className="badge"
                                    style={{ fontSize: 10, padding: '1px 6px' }}
                                    title={p.origem}
                                  >
                                    {ORIGEM_LABEL[p.origem] || p.origem}
                                  </span>
                                ) : null}
                                {p.ajustado && <span className="badge badge-amarelo" style={{ fontSize: 10, padding: '1px 6px' }}>Ajustado</span>}
                                <button
                                  onClick={() => {
                                    setAjusteModal(p);
                                    setAjusteForm({ dataHoraNova: format(new Date(p.dataHora), "yyyy-MM-dd'T'HH:mm"), motivo: '' });
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cinza-400)', fontSize: 12, padding: '0 2px' }}
                                  title="Ajustar horário"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => excluirBatida(p)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vermelho)', fontSize: 12, padding: '0 2px' }}
                                  title="Excluir batida (com motivo)"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalEspelho > 0 && (
          <div style={{ paddingTop: 16 }}>
            <ListPagination
              page={espelhoSafePage}
              pageSize={espelhoPageSize}
              total={totalEspelho}
              onPageChange={setEspelhoPage}
              pageSizeOptions={[5, 10, 20]}
              onPageSizeChange={(n) => {
                setEspelhoPageSize(n);
                setEspelhoPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal de ajuste */}
      {ajusteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 20 }}>Ajuste Manual de Ponto</h2>
            <div style={{ background: 'var(--cinza-100)', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: 'var(--cinza-700)' }}>
              <strong>Horário original:</strong> {format(new Date(ajusteModal.dataHora), 'dd/MM/yyyy HH:mm:ss')}
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Novo horário</label>
                <input className="input" type="datetime-local" value={ajusteForm.dataHoraNova} onChange={(e) => setAjusteForm((p) => ({ ...p, dataHoraNova: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Motivo do ajuste *</label>
                <textarea className="input" rows={3} placeholder="Ex: Colaborador esqueceu de registrar a entrada..." value={ajusteForm.motivo} onChange={(e) => setAjusteForm((p) => ({ ...p, motivo: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setAjusteModal(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary btn-full"
                onClick={salvarAjuste}
                disabled={salvandoAjuste || !String(ajusteForm.motivo || '').trim()}
                title={!String(ajusteForm.motivo || '').trim() ? 'Informe o motivo do ajuste' : undefined}
              >
                {salvandoAjuste ? 'Salvando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de inserção */}
      {inserirModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Inserir batida faltante</h2>
            <p style={{ fontSize: 13, color: 'var(--cinza-400)', marginTop: 0, marginBottom: 16 }}>
              {inserirModal.nome} — {format(new Date(inserirModal.dia + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Tipo</label>
                <select className="input" value={inserirForm.tipo} onChange={(e) => setInserirForm((p) => ({ ...p, tipo: e.target.value }))}>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA_ALMOCO">Saída intervalo</option>
                  <option value="RETORNO_ALMOCO">Retorno intervalo</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Data/hora</label>
                <input className="input" type="datetime-local" value={inserirForm.dataHora} onChange={(e) => setInserirForm((p) => ({ ...p, dataHora: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Justificativa *</label>
                <textarea className="input" rows={3} placeholder="Ex: Esqueceu de registrar a saída..." value={inserirForm.motivo} onChange={(e) => setInserirForm((p) => ({ ...p, motivo: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setInserirModal(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary btn-full"
                onClick={salvarInsercao}
                disabled={salvandoInsercao || !String(inserirForm.motivo || '').trim()}
                title={!String(inserirForm.motivo || '').trim() ? 'Informe a justificativa' : undefined}
              >
                {salvandoInsercao ? 'Salvando...' : 'Confirmar inserção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

