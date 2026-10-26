import { useI18n } from '../i18n';

export default function GlitchLogo({ size = 64, tagline = true }: { size?: number; tagline?: boolean }) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.18 }}>
      <h1 className="glitch" data-text="NULL SIGNAL" style={{ fontSize: size, margin: 0 }}>
        NULL SIGNAL
      </h1>
      {tagline && <div className="tagline">{t('app.tagline')}</div>}
    </div>
  );
}
