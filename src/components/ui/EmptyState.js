import AppIcon from '../AppIcon';

/**
 * @param {{ icon?: string, title: string, description?: string, action?: import('react').ReactNode }} props
 */
export default function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="ds-empty" role="status">
      <div className="ds-empty__icon">
        <AppIcon name={icon} size={36} color="var(--text-disabled)" />
      </div>
      <p className="ds-empty__title">{title}</p>
      {description ? <p className="ds-empty__desc">{description}</p> : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}
