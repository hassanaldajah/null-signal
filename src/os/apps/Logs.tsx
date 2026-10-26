import { type ReactNode, useDeferredValue, useMemo, useState } from 'react';
import { useRuntime } from '../../engine/runtime';
import { safeRegExp } from '../../engine/shell/commands';
import { baseName } from '../../engine/vfs';
import { useI18n } from '../../i18n';
import { EMPTY_LIST } from '../../store/empty';
import './apps.css';

const MAX_ROWS = 1500;

/** Read-only log viewer: pick a log, filter lines (text or regex), matches highlighted. */
export default function Logs() {
  const { t } = useI18n();
  const runtime = useRuntime((state) => state.runtime)!;
  const paths = runtime.config.world.logs ?? EMPTY_LIST;
  const [path, setPath] = useState(paths[0] ?? '');
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const deferred = useDeferredValue(query);

  const all = useMemo(() => (runtime.vfs.read(path) ?? '').replace(/\n$/, '').split('\n'), [runtime.vfs, path]);
  const { pattern, error } = useMemo(() => {
    if (!deferred) return { pattern: null, error: '' };
    const source = regex ? deferred : deferred.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = safeRegExp(source, 'gi');
    return typeof result === 'string' ? { pattern: null, error: result } : { pattern: result, error: '' };
  }, [deferred, regex]);
  const rows = useMemo(() => {
    const numbered = all.map((text, index) => ({ text, line: index + 1 }));
    return pattern ? numbered.filter(({ text }) => { pattern.lastIndex = 0; return pattern.test(text); }) : numbered;
  }, [all, pattern]);

  const highlight = (text: string) => {
    if (!pattern) return text;
    const parts: ReactNode[] = [];
    let last = 0;
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (!match[0]) break;
      parts.push(text.slice(last, match.index), <mark key={match.index}>{match[0]}</mark>);
      last = match.index + match[0].length;
    }
    parts.push(text.slice(last));
    return parts;
  };

  return (
    <div className="logs ltr">
      <div className="logs-bar">
        <select className="input mono" value={path} onChange={(event) => setPath(event.target.value)} aria-label={t('logs.file')}>
          {paths.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input
          className="input mono"
          value={query}
          placeholder={t('logs.filter')}
          onChange={(event) => setQuery(event.target.value)}
          spellCheck={false}
        />
        <label className="hidden-toggle">
          <input type="checkbox" checked={regex} onChange={(event) => setRegex(event.target.checked)} /> regex
        </label>
      </div>
      <div className="logs-meta mono">
        {error ? <span className="bad">{error}</span> : t('logs.count', { shown: rows.length, total: all.length, file: baseName(path) })}
      </div>
      <pre className="logs-body mono">
        {rows.slice(0, MAX_ROWS).map(({ text, line }) => (
          <div key={line}><span className="ln">{line}</span>{highlight(text)}</div>
        ))}
        {rows.length > MAX_ROWS && <div className="dim">{t('logs.more', { n: rows.length - MAX_ROWS })}</div>}
      </pre>
    </div>
  );
}
