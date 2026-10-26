import { useMemo, useState } from 'react';
import { play } from '../../audio/sfx';
import { useRuntime } from '../../engine/runtime';
import { baseName, parentOf, type VNode } from '../../engine/vfs';
import './apps.css';

/** Graphical file explorer over the same read-only virtual filesystem as the terminal. */
export default function Files() {
  const runtime = useRuntime((state) => state.runtime)!;
  const { vfs } = runtime;
  const [cwd, setCwd] = useState(vfs.home);
  const [showHidden, setShowHidden] = useState(false);
  const [open, setOpen] = useState<VNode | null>(null);

  const entries = useMemo(
    () => vfs.list(cwd).filter((node) => showHidden || !baseName(node.path).startsWith('.'))
      .sort((a, b) => (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1)),
    [vfs, cwd, showHidden],
  );
  const crumbs = cwd === '/' ? ['/'] : ['/', ...cwd.split('/').filter(Boolean)];

  return (
    <div className="files ltr">
      <div className="files-bar">
        <button className="btn ghost small" disabled={cwd === '/'} onClick={() => { setCwd(parentOf(cwd)); setOpen(null); }}>↑</button>
        <div className="crumbs mono">
          {crumbs.map((crumb, index) => {
            const path = index === 0 ? '/' : `/${crumbs.slice(1, index + 1).join('/')}`;
            return (
              <button key={path} onClick={() => { setCwd(path); setOpen(null); }}>
                {crumb}{index > 0 && index < crumbs.length - 1 ? '/' : ''}
              </button>
            );
          })}
        </div>
        <label className="hidden-toggle">
          <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} /> show hidden
        </label>
      </div>
      <div className="files-main">
        <table className="files-table mono">
          <thead>
            <tr><th>name</th><th>size</th><th>modified</th><th>mode</th></tr>
          </thead>
          <tbody>
            {entries.map((node) => (
              <tr
                key={node.path}
                className={open?.path === node.path ? 'selected' : undefined}
                onClick={() => {
                  play('click');
                  if (node.type === 'dir') {
                    setCwd(node.path);
                    setOpen(null);
                  } else setOpen(node);
                }}
              >
                <td className={node.type === 'dir' ? 'is-dir' : undefined}>{node.type === 'dir' ? '▸ ' : ''}{baseName(node.path)}</td>
                <td>{node.type === 'dir' ? '—' : vfs.size(node)}</td>
                <td>{node.file?.mtime.slice(0, 16).replace('T', ' ') ?? ''}</td>
                <td>{node.type === 'dir' ? 'drwxr-xr-x' : node.file?.mode}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={4} className="dim">(empty)</td></tr>}
          </tbody>
        </table>
        {open && (
          <pre className="file-preview">
            <div className="preview-name">{open.path}</div>
            {vfs.read(open.path)}
          </pre>
        )}
      </div>
    </div>
  );
}
