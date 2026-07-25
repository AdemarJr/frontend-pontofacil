// Gestão de planos comerciais (Super Admin)
import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { superAdminService } from '../services/api';

function formatarReais(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const formVazio = () => ({
  nome: '',
  descricao: '',
  valorReais: '',
  maxColaboradores: '',
  ordem: 0,
  ativo: true,
});

export default function SuperAdminPlanos() {
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(formVazio());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await superAdminService.listarPlanos();
      setPlanos(data);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao carregar planos');
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setForm(formVazio());
    setModal('novo');
  }

  function abrirEditar(p) {
    setForm({
      nome: p.nome,
      descricao: p.descricao || '',
      valorReais: (p.valorCentavos / 100).toFixed(2).replace('.', ','),
      maxColaboradores: p.maxColaboradores ?? '',
      ordem: p.ordem ?? 0,
      ativo: p.ativo,
    });
    setModal(p);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        valorReais: form.valorReais,
        maxColaboradores: form.maxColaboradores === '' ? null : form.maxColaboradores,
        ordem: form.ordem,
        ativo: form.ativo,
      };
      if (modal === 'novo') {
        await superAdminService.criarPlano(payload);
      } else {
        await superAdminService.atualizarPlano(modal.id, payload);
      }
      setModal(null);
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao salvar plano');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(p) {
    if (!window.confirm(`Remover/desativar o plano "${p.nome}"?`)) return;
    try {
      const { data } = await superAdminService.removerPlano(p.id);
      alert(data.mensagem || (data.removido ? 'Plano removido' : 'Plano atualizado'));
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao remover plano');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Planos comerciais</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--cinza-400)', fontSize: 14 }}>
            Defina valor mensal e limite de colaboradores para vincular às empresas.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={abrirNovo}>+ Novo plano</button>
      </div>

      <div className="card table-scroll" style={{ padding: 0 }}>
        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Valor/mês</th>
                <th>Colaboradores</th>
                <th>Empresas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.nome}</div>
                    {p.descricao && <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{p.descricao}</div>}
                  </td>
                  <td>{formatarReais(p.valorCentavos)}</td>
                  <td>{p.maxColaboradores == null ? 'Ilimitado' : `Até ${p.maxColaboradores}`}</td>
                  <td style={{ textAlign: 'center' }}>{p._count?.tenants ?? 0}</td>
                  <td>
                    <span className={`badge ${p.ativo ? 'badge-verde' : 'badge-cinza'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => abrirEditar(p)} style={{ background: 'none', border: '1px solid var(--azul)', color: 'var(--azul)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Editar</button>
                      <button type="button" onClick={() => excluir(p)} style={{ background: 'none', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!planos.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--cinza-400)' }}>Nenhum plano cadastrado</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          open={!!modal}
          onClose={() => setModal(null)}
          title={modal === 'novo' ? 'Novo plano' : 'Editar plano'}
          maxWidth={480}
          footer={(
            <>
              <button type="button" className="btn btn-secondary btn-full" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary btn-full" disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Nome *</label>
              <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Descrição</label>
              <input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Valor mensal (R$) *</label>
                <input className="input" value={form.valorReais} onChange={(e) => setForm({ ...form, valorReais: e.target.value })} placeholder="99,90" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Máx. colaboradores</label>
                <input className="input" value={form.maxColaboradores} onChange={(e) => setForm({ ...form, maxColaboradores: e.target.value })} placeholder="Vazio = ilimitado" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Ordem de exibição</label>
                <input className="input" type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                  Plano ativo
                </label>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
