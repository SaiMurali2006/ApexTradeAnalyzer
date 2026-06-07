import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

// Surface primitives. `Card` is the base panel (optional hover-lift); `StatCard`
// is a labelled metric tile with a large monospace, tone-colored value.
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, className = '', ...rest }: CardProps) {
  return <div className={`apex-card ${hover ? 'apex-card--hover' : ''} ${className}`} {...rest} />;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'profit' | 'danger';
  hint?: string; // hover explanation
}

export function StatCard({ label, value, sub, tone = 'default', hint }: StatCardProps) {
  const color = tone === 'profit' ? 'var(--profit)' : tone === 'danger' ? 'var(--danger)' : 'var(--text)';
  return (
    <Card hover className="apex-statcard" title={hint}>
      <div className={`apex-statcard__label ${hint ? 'is-hinted' : ''}`}>{label}</div>
      {/* keyed on value so it replays the refresh pulse when the number changes */}
      <div key={String(value)} className="apex-statcard__value mono" style={{ color }}>{value}</div>
      {sub != null && <div className="apex-statcard__sub mono">{sub}</div>}
    </Card>
  );
}
