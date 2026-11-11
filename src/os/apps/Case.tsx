import { motion, useAnimationControls } from 'framer-motion';
import { type FormEvent, useState } from 'react';
import { play } from '../../audio/sfx';
import { currentScore, useRuntime } from '../../engine/runtime';
import type { Objective } from '../../engine/schema';
import { placeholderFor, useI18n } from '../../i18n';
import { EMPTY_LIST } from '../../store/empty';
import { useGame } from '../../store/game';
import { useGuide } from '../../ui/echo';
import Rich from '../../ui/Rich';
import './apps.css';

const ARABIC = /[؀-ۿ]/;

/** The mission in plain words, the objectives (unlocked one at a time) and the way to the Guide. */
export default function Case() {
  const { t, tl } = useI18n();
  const runtime = useRuntime((state) => state.runtime)!;
  const { config } = runtime;
  const solved: readonly string[] = useGame((state) => state.objectives[config.id] ?? EMPTY_LIST);
  const hintsRevealed = useGame((state) => state.hints[config.id] ?? 0);
  const freeTiers: readonly number[] = useGame((state) => state.freeHints[config.id] ?? EMPTY_LIST);
  const firstOpen = config.objectives.findIndex((objective) => !solved.includes(objective.id));
  const total = config.objectives.length;

  return (
    <div className="case">
      <section className="mission">
        <h4>{t('guide.mission')}</h4>
        <p className="mission-goal"><Rich text={tl(config.mission.goal)} /></p>
        <h4>{t('guide.investigate')}</h4>
        <ul>
          {config.mission.investigate.map((item, index) => <li key={index}><Rich text={tl(item)} /></li>)}
        </ul>
        <h4>{t('guide.success')}</h4>
        <p><Rich text={tl(config.mission.success)} /></p>
        {config.requires.evidence.length > 0 && <p className="requires">⌗ {t('case.requires')}</p>}
        <details className="story">
          <summary>{t('case.story')}</summary>
          <p className="briefing"><Rich text={tl(config.briefing)} /></p>
        </details>
      </section>

      <section>
        <div className="case-row">
          <span className="label">{t('case.objectives')}</span>
          <span className="dim small">{t('case.step', { n: firstOpen < 0 ? total : firstOpen + 1, total })}</span>
        </div>
        <ol className="objectives">
          {config.objectives.map((objective, index) => (
            <ObjectiveRow
              key={objective.id}
              number={index + 1}
              objective={objective}
              state={solved.includes(objective.id) ? 'solved' : index === firstOpen ? 'active' : 'locked'}
              isLock={config.world.lockscreen?.objective === objective.id}
            />
          ))}
        </ol>
      </section>

      <section className="case-foot">
        <span><span className="label">{t('case.score')}</span> <span className="score mono">{currentScore(config, hintsRevealed, freeTiers)} / {config.rewards.points}</span></span>
        <button className="btn small" onClick={() => { play('open'); useGuide.getState().setOpen(true); }}>
          <span aria-hidden="true">?</span> {t('case.openGuide')}
        </button>
      </section>
    </div>
  );
}

function ObjectiveRow({ number, objective, state, isLock }: { number: number; objective: Objective; state: 'solved' | 'active' | 'locked'; isLock: boolean }) {
  const { t, tl, lang, dir } = useI18n();
  const submit = useRuntime((s) => s.submit);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState(false);
  const shake = useAnimationControls();
  const { validator } = objective;

  const attempt = (input: string) => {
    if (submit(objective.id, input)) {
      play('success');
      setFeedback(false);
      return;
    }
    play('error');
    setFeedback(true);
    shake.start({ x: [0, -10, 8, -5, 3, 0], transition: { duration: 0.35 } });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) attempt(value);
  };

  return (
    <motion.li className={`objective ${state}`} animate={shake}>
      <div className="objective-prompt">
        <span className="objective-mark mono">{state === 'solved' ? '✔' : number}</span>
        <span><Rich text={tl(objective.prompt)} /></span>
      </div>
      {state === 'active' && !isLock && (validator.kind === 'command' || validator.kind === 'cwd') && (
        <p className="dim small">{t('case.terminalTask')}</p>
      )}
      {state === 'active' && !isLock && validator.kind === 'choice' && (
        <div className="choices">
          {validator.options.map((option) => {
            const label = tl(option.label);
            return (
              <button key={option.id} className="btn ghost choice" dir={ARABIC.test(label) ? undefined : 'ltr'} onClick={() => attempt(option.id)}>
                <span><Rich text={label} /></span>
              </button>
            );
          })}
        </div>
      )}
      {state === 'active' && !isLock && (validator.kind === 'answer' || validator.kind === 'evidence') && (
        <form className="answer" onSubmit={onSubmit}>
          <input
            className="input answer-input"
            // Answers are Latin text; an empty box follows the page so an Arabic placeholder reads right.
            dir={value ? 'ltr' : dir}
            value={value}
            placeholder={placeholderFor(lang, objective.placeholder)}
            onChange={(event) => setValue(event.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="btn primary" type="submit">{t('case.submit')}</button>
        </form>
      )}
      {feedback && state === 'active' && <p className="feedback" role="status"><Rich text={tl(objective.wrong) || t('case.wrong')} /></p>}
    </motion.li>
  );
}
