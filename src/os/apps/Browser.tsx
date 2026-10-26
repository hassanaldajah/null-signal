import { useState } from 'react';
import { useRuntime } from '../../engine/runtime';
import { useI18n } from '../../i18n';
import { EMPTY_LIST } from '../../store/empty';
import './apps.css';

/** Offline browser over static case pages: history on the side, address bar shows the scheme. */
export default function Browser() {
  const { t } = useI18n();
  const pages = useRuntime((state) => state.runtime?.config.world.pages) ?? EMPTY_LIST;
  const [index, setIndex] = useState(0);
  const page = pages[index];
  const secure = page?.url.startsWith('https://');

  return (
    <div className="browser ltr">
      <div className="browser-bar">
        <button className="btn ghost small" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label={t('web.back')}>←</button>
        <button className="btn ghost small" disabled={index >= pages.length - 1} onClick={() => setIndex(index + 1)} aria-label={t('web.forward')}>→</button>
        <div className={`address mono${secure ? '' : ' insecure'}`}>
          <span className="lock">{secure ? '🔒' : `⚠ ${t('web.notSecure')}`}</span>
          <span className="url">{page?.url ?? ''}</span>
        </div>
      </div>
      <div className="browser-main">
        <ul className="browser-history mono">
          {pages.map((item, i) => (
            <li key={item.url + i}>
              <button className={i === index ? 'selected' : undefined} onClick={() => setIndex(i)}>{item.title}</button>
            </li>
          ))}
        </ul>
        <article className="browser-page">
          {page ? (
            <>
              <h3>{page.title}</h3>
              {page.body.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
            </>
          ) : <p className="dim">{t('web.empty')}</p>}
        </article>
      </div>
    </div>
  );
}
