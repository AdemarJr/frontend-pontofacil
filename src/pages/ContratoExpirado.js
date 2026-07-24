import { Link } from 'react-router-dom';

export default function ContratoExpirado() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--cinza-100)' }}>
      <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Contrato expirado</h1>
        <p style={{ color: 'var(--cinza-400)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          O período de assinatura da sua empresa chegou ao fim. Entre em contato com o suporte PontoFácil para renovar o acesso.
        </p>
        <a href="mailto:contato@pontofacil.digital" className="btn btn-primary" style={{ marginRight: 12 }}>
          Solicitar renovação
        </a>
        <Link to="/login" className="btn btn-secondary">Voltar ao login</Link>
      </div>
    </div>
  );
}
