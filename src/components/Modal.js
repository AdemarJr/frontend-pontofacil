import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Pilha de modais abertos — Escape fecha só o do topo. */
const escapeStack = [];

function onGlobalEscape(e) {
  if (e.key !== 'Escape') return;
  const top = escapeStack[escapeStack.length - 1];
  if (!top) return;
  e.preventDefault();
  top.onClose?.();
}

/**
 * Modal responsivo via portal no document.body (evita blur/travamento por transform/overflow do layout).
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 480,
  zIndex = 10050,
  titleId: titleIdProp,
  closeOnOverlay = true,
  variant = 'light',
  className = '',
}) {
  const autoTitleId = useId();
  const titleId = titleIdProp || autoTitleId;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }

    const entry = {
      onClose: () => onCloseRef.current?.(),
    };
    escapeStack.push(entry);
    if (escapeStack.length === 1) {
      window.addEventListener('keydown', onGlobalEscape);
    }

    return () => {
      const idx = escapeStack.indexOf(entry);
      if (idx >= 0) escapeStack.splice(idx, 1);
      if (escapeStack.length === 0) {
        window.removeEventListener('keydown', onGlobalEscape);
      }
      // Só restaura scroll se não houver outro modal aberto
      if (escapeStack.length === 0) {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPaddingRight;
      }
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

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

  return createPortal(
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
        aria-labelledby={title ? titleId : undefined}
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
    </div>,
    document.body
  );
}
