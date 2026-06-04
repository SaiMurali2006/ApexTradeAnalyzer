import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
      <div>
        {eyebrow && (
          <div
            style={{
              display: 'inline-block',
              fontSize: '0.625rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              borderRadius: 'var(--r-pill)',
              padding: '4px 9px',
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
        )}
        <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.375rem' }}>{title}</h1>
      </div>
      {actions}
    </div>
  );
}
