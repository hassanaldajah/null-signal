import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { unlockAudio } from './audio/sfx';
import { preloadVoices } from './audio/voice';
import { useDocumentLanguage } from './i18n';
import { useFlow } from './store/flow';
import { useGame } from './store/game';
import Boot from './scenes/Boot';
import Toasts from './ui/Toasts';

const Login = lazy(() => import('./scenes/Login'));
const Hub = lazy(() => import('./scenes/Hub'));
const LevelScreen = lazy(() => import('./os/LevelScreen'));

/** Dev/test shortcuts: ?screen=hub | ?level=L01 (skips boot, unlocks audio-less flow). */
function useDebugEntry(): void {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const level = params.get('level');
    const screen = params.get('screen');
    if (params.get('lang') === 'ar') useGame.getState().setSetting('lang', 'ar');
    const quality = params.get('quality');
    if (quality === 'low' || quality === 'high') useGame.getState().setSetting('quality', quality);
    if (level && /^L\d{2}$/.test(level)) useFlow.getState().openLevel(level);
    else if (screen === 'hub' || screen === 'login') useFlow.getState().go(screen);
  }, []);
}

export default function App() {
  useDocumentLanguage();
  useDebugEntry();
  const screen = useFlow((state) => state.screen);
  const levelId = useFlow((state) => state.levelId);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      preloadVoices();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <div className={reducedMotion ? 'reduced-motion' : undefined} style={{ height: '100%' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen === 'level' ? `level-${levelId}` : screen}
          className="screen"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)', scale: 1.02 }}
          transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Suspense fallback={<Loading />}>
            {screen === 'boot' && <Boot />}
            {screen === 'login' && <Login />}
            {screen === 'hub' && <Hub />}
            {screen === 'level' && levelId && <LevelScreen levelId={levelId} />}
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <Toasts />
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <span className="label">Loading…</span>
    </div>
  );
}
