import { useI18n } from '../i18n';

/** `size` is the font size on wide screens; on phones it shrinks so the title stays on one line. */
export default function GlitchLogo({ size = 64, tagline = true }: { size?: number; tagline?: boolean }) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.18 }}>
      <h1 className="glitch" data-text="NULL SIGNAL" style={{ fontSize: `min(${size}px, 6.6vw)`, margin: 0 }}>
        NULL SIGNAL
      </h1>
      {tagline && <div className="tagline">{t('app.tagline')}</div>}
    </div>
  );
}
