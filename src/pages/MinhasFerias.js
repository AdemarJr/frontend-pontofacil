// Colaborador: solicitar e acompanhar férias (fluxo típico de RH)
import { useEffect, useState, useMemo } from 'react';
import { feriasService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getISODay,
  isToday,
  differenceInCalendarDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

function isoHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function badge(s) {
  if (s === 'PENDENTE') return { label: 'Aguardando RH', bg: '#fef3c7', color: '#92400e' };
  if (s === 'APROVADA') return { label: 'Aprovada', bg: 'rgba(29,158,117,0.18)', color: 'var(--verde-escuro)' };
  if (s === 'REJEITADA') return { label: 'Recusada', bg: 'rgba(226,75,74,0.12)', color: 'var(--vermelho)' };
  return { label: 'Cancelada', bg: 'var(--cinza-100)', color: 'var(--cinza-600)' };
}

function prioridadeCelula(iso, lista) {
  const sobre = lista.filter((f) => iso >= f.dataInicio && iso <= f.dataFim);
  if (sobre.length === 0) return null;
  if (sobre.some((f) => f.status === 'APROVADA')) return 'APROVADA';
  if (sobre.some((f) => f.status === 'PENDENTE')) return 'PENDENTE';
  if (sobre.some((f) => f.status === 'REJEITADA')) return 'REJEITADA';
  return 'CANCELADA';
}

function estiloPrioridade(p) {
  if (p === 'APROVADA') return { borderBottom: '3px solid #1d9e75', background: 'rgba(29,158,117,0.1)' };
  if (p === 'PENDENTE') return { borderBottom: '3px solid #f59e0b', background: 'rgba(245,158,11,0.12)' };
  if (p === 'REJEITADA') return { borderBottom: '3px solid rgba(248,113,113,0.75)', background: 'rgba(248,113,113,0.08)' };
  if (p === 'CANCELADA') return { borderBottom: '3px dashed rgba(148,163,184,0.45)', background: 'rgba(148,163,184,0.06)' };
  return {};
}

function corBarra(status) {
  if (status === 'APROVADA') return 'linear-gradient(90deg, #1d9e75, #0f766e)';
  if (status === 'PENDENTE') return 'linear-gradient(90deg, #f59e0b, #ea580c)';
  if (status === 'REJEITADA') return 'linear-gradient(90deg, rgba(248,113,113,0.9), rgba(220,38,38,0.8))';
  return 'linear-gradient(90deg, #64748b, #475569)';
}

export default function MinhasFerias() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [dataInicio, setDataInicio] = useState(isoHoje());
  const [dataFim, setDataFim] = useState(isoHoje());
  const [observacao, setObservacao] = useState('');
  const [viewMonth, setViewMonth] = useState(() => new Date());

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await feriasService.minhas();
      setLista(Array.isArray(data) ? data : []);
    } catch {
      setLista([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadBlank = getISODay(monthStart) - 1;

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < leadBlank; i++) out.push(null);
    for (const d of daysInMonth) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [leadBlank, daysInMonth]);

  const msIso = format(monthStart, 'yyyy-MM-dd');
  const meIso = format(monthEnd, 'yyyy-MM-dd');
  const totalDays = differenceInCalendarDays(monthEnd, monthStart) + 1;

  const barrasMes = useMemo(() => {
    return lista
      .filter((f) => f.dataInicio <= meIso && f.dataFim >= msIso)
      .sort((a, b) => String(a.dataInicio).localeCompare(String(b.dataInicio)))
      .map((f) => {
        const clipStart = f.dataInicio > msIso ? f.dataInicio : msIso;
        const clipEnd = f.dataFim < meIso ? f.dataFim : meIso;
        const from = differenceInCalendarDays(parseISO(`${clipStart}T12:00:00`), monthStart);
        const len =
          differenceInCalendarDays(parseISO(`${clipEnd}T12:00:00`), parseISO(`${clipStart}T12:00:00`)) + 1;
        const left = (from / totalDays) * 100;
        const width = Math.max((len / totalDays) * 100, 2);
        return { f, left, width };
      });
  }, [lista, msIso, meIso, monthStart, totalDays]);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (dataInicio > dataFim) {
      setErro('A data final deve ser igual ou posterior à inicial.');
      return;
    }
    setEnviando(true);
    try {
      await feriasService.solicitar({
        dataInicio,
        dataFim,
        observacao: observacao.trim() || undefined,
      });
      setObservacao('');
      await carregar();
      alert('Solicitação enviada. O gestor/RH vai analisar e você vê o status abaixo.');
    } catch (err) {
      setErro(err.response?.data?.error || err.message || 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="colaborador-page" style={{ maxWidth: 1080, color: '#e2e8f0', width: '100%', minWidth: 0 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#fff' }}>Minhas férias</h1>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 22 }}>
        {usuario?.nome} · solicitações e calendário
      </p>

      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: 24,
            alignItems: 'start',
            marginBottom: 28,
            width: '100%',
            minWidth: 0,
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, border: '1px solid rgba(148,163,184,0.14)', minWidth: 0 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900 }}>Nova solicitação</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              Informe o período desejado. O gestor aprova ou recusa — padrão de RH. Enquanto estiver <strong>aguardando</strong>, o espelho ainda não considera férias; após <strong>aprovada</strong>, os dias aparecem em verde no calendário ao lado.
            </p>

            <form onSubmit={enviar} style={{ marginTop: 18, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Início</label>
                  <input className="input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Fim</label>
                  <input className="input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} required />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Comentário (opcional)</label>
                <textarea className="input" rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: combinar com meu gestor a segunda quinzena" style={{ width: '100%' }} />
              </div>
              {erro ? <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{erro}</p> : null}
              <button type="submit" className="btn btn-primary" disabled={enviando} style={{ fontWeight: 800 }}>
                {enviando ? 'Enviando…' : 'Enviar solicitação'}
              </button>
            </form>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, border: '1px solid rgba(148,163,184,0.14)', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Calendário e linha do tempo</h2>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>
                  Visualização tipo sistemas de RH: períodos proporcionais ao mês e destaque no dia.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                  onClick={() => setViewMonth((d) => subMonths(d, 1))}
                >
                  ←
                </button>
                <span style={{ fontWeight: 800, fontSize: 'clamp(12px, 3vw, 14px)', minWidth: 0, textAlign: 'center', flex: '1 1 8rem' }}>
                  {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                  onClick={() => setViewMonth((d) => addMonths(d, 1))}
                >
                  →
                </button>
              </div>
            </div>

            <div className="table-scroll" style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: 4,
                minWidth: 280,
              }}
            >
              {WEEKDAYS.map((w) => (
                <div key={w} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textAlign: 'center', padding: '4px 0' }}>
                  {w}
                </div>
              ))}
              {cells.map((d, idx) => {
                if (!d) {
                  return <div key={`e-${idx}`} style={{ minHeight: 40 }} />;
                }
                const iso = format(d, 'yyyy-MM-dd');
                const pri = prioridadeCelula(iso, lista);
                const est = estiloPrioridade(pri);
                const hoje = isToday(d);
                return (
                  <div
                    key={iso}
                    title={pri ? `${iso} · ${pri}` : iso}
                    style={{
                      minHeight: 40,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: hoje ? 900 : 600,
                      color: hoje ? '#38bdf8' : pri ? '#e2e8f0' : '#94a3b8',
                      border: hoje ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(148,163,184,0.12)',
                      ...est,
                    }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
              <span>
                <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, background: '#1d9e75', marginRight: 6, verticalAlign: 'middle' }} />
                Aprovada
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, background: '#f59e0b', marginRight: 6, verticalAlign: 'middle' }} />
                Aguardando
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, background: 'rgba(248,113,113,0.85)', marginRight: 6, verticalAlign: 'middle' }} />
                Recusada
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 8,
                    borderRadius: 2,
                    border: '1px dashed #64748b',
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }}
                />
                Cancelada
              </span>
            </div>

            {barrasMes.length > 0 ? (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>Faixas no mês</p>
                <div style={{ position: 'relative', height: 12 + barrasMes.length * 30, marginTop: 8 }}>
                  {barrasMes.map(({ f, left, width }, i) => {
                    const b = badge(f.status);
                    return (
                      <div
                        key={f.id}
                        style={{
                          position: 'absolute',
                          top: 4 + i * 30,
                          left: `${left}%`,
                          width: `${width}%`,
                          height: 24,
                          borderRadius: 8,
                          background: corBarra(f.status),
                          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                          padding: '4px 10px',
                          fontSize: 10,
                          fontWeight: 800,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                        title={`${f.dataInicio} → ${f.dataFim} · ${b.label}`}
                      >
                        {format(parseISO(`${f.dataInicio}T12:00:00`), 'dd/MM', { locale: ptBR })} –{' '}
                        {format(parseISO(`${f.dataFim}T12:00:00`), 'dd/MM', { locale: ptBR })}
                        <span style={{ opacity: 0.85, marginLeft: 8, fontWeight: 600 }}>{b.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Nenhum período neste mês — navegue com as setas ou envie uma solicitação.</p>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>Minhas solicitações</h2>
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" />
          </div>
        ) : lista.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Nenhuma solicitação ainda.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lista.map((f) => {
              const b = badge(f.status);
              return (
                <li
                  key={f.id}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(148,163,184,0.14)',
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#cbd5e1' }}>
                      {f.dataInicio} → {f.dataFim}
                    </span>
                    <span className="badge" style={{ background: b.bg, color: b.color, fontSize: 11 }}>
                      {b.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                    {format(parseISO(`${f.dataInicio}T12:00:00`), 'dd/MM', { locale: ptBR })} a{' '}
                    {format(parseISO(`${f.dataFim}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                  {f.observacao ? <p style={{ margin: '10px 0 0', fontSize: 14 }}>Você: {f.observacao}</p> : null}
                  {f.respostaAdmin ? (
                    <p style={{ margin: '10px 0 0', fontSize: 13, color: '#a5b4fc' }}>
                      <strong>RH:</strong> {f.respostaAdmin}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
