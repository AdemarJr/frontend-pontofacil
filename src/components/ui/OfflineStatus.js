import { useEffect, useState } from 'react';

/**
 * Indicador de conexão / sincronização (PWA).
 * @param {{ status?: 'online'|'offline'|'syncing'|'synced', label?: string, className?: string }} props
 */
export default function OfflineStatus({ status: statusProp, label, className = '' }) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const status = statusProp || (online ? 'online' : 'offline');

  const labels = {
    online: 'Online',
    offline: 'Offline',
    syncing: 'Sincronizando…',
    synced: 'Sincronizado',
  };

  return (
    <span
      className={`offline-status offline-status--${status} ${className}`.trim()}
      role="status"
      aria-live="polite"
      title={label || labels[status]}
    >
      <span className="offline-status__dot" aria-hidden="true" />
      <span className="offline-status__label">{label || labels[status]}</span>
    </span>
  );
}
