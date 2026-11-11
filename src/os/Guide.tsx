import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { play } from '../audio/sfx';
import { currentScore, guideCost, useRuntime } from '../engine/runtime';
import { GUIDE_TIERS } from '../engine/schema';
import { useI18n } from '../i18n';
import { EMPTY_LIST } from '../store/empty';
import { rankFor, useGame } from '../store/game';
import { useEcho, useGuide } from '../ui/echo';
import LangSwitch from '../ui/LangSwitch';
import Rich from '../ui/Rich';

/**
 * The Guide: the mission in plain words, then three hint tiers (nudge, clue, full solution).
 * Every tier shows its cost and asks before it opens. The solution walks through the steps the
 * player has reached and ends with the security idea behind the case.
 */
export default function Guide() {
  const { t, tl } = useI18n();
  const open = useGuide((state) => state.open);
  const setOpen = useGuide((state) => state.setOpen);
  const { config, meta } = useRuntime((state) => state.runtime)!;
  const solved: readonly string[] = useGame((state) => state.objectives[config.id] ?? EMPTY_LIST);
  const revealed = useGame((state) => state.hints[config.id] ?? 0);
  const freeTiers: readonly number[] = useGame((state) => state.freeHints[config.id] ?? EMPTY_LIST);
  const intel = useGame((state) => state.intel);
  const intelLeft = intel.collected.filter((id) => !intel.spent.includes(id)).length;
  const [pending, setPending] = useState<number | null>(null);

  const total = config.objectives.length;
  const firstOpen = config.objectives.findIndex((objective) => !solved.includes(objective.id));
  const reached = firstOpen < 0 ? total : firstOpen + 1;
  const max = config.rewards.points;
  const score = currentScore(config, revealed, freeTiers);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const reveal = (free: boolean) => {
    const game = useGame.getState();
    if (free ? !game.spendIntel(config.id) : (game.revealHint(config.id), false)) return;
    setPending(null);
    play('hint');
    useEcho.getState().gesture('point');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="guide-panel panel"
          role="dialog"
          aria-label={t('guide.title')}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
        >
          <header className="guide-head">
            <span className="guide-title"><span className="label">{meta.id}</span> {t('guide.title')}</span>
            <LangSwitch />
            <button className="guide-close" aria-label={t('common.close')} onClick={() => setOpen(false)}>×</button>
          </header>

          <div className="guide-body">
            <section className="mission">
              <h4>{t('guide.mission')}</h4>
              <p className="mission-goal"><Rich text={tl(config.mission.goal)} /></p>
              <h4>{t('guide.investigate')}</h4>
              <ul>
                {config.mission.investigate.map((item, index) => <li key={index}><Rich text={tl(item)} /></li>)}
              </ul>
              <h4>{t('guide.success')}</h4>
              <p><Rich text={tl(config.mission.success)} /></p>
            </section>

            <section>
              <div className="guide-row">
                <h4>{t('guide.hints')}</h4>
                <span className="score mono" title={t('case.score')}>{score} / {max}</span>
              </div>
              <p className="guide-now">{firstOpen < 0 ? t('guide.allDone') : t('guide.now', { n: reached, total })}</p>

              {GUIDE_TIERS.map((tier, index) => {
                const cost = guideCost(config, index);
                const isOpen = index < revealed;
                const isNext = index === revealed;
                return (
                  <div key={tier} className={`tier ${tier}${isOpen ? ' open' : ''}`}>
                    <div className="tier-head">
                      <span className="tier-name"><span className="tier-n mono">{index + 1}</span> {t(`guide.tier.${tier}`)}</span>
                      {isOpen ? (
                        freeTiers.includes(index) && <span className="cost">{t('guide.free')}</span>
                      ) : (
                        <button className="btn small" disabled={!isNext} onClick={() => setPending(index)}>
                          {t('guide.show')} <span className="cost">{t('guide.cost', { cost })}</span>
                        </button>
                      )}
                    </div>
                    {!isOpen && <p className="tier-info">{isNext ? t(`guide.info.${tier}`) : t('guide.locked')}</p>}

                    {pending === index && isNext && (
                      <div className="tier-confirm" role="alertdialog" aria-label={t(`guide.tier.${tier}`)}>
                        <p>{t('guide.confirm', { cost, from: score, to: score - cost, max, rank: rankFor(score - cost, max) })}</p>
                        <div className="tier-actions">
                          <button className="btn primary small" onClick={() => reveal(false)}>{t('guide.confirmYes')}</button>
                          {intelLeft > 0 && <button className="btn small" onClick={() => reveal(true)}>◆ {t('guide.useIntel', { n: intelLeft })}</button>}
                          <button className="btn ghost small" onClick={() => setPending(null)}>{t('guide.confirmNo')}</button>
                        </div>
                      </div>
                    )}

                    {isOpen && tier === 'nudge' && <p className="tier-text"><Rich text={tl(config.guide.nudge)} /></p>}
                    {isOpen && tier === 'clue' && <p className="tier-text"><Rich text={tl(config.guide.clue)} /></p>}
                    {isOpen && tier === 'solution' && (
                      <>
                        <ol className="steps">
                          {config.objectives.slice(0, reached).map((objective, step) => (
                            <li key={objective.id} className={solved.includes(objective.id) ? 'done' : 'current'}>
                              <span className="step-n">{t('guide.stepN', { n: step + 1 })}</span>
                              <Rich text={tl(config.guide.steps[objective.id])} />
                            </li>
                          ))}
                        </ol>
                        {reached < total && <p className="tier-info">{t('guide.later')}</p>}
                        <div className="idea">
                          <h4>{t('guide.idea')}</h4>
                          <p><Rich text={tl(config.guide.concept)} /></p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
