import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { escalaService, usuarioService } from '../services/api';
import { runEscalasTour } from '../tours/escalasTour';

const DIAS = [
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
  { v: 7, l: 'Dom' },
];

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
  const [form, setForm] = useState({
    nome: 'Jornada padrão',
    horaInicio: '08:00',
    horaFim: '17:00',
    horaSaidaAlmoco: '12:00',
    horaRetornoAlmoco: '13:00',
    diasSemana: [1, 2, 3, 4, 5],
    cargaHorariaDiaria: 8,
    intervaloMinutos: 60,
  });

  useEffect(() => {
    usuarioService.listar().then(({ data }) => {
      setUsuarios(data.filter((u) => u.role === 'COLABORADOR'));
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
    const t = setTimeout(() => runEscalasTour({ force: false }), 700);
    return () => clearTimeout(t);
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

  function toggleDia(v) {
    setForm((p) => {
      const set = new Set(p.diasSemana);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      return { ...p, diasSemana: [...set].sort((a, b) => a - b) };
    });
  }

  async function criarEscala(e) {
    e.preventDefault();
    if (!usuarioId || form.diasSemana.length === 0) {
      setErro('Selecione o colaborador e pelo menos um dia da semana.');
      return;
    }
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
        diasSemana: form.diasSemana,
        cargaHorariaDiaria: Number(form.cargaHorariaDiaria),
        intervaloMinutos: Number(form.intervaloMinutos),
        ativo: true,
      });
      const { data } = await escalaService.listar(usuarioId);
      setEscalas(data);
      escalaService
        .resumo()
        .then(({ data }) => setResumo(data.escalas || []))
        .catch(() => {});
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar escala');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id) {
    if (!window.confirm('Remover esta escala?')) return;
    await escalaService.remover(id);
    const { data } = await escalaService.listar(usuarioId);
    setEscalas(data);
    escalaService
      .resumo()
      .then(({ data }) => setResumo(data.escalas || []))
      .catch(() => {});
  }

  async function toggleAtivo(esc) {
    await escalaService.atualizar(esc.id, { ativo: !esc.ativo });
    const { data } = await escalaService.listar(usuarioId);
    setEscalas(data);
    escalaService
      .resumo()
      .then(({ data }) => setResumo(data.escalas || []))
      .catch(() => {});
  }

  const cols = usuarios.find((u) => u.id === usuarioId);

  const { pageItems: escalasPagina, total: totalEscalas, safePage: escalasSafePage } = useMemo(
    () => slicePaged(escalas, escalasPage, escalasPageSize),
    [escalas, escalasPage, escalasPageSize]
  );

  return (
    <Layout>
      <div id="tour-escalas-header" style={{ marginBottom: '28px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Jornadas e escalas</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: '14px', maxWidth: '560px' }}>
          Defina horário de entrada, intervalo e saída esperados. O espelho de ponto e o resumo de banco de
          horas usam a escala ativa nos dias da semana marcados.
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
          Aqui aparecem automaticamente as escalas ativas por colaborador. Clique em um nome para abrir os detalhes e editar.
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
            <table className="tabela" style={{ fontSize: 13, minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Escala</th>
                  <th>Horário</th>
                  <th>Dias</th>
                  <th>Atualizada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {resumo.map((row) => (
                  <tr key={row.escala.id}>
                    <td style={{ fontWeight: 700 }}>{row.usuario?.nome}</td>
                    <td>{row.escala.nome}</td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {row.escala.horaInicio}–{row.escala.horaFim}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {(row.escala.diasSemana || []).join(',')}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--cinza-400)' }}>
                      {row.escala.updatedAt ? new Date(row.escala.updatedAt).toLocaleDateString('pt-BR') : '—'}
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
        Selecione um colaborador acima para cadastrar horários, intervalo de almoço e dias da semana; as escalas aparecem na lista abaixo.
      </p>

      {usuarioId && (
        <>
          <div id="tour-escalas-form" className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Nova escala</h2>
            <form onSubmit={criarEscala} style={{ display: 'grid', gap: '14px', maxWidth: '560px' }}>
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
              <div id="tour-escalas-carga" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Carga horária líquida (h/dia)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    value={form.cargaHorariaDiaria}
                    onChange={(e) => setForm((p) => ({ ...p, cargaHorariaDiaria: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>Intervalo mínimo (min)</label>
                  <input
                    className="input"
                    type="number"
                    min="30"
                    max="180"
                    value={form.intervaloMinutos}
                    onChange={(e) => setForm((p) => ({ ...p, intervaloMinutos: e.target.value }))}
                  />
                </div>
              </div>
              <div id="tour-escalas-dias">
                <span style={{ fontSize: '12px', color: 'var(--cinza-400)', display: 'block', marginBottom: '8px' }}>
                  Dias da semana
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DIAS.map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => toggleDia(d.v)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: form.diasSemana.includes(d.v)
                          ? '2px solid var(--verde)'
                          : '1px solid var(--cinza-200)',
                        background: form.diasSemana.includes(d.v) ? 'var(--verde-claro)' : 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
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
                      <p style={{ fontSize: '13px', color: 'var(--cinza-400)', marginTop: '4px' }}>
                        {e.horaInicio} – {e.horaFim} · {e.cargaHorariaDiaria}h/dia · intervalo mín. {e.intervaloMinutos} min
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--cinza-400)' }}>
                        Dias:{' '}
                        {e.diasSemana
                          ?.map((d) => DIAS.find((x) => x.v === d)?.l)
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => toggleAtivo(e)}
                      >
                        {e.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--vermelho)' }}
                        onClick={() => remover(e.id)}
                      >
                        Excluir
                      </button>
                    </div>
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
        </>
      )}
    </Layout>
  );
}
