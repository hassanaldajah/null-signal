import { useEffect, useRef, useState } from 'react';
import { playFile } from '../audio/sfx';

/** Ticks are spaced like fast typing, not one per letter. */
const TICK_GAP_MS = 75;
let lastTick = 0;

function tick(): void {
  const now = performance.now();
  if (now - lastTick < TICK_GAP_MS) return;
  lastTick = now;
  playFile('tick', 0.9 + Math.random() * 0.25, 0.18 + Math.random() * 0.08);
}

/**
 * Types `text` out two characters at a time with a soft key tick.
 * A new `restart` value (message serial, level id...) starts over even for the same text.
 * `instant` (reduced motion) shows everything at once.
 */
export function useTypewriter(text: string, restart: unknown, instant = false) {
  const [state, setState] = useState<{ token: unknown; text: string; count: number }>({ token: undefined, text: '', count: 0 });
  const skip = useRef(false);

  useEffect(() => {
    skip.current = false;
    if (!text) return;
    if (instant) {
      setState({ token: restart, text, count: text.length });
      return;
    }
    setState({ token: restart, text, count: 0 });
    let index = 0;
    const timer = setInterval(() => {
      index = skip.current ? text.length : Math.min(text.length, index + 2);
      setState({ token: restart, text, count: index });
      if (!skip.current && /\S/.test(text[index - 1] ?? '')) tick();
      if (index >= text.length) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [text, restart, instant]);

  // Until the effect catches up with a new message, report nothing typed (never a stale "done").
  const current = state.token === restart && state.text === text;
  const count = current ? state.count : 0;
  return {
    shown: text.slice(0, count),
    done: current && text.length > 0 && count >= text.length,
    /** Skip to the end (tap on the bubble). */
    finish: () => {
      skip.current = true;
    },
  };
}
