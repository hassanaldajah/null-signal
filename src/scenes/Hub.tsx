import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { play } from '../audio/sfx';
import type { LevelMeta } from '../engine/schema';
import { useI18n } from '../i18n';
import { acts, levelsInOrder } from '../levels/manifest';
import { hasLevel } from '../levels/registry';
import { useFlow } from '../store/flow';
import { rankFor, useGame } from '../store/game';
import GlitchLogo from '../ui/GlitchLogo';
import Settings from '../ui/Settings';
import CityScene from './three/CityScene';
import Effects from './three/Effects';
import './hub.css';

type LevelState = 'done' | 'open' | 'locked' | 'soon';

function useLevelStates(): Record<string, LevelState> {
  const completed = useGame((state) => state.completed);
  return useMemo(() => {
    const unlockAll = new URLSearchParams(location.search).has('unlock');
    const states: Record<string, LevelState> = {};
    levelsInOrder.forEach((level, index) => {
      const previous = levelsInOrder[index - 1];
      if (completed[level.id]) states[level.id] = 'done';
      else if (!hasLevel(level.id)) states[level.id] = 'soon';
      else if (unlockAll || !previous || completed[previous.id]) states[level.id] = 'open';
      else states[level.id] = 'locked';
    });
    return states;
  }, [completed]);
}

export default function Hub() {
  const { t, tl } = useI18n();
  const quality = useGame((state) => state.settings.quality);
  const callsign = useGame((state) => state.callsign);
  const completed = useGame((state) => state.completed);
  const evidenceCount = useGame((state) => Object.keys(state.evidence).length);
  const openLevel = useFlow((state) => state.openLevel);
  const states = useLevelStates();
  const [selected, setSelected] = useState<LevelMeta | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const totalScore = Object.values(completed).reduce((sum, record) => sum + record.score, 0);

  useEffect(() => {
    if (!scroller.current) return;
    const lenis = new Lenis({
      wrapper: scroller.current,
      content: scroller.current.firstElementChild as HTMLElement,
      orientation: 'horizontal',
      gestureOrientation: 'both',
      smoothWheel: true,
    });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="hub">
      <Canvas
        className="hub-canvas"
        dpr={quality === 'high' ? [1, 1.5] : 1}
        camera={{ position: [0, 3.2, 9], fov: 55 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <CityScene density={quality === 'high' ? 1 : 0.45} />
        </Suspense>
        <Effects bloom={1.3} />
      </Canvas>

      <header className="hub-header">
        <div className="hub-brand">
          <GlitchLogo size={26} tagline={false} />
          <span className="label">{t('hub.title')}</span>
        </div>
        <div className="hub-stats">
          <span className="mono">{callsign || 'investigator'}</span>
          <Stat label={t('hub.score')} value={totalScore} />
          <Stat label={t('hub.evidence')} value={evidenceCount} />
          <button className="btn ghost" onClick={() => { play('click'); setSettingsOpen(true); }}>
            {t('hub.settings')}
          </button>
        </div>
      </header>

      <div className="act-scroller" ref={scroller}>
        <div className="act-track">
          {acts.map((act, actIndex) => {
            const records = act.levels.map((level) => completed[level.id]).filter(Boolean);
            const score = records.reduce((sum, record) => sum + record!.score, 0);
            const max = records.reduce((sum, record) => sum + record!.maxScore, 0);
            const actDone = records.length === act.levels.length;
            return (
              <motion.section
                key={act.id}
                className="act-column panel"
                style={{ ['--act' as string]: act.color }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * actIndex, duration: 0.5 }}
              >
                <div className="act-head">
                  <span className="label">{t('hub.act', { n: act.id })}</span>
                  <h2>{tl(act.title)}</h2>
                  {actDone && <span className="rank">{t('hub.rank')} {rankFor(score, max)}</span>}
                </div>
                <ol className="level-list">
                  {act.levels.map((level) => (
                    <LevelNode key={level.id} level={level} state={states[level.id]} onSelect={() => setSelected(level)} />
                  ))}
                </ol>
              </motion.section>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="level-sheet panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
          >
            <button className="sheet-close btn ghost" onClick={() => setSelected(null)} aria-label={t('common.close')}>×</button>
            <span className="label">{t('hub.level', { n: selected.order })}{selected.boss ? ` · ${t('hub.boss')}` : ''}</span>
            <h3>{tl(selected.title)}</h3>
            <p className="skill">{tl(selected.skill)}</p>
            {states[selected.id] === 'soon' && <p className="dim">{t('hub.comingSoon')}</p>}
            {states[selected.id] === 'locked' && <p className="dim">{t('hub.locked')}</p>}
            {(states[selected.id] === 'open' || states[selected.id] === 'done') && (
              <button
                className="btn primary"
                onClick={() => {
                  play('open');
                  openLevel(selected.id);
                }}
              >
                {states[selected.id] === 'done' ? t('hub.replay') : t('hub.start')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="stat">
      <span className="label">{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function LevelNode({ level, state, onSelect }: { level: LevelMeta; state: LevelState; onSelect: () => void }) {
  const { tl } = useI18n();
  const record = useGame((s) => s.completed[level.id]);
  return (
    <li>
      <button
        className={`level-node ${state}${level.boss ? ' boss' : ''}`}
        onClick={() => {
          play(state === 'locked' || state === 'soon' ? 'error' : 'click');
          onSelect();
        }}
        onMouseEnter={() => play('hover')}
      >
        <span className="node-index mono">{String(level.order).padStart(2, '0')}</span>
        <span className="node-text">
          <span className="node-title">{tl(level.title)}</span>
          <span className="node-skill">{tl(level.skill)}</span>
        </span>
        <span className="node-state" aria-hidden>
          {state === 'done' ? rankFor(record?.score ?? 0, record?.maxScore ?? 1) : state === 'open' ? '▶' : '🔒'}
        </span>
      </button>
    </li>
  );
}
