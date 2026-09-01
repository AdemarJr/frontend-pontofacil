// src/pages/Dashboard.js
import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination from '../components/ListPagination';
import AppIcon from '../components/AppIcon';
import { relatorioService, pontoService } from '../services/api';
import { runAdminDashboardTour, STORAGE_TOUR_ADMIN_DASHBOARD } from '../tours/adminDashboardTour';
import { hasTourBeenSeen } from '../tours/tourHelpers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenantTimezone } from '../hooks/useTenantTimezone';

function CardMetrica({ label, valor, cor, icon, hint }) {
  return (
    <div className="card card-kpi" style={{ '--kpi-accent': cor }}>
      <div className="card-kpi__top">
        <p className="card-kpi__label">{label}</p>
        <div className="card-kpi__icon">
          <AppIcon name={icon} size={20} color={cor} />
        </div>
      </div>
      <div>
        <p className="card-kpi__value">{valor}</p>
        {hint ? <p className="card-kpi__delta card-kpi__delta--neutral">{hint}</p> : null}
      </div>
    </div>
  );
}

const FILTRO_SITUACAO_OPCOES = [
  { value: '', label: 'Selecione…' },
  { value: 'presentes', label: 'Presentes agora' },
  { value: 'ausentes', label: 'Ausentes' },
  { value: 'atrasados', label: 'Atrasados (entrada)' },
  { value: 'falta', label: 'Falta (sem entrada após tolerância)' },
  { value: 'ferias', label: 'Férias' },
  { value: 'dispensados', label: 'Dispensados (atestado / ausência aprovada)' },
];

export default function Dashboard() {
  const { formatTime } = useTenantTimezone();
  const [resumo, setResumo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [filtroSituacao, setFiltroSituacao] = useState('');
  const autoTourTriedRef = useRef(hasTourBeenSeen(STORAGE_TOUR_ADMIN_DASHBOARD));

  const ORIGEM_LABEL = {
    TOTEM: 'Totem',
    APP_INDIVIDUAL: 'Meu ponto',
    ADMIN_MANUAL: 'Manual',
  };

  const carregarDados = useCallback(async () => {
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const [{ data: res }, { data: reg }] = await Promise.all([
        relatorioService.resumoDia(),
        pontoService.listar({ dataInicio: hoje, dataFim: hoje, limite, pagina }),
      ]);
      setResumo(res);
      setRegistros(reg.registros || []);
      const total = reg.total ?? 0;
      const paginas = Math.max(1, reg.paginas ?? 1);
      setTotalRegistros(total);
      if (pagina > paginas) setPagina(paginas);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }, [limite, pagina]);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 60000); // atualiza a cada 1 min
    return () => clearInterval(interval);
  }, [carregarDados]);

  /** Tour automático só no 1º acesso ao painel; depois só via "Como usar" */
  useEffect(() => {
    if (carregando || autoTourTriedRef.current) return undefined;
    let tourCleanup;
    const timer = setTimeout(() => {
      tourCleanup = runAdminDashboardTour({ force: false });
      if (hasTourBeenSeen(STORAGE_TOUR_ADMIN_DASHBOARD) || tourCleanup) {
        autoTourTriedRef.current = true;
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      if (typeof tourCleanup === 'function') tourCleanup();
    };
  }, [carregando]);

  const TIPOS_COR = {
    ENTRADA: 'var(--verde)',
    SAIDA_ALMOCO: 'var(--amarelo)',
    RETORNO_ALMOCO: 'var(--azul)',
    SAIDA: 'var(--vermelho)',
  };
  const TIPOS_LABEL = {
    ENTRADA: 'Entrada',
    SAIDA_ALMOCO: 'Saída Almoço',
    RETORNO_ALMOCO: 'Retorno',
    SAIDA: 'Saída',
  };

  const listas = resumo?.listas || {};
  const linhasSituacao = filtroSituacao ? listas[filtroSituacao] || [] : [];

  function detalheSituacao(row, tipo) {
    if (!row) return '—';
    if (tipo === 'atrasados' && row.entradaEm) {
      const ent = format(new Date(row.entradaEm), 'HH:mm');
      const esp = row.esperadoEntrada ? `Previsto: ${row.esperadoEntrada}` : '';
      return `Entrada às ${ent}${esp ? ` — ${esp}` : ''}`;
    }
    if ((tipo === 'ausentes' || tipo === 'falta') && row.esperadoEntrada) {
      return `Entrada prevista (escala): ${row.esperadoEntrada}`;
    }
    if (tipo === 'ausentes' || tipo === 'falta') return 'Sem registro de entrada no expediente ou ainda fora do ponto.';
    if (tipo === 'ferias') {
      return `Período: ${row.dataInicio} a ${row.dataFim}${row.observacao ? ` — ${row.observacao}` : ''}`;
    }
    if (tipo === 'dispensados') {
      const fim = row.dataFim ? ` a ${row.dataFim}` : '';
      return `Comprovante: ${row.dataReferencia}${fim}${row.descricao ? ` — ${row.descricao}` : ''}`;
    }
    if (tipo === 'presentes') return 'No expediente (entrada ou retorno ativo).';
    return '—';
  }

  if (carregando) {
    return <Layout><div style={{ display:'flex', justifyContent:'center', padding:'80px' }}><div className="spinner" /></div></Layout>;
  }

  return (
    <Layout>
      {/* Header */}
      <div id="tour-dashboard-header" className="page-header fade-in">
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Painel de Controle</h1>
          <p className="page-subtitle">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => runAdminDashboardTour({ force: true })}
        >
          Como usar o painel
        </button>
      </div>

      {/* Métricas */}
      <div id="tour-dashboard-metrics" className="kpi-grid fade-in">
        <CardMetrica
          label="Colaboradores"
          valor={resumo?.totalColaboradores ?? '-'}
          cor="var(--info)"
          icon="colaboradores"
          hint="Base ativa"
        />
        <CardMetrica
          label="Presentes agora"
          valor={resumo?.presentes ?? '-'}
          cor="var(--color-primary)"
          icon="ok"
          hint="No expediente"
        />
        <CardMetrica
          label="Ausentes"
          valor={resumo?.ausentes ?? '-'}
          cor="var(--error)"
          icon="erro"
          hint="Sem batida ativa"
        />
        <CardMetrica
          label="Registros hoje"
          valor={resumo?.registrosHoje ?? '-'}
          cor="var(--warning)"
          icon="jornadas"
          hint="Atualizado em tempo real"
        />
      </div>

      {resumo?.contextoDia?.feriado ? (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <strong>Feriado:</strong> {resumo.contextoDia.feriado.nome} — presença e ausência não são contabilizadas neste dia. Ainda assim você pode consultar férias e comprovantes aprovados abaixo.
        </div>
      ) : null}

      {/* Filtro por situação no dia */}
      <div className="card fade-in" style={{ marginBottom: 20 }}>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Situação no dia</h2>
        <p className="page-subtitle" style={{ marginBottom: 14 }}>
          Liste colaboradores por ausência, atraso na entrada, falta após o horário previsto (+ tolerância), férias aprovadas ou ausência com comprovante aprovado (dispensado).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <label style={{ marginBottom: 0 }} htmlFor="dashboard-filtro-situacao">
            Filtrar por
          </label>
          <select
            id="dashboard-filtro-situacao"
            className="input"
            style={{ maxWidth: '100%', width: 'min(420px, 100%)' }}
            value={filtroSituacao}
            onChange={(e) => setFiltroSituacao(e.target.value)}
          >
            {FILTRO_SITUACAO_OPCOES.map((op) => (
              <option key={op.value || 'empty'} value={op.value}>
                {op.value
                  ? `${op.label} (${(listas[op.value] || []).length})`
                  : op.label}
              </option>
            ))}
          </select>
        </div>
        {!filtroSituacao ? (
          <p className="page-subtitle" style={{ margin: 0 }}>Escolha um tipo de situação para exibir a lista.</p>
        ) : linhasSituacao.length === 0 ? (
          <p className="page-subtitle" style={{ margin: 0 }}>Nenhum colaborador nesta categoria no momento.</p>
        ) : (
          <div className="table-scroll">
            <table className="tabela" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Cargo / Depto</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {linhasSituacao.map((row) => (
                  <tr key={`${filtroSituacao}-${row.id}`}>
                    <td style={{ fontWeight: 600 }}>{row.nome}</td>
                    <td style={{ fontSize: 13, color: 'var(--cinza-500)' }}>
                      {[row.cargo, row.departamento].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td style={{ fontSize: 13, lineHeight: 1.45, maxWidth: 360 }}>{detalheSituacao(row, filtroSituacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Últimos registros */}
      <div id="tour-dashboard-registros" className="card fade-in" style={{ padding: 0, maxWidth: '100%', minWidth: 0 }}>
        <div className="table-card-header">
          <h2 className="section-title" style={{ minWidth: 0 }}>Registros de Hoje</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={carregarDados}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <AppIcon name="refresh" size={16} />
              Atualizar
            </span>
          </button>
        </div>

        {registros.length === 0 ? (
          <div className="ds-empty" style={{ padding: '48px 20px' }}>
            <div className="ds-empty__icon">
              <AppIcon name="inbox" size={34} color="var(--text-disabled)" />
            </div>
            <p className="ds-empty__title">Nenhum registro hoje ainda</p>
            <p className="ds-empty__desc">As batidas do dia aparecerão aqui em tempo real.</p>
          </div>
        ) : (
          <div className="table-scroll" style={{ marginTop: 12 }}>
            <table className="tabela" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th>Horário</th>
                  <th>Foto</th>
                  <th>Localização</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.usuario?.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{r.usuario?.cargo}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: TIPOS_COR[r.tipo] + '20', color: TIPOS_COR[r.tipo] }}>
                        {TIPOS_LABEL[r.tipo]}
                      </span>
                    </td>
                    <td>
                      {r.origem ? (
                        <span className="badge badge-cinza" title={r.origem}>
                          {ORIGEM_LABEL[r.origem] || r.origem}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--cinza-400)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="font-mono" style={{ fontSize: 14, fontWeight: 600 }}>
                      {formatTime(r.dataHora, 'HH:mm:ss')}
                      {r.ajustado && <span className="badge badge-amarelo" style={{ marginLeft: 6, fontSize: 10 }}>Ajustado</span>}
                    </td>
                    <td>
                      {r.fotoUrl ? (
                        <img src={r.fotoUrl} alt="foto" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', cursor: 'pointer', boxShadow: 'var(--shadow-xs)' }}
                          onClick={() => window.open(r.fotoUrl, '_blank')} />
                      ) : (
                        <span style={{ color: 'var(--cinza-400)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.dentroGeofence !== null ? (
                        <span className={`badge ${r.dentroGeofence ? 'badge-verde' : 'badge-vermelho'}`}>
                          {r.dentroGeofence ? '✓ Dentro' : '✗ Fora'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--cinza-400)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {registros.length > 0 && totalRegistros > 0 && (
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--cinza-100)' }}>
            <ListPagination
              page={pagina}
              pageSize={limite}
              total={totalRegistros}
              onPageChange={setPagina}
              onPageSizeChange={(n) => {
                setLimite(n);
                setPagina(1);
              }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
