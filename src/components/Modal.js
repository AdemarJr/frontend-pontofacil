import { useEffect } from 'react';

/**
 * Modal responsivo: overlay com scroll + corpo rolável + rodapé fixo (Salvar/Cancelar sempre acessíveis).
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 480,
  zIndex = 1000,
  titleId,
  closeOnOverlay = true,
  variant = 'light',
  className = '',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const cardClass = [
    'modal-card',
    'card',
    variant === 'dark' ? 'modal-card--dark' : '',
    className,
  ].filter(Boolean).join(' ');

  const overlayClass = [
    'modal-overlay',
    variant === 'dark' ? 'modal-overlay--dark' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={overlayClass}
      style={{ zIndex }}
      role="presentation"
      onClick={closeOnOverlay ? (e) => e.target === e.currentTarget && onClose?.() : undefined}
    >
      <div
        className={cardClass}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="modal-header">
            {title && (
              <h2 id={titleId} className="modal-title">
                {title}
              </h2>
            )}
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
