// src/pages/SuperAdmin.js
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import ListPagination, { slicePaged } from '../components/ListPagination';
import { logoInternoUrl } from '../utils/branding';
import { superAdminService, API_URL } from '../services/api';
import { isFolhaHabilitada } from '../utils/features';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import AppIcon from '../components/AppIcon';
import SuperAdminPlanos from '../components/SuperAdminPlanos';
import SuperAdminIntegracoes from '../components/SuperAdminIntegracoes';
import { validarSenhaForte, PASSWORD_HINT } from '../utils/passwordPolicy';

/** Botão outline da tabela — transparente para não virar bloco branco no dark */
const saActionBtn = (cor) => ({
  background: 'transparent',
  border: `1px solid ${cor}`,
  color: cor,
  borderRadius: '6px',
  padding: '3px 10px',
  cursor: 'pointer',
  fontSize: '12px',
});

const STATUS_BADGE = {
  ATIVO: { label:'Ativo', classe:'badge-verde' },
  SUSPENSO: { label:'Suspenso', classe:'badge-amarelo' },
  CANCELADO: { label:'Cancelado', classe:'badge-vermelho' },
};
const PLANO_LABEL = { BASICO:'Básico', PROFISSIONAL:'Profissional', ENTERPRISE:'Enterprise' };

function formatarReais(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function labelPlanoTenant(t) {
  if (t.planoComercial) {
    const max = t.planoComercial.maxColaboradores;
    const lim = max == null ? 'ilimitado' : `até ${max} colab.`;
    return `${t.planoComercial.nome} (${formatarReais(t.planoComercial.valorCentavos)}/mês · ${lim})`;
  }
  return PLANO_LABEL[t.plano] || t.plano;
}

function SelectPlanoComercial({ planos, value, onChange }) {
  const ativos = planos.filter((p) => p.ativo);
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Plano comercial</label>
      <select className="input" value={value || ''} onChange={onChange}>
        <option value="">Selecione um plano…</option>
        {ativos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome} — {formatarReais(p.valorCentavos)}/mês
            {p.maxColaboradores != null ? ` · até ${p.maxColaboradores} colab.` : ' · ilimitado'}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectModoMarcacao({ value, onChange }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>
        Modo de marcação de ponto
      </label>
      <select className="input" value={value || 'QUATRO_BATIDAS'} onChange={onChange}>
        <option value="QUATRO_BATIDAS">4 batidas (entrada, intervalo, retorno, saída)</option>
        <option value="DUAS_BATIDAS">2 batidas (entrada e saída, sem intervalo)</option>
      </select>
      <p style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 6, lineHeight: 1.45 }}>
        Prefeituras e órgãos públicos que registram só entrada e saída devem escolher 2 batidas.
      </p>
    </div>
  );
}

export default function SuperAdmin() {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [aba, setAba] = useState('empresas');
  const [stats, setStats] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [form, setForm] = useState({
    razaoSocial:'', nomeFantasia:'', cnpj:'', email:'', telefone:'', planoComercialId:'',
    modoMarcacao:'QUATRO_BATIDAS',
    adminNome:'', adminEmail:'', adminSenha:'',
  });
  const [formEditar, setFormEditar] = useState({
    razaoSocial:'', nomeFantasia:'', cnpj:'', email:'', telefone:'', planoComercialId:'',
    modoMarcacao:'QUATRO_BATIDAS',
    contractStartDate:'', periodoContrato:'', payrollModuleEnabled:false,
  });
  const [modalAdmin, setModalAdmin] = useState(null);
  const [formAdmin, setFormAdmin] = useState({ nome:'', email:'', senha:'' });
  const [salvando, setSalvando] = useState(false);
  const [confirmacaoFolha, setConfirmacaoFolha] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const [{ data: t }, { data: s }, planosRes] = await Promise.all([
        superAdminService.listarTenants(),
        superAdminService.stats(),
        superAdminService.listarPlanos({ ativos: '1' }).catch(() => ({ data: [] })),
      ]);
      setTenants(t);
      setStats(s);
      setPlanos(planosRes.data || []);
    } catch (e) {
      alert(mensagemErroApi(e, 'Erro ao carregar empresas'));
    } finally { setCarregando(false); }
  }

  function abrirNovo() {
    const primeiroPlano = planos.find((p) => p.ativo)?.id || '';
    setForm({
      razaoSocial:'', nomeFantasia:'', cnpj:'', email:'', telefone:'', planoComercialId: primeiroPlano,
      modoMarcacao:'QUATRO_BATIDAS',
      adminNome:'', adminEmail:'', adminSenha:'',
    });
    setModal(true);
  }

  async function gerarCobrancaPlano(t) {
    const planoId = t.planoComercialId || t.planoComercial?.id;
    let escolhido = planoId;
    if (!escolhido && planos.length) {
      const idx = window.prompt(`Informe o número do plano para cobrar ${t.nomeFantasia}:\n${planos.filter((p) => p.ativo).map((p, i) => `${i + 1}. ${p.nome}`).join('\n')}`);
      if (!idx) return;
      const p = planos.filter((x) => x.ativo)[parseInt(idx, 10) - 1];
      if (!p) return alert('Plano inválido');
      escolhido = p.id;
    }
    if (!escolhido) return alert('Vincule um plano comercial à empresa antes de cobrar.');
    try {
      const { data } = await superAdminService.criarCobrancaPlano(t.id, { planoComercialId: escolhido });
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        alert(data.mensagem || 'Link de pagamento aberto em nova aba.');
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao gerar cobrança InfinitePay');
    }
  }

  async function criarTenant() {
    const senhaAdmin = String(form.adminSenha || '').trim();
    if (senhaAdmin) {
      const val = validarSenhaForte(senhaAdmin);
      if (!val.ok) return alert(val.error);
    }
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

  function toInputDate(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const PERIODO_LABEL = { MENSAL: 'Mensal', SEMESTRAL: 'Semestral', ANUAL: 'Anual' };

  function calcularFimPreview(inicioStr, periodo) {
    if (!inicioStr || !periodo || periodo === 'SEM_LIMITE') return '';
    const meses = periodo === 'MENSAL' ? 1 : periodo === 'SEMESTRAL' ? 6 : 12;
    const d = new Date(inicioStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + meses);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('pt-BR');
  }

  function diasAteExpiracao(contractEndDate) {
    if (!contractEndDate) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fim = new Date(contractEndDate);
    fim.setHours(0, 0, 0, 0);
    return Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
  }

  function abrirEditar(t) {
    setFormEditar({
      razaoSocial: t.razaoSocial,
      nomeFantasia: t.nomeFantasia,
      cnpj: t.cnpj,
      email: t.email,
      telefone: t.telefone || '',
      planoComercialId: t.planoComercialId || t.planoComercial?.id || '',
      modoMarcacao: t.modoMarcacao || 'QUATRO_BATIDAS',
      contractStartDate: toInputDate(t.contractStartDate),
      periodoContrato: t.periodoContrato || 'SEM_LIMITE',
      payrollModuleEnabled: isFolhaHabilitada(t.features),
    });
    setModalEditar(t);
  }

  function mensagemErroApi(e, fallback) {
    const data = e?.response?.data;
    if (typeof data === 'string') {
      if (data.includes('Cannot PUT') && data.includes('/features')) {
        return `Backend sem rota de folha em ${API_URL}. No Railway, redeploy do backend (branch main). No Vercel, confira REACT_APP_API_URL e faça redeploy do frontend.`;
      }
      if (data.trim()) return data;
    }
    if (data?.error) return data.error;
    if (data?.code === 'DB_SCHEMA_OUTDATED') {
      return 'Banco desatualizado: rode `npx prisma migrate deploy` no servidor do backend e reinicie o serviço.';
    }
    if (e?.response?.status === 404) {
      return 'Endpoint não encontrado — verifique se o backend foi atualizado e reiniciado.';
    }
    if (e?.message === 'Network Error') return 'Falha de conexão com o servidor.';
    return fallback;
  }

  async function salvarEdicao() {
    if (!modalEditar) return;
    setSalvando(true);
    try {
      const {
        contractStartDate,
        periodoContrato,
        payrollModuleEnabled,
        ...tenantData
      } = formEditar;

      const habilitarFolha = Boolean(payrollModuleEnabled);
      const folhaAnterior = isFolhaHabilitada(modalEditar.features);
      const folhaMudou = folhaAnterior !== habilitarFolha;

      const contratoPayload = {
        contractStartDate: periodoContrato && periodoContrato !== 'SEM_LIMITE' ? contractStartDate : null,
        periodoContrato: periodoContrato === 'SEM_LIMITE' ? null : periodoContrato,
      };

      const { data: tenantAtualizado } = await superAdminService.atualizarTenant(modalEditar.id, {
        ...tenantData,
        ...contratoPayload,
        payrollModuleEnabled: habilitarFolha,
      });

      let features = tenantAtualizado?.features;

      if (isFolhaHabilitada(features) !== habilitarFolha) {
        try {
          const { data } = await superAdminService.atualizarFeatures(modalEditar.id, {
            payrollModuleEnabled: habilitarFolha,
          });
          features = data;
        } catch (errFeatures) {
          const body = errFeatures?.response?.data;
          const html404 = typeof body === 'string' && body.includes('Cannot PUT');
          if (html404 || errFeatures?.response?.status === 404) {
            throw Object.assign(new Error('Backend sem rota de folha'), {
              response: {
                data: {
                  error:
                    `API em uso: ${API_URL}\n\n` +
                    '1) Railway → serviço backend → Redeploy (branch main, commit mais recente)\n' +
                    '2) Vercel → Settings → Environment Variables → REACT_APP_API_URL deve apontar para SEU Railway (ex.: https://backend-pontofacil-hom-production.up.railway.app/api)\n' +
                    '3) Vercel → Redeploy do frontend após alterar a variável',
                  code: 'BACKEND_OUTDATED',
                },
              },
            });
          }
          throw errFeatures;
        }
      }

      if (isFolhaHabilitada(features) !== habilitarFolha) {
        throw Object.assign(new Error('Módulo folha não foi gravado no banco'), {
          response: {
            data: {
              error: `Falha ao gravar folha (esperado: ${habilitarFolha}, retorno: ${String(features?.payrollModuleEnabled)})`,
              code: 'FEATURE_SAVE_FAILED',
            },
          },
        });
      }

      const empresaNome = modalEditar.nomeFantasia;

      setTenants((prev) => prev.map((t) => {
        if (t.id !== modalEditar.id) return t;
        return {
          ...t,
          ...tenantAtualizado,
          features,
        };
      }));

      setModalEditar(null);

      if (folhaMudou) {
        setConfirmacaoFolha({ nomeFantasia: empresaNome, habilitado: habilitarFolha });
      }
    } catch (e) {
      alert(mensagemErroApi(e, 'Erro ao salvar'));
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
    const senhaAdmin = String(formAdmin.senha || '').trim();
    if (senhaAdmin) {
      const val = validarSenhaForte(senhaAdmin);
      if (!val.ok) return alert(val.error);
    }
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
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#FFFFFF', fontSize: '13px' }}>{usuario?.email}</span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: '#FFFFFF',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <AppIcon name={theme === 'dark' ? 'sun' : 'moon'} size={18} color="#FFFFFF" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ padding:'32px', maxWidth:'1100px', margin:'0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { id: 'empresas', label: 'Empresas' },
            { id: 'planos', label: 'Planos comerciais' },
            { id: 'integracoes', label: 'Integrações' },
          ].map((tab) => {
            const ativo = aba === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAba(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: ativo ? '2px solid var(--verde)' : '1px solid var(--border)',
                  background: ativo ? 'var(--verde-claro)' : 'var(--surface)',
                  color: ativo ? 'var(--verde-escuro)' : 'var(--text-secondary)',
                  fontWeight: ativo ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {aba === 'planos' ? (
          <SuperAdminPlanos />
        ) : aba === 'integracoes' ? (
          <SuperAdminIntegracoes />
        ) : (
        <>
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
                                style={saActionBtn('var(--vermelho)')}
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
                      <td style={{ fontSize: '12px', maxWidth: 160 }}>
                        <span className="badge badge-cinza">{labelPlanoTenant(t)}</span>
                      </td>
                      <td>
                        <span className={`badge ${badge.classe}`}>{badge.label}</span>
                        {t.periodoContrato && (
                          <div style={{ fontSize: 11, color: 'var(--cinza-400)', marginTop: 4 }}>
                            {PERIODO_LABEL[t.periodoContrato] || t.periodoContrato}
                          </div>
                        )}
                        {t.periodoContrato && t.contractEndDate && (() => {
                          const dias = diasAteExpiracao(t.contractEndDate);
                          if (dias == null) return null;
                          if (dias < 0) return <div style={{ fontSize: 11, color: 'var(--vermelho)', marginTop: 4 }}>Contrato expirado</div>;
                          return <div style={{ fontSize: 11, color: dias <= 7 ? 'var(--amarelo)' : 'var(--cinza-400)', marginTop: 4 }}>Expira em {dias}d</div>;
                        })()}
                        {isFolhaHabilitada(t.features) && (
                          <div style={{ fontSize: 11, color: 'var(--verde)', marginTop: 4 }}>Folha ativa</div>
                        )}
                      </td>
                      <td style={{ textAlign:'center' }}>{t._count.usuarios}</td>
                      <td style={{ textAlign:'center' }}>{t._count.registros}</td>
                      <td style={{ fontSize:'12px', color:'var(--cinza-400)' }}>{format(new Date(t.createdAt), 'dd/MM/yyyy')}</td>
                      <td>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <button type="button" onClick={() => abrirEditar(t)} style={saActionBtn('var(--azul)')}>Editar</button>
                          <button type="button" onClick={() => gerarCobrancaPlano(t)} style={saActionBtn('#a78bfa')} title="Gerar link InfinitePay">Cobrar plano</button>
                          {t.status === 'ATIVO' && (
                            <button type="button" onClick={() => abrirCadastroAdmin(t)} style={saActionBtn('var(--verde)')} title="Criar usuário administrador (acesso ao painel)">Cadastrar admin</button>
                          )}
                          {t.status === 'ATIVO' && (
                            <button type="button" onClick={() => alterarStatus(t.id, 'SUSPENSO')} style={saActionBtn('var(--amarelo)')}>Suspender</button>
                          )}
                          {t.status === 'SUSPENSO' && (
                            <button type="button" onClick={() => alterarStatus(t.id, 'ATIVO')} style={saActionBtn('var(--verde)')}>Reativar</button>
                          )}
                          {t.status !== 'CANCELADO' && (
                            <button type="button" onClick={() => alterarStatus(t.id, 'CANCELADO')} style={saActionBtn('var(--vermelho)')}>Cancelar</button>
                          )}
                          {t._count?.registros > 0 && (
                            <button
                              type="button"
                              onClick={() => limparPontosEmpresa(t)}
                              style={saActionBtn('var(--vermelho)')}
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
        </>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Nova Empresa"
        titleId="superadmin-modal-nova-empresa-title"
        maxWidth={480}
        footer={(
          <>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => setModal(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary btn-full" onClick={criarTenant} disabled={salvando}>
              {salvando ? 'Criando...' : 'Criar Empresa'}
            </button>
          </>
        )}
      >
              <div style={{ display: 'grid', gap: '14px', paddingBottom: 8 }}>
                <p style={{ fontSize: '12px', color: 'var(--cinza-400)', marginBottom: '8px' }}>Dados da empresa</p>
                {[
                  { key: 'razaoSocial', label: 'Razão Social', type: 'text' },
                  { key: 'nomeFantasia', label: 'Nome Fantasia', type: 'text' },
                  { key: 'cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0001-00' },
                  { key: 'email', label: 'E-mail da empresa', type: 'email' },
                  { key: 'telefone', label: 'Telefone (opcional)', type: 'text' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>{f.label}</label>
                    <input
                      className="input"
                      type={f.type}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <SelectPlanoComercial
                  planos={planos}
                  value={form.planoComercialId}
                  onChange={(e) => setForm((p) => ({ ...p, planoComercialId: e.target.value }))}
                />
                <SelectModoMarcacao
                  value={form.modoMarcacao}
                  onChange={(e) => setForm((p) => ({ ...p, modoMarcacao: e.target.value }))}
                />
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--cinza-400)',
                    margin: '16px 0 8px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--cinza-200)',
                  }}
                >
                  Administrador da empresa (acesso ao painel / dashboard)
                </p>
                {[
                  { key: 'adminNome', label: 'Nome do administrador', type: 'text' },
                  { key: 'adminEmail', label: 'E-mail de login', type: 'email' },
                  { key: 'adminSenha', label: 'Senha inicial (opcional — em branco = convite por e-mail)', type: 'password' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>{f.label}</label>
                    {f.key === 'adminSenha' && (
                      <p style={{ fontSize: '12px', color: 'var(--cinza-400)', margin: '0 0 6px', lineHeight: 1.45 }}>{PASSWORD_HINT}</p>
                    )}
                    <input
                      className="input"
                      type={f.type}
                      autoComplete="new-password"
                      value={form[f.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
      </Modal>

      <Modal
        open={!!modalEditar}
        onClose={() => setModalEditar(null)}
        title="Editar empresa"
        subtitle="Altere os dados cadastrais. O status (suspenso/ativo) continua nas ações da tabela."
        titleId="superadmin-modal-editar-title"
        maxWidth={480}
        footer={(
          <>
            <button className="btn btn-secondary btn-full" type="button" onClick={() => setModalEditar(null)}>Cancelar</button>
            <button className="btn btn-primary btn-full" type="button" onClick={salvarEdicao} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        )}
      >
              <div style={{ display: 'grid', gap: '14px', paddingBottom: 8 }}>
                {[
                  { key: 'razaoSocial', label: 'Razão Social', type: 'text' },
                  { key: 'nomeFantasia', label: 'Nome Fantasia', type: 'text' },
                  { key: 'cnpj', label: 'CNPJ', type: 'text' },
                  { key: 'email', label: 'E-mail da empresa', type: 'email' },
                  { key: 'telefone', label: 'Telefone', type: 'text' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>{f.label}</label>
                    <input
                      className="input"
                      type={f.type}
                      value={formEditar[f.key]}
                      onChange={(e) => setFormEditar((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <SelectPlanoComercial
                  planos={planos}
                  value={formEditar.planoComercialId}
                  onChange={(e) => setFormEditar((p) => ({ ...p, planoComercialId: e.target.value }))}
                />
                <SelectModoMarcacao
                  value={formEditar.modoMarcacao}
                  onChange={(e) => setFormEditar((p) => ({ ...p, modoMarcacao: e.target.value }))}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formEditar.payrollModuleEnabled)}
                    onChange={(e) => setFormEditar((p) => ({ ...p, payrollModuleEnabled: e.target.checked }))}
                  />
                  Módulo Folha de Pagamento habilitado
                </label>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Vigência do contrato</label>
                  <select
                    className="input"
                    value={formEditar.periodoContrato || 'SEM_LIMITE'}
                    onChange={(e) => setFormEditar((p) => ({ ...p, periodoContrato: e.target.value }))}
                  >
                    <option value="SEM_LIMITE">Sem limite (padrão produção)</option>
                    <option value="MENSAL">Mensal</option>
                    <option value="SEMESTRAL">Semestral</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                  <p style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 6 }}>
                    Ao vencer, o sistema suspende o acesso automaticamente (sem integração externa).
                  </p>
                </div>
                {formEditar.periodoContrato && formEditar.periodoContrato !== 'SEM_LIMITE' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Data de início</label>
                    <input
                      className="input"
                      type="date"
                      required
                      value={formEditar.contractStartDate}
                      onChange={(e) => setFormEditar((p) => ({ ...p, contractStartDate: e.target.value }))}
                    />
                    {formEditar.contractStartDate && (
                      <p style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 6 }}>
                        Término previsto: <strong>{calcularFimPreview(formEditar.contractStartDate, formEditar.periodoContrato)}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
      </Modal>

      <Modal
        open={!!modalAdmin}
        onClose={() => setModalAdmin(null)}
        title="Administrador da empresa"
        subtitle={modalAdmin ? `${modalAdmin.nomeFantasia} — este usuário acessa o painel em /login com e-mail e senha (mesmo fluxo do gerente).` : ''}
        titleId="superadmin-modal-admin-title"
        maxWidth={440}
        footer={(
          <>
            <button className="btn btn-secondary btn-full" type="button" onClick={() => setModalAdmin(null)}>Cancelar</button>
            <button className="btn btn-primary btn-full" type="button" onClick={salvarAdmin} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </button>
          </>
        )}
      >
              <div style={{ display: 'grid', gap: '14px', paddingBottom: 8 }}>
                {[
                  { key: 'nome', label: 'Nome completo', type: 'text' },
                  { key: 'email', label: 'E-mail de login', type: 'email' },
                  { key: 'senha', label: 'Senha (opcional — em branco = convite por e-mail)', type: 'password' },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>{f.label}</label>
                    {f.key === 'senha' && (
                      <p style={{ fontSize: '12px', color: 'var(--cinza-400)', margin: '0 0 6px', lineHeight: 1.45 }}>{PASSWORD_HINT}</p>
                    )}
                    <input
                      className="input"
                      type={f.type}
                      autoComplete="new-password"
                      value={formAdmin[f.key]}
                      onChange={(e) => setFormAdmin((p) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
      </Modal>

      <Modal
        open={!!confirmacaoFolha}
        onClose={() => setConfirmacaoFolha(null)}
        title={confirmacaoFolha?.habilitado ? 'Folha habilitada' : 'Folha desabilitada'}
        maxWidth={440}
        footer={(
          <button type="button" className="btn btn-primary btn-full" onClick={() => setConfirmacaoFolha(null)}>
            Entendi
          </button>
        )}
      >
        <p style={{ fontSize: 14, color: 'var(--cinza-700)', lineHeight: 1.55, margin: '0 0 12px' }}>
          <strong>{confirmacaoFolha?.nomeFantasia}</strong>
          {confirmacaoFolha?.habilitado
            ? ' agora tem o módulo de Folha de Pagamento ativo.'
            : ' não tem mais o módulo de Folha de Pagamento.'}
        </p>
        {confirmacaoFolha?.habilitado && (
          <p style={{ fontSize: 13, color: 'var(--cinza-400)', lineHeight: 1.5, margin: 0 }}>
            O administrador da empresa verá o menu <strong>Folha de pagamento</strong> ao
            acessar o painel (pode ser necessário atualizar a página — F5).
          </p>
        )}
      </Modal>
    </div>
  );
}
