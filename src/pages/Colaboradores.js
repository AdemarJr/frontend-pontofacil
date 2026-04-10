// src/pages/Colaboradores.js
import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { usuarioService, localRegistroService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Colaboradores() {
  const { isAdmin, usuario: usuarioLogado } = useAuth();
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
    setForm({ nome:'', email:'', pin:'', cargo:'', departamento:'', role:'COLABORADOR', localRegistroId:'' });
    setErro('');
    setModal('criar');
  }

  function abrirEditar(u) {
    setForm({ nome:u.nome, email:u.email, pin:'', cargo:u.cargo||'', departamento:u.departamento||'', role:u.role, ativo:u.ativo, localRegistroId: u.localRegistroId || '' });
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
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
        <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Colaborador</button>
      </div>

      {/* Busca */}
      <div style={{ marginBottom:'20px' }}>
        <input className="input" placeholder="🔍 Buscar por nome, e-mail ou cargo..." value={busca} onChange={e => setBusca(e.target.value)} style={{ maxWidth:'400px' }} />
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {carregando ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner" /></div>
        ) : (
          <table className="tabela">
            <thead><tr>
              <th>Nome</th><th>E-mail</th><th>Cargo</th><th>Departamento</th><th>Função</th><th>PIN</th><th>Status</th><th>Ações</th>
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

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'480px', padding:'32px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:'600', marginBottom:'24px' }}>
              {modal === 'criar' ? 'Novo Colaborador' : `Editar: ${modal.nome}`}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setConfirmacao('salvar');
              }}
              style={{ display:'grid', gap:'16px' }}
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

              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'var(--cinza-700)', marginBottom:'6px' }}>Função</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {form.role === 'COLABORADOR' && locais.length > 0 && (
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
                    Se a cerca virtual estiver ativa, o colaborador só poderá bater ponto dentro deste local.
                  </p>
                </div>
              )}
            </div>

            {erro && <div style={{ background:'var(--vermelho-claro)', color:'var(--vermelho)', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginTop:'16px' }}>{erro}</div>}

            <div style={{ display:'flex', gap:'12px', marginTop:'24px' }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary btn-full" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {confirmacao === 'salvar' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:'20px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'420px', padding:'28px' }}>
            <h3 style={{ fontSize:'17px', fontWeight:'600', marginBottom:'12px' }}>Confirmar salvamento</h3>
            <p style={{ fontSize:'14px', color:'var(--cinza-600)', lineHeight:1.5, marginBottom:'24px' }}>
              {modal === 'criar'
                ? 'Deseja cadastrar este colaborador com os dados informados?'
                : `Deseja salvar as alterações em "${modal.nome}"?`}
            </p>
            <div style={{ display:'flex', gap:'12px' }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setConfirmacao(null)} disabled={salvando}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-full" onClick={executarSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmacao?.tipo === 'excluir' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:'20px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'440px', padding:'28px' }}>
            <h3 style={{ fontSize:'17px', fontWeight:'600', marginBottom:'12px', color:'var(--vermelho)' }}>Excluir definitivamente</h3>
            <p style={{ fontSize:'14px', color:'var(--cinza-600)', lineHeight:1.55, marginBottom:'16px' }}>
              O colaborador <strong>{confirmacao.usuario.nome}</strong> será removido do sistema. Esta ação apaga também o histórico de pontos, escalas e ajustes ligados a ele no período — não dá para desfazer.
            </p>
            <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginBottom:'24px' }}>
              Se quiser só impedir acesso sem apagar histórico, use <strong>Desativar</strong>.
            </p>
            <div style={{ display:'flex', gap:'12px' }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setConfirmacao(null)} disabled={excluindo}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-full"
                onClick={executarExclusao}
                disabled={excluindo}
                style={{ background:'var(--vermelho)', color:'#fff', border:'none' }}
              >
                {excluindo ? 'Excluindo...' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
