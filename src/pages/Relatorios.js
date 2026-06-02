// src/pages/Relatorios.js
import { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import AppIcon from '../components/AppIcon';
import { relatorioService, usuarioService, comprovanteAusenciaService } from '../services/api';
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

const STATUS_DIA_COR = {
  TRABALHADO: { bg: 'rgba(29,158,117,0.14)', fg: 'var(--verde-escuro)' },
  PARCIAL: { bg: 'rgba(245,158,11,0.16)', fg: '#92400e' },
  FALTA: { bg: 'rgba(226,75,74,0.14)', fg: 'var(--vermelho)' },
  FOLGA: { bg: 'rgba(99,102,241,0.16)', fg: '#4338ca' },
  JUSTIFICADA: { bg: 'rgba(14,165,233,0.16)', fg: '#0369a1' },
  FERIAS: { bg: 'rgba(16,185,129,0.16)', fg: 'var(--verde-escuro)' },
  FERIADO: { bg: 'rgba(59,130,246,0.16)', fg: 'var(--azul)' },
  ANTES_ADMISSAO: { bg: 'rgba(148,163,184,0.18)', fg: 'var(--cinza-700)' },
  POS_DEMISSAO: { bg: 'rgba(148,163,184,0.18)', fg: 'var(--cinza-700)' },
  EM_ABERTO: { bg: 'rgba(148,163,184,0.16)', fg: 'var(--cinza-400)' },
  FUTURO: { bg: 'rgba(148,163,184,0.10)', fg: 'var(--cinza-400)' },
};

function StatusDiaBadge({ status, label }) {
  if (!status) return null;
  const c = STATUS_DIA_COR[status] || { bg: 'rgba(148,163,184,0.16)', fg: 'var(--cinza-400)' };
  return (
    <span className="badge" style={{ background: c.bg, color: c.fg, fontSize: 10, fontWeight: 800, padding: '2px 8px' }}>
      {label || status}
    </span>
  );
}

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
  const [abertos, setAbertos] = useState(() => ({}));
  const [bancoPage, setBancoPage] = useState(1);
  const [bancoPageSize, setBancoPageSize] = useState(10);
  const [espelhoPage, setEspelhoPage] = useState(1);
  const [espelhoPageSize, setEspelhoPageSize] = useState(5);
  const [showFolgaForm, setShowFolgaForm] = useState(false);
  const [folgaInicio, setFolgaInicio] = useState('');
  const [folgaFim, setFolgaFim] = useState('');
  const [folgaDescricao, setFolgaDescricao] = useState('');
  const [salvandoFolga, setSalvandoFolga] = useState(false);

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

  const bancoRows = useMemo(
    () =>
      (relatorio || []).map((r) => ({
        usuario: r.usuario,
        totalHoras: r.totalHoras,
        totalEsperadoMin: r.totalEsperadoMin,
        saldoMesMin: r.saldoMesMin,
        saldoMes: r.saldoMes,
        horaExtraMes: r.horaExtraMes,
        deficitMesMin: r.deficitMesMin,
        diasResumo: r.resumo,
      })),
    [relatorio]
  );
  const BANCO_OBS =
    'Saldo = trabalhado − esperado. O esperado conta apenas dias úteis devidos; folgas, feriados, férias, faltas justificadas e dias futuros têm esperado 0.';
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

  async function solicitarAssinaturaDireto(usuarioId) {
    if (!usuarioId) return;
    setSolicitandoAssinatura(true);
    try {
      await relatorioService.solicitarAssinaturaEspelho({ usuarioId, mes, ano });
      buscar();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível registrar a solicitação.');
    } finally {
      setSolicitandoAssinatura(false);
    }
  }

  async function registrarFolga() {
    if (!usuarioFiltro) {
      alert('Selecione um colaborador no filtro para registrar a folga.');
      return;
    }
    if (!folgaInicio) {
      alert('Informe a data da folga.');
      return;
    }
    if (folgaFim && folgaFim < folgaInicio) {
      alert('A data final não pode ser antes da inicial.');
      return;
    }
    setSalvandoFolga(true);
    try {
      await comprovanteAusenciaService.registrarFolga({
        usuarioId: usuarioFiltro,
        dataReferencia: folgaInicio,
        ...(folgaFim ? { dataFim: folgaFim } : {}),
        ...(folgaDescricao ? { descricao: folgaDescricao } : {}),
      });
      setShowFolgaForm(false);
      setFolgaInicio('');
      setFolgaFim('');
      setFolgaDescricao('');
      buscar();
      alert('Folga registrada. Esse(s) dia(s) deixam de contar como falta no espelho.');
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível registrar a folga.');
    } finally {
      setSalvandoFolga(false);
    }
  }

  const usuarioSelecionado = useMemo(
    () => (usuarioFiltro ? usuarios.find((u) => String(u.id) === String(usuarioFiltro)) : null),
    [usuarios, usuarioFiltro]
  );

  const assinaturaLista = useMemo(() => {
    const rows = (relatorio || []).map((r) => ({
      id: r?.usuario?.id,
      nome: r?.usuario?.nome,
      cargo: r?.usuario?.cargo,
      fechamento: r?.fechamento || null,
    })).filter((x) => x.id && x.nome);
    rows.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    return rows;
  }, [relatorio]);

  const assinaturaResumo = useMemo(() => {
    const acc = { assinados: 0, aguardando: 0, sem: 0, total: 0 };
    for (const r of assinaturaLista) {
      acc.total += 1;
      const st = r?.fechamento?.status;
      if (st === 'ASSINADO') acc.assinados += 1;
      else if (st === 'AGUARDANDO_ASSINATURA') acc.aguardando += 1;
      else acc.sem += 1;
    }
    return acc;
  }, [assinaturaLista]);

  function toggleAberto(usuarioId) {
    setAbertos((prev) => ({ ...prev, [usuarioId]: !prev?.[usuarioId] }));
  }

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

      {/* Assinaturas (resumo + lista) */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Assinaturas do mês</h2>
            <p style={{ fontSize: 12, color: 'var(--cinza-400)' }}>
              Competência: <strong style={{ color: 'var(--cinza-700)' }}>{String(mes).padStart(2, '0')}/{ano}</strong>
              {' '}· Assinados: <strong style={{ color: 'var(--verde-escuro)' }}>{assinaturaResumo.assinados}</strong>
              {' '}· Aguardando: <strong style={{ color: '#92400e' }}>{assinaturaResumo.aguardando}</strong>
              {' '}· Sem assinatura: <strong style={{ color: 'var(--cinza-400)' }}>{assinaturaResumo.sem}</strong>
            </p>
          </div>
        </div>

        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 18 }}>
            <div className="spinner" />
          </div>
        ) : assinaturaLista.length === 0 ? (
          <div style={{ color: 'var(--cinza-400)', fontSize: 13 }}>Sem colaboradores no período.</div>
        ) : (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {assinaturaLista.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--cinza-200)',
                  background: 'rgba(255,255,255,0.35)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--cinza-700)', overflowWrap: 'anywhere' }}>{r.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--cinza-400)', overflowWrap: 'anywhere' }}>{r.cargo || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <BadgeFechamento fechamento={r.fechamento} />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={solicitandoAssinatura}
                    onClick={() => solicitarAssinaturaDireto(r.id)}
                    title="Enviar pedido para o colaborador assinar o espelho deste mês"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                  >
                    Solicitar assinatura
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
              className="btn btn-secondary"
              onClick={() => setShowFolgaForm((v) => !v)}
              disabled={carregando}
              title="Marcar um dia (ou período) como folga para este colaborador — não conta como falta"
            >
              {showFolgaForm ? 'Cancelar folga' : '🌴 Registrar folga'}
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
          {showFolgaForm ? (
            <div
              style={{
                flexBasis: '100%',
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid var(--cinza-200)',
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--cinza-400)', marginBottom: 6 }}>
                  DATA DA FOLGA
                </label>
                <input type="date" className="input" value={folgaInicio} onChange={(e) => setFolgaInicio(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--cinza-400)', marginBottom: 6 }}>
                  ATÉ (opcional)
                </label>
                <input type="date" className="input" value={folgaFim} onChange={(e) => setFolgaFim(e.target.value)} />
              </div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--cinza-400)', marginBottom: 6 }}>
                  MOTIVO (opcional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex.: folga compensatória, banco de horas…"
                  value={folgaDescricao}
                  onChange={(e) => setFolgaDescricao(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-primary" onClick={registrarFolga} disabled={salvandoFolga}>
                {salvandoFolga ? 'Salvando…' : 'Salvar folga'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div id="tour-rel-conteudo">
      {bancoRows.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Banco de horas e hora extra (mês)</h2>
          <p style={{ fontSize: '12px', color: 'var(--cinza-400)', marginBottom: '12px' }}>
            {BANCO_OBS}
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
                  <th>Faltas</th>
                  <th>Folgas</th>
                  <th>Justif.</th>
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
                    <td style={{ fontFamily: 'monospace', color: row.diasResumo?.faltas ? 'var(--vermelho)' : 'var(--cinza-400)' }}>{row.diasResumo?.faltas ?? 0}</td>
                    <td style={{ fontFamily: 'monospace', color: '#4338ca' }}>{row.diasResumo?.folgas ?? 0}</td>
                    <td style={{ fontFamily: 'monospace', color: '#0369a1' }}>{row.diasResumo?.justificadas ?? 0}</td>
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
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'8px' }}>
            <AppIcon name="relatorios" size={34} color="var(--cinza-400)" aria-hidden />
          </div>
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
          {/* Header do colaborador (dropdown) */}
          <button
            type="button"
            onClick={() => toggleAberto(r.usuario.id)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            aria-expanded={Boolean(abertos?.[r.usuario.id])}
            title="Abrir/fechar detalhes do colaborador"
          >
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
              <div style={{ marginLeft: 'auto', color: 'var(--cinza-400)', fontSize: 12, fontWeight: 900 }}>
                {abertos?.[r.usuario.id] ? '▲' : '▼'}
              </div>
            </div>
          </div>
          </button>

          {/* Resumo do mês (contagem por status) */}
          {r.resumo ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { label: 'Trabalhados', val: r.resumo.trabalhados, status: 'TRABALHADO' },
                { label: 'Faltas', val: r.resumo.faltas, status: 'FALTA' },
                { label: 'Folgas', val: r.resumo.folgas, status: 'FOLGA' },
                { label: 'Justificadas', val: r.resumo.justificadas, status: 'JUSTIFICADA' },
                { label: 'Férias', val: r.resumo.ferias, status: 'FERIAS' },
                { label: 'Feriados', val: r.resumo.feriados, status: 'FERIADO' },
              ]
                .filter((c) => c.val > 0)
                .map((c) => {
                  const cor = STATUS_DIA_COR[c.status] || { bg: 'rgba(148,163,184,0.16)', fg: 'var(--cinza-400)' };
                  return (
                    <span
                      key={c.label}
                      style={{
                        background: cor.bg,
                        color: cor.fg,
                        borderRadius: 999,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {c.label}: {c.val}
                    </span>
                  );
                })}
            </div>
          ) : null}

          {/* Dias */}
          {(abertos?.[r.usuario.id] || (usuarioFiltro && String(r.usuario?.id) === String(usuarioFiltro))) ? (
            Object.entries(r.diasTrabalhados).map(([dia, dados]) => (
            <div key={dia} style={{ marginBottom:'12px', minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--cinza-700)', flexShrink: 0 }}>
                  {format(new Date(dia + 'T12:00:00'), "dd/MM - EEE", { locale:ptBR })}
                </span>
                <span style={{ fontSize:'12px', color:'var(--cinza-400)' }}>{dados.horasTrabalhadas} trabalhadas</span>
                <StatusDiaBadge status={dados.statusDia} label={dados.statusLabel} />
                {dados?.contextoDia?.feriado?.nome && dados?.contextoDia?.feriado?.suspendeExpediente !== false ? (
                  <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--azul)', fontSize: 10 }}>
                    {dados.contextoDia.feriado.nome}
                  </span>
                ) : null}
                {dados?.contextoDia?.ausencia?.descricao ? (
                  <span style={{ fontSize: 11, color: 'var(--cinza-400)', fontStyle: 'italic' }}>
                    {dados.contextoDia.ausencia.descricao}
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
          ))
          ) : (
            <div style={{ marginTop: 12, color: 'var(--cinza-400)', fontSize: 13 }}>
              Detalhes recolhidos. Clique no cabeçalho para abrir.
            </div>
          )}
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
