// src/pages/Colaboradores.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../components/dashboard/Layout';
import Modal from '../components/Modal';
import SystemMessage from '../components/SystemMessage';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { usuarioService, localRegistroService } from '../services/api';
import { runColaboradoresTour } from '../tours/colaboradoresTour';
import { useAuth } from '../hooks/useAuth';
import { mensagemAposCriarColaborador, mensagemLimitePlano } from '../utils/colaboradorFeedback';
import { IconAction, TableActions } from '../components/ui';

export default function Colaboradores() {
  const { isAdmin, usuario: usuarioLogado, folhaHabilitada } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(null); // null | 'criar' | {usuario}
  const [form, setForm] = useState({ nome:'', email:'', pin:'', cargo:'', departamento:'', role:'COLABORADOR' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  /** @type {[null | { type: string, title?: string, text: string }, Function]} */
  const [avisoSistema, setAvisoSistema] = useState(null);
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pinsVisiveis, setPinsVisiveis] = useState(() => new Set());
  const [pinsGerados, setPinsGerados] = useState(() => ({})); // { [usuarioId]: pinGerado }
  const [pinsCarregando, setPinsCarregando] = useState(() => new Set());
  const [locais, setLocais] = useState([]);
  /** null | 'salvar' | { tipo: 'excluir', usuario } */
  const [confirmacao, setConfirmacao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    setPage(1);
  }, [busca]);
  useEffect(() => {
    localRegistroService.listar().then(({ data }) => setLocais(data)).catch(() => setLocais([]));
  }, []);

  async function carregar() {
    try {
      const { data } = await usuarioService.listar();
      setUsuarios(data);
    } finally { setCarregando(false); }
  }

  function gerarPinAleatorio() {
    // 4 dígitos numéricos
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function gerarPinParaFormulario() {
    const novoPin = gerarPinAleatorio();
    setForm((p) => ({ ...p, pin: novoPin }));
  }

  async function gerarEAplicarNovoPin(usuarioId) {
    const novoPin = gerarPinAleatorio();
    await usuarioService.atualizar(usuarioId, { pin: novoPin });
    setPinsGerados((p) => ({ ...p, [usuarioId]: novoPin }));
    setPinsVisiveis((prev) => new Set(prev).add(usuarioId));
    carregar();
  }

  async function togglePinVisivel(usuarioId) {
    setPinsVisiveis((prev) => {
      const next = new Set(prev);
      if (next.has(usuarioId)) next.delete(usuarioId);
      else next.add(usuarioId);
      return next;
    });

    // Se já temos o PIN em cache (gerado/resetado ou buscado), não precisa buscar.
    if (pinsGerados[usuarioId]) return;
    if (!isAdmin) return;

    setPinsCarregando((prev) => new Set(prev).add(usuarioId));
    try {
      const { data } = await usuarioService.obterPin(usuarioId);
      setPinsGerados((p) => ({ ...p, [usuarioId]: data.pin }));
    } catch (e) {
      setAvisoSistema({
        type: 'warning',
        title: 'PIN não disponível',
        text: e.response?.data?.error || 'Não foi possível obter o PIN. Use “Reset PIN” se necessário.',
      });
    } finally {
      setPinsCarregando((prev) => {
        const next = new Set(prev);
        next.delete(usuarioId);
        return next;
      });
    }
  }

  function abrirCriar() {
    const pinInicial = gerarPinAleatorio();
    setForm({
      nome:'', email:'', pin: pinInicial, cargo:'', departamento:'', role:'COLABORADOR',
      localRegistroId:'', isentoGeofence: false, dataAdmissao:'', dataDemissao:'',
      cpf:'', pis:'', matricula:'', tipoContrato:'CLT', salarioBase:'',
      categoriaProfissional:'', dependentesIrrf:0,
      contaBanco:'', contaAgencia:'', contaNumero:'', contaTipo:'',
      usaVt: false, valorVtMensal:'', descontoVaMensal:'', descontoPlanoSaudeMensal:'',
    });
    setErro('');
    setAvisoSistema(null);
    setModal('criar');
  }

  function abrirEditar(u) {
    const toLocalDate = (v) => {
      if (!v) return '';
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    setForm({
      nome:u.nome,
      email:u.email,
      pin:'',
      cargo:u.cargo||'',
      departamento:u.departamento||'',
      role:u.role,
      ativo:u.ativo,
      localRegistroId: u.localRegistroId || '',
      isentoGeofence: Boolean(u.isentoGeofence),
      dataAdmissao: toLocalDate(u.dataAdmissao),
      dataDemissao: toLocalDate(u.dataDemissao),
      cpf: u.cpf || '',
      pis: u.pis || '',
      matricula: u.matricula || '',
      tipoContrato: u.tipoContrato || 'CLT',
      salarioBase: u.salarioBase != null ? String(u.salarioBase) : '',
      categoriaProfissional: u.categoriaProfissional || '',
      dependentesIrrf: u.dependentesIrrf ?? 0,
      contaBanco: u.contaBanco || '',
      contaAgencia: u.contaAgencia || '',
      contaNumero: u.contaNumero || '',
      contaTipo: u.contaTipo || '',
      usaVt: Boolean(u.usaVt),
      valorVtMensal: u.valorVtMensal != null ? String(u.valorVtMensal) : '',
      descontoVaMensal: u.descontoVaMensal != null ? String(u.descontoVaMensal) : '',
      descontoPlanoSaudeMensal: u.descontoPlanoSaudeMensal != null ? String(u.descontoPlanoSaudeMensal) : '',
    });
    setErro('');
    setModal(u);
  }

  async function executarSalvar() {
    setConfirmacao(null);
    setErro('');
    setSalvando(true);
    try {
      const payload = { ...form };
      if (payload.localRegistroId === '') {
        if (modal === 'criar') delete payload.localRegistroId;
        else payload.localRegistroId = null;
      }
      if (payload.dataAdmissao === '') delete payload.dataAdmissao;
      if (payload.dataDemissao === '') delete payload.dataDemissao;
      if (modal === 'criar') {
        const { data } = await usuarioService.criar(payload);
        setAvisoSistema(mensagemAposCriarColaborador(data));
      } else {
        await usuarioService.atualizar(modal.id, payload);
        setAvisoSistema({
          type: 'success',
          title: 'Alterações salvas',
          text: `Os dados de "${form.nome || modal.nome}" foram atualizados.`,
        });
      }
      setModal(null);
      try {
        await carregar();
      } catch (reloadErr) {
        console.error('[Colaboradores] Lista não atualizou após salvar:', reloadErr);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'PLAN_USER_LIMIT') {
        const msg = mensagemLimitePlano(data);
        setErro(msg.text);
        setAvisoSistema(msg);
      } else {
        const msg = data?.error || err.message || 'Erro ao salvar';
        setErro(msg);
        setAvisoSistema({ type: 'error', title: 'Não foi possível salvar', text: msg });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function executarExclusao() {
    const u = confirmacao?.usuario;
    if (!u) return;
    setExcluindo(true);
    setErro('');
    try {
      await usuarioService.excluirDefinitivo(u.id);
      setConfirmacao(null);
      setModal(null);
      await carregar();
      setAvisoSistema({
        type: 'success',
        title: 'Colaborador excluído',
        text: `"${u.nome}" foi removido definitivamente.`,
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Não foi possível excluir o colaborador';
      setAvisoSistema({ type: 'error', title: 'Exclusão não concluída', text: msg });
    } finally {
      setExcluindo(false);
    }
  }

  async function toggleAtivo(u) {
    try {
      await usuarioService.atualizar(u.id, { ativo: !u.ativo });
      carregar();
      setAvisoSistema({
        type: 'success',
        title: u.ativo ? 'Colaborador desativado' : 'Colaborador ativado',
        text: `"${u.nome}" foi ${u.ativo ? 'desativado' : 'ativado'}.`,
      });
    } catch (err) {
      setAvisoSistema({
        type: 'error',
        title: 'Falha ao alterar status',
        text: err.response?.data?.error || err.message || 'Tente novamente.',
      });
    }
  }

  async function reenviarConvite(u) {
    if (!window.confirm(`Reenviar convite por e-mail para ${u.email}?`)) return;
    try {
      const { data } = await usuarioService.reenviarConvite(u.id);
      setAvisoSistema({
        type: 'success',
        title: 'E-mail enviado',
        text: data.mensagem || `Convite reenviado para ${u.email}.`,
      });
    } catch (err) {
      setAvisoSistema({
        type: 'error',
        title: 'E-mail não enviado',
        text: err.response?.data?.error || 'Erro ao reenviar convite.',
      });
    }
  }

  async function resetSenhaColaborador(u) {
    if (!window.confirm(`Enviar link de redefinição de senha para ${u.email}?`)) return;
    try {
      const { data } = await usuarioService.resetSenhaEmail(u.id);
      setAvisoSistema({
        type: 'success',
        title: 'E-mail enviado',
        text: data.mensagem || `Link de redefinição enviado para ${u.email}.`,
      });
    } catch (err) {
      setAvisoSistema({
        type: 'error',
        title: 'E-mail não enviado',
        text: err.response?.data?.error || 'Erro ao enviar e-mail de reset.',
      });
    }
  }

  const filtrados = useMemo(
    () =>
      usuarios.filter(
        (u) =>
          u.nome.toLowerCase().includes(busca.toLowerCase()) ||
          u.email.toLowerCase().includes(busca.toLowerCase()) ||
          (u.cargo || '').toLowerCase().includes(busca.toLowerCase()) ||
          (u.departamento || '').toLowerCase().includes(busca.toLowerCase())
      ),
    [usuarios, busca]
  );

  const { pageItems: filtradosPagina, total: totalFiltrados, safePage } = slicePaged(filtrados, page, pageSize);

  const fecharAvisoSistema = useCallback(() => setAvisoSistema(null), []);

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  return (
    <Layout>
      {avisoSistema ? (
        <SystemMessage
          type={avisoSistema.type}
          title={avisoSistema.title}
          autoHideMs={avisoSistema.type === 'success' || avisoSistema.type === 'info' ? 8000 : 0}
          onClose={fecharAvisoSistema}
        >
          {avisoSistema.text}
        </SystemMessage>
      ) : null}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:12 }}>
        <div id="tour-colab-header">
          <h1 style={{ fontSize:'24px', fontWeight:'700' }}>Colaboradores</h1>
          <p style={{ color:'var(--cinza-400)', fontSize:'14px', marginTop:'2px' }}>
            {usuarios.filter((u) => u.ativo).length} ativos
            {totalFiltrados > 0 && (
              <span style={{ marginLeft: '8px' }}>
                · {totalFiltrados} {busca.trim() ? 'no filtro' : 'no total'}
              </span>
            )}
          </p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <button type="button" onClick={() => runColaboradoresTour({ force: true })} style={{ padding:'8px 14px', fontSize:13, fontWeight:600, color:'var(--verde-escuro)', background:'var(--verde-claro)', border:'1px solid rgba(29,158,117,0.35)', borderRadius:8, cursor:'pointer' }}>Como usar</button>
        <button id="tour-colab-btn-novo" type="button" className="btn btn-primary" onClick={abrirCriar}>+ Novo Colaborador</button>
        </div>
      </div>

      {/* Busca */}
      <div id="tour-colab-busca" style={{ marginBottom:'20px' }}>
        <input className="input" placeholder="🔍 Buscar por nome, e-mail ou cargo..." value={busca} onChange={e => setBusca(e.target.value)} style={{ width: '100%', maxWidth:'400px' }} />
      </div>

      {/* Tabela */}
      <div id="tour-colab-tabela" className="card table-scroll" style={{ padding: 0, maxWidth: '100%' }}>
        {carregando ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner" /></div>
        ) : (
          <table className="tabela" style={{ minWidth: 640 }}>
            <thead><tr>
              <th>Nome</th><th>E-mail</th><th>Cargo</th><th>Departamento</th><th>Função</th><th id="tour-colab-th-pin">PIN</th><th>Status</th><th id="tour-colab-th-acoes" style={{ width: 1, whiteSpace: 'nowrap' }}>Ações</th>
            </tr></thead>
            <tbody>
              {filtradosPagina.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight:'500' }}>{u.nome}</td>
                  <td style={{ color:'var(--cinza-400)', fontSize:'13px' }}>{u.email}</td>
                  <td>{u.cargo || '—'}</td>
                  <td>{u.departamento || '—'}</td>
                  <td>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-azul' : 'badge-cinza'}`}
                      style={u.role === 'ADMIN' ? { background:'var(--azul-claro)', color:'var(--azul)' } : {}}>
                      {u.role === 'ADMIN' ? 'Admin' : 'Colaborador'}
                    </span>
                  </td>
                  <td style={{ fontFamily:'monospace', color:'var(--cinza-400)', fontSize:'13px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span title={isAdmin ? 'O PIN salvo não pode ser exibido (somente hash). Gere um novo PIN para visualizar.' : ''}>
                        {isAdmin && pinsVisiveis.has(u.id) ? (pinsGerados[u.id] || '—') : '••••'}
                      </span>
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => togglePinVisivel(u.id)}
                            title={pinsVisiveis.has(u.id) ? 'Ocultar PIN (somente mostra o último PIN gerado)' : 'Mostrar PIN (somente o último PIN gerado)'}
                            style={{ background:'none', border:'1px solid var(--cinza-200)', borderRadius:'6px', padding:'2px 8px', cursor:'pointer', fontSize:'12px' }}
                          >
                            {pinsCarregando.has(u.id) ? '…' : (pinsVisiveis.has(u.id) ? '🙈' : '👁️')}
                          </button>
                          <button
                            type="button"
                            onClick={() => gerarEAplicarNovoPin(u.id)}
                            title="Gerar e aplicar um novo PIN (o PIN atual não pode ser recuperado do hash)"
                            style={{ background:'none', border:'1px solid var(--cinza-200)', borderRadius:'6px', padding:'2px 8px', cursor:'pointer', fontSize:'12px' }}
                          >
                            Reset PIN
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <span className={`badge ${u.ativo ? 'badge-verde' : 'badge-vermelho'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {u.ativo && u.senhaWebDefinida === false ? (
                        <span className="badge badge-amarelo" style={{ fontSize: 11 }}>
                          Aguardando 1º acesso
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <TableActions>
                      <IconAction icon="editar" label="Editar" onClick={() => abrirEditar(u)} />
                      {u.ativo && (
                        <>
                          <IconAction
                            icon="mail"
                            label="Reenviar convite (definir senha web)"
                            tone="info"
                            onClick={() => reenviarConvite(u)}
                          />
                          <IconAction
                            icon="key"
                            label="Reset senha web"
                            onClick={() => resetSenhaColaborador(u)}
                          />
                        </>
                      )}
                      <IconAction
                        icon={u.ativo ? 'suspender' : 'reativar'}
                        label={u.ativo ? 'Desativar' : 'Ativar'}
                        tone={u.ativo ? 'warning' : 'success'}
                        onClick={() => toggleAtivo(u)}
                      />
                      {usuarioLogado?.id !== u.id && (
                        <IconAction
                          icon="excluir"
                          label="Excluir"
                          tone="danger"
                          onClick={() => setConfirmacao({ tipo: 'excluir', usuario: u })}
                        />
                      )}
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!carregando && totalFiltrados > 0 && (
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--cinza-100)' }}>
            <ListPagination
              page={safePage}
              pageSize={pageSize}
              total={totalFiltrados}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => {
          setConfirmacao(null);
          setModal(null);
        }}
        title={modal === 'criar' ? 'Novo Colaborador' : modal ? `Editar: ${modal.nome}` : ''}
        titleId="modal-colaborador-title"
        maxWidth={520}
        closeOnOverlay={confirmacao == null}
        footer={(
          <>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => {
                setConfirmacao(null);
                setModal(null);
              }}
            >
              Cancelar
            </button>
            <button type="submit" form="form-colaborador" className="btn btn-primary btn-full" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        )}
      >
        <form
          id="form-colaborador"
          onSubmit={(e) => {
            e.preventDefault();
            setErro('');
            const nome = String(form.nome || '').trim();
            const email = String(form.email || '').trim();
            const pin = String(form.pin || '').trim();

            if (!nome) {
              setErro('Nome completo é obrigatório.');
              return;
            }
            if (!email) {
              setErro('E-mail é obrigatório.');
              return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              setErro('Informe um e-mail válido.');
              return;
            }
            if (modal === 'criar') {
              if (!pin) {
                setErro('PIN é obrigatório.');
                return;
              }
              if (!/^\d{4,6}$/.test(pin)) {
                setErro('PIN deve ter de 4 a 6 dígitos numéricos.');
                return;
              }
            } else if (pin && !/^\d{4,6}$/.test(pin)) {
              setErro('Novo PIN deve ter de 4 a 6 dígitos numéricos (ou deixe vazio para não alterar).');
              return;
            }
            setConfirmacao('salvar');
          }}
        >
            <div style={{ display:'grid', gap:'16px' }}>
              {[
                { key:'nome', label:'Nome completo', type:'text', required:true },
                { key:'email', label:'E-mail', type:'email', required:true },
                {
                  key:'pin',
                  label: modal === 'criar' ? 'PIN (4-6 dígitos)' : 'Novo PIN (deixe vazio para não alterar)',
                  type: 'password',
                  required: modal === 'criar',
                  inputMode: 'numeric',
                  pattern: modal === 'criar' ? '\\d{4,6}' : undefined,
                  maxLength: 6,
                },
                { key:'cargo', label:'Cargo', type:'text' },
                { key:'departamento', label:'Departamento', type:'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>
                    {f.label}
                    {f.required ? <span style={{ color: 'var(--vermelho)', marginLeft: 4 }} aria-hidden="true">*</span> : null}
                  </label>
                  {f.key === 'pin' ? (
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <input
                        className="input"
                        type={f.type}
                        inputMode={f.inputMode}
                        pattern={f.pattern}
                        maxLength={f.maxLength}
                        autoComplete="new-password"
                        value={form[f.key] || ''}
                        onChange={e => setForm(p => ({...p, [f.key]: e.target.value.replace(/\D/g, '').slice(0, 6)}))}
                        required={f.required}
                        style={{ flex: 1 }}
                      />
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={gerarPinParaFormulario}
                          title="Gerar um PIN aleatório e preencher no formulário"
                          style={{ background:'none', border:'1px solid var(--cinza-200)', borderRadius:'8px', padding:'8px 10px', cursor:'pointer', fontSize:'12px' }}
                        >
                          Novo PIN
                        </button>
                      )}
                    </div>
                  ) : (
                    <input
                      className="input"
                      type={f.type}
                      value={form[f.key] || ''}
                      onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                      required={f.required}
                      autoComplete={f.key === 'email' ? 'email' : f.key === 'nome' ? 'name' : undefined}
                    />
                  )}
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>
                    Data de admissão
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={form.dataAdmissao || ''}
                    onChange={(e) => setForm((p) => ({ ...p, dataAdmissao: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>
                    Data de demissão (opcional)
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={form.dataDemissao || ''}
                    onChange={(e) => setForm((p) => ({ ...p, dataDemissao: e.target.value }))}
                  />
                </div>
              </div>

              {form.role === 'COLABORADOR' && (
                <div style={{ borderTop: '1px solid var(--cinza-200)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <p style={{ gridColumn: '1 / -1', fontSize: 13, fontWeight: 600, margin: 0 }}>
                    CPF / PIS (obrigatório para bater ponto — REP-P)
                  </p>
                  <div>
                    <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>CPF</label>
                    <input className="input" placeholder="11 dígitos" value={form.cpf || ''} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>PIS</label>
                    <input className="input" placeholder="11 dígitos" value={form.pis || ''} onChange={(e) => setForm((p) => ({ ...p, pis: e.target.value }))} />
                  </div>
                </div>
              )}

              {form.role === 'COLABORADOR' && folhaHabilitada && (
                <div style={{ borderTop: '1px solid var(--cinza-200)', paddingTop: 12, display: 'grid', gap: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Dados para folha de pagamento</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Salário base (R$)</label>
                      <input className="input" type="number" step="0.01" value={form.salarioBase || ''} onChange={(e) => setForm((p) => ({ ...p, salarioBase: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Tipo contrato</label>
                      <select className="input" value={form.tipoContrato || 'CLT'} onChange={(e) => setForm((p) => ({ ...p, tipoContrato: e.target.value }))}>
                        <option value="CLT">CLT</option>
                        <option value="ESTAGIO">Estágio</option>
                        <option value="PJ">PJ</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Dependentes IRRF</label>
                      <input className="input" type="number" min="0" value={form.dependentesIrrf ?? 0} onChange={(e) => setForm((p) => ({ ...p, dependentesIrrf: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Matrícula</label>
                      <input className="input" value={form.matricula || ''} onChange={(e) => setForm((p) => ({ ...p, matricula: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Banco</label>
                      <input className="input" value={form.contaBanco || ''} onChange={(e) => setForm((p) => ({ ...p, contaBanco: e.target.value }))} placeholder="ex: 237" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Agência</label>
                      <input className="input" value={form.contaAgencia || ''} onChange={(e) => setForm((p) => ({ ...p, contaAgencia: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Conta</label>
                      <input className="input" value={form.contaNumero || ''} onChange={(e) => setForm((p) => ({ ...p, contaNumero: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Tipo conta</label>
                      <select className="input" value={form.contaTipo || ''} onChange={(e) => setForm((p) => ({ ...p, contaTipo: e.target.value }))}>
                        <option value="">—</option>
                        <option value="CORRENTE">Corrente</option>
                        <option value="POUPANCA">Poupança</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(form.usaVt)}
                        onChange={(e) => setForm((p) => ({ ...p, usaVt: e.target.checked }))}
                      />
                      Utiliza vale transporte (desconto em folha)
                    </label>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Custo VT mensal (R$)</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        disabled={!form.usaVt}
                        value={form.valorVtMensal || ''}
                        onChange={(e) => setForm((p) => ({ ...p, valorVtMensal: e.target.value }))}
                        placeholder="Valor do passe"
                      />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Desconto VA/VR mensal (R$)</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={form.descontoVaMensal || ''}
                        onChange={(e) => setForm((p) => ({ ...p, descontoVaMensal: e.target.value }))}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>Desconto plano de saúde mensal (R$)</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={form.descontoPlanoSaudeMensal || ''}
                        onChange={(e) => setForm((p) => ({ ...p, descontoPlanoSaudeMensal: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>Função</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {form.role === 'COLABORADOR' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(form.isentoGeofence)}
                      onChange={(e) => setForm((p) => ({ ...p, isentoGeofence: e.target.checked }))}
                      style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--verde)' }}
                    />
                    <span>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--cinza-700)' }}>
                        Trabalho remoto — isento de cerca virtual
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--cinza-400)', marginTop: 4, lineHeight: 1.45 }}>
                        Pode bater ponto de qualquer lugar (Meu Ponto), sem validar GPS. Use para quem trabalha fora do escritório
                        ou em home office móvel.
                      </span>
                    </span>
                  </label>

                  {!form.isentoGeofence && locais.length > 0 && (
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>
                        Local permitido (cerca virtual)
                      </label>
                      <select
                        className="input"
                        value={form.localRegistroId || ''}
                        onChange={(e) => setForm((p) => ({ ...p, localRegistroId: e.target.value }))}
                      >
                        <option value="">Qualquer local cadastrado</option>
                        {locais.filter((l) => l.ativo).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nome} ({l.raioMetros}m)
                          </option>
                        ))}
                      </select>
                      <p style={{ fontSize:'12px', color:'var(--cinza-400)', marginTop:'6px' }}>
                        Se a cerca virtual estiver ativa, o colaborador só poderá bater ponto dentro deste local
                        (ex.: home office fixo — cadastre o endereço em Configurações → Locais).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {erro && <div style={{ background:'var(--vermelho-claro)', color:'var(--vermelho)', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginTop:'16px' }}>{erro}</div>}
        </form>
      </Modal>

      <Modal
        open={confirmacao === 'salvar'}
        onClose={() => setConfirmacao(null)}
        title="Confirmar salvamento"
        maxWidth={420}
        zIndex={10100}
        footer={(
          <>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setConfirmacao(null)} disabled={salvando}>Cancelar</button>
            <button type="button" className="btn btn-primary btn-full" onClick={executarSalvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Confirmar'}
            </button>
          </>
        )}
      >
        <p style={{ fontSize:'14px', color:'var(--cinza-600)', lineHeight:1.5, margin: 0 }}>
          {modal === 'criar'
            ? `Deseja cadastrar o colaborador "${String(form.nome || '').trim() || 'novo colaborador'}"?`
            : `Deseja salvar as alterações em "${String(form.nome || modal?.nome || '').trim() || 'este colaborador'}"?`}
        </p>
      </Modal>

      <Modal
        open={confirmacao?.tipo === 'excluir'}
        onClose={() => setConfirmacao(null)}
        title="Excluir definitivamente"
        maxWidth={440}
        zIndex={10100}
        footer={(
          <>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setConfirmacao(null)} disabled={excluindo}>Cancelar</button>
            <button
              type="button"
              className="btn btn-full"
              onClick={executarExclusao}
              disabled={excluindo}
              style={{ background:'var(--vermelho)', color:'#fff', border:'none' }}
            >
              {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
            </button>
          </>
        )}
      >
        <p style={{ fontSize:'14px', color:'var(--cinza-600)', lineHeight:1.55, margin: '0 0 16px' }}>
          O colaborador <strong>{confirmacao?.usuario?.nome}</strong> será removido do sistema. Esta ação apaga também o histórico de pontos, escalas e ajustes ligados a ele no período — não dá para desfazer.
        </p>
        <p style={{ fontSize:'13px', color:'var(--cinza-400)', margin: 0 }}>
          Se quiser só impedir acesso sem apagar histórico, use <strong>Desativar</strong>.
        </p>
      </Modal>
    </Layout>
  );
}
