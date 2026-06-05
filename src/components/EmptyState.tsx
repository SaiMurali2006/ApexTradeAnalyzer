import type { ReactNode } from 'react';
import { Card } from './Card';
import './EmptyState.css';

// Consistent empty/no-data placeholder: accent-tinted icon badge, bold heading,
// muted body, and an optional call-to-action. Used across views before data exists.
interface Props {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, icon, action }: Props) {
  return (
    <Card className="apex-empty">
      {icon && <div className="apex-empty__icon">{icon}</div>}
      <div className="apex-empty__title">{title}</div>
      {body && <div className="apex-empty__body">{body}</div>}
      {action && <div className="apex-empty__action">{action}</div>}
    </Card>
  );
}
