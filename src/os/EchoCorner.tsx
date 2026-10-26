import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useEffect, useState } from 'react';
import { useGame } from '../store/game';
import Character from '../scenes/three/Character';
import { useEcho } from '../ui/echo';
import { useTypewriter } from '../ui/useTypewriter';

const SMALL_SCREEN = '(max-width: 760px)';

/** ECHO (the Byte model) in 3D, bottom corner, with a typewriter speech bubble. */
export default function EchoCorner() {
  const { text, clip, serial, settle } = useEcho();
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const quality = useGame((state) => state.settings.quality);
  const [open, setOpen] = useState(true);
  const { shown, done } = useTypewriter(text, serial, reducedMotion);

  useEffect(() => {
    if (text) setOpen(true);
  }, [serial, text]);

  // Settle once the message is out. On phones the bubble covers the app, so it tucks away once
  // read (tap the avatar to reopen).
  useEffect(() => {
    if (!done) return;
    const timeouts = [window.setTimeout(settle, 900)];
    if (window.matchMedia(SMALL_SCREEN).matches) timeouts.push(window.setTimeout(() => setOpen(false), 7000));
    return () => timeouts.forEach(clearTimeout);
  }, [done, serial, settle]);

  return (
    <div className="echo-corner">
      <AnimatePresence>
        {open && text && (
          <motion.div
            className="echo-bubble panel"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => setOpen(false)}
          >
            <span className="label">ECHO</span>
            <p>{shown}<span className="cursor">▍</span></p>
          </motion.div>
        )}
      </AnimatePresence>
      <button className="echo-avatar" onClick={() => setOpen((value) => !value)} aria-label="ECHO">
        <Canvas
          dpr={quality === 'high' ? [1, 1.5] : 1}
          camera={{ position: [0, 0.36, 1.75], fov: 36 }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ camera }) => camera.lookAt(0, 0.2, 0)}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[1, 2, 2]} intensity={10} color="#00e5ff" />
          <pointLight position={[-0.6, 0.6, -0.8]} intensity={4} color="#00e5ff" />
          <Suspense fallback={null}>
            <Character name="byte" clip={clip} rotation={[0, -0.35, 0]} />
          </Suspense>
        </Canvas>
      </button>
    </div>
  );
}
