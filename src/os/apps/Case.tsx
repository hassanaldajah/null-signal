import { motion, useAnimationControls } from 'framer-motion';
import { type FormEvent, useState } from 'react';
import { play } from '../../audio/sfx';
import { react } from '../../audio/voice';
import { currentScore, useRuntime } from '../../engine/runtime';
import type { Objective } from '../../engine/schema';
import { useI18n } from '../../i18n';
import { EMPTY_LIST } from '../../store/empty';
import { useGame } from '../../store/game';
import { useEcho } from '../../ui/echo';
import './apps.css';

/** Briefing, objectives (unlocked one at a time) and ECHO's tiered hints. */
export default function Case() {
  const { t, tl } = useI18n();
  const runtime = useRuntime((state) => state.runtime)!;
  const { config } = runtime;
  const solved: readonly string[] = useGame((state) => state.objectives[config.id] ?? EMPTY_LIST);
  const hintsRevealed = useGame((state) => state.hints[config.id] ?? 0);
  const freeTiers: readonly number[] = useGame((state) => state.freeHints[config.id] ?? EMPTY_LIST);
  const intel = useGame((state) => state.intel);
  const intelLeft = intel.collected.filter((id) => !intel.spent.includes(id)).length;
  const firstOpen = config.objectives.findIndex((objective) => !solved.includes(objective.id));

  const askEcho = () => {
    const tier = config.hints[hintsRevealed];
    if (!tier) return;
    useGame.getState().revealHint(config.id);
    play('hint');
    useEcho.getState().say(tl(tier.text), 'point');
  };

  const useIntel = () => {
    const tier = config.hints[hintsRevealed];
    if (!tier || !useGame.getState().spendIntel(config.id)) return;
    play('hint');
    useEcho.getState().say(tl(tier.text), 'point');
  };

  return (
    <div className="case">
      <section>
        <div className="label">{t('case.briefing')}</div>
        <p className="briefing">{tl(config.briefing)}</p>
        {config.requires.evidence.length > 0 && <p className="requires">⌗ {t('case.requires')}</p>}
      </section>

      <section>
        <div className="label">{t('case.objectives')}</div>
        <ol className="objectives">
          {config.objectives.map((objective, index) => (
            <ObjectiveRow
              key={objective.id}
              objective={objective}
              state={solved.includes(objective.id) ? 'solved' : index === firstOpen ? 'active' : 'locked'}
              isLock={config.world.lockscreen?.objective === objective.id}
            />
          ))}
        </ol>
      </section>

      <section className="hints">
        <div className="hints-head">
          <span className="label">ECHO</span>
          <span className="score mono">{currentScore(config, hintsRevealed, freeTiers)} / {config.rewards.points}</span>
        </div>
        {config.hints.slice(0, hintsRevealed).map((hint) => (
          <motion.div key={hint.tier} className={`hint-card ${hint.tier}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <span className="label">{t(`hint.tier.${hint.tier}`)}</span>
            <p>{tl(hint.text)}</p>
          </motion.div>
        ))}
        {hintsRevealed < 3 ? (
          <div className="hint-actions">
            <button className="btn" onClick={askEcho}>
              {t('hint.ask')} <span className="cost">{t('hint.cost', { cost: config.hints[hintsRevealed].cost })}</span>
            </button>
            {intelLeft > 0 && <button className="btn ghost" onClick={useIntel}>◆ {t('hint.intel')} ({intelLeft})</button>}
          </div>
        ) : (
          <p className="dim">{t('hint.none')}</p>
        )}
      </section>
    </div>
  );
}

function ObjectiveRow({ objective, state, isLock }: { objective: Objective; state: 'solved' | 'active' | 'locked'; isLock: boolean }) {
  const { t, tl } = useI18n();
  const submit = useRuntime((s) => s.submit);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const shake = useAnimationControls();
  const { validator } = objective;

  const attempt = (input: string) => {
    if (submit(objective.id, input)) {
      play('success');
      react('yip');
      setFeedback('');
      return;
    }
    play('error');
    react('whine');
    setFeedback(tl(objective.wrong) || t('case.wrong'));
    shake.start({ x: [0, -10, 8, -5, 3, 0], transition: { duration: 0.35 } });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) attempt(value);
  };

  return (
    <motion.li className={`objective ${state}`} animate={shake}>
      <div className="objective-prompt">
        <span className="objective-mark">{state === 'solved' ? '✔' : state === 'active' ? '◉' : '○'}</span>
        <span>{tl(objective.prompt)}</span>
      </div>
      {state === 'active' && !isLock && (validator.kind === 'command' || validator.kind === 'cwd') && (
        <p className="dim small">{t('case.terminalTask')}</p>
      )}
      {state === 'active' && !isLock && validator.kind === 'choice' && (
        <div className="choices">
          {validator.options.map((option) => (
            <button key={option.id} className="btn ghost" onClick={() => attempt(option.id)}>{tl(option.label)}</button>
          ))}
        </div>
      )}
      {state === 'active' && !isLock && (validator.kind === 'answer' || validator.kind === 'evidence') && (
        <form className="answer" onSubmit={onSubmit}>
          <input
            className="input ltr"
            value={value}
            placeholder={objective.placeholder ?? '…'}
            onChange={(event) => setValue(event.target.value)}
          />
          <button className="btn primary" type="submit">{t('case.submit')}</button>
        </form>
      )}
      {feedback && state === 'active' && <p className="feedback">{feedback}</p>}
    </motion.li>
  );
}
