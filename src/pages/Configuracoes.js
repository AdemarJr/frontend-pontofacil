// src/pages/Configuracoes.js
import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/dashboard/Layout';
import ListPagination, { slicePaged } from '../components/ListPagination';
import AppIcon from '../components/AppIcon';
import { tenantService, localRegistroService } from '../services/api';
import { runConfiguracoesTour } from '../tours/configuracoesTour';

export default function Configuracoes() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [locais, setLocais] = useState([]);
  const [novoLocal, setNovoLocal] = useState({ nome: '', latitude: '', longitude: '', raioMetros: 200 });
  const [salvandoLocal, setSalvandoLocal] = useState(false);
  const [locaisPage, setLocaisPage] = useState(1);
  const [locaisPageSize, setLocaisPageSize] = useState(10);

  useEffect(() => {
    tenantService.meu().then(({ data }) => {
      setConfig(data);
      setForm({
        permitirTotem: data.permitirTotem ?? true,
        permitirMeuPonto: data.permitirMeuPonto ?? true,
        geofenceLat: data.geofenceLat || '',
        geofenceLng: data.geofenceLng || '',
        geofenceRaio: data.geofenceRaio || 200,
        geofenceAtivo: data.geofenceAtivo,
        fotoObrigatoria: data.fotoObrigatoria,
        toleranciaMinutos: data.toleranciaMinutos || 5,
        trabalhoMinimoAntesSaidaMinutos: data.trabalhoMinimoAntesSaidaMinutos ?? 30,
        intervaloMinimoAlmocoMinutos: data.intervaloMinimoAlmocoMinutos ?? 30,
      });
    });
  }, []);

  function carregarLocais() {
    localRegistroService.listar().then(({ data }) => setLocais(data)).catch(() => setLocais([]));
  }

  useEffect(() => {
    if (config) carregarLocais();
  }, [config]);

  useEffect(() => {
    if (!config) return;
    const t = setTimeout(() => runConfiguracoesTour({ force: false }), 600);
    return () => clearTimeout(t);
  }, [config]);

  async function salvar() {
    setSalvando(true);
    try {
      await tenantService.atualizar(form);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } finally { setSalvando(false); }
  }

  async function adicionarLocal(e) {
    e.preventDefault();
    if (!novoLocal.nome || novoLocal.latitude === '' || novoLocal.longitude === '') return;
    setSalvandoLocal(true);
    try {
      await localRegistroService.criar({
        nome: novoLocal.nome,
        latitude: Number(novoLocal.latitude),
        longitude: Number(novoLocal.longitude),
        raioMetros: Number(novoLocal.raioMetros) || 200,
        ativo: true,
      });
      setNovoLocal({ nome: '', latitude: '', longitude: '', raioMetros: 200 });
      carregarLocais();
    } finally {
      setSalvandoLocal(false);
    }
  }

  async function removerLocal(id) {
    if (!window.confirm('Remover este local? Colaboradores vinculados ficarão sem restrição de local.')) return;
    await localRegistroService.remover(id);
    carregarLocais();
  }

  const { pageItems: locaisPagina, total: totalLocais, safePage: locaisSafePage } = useMemo(
    () => slicePaged(locais, locaisPage, locaisPageSize),
    [locais, locaisPage, locaisPageSize]
  );

  if (!config) return <Layout><div style={{ display:'flex', justifyContent:'center', padding:'80px' }}><div className="spinner" /></div></Layout>;

  const tenantId = config.id;

  return (
    <Layout>
      <div id="tour-cfg-header" style={{ marginBottom:'28px', display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
        <div>
        <h1 style={{ fontSize:'24px', fontWeight:'700' }}>Configurações</h1>
        <p style={{ color:'var(--cinza-400)', fontSize:'14px' }}>{config.nomeFantasia} · {config.cnpj}</p>
        </div>
        <button
          type="button"
          onClick={() => runConfiguracoesTour({ force: true })}
          style={{
            padding:'8px 14px',
            fontSize:'13px',
            fontWeight:600,
            color:'var(--verde-escuro)',
            background:'var(--verde-claro)',
            border:'1px solid rgba(29,158,117,0.35)',
            borderRadius:'8px',
            cursor:'pointer',
          }}
        >
          Como usar
        </button>
      </div>

      <div style={{ display:'grid', gap:'20px', maxWidth:'640px' }}>
        {/* ID do Totem */}
        <div id="tour-cfg-totem" className="card">
          <h2 style={{ fontSize:'15px', fontWeight:'600', marginBottom:'16px' }}>🖥 ID do Totem</h2>
          <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginBottom:'10px' }}>Cole este ID na configuração do tablet/celular fixo</p>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <code style={{ flex:1, background:'var(--cinza-100)', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', fontFamily:'monospace', wordBreak:'break-all' }}>{tenantId}</code>
            <button className="btn btn-secondary" style={{ flexShrink:0 }} onClick={() => navigator.clipboard.writeText(tenantId)}>Copiar</button>
          </div>
        </div>

        {/* Canais de registro */}
        <div className="card">
          <h2 style={{ fontSize:'15px', fontWeight:'600', marginBottom:'16px' }}>🔀 Canais de registro</h2>
          <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginBottom:'12px', lineHeight:1.5 }}>
            Defina por onde os colaboradores podem registrar ponto. Cada batida fica identificada no sistema como <strong>Totem</strong> ou <strong>Meu ponto</strong>.
          </p>
          <div style={{ display:'grid', gap:'10px' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(form.permitirTotem)}
                onChange={(e) => setForm((p) => ({ ...p, permitirTotem: e.target.checked }))}
                style={{ width:'18px', height:'18px', accentColor:'var(--verde)' }}
              />
              <span style={{ fontSize:'14px', fontWeight:'500' }}>Permitir registro pelo Totem</span>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(form.permitirMeuPonto)}
                onChange={(e) => setForm((p) => ({ ...p, permitirMeuPonto: e.target.checked }))}
                style={{ width:'18px', height:'18px', accentColor:'var(--verde)' }}
              />
              <span style={{ fontSize:'14px', fontWeight:'500' }}>Permitir registro pelo Meu ponto (celular)</span>
            </label>
          </div>
        </div>

        {/* Geofencing */}
        <div id="tour-cfg-geofence" className="card">
          <h2 style={{ fontSize:'15px', fontWeight:'600', marginBottom:'16px', display:'inline-flex', alignItems:'center', gap: 10 }}>
            <AppIcon name="mapa" size={18} aria-hidden />
            Geofencing
          </h2>

          <label style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', cursor:'pointer' }}>
            <input type="checkbox" checked={form.geofenceAtivo} onChange={e => setForm(p => ({...p, geofenceAtivo: e.target.checked}))} style={{ width:'18px', height:'18px', accentColor:'var(--verde)' }} />
            <span style={{ fontSize:'14px', fontWeight:'500' }}>Ativar restrição por localização</span>
          </label>
          <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginBottom:'12px', lineHeight:1.5 }}>
            Com a cerca ativa, <strong>o Meu ponto</strong> só registra dentro da área. Se você cadastrar <strong>locais nomeados</strong> abaixo,
            eles passam a valer no lugar de latitude/longitude únicas da empresa. Em Colaboradores, você pode restringir cada pessoa a um local.
          </p>

          {form.geofenceAtivo && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={{ display:'block', fontSize:'12px', color:'var(--cinza-400)', marginBottom:'6px' }}>Latitude</label>
                <input className="input" type="number" step="0.000001" placeholder="-23.5505" value={form.geofenceLat} onChange={e => setForm(p => ({...p, geofenceLat: e.target.value}))} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'12px', color:'var(--cinza-400)', marginBottom:'6px' }}>Longitude</label>
                <input className="input" type="number" step="0.000001" placeholder="-46.6333" value={form.geofenceLng} onChange={e => setForm(p => ({...p, geofenceLng: e.target.value}))} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', fontSize:'12px', color:'var(--cinza-400)', marginBottom:'6px' }}>Raio permitido: <strong>{form.geofenceRaio}m</strong></label>
                <input type="range" min="50" max="1000" step="10" value={form.geofenceRaio} onChange={e => setForm(p => ({...p, geofenceRaio: Number(e.target.value)}))} style={{ width:'100%', accentColor:'var(--verde)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Locais nomeados (múltiplas cercas) */}
        <div id="tour-cfg-locais" className="card">
          <h2 style={{ fontSize:'15px', fontWeight:'600', marginBottom:'8px' }}>📌 Locais permitidos (restrição de localização)</h2>
          <p style={{ fontSize:'13px', color:'var(--cinza-400)', marginBottom:'16px' }}>
            Cadastre filiais, obras ou entradas com nome, GPS e raio. Com cerca virtual ativa, basta existir um local cadastrado
            (ou use o mapa único acima se não houver locais).
          </p>
          <form onSubmit={adicionarLocal} style={{ display:'grid', gap:'10px', marginBottom:'16px' }}>
            <input
              className="input"
              placeholder="Nome do local (ex.: Matriz, Loja Centro)"
              value={novoLocal.nome}
              onChange={(e) => setNovoLocal((p) => ({ ...p, nome: e.target.value }))}
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
              <input
                className="input"
                type="number"
                step="0.000001"
                placeholder="Latitude"
                value={novoLocal.latitude}
                onChange={(e) => setNovoLocal((p) => ({ ...p, latitude: e.target.value }))}
              />
              <input
                className="input"
                type="number"
                step="0.000001"
                placeholder="Longitude"
                value={novoLocal.longitude}
                onChange={(e) => setNovoLocal((p) => ({ ...p, longitude: e.target.value }))}
              />
              <input
                className="input"
                type="number"
                min="50"
                max="2000"
                placeholder="Raio (m)"
                value={novoLocal.raioMetros}
                onChange={(e) => setNovoLocal((p) => ({ ...p, raioMetros: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={salvandoLocal} style={{ maxWidth:'200px' }}>
              {salvandoLocal ? 'Salvando…' : 'Adicionar local'}
            </button>
          </form>
          {locais.length === 0 ? (
            <p style={{ fontSize:'13px', color:'var(--cinza-400)' }}>Nenhum local nomeado. Usando o ponto único do geofencing acima (se preenchido).</p>
          ) : (
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {locaisPagina.map((l) => (
                <li
                  key={l.id}
                  style={{
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'space-between',
                    padding:'10px 0',
                    borderBottom:'1px solid var(--cinza-100)',
                    fontSize:'14px',
                  }}
                >
                  <span>
                    <strong>{l.nome}</strong>
                    <span style={{ color:'var(--cinza-400)', marginLeft:'8px', fontSize:'12px' }}>
                      {l.latitude?.toFixed(5)}, {l.longitude?.toFixed(5)} · {l.raioMetros}m
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize:'12px', padding:'4px 10px', color:'var(--vermelho)' }}
                    onClick={() => removerLocal(l.id)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          {locais.length > 0 && (
            <ListPagination
              style={{ marginTop: '16px' }}
              page={locaisSafePage}
              pageSize={locaisPageSize}
              total={totalLocais}
              onPageChange={setLocaisPage}
              onPageSizeChange={(n) => {
                setLocaisPageSize(n);
                setLocaisPage(1);
              }}
            />
          )}
        </div>

        {/* Registro */}
        <div id="tour-cfg-registro" className="card">
          <h2 style={{ fontSize:'15px', fontWeight:'600', marginBottom:'16px', display:'inline-flex', alignItems:'center', gap: 10 }}>
            <AppIcon name="camera" size={18} aria-hidden />
            Registro de Ponto
          </h2>

          <label style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', cursor:'pointer' }}>
            <input type="checkbox" checked={form.fotoObrigatoria} onChange={e => setForm(p => ({...p, fotoObrigatoria: e.target.checked}))} style={{ width:'18px', height:'18px', accentColor:'var(--verde)' }} />
            <span style={{ fontSize:'14px', fontWeight:'500' }}>Foto obrigatória no registro</span>
          </label>

          <div>
            <label style={{ display:'block', fontSize:'12px', color:'var(--cinza-400)', marginBottom:'6px' }}>Tolerância de atraso (minutos)</label>
            <input className="input" type="number" min="0" max="60" value={form.toleranciaMinutos} onChange={e => setForm(p => ({...p, toleranciaMinutos: Number(e.target.value)}))} style={{ maxWidth:'120px' }} />
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--cinza-700)' }}>
              Avisos de “registro cedo demais” (minutos)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--cinza-400)', margin: 0, lineHeight: 1.4 }}>
              O colaborador verá um aviso ao tentar registrar muito rápido após a última marcação, com opção de confirmar.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display:'block', fontSize:'12px', color:'var(--cinza-400)', marginBottom:'6px' }}>
                  Mínimo de trabalho antes de Saída/Saída almoço
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="600"
                  value={form.trabalhoMinimoAntesSaidaMinutos}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, trabalhoMinimoAntesSaidaMinutos: Number(e.target.value) }))
                  }
                  style={{ maxWidth: '160px' }}
                />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'12px', color:'var(--cinza-400)', marginBottom:'6px' }}>
                  Mínimo de intervalo antes do Retorno
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="600"
                  value={form.intervaloMinimoAlmocoMinutos}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, intervaloMinimoAlmocoMinutos: Number(e.target.value) }))
                  }
                  style={{ maxWidth: '160px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {sucesso && (
          <div style={{ background:'var(--verde-claro)', color:'var(--verde-escuro)', padding:'12px 16px', borderRadius:'8px', fontSize:'14px', fontWeight:'500' }}>
            ✓ Configurações salvas com sucesso!
          </div>
        )}

        <button id="tour-cfg-salvar" className="btn btn-primary btn-lg" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </Layout>
  );
}
