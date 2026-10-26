import { useAnimations, useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, LoopOnce, LoopRepeat } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type CharacterName = 'investigator' | 'partner' | 'byte' | 'echo' | 'ghost';
export type Clip = 'idle' | 'talk' | 'point' | 'alert' | 'glitch' | 'walk' | 'hop';

const DRACO = '/draco/';
const ONE_SHOT: Clip[] = ['point', 'alert', 'glitch', 'hop'];
/** Byte has no arms to point with: it hops instead. */
const STAND_IN: Partial<Record<Clip, Clip>> = { point: 'hop', alert: 'hop', glitch: 'hop' };

type Props = ThreeElements['group'] & {
  name: CharacterName;
  clip?: Clip;
  /** Called when a one-shot clip (point/alert/glitch) finishes. */
  onClipEnd?: () => void;
};

/** Animated character from public/models/<name>.glb (Draco). Cloned so several can coexist. */
export default function Character({ name, clip = 'idle', onClipEnd, ...props }: Props) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(`/models/${name}.glb`, DRACO);
  const model = useMemo(() => clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const action = actions[clip] ?? actions[STAND_IN[clip] ?? 'idle'] ?? actions.idle;
    if (!action) return;
    const once = ONE_SHOT.includes(clip);
    action.reset();
    action.clampWhenFinished = once;
    action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    action.fadeIn(0.25).play();
    const finished = () => onClipEnd?.();
    if (once) mixer.addEventListener('finished', finished);
    return () => {
      action.fadeOut(0.25);
      if (once) mixer.removeEventListener('finished', finished);
    };
  }, [clip, actions, mixer, onClipEnd]);

  return (
    <group ref={group} {...props}>
      <primitive object={model} />
    </group>
  );
}

export function preloadCharacter(name: CharacterName): void {
  useGLTF.preload(`/models/${name}.glb`, DRACO);
}
