/**
 * @param {{ name?: string, src?: string, size?: 'sm'|'md'|'lg', className?: string }} props
 */
export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span className={`ds-avatar ds-avatar--${size} ${className}`.trim()} aria-hidden={!name}>
      {src ? <img src={src} alt="" /> : initial}
    </span>
  );
}
