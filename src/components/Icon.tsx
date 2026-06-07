// Stroke-based vector icons (CLAUDE.md §6.9). 16x16 viewBox, 1.5 stroke, currentColor
// so they inherit text color + theme. (Settings uses a richer 24-viewBox gear.)
import type { CSSProperties } from 'react';

type IconProps = { size?: number; style?: CSSProperties };

const base = (size: number, style?: CSSProperties) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  });

export const IconDashboard = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>
);
export const IconCalendar = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 6h12M5 2v2M11 2v2" /></svg>
);
export const IconTable = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><rect x="2" y="3" width="12" height="10" rx="2" /><path d="M2 7h12M6 7v6" /></svg>
);
export const IconChart = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><path d="M2 14V2M2 14h12" /><path d="M5 11l3-4 2 2 3-5" /></svg>
);
export const IconImport = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><path d="M8 2v8M5 7l3 3 3-3" /><path d="M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" /></svg>
);
export const IconSettings = ({ size = 16, style }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconPositions = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><rect x="2" y="4.5" width="12" height="9" rx="1.5" /><path d="M5.5 4.5V3.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.3M2 8.5h12" /></svg>
);
export const IconMenu = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>
);
export const IconClose = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, style)}><path d="M4 4l8 8M12 4l-8 8" /></svg>
);
