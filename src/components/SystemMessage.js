import { useEffect } from 'react';

/**
 * Mensagem de sistema (toast/banner) — sucesso, aviso, erro ou info.
 * @param {{ type?: 'success'|'error'|'warning'|'info', title?: string, children: import('react').ReactNode, onClose?: () => void, autoHideMs?: number }} props
 */
export default function SystemMessage({
  type = 'info',
  title,
  children,
  onClose,
  autoHideMs = 0,
}) {
  useEffect(() => {
    if (!autoHideMs || !onClose) return undefined;
    const t = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(t);
  }, [autoHideMs, onClose]);

  if (children == null || children === '') return null;

  return (
    <div
      className={`system-message system-message--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <div className="system-message__body">
        {title ? <strong className="system-message__title">{title}</strong> : null}
        <div className="system-message__text">{children}</div>
      </div>
      {onClose ? (
        <button type="button" className="system-message__close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
      ) : null}
    </div>
  );
}
