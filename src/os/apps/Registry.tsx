import { useMemo, useState } from 'react';
import { useRuntime } from '../../engine/runtime';
import { useI18n } from '../../i18n';
import './apps.css';

const EMPTY: Record<string, Record<string, string>> = {};

/** "HKLM\...\Run" -> "HKLM › … › Run": the hive tells same-named keys (HKLM and HKCU Run) apart. */
function keyLabel(key: string): string {
  const parts = key.split('\\');
  return parts.length > 2 ? `${parts[0]} › … › ${parts[parts.length - 1]}` : parts.join(' › ');
}

/** Read-only registry snapshot: key list on the left, values of the selected key on the right. */
export default function Registry() {
  const { t } = useI18n();
  const registry = useRuntime((state) => state.runtime?.config.world.registry) ?? EMPTY;
  const keys = useMemo(() => Object.keys(registry).sort(), [registry]);
  const [key, setKey] = useState(keys[0] ?? '');
  const [query, setQuery] = useState('');
  const shown = keys.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  const values = Object.entries(registry[key] ?? {});

  return (
    <div className="reg ltr">
      <div className="logs-bar">
        <input className="input mono" value={query} placeholder={t('reg.filter')} onChange={(event) => setQuery(event.target.value)} spellCheck={false} />
      </div>
      <div className="reg-main">
        <ul className="reg-keys mono">
          {shown.map((item) => (
            <li key={item}>
              <button className={item === key ? 'selected' : undefined} onClick={() => setKey(item)} title={item}>
                {keyLabel(item)}
              </button>
            </li>
          ))}
        </ul>
        <div className="reg-values">
          <div className="logs-meta mono reg-path">{key}</div>
          <table className="files-table mono">
            <thead><tr><th>{t('reg.name')}</th><th>{t('reg.data')}</th></tr></thead>
            <tbody>
              {values.map(([name, data]) => (
                <tr key={name}><td>{name}</td><td className="reg-data">{data}</td></tr>
              ))}
              {values.length === 0 && <tr><td colSpan={2} className="dim">{t('reg.empty')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
