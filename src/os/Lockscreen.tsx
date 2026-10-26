import { motion, useAnimationControls } from 'framer-motion';
import { type FormEvent, useState } from 'react';
import { play } from '../audio/sfx';
import { react } from '../audio/voice';
import { useRuntime } from '../engine/runtime';
import type { World } from '../engine/schema';
import { useI18n } from '../i18n';
import { EMPTY_LIST } from '../store/empty';
import './apps/apps.css';

type Lock = NonNullable<World['lockscreen']>;

/** Login prompt of the suspect's workstation. Clues to the password live outside it. */
export default function Lockscreen({ lock, onUnlocked }: { lock: Lock; onUnlocked: () => void }) {
  const { t, tl } = useI18n();
  const submit = useRuntime((state) => state.submit);
  const notes = useRuntime((state) => state.runtime?.config.world.notes) ?? EMPTY_LIST;
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const shake = useAnimationControls();

  const attempt = (event: FormEvent) => {
    event.preventDefault();
    if (submit(lock.objective, value)) {
      play('success');
      react('yip');
      onUnlocked();
      return;
    }
    play('error');
    react('whine');
    setWrong(true);
    shake.start({ x: [0, -14, 12, -8, 6, 0], transition: { duration: 0.4 } });
  };

  return (
    <motion.div className="lockscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Physical sticky notes on the monitor bezel: the classic real-world leak. */}
      <div className="bezel-notes">
        {notes.map((note, index) => (
          <article key={note.id} className={`sticky ${note.color ?? 'yellow'}`} style={{ rotate: `${(index % 2 ? 3 : -4) + index}deg` }}>
            <h4>{note.title}</h4>
            <p className="ltr">{note.body}</p>
          </article>
        ))}
      </div>
      <motion.form className="lock-card panel" onSubmit={attempt} animate={shake}>
        <div className="lock-avatar mono">{lock.user.slice(0, 2).toUpperCase()}</div>
        <div className="label">{t('lock.title')}</div>
        <div className="lock-user mono">{lock.user}</div>
        <input
          className="input ltr"
          type="password"
          autoFocus
          placeholder={t('lock.password')}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setWrong(false);
            play('type');
          }}
        />
        {wrong && <div className="lock-wrong">{t('lock.wrong')}</div>}
        <button className="btn primary" type="submit" disabled={!value}>{t('lock.unlock')}</button>
        {lock.hint && <p className="lock-hint">{tl(lock.hint)}</p>}
      </motion.form>
    </motion.div>
  );
}
