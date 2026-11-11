import { play } from '../audio/sfx';
import type { Lang } from '../engine/schema';
import { useI18n } from '../i18n';
import { useGame } from '../store/game';

const LANGS: [Lang, string][] = [['en', 'EN'], ['ar', 'عربي']];

/** English / Arabic switch. The choice is saved with the settings and applies everywhere at once. */
export default function LangSwitch() {
  const { t, lang } = useI18n();
  const setSetting = useGame((state) => state.setSetting);
  return (
    <span className="lang-switch" role="group" aria-label={t('lang.label')}>
      {LANGS.map(([code, label]) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={code === lang ? 'active' : undefined}
          aria-pressed={code === lang}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (code === lang) return;
            play('click');
            setSetting('lang', code);
          }}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
