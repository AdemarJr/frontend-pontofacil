import AppIcon from '../AppIcon';

/**
 * Botão de ação compacto para listagens (ícone + tooltip).
 * @param {{ icon: string, label: string, onClick?: Function, tone?: 'danger'|'success'|'warning'|'info'|'accent', disabled?: boolean, className?: string }} props
 */
export default function IconAction({
  icon,
  label,
  onClick,
  tone,
  disabled = false,
  className = '',
  ...rest
}) {
  const toneClass = tone ? `icon-action--${tone}` : '';
  return (
    <button
      type="button"
      className={`btn btn-icon btn-ghost icon-action ${toneClass} ${className}`.trim()}
      data-tooltip={label}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      <AppIcon name={icon} size={16} />
    </button>
  );
}
