/**
 * Agrupa IconAction em linha sem quebra desnecessária.
 */
export default function TableActions({ children, className = '' }) {
  return (
    <div className={`table-actions ${className}`.trim()} role="group">
      {children}
    </div>
  );
}
