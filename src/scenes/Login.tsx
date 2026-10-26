import { Grid, Sparkles } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import { type FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Fog, PerspectiveCamera } from 'three';
import { play } from '../audio/sfx';
import { react } from '../audio/voice';
import { type UiKey, useI18n } from '../i18n';
import { useFlow } from '../store/flow';
import { useGame } from '../store/game';
import GlitchLogo from '../ui/GlitchLogo';
import { useTypewriter } from '../ui/useTypewriter';
import Character, { type Clip } from './three/Character';
import Effects from './three/Effects';
import './login.css';

const PHONE = '(max-width: 760px)';
/** The partner greets the detective, the detective answers. */
const LINES: { speaker: 'partner' | 'detective'; key: UiKey }[] = [
  { speaker: 'partner', key: 'login.partnerLine' },
  { speaker: 'detective', key: 'login.detectiveLine' },
];
/** World height the cast needs on screen (tallest head plus a margin). */
const CAST_HEIGHT = 2;

export default function Login() {
  const { t, dir } = useI18n();
  const savedCallsign = useGame((state) => state.callsign);
  const setCallsign = useGame((state) => state.setCallsign);
  const quality = useGame((state) => state.settings.quality);
  const reducedMotion = useGame((state) => state.settings.reducedMotion);
  const go = useFlow((state) => state.go);
  const [name, setName] = useState(savedCallsign);
  const card = useRef<HTMLFormElement>(null);
  const [cardTop, setCardTop] = useState(0);
  const [phone, setPhone] = useState(() => matchMedia(PHONE).matches);

  const [step, setStep] = useState(-1);
  const line = LINES[step];
  const { shown, done } = useTypewriter(line ? t(line.key) : '', step, line?.speaker ?? 'partner', reducedMotion);
  const [byteClip, setByteClip] = useState<Clip>('idle');
  const byteSettled = useCallback(() => setByteClip('idle'), []);

  useEffect(() => {
    const timer = setTimeout(() => setStep(0), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!done) return;
    const last = step === LINES.length - 1;
    // Byte cheers once the detective has answered.
    if (last) {
      setByteClip('hop');
      react('yip');
    }
    const timer = setTimeout(() => setStep((current) => current + 1), last ? 2600 : 800);
    return () => clearTimeout(timer);
  }, [done, step]);

  useEffect(() => {
    const query = matchMedia(PHONE);
    // offsetTop ignores the card's entrance transform, unlike getBoundingClientRect.
    const measure = () => {
      setPhone(query.matches);
      setCardTop(card.current?.offsetTop ?? 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (card.current) observer.observe(card.current);
    query.addEventListener('change', measure);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const callsign = name.trim().slice(0, 24);
    if (!callsign) return;
    play('success');
    setCallsign(callsign);
    go('hub');
  };

  const talking = line && !done ? line.speaker : null;
  // Desktop: keep the cast clear of the card (it sits on the left in Arabic). Phone: centre it.
  const castX = phone ? 0.3 : dir === 'rtl' ? 0.85 : 0;

  return (
    <div className="login">
      <Canvas
        className="login-canvas"
        dpr={quality === 'high' ? [1, 1.75] : 1}
        camera={{ position: [0, 1.15, 4.6], fov: 38 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <Framing phone={phone} cardTop={cardTop} />
        <color attach="background" args={['#04060c']} />
        <fog attach="fog" args={['#04060c', 4, 11]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[-2, 2.5, 2]} intensity={18} color="#00e5ff" />
        <pointLight position={[2, 1.5, -1]} intensity={14} color="#ff2bd6" />
        <Suspense fallback={null}>
          <group position={[castX, 0, 0]}>
            <Character name="partner" clip={talking === 'partner' ? 'talk' : 'idle'} position={[-1.05, 0, -0.15]} rotation={[0, 0.35, 0]} />
            <Character name="investigator" clip={talking === 'detective' ? 'talk' : 'idle'} position={[-0.3, 0, 0]} rotation={[0, -0.15, 0]} />
            <Character name="byte" clip={byteClip} onClipEnd={byteSettled} position={[0.45, 0, 0.45]} rotation={[0, -0.5, 0]} />
          </group>
        </Suspense>
        <Grid
          position={[0, 0, 0]}
          args={[30, 30]}
          cellColor="#0b3a46"
          sectionColor="#00e5ff"
          sectionSize={2}
          cellSize={0.5}
          fadeDistance={phone ? 40 : 14}
          infiniteGrid
        />
        <Sparkles count={quality === 'high' ? 120 : 40} scale={[8, 4, 8]} position={[0, 2, 0]} size={2} speed={0.3} color="#7ff6ff" />
        <Effects />
      </Canvas>

      <AnimatePresence mode="wait">
        {line && (
          <motion.div
            key={step}
            className={`login-dialogue panel ${line.speaker}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span className="label">{line.speaker === 'partner' ? t('cast.partner') : savedCallsign || t('cast.detective')}</span>
            <p className="typed-text">
              <span>
                {shown}
                {!done && <span className="cursor">▍</span>}
              </span>
              <span className="typed-text-space" aria-hidden="true">{t(line.key)}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form
        ref={card}
        className="login-card panel"
        onSubmit={submit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <GlitchLogo size={34} />
        <div className="label" style={{ marginTop: 28 }}>{t('login.title')}</div>
        {savedCallsign && <p className="welcome">{t('login.welcomeBack', { name: savedCallsign })}</p>}
        <label className="field">
          <span>{t('login.callsign')}</span>
          <input
            className="input"
            value={name}
            maxLength={24}
            autoFocus
            placeholder={t('login.callsignPlaceholder')}
            onChange={(event) => {
              setName(event.target.value);
              play('type');
            }}
          />
        </label>
        <button className="btn primary" type="submit" disabled={!name.trim()}>
          {t('login.enter')}
        </button>
        <LanguageToggle />
      </motion.form>
    </div>
  );
}

/**
 * Desktop: the classic three-quarter view. Phone: the card covers the bottom of the screen, so
 * shift the picture up (a lens shift, no tilt) and back the camera off until the whole cast fits
 * between the dialogue box and the card. Fog moves with the camera so the look stays the same.
 */
function Framing({ phone, cardTop }: { phone: boolean; cardTop: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera & { manual?: boolean };
  const scene = useThree((state) => state.scene);
  const { width, height } = useThree((state) => state.size);

  useEffect(() => {
    // Framing owns the aspect ratio: with a lens shift it must match the full virtual picture
    // (width / full height) or the pixels stop being square. `manual` keeps R3F from resetting it.
    camera.manual = true;
    const fog = scene.fog as Fog | null;
    if (!phone || cardTop <= 0) {
      camera.aspect = width / height;
      camera.clearViewOffset();
      camera.position.set(0, 1.15, 4.6);
      camera.lookAt(0, 0.9, 0);
      if (fog) [fog.near, fog.far] = [4, 11];
      return;
    }
    const top = 104; // below the dialogue box
    const bottom = Math.max(top + 120, cardTop - 12);
    const shift = height - (top + bottom);
    const full = height + shift;
    const distance = (CAST_HEIGHT * full) / (2 * Math.tan((camera.fov * Math.PI) / 360) * (bottom - top));
    camera.aspect = width / full;
    camera.setViewOffset(width, full, 0, shift, width, height);
    camera.position.set(0, CAST_HEIGHT / 2, distance);
    camera.lookAt(0, CAST_HEIGHT / 2, 0);
    if (fog) [fog.near, fog.far] = [distance - 0.6, distance + 6.4];
  }, [camera, scene, width, height, phone, cardTop]);

  return null;
}

export function LanguageToggle() {
  const lang = useGame((state) => state.settings.lang);
  const setSetting = useGame((state) => state.setSetting);
  return (
    <button
      type="button"
      className="btn ghost lang-toggle"
      onClick={() => {
        play('click');
        setSetting('lang', lang === 'en' ? 'ar' : 'en');
      }}
    >
      {lang === 'en' ? 'العربية' : 'English'}
    </button>
  );
}
