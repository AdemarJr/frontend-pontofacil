// Controles de paginação reutilizáveis para tabelas e listas

/** Fatia um array já carregado (paginação no cliente). */
export function slicePaged(items, page, pageSize) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: list.slice(start, start + pageSize),
    total,
    totalPages,
    safePage,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  };
}

const btnStyle = (disabled) => ({
  background: 'none',
  border: '1px solid var(--cinza-200)',
  borderRadius: '8px',
  padding: '6px 12px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '13px',
  color: disabled ? 'var(--cinza-300)' : 'var(--cinza-700)',
  opacity: disabled ? 0.6 : 1,
});

/**
 * @param {{
 *   page: number;
 *   pageSize: number;
 *   total: number;
 *   onPageChange: (p: number) => void;
 *   onPageSizeChange?: (n: number) => void;
 *   pageSizeOptions?: number[];
 *   style?: React.CSSProperties;
 * }} props
 */
export default function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  style,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginTop: '16px',
        fontSize: '13px',
        color: 'var(--cinza-400)',
        ...style,
      }}
    >
      <span>
        Mostrando <strong style={{ color: 'var(--cinza-700)' }}>{from}</strong>–
        <strong style={{ color: 'var(--cinza-700)' }}>{to}</strong> de{' '}
        <strong style={{ color: 'var(--cinza-700)' }}>{total}</strong>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {typeof onPageSizeChange === 'function' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            Por página
            <select
              className="input"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', minWidth: '72px' }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          style={btnStyle(safePage <= 1)}
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Anterior
        </button>
        <span style={{ color: 'var(--cinza-700)', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
          Página {safePage} / {totalPages}
        </span>
        <button
          type="button"
          style={btnStyle(safePage >= totalPages)}
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
