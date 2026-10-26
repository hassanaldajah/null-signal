import { Fragment, useMemo, useState } from 'react';
import { play } from '../../audio/sfx';
import { useRuntime } from '../../engine/runtime';
import type { Email } from '../../engine/schema';
import { useI18n } from '../../i18n';
import { EMPTY_LIST } from '../../store/empty';
import './apps.css';

const FOLDERS = ['inbox', 'spam', 'sent'] as const;
type Folder = (typeof FOLDERS)[number];

/** `[text](url)` in a body is a link: the shown text can lie, the target cannot. */
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Raw message as a mail client's "Show original": trace headers, then the visible ones, then the body. */
function original(mail: Email): string {
  const headers: [string, string][] = [
    ...(mail.headers ?? []),
    ['From', mail.from],
    ['To', mail.to],
    ['Subject', mail.subject],
    ['Date', mail.date],
  ];
  return `${headers.map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${mail.body.replace(LINK, '$1 <$2>')}`;
}

/** Display name only, the way busy people read the From line. */
const displayName = (from: string) => from.replace(/\s*<[^>]*>\s*$/, '').replace(/^"|"$/g, '') || from;

/** Read-only mail client: folders, message list, reader, raw headers and link targets. */
export default function Mail() {
  const { t } = useI18n();
  const emails = useRuntime((state) => state.runtime?.config.world.emails) ?? EMPTY_LIST;
  const [folder, setFolder] = useState<Folder>('inbox');
  const [openId, setOpenId] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);
  const [target, setTarget] = useState('');

  const list = useMemo(() => emails.filter((mail) => (mail.folder ?? 'inbox') === folder), [emails, folder]);
  const open = emails.find((mail) => mail.id === openId) ?? null;

  const select = (mail: Email) => {
    play('click');
    setOpenId(mail.id);
    setRaw(false);
    setTarget('');
  };

  return (
    <div className={`mail ltr${open ? ' reading' : ''}`}>
      <nav className="mail-folders">
        {FOLDERS.map((name) => (
          <button
            key={name}
            className={folder === name ? 'active' : undefined}
            onClick={() => { play('click'); setFolder(name); setOpenId(null); }}
          >
            {t(`mail.${name}`)}
            <span className="count">{emails.filter((mail) => (mail.folder ?? 'inbox') === name).length}</span>
          </button>
        ))}
      </nav>

      <ul className="mail-list">
        {list.map((mail) => (
          <li key={mail.id}>
            <button className={mail.id === openId ? 'selected' : undefined} onClick={() => select(mail)}>
              <span className="who">{displayName(mail.from)}</span>
              <span className="when mono">{mail.date.slice(5, 16).replace('T', ' ')}</span>
              <span className="subject">{mail.subject}</span>
              {mail.attachments?.length ? <span className="clip" aria-hidden>📎</span> : null}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="dim mail-empty">{t('mail.empty')}</li>}
      </ul>

      <section className="mail-reader">
        {open ? (
          <>
            <div className="mail-tools">
              <button className="btn ghost small mail-back" onClick={() => setOpenId(null)}>← {t('mail.back')}</button>
              <button className={`btn ghost small${raw ? ' on' : ''}`} onClick={() => { play('click'); setRaw((value) => !value); }}>
                {raw ? t('mail.message') : t('mail.original')}
              </button>
            </div>
            {raw ? (
              <pre className="mail-raw mono">{original(open)}</pre>
            ) : (
              <article className="mail-message">
                <h3>{open.subject}</h3>
                <dl className="mono">
                  <dt>From</dt><dd>{open.from}</dd>
                  <dt>To</dt><dd>{open.to}</dd>
                  <dt>Date</dt><dd>{open.date}</dd>
                </dl>
                <div className="mail-body">
                  {open.body.split(LINK).map((part, index, parts) => {
                    // split() with two groups yields [text, label, url, text, label, url, ...]
                    if (index % 3 === 1) {
                      const url = parts[index + 1];
                      return (
                        <button
                          key={index}
                          className="mail-link"
                          onMouseEnter={() => setTarget(url)}
                          onFocus={() => setTarget(url)}
                          onClick={() => { play('click'); setTarget(url); }}
                        >
                          {part}
                        </button>
                      );
                    }
                    return index % 3 === 2 ? null : <Fragment key={index}>{part}</Fragment>;
                  })}
                </div>
                {open.attachments?.length ? (
                  <div className="mail-attachments">
                    <div className="label">{t('mail.attachments')}</div>
                    {open.attachments.map((file) => (
                      <div key={file.name} className="attachment mono">
                        <span>📎 {file.name}</span>
                        <span className="dim">{file.size}</span>
                        {file.preview && <pre>{file.preview}</pre>}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            )}
            <div className="mail-status mono">{target ? `${t('mail.linkTarget')} ${target}` : t('mail.linkHelp')}</div>
          </>
        ) : (
          <div className="dim mail-empty">{t('mail.pick')}</div>
        )}
      </section>
    </div>
  );
}
