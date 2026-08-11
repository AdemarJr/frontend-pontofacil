/**
 * @param {{ variant?: 'text'|'title'|'avatar'|'card', style?: import('react').CSSProperties, className?: string }} props
 */
export default function Skeleton({ variant = 'text', style, className = '' }) {
  return (
    <span
      className={`ds-skeleton ds-skeleton--${variant} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}
