import { useMemo, useState } from 'react';
import { useRuntime } from '../../engine/runtime';
import { baseName, bytesOf } from '../../engine/vfs';
import { useI18n } from '../../i18n';
import './apps.css';

const WIDTH = 16;
const MAX_BYTES = 4096;

const printable = (byte: number) => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.');

/** Read-only hex viewer for files in the case filesystem: offset, hex bytes, ASCII column. */
export default function Hex() {
  const { t } = useI18n();
  const runtime = useRuntime((state) => state.runtime)!;
  const files = useMemo(
    () => runtime.vfs.walk('/').filter((node) => node.type === 'file' && node.path.startsWith(runtime.vfs.home)).map((node) => node.path),
    [runtime.vfs],
  );
  const [path, setPath] = useState(files[0] ?? '');
  const [hover, setHover] = useState<number | null>(null);
  const bytes = useMemo(() => bytesOf(runtime.vfs.read(path) ?? ''), [runtime.vfs, path]);
  const rows = Math.ceil(Math.min(bytes.length, MAX_BYTES) / WIDTH);

  return (
    <div className="hex ltr">
      <div className="logs-bar">
        <select className="input mono" value={path} onChange={(event) => setPath(event.target.value)} aria-label={t('hex.file')}>
          {files.map((item) => <option key={item} value={item}>{item.slice(runtime.vfs.home.length + 1)}</option>)}
        </select>
        <span className="logs-meta-inline mono">{t('hex.size', { n: bytes.length, file: baseName(path) })}</span>
      </div>
      <div className="hex-body mono" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: rows }, (_, row) => {
          const slice = bytes.slice(row * WIDTH, row * WIDTH + WIDTH);
          return (
            <div key={row} className="hex-row">
              <span className="hex-offset">{(row * WIDTH).toString(16).padStart(8, '0')}</span>
              <span className="hex-bytes">
                {slice.map((byte, i) => {
                  const index = row * WIDTH + i;
                  return (
                    <span key={i} className={hover === index ? 'on' : undefined} onMouseEnter={() => setHover(index)}>
                      {byte.toString(16).padStart(2, '0')}
                    </span>
                  );
                })}
              </span>
              <span className="hex-ascii">
                {slice.map((byte, i) => {
                  const index = row * WIDTH + i;
                  return <span key={i} className={hover === index ? 'on' : undefined} onMouseEnter={() => setHover(index)}>{printable(byte)}</span>;
                })}
              </span>
            </div>
          );
        })}
        {bytes.length > MAX_BYTES && <div className="dim">{t('hex.more', { n: bytes.length - MAX_BYTES })}</div>}
      </div>
      <div className="logs-meta mono">{hover === null ? t('hex.help') : t('hex.at', { offset: `0x${hover.toString(16)}`, value: `0x${bytes[hover].toString(16).padStart(2, '0')}`, dec: bytes[hover] })}</div>
    </div>
  );
}
