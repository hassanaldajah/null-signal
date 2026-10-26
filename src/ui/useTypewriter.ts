import { useEffect, useRef, useState } from 'react';
import { blip, LETTERS_PER_SYLLABLE, type Speaker } from '../audio/voice';

/**
 * Types `text` out two characters at a time while the speaker's voice blips along.
 * A new `restart` value (message serial, level id...) starts over even for the same text.
 * `instant` (reduced motion) shows everything at once with a single syllable.
 */
export function useTypewriter(text: string, restart: unknown, speaker: Speaker, instant = false) {
  const [state, setState] = useState<{ token: unknown; text: string; count: number }>({ token: undefined, text: '', count: 0 });
  const skip = useRef(false);

  useEffect(() => {
    skip.current = false;
    if (!text) return;
    if (instant) {
      setState({ token: restart, text, count: text.length });
      blip(speaker);
      return;
    }
    setState({ token: restart, text, count: 0 });
    let index = 0;
    const timer = setInterval(() => {
      index = skip.current ? text.length : Math.min(text.length, index + 2);
      setState({ token: restart, text, count: index });
      // A syllable every few letters, never on a space.
      if (!skip.current && index % LETTERS_PER_SYLLABLE[speaker] === 0 && /\S/.test(text[index - 1] ?? '')) blip(speaker);
      if (index >= text.length) clearInterval(timer);
    }, 18);
    return () => clearInterval(timer);
  }, [text, restart, speaker, instant]);

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
