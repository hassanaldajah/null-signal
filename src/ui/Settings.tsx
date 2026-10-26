import { motion } from 'framer-motion';
import { type ReactNode, useRef } from 'react';
import { play } from '../audio/sfx';
import { useI18n } from '../i18n';
import { MAX_SAVE_BYTES, useGame } from '../store/game';
import { toast } from './Toasts';
import './settings.css';

export default function Settings({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const settings = useGame((state) => state.settings);
  const setSetting = useGame((state) => state.setSetting);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const blob = new Blob([useGame.getState().exportSave()], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `null-signal-save-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importSave = async (file: File) => {
    const ok = file.size <= MAX_SAVE_BYTES && useGame.getState().importSave(await file.text());
    toast(ok ? '✔ Save imported' : t('settings.importFailed'), ok ? 'success' : 'danger');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="settings panel"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        role="dialog"
        aria-label={t('settings.title')}
      >
        <h2>{t('settings.title')}</h2>
        <Row label={t('settings.language')}>
          <Segmented
            value={settings.lang}
            options={[['en', 'English'], ['ar', 'العربية']]}
            onChange={(value) => setSetting('lang', value as 'en' | 'ar')}
          />
        </Row>
        <Row label={t('settings.quality')}>
          <Segmented
            value={settings.quality}
            options={[['low', t('settings.low')], ['high', t('settings.high')]]}
            onChange={(value) => setSetting('quality', value as 'low' | 'high')}
          />
        </Row>
        <Row label={t('settings.volume')}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(event) => setSetting('volume', Number(event.target.value))}
          />
        </Row>
        <Row label={t('settings.motion')}>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => setSetting('reducedMotion', event.target.checked)}
          />
        </Row>
        <div className="settings-actions">
          <button className="btn ghost" onClick={exportSave}>{t('settings.export')}</button>
          <button className="btn ghost" onClick={() => fileInput.current?.click()}>{t('settings.import')}</button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm(t('settings.resetConfirm'))) {
                useGame.getState().resetProgress();
                play('glitch');
              }
            }}
          >
            {t('settings.reset')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => event.target.files?.[0] && importSave(event.target.files[0])}
          />
        </div>
        <button className="btn primary" onClick={onClose}>{t('common.close')}</button>
      </motion.div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="settings-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <span className="segmented">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={key === value ? 'active' : undefined}
          onClick={() => {
            play('click');
            onChange(key);
          }}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
