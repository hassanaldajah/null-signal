import { Sparkles } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, type InstancedMesh, Object3D, Vector3 } from 'three';

const PALETTE = ['#00e5ff', '#ff2bd6', '#7c4dff', '#39ff88', '#ffc857'];

function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Night cyber city: instanced towers + emissive window strips + data particles. Reacts to the mouse. */
export default function CityScene({ density = 1 }: { density?: number }) {
  const towers = useRef<InstancedMesh>(null);
  const strips = useRef<InstancedMesh>(null);
  const count = Math.round(260 * density);
  const stripCount = count * 3;

  const layout = useMemo(() => {
    const rand = random(42);
    const items: { x: number; z: number; w: number; d: number; h: number }[] = [];
    while (items.length < count) {
      const x = (rand() - 0.5) * 80;
      const z = -rand() * 70 - 4;
      if (Math.abs(x) < 3.2 && z > -18) continue; // keep the central avenue open
      const h = 2 + rand() ** 2.2 * (z < -30 ? 26 : 14);
      items.push({ x, z, w: 1.2 + rand() * 2.4, d: 1.2 + rand() * 2.4, h });
    }
    return items;
  }, [count]);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const rand = random(7);
    const tint = new Color();
    layout.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      towers.current!.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < 3; k++) {
        const y = 0.6 + rand() * (b.h - 0.8);
        dummy.position.set(b.x, y, b.z + b.d / 2 + 0.01);
        dummy.scale.set(b.w * (0.4 + rand() * 0.55), 0.06 + rand() * 0.1, 0.02);
        dummy.updateMatrix();
        strips.current!.setMatrixAt(i * 3 + k, dummy.matrix);
        tint.set(PALETTE[Math.floor(rand() * PALETTE.length)]).multiplyScalar(1.6 + rand() * 2.2);
        strips.current!.setColorAt(i * 3 + k, tint);
      }
    });
    towers.current!.instanceMatrix.needsUpdate = true;
    strips.current!.instanceMatrix.needsUpdate = true;
    if (strips.current!.instanceColor) strips.current!.instanceColor.needsUpdate = true;
  }, [layout]);

  return (
    <>
      <color attach="background" args={['#03050b']} />
      <fog attach="fog" args={['#03050b', 12, 70]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 20, 5]} intensity={0.4} color="#7f9cff" />
      <instancedMesh ref={towers} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#0b1020" roughness={0.6} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={strips} args={[undefined, undefined, stripCount]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -30]}>
        <planeGeometry args={[160, 120]} />
        <meshStandardMaterial color="#05070f" roughness={0.3} metalness={0.7} />
      </mesh>
      <AvenueLines />
      <Sparkles count={Math.round(220 * density)} scale={[40, 14, 50]} position={[0, 6, -20]} size={2.5} speed={0.25} color="#7ff6ff" />
      <MouseRig />
    </>
  );
}

function AvenueLines() {
  return (
    <group>
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 0.02, -20]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.08, 60]} />
          <meshBasicMaterial color={x < 0 ? '#00e5ff' : '#ff2bd6'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Camera drifts toward the pointer for a parallax feel. */
function MouseRig() {
  const { camera, pointer } = useThree();
  const target = useMemo(() => new Vector3(), []);
  const look = useRef(new Vector3(0, 4, -30));
  useFrame((_, delta) => {
    target.set(pointer.x * 3, 3.2 + pointer.y * 1.2, 9);
    camera.position.lerp(target, 1 - Math.exp(-delta * 2.5));
    camera.lookAt(look.current);
  });
  return null;
}
