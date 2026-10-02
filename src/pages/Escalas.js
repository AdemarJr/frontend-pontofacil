import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { escalaService, usuarioService } from '../services/api';
import { runEscalasTour } from '../tours/escalasTour';
import FolgasCalendario from '../components/FolgasCalendario';
import { IconAction, TableActions } from '../components/ui';
import { filtrarColaboradoresSelect } from '../utils/colaboradoresSelect';

function validarJornadaCLT(cargaHorariaDiaria, _diasSemana, intervaloMinutos, { overnight = false } = {}) {
  const carga = Number(cargaHorariaDiaria) || 8;
  const maxDiaria = overnight ? 12 : 8;
  if (carga > maxDiaria) {
    return overnight
      ? 'Carga diária em turno noturno não pode exceder 12 horas.'
      : 'Carga diária não pode exceder 8 horas (CLT).';
  }
  const horas = carga;
  let minIntervalo = 0;
  if (horas > 6) minIntervalo = 60;
  else if (horas >= 4) minIntervalo = 15;
  if (overnight && Number(intervaloMinutos) === 0) return null;
  if (minIntervalo > 0 && Number(intervaloMinutos) < minIntervalo) {
    return `Intervalo mínimo para jornada de ${carga}h é ${minIntervalo} minutos (CLT).`;
  }
  return null;
}

const DIAS = [
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
  { v: 7, l: 'Dom' },
];

const STATUS_DIA_OPTS = [
  { v: 'TRABALHO', l: 'Trabalho' },
  { v: 'FOLGA', l: 'Folga' },
  { v: 'DSR', l: 'DSR' },
];

const STATUS_COR = {
  TRABALHO: { bg: 'rgba(29,158,117,0.14)', fg: 'var(--verde-escuro)', border: 'rgba(29,158,117,0.35)' },
  FOLGA: { bg: 'rgba(99,102,241,0.12)', fg: '#4338ca', border: 'rgba(99,102,241,0.30)' },
  DSR: { bg: 'rgba(124,58,237,0.12)', fg: '#5b21b6', border: 'rgba(124,58,237,0.30)' },
};

const PRESETS = {
  '5x2': {
    label: '5x2 (seg–sex)',
    tipoEscala: 'SEMANAL',
    nome: 'Escala 5x2',
    programacao: {
      1: 'TRABALHO',
      2: 'TRABALHO',
      3: 'TRABALHO',
      4: 'TRABALHO',
      5: 'TRABALHO',
      6: 'FOLGA',
      7: 'DSR',
    },
  },
  '6x1': {
    label: '6x1 (DSR no domingo)',
    tipoEscala: 'SEMANAL',
    nome: 'Escala 6x1',
    programacao: {
      1: 'TRABALHO',
      2: 'TRABALHO',
      3: 'TRABALHO',
      4: 'TRABALHO',
      5: 'TRABALHO',
      6: 'TRABALHO',
      7: 'DSR',
    },
  },
  personalizada: {
    label: 'Personalizada',
    tipoEscala: 'PERSONALIZADA',
    nome: 'Escala personalizada',
    programacao: null,
  },
  '12x36': {
    label: '12x36 (cíclica)',
    tipoEscala: 'CICLO_12X36',
    nome: 'Escala 12x36',
    programacao: {
      1: 'TRABALHO',
      2: 'TRABALHO',
      3: 'TRABALHO',
      4: 'TRABALHO',
      5: 'TRABALHO',
      6: 'TRABALHO',
      7: 'TRABALHO',
    },
  },
};

function programacaoPadrao5x2() {
  return { ...PRESETS['5x2'].programacao };
}

function diasTrabalhoFromProgramacao(programacao) {
  return DIAS.map((d) => d.v).filter((v) => programacao[v] === 'TRABALHO');
}

function labelProgramacaoResumo(programacao, diasSemana) {
  if (programacao && typeof programacao === 'object') {
    return DIAS.map((d) => {
      const st = programacao[String(d.v)] || programacao[d.v] || 'FOLGA';
      const short = st === 'TRABALHO' ? 'T' : st === 'DSR' ? 'D' : 'F';
      return `${d.l}:${short}`;
    }).join(' ');
  }
  const set = new Set(diasSemana || []);
  return DIAS.filter((d) => set.has(d.v))
    .map((d) => d.l)
    .join(', ') || '—';
}

function formInicial() {
  const programacao = programacaoPadrao5x2();
  return {
    preset: '5x2',
    nome: 'Escala 5x2',
    tipoEscala: 'SEMANAL',
    horaInicio: '08:00',
    horaFim: '17:00',
    horaSaidaAlmoco: '12:00',
    horaRetornoAlmoco: '13:00',
    programacao,
    cargaHorariaDiaria: 8,
    intervaloMinutos: 60,
    vigenciaInicio: '',
    vigenciaFim: '',
    cicloDataBase: '',
    cicloTrabalhoHoras: 12,
    cicloDescansoHoras: 36,
  };
}

export default function Escalas() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState(() => localStorage.getItem('pontofacil_escalas_usuarioId') || '');
  const [escalas, setEscalas] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [escalasPage, setEscalasPage] = useState(1);
  const [escalasPageSize, setEscalasPageSize] = useState(10);
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    usuarioService.listar().then(({ data }) => {
      const ativos = filtrarColaboradoresSelect(data);
      setUsuarios(ativos);
      setUsuarioId((atual) => (atual && ativos.some((u) => u.id === atual) ? atual : ''));
    });
  }, []);

  useEffect(() => {
    setCarregandoResumo(true);
    escalaService
      .resumo()
      .then(({ data }) => setResumo(data.escalas || []))
      .catch(() => setResumo([]))
      .finally(() => setCarregandoResumo(false));
  }, []);

  useEffect(() => {
    setEscalasPage(1);
  }, [usuarioId]);

  useEffect(() => {
    if (usuarioId) localStorage.setItem('pontofacil_escalas_usuarioId', usuarioId);
    else localStorage.removeItem('pontofacil_escalas_usuarioId');
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) {
      setEscalas([]);
      return;
    }
    setCarregando(true);
    escalaService
      .listar(usuarioId)
      .then(({ data }) => setEscalas(data))
      .finally(() => setCarregando(false));
  }, [usuarioId]);

  function aplicarPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    setForm((p) => ({
      ...p,
      preset: presetKey,
      tipoEscala: preset.tipoEscala,
      nome: preset.nome || p.nome,
      programacao: preset.programacao ? { ...preset.programacao } : { ...p.programacao },
      ...(presetKey === '12x36'
        ? {
            horaInicio: p.horaInicio || '07:00',
            horaFim: p.horaFim === '17:00' ? '19:00' : p.horaFim,
            cargaHorariaDiaria: 12,
            intervaloMinutos: 0,
            horaSaidaAlmoco: '',
            horaRetornoAlmoco: '',
            cicloTrabalhoHoras: 12,
            cicloDescansoHoras: 36,
          }
        : {}),
    }));
    setErro('');
  }

  function setStatusDia(dia, status) {
    setForm((p) => ({
      ...p,
      preset: 'personalizada',
      tipoEscala: p.tipoEscala === 'CICLO_12X36' ? 'CICLO_12X36' : 'PERSONALIZADA',
      programacao: { ...p.programacao, [dia]: status },
    }));
  }

  async function criarEscala(e) {
    e.preventDefault();
    const diasTrabalho = diasTrabalhoFromProgramacao(form.programacao);
    if (!usuarioId) {
      setErro('Selecione o colaborador.');
      return;
    }
    if (diasTrabalho.length === 0 && form.tipoEscala !== 'CICLO_12X36') {
      setErro('Marque pelo menos um dia como Trabalho.');
      return;
    }
    if (form.tipoEscala === 'CICLO_12X36' && !form.cicloDataBase) {
      setErro('Para 12x36, informe a data-base do ciclo.');
      return;
    }
    if (form.vigenciaInicio && form.vigenciaFim && form.vigenciaInicio > form.vigenciaFim) {
      setErro('Vigência início não pode ser posterior ao fim.');
      return;
    }

    const overnight = Boolean(form.horaInicio && form.horaFim && form.horaFim <= form.horaInicio);
    const errClt = validarJornadaCLT(form.cargaHorariaDiaria, diasTrabalho, form.intervaloMinutos, {
      overnight: overnight || form.tipoEscala === 'CICLO_12X36',
    });
    if (errClt) {
      setErro(errClt);
      return;
    }

    const programacaoSemana = {};
    DIAS.forEach((d) => {
      programacaoSemana[String(d.v)] = form.programacao[d.v] || 'FOLGA';
    });

    setErro('');
    setSalvando(true);
    try {
      await escalaService.criar({
        usuarioId,
        nome: form.nome,
        horaInicio: form.horaInicio,
        horaFim: form.horaFim,
        horaSaidaAlmoco: form.horaSaidaAlmoco || null,
        horaRetornoAlmoco: form.horaRetornoAlmoco || null,
        diasSemana: diasTrabalho.length ? diasTrabalho : [1],
        programacaoSemana,
        tipoEscala: form.tipoEscala,
        vigenciaInicio: form.vigenciaInicio || null,
        vigenciaFim: form.vigenciaFim || null,
        cicloDataBase: form.tipoEscala === 'CICLO_12X36' ? form.cicloDataBase || null : null,
        cicloTrabalhoHoras:
          form.tipoEscala === 'CICLO_12X36' ? Number(form.cicloTrabalhoHoras) || 12 : null,
        cicloDescansoHoras:
          form.tipoEscala === 'CICLO_12X36' ? Number(form.cicloDescansoHoras) || 36 : null,
        cargaHorariaDiaria: Number(form.cargaHorariaDiaria),
        intervaloMinutos: Number(form.intervaloMinutos),
        ativo: true,
      });
      const { data } = await escalaService.listar(usuarioId);
      setEscalas(data);
      escalaService
        .resumo()
        .then(({ data: r }) => setResumo(r.escalas || []))
        .catch(() => {});
      setForm(formInicial());
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar escala');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id) {
    if (!window.confirm('Remover esta escala?')) return;
    setErro('');
    try {
      await escalaService.remover(id);
      const { data } = await escalaService.listar(usuarioId);
      setEscalas(data);
      escalaService
        .resumo()
        .then(({ data: r }) => setResumo(r.escalas || []))
        .catch(() => {});
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao remover escala');
    }
  }

  async function toggleAtivo(esc) {
    setErro('');
    try {
      await escalaService.atualizar(esc.id, { ativo: !esc.ativo });
      const { data } = await escalaService.listar(usuarioId);
      setEscalas(data);
      escalaService
        .resumo()
        .then(({ data: r }) => setResumo(r.escalas || []))
        .catch(() => {});
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao atualizar escala');
    }
  }

  const cols = usuarios.find((u) => u.id === usuarioId);
  const isCiclo = form.tipoEscala === 'CICLO_12X36';
  const overnight = Boolean(form.horaInicio && form.horaFim && form.horaFim <= form.horaInicio);
  const maxCarga = overnight || isCiclo ? 12 : 8;

  const { pageItems: escalasPagina, total: totalEscalas, safePage: escalasSafePage } = useMemo(
    () => slicePaged(escalas, escalasPage, escalasPageSize),
    [escalas, escalasPage, escalasPageSize]
  );

  useEffect(() => {
    if (escalasSafePage !== escalasPage) setEscalasPage(escalasSafePage);
  }, [escalasSafePage, escalasPage]);

  return (
    <Layout>
      <div id="tour-escalas-header" style={{ marginBottom: '28px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Jornadas, escalas e folgas</h1>
          <p style={{ color: 'var(--cinza-400)', fontSize: '14px', maxWidth: '560px' }}>
            Configure a programação por dia (Trabalho, Folga ou DSR). O espelho e a apuração usam a escala
            vigente do colaborador — sábado e domingo só são descanso se a escala disser isso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => runEscalasTour({ force: true })}
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
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>Escalas criadas</h2>
        <p style={{ fontSize: 13, color: 'var(--cinza-400)', marginTop: 0, marginBottom: 12 }}>
          Escalas ativas por colaborador. Clique em Abrir para editar ou cadastrar outra vigência.
        </p>

        {carregandoResumo ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <div className="spinner" />
          </div>
        ) : resumo.length === 0 ? (
          <div style={{ color: 'var(--cinza-400)', fontSize: 13 }}>
            Nenhuma escala ativa cadastrada ainda.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="tabela" style={{ fontSize: 13, minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Escala</th>
                  <th>Tipo</th>
                  <th>Horário</th>
                  <th>Programação</th>
                  <th>Vigência</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((row) => (
                  <tr key={row.escala.id}>
                    <td style={{ fontWeight: 700 }}>{row.usuario?.nome}</td>
                    <td>{row.escala.nome}</td>
                    <td style={{ fontSize: 12 }}>{row.escala.tipoEscala || 'SEMANAL'}</td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {row.escala.horaInicio}–{row.escala.horaFim}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {labelProgramacaoResumo(row.escala.programacaoSemana, row.escala.diasSemana)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--cinza-400)' }}>
                      {row.escala.vigenciaInicio || '…'} → {row.escala.vigenciaFim || '…'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setUsuarioId(row.usuario.id)}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div id="tour-escalas-colaborador" className="card" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
          Colaborador
        </label>
        <select
          className="input"
          style={{ maxWidth: '400px' }}
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
        >
          <option value="">Selecione…</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </div>

      <p id="tour-escalas-dica" style={{ fontSize: 13, color: 'var(--cinza-400)', maxWidth: 560, margin: '0 0 16px', lineHeight: 1.45 }}>
        Selecione um colaborador para cadastrar horário e a programação semanal (Trabalho / Folga / DSR).
      </p>

      {usuarioId && (
        <>
          <div id="tour-escalas-form" className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Nova escala</h2>
            <form onSubmit={criarEscala} style={{ display: 'grid', gap: '14px', maxWidth: '640px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Tipo / preset</label>
                <select
                  className="input"
                  value={form.preset}
                  onChange={(e) => aplicarPreset(e.target.value)}
                >
                  {Object.entries(PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Nome da escala</label>
                <input
                  className="input"
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                />
              </div>

              <div id="tour-escalas-horarios" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Entrada</label>
                  <input
                    className="input"
                    type="time"
                    value={form.horaInicio}
                    onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Saída</label>
                  <input
                    className="input"
                    type="time"
                    value={form.horaFim}
                    onChange={(e) => setForm((p) => ({ ...p, horaFim: e.target.value }))}
                  />
                </div>
              </div>

              {overnight ? (
                <p style={{ fontSize: 12, color: 'var(--verde-escuro)', margin: 0, lineHeight: 1.45 }}>
                  Turno noturno detectado (cruza meia-noite). A saída no dia seguinte fecha o plantão do dia de entrada.
                </p>
              ) : null}

              {!isCiclo && (
                <div id="tour-escalas-almoco" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Saída almoço (esperado)</label>
                    <input
                      className="input"
                      type="time"
                      value={form.horaSaidaAlmoco}
                      onChange={(e) => setForm((p) => ({ ...p, horaSaidaAlmoco: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Retorno almoço (esperado)</label>
                    <input
                      className="input"
                      type="time"
                      value={form.horaRetornoAlmoco}
                      onChange={(e) => setForm((p) => ({ ...p, horaRetornoAlmoco: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div id="tour-escalas-carga" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>
                    Carga horária líquida (h/dia{maxCarga === 12 ? ', máx. 12' : ', máx. 8 CLT'})
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.5"
                    min="1"
                    max={maxCarga}
                    value={form.cargaHorariaDiaria}
                    onChange={(e) => setForm((p) => ({ ...p, cargaHorariaDiaria: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Intervalo mínimo (min)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="180"
                    value={form.intervaloMinutos}
                    onChange={(e) => setForm((p) => ({ ...p, intervaloMinutos: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Vigência início</label>
                  <input
                    className="input"
                    type="date"
                    value={form.vigenciaInicio}
                    onChange={(e) => setForm((p) => ({ ...p, vigenciaInicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Vigência fim (opcional)</label>
                  <input
                    className="input"
                    type="date"
                    value={form.vigenciaFim}
                    onChange={(e) => setForm((p) => ({ ...p, vigenciaFim: e.target.value }))}
                  />
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--cinza-400)', margin: 0, lineHeight: 1.45 }}>
                Para trocar a escala sem alterar o histórico, feche a vigência da escala atual e cadastre uma nova
                com data de início futura.
              </p>

              {isCiclo && (
                <div style={{ display: 'grid', gap: 12, padding: 12, borderRadius: 8, background: 'rgba(148,163,184,0.08)' }}>
                  <p style={{ fontSize: 12, margin: 0, color: 'var(--cinza-700)', lineHeight: 1.45 }}>
                    Escala 12x36: o ciclo é calculado a partir da data-base (trabalho + descanso em horas),
                    independente de sábado/domingo. A programação semanal abaixo é só referência visual —
                    a apuração usa o ciclo.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Data-base</label>
                      <input
                        className="input"
                        type="date"
                        value={form.cicloDataBase}
                        onChange={(e) => setForm((p) => ({ ...p, cicloDataBase: e.target.value }))}
                        required={isCiclo}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Trabalho (h)</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={form.cicloTrabalhoHoras}
                        onChange={(e) => setForm((p) => ({ ...p, cicloTrabalhoHoras: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Descanso (h)</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={form.cicloDescansoHoras}
                        onChange={(e) => setForm((p) => ({ ...p, cicloDescansoHoras: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div id="tour-escalas-dias">
                <span style={{ fontSize: '12px', color: 'var(--cinza-400)', display: 'block', marginBottom: '8px' }}>
                  Programação semanal
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
                  {DIAS.map((d) => {
                    const st = form.programacao[d.v] || 'FOLGA';
                    const cor = STATUS_COR[st] || STATUS_COR.FOLGA;
                    return (
                      <div
                        key={d.v}
                        style={{
                          border: `1px solid ${cor.border}`,
                          borderRadius: 8,
                          padding: '8px 6px',
                          background: cor.bg,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: cor.fg, marginBottom: 6 }}>{d.l}</div>
                        <select
                          className="input"
                          value={st}
                          onChange={(e) => setStatusDia(d.v, e.target.value)}
                          style={{
                            fontSize: 11,
                            padding: '4px 2px',
                            color: cor.fg,
                            background: 'rgba(255,255,255,0.85)',
                            border: '1px solid transparent',
                          }}
                        >
                          {STATUS_DIA_OPTS.map((o) => (
                            <option key={o.v} value={o.v}>
                              {o.l}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: 'var(--cinza-400)', margin: '8px 0 0', lineHeight: 1.45 }}>
                  T = Trabalho · F = Folga · D = DSR (descanso semanal). Alterar um dia muda o preset para Personalizada.
                </p>
              </div>

              {erro && (
                <div style={{ color: 'var(--vermelho)', fontSize: '13px' }}>{erro}</div>
              )}
              <div id="tour-escalas-salvar">
                <button className="btn btn-primary" type="submit" disabled={salvando} style={{ maxWidth: '200px' }}>
                  {salvando ? 'Salvando…' : 'Adicionar escala'}
                </button>
              </div>
            </form>
          </div>

          <div id="tour-escalas-lista" className="card">
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Escalas de {cols?.nome}
            </h2>
            {carregando ? (
              <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ) : escalas.length === 0 ? (
              <p style={{ color: 'var(--cinza-400)', fontSize: '14px' }}>Nenhuma escala cadastrada.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {escalasPagina.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--cinza-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      opacity: e.ativo ? 1 : 0.65,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '14px' }}>{e.nome}</strong>
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--cinza-400)' }}>
                        {e.tipoEscala || 'SEMANAL'}
                        {!e.ativo ? ' · inativa' : ''}
                      </span>
                      <p style={{ fontSize: '13px', color: 'var(--cinza-400)', marginTop: '4px' }}>
                        {e.horaInicio} – {e.horaFim} · {e.cargaHorariaDiaria}h/dia · intervalo {e.intervaloMinutos} min
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--cinza-400)', fontFamily: 'monospace' }}>
                        {labelProgramacaoResumo(e.programacaoSemana, e.diasSemana)}
                      </p>
                      {(e.vigenciaInicio || e.vigenciaFim) && (
                        <p style={{ fontSize: '12px', color: 'var(--cinza-400)', marginTop: 2 }}>
                          Vigência: {e.vigenciaInicio || '…'} → {e.vigenciaFim || '…'}
                        </p>
                      )}
                      {e.tipoEscala === 'CICLO_12X36' && e.cicloDataBase && (
                        <p style={{ fontSize: '12px', color: 'var(--cinza-400)', marginTop: 2 }}>
                          Ciclo: base {e.cicloDataBase} · {e.cicloTrabalhoHoras || 12}h / {e.cicloDescansoHoras || 36}h
                        </p>
                      )}
                    </div>
                    <TableActions>
                      <IconAction
                        icon={e.ativo ? 'suspender' : 'reativar'}
                        label={e.ativo ? 'Desativar' : 'Ativar'}
                        tone={e.ativo ? 'warning' : 'success'}
                        onClick={() => toggleAtivo(e)}
                      />
                      <IconAction
                        icon="excluir"
                        label="Excluir"
                        tone="danger"
                        onClick={() => remover(e.id)}
                      />
                    </TableActions>
                  </div>
                ))}
              </div>
            )}
            {escalas.length > 0 && !carregando && (
              <ListPagination
                style={{ marginTop: '20px' }}
                page={escalasSafePage}
                pageSize={escalasPageSize}
                total={totalEscalas}
                onPageChange={setEscalasPage}
                onPageSizeChange={(n) => {
                  setEscalasPageSize(n);
                  setEscalasPage(1);
                }}
              />
            )}
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Folgas de {cols?.nome}</h2>
            <p style={{ fontSize: 13, color: 'var(--cinza-400)', marginTop: 0, marginBottom: 16 }}>
              Calendário do mês com o status de cada dia (inclui DSR da escala). Clique para marcar{' '}
              <strong>folga</strong> manual ou <strong>justificar falta</strong>.
            </p>
            <FolgasCalendario usuarioId={usuarioId} usuarioNome={cols?.nome} />
          </div>
        </>
      )}
    </Layout>
  );
}
