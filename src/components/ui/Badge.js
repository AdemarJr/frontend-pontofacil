/**
 * @param {{ children: import('react').ReactNode, tone?: 'success'|'warning'|'error'|'info'|'neutral', className?: string }} props
 */
export default function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`ds-badge ds-badge--${tone} ${className}`.trim()}>{children}</span>;
}
