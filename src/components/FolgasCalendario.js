import { useCallback, useEffect, useMemo, useState } from 'react';
import { comprovanteAusenciaService, relatorioService } from '../services/api';

const STATUS_DIA_COR = {
  TRABALHADO: { bg: 'rgba(29,158,117,0.16)', fg: 'var(--verde-escuro)', label: 'Trabalhado' },
  PARCIAL: { bg: 'rgba(245,158,11,0.18)', fg: '#92400e', label: 'Parcial' },
  FALTA: { bg: 'rgba(226,75,74,0.16)', fg: 'var(--vermelho)', label: 'Falta' },
  FOLGA: { bg: 'rgba(99,102,241,0.18)', fg: '#4338ca', label: 'Folga' },
  JUSTIFICADA: { bg: 'rgba(14,165,233,0.18)', fg: '#0369a1', label: 'Justificada' },
  FERIAS: { bg: 'rgba(16,185,129,0.18)', fg: 'var(--verde-escuro)', label: 'Férias' },
  FERIADO: { bg: 'rgba(59,130,246,0.18)', fg: 'var(--azul)', label: 'Feriado' },
  ANTES_ADMISSAO: { bg: 'rgba(148,163,184,0.14)', fg: 'var(--cinza-400)', label: 'Antes da admissão' },
  POS_DEMISSAO: { bg: 'rgba(148,163,184,0.14)', fg: 'var(--cinza-400)', label: 'Após demissão' },
  EM_ABERTO: { bg: 'rgba(148,163,184,0.14)', fg: 'var(--cinza-700)', label: 'Em aberto' },
  FUTURO: { bg: 'rgba(148,163,184,0.08)', fg: 'var(--cinza-400)', label: 'A cumprir' },
};

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const pad2 = (n) => String(n).padStart(2, '0');

const PODE_MARCAR = new Set(['FALTA', 'PARCIAL', 'EM_ABERTO', 'FUTURO']);

/**
 * Calendário mensal de folgas/justificativas de um colaborador.
 * Clicar num dia abre opções: marcar folga, justificar falta ou remover marcador manual.
 */
export default function FolgasCalendario({ usuarioId, usuarioNome }) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [dias, setDias] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [diaModal, setDiaModal] = useState(null);
  const [motivoJustificativa, setMotivoJustificativa] = useState('');

  const carregar = useCallback(async () => {
    if (!usuarioId) return;
    setCarregando(true);
    setErro('');
    try {
      const { data } = await relatorioService.espelhoPonto({ mes, ano, usuarioId });
      const reg = (data.relatorio || []).find((r) => r.usuario?.id === usuarioId);
      setDias(reg?.diasTrabalhados || {});
    } catch (e) {
      setErro(e?.response?.data?.error || 'Não foi possível carregar o calendário.');
      setDias({});
    } finally {
      setCarregando(false);
    }
  }, [usuarioId, mes, ano]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function mudarMes(delta) {
    let m = mes + delta;
    let a = ano;
    if (m < 1) {
      m = 12;
      a -= 1;
    } else if (m > 12) {
      m = 1;
      a += 1;
    }
    setMes(m);
    setAno(a);
  }

  function abrirDia(diaIso, dados) {
    const status = dados?.statusDia;
    const ausencia = dados?.contextoDia?.ausencia;
    if (status === 'FERIAS' || status === 'FERIADO') return;
    if (ausencia && !ausencia.manual) return;
    if (!ausencia?.manual && status && !PODE_MARCAR.has(status)) return;
    setMotivoJustificativa('');
    setDiaModal({ diaIso, dados, status, ausencia });
  }

  function fecharModal() {
    if (salvando) return;
    setDiaModal(null);
    setMotivoJustificativa('');
  }

  async function marcarFolga() {
    if (!diaModal) return;
    setSalvando(true);
    setErro('');
    try {
      await comprovanteAusenciaService.registrarFolga({
        usuarioId,
        dataReferencia: diaModal.diaIso,
        dataFim: diaModal.diaIso,
        tipo: 'FOLGA',
      });
      fecharModal();
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.error || 'Não foi possível registrar a folga.');
    } finally {
      setSalvando(false);
    }
  }

  async function justificarDia() {
    if (!diaModal) return;
    if (!String(motivoJustificativa || '').trim()) {
      setErro('Informe o motivo da justificativa.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await comprovanteAusenciaService.registrarFolga({
        usuarioId,
        dataReferencia: diaModal.diaIso,
        dataFim: diaModal.diaIso,
        descricao: String(motivoJustificativa).trim(),
        tipo: 'JUSTIFICATIVA',
      });
      fecharModal();
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.error || 'Não foi possível justificar o dia.');
    } finally {
      setSalvando(false);
    }
  }

  async function removerMarcador() {
    if (!diaModal?.ausencia?.id) return;
    setSalvando(true);
    setErro('');
    try {
      await comprovanteAusenciaService.removerFolga(diaModal.ausencia.id);
      fecharModal();
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.error || 'Não foi possível remover.');
    } finally {
      setSalvando(false);
    }
  }

  const celulas = useMemo(() => {
    const primeiroDow = new Date(ano, mes - 1, 1).getDay();
    const totalDias = new Date(ano, mes, 0).getDate();
    const arr = [];
    for (let i = 0; i < primeiroDow; i++) arr.push(null);
    for (let d = 1; d <= totalDias; d++) arr.push(d);
    return arr;
  }, [mes, ano]);

  const statusPresentes = useMemo(() => {
    const set = new Set();
    Object.values(dias).forEach((d) => d?.statusDia && set.add(d.statusDia));
    return [...set];
  }, [dias]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => mudarMes(-1)}>
            ‹
          </button>
          <strong style={{ fontSize: 15, minWidth: 150, textAlign: 'center' }}>
            {MESES[mes - 1]} {ano}
          </strong>
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => mudarMes(1)}>
            ›
          </button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--cinza-400)' }}>
          Clique num dia para <strong>folga</strong> ou <strong>justificar</strong>.
        </span>
      </div>

      {erro && !diaModal && <div style={{ color: 'var(--vermelho)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {DOW.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--cinza-400)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
        {celulas.map((d, idx) => {
          if (d === null) return <div key={`b-${idx}`} />;
          const diaIso = `${ano}-${pad2(mes)}-${pad2(d)}`;
          const dados = dias[diaIso];
          const status = dados?.statusDia;
          const cor = STATUS_DIA_COR[status] || { bg: 'rgba(148,163,184,0.10)', fg: 'var(--cinza-400)', label: '' };
          const ausencia = dados?.contextoDia?.ausencia;
          const bloqueado =
            status === 'FERIAS' ||
            status === 'FERIADO' ||
            (ausencia && !ausencia.manual) ||
            (!ausencia?.manual && status && !PODE_MARCAR.has(status));
          const editavel = !bloqueado;
          return (
            <button
              key={diaIso}
              type="button"
              disabled={bloqueado || carregando}
              onClick={() => abrirDia(diaIso, dados)}
              title={
                bloqueado
                  ? `${cor.label} (não editável por aqui)`
                  : ausencia?.manual
                    ? `${cor.label} — clique para remover ou alterar`
                    : 'Clique para folga ou justificativa'
              }
              style={{
                minHeight: 58,
                borderRadius: 10,
                border:
                  status === 'FOLGA'
                    ? '2px solid #6366f1'
                    : status === 'JUSTIFICADA'
                      ? '2px solid #0ea5e9'
                      : '1px solid var(--cinza-200)',
                background: cor.bg,
                color: cor.fg,
                cursor: editavel ? 'pointer' : 'default',
                opacity: bloqueado ? 0.65 : 1,
                padding: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 14 }}>{d}</span>
              {status ? (
                <span style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{cor.label}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {carregando && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
          <div className="spinner" />
        </div>
      )}

      {statusPresentes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {statusPresentes.map((s) => {
            const c = STATUS_DIA_COR[s];
            if (!c) return null;
            return (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--cinza-700)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: c.bg, border: `1px solid ${c.fg}` }} />
                {c.label}
              </span>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 12, lineHeight: 1.45 }}>
        Folga fixa toda semana → cadastre na <strong>escala</strong> acima. Use o calendário para folgas avulsas e faltas
        justificadas. Férias, feriados e atestados com documento não são editáveis aqui.
      </p>

      {diaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={fecharModal}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 420, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 4 }}>
              {diaModal.diaIso.split('-').reverse().join('/')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--cinza-400)', marginTop: 0, marginBottom: 16 }}>
              {STATUS_DIA_COR[diaModal.status]?.label || diaModal.status}
              {diaModal.ausencia?.descricao ? ` — ${diaModal.ausencia.descricao}` : ''}
            </p>

            {erro && (
              <div style={{ color: 'var(--vermelho)', fontSize: 13, marginBottom: 12 }}>{erro}</div>
            )}

            {diaModal.ausencia?.manual ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <p style={{ fontSize: 13, color: 'var(--cinza-600)', margin: 0 }}>
                  Este dia já está marcado como{' '}
                  <strong>{diaModal.ausencia.tipo === 'FOLGA' ? 'folga' : 'falta justificada'}</strong>.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  disabled={salvando}
                  onClick={removerMarcador}
                  style={{ color: 'var(--vermelho)' }}
                >
                  {salvando ? 'Removendo…' : 'Remover marcação'}
                </button>
                <button type="button" className="btn btn-secondary btn-full" disabled={salvando} onClick={fecharModal}>
                  Fechar
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <button type="button" className="btn btn-primary btn-full" disabled={salvando} onClick={marcarFolga}>
                  {salvando ? 'Salvando…' : '🌴 Marcar folga'}
                </button>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    Motivo da justificativa *
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Ex: Consulta médica, problema pessoal…"
                    value={motivoJustificativa}
                    onChange={(e) => setMotivoJustificativa(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  disabled={salvando || !String(motivoJustificativa || '').trim()}
                  onClick={justificarDia}
                >
                  {salvando ? 'Salvando…' : '📝 Justificar falta'}
                </button>
                <button type="button" className="btn btn-secondary btn-full" disabled={salvando} onClick={fecharModal}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
