// src/pages/SuperAdmin.js
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { logoInternoUrl } from '../utils/branding';
import { superAdminService } from '../services/api';
import { format } from 'date-fns';

const STATUS_BADGE = {
  ATIVO: { label:'Ativo', classe:'badge-verde' },
  SUSPENSO: { label:'Suspenso', classe:'badge-amarelo' },
  CANCELADO: { label:'Cancelado', classe:'badge-vermelho' },
};
const PLANO_LABEL = { BASICO:'Básico', PROFISSIONAL:'Profissional', ENTERPRISE:'Enterprise' };

export default function SuperAdmin() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [form, setForm] = useState({
    razaoSocial:'', nomeFantasia:'', cnpj:'', email:'', telefone:'', plano:'BASICO',
    adminNome:'', adminEmail:'', adminSenha:'',
  });
  const [formEditar, setFormEditar] = useState({
    razaoSocial:'', nomeFantasia:'', cnpj:'', email:'', telefone:'', plano:'BASICO',
  });
  const [modalAdmin, setModalAdmin] = useState(null);
  const [formAdmin, setFormAdmin] = useState({ nome:'', email:'', senha:'' });
  const [salvando, setSalvando] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const [{ data: t }, { data: s }] = await Promise.all([
        superAdminService.listarTenants(),
        superAdminService.stats(),
      ]);
      setTenants(t);
      setStats(s);
    } finally { setCarregando(false); }
  }

  function abrirNovo() {
    setForm({
      razaoSocial:'', nomeFantasia:'', cnpj:'', email:'', telefone:'', plano:'BASICO',
      adminNome:'', adminEmail:'', adminSenha:'',
    });
    setModal(true);
  }

  async function criarTenant() {
    setSalvando(true);
    try {
      const payload = { ...form };
      if (!String(payload.adminSenha || '').trim()) delete payload.adminSenha;
      const { data } = await superAdminService.criarTenant(payload);
      setModal(false);
      carregar();
      if (data.primeiroAcessoPorEmail) {
        alert(
          data.conviteAdminEnviado
            ? 'Empresa criada. Foi enviado um e-mail ao administrador para definir a senha de acesso (verifique spam).'
            : 'Empresa criada. O convite por e-mail não foi enviado — configure SMTP no servidor ou defina uma senha inicial ao criar a empresa.'
        );
      } else {
        alert('Empresa criada. O administrador pode entrar com o e-mail e a senha informados.');
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao criar empresa');
    } finally { setSalvando(false); }
  }

  function abrirEditar(t) {
    setFormEditar({
      razaoSocial: t.razaoSocial,
      nomeFantasia: t.nomeFantasia,
      cnpj: t.cnpj,
      email: t.email,
      telefone: t.telefone || '',
      plano: t.plano,
    });
    setModalEditar(t);
  }

  async function salvarEdicao() {
    if (!modalEditar) return;
    setSalvando(true);
    try {
      await superAdminService.atualizarTenant(modalEditar.id, formEditar);
      setModalEditar(null);
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar');
    } finally { setSalvando(false); }
  }

  async function alterarStatus(id, status) {
    await superAdminService.atualizarStatus(id, status);
    carregar();
  }

  function abrirCadastroAdmin(t) {
    setFormAdmin({ nome:'', email:'', senha:'' });
    setModalAdmin(t);
  }

  async function salvarAdmin() {
    if (!modalAdmin) return;
    setSalvando(true);
    try {
      const payload = { ...formAdmin };
      if (!String(payload.senha || '').trim()) delete payload.senha;
      const { data } = await superAdminService.criarAdminTenant(modalAdmin.id, payload);
      setModalAdmin(null);
      carregar();
      if (data.primeiroAcessoPorEmail) {
        alert(
          data.conviteEmailEnviado
            ? 'Administrador cadastrado. Foi enviado e-mail para definir a senha.'
            : 'Administrador cadastrado. O e-mail de convite não foi enviado — configure SMTP ou use Reset senha na lista.'
        );
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao cadastrar administrador');
    } finally { setSalvando(false); }
  }

  async function limparPontosEmpresa(t) {
    if (!t?.id) return;
    const aviso =
      `EXCLUSÃO PERMANENTE dos registros de ponto da empresa:\n\n"${t.nomeFantasia}"\n\n` +
      `Digite o NOME FANTASIA exatamente como cadastrado para confirmar.`;
    const digitado = window.prompt(aviso);
    if (digitado == null) return;
    if (digitado.trim() !== t.nomeFantasia) {
      alert('O nome não confere. Nada foi alterado.');
      return;
    }
    if (!window.confirm('Última confirmação: todos os registros e ajustes desta empresa serão apagados. Continuar?')) {
      return;
    }
    try {
      const { data } = await superAdminService.limparRegistrosTenant(t.id, digitado.trim());
      alert(
        `Concluído. Registros removidos: ${data.removidosRegistros}. Ajustes removidos: ${data.removidosAjustes}.`
      );
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao limpar registros');
    }
  }

  async function resetSenhaAdmin(t, admin) {
    if (!t?.id || !admin?.id) return;
    if (!window.confirm(`Resetar a senha do admin ${admin.email}?`)) return;
    try {
      const { data } = await superAdminService.resetSenhaAdminTenant(t.id, admin.id);
      alert(
        `Senha temporária gerada:\n\n${data.senhaTemporaria}\n\nAdmin: ${data.usuario.email}\n\nCopie e envie para o cliente. Com SMTP configurado, o cliente também pode usar "Esqueci minha senha" no login.`
      );
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao resetar senha');
    }
  }

  function handleLogout() { logout(); navigate('/login'); }

  const { pageItems: tenantsPagina, total: totalTenantsList, safePage: tenantPageSafe } = useMemo(
    () => slicePaged(tenants, page, pageSize),
    [tenants, page, pageSize]
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--cinza-100)' }}>
      {/* Topbar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #085041 0%, #1D9E75 100%)',
          padding: '0 32px',
          minHeight: '76px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={logoInternoUrl()}
            alt="Ponto Fácil"
            style={{ height: '58px', width: 'auto', maxWidth: '280px', objectFit: 'contain' }}
          />
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: '600',
            }}
          >
            SUPER ADMIN
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ color:'#94a3b8', fontSize:'13px' }}>{usuario?.email}</span>
          <button onClick={handleLogout} style={{ background:'rgba(226,75,74,0.15)', border:'none', color:'#f87171', padding:'6px 14px', borderRadius:'6px', cursor:'pointer', fontSize:'13px' }}>Sair</button>
        </div>
      </div>

      <div style={{ padding:'32px', maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <h1 style={{ fontSize:'22px', fontWeight:'700' }}>Empresas Assinantes</h1>
            <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginTop:'6px', maxWidth:'640px' }}>
              <strong>Nova empresa:</strong> use &quot;+ Nova Empresa&quot; e o bloco <em>Administrador</em>. Se deixar a senha em branco, o primeiro acesso é por e-mail (link para definir senha). Com senha, o admin entra direto em{' '}
              <code style={{ fontSize:'12px' }}>/login</code>.
              {' '}<strong>Empresa sem admin?</strong> use <em>Cadastrar admin</em> na tabela (mesma regra: senha opcional).
            </p>
          </div>
          <button className="btn btn-primary" onClick={abrirNovo}>+ Nova Empresa</button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'16px', marginBottom:'24px', minWidth: 0 }}>
            {[
              { label:'Empresas', valor: stats.totalTenants, cor:'var(--azul)' },
              { label:'Usuários ativos', valor: stats.totalUsuarios, cor:'var(--verde)' },
              { label:'Registros total', valor: stats.totalRegistros, cor:'var(--amarelo)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign:'center', borderTop:`3px solid ${s.cor}` }}>
                <p style={{ fontSize:'32px', fontWeight:'700', color: s.cor }}>{s.valor}</p>
                <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginTop:'4px' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabela de tenants */}
        <div className="card table-scroll" style={{ padding:0, maxWidth:'100%' }}>
          {carregando ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner" /></div>
          ) : (
            <table className="tabela" style={{ minWidth: 960 }}>
              <thead><tr>
                <th>Empresa</th><th>CNPJ</th><th>Admin</th><th>Plano</th><th>Status</th><th>Usuários</th><th>Registros</th><th>Desde</th><th>Ações</th>
              </tr></thead>
              <tbody>
                {tenantsPagina.map(t => {
                  const badge = STATUS_BADGE[t.status];
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight:'500' }}>{t.nomeFantasia}</div>
                        <div style={{ fontSize:'12px', color:'var(--cinza-400)' }}>{t.razaoSocial}</div>
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:'13px' }}>{t.cnpj}</td>
                      <td style={{ fontSize:'12px', maxWidth:'180px' }}>
                        {t.usuarios?.[0] ? (
                          <>
                            <div style={{ fontWeight:'500' }}>{t.usuarios[0].nome}</div>
                            <div style={{ color:'var(--cinza-400)' }}>{t.usuarios[0].email}</div>
                            <div style={{ marginTop:'6px' }}>
                              <button
                                type="button"
                                onClick={() => resetSenhaAdmin(t, t.usuarios[0])}
                                style={{ background:'none', border:'1px solid var(--vermelho)', color:'var(--vermelho)', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', fontSize:'12px' }}
                                title="Gera uma senha temporária e aplica no admin"
                              >
                                Reset senha
                              </button>
                            </div>
                          </>
                        ) : (
                          <span style={{ color:'var(--cinza-400)' }}>—</span>
                        )}
                      </td>
                      <td><span className="badge badge-cinza">{PLANO_LABEL[t.plano]}</span></td>
                      <td><span className={`badge ${badge.classe}`}>{badge.label}</span></td>
                      <td style={{ textAlign:'center' }}>{t._count.usuarios}</td>
                      <td style={{ textAlign:'center' }}>{t._count.registros}</td>
                      <td style={{ fontSize:'12px', color:'var(--cinza-400)' }}>{format(new Date(t.createdAt), 'dd/MM/yyyy')}</td>
                      <td>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <button type="button" onClick={() => abrirEditar(t)} style={{ background:'none', border:'1px solid var(--azul)', color:'var(--azul)', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', fontSize:'12px' }}>Editar</button>
                          {t.status === 'ATIVO' && (
                            <button type="button" onClick={() => abrirCadastroAdmin(t)} style={{ background:'none', border:'1px solid var(--verde)', color:'var(--verde)', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', fontSize:'12px' }} title="Criar usuário administrador (acesso ao painel)">Cadastrar admin</button>
                          )}
                          {t.status === 'ATIVO' && (
                            <button onClick={() => alterarStatus(t.id, 'SUSPENSO')} style={{ background:'none', border:'1px solid var(--amarelo)', color:'var(--amarelo)', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', fontSize:'12px' }}>Suspender</button>
                          )}
                          {t.status === 'SUSPENSO' && (
                            <button onClick={() => alterarStatus(t.id, 'ATIVO')} style={{ background:'none', border:'1px solid var(--verde)', color:'var(--verde)', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', fontSize:'12px' }}>Reativar</button>
                          )}
                          {t.status !== 'CANCELADO' && (
                            <button onClick={() => alterarStatus(t.id, 'CANCELADO')} style={{ background:'none', border:'1px solid var(--vermelho)', color:'var(--vermelho)', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', fontSize:'12px' }}>Cancelar</button>
                          )}
                          {t._count?.registros > 0 && (
                            <button
                              type="button"
                              onClick={() => limparPontosEmpresa(t)}
                              style={{ background:'none', border:'1px solid var(--vermelho)', color:'#b91c1c', borderRadius:'6px', padding:'3px 10px', cursor:'pointer', fontSize:'12px' }}
                              title="Apaga todos os registros de ponto e ajustes desta empresa (irreversível)"
                            >
                              Zerar pontos
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!carregando && totalTenantsList > 0 && (
            <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--cinza-100)' }}>
              <ListPagination
                page={tenantPageSafe}
                pageSize={pageSize}
                total={totalTenantsList}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal nova empresa */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'480px', padding:'32px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:'600', marginBottom:'24px' }}>Nova Empresa</h2>
            <div style={{ display:'grid', gap:'14px' }}>
              <p style={{ fontSize:'12px', color:'var(--cinza-400)', marginBottom:'8px' }}>Dados da empresa</p>
              {[
                { key:'razaoSocial', label:'Razão Social', type:'text' },
                { key:'nomeFantasia', label:'Nome Fantasia', type:'text' },
                { key:'cnpj', label:'CNPJ', type:'text', placeholder:'00.000.000/0001-00' },
                { key:'email', label:'E-mail da empresa', type:'email' },
                { key:'telefone', label:'Telefone (opcional)', type:'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>{f.label}</label>
                  <input className="input" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>Plano</label>
                <select className="input" value={form.plano} onChange={e => setForm(p => ({...p, plano: e.target.value}))}>
                  <option value="BASICO">Básico (até 10 usuários)</option>
                  <option value="PROFISSIONAL">Profissional (até 50 usuários)</option>
                  <option value="ENTERPRISE">Enterprise (ilimitado)</option>
                </select>
              </div>
              <p style={{ fontSize:'12px', color:'var(--cinza-400)', margin:'16px 0 8px', paddingTop:'12px', borderTop:'1px solid var(--cinza-200)' }}>Administrador da empresa (acesso ao painel / dashboard)</p>
              {[
                { key:'adminNome', label:'Nome do administrador', type:'text' },
                { key:'adminEmail', label:'E-mail de login', type:'email' },
                { key:'adminSenha', label:'Senha inicial (opcional — em branco = convite por e-mail)', type:'password' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>{f.label}</label>
                  <input className="input" type={f.type} autoComplete="new-password" value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'12px', marginTop:'24px' }}>
              <button className="btn btn-secondary btn-full" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary btn-full" onClick={criarTenant} disabled={salvando}>{salvando ? 'Criando...' : 'Criar Empresa'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar empresa */}
      {modalEditar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'480px', padding:'32px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:'600', marginBottom:'8px' }}>Editar empresa</h2>
            <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginBottom:'20px' }}>Altere os dados cadastrais. O status (suspenso/ativo) continua nas ações da tabela.</p>
            <div style={{ display:'grid', gap:'14px' }}>
              {[
                { key:'razaoSocial', label:'Razão Social', type:'text' },
                { key:'nomeFantasia', label:'Nome Fantasia', type:'text' },
                { key:'cnpj', label:'CNPJ', type:'text' },
                { key:'email', label:'E-mail da empresa', type:'email' },
                { key:'telefone', label:'Telefone', type:'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>{f.label}</label>
                  <input className="input" type={f.type} value={formEditar[f.key]} onChange={e => setFormEditar(p => ({...p, [f.key]: e.target.value}))} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>Plano</label>
                <select className="input" value={formEditar.plano} onChange={e => setFormEditar(p => ({...p, plano: e.target.value}))}>
                  <option value="BASICO">Básico</option>
                  <option value="PROFISSIONAL">Profissional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:'12px', marginTop:'24px' }}>
              <button className="btn btn-secondary btn-full" type="button" onClick={() => setModalEditar(null)}>Cancelar</button>
              <button className="btn btn-primary btn-full" type="button" onClick={salvarEdicao} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cadastrar administrador em empresa existente */}
      {modalAdmin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'440px', padding:'32px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:'600', marginBottom:'8px' }}>Administrador da empresa</h2>
            <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginBottom:'20px' }}>
              {modalAdmin.nomeFantasia} — este usuário acessa o painel em <strong>/login</strong> com e-mail e senha (mesmo fluxo do gerente).
            </p>
            <div style={{ display:'grid', gap:'14px' }}>
              {[
                { key:'nome', label:'Nome completo', type:'text' },
                { key:'email', label:'E-mail de login', type:'email' },
                { key:'senha', label:'Senha (opcional — em branco = convite por e-mail; se preencher, mín. 6 caracteres)', type:'password' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>{f.label}</label>
                  <input className="input" type={f.type} autoComplete="new-password" value={formAdmin[f.key]} onChange={e => setFormAdmin(p => ({...p, [f.key]: e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'12px', marginTop:'24px' }}>
              <button className="btn btn-secondary btn-full" type="button" onClick={() => setModalAdmin(null)}>Cancelar</button>
              <button className="btn btn-primary btn-full" type="button" onClick={salvarAdmin} disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
