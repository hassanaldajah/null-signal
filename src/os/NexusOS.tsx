import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { play } from '../audio/sfx';
import { react } from '../audio/voice';
import { useRuntime } from '../engine/runtime';
import type { AppId } from '../engine/schema';
import { useI18n } from '../i18n';
import { useFlow } from '../store/flow';
import { EMPTY_LIST } from '../store/empty';
import { useGame } from '../store/game';
import { useEcho } from '../ui/echo';
import { toast } from '../ui/Toasts';
import { APPS } from './apps';
import BriefingIntro from './BriefingIntro';
import Debrief from './Debrief';
import EchoCorner from './EchoCorner';
import Lockscreen from './Lockscreen';
import Window from './Window';
import { useWindows } from './windowStore';
import './os.css';

export function openApp(id: AppId): void {
  play('open');
  useWindows.getState().open(id, APPS[id].size);
}

export default function NexusOS() {
  const { t, tl } = useI18n();
  const runtime = useRuntime((state) => state.runtime)!;
  const finished = useRuntime((state) => state.finished);
  const fresh = useRuntime((state) => state.fresh);
  const windows = useWindows((state) => state.windows);
  const topZ = useWindows((state) => state.topZ);
  const go = useFlow((state) => state.go);
  const solved: readonly string[] = useGame((state) => state.objectives[runtime.config.id] ?? EMPTY_LIST);
  const { config, meta } = runtime;
  const lock = config.world.lockscreen;
  const locked = !!lock && !solved.includes(lock.objective);
  const [clock, setClock] = useState(() => new Date());
  const [briefed, setBriefed] = useState(false);

  useEffect(() => {
    useWindows.getState().reset();
    const timer = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []); // once per level: NexusOS is keyed by level id

  // The partner briefs the case first; the desktop wakes up when the detective answers.
  const begin = () => {
    setBriefed(true);
    useEcho.getState().say(tl(config.echo.intro), 'talk');
    if (!locked) for (const app of config.autoOpen ?? ['case']) openApp(app);
  };

  useEffect(() => {
    if (!fresh.length) return;
    play('evidence');
    // After the yip for the answer that granted it: Byte reacts one sound at a time.
    const sniff = setTimeout(() => react('sniff'), 450);
    toast(`${t('evidence.new')}: ${fresh.length}`, 'evidence');
    return () => clearTimeout(sniff);
  }, [fresh, t]);

  useEffect(() => {
    if (!finished) return;
    play('success');
    const bark = setTimeout(() => react('bark'), 300);
    useEcho.getState().say(tl(config.echo.success), 'talk');
    return () => clearTimeout(bark);
  }, [finished, config, tl]);

  const unlocked = () => {
    for (const app of config.autoOpen ?? ['case']) openApp(app);
  };

  return (
    <div className="nexus">
      <div className="desktop">
        <div className="wallpaper">
          <span className="glitch" data-text="NEXUS OS">NEXUS OS</span>
        </div>
        <nav className="desktop-icons">
          {config.apps.map((id) => (
            <button key={id} className="desktop-icon" disabled={locked} onClick={() => openApp(id)}>
              <span className="icon-glyph mono">{APPS[id].icon}</span>
              <span>{t(APPS[id].title)}</span>
            </button>
          ))}
        </nav>
        <div className="window-layer">
          {windows.map((win) => <Window key={win.id} win={win} />)}
        </div>
        {locked && lock && <Lockscreen lock={lock} onUnlocked={unlocked} />}
      </div>

      <footer className="taskbar">
        <span className="taskbar-level">
          <span className="label">{meta.id}</span> {tl(meta.title)}
        </span>
        <div className="taskbar-apps">
          {config.apps.map((id) => {
            const win = windows.find((item) => item.id === id);
            return (
              <button
                key={id}
                className={`task-btn${win ? ' running' : ''}${win && !win.minimized ? ' active' : ''}`}
                title={t(APPS[id].title)}
                disabled={locked}
                // Like a desktop OS: the front window minimizes, a covered one comes to the front.
                onClick={() => (win && !win.minimized && win.z === topZ ? useWindows.getState().toggleMinimize(id) : openApp(id))}
              >
                <span className="mono">{APPS[id].icon}</span>
                <span className="task-label">{t(APPS[id].title)}</span>
              </button>
            );
          })}
        </div>
        <span className="taskbar-clock mono">{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <button className="btn ghost exit" onClick={() => { play('close'); go('hub'); }}>{t('os.exit')}</button>
      </footer>

      <EchoCorner />
      <AnimatePresence>{!briefed && <BriefingIntro onStart={begin} />}</AnimatePresence>
      <AnimatePresence>{finished && <Debrief />}</AnimatePresence>
    </div>
  );
}
