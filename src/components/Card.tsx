import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

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
}

export function StatCard({ label, value, sub, tone = 'default' }: StatCardProps) {
  const color = tone === 'profit' ? 'var(--profit)' : tone === 'danger' ? 'var(--danger)' : 'var(--text)';
  return (
    <Card hover className="apex-statcard">
      <div className="apex-statcard__label">{label}</div>
      <div className="apex-statcard__value mono" style={{ color }}>{value}</div>
      {sub != null && <div className="apex-statcard__sub mono">{sub}</div>}
    </Card>
  );
}
