import { useMemo, useState } from 'react';
import { useRuntime } from '../../engine/runtime';
import { useI18n } from '../../i18n';
import { EMPTY_LIST } from '../../store/empty';
import './apps.css';

/** Read-only packet table: filter by any column text, details for the selected packet. */
export default function Capture() {
  const { t } = useI18n();
  const packets = useRuntime((state) => state.runtime?.config.world.packets) ?? EMPTY_LIST;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return packets;
    return packets.filter((packet) => `${packet.src} ${packet.dst} ${packet.proto} ${packet.info}`.toLowerCase().includes(needle));
  }, [packets, query]);
  const detail = packets.find((packet) => packet.no === selected);

  return (
    <div className="capture ltr">
      <div className="logs-bar">
        <input className="input mono" value={query} placeholder={t('cap.filter')} onChange={(event) => setQuery(event.target.value)} spellCheck={false} />
        <span className="logs-meta-inline mono">{t('cap.count', { shown: shown.length, total: packets.length })}</span>
      </div>
      <div className="capture-table">
        <table className="files-table mono">
          <thead>
            <tr><th>No.</th><th>{t('cap.time')}</th><th>{t('cap.src')}</th><th>{t('cap.dst')}</th><th>{t('cap.proto')}</th><th>{t('cap.len')}</th><th>{t('cap.info')}</th></tr>
          </thead>
          <tbody>
            {shown.map((packet) => (
              <tr key={packet.no} className={`proto-${packet.proto.toLowerCase()}${packet.no === selected ? ' selected' : ''}`} onClick={() => setSelected(packet.no)}>
                <td>{packet.no}</td><td>{packet.time}</td><td>{packet.src}</td><td>{packet.dst}</td><td>{packet.proto}</td><td>{packet.length}</td><td>{packet.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <pre className="capture-detail mono">
        {detail ? `#${detail.no}  ${detail.src} → ${detail.dst}  ${detail.proto}\n${detail.info}${detail.data ? `\n\n${detail.data}` : ''}` : t('cap.pick')}
      </pre>
    </div>
  );
}
