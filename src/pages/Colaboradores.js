// src/pages/Colaboradores.js
import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/dashboard/Layout';
import Modal from '../components/Modal';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { usuarioService, localRegistroService } from '../services/api';
import { runColaboradoresTour } from '../tours/colaboradoresTour';
import { useAuth } from '../hooks/useAuth';

export default function Colaboradores() {
  const { isAdmin, usuario: usuarioLogado, folhaHabilitada } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(null); // null | 'criar' | {usuario}
  const [form, setForm] = useState({ nome:'', email:'', pin:'', cargo:'', departamento:'', role:'COLABORADOR' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
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
    if (carregando) return;
    const t = setTimeout(() => runColaboradoresTour({ force: false }), 600);
    return () => clearTimeout(t);
  }, [carregando]);

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
      // Se ainda não existe pinEncrypted no banco, pedimos para resetar 1x.
      alert(e.response?.data?.error || 'Não foi possível obter o PIN.');
    } finally {
      setPinsCarregando((prev) => {
        const next = new Set(prev);
        next.delete(usuarioId);
        return next;
      });
    }
  }

  function abrirCriar() {
    setForm({
      nome:'', email:'', pin:'', cargo:'', departamento:'', role:'COLABORADOR',
      localRegistroId:'', isentoGeofence: false, dataAdmissao:'', dataDemissao:'',
      cpf:'', pis:'', matricula:'', tipoContrato:'CLT', salarioBase:'',
      categoriaProfissional:'', dependentesIrrf:0,
      contaBanco:'', contaAgencia:'', contaNumero:'', contaTipo:'',
    });
    setErro('');
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
        if (data.conviteEmailEnviado) {
          alert('Cadastro concluído. Enviamos um e-mail com instruções e link para definir senha (confira spam).');
        } else if (data.conviteEmailMotivo === 'envio_em_segundo_plano') {
          alert(
            'Cadastro concluído. O convite por e-mail está sendo enviado em segundo plano; em alguns instantes deve chegar (confira spam). Se não receber, verifique SMTP e os logs do servidor.'
          );
        } else if (data.conviteEmailMotivo === 'smtp_nao_configurado') {
          alert(
            'Cadastro concluído, mas o e-mail NÃO foi enviado: SMTP não configurado no servidor (defina SMTP_HOST, MAIL_FROM e credenciais SMTP_USER/SMTP_PASS no backend).'
          );
        } else if (data.conviteEmailMotivo === 'falha_envio') {
          alert(
            'Cadastro concluído, mas o envio do e-mail falhou. Verifique os logs do backend e as credenciais SMTP (Hostinger costuma exigir usuário/senha corretos e porta 465 com SSL).'
          );
        } else {
          alert(
            'Cadastro concluído. O e-mail de convite não foi enviado. O PIN do totem segue válido; o colaborador pode usar "Esqueci minha senha" no login quando o SMTP estiver OK.'
          );
        }
      } else {
        await usuarioService.atualizar(modal.id, payload);
      }
      setModal(null);
      try {
        await carregar();
      } catch (reloadErr) {
        console.error('[Colaboradores] Lista não atualizou após salvar:', reloadErr);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setErro(msg || 'Erro ao salvar');
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
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert(msg || 'Não foi possível excluir o colaborador');
    } finally {
      setExcluindo(false);
    }
  }

  async function toggleAtivo(u) {
    await usuarioService.atualizar(u.id, { ativo: !u.ativo });
    carregar();
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

  return (
    <Layout>
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
              <th>Nome</th><th>E-mail</th><th>Cargo</th><th>Departamento</th><th>Função</th><th id="tour-colab-th-pin">PIN</th><th>Status</th><th id="tour-colab-th-acoes">Ações</th>
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
                    <span className={`badge ${u.ativo ? 'badge-verde' : 'badge-vermelho'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button onClick={() => abrirEditar(u)} style={{ background:'none', border:'1px solid var(--cinza-200)', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'12px' }}>Editar</button>
                      <button onClick={() => toggleAtivo(u)} style={{ background:'none', border:'1px solid var(--cinza-200)', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'12px', color: u.ativo ? 'var(--vermelho)' : 'var(--verde)' }}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      {usuarioLogado?.id !== u.id && (
                        <button
                          type="button"
                          onClick={() => setConfirmacao({ tipo: 'excluir', usuario: u })}
                          style={{ background:'none', border:'1px solid var(--vermelho)', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontSize:'12px', color: 'var(--vermelho)' }}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
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
        onClose={() => setModal(null)}
        title={modal === 'criar' ? 'Novo Colaborador' : modal ? `Editar: ${modal.nome}` : ''}
        titleId="modal-colaborador-title"
        maxWidth={520}
        footer={(
          <>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setModal(null)}>Cancelar</button>
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
            setConfirmacao('salvar');
          }}
        >
            <div style={{ display:'grid', gap:'16px' }}>
              {[
                { key:'nome', label:'Nome completo', type:'text', required:true },
                { key:'email', label:'E-mail', type:'email', required:true },
                { key:'pin', label: modal === 'criar' ? 'PIN (4-6 dígitos)' : 'Novo PIN (deixe vazio para não alterar)', type: 'password', required: modal === 'criar' },
                { key:'cargo', label:'Cargo', type:'text' },
                { key:'departamento', label:'Departamento', type:'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>{f.label}</label>
                  {f.key === 'pin' ? (
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <input
                        className="input"
                        type={f.type}
                        value={form[f.key] || ''}
                        onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
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
                    <input className="input" type={f.type} value={form[f.key] || ''} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} required={f.required} />
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

              {form.role === 'COLABORADOR' && folhaHabilitada && (
                <div style={{ borderTop: '1px solid var(--cinza-200)', paddingTop: 12, display: 'grid', gap: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Dados para folha de pagamento</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>CPF</label>
                      <input className="input" value={form.cpf || ''} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'6px' }}>PIS</label>
                      <input className="input" value={form.pis || ''} onChange={(e) => setForm((p) => ({ ...p, pis: e.target.value }))} />
                    </div>
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
        zIndex={1100}
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
            ? 'Deseja cadastrar este colaborador com os dados informados?'
            : `Deseja salvar as alterações em "${modal?.nome}"?`}
        </p>
      </Modal>

      <Modal
        open={confirmacao?.tipo === 'excluir'}
        onClose={() => setConfirmacao(null)}
        title="Excluir definitivamente"
        maxWidth={440}
        zIndex={1100}
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
