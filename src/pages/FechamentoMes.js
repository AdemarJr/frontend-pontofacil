import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { colaboradorService } from '../services/api';

function mesAnoAtual() {
  const d = new Date();
  return { mes: d.getMonth() + 1, ano: d.getFullYear() };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtCompetencia({ mes, ano }) {
  try {
    const d = new Date(ano, mes - 1, 1);
    return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return `${pad2(mes)}/${ano}`;
  }
}

function shortHash(h) {
  const s = String(h || '');
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function CanvasAssinatura({ onChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);

  function resizeToContainer() {
    const canvas = canvasRef.current;
    const wrap = containerRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const cssW = Math.max(260, Math.floor(rect.width));
    const cssH = 170;
    const dpr = window.devicePixelRatio || 1;

    const prevDataUrl = canvas.width > 0 ? canvas.toDataURL('image/png') : null;

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(226,232,240,0.95)';
    ctx.fillStyle = 'rgba(15,23,42,0.35)';
    ctx.fillRect(0, 0, cssW, cssH);

    if (prevDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, cssW, cssH);
      };
      img.src = prevDataUrl;
    }
  }

  useEffect(() => {
    resizeToContainer();
    const onResize = () => resizeToContainer();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function getPointFromEvent(e) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (clientX == null || clientY == null) return null;
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), t: Date.now() };
  }

  function drawLine(a, b) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function start(e) {
    e.preventDefault();
    const p = getPointFromEvent(e);
    if (!p) return;
    drawingRef.current = true;
    const stroke = { points: [p] };
    activeStrokeRef.current = stroke;
    strokesRef.current = [...strokesRef.current, stroke];
  }

  function move(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const p = getPointFromEvent(e);
    if (!p) return;
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(p);
    drawLine(prev, p);
  }

  function end(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    activeStrokeRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange?.({
      dataUrl,
      strokes: strokesRef.current,
    });
  }

  function limpar() {
    strokesRef.current = [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = 'rgba(15,23,42,0.35)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    const dataUrl = canvas.toDataURL('image/png');
    onChange?.({ dataUrl, strokes: [] });
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          borderRadius: 14,
          border: '1px solid rgba(148,163,184,0.18)',
          overflow: 'hidden',
          background: 'rgba(15,23,42,0.35)',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          style={{ display: 'block', touchAction: 'none', cursor: 'crosshair' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Assine com o dedo ou mouse.</span>
        <button type="button" className="btn btn-secondary" onClick={limpar} style={{ padding: '8px 12px', fontSize: 12 }}>
          Limpar assinatura
        </button>
      </div>
    </div>
  );
}

export default function FechamentoMes() {
  const [competencia, setCompetencia] = useState(mesAnoAtual);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [espelho, setEspelho] = useState(null);
  const [espelhoHash, setEspelhoHash] = useState('');
  const [fechamento, setFechamento] = useState(null);

  const [assinatura, setAssinatura] = useState({ dataUrl: '', strokes: [] });
  const [salvando, setSalvando] = useState(false);

  const titulo = useMemo(() => fmtCompetencia(competencia), [competencia]);

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const { data } = await colaboradorService.espelhoMeu(competencia);
      setEspelho(data.espelho || null);
      setEspelhoHash(data.espelhoHash || '');
      setFechamento(data.fechamento || null);
    } catch (e) {
      setEspelho(null);
      setEspelhoHash('');
      setFechamento(null);
      setErro(e?.response?.data?.error || e?.message || 'Não foi possível carregar o espelho.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [competencia.mes, competencia.ano]); // intencional: recarrega ao mudar competência

  async function baixarPdf() {
    try {
      await colaboradorService.downloadEspelhoMeuExport({ ...competencia, format: 'pdf' });
    } catch (e) {
      alert(e?.message || e?.response?.data?.error || 'Não foi possível baixar o PDF.');
    }
  }

  async function aprovar() {
    setSalvando(true);
    try {
      const { data } = await colaboradorService.fecharMes({
        ...competencia,
        assinaturaDataUrl: assinatura?.dataUrl || undefined,
        assinaturaStrokes: assinatura?.strokes?.length ? assinatura.strokes : undefined,
        deviceId: localStorage.getItem('deviceId') || undefined,
      });
      setFechamento(data.fechamento || null);
      alert('Fechamento registrado com sucesso.');
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Não foi possível registrar o fechamento.');
    } finally {
      setSalvando(false);
    }
  }

  const fechado = Boolean(fechamento?.id);

  return (
    <div className="colaborador-page">
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Fechamento do mês
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 18, lineHeight: 1.55 }}>
        Revise seu espelho de ponto e registre o aceite. Você pode baixar o PDF para arquivar.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 16,
          alignItems: 'end',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>
            Mês
          </label>
          <select
            className="input"
            value={competencia.mes}
            onChange={(e) => setCompetencia((p) => ({ ...p, mes: Number(e.target.value) }))}
            style={{ width: '100%' }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {pad2(m)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: 12, marginBottom: 6, fontWeight: 700 }}>
            Ano
          </label>
          <select
            className="input"
            value={competencia.ano}
            onChange={(e) => setCompetencia((p) => ({ ...p, ano: Number(e.target.value) }))}
            style={{ width: '100%' }}
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
          border: '1px solid rgba(148,163,184,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, color: '#e2e8f0', fontSize: 14 }}>Competência</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>{titulo}</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={baixarPdf} style={{ padding: '10px 14px', fontSize: 13 }}>
            Baixar PDF
          </button>
        </div>

        {carregando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 18 }}>
            <div className="spinner" />
          </div>
        ) : erro ? (
          <div style={{ marginTop: 12, color: '#fecaca', fontSize: 13, whiteSpace: 'pre-line' }}>{erro}</div>
        ) : !espelho ? (
          <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 13 }}>Sem dados para este mês.</div>
        ) : (
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {[
                { label: 'Total trabalhado', value: espelho.totalHoras },
                { label: 'Saldo do mês', value: espelho.saldoMes },
                { label: 'Hora extra', value: espelho.horaExtraMes },
                { label: 'Esperado (escala)', value: espelho.totalEsperadoMin != null ? `${Math.round(espelho.totalEsperadoMin / 60)}h` : '—' },
              ].map((it) => (
                <div
                  key={it.label}
                  style={{
                    background: 'rgba(15,23,42,0.25)',
                    border: '1px solid rgba(148,163,184,0.16)',
                    borderRadius: 14,
                    padding: 12,
                    minWidth: 0,
                  }}
                >
                  <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800 }}>{it.label}</div>
                  <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 900, marginTop: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                    {it.value || '—'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>
                Hash do espelho: <span style={{ color: '#e2e8f0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{shortHash(espelhoHash)}</span>
              </div>
              {fechado ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'rgba(29,158,117,0.18)',
                    border: '1px solid rgba(29,158,117,0.30)',
                    color: '#86efac',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                  title="Aceite registrado"
                >
                  ✓ Fechado em {fechamento?.aprovadoEm ? new Date(fechamento.aprovadoEm).toLocaleString('pt-BR') : '—'}
                </span>
              ) : (
                <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 900 }}>Pendente de aceite</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 18,
          border: '1px solid rgba(148,163,184,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 900, margin: 0 }}>Aceite com assinatura</h2>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Opcional (mas recomendado)</span>
        </div>

        <div style={{ marginTop: 12 }}>
          <CanvasAssinatura onChange={setAssinatura} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={aprovar}
            disabled={salvando || carregando || !!erro || !espelho}
            style={{ flex: '1 1 220px' }}
          >
            {salvando ? 'Salvando…' : (fechado ? 'Assinar novamente / Atualizar aceite' : 'Aprovar e assinar')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={carregar} disabled={carregando || salvando} style={{ flex: '0 0 auto' }}>
            Atualizar
          </button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 10, lineHeight: 1.55 }}>
          Ao aprovar, registramos data/hora e um hash do espelho do mês (integridade). Se houver divergência, não aprove e solicite ajuste ao RH.
        </p>
      </div>
    </div>
  );
}

