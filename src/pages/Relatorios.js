// src/pages/Relatorios.js
import { useState, useEffect } from 'react';
import Layout from '../components/dashboard/Layout';
import { relatorioService, usuarioService } from '../services/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPOS_LABEL = { ENTRADA:'Entrada', SAIDA_ALMOCO:'Saída Almoço', RETORNO_ALMOCO:'Retorno', SAIDA:'Saída' };
const TIPOS_COR = { ENTRADA:'var(--verde)', SAIDA_ALMOCO:'var(--amarelo)', RETORNO_ALMOCO:'var(--azul)', SAIDA:'var(--vermelho)' };

export default function Relatorios() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [relatorio, setRelatorio] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [ajusteModal, setAjusteModal] = useState(null);
  const [ajusteForm, setAjusteForm] = useState({ dataHoraNova:'', motivo:'' });
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    usuarioService.listar().then(({ data }) => setUsuarios(data));
  }, []);

  useEffect(() => { buscar(); }, [mes, ano, usuarioFiltro]);

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

  async function salvarAjuste() {
    if (!ajusteForm.dataHoraNova || !ajusteForm.motivo) return;
    setSalvandoAjuste(true);
    try {
      await relatorioService.ajustarPonto({
        registroId: ajusteModal.id,
        dataHoraNova: ajusteForm.dataHoraNova,
        motivo: ajusteForm.motivo,
      });
      setAjusteModal(null);
      buscar();
    } finally { setSalvandoAjuste(false); }
  }

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

  return (
    <Layout>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:'700' }}>Espelho de Ponto</h1>
          <p style={{ color:'var(--cinza-400)', fontSize:'14px' }}>Visualize e ajuste os registros</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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
      <div className="card" style={{ marginBottom:'20px' }}>
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
          <div style={{ flex:1, minWidth:'200px' }}>
            <label style={{ display:'block', fontSize:'12px', fontWeight:'500', color:'var(--cinza-400)', marginBottom:'6px' }}>COLABORADOR</label>
            <select className="input" value={usuarioFiltro} onChange={e => setUsuarioFiltro(e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {carregando ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner" /></div>
      ) : relatorio.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'60px', color:'var(--cinza-400)' }}>
          <p style={{ fontSize:'32px' }}>📋</p>
          <p style={{ marginTop:'8px' }}>Nenhum registro no período</p>
        </div>
      ) : relatorio.map(r => (
        <div key={r.usuario.nome} className="card" style={{ marginBottom:'16px' }}>
          {/* Header do colaborador */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', paddingBottom:'16px', borderBottom:'1px solid var(--cinza-200)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--verde-claro)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'600', color:'var(--verde-escuro)' }}>
                {r.usuario.nome[0]}
              </div>
              <div>
                <p style={{ fontWeight:'600' }}>{r.usuario.nome}</p>
                <p style={{ fontSize:'13px', color:'var(--cinza-400)' }}>{r.usuario.cargo}</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:'16px' }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:'20px', fontWeight:'700', color:'var(--azul)' }}>{r.totalHoras}</p>
                <p style={{ fontSize:'11px', color:'var(--cinza-400)' }}>Total trabalhado</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:'20px', fontWeight:'700', color: r.totalExtras && r.totalExtras !== '00:00' ? 'var(--amarelo)' : 'var(--cinza-400)' }}>{r.totalExtras}</p>
                <p style={{ fontSize:'11px', color:'var(--cinza-400)' }}>Horas extras</p>
              </div>
            </div>
          </div>

          {/* Dias */}
          {Object.entries(r.diasTrabalhados).map(([dia, dados]) => (
            <div key={dia} style={{ marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--cinza-700)', minWidth:'100px' }}>
                  {format(new Date(dia + 'T12:00:00'), "dd/MM - EEE", { locale:ptBR })}
                </span>
                <span style={{ fontSize:'12px', color:'var(--cinza-400)' }}>{dados.horasTrabalhadas} trabalhadas</span>
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', paddingLeft:'108px' }}>
                {dados.pontos.map(p => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--cinza-100)', borderRadius:'8px', padding:'6px 10px' }}>
                    <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: TIPOS_COR[p.tipo], flexShrink:0 }} />
                    <span style={{ fontSize:'12px', color:'var(--cinza-700)' }}>{TIPOS_LABEL[p.tipo]}</span>
                    <span style={{ fontSize:'13px', fontWeight:'600', fontFamily:'monospace' }}>
                      {format(new Date(p.dataHora), 'HH:mm')}
                    </span>
                    {p.ajustado && <span className="badge badge-amarelo" style={{ fontSize:'10px', padding:'1px 6px' }}>Ajustado</span>}
                    <button
                      onClick={() => { setAjusteModal(p); setAjusteForm({ dataHoraNova: format(new Date(p.dataHora), "yyyy-MM-dd'T'HH:mm"), motivo:'' }); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--cinza-400)', fontSize:'12px', padding:'0 2px' }}
                      title="Ajustar horário"
                    >✏️</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Modal de ajuste */}
      {ajusteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'420px', padding:'28px' }}>
            <h2 style={{ fontSize:'17px', fontWeight:'600', marginBottom:'20px' }}>Ajuste Manual de Ponto</h2>
            <div style={{ background:'var(--cinza-100)', borderRadius:'8px', padding:'12px', marginBottom:'20px', fontSize:'13px', color:'var(--cinza-700)' }}>
              <strong>Horário original:</strong> {format(new Date(ajusteModal.dataHora), 'dd/MM/yyyy HH:mm:ss')}
            </div>
            <div style={{ display:'grid', gap:'14px' }}>
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Novo horário</label>
                <input className="input" type="datetime-local" value={ajusteForm.dataHoraNova} onChange={e => setAjusteForm(p => ({...p, dataHoraNova: e.target.value}))} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Motivo do ajuste *</label>
                <textarea className="input" rows={3} placeholder="Ex: Colaborador esqueceu de registrar a entrada..." value={ajusteForm.motivo} onChange={e => setAjusteForm(p => ({...p, motivo: e.target.value}))} style={{ resize:'vertical' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:'12px', marginTop:'20px' }}>
              <button className="btn btn-secondary btn-full" onClick={() => setAjusteModal(null)}>Cancelar</button>
              <button className="btn btn-primary btn-full" onClick={salvarAjuste} disabled={salvandoAjuste || !ajusteForm.motivo}>
                {salvandoAjuste ? 'Salvando...' : 'Confirmar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
