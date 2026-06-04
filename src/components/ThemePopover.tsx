import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ACCENT_PRESETS, useTheme, type Mode } from '@/theme/ThemeProvider';
import { isValidHex } from '@/theme/onAccent';
import './ThemePopover.css';

const MODES: Mode[] = ['light', 'dark', 'system'];
const PANEL_W = 286;

/**
 * The app's theme entry point: a clickable accent-filled logo badge that opens a
 * popover for choosing light/dark/system mode and the accent color.
 *
 * The popover is portaled to <body> so it can't be clipped by the sidebar's
 * `overflow: hidden` (used for the collapsing icon rail) or its drawer transform.
 */
export function LogoBadge() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // anchor the panel under the badge, clamped to the viewport
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - PANEL_W - 12);
    setPos({ top: r.bottom + 8, left: Math.max(12, left) });
  }, [open]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} className="apex-logo" aria-label="Theme settings" onClick={() => setOpen((o) => !o)}>
        A
      </button>
      {open &&
        createPortal(
          <div ref={panelRef} className="apex-popover" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 300 }}>
            <ThemePopoverPanel />
          </div>,
          document.body,
        )}
    </>
  );
}

function ThemePopoverPanel() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const [hex, setHex] = useState(accent);
  const valid = isValidHex(hex);

  return (
    <>
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
    </>
  );
}
