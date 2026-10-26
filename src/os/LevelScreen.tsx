import { useEffect } from 'react';
import { useRuntime } from '../engine/runtime';
import { useI18n } from '../i18n';
import { preloadCharacter } from '../scenes/three/Character';
import { useFlow } from '../store/flow';
import NexusOS from './NexusOS';

export default function LevelScreen({ levelId }: { levelId: string }) {
  const { t } = useI18n();
  const { runtime, loading, error, start, stop } = useRuntime();
  const go = useFlow((state) => state.go);

  useEffect(() => {
    // The partner opens every case: fetch her model while the level itself loads.
    preloadCharacter('partner');
    start(levelId);
    return () => stop();
  }, [levelId, start, stop]);

  if (error) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', gap: 16 }}>
        <p className="mono" style={{ color: 'var(--red)' }}>{error}</p>
        <button className="btn" onClick={() => go('hub')}>{t('os.exit')}</button>
      </div>
    );
  }
  if (loading || !runtime || runtime.config.id !== levelId) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }} className="label">{t('common.loading')}</div>;
  }
  return <NexusOS key={levelId} />;
}
