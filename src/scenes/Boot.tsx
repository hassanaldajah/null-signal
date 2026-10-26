import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { play, startAmbient, unlockAudio } from '../audio/sfx';
import { useI18n } from '../i18n';
import { useFlow } from '../store/flow';
import { useGame } from '../store/game';
import GlitchLogo from '../ui/GlitchLogo';
import './boot.css';

const BOOT_LOG = [
  'NXBIOS v4.20  (C) Nexus Systems',
  'CPU0: Nexus Quantum NQ-9 @ 4.80GHz ... OK',
  'Memory test: 32768 MB ... OK',
  'Detecting drives ... /dev/nvme0n1 [EVIDENCE, READ-ONLY]',
  'Loading kernel nexus-6.9.0-forensic ...',
  '[    0.000000] Linux version 6.9.0-forensic (build@nexus)',
  '[    0.104211] Mounting evidence volume ro,noexec,nosuid',
  '[    0.218733] audit: chain-of-custody logging enabled',
  '[    0.402190] net: sandbox mode, external traffic blocked',
  '[    0.611054] nexus-os: starting investigator session',
  '[    0.733912] WARNING: anomalous signal detected on channel 0x00',
  '[    0.734001] WARNING: source unknown. tagging as NULL SIGNAL',
];

export default function Boot() {
  const { t } = useI18n();
  const go = useFlow((state) => state.go);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const [lines, setLines] = useState<string[]>([]);
  const [showLogo, setShowLogo] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      index++;
      setLines(BOOT_LOG.slice(0, index));
      if (index >= BOOT_LOG.length) {
        clearInterval(timer);
        setTimeout(() => setShowLogo(true), 350);
      }
    }, reducedMotion ? 20 : 140);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  useEffect(() => {
    const leave = () => {
      if (leaving.current) return;
      leaving.current = true;
      unlockAudio();
      play('boot');
      startAmbient();
      const next = () => go('login');
      if (reducedMotion || !root.current) return next();
      gsap.timeline({ onComplete: next })
        .to(root.current.querySelector('.boot-logo'), { scale: 1.08, filter: 'blur(2px) brightness(2)', duration: 0.25 })
        .to(root.current, { opacity: 0, scale: 1.15, filter: 'blur(14px)', duration: 0.55, ease: 'power3.in' });
    };
    if (!showLogo) return;
    play('glitch');
    window.addEventListener('keydown', leave);
    window.addEventListener('pointerdown', leave);
    return () => {
      window.removeEventListener('keydown', leave);
      window.removeEventListener('pointerdown', leave);
    };
  }, [showLogo, go, reducedMotion]);

  return (
    <div ref={root} className="boot crt">
      <pre className={`boot-log ltr${showLogo ? ' faded' : ''}`}>
        {lines.map((line) => (
          <div key={line} className={line.includes('WARNING') ? 'warn' : undefined}>{line}</div>
        ))}
        {!showLogo && <span className="cursor">█</span>}
      </pre>
      {showLogo && (
        <div className="boot-logo">
          <GlitchLogo size={84} />
          <div className="press">{t(window.matchMedia('(pointer: coarse)').matches ? 'boot.tap' : 'boot.pressKey')}</div>
        </div>
      )}
    </div>
  );
}
