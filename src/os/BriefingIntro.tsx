import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { Suspense, useEffect, useRef } from 'react';
import { play } from '../audio/sfx';
import { mutter } from '../audio/voice';
import { useRuntime } from '../engine/runtime';
import { useI18n } from '../i18n';
import Character from '../scenes/three/Character';
import { useGame } from '../store/game';
import { useTypewriter } from '../ui/useTypewriter';

/** The partner briefs every case in her own voice; the detective's answer opens the desktop. */
export default function BriefingIntro({ onStart }: { onStart: () => void }) {
  const { t, tl } = useI18n();
  const { config, meta } = useRuntime((state) => state.runtime)!;
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const quality = useGame((state) => state.settings.quality);
  const briefing = tl(config.briefing);
  const { shown, done, finish } = useTypewriter(briefing, config.id, 'partner', reducedMotion);
  const box = useRef<HTMLParagraphElement>(null);
  const typed = useRef<HTMLSpanElement>(null);

  // A long briefing scrolls: keep the line being spoken in view.
  useEffect(() => {
    if (box.current && typed.current) box.current.scrollTop = Math.max(0, typed.current.offsetHeight - box.current.clientHeight);
  }, [shown]);

  const start = () => {
    finish();
    play('click');
    mutter('detective');
    useRuntime.getState().startClock();
    onStart();
  };

  return (
    <motion.div className="modal-backdrop briefing-intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="briefing-card panel"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="briefing-portrait">
          <Canvas
            dpr={quality === 'high' ? [1, 1.5] : 1}
            camera={{ position: [0, 1.5, 1.9], fov: 30 }}
            gl={{ alpha: true, antialias: true }}
            onCreated={({ camera }) => camera.lookAt(0, 1.32, 0)}
          >
            <ambientLight intensity={0.6} />
            <pointLight position={[1, 2.4, 2]} intensity={12} color="#00e5ff" />
            <pointLight position={[-1, 1.6, -1]} intensity={6} color="#ff2bd6" />
            <Suspense fallback={null}>
              <Character name="partner" clip={done ? 'idle' : 'talk'} />
            </Suspense>
          </Canvas>
        </div>
        <div className="briefing-body">
          <span className="label">{meta.id} · {t('cast.partner')}</span>
          <h2>{tl(meta.title)}</h2>
          {/* The hidden full text reserves the final height, so nothing below it moves while she talks. */}
          <p ref={box} className="briefing-text typed-text" onClick={finish}>
            <span ref={typed}>
              {shown}
              {!done && <span className="cursor">▍</span>}
            </span>
            <span className="typed-text-space" aria-hidden="true">{briefing}</span>
          </p>
          <button className="btn primary" autoFocus onClick={start}>{t('brief.reply')}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
