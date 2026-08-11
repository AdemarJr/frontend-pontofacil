import { Link } from 'react-router-dom';

/**
 * @param {{ items: Array<{ label: string, to?: string }> }} props
 */
export default function Breadcrumb({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="ds-breadcrumb">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="ds-breadcrumb__item">
              {i > 0 ? <span className="ds-breadcrumb__sep" aria-hidden="true">/</span> : null}
              {last || !item.to ? (
                <span className="ds-breadcrumb__current" aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link className="ds-breadcrumb__link" to={item.to}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
