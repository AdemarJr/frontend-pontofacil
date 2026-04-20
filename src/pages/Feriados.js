import { useEffect, useMemo, useState, useCallback } from 'react';
import Layout from '../components/dashboard/Layout';
import { feriadoService } from '../services/api';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isSameMonth,
  parseISO,
  getISODay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoFromDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function Feriados() {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ data: hojeIso(), nome: '', suspendeExpediente: true });
  const [salvando, setSalvando] = useState(false);
  const [vista, setVista] = useState('calendario');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const y = viewDate.getFullYear();
      const de = `${y}-01-01`;
      const ate = `${y}-12-31`;
      const { data } = await feriadoService.listar({ de, ate });
      setLista(Array.isArray(data) ? data : []);
    } catch (e) {
      setLista([]);
      setErro(e.response?.data?.error || e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }, [viewDate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const porData = useMemo(() => {
    const m = new Map();
    for (const f of lista) {
      if (f?.data) m.set(f.data, f);
    }
    return m;
  }, [lista]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadBlank = getISODay(monthStart) - 1;

  const statsMes = useMemo(() => {
    let total = 0;
    let susp = 0;
    for (const d of daysInMonth) {
      const iso = isoFromDate(d);
      const f = porData.get(iso);
      if (f) {
        total += 1;
        if (f.suspendeExpediente !== false) susp += 1;
      }
    }
    return { total, susp };
  }, [daysInMonth, porData]);

  const proximos = useMemo(() => {
    const hoje = hojeIso();
    return [...lista]
      .filter((f) => f.data >= hoje)
      .sort((a, b) => String(a.data).localeCompare(String(b.data)))
      .slice(0, 8);
  }, [lista]);

  const filtradosBusca = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((f) => (f.nome || '').toLowerCase().includes(q) || String(f.data || '').includes(q));
  }, [lista, busca]);

  function abrirCriar(dataPref) {
    setForm({
      data: dataPref || hojeIso(),
      nome: '',
      suspendeExpediente: true,
    });
    setModal('criar');
    setErro('');
  }

  function abrirEditar(item) {
    setForm({
      data: item.data,
      nome: item.nome || '',
      suspendeExpediente: item.suspendeExpediente !== false,
    });
    setModal(item);
    setErro('');
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      const payload = {
        data: form.data,
        nome: form.nome.trim(),
        suspendeExpediente: Boolean(form.suspendeExpediente),
      };
      if (!payload.nome) {
        setErro('Nome é obrigatório');
        setSalvando(false);
        return;
      }
      if (modal === 'criar') await feriadoService.criar(payload);
      else await feriadoService.atualizar(modal.id, payload);
      setModal(null);
      await carregar();
    } catch (e) {
      setErro(e.response?.data?.error || e.message || 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir o feriado "${item.nome}" (${item.data})?`)) return;
    try {
      await feriadoService.remover(item.id);
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Falha ao excluir');
    }
  }

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < leadBlank; i++) out.push(null);
    for (const d of daysInMonth) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [leadBlank, daysInMonth]);

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Calendário de feriados</h1>
            <p style={{ color: 'var(--cinza-400)', fontSize: 14, marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>
              Visualize o ano em grade, clique no dia para cadastrar ou edite o cartão ao lado. Feriados com expediente suspenso já entram no espelho de ponto automaticamente.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--cinza-100)', borderRadius: 10, padding: 4, gap: 4 }}>
              <button
                type="button"
                className={vista === 'calendario' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: 13, padding: '8px 14px' }}
                onClick={() => setVista('calendario')}
              >
                Calendário
              </button>
              <button
                type="button"
                className={vista === 'lista' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: 13, padding: '8px 14px' }}
                onClick={() => setVista('lista')}
              >
                Lista do ano
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => abrirCriar()}>
              + Novo feriado
            </button>
          </div>
        </div>
      </div>

      {erro && (
        <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '12px 16px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>
          {erro}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .feriados-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {vista === 'calendario' ? (
        <div className="feriados-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => setViewDate((d) => subMonths(d, 1))} aria-label="Mês anterior">
                  ‹
                </button>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, minWidth: 200, textAlign: 'center' }}>
                  {format(viewDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => setViewDate((d) => addMonths(d, 1))} aria-label="Próximo mês">
                  ›
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setViewDate(new Date())}>
                  Hoje
                </button>
                <span className="badge badge-cinza" style={{ fontSize: 12 }}>
                  {statsMes.total} no mês · {statsMes.susp} suspendem expediente
                </span>
              </div>
            </div>

            {carregando ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <div className="spinner" />
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  {WEEKDAYS.map((w) => (
                    <div key={w} style={{ fontSize: 11, fontWeight: 800, color: 'var(--cinza-400)', textAlign: 'center', padding: '4px 0' }}>
                      {w}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {cells.map((d, idx) => {
                    if (!d) {
                      return <div key={`e-${idx}`} style={{ minHeight: 72 }} />;
                    }
                    const iso = isoFromDate(d);
                    const f = porData.get(iso);
                    const foraMes = !isSameMonth(d, viewDate);
                    const hoje = isToday(d);
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => (f ? abrirEditar(f) : abrirCriar(iso))}
                        style={{
                          minHeight: 76,
                          borderRadius: 12,
                          border: hoje ? '2px solid var(--verde)' : '1px solid var(--cinza-200)',
                          background: f
                            ? f.suspendeExpediente !== false
                              ? 'linear-gradient(145deg, rgba(226,75,74,0.12), rgba(226,75,74,0.04))'
                              : 'linear-gradient(145deg, rgba(59,130,246,0.14), rgba(59,130,246,0.04))'
                            : foraMes
                              ? 'var(--cinza-50)'
                              : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          padding: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 800, color: foraMes ? 'var(--cinza-400)' : 'var(--cinza-900)' }}>{format(d, 'd')}</span>
                        {f ? (
                          <>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cinza-700)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {f.nome}
                            </span>
                            <span style={{ fontSize: 9, color: f.suspendeExpediente !== false ? 'var(--vermelho)' : 'var(--azul)', fontWeight: 700 }}>
                              {f.suspendeExpediente !== false ? 'Sem expediente' : 'Expediente normal'}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--cinza-400)' }}>Toque para adicionar</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>Próximos feriados</h3>
              {proximos.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--cinza-400)' }}>Nenhum feriado futuro neste ano cadastrado.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {proximos.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => abrirEditar(f)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'var(--cinza-100)',
                          border: '1px solid var(--cinza-200)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--cinza-500)' }}>{f.data}</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{f.nome}</div>
                        <div style={{ fontSize: 11, color: f.suspendeExpediente !== false ? 'var(--vermelho)' : 'var(--azul)', marginTop: 4 }}>
                          {f.suspendeExpediente !== false ? 'Expediente suspenso' : 'Não suspende'}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, rgba(29,158,117,0.08), rgba(24,95,165,0.06))' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--verde-escuro)' }}>Dica</p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--cinza-600)', lineHeight: 1.5 }}>
                Use <strong>expediente normal</strong> para datas comemorativas em que a empresa funciona (ex.: evento interno) — o dia continua valendo no espelho. <strong>Sem expediente</strong> zera a cobrança de batidas naquele dia.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Todos os feriados de {viewDate.getFullYear()}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setViewDate((d) => subMonths(d, 12))}>
                Ano anterior
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setViewDate((d) => addMonths(d, 12))}>
                Próximo ano
              </button>
            </div>
          </div>
          <input className="input" placeholder="🔍 Filtrar por nome ou data" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: 400, marginBottom: 16 }} />
          {carregando ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="spinner" />
            </div>
          ) : filtradosBusca.length === 0 ? (
            <p style={{ color: 'var(--cinza-400)' }}>Nenhum feriado neste ano.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtradosBusca.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--cinza-200)',
                    background: 'white',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: f.suspendeExpediente !== false ? 'rgba(226,75,74,0.15)' : 'rgba(59,130,246,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 12,
                        color: f.suspendeExpediente !== false ? 'var(--vermelho)' : 'var(--azul)',
                      }}
                    >
                      {format(parseISO(f.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{f.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--cinza-400)', fontFamily: 'monospace' }}>{f.data}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {f.suspendeExpediente !== false ? <span className="badge badge-vermelho">Suspenso</span> : <span className="badge badge-cinza">Normal</span>}
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => abrirEditar(f)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      style={{ fontSize: 12, padding: '6px 12px', background: 'transparent', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => excluir(f)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{modal === 'criar' ? 'Novo feriado' : 'Editar feriado'}</h3>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--cinza-700)', marginBottom: 6 }}>Data</label>
                <input className="input" type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--cinza-700)', marginBottom: 6 }}>Nome</label>
                <input className="input" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex.: Tiradentes" />
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'var(--cinza-700)' }}>
                <input type="checkbox" checked={form.suspendeExpediente} onChange={(e) => setForm((p) => ({ ...p, suspendeExpediente: e.target.checked }))} />
                Suspende expediente (não exige batida / esperado = 0 no espelho)
              </label>
            </div>

            {erro && modal && (
              <div style={{ background: 'var(--vermelho-claro)', color: 'var(--vermelho)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 14 }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setModal(null)} disabled={salvando}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-full" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
