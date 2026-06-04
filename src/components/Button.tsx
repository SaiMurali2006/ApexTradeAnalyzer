import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

type Variant = 'ghost' | 'primary' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'ghost', className = '', ...rest }: Props) {
  return <button className={`apex-btn apex-btn--${variant} ${className}`} {...rest} />;
}
