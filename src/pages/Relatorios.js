// src/pages/Relatorios.js
import { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { relatorioService, usuarioService } from '../services/api';
import { runRelatoriosTour } from '../tours/relatoriosTour';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const TIPOS_LABEL = { ENTRADA:'Entrada', SAIDA_ALMOCO:'Saída Almoço', RETORNO_ALMOCO:'Retorno', SAIDA:'Saída' };
const ORIGEM_LABEL = { TOTEM: 'Totem', APP_INDIVIDUAL: 'Meu ponto', ADMIN_MANUAL: 'Manual' };

function fmtMinutos(m) {
  if (m == null || Number.isNaN(Number(m))) return '—';
  const v = Math.round(Number(m));
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
const TIPOS_COR = { ENTRADA:'var(--verde)', SAIDA_ALMOCO:'var(--amarelo)', RETORNO_ALMOCO:'var(--azul)', SAIDA:'var(--vermelho)' };

function BadgeFechamento({ fechamento }) {
  const st = fechamento?.status;
  if (st === 'ASSINADO') {
    return (
      <span
        className="badge"
        title={fechamento?.aprovadoEm ? `Assinado em ${new Date(fechamento.aprovadoEm).toLocaleString('pt-BR')}` : 'Assinado'}
        style={{
          background: 'rgba(29,158,117,0.14)',
          border: '1px solid rgba(29,158,117,0.30)',
          color: 'var(--verde-escuro)',
          fontSize: 11,
          fontWeight: 800,
          padding: '3px 10px',
        }}
      >
        ✓ Assinado
      </span>
    );
  }
  if (st === 'AGUARDANDO_ASSINATURA') {
    return (
      <span
        className="badge"
        title={fechamento?.solicitadoEm ? `Solicitado em ${new Date(fechamento.solicitadoEm).toLocaleString('pt-BR')}` : 'Aguardando assinatura'}
        style={{
          background: 'rgba(245,158,11,0.14)',
          border: '1px solid rgba(245,158,11,0.30)',
          color: '#92400e',
          fontSize: 11,
          fontWeight: 800,
          padding: '3px 10px',
        }}
      >
        ⏳ Aguardando assinatura
      </span>
    );
  }
  return (
    <span
      className="badge"
      title="Sem solicitação de assinatura / sem homologação"
      style={{
        background: 'rgba(148,163,184,0.12)',
        border: '1px solid rgba(148,163,184,0.22)',
        color: 'var(--cinza-400)',
        fontSize: 11,
        fontWeight: 800,
        padding: '3px 10px',
      }}
    >
      — Sem assinatura
    </span>
  );
}

export default function Relatorios() {
  const hoje = new Date();
  const navigate = useNavigate();
  const detalhesRef = useRef(null);
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [relatorio, setRelatorio] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [solicitandoAssinatura, setSolicitandoAssinatura] = useState(false);
  const [bancoResumo, setBancoResumo] = useState(null);
  const [bancoPage, setBancoPage] = useState(1);
  const [bancoPageSize, setBancoPageSize] = useState(10);
  const [espelhoPage, setEspelhoPage] = useState(1);
  const [espelhoPageSize, setEspelhoPageSize] = useState(5);

  useEffect(() => {
    usuarioService.listar().then(({ data }) => setUsuarios(data));
  }, []);

  useEffect(() => { buscar(); }, [mes, ano, usuarioFiltro]);

  useEffect(() => {
    if (carregando) return;
    const t = setTimeout(() => runRelatoriosTour({ force: false }), 600);
    return () => clearTimeout(t);
  }, [carregando]);

  useEffect(() => {
    setBancoPage(1);
    setEspelhoPage(1);
  }, [mes, ano, usuarioFiltro]);

  useEffect(() => {
    relatorioService
      .bancoHorasResumo({
        mes,
        ano,
        ...(usuarioFiltro && { usuarioId: usuarioFiltro }),
      })
      .then(({ data }) => setBancoResumo(data))
      .catch(() => setBancoResumo(null));
  }, [mes, ano, usuarioFiltro]);

  async function buscar() {
    setCarregando(true);
    try {
      const { data } = await relatorioService.espelhoPonto({
        mes, ano,
        ...(usuarioFiltro && { usuarioId: usuarioFiltro }),
      });
      setRelatorio(data.relatorio || []);
    } finally { setCarregando(false); }
  }

  const bancoRows = bancoResumo?.resumo || [];
  const { pageItems: bancoPagina, total: totalBancoRows, safePage: bancoSafePage } = useMemo(
    () => slicePaged(bancoRows, bancoPage, bancoPageSize),
    [bancoRows, bancoPage, bancoPageSize]
  );

  const { pageItems: relatorioPagina, total: totalEspelho, safePage: espelhoSafePage } = useMemo(
    () => slicePaged(relatorio, espelhoPage, espelhoPageSize),
    [relatorio, espelhoPage, espelhoPageSize]
  );

  async function exportarDoServidor(format) {
    setExportando(true);
    try {
      await relatorioService.downloadEspelhoExport({
        mes,
        ano,
        format,
        ...(usuarioFiltro && { usuarioId: usuarioFiltro }),
      });
    } catch (e) {
      alert(e?.message || 'Não foi possível exportar. Verifique se o backend está atualizado.');
    } finally {
      setExportando(false);
    }
  }

  async function solicitarAssinaturaEspelho() {
    if (!usuarioFiltro) {
      alert('Selecione um colaborador no filtro para solicitar a assinatura do espelho.');
      return;
    }
    setSolicitandoAssinatura(true);
    try {
      await relatorioService.solicitarAssinaturaEspelho({
        usuarioId: usuarioFiltro,
        mes,
        ano,
      });
      alert(
        'Solicitação registrada. O colaborador verá o pedido no app (aba Assinar) e poderá conferir e assinar o espelho deste mês.'
      );
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível registrar a solicitação.');
    } finally {
      setSolicitandoAssinatura(false);
    }
  }

  const usuarioSelecionado = useMemo(
    () => (usuarioFiltro ? usuarios.find((u) => String(u.id) === String(usuarioFiltro)) : null),
    [usuarios, usuarioFiltro]
  );

  function verDetalhes() {
    if (detalhesRef.current && typeof detalhesRef.current.scrollIntoView === 'function') {
      detalhesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function registrarPontoEmAtraso() {
    if (!usuarioFiltro) return;
    navigate(`/ajustes-ponto?usuarioId=${encodeURIComponent(usuarioFiltro)}&mes=${encodeURIComponent(mes)}&ano=${encodeURIComponent(ano)}`);
  }

  return (
    <Layout>
      {/* Header */}
      <div id="tour-rel-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:'700' }}>Espelho de Ponto</h1>
          <p style={{ color:'var(--cinza-400)', fontSize:'14px' }}>Visualize e ajuste os registros</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => runRelatoriosTour({ force: true })}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--verde-escuro)',
              background: 'var(--verde-claro)',
              border: '1px solid rgba(29,158,117,0.35)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Como usar
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exportando}
            onClick={() => exportarDoServidor('csv')}
            title="CSV com colunas para contador (intervalo, horas, flags)"
          >
            {exportando ? '…' : '⬇ CSV'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exportando}
            onClick={() => exportarDoServidor('xlsx')}
            title="Planilha Excel"
          >
            {exportando ? '…' : '⬇ Excel'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exportando}
            onClick={() => exportarDoServidor('pdf')}
            title="PDF resumido"
          >
            {exportando ? '…' : '⬇ PDF'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div id="tour-rel-filtros" className="card" style={{ marginBottom:'20px' }}>
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'var(--cinza-400)', marginBottom:'6px' }}>MÊS</label>
            <select className="input" style={{ width:'140px' }} value={mes} onChange={e => setMes(Number(e.target.value))}>
              {Array.from({length:12},(_,i) => (
                <option key={i+1} value={i+1}>{format(new Date(2024, i, 1), 'MMMM', {locale:ptBR})}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'var(--cinza-400)', marginBottom:'6px' }}>ANO</label>
            <select className="input" style={{ width:'100px' }} value={ano} onChange={e => setAno(Number(e.target.value))}>
              {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'var(--cinza-400)', marginBottom:'6px' }}>COLABORADOR</label>
            <select className="input" value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
        {usuarioFiltro ? (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={solicitandoAssinatura || carregando}
              onClick={solicitarAssinaturaEspelho}
              title="O colaborador deve revisar e assinar o espelho deste mês no app (aba Assinar)"
            >
              {solicitandoAssinatura ? 'Registrando…' : '🖊 Solicitar assinatura do espelho'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--cinza-400)', maxWidth: 520, lineHeight: 1.45 }}>
              Envia o pedido para o colaborador assinar digitalmente o espelho do mês selecionado. Se o espelho já estava assinado,
              a solicitação reabre o fluxo até nova assinatura.
            </span>
          </div>
        ) : null}
      </div>

      {usuarioFiltro ? (
        <div
          className="card"
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--cinza-400)' }}>
            Vendo resultados para: <strong style={{ color: 'var(--cinza-700)' }}>{usuarioSelecionado?.nome || '—'}</strong>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={registrarPontoEmAtraso}
              disabled={carregando}
              title="Abrir Ajustes de ponto já filtrado para este colaborador"
            >
              Registrar ponto em atraso
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={solicitarAssinaturaEspelho}
              disabled={solicitandoAssinatura || carregando}
            >
              {solicitandoAssinatura ? 'Registrando…' : 'Solicitar assinatura'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => exportarDoServidor('pdf')}
              disabled={exportando}
              title="Imprimir / PDF do período filtrado"
            >
              {exportando ? '…' : 'Imprimir'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={verDetalhes}
              disabled={carregando}
              title="Ir para os detalhes abaixo"
              style={{ textDecoration: 'underline' }}
            >
              Ver detalhes
            </button>
          </div>
        </div>
      ) : null}

      <div id="tour-rel-conteudo">
      {bancoResumo?.resumo?.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Banco de horas e hora extra (mês)</h2>
          <p style={{ fontSize: '12px', color: 'var(--cinza-400)', marginBottom: '12px' }}>
            {bancoResumo.obs}
          </p>
          <div className="table-scroll">
            <table className="tabela" style={{ fontSize: '13px', minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Trabalhado</th>
                  <th>Esperado (escala)</th>
                  <th>Saldo</th>
                  <th>Hora extra (max 0)</th>
                  <th>Déficit</th>
                </tr>
              </thead>
              <tbody>
                {bancoPagina.map((row, idx) => (
                  <tr key={`${row.usuario?.nome}-${idx}`}>
                    <td>{row.usuario?.nome}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.totalHoras}</td>
                    <td style={{ fontFamily: 'monospace' }}>{fmtMinutos(row.totalEsperadoMin)}</td>
                    <td style={{ fontFamily: 'monospace', color: row.saldoMesMin >= 0 ? 'var(--verde-escuro)' : 'var(--vermelho)' }}>
                      {row.saldoMes}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.horaExtraMes}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--cinza-400)' }}>{fmtMinutos(row.deficitMesMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!carregando && totalBancoRows > 0 && (
            <ListPagination
              style={{ marginTop: '12px' }}
              page={bancoSafePage}
              pageSize={bancoPageSize}
              total={totalBancoRows}
              onPageChange={setBancoPage}
              onPageSizeChange={(n) => {
                setBancoPageSize(n);
                setBancoPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* Resultados */}
      {carregando ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner" /></div>
      ) : relatorio.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'60px', color:'var(--cinza-400)' }}>
          <p style={{ fontSize:'32px' }}>📋</p>
          <p style={{ marginTop:'8px' }}>Nenhum registro no período</p>
        </div>
      ) : (
        <>
          {relatorioPagina.map((r) => (
        <div
          key={r.usuario.nome}
          ref={usuarioFiltro && String(r.usuario?.id) === String(usuarioFiltro) ? detalhesRef : null}
          className="card"
          style={{ marginBottom:'16px', minWidth: 0 }}
        >
          {/* Header do colaborador */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', paddingBottom:'16px', borderBottom:'1px solid var(--cinza-200)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth: 0, flex: '1 1 200px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--verde-claro)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'600', color:'var(--verde-escuro)', flexShrink: 0 }}>
                {r.usuario.nome[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight:'600', overflowWrap: 'anywhere' }}>{r.usuario.nome}</p>
                <p style={{ fontSize:'13px', color:'var(--cinza-400)', overflowWrap: 'anywhere' }}>{r.usuario.cargo}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', flex: '1 1 auto', justifyContent: 'flex-start', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--cinza-400)', fontWeight: 900 }}>Assinatura</span>
                <BadgeFechamento fechamento={r.fechamento} />
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:'20px', fontWeight:'700', color:'var(--azul)' }}>{r.totalHoras}</p>
                <p style={{ fontSize:'11px', color:'var(--cinza-400)' }}>Total trabalhado</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:'13px', fontWeight:'600', color:'var(--cinza-700)' }}>{r.saldoMes ?? '—'}</p>
                <p style={{ fontSize:'11px', color:'var(--cinza-400)' }}>Saldo mês (vs. esperado)</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:'20px', fontWeight:'700', color: r.horaExtraMes && r.horaExtraMes !== '00:00' ? 'var(--amarelo)' : 'var(--cinza-400)' }}>{r.horaExtraMes ?? r.totalExtras}</p>
                <p style={{ fontSize:'11px', color:'var(--cinza-400)' }}>Hora extra (acima do esperado)</p>
              </div>
            </div>
          </div>

          {/* Dias */}
          {Object.entries(r.diasTrabalhados).map(([dia, dados]) => (
            <div key={dia} style={{ marginBottom:'12px', minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--cinza-700)', flexShrink: 0 }}>
                  {format(new Date(dia + 'T12:00:00'), "dd/MM - EEE", { locale:ptBR })}
                </span>
                <span style={{ fontSize:'12px', color:'var(--cinza-400)' }}>{dados.horasTrabalhadas} trabalhadas</span>
                {dados?.contextoDia?.feriado?.nome && dados?.contextoDia?.feriado?.suspendeExpediente !== false ? (
                  <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--azul)', fontSize: 10 }}>
                    Feriado: {dados.contextoDia.feriado.nome}
                  </span>
                ) : null}
                {dados?.contextoDia?.ferias ? (
                  <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--verde-escuro)', fontSize: 10 }}>
                    Férias
                  </span>
                ) : null}
                {dados?.contextoDia?.suspendeExpediente && !dados?.contextoDia?.feriado && !dados?.contextoDia?.ferias ? (
                  <span className="badge" style={{ background: 'rgba(148,163,184,0.18)', color: 'var(--cinza-700)', fontSize: 10 }}>
                    Sem expediente
                  </span>
                ) : null}
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom: 6, width: '100%', minWidth: 0 }}>
                {[
                  { k:'entrada', t:'ENTRADA', label:'Entrada', v: dados.marcacoes?.entrada },
                  { k:'saidaAlmoco', t:'SAIDA_ALMOCO', label:'Saída int.', v: dados.marcacoes?.saidaAlmoco },
                  { k:'retornoAlmoco', t:'RETORNO_ALMOCO', label:'Retorno int.', v: dados.marcacoes?.retornoAlmoco },
                  { k:'saida', t:'SAIDA', label:'Saída', v: dados.marcacoes?.saida },
                ].map((it) => {
                  const faltando = !it.v;
                  return (
                    <div
                      key={it.k}
                      style={{
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'space-between',
                        gap:'10px',
                        background: faltando ? 'rgba(226,75,74,0.08)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${faltando ? 'rgba(226,75,74,0.25)' : 'rgba(148,163,184,0.18)'}`,
                        borderRadius: 10,
                        padding: '8px 10px',
                        flex: '1 1 140px',
                        minWidth: 0,
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                        <span style={{ fontSize: 11, color: faltando ? 'var(--vermelho)' : 'var(--cinza-400)', fontWeight: 700 }}>
                          {it.label}
                        </span>
                        <span style={{ fontFamily:'monospace', fontWeight: 800, color: 'white' }}>
                          {it.v || '—'}
                        </span>
                        {!faltando && dados?.origens?.[it.k] ? (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
                            {ORIGEM_LABEL[dados.origens[it.k]] || dados.origens[it.k]}
                          </span>
                        ) : null}
                      </div>
                    {faltando ? null : null}
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', width: '100%', minWidth: 0 }}>
                {dados.pontos.map(p => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--cinza-100)', borderRadius:'8px', padding:'6px 10px', maxWidth: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                    <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: TIPOS_COR[p.tipo], flexShrink:0 }} />
                    <span style={{ fontSize:'12px', color:'var(--cinza-700)' }}>{TIPOS_LABEL[p.tipo]}</span>
                    <span style={{ fontSize:'13px', fontWeight:'600', fontFamily:'monospace' }}>
                      {format(new Date(p.dataHora), 'HH:mm')}
                    </span>
                    {p.origem ? (
                      <span className="badge" style={{ fontSize:'10px', padding:'1px 6px' }} title={p.origem}>
                        {ORIGEM_LABEL[p.origem] || p.origem}
                      </span>
                    ) : null}
                    {p.ajustado && <span className="badge badge-amarelo" style={{ fontSize:'10px', padding:'1px 6px' }}>Ajustado</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
          ))}
          {!carregando && totalEspelho > 0 && (
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
          )}
        </>
      )}
      </div>

    </Layout>
  );
}
