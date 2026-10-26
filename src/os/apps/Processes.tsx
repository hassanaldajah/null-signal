import { useMemo, useState } from 'react';
import { useRuntime } from '../../engine/runtime';
import type { ProcessRow } from '../../engine/schema';
import { useI18n } from '../../i18n';
import { EMPTY_LIST } from '../../store/empty';
import './apps.css';

type Key = 'pid' | 'name' | 'user' | 'cpu' | 'memMb' | 'start';
const COLUMNS: Key[] = ['pid', 'name', 'user', 'cpu', 'memMb', 'start'];

/** Children under their parent, depth-first, so the table can show a tree. */
function asTree(rows: readonly ProcessRow[]): { row: ProcessRow; depth: number }[] {
  const pids = new Set(rows.map((row) => row.pid));
  const out: { row: ProcessRow; depth: number }[] = [];
  const visit = (parent: number, depth: number) => {
    for (const row of rows.filter((item) => item.ppid === parent).sort((a, b) => a.pid - b.pid)) {
      out.push({ row, depth });
      visit(row.pid, depth + 1);
    }
  };
  for (const root of rows.filter((row) => !pids.has(row.ppid)).sort((a, b) => a.pid - b.pid)) {
    out.push({ row: root, depth: 0 });
    visit(root.pid, 1);
  }
  return out;
}

/** Read-only process snapshot: sortable list or parent/child tree, details on click. */
export default function Processes() {
  const { t } = useI18n();
  const rows = useRuntime((state) => state.runtime?.config.world.processes) ?? EMPTY_LIST;
  const [tree, setTree] = useState(false);
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: 'pid', desc: false });
  const [selected, setSelected] = useState<number | null>(null);

  const list = useMemo(() => {
    if (tree) return asTree(rows);
    const sorted = [...rows].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.desc ? -order : order;
    });
    return sorted.map((row) => ({ row, depth: 0 }));
  }, [rows, tree, sort]);
  const detail = rows.find((row) => row.pid === selected);

  return (
    <div className="procs ltr">
      <div className="logs-bar">
        <button className={`btn ghost small${tree ? '' : ' on'}`} onClick={() => setTree(false)}>{t('procs.list')}</button>
        <button className={`btn ghost small${tree ? ' on' : ''}`} onClick={() => setTree(true)}>{t('procs.tree')}</button>
        <span className="logs-meta-inline mono">{t('procs.count', { n: rows.length })}</span>
      </div>
      <div className="procs-main">
        <table className="files-table mono">
          <thead>
            <tr>
              {COLUMNS.map((key) => (
                <th key={key}>
                  <button
                    className="th-sort"
                    disabled={tree}
                    onClick={() => setSort((current) => ({ key, desc: current.key === key ? !current.desc : key === 'cpu' || key === 'memMb' }))}
                  >
                    {t(`procs.${key}`)}{!tree && sort.key === key ? (sort.desc ? ' ▾' : ' ▴') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(({ row, depth }) => (
              <tr key={row.pid} className={row.pid === selected ? 'selected' : undefined} onClick={() => setSelected(row.pid)}>
                <td>{row.pid}</td>
                <td style={{ paddingLeft: 10 + depth * 16 }}>{depth ? '└ ' : ''}{row.name}</td>
                <td>{row.user}</td>
                <td>{row.cpu.toFixed(1)}</td>
                <td>{row.memMb}</td>
                <td>{row.start}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {detail && (
          <dl className="procs-detail mono">
            <dt>{t('procs.name')}</dt><dd>{detail.name}</dd>
            <dt>PID / PPID</dt><dd>{detail.pid} / {detail.ppid}</dd>
            <dt>{t('procs.path')}</dt><dd>{detail.path}</dd>
            <dt>{t('procs.user')}</dt><dd>{detail.user}</dd>
            <dt>{t('procs.start')}</dt><dd>{detail.start}</dd>
          </dl>
        )}
      </div>
    </div>
  );
}
