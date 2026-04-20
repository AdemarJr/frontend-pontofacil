// src/pages/Dashboard.js
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination from '../components/ListPagination';
import { relatorioService, pontoService } from '../services/api';
import { runAdminDashboardTour } from '../tours/adminDashboardTour';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function CardMetrica({ label, valor, cor, emoji }) {
  return (
    <div className="card" style={{ textAlign:'center', borderTop:`3px solid ${cor}` }}>
      <div style={{ fontSize:'32px', marginBottom:'8px' }}>{emoji}</div>
      <p style={{ fontSize:'36px', fontWeight:'700', color: cor }}>{valor}</p>
      <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginTop:'4px' }}>{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [totalRegistros, setTotalRegistros] = useState(0);

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

  /** Tour guiado (primeira visita ao painel) */
  useEffect(() => {
    if (carregando) return;
    const timer = setTimeout(() => runAdminDashboardTour({ force: false }), 700);
    return () => clearTimeout(timer);
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

  if (carregando) {
    return <Layout><div style={{ display:'flex', justifyContent:'center', padding:'80px' }}><div className="spinner" /></div></Layout>;
  }

  return (
    <Layout>
      {/* Header */}
      <div id="tour-dashboard-header" style={{ marginBottom:'28px', display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:'16px' }}>
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:'700' }}>Painel de Controle</h1>
          <p style={{ color:'var(--cinza-400)', marginTop:'4px' }}>
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => runAdminDashboardTour({ force: true })}
          style={{
            padding:'8px 14px',
            fontSize:'13px',
            fontWeight:600,
            color:'var(--verde-escuro)',
            background:'var(--verde-claro)',
            border:'1px solid rgba(29,158,117,0.35)',
            borderRadius:'8px',
            cursor:'pointer',
          }}
        >
          Como usar o painel
        </button>
      </div>

      {/* Métricas */}
      <div id="tour-dashboard-metrics" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'16px', marginBottom:'28px' }}>
        <CardMetrica label="Total de Colaboradores" valor={resumo?.totalColaboradores ?? '-'} cor="var(--azul)" emoji="👥" />
        <CardMetrica label="Presentes Agora" valor={resumo?.presentes ?? '-'} cor="var(--verde)" emoji="✅" />
        <CardMetrica label="Ausentes" valor={resumo?.ausentes ?? '-'} cor="var(--vermelho)" emoji="❌" />
        <CardMetrica label="Registros Hoje" valor={resumo?.registrosHoje ?? '-'} cor="var(--amarelo)" emoji="🕐" />
      </div>

      {/* Últimos registros */}
      <div id="tour-dashboard-registros" className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <h2 style={{ fontSize:'16px', fontWeight:'600', minWidth:0 }}>Registros de Hoje</h2>
          <button onClick={carregarDados} style={{ background:'none', border:'none', color:'var(--verde)', cursor:'pointer', fontSize:'13px', fontWeight:'500', whiteSpace:'nowrap' }}>
            ↻ Atualizar
          </button>
        </div>

        {registros.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--cinza-400)' }}>
            <p style={{ fontSize:'32px', marginBottom:'8px' }}>📭</p>
            <p>Nenhum registro hoje ainda</p>
          </div>
        ) : (
          <div className="table-scroll">
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
                      <div style={{ fontWeight:'500' }}>{r.usuario?.nome}</div>
                      <div style={{ fontSize:'12px', color:'var(--cinza-400)' }}>{r.usuario?.cargo}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: TIPOS_COR[r.tipo] + '20', color: TIPOS_COR[r.tipo] }}>
                        {TIPOS_LABEL[r.tipo]}
                      </span>
                    </td>
                    <td>
                      {r.origem ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(148,163,184,0.25)',
                            color: 'var(--cinza-700)',
                          }}
                          title={r.origem}
                        >
                          {ORIGEM_LABEL[r.origem] || r.origem}
                        </span>
                      ) : (
                        <span style={{ color:'var(--cinza-400)', fontSize:'12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily:'monospace', fontSize:'15px', fontWeight:'500' }}>
                      {format(new Date(r.dataHora), 'HH:mm:ss')}
                      {r.ajustado && <span className="badge badge-amarelo" style={{ marginLeft:'6px', fontSize:'10px' }}>Ajustado</span>}
                    </td>
                    <td>
                      {r.fotoUrl ? (
                        <img src={r.fotoUrl} alt="foto" style={{ width:'40px', height:'40px', borderRadius:'8px', objectFit:'cover', cursor:'pointer' }}
                          onClick={() => window.open(r.fotoUrl, '_blank')} />
                      ) : (
                        <span style={{ color:'var(--cinza-400)', fontSize:'12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      {r.dentroGeofence !== null ? (
                        <span className={`badge ${r.dentroGeofence ? 'badge-verde' : 'badge-vermelho'}`}>
                          {r.dentroGeofence ? '✓ Dentro' : '✗ Fora'}
                        </span>
                      ) : (
                        <span style={{ color:'var(--cinza-400)', fontSize:'12px' }}>—</span>
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
