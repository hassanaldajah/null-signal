import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef } from 'react';
import { play } from '../../audio/sfx';
import { useRuntime } from '../../engine/runtime';

const MAX_LINE = 1000;
const THEME = {
  background: '#05080f',
  foreground: '#d7e3ff',
  cursor: '#00e5ff',
  selectionBackground: '#00e5ff55',
  black: '#0b1020',
  red: '#ff4d6d',
  green: '#39ff88',
  yellow: '#ffc857',
  blue: '#4aa8ff',
  magenta: '#ff2bd6',
  cyan: '#00e5ff',
  white: '#e6f1ff',
  brightBlue: '#6fc3ff',
  brightGreen: '#7dffb0',
};

/** xterm.js front-end over the simulated Shell. Line editing: ←/→ not needed, ↑/↓ history, Tab completion. */
export default function Terminal() {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRuntime((state) => state.runtime);
  const recordCommand = useRuntime((state) => state.recordCommand);

  useEffect(() => {
    if (!host.current || !runtime) return;
    const { shell } = runtime;
    const term = new XTerm({
      fontFamily: '"JetBrains Mono", Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.25,
      cursorBlink: true,
      convertEol: true,
      scrollback: 2000,
      theme: THEME,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    fit.fit();
    term.focus();

    let line = '';
    let historyIndex = shell.history.length;
    const redraw = () => term.write(`\r\x1b[K${shell.prompt()}${line}`);
    const newPrompt = () => {
      line = '';
      historyIndex = shell.history.length;
      term.write(shell.prompt());
    };

    term.writeln('\x1b[1;36mNEXUS OS forensic shell\x1b[0m — evidence is mounted read-only.');
    term.writeln("Type \x1b[1;33mhelp\x1b[0m for commands, \x1b[1;33mman <cmd>\x1b[0m for a manual.\n");
    newPrompt();

    const execute = () => {
      term.write('\r\n');
      const result = shell.run(line);
      if (line.trim()) recordCommand(line.trim());
      if (result.clear) term.clear();
      if (result.err) term.writeln(`\x1b[31m${result.err}\x1b[0m`);
      if (result.out) term.writeln(result.out);
      play(result.err ? 'error' : 'click');
      newPrompt();
    };

    const input = term.onData((data) => {
      switch (data) {
        case '\r':
          execute();
          return;
        case '\x7f':
        case '\b':
          if (line) {
            line = line.slice(0, -1);
            term.write('\b \b');
          }
          return;
        case '\x1b[A':
          if (historyIndex > 0) {
            historyIndex--;
            line = shell.history[historyIndex];
            redraw();
          }
          return;
        case '\x1b[B':
          if (historyIndex < shell.history.length) {
            historyIndex++;
            line = shell.history[historyIndex] ?? '';
            redraw();
          }
          return;
        case '\t':
          line = shell.complete(line);
          redraw();
          return;
        case '\x03':
          term.write('^C\r\n');
          newPrompt();
          return;
        case '\x0c':
          term.clear();
          redraw();
          return;
      }
      if (data.startsWith('\x1b')) return; // other escape sequences (←, →, F-keys)
      const printable = data.replace(/[\x00-\x1f]/g, ''); // pasted text may contain newlines
      if (!printable || line.length + printable.length > MAX_LINE) return;
      line += printable;
      term.write(printable);
      play('type');
    });

    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* element hidden while minimized */
      }
    });
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      input.dispose();
      term.dispose();
    };
  }, [runtime, recordCommand]);

  return <div ref={host} className="terminal-host ltr" onClick={(event) => (event.currentTarget.querySelector('textarea') as HTMLTextAreaElement | null)?.focus()} />;
}
