import { motion } from 'framer-motion';
import { useRuntime } from '../engine/runtime';
import { useI18n } from '../i18n';
import { levelsInOrder } from '../levels/manifest';
import { hasLevel } from '../levels/registry';
import { useFlow } from '../store/flow';
import { rankFor, useGame } from '../store/game';
import { openApp } from './NexusOS';

/** "What you learned": the real-world concept and tools after each case. */
export default function Debrief() {
  const { t, tl } = useI18n();
  const runtime = useRuntime((state) => state.runtime)!;
  const record = useGame((state) => state.completed[runtime.config.id]);
  const intelFound = runtime.config.intel;
  const { go, openLevel } = useFlow();
  const { config, meta } = runtime;
  const next = levelsInOrder[meta.order];
  const minutes = record ? Math.floor(record.seconds / 60) : 0;
  const seconds = record ? record.seconds % 60 : 0;

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="debrief panel"
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="debrief-head">
          <span className="label">{meta.id} · {t('debrief.title')}</span>
          <h2>{tl(meta.title)}</h2>
          {record && <div className="debrief-rank">{rankFor(record.score, record.maxScore)}</div>}
        </div>
        {record && (
          <div className="debrief-stats">
            <span><span className="label">{t('debrief.score')}</span> {record.score}/{record.maxScore}</span>
            <span><span className="label">{t('debrief.hints')}</span> {record.hintsUsed}</span>
            <span><span className="label">{t('debrief.time')}</span> {minutes}:{String(seconds).padStart(2, '0')}</span>
          </div>
        )}
        <section>
          <h3>{t('debrief.learned')}</h3>
          <p>{tl(config.debrief.concept)}</p>
        </section>
        <section>
          <h3>{t('debrief.tools')}</h3>
          <div className="tool-chips">
            {config.debrief.realTools.map((tool) => <span key={tool} className="chip mono">{tool}</span>)}
          </div>
        </section>
        <section>
          <h3>{t('debrief.takeaway')}</h3>
          <p>{tl(config.debrief.takeaway)}</p>
          <p className="debrief-source">{t('debrief.source')}: {config.debrief.source}</p>
        </section>
        {intelFound && <p className="intel-found">◆ {t('intel.found')}</p>}
        <div className="debrief-actions">
          <button className="btn ghost" onClick={() => { useRuntime.setState({ finished: false }); openApp('evidence'); }}>
            {t('debrief.board')}
          </button>
          <button className="btn ghost" onClick={() => go('hub')}>{t('debrief.map')}</button>
          {next && hasLevel(next.id) && (
            <button className="btn primary" onClick={() => openLevel(next.id)}>{t('debrief.next')} →</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
