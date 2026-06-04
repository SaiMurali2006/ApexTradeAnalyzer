import { useEffect, useRef, useState } from 'react';
import { ACCENT_PRESETS, useTheme, type Mode } from '@/theme/ThemeProvider';
import { isValidHex } from '@/theme/onAccent';
import './ThemePopover.css';

const MODES: Mode[] = ['light', 'dark', 'system'];

export function LogoBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="apex-logo-wrap" ref={ref}>
      <button className="apex-logo" aria-label="Theme settings" onClick={() => setOpen((o) => !o)}>
        A
      </button>
      {open && <ThemePopoverPanel />}
    </div>
  );
}

function ThemePopoverPanel() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const [hex, setHex] = useState(accent);
  const valid = isValidHex(hex);

  return (
    <div className="apex-popover">
      <div className="apex-popover__label">APPEARANCE</div>
      <div className="apex-segmented">
        {MODES.map((m) => (
          <button
            key={m}
            className={`apex-segment ${mode === m ? 'is-active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="apex-popover__label">ACCENT</div>
      <div className="apex-swatches">
        {ACCENT_PRESETS.map((p) => (
          <button
            key={p.name}
            className={`apex-swatch ${accent === p.hex ? 'is-active' : ''}`}
            style={{ background: p.hex }}
            title={p.name}
            onClick={() => {
              setAccent(p.hex);
              setHex(p.hex);
            }}
          />
        ))}
      </div>

      <div className="apex-hexrow">
        <span className="apex-hex-preview" style={{ background: valid ? hex : 'var(--input)' }} />
        <input
          className="apex-hex-input mono"
          value={hex}
          spellCheck={false}
          onChange={(e) => setHex(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && setAccent(hex)}
          onBlur={() => valid && setAccent(hex)}
        />
      </div>
      {!valid && <div className="apex-hex-error">Invalid hex</div>}
    </div>
  );
}
