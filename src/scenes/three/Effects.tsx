import { Bloom, ChromaticAberration, EffectComposer, Glitch, Noise, Scanline, Vignette } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { useMemo } from 'react';
import { Vector2 } from 'three';
import { useGame } from '../../store/game';

/** Cinematic post stack. Disabled on "low" quality; glitch only when `glitch` is true. */
export default function Effects({ glitch = false, bloom = 1.1 }: { glitch?: boolean; bloom?: number }) {
  const quality = useGame((state) => state.settings.quality);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const chroma = useMemo(() => new Vector2(0.0007, 0.0009), []);
  const glitchDelay = useMemo(() => new Vector2(0.4, 1.2), []);
  const glitchDuration = useMemo(() => new Vector2(0.1, 0.35), []);
  const glitchStrength = useMemo(() => new Vector2(0.05, 0.25), []);
  if (quality === 'low') return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={bloom} luminanceThreshold={0.2} luminanceSmoothing={0.25} />
      <ChromaticAberration offset={chroma} radialModulation={false} modulationOffset={0} />
      <Scanline density={1.35} opacity={0.07} blendFunction={BlendFunction.OVERLAY} />
      <Noise opacity={0.045} premultiply />
      <Glitch
        active={glitch && !reducedMotion}
        delay={glitchDelay}
        duration={glitchDuration}
        strength={glitchStrength}
        mode={GlitchMode.SPORADIC}
      />
      <Vignette offset={0.28} darkness={0.78} />
    </EffectComposer>
  );
}
