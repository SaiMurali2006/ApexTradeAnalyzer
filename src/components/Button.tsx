import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

// Apex button. `ghost` = neutral/secondary, `primary` = accent CTA, `icon` = square
// chromeless icon button. All press-spring per the Apex motion spec.
type Variant = 'ghost' | 'primary' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'ghost', className = '', ...rest }: Props) {
  return <button className={`apex-btn apex-btn--${variant} ${className}`} {...rest} />;
}
