import { motion } from 'framer-motion';
import { type PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from 'react';
import { play } from '../../audio/sfx';
import { useRuntime } from '../../engine/runtime';
import type { EvidenceType } from '../../engine/schema';
import { useI18n } from '../../i18n';
import { type EvidenceItem, useGame } from '../../store/game';
import './apps.css';

const CARD_W = 220;
const CARD_H = 118;
const TYPE_COLORS: Record<EvidenceType, string> = {
  credential: '#ffc857', ip: '#00e5ff', domain: '#7c4dff', email: '#ff2bd6', file: '#39ff88',
  hash: '#b388ff', timestamp: '#4aa8ff', person: '#ff8a65', artifact: '#e6f1ff', ioc: '#ff4d6d', note: '#ffd54f',
};

function defaultPosition(index: number) {
  return { x: 24 + (index % 4) * (CARD_W + 28), y: 24 + Math.floor(index / 4) * (CARD_H + 40) };
}

/** Pinned evidence from every case, with red strings between related clues. */
export default function EvidenceBoard() {
  const { t, tl } = useI18n();
  const evidence = useGame((state) => state.evidence);
  const boardLinks = useGame((state) => state.boardLinks);
  const saved = useGame((state) => state.boardPositions);
  const fresh = useRuntime((state) => state.fresh);
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number } | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const origin = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0, moved: false });

  const items = useMemo(
    () => Object.values(evidence).sort((a, b) => a.sourceLevel.localeCompare(b.sourceLevel) || a.timestamp.localeCompare(b.timestamp)),
    [evidence],
  );
  const position = (item: EvidenceItem, index: number) =>
    dragging?.id === item.id ? dragging : saved[item.id] ?? defaultPosition(index);
  const positions = Object.fromEntries(items.map((item, index) => [item.id, position(item, index)]));

  const links = useMemo(() => {
    const pairs = new Map<string, [string, string]>();
    const add = (a: string, b: string) => {
      if (!evidence[a] || !evidence[b]) return;
      pairs.set([a, b].sort().join('|'), [a, b]);
    };
    for (const item of items) for (const other of item.links) add(item.id, other);
    for (const [a, b] of boardLinks) add(a, b);
    return [...pairs.values()];
  }, [items, boardLinks, evidence]);

  const startDrag = (event: ReactPointerEvent, item: EvidenceItem, index: number) => {
    const start = position(item, index);
    origin.current = { pointerX: event.clientX, pointerY: event.clientY, x: start.x, y: start.y, moved: false };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent, item: EvidenceItem) => {
    if (!(event.buttons & 1)) return;
    const dx = event.clientX - origin.current.pointerX;
    const dy = event.clientY - origin.current.pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 3) origin.current.moved = true;
    if (origin.current.moved) setDragging({ id: item.id, x: Math.max(0, origin.current.x + dx), y: Math.max(0, origin.current.y + dy) });
  };
  const endDrag = (item: EvidenceItem) => {
    if (dragging?.id === item.id) {
      useGame.getState().moveCard(item.id, dragging.x, dragging.y);
      setDragging(null);
      return;
    }
    if (!linkMode) return;
    if (!linkFrom) {
      setLinkFrom(item.id);
      play('click');
    } else {
      useGame.getState().linkEvidence(linkFrom, item.id);
      play('evidence');
      setLinkFrom(null);
    }
  };

  if (items.length === 0) {
    return <div className="board-empty dim">{t('evidence.empty')}</div>;
  }
  const width = Math.max(...items.map((item, i) => position(item, i).x)) + CARD_W + 40;
  const height = Math.max(...items.map((item, i) => position(item, i).y)) + CARD_H + 40;

  return (
    <div className="board">
      <div className="board-tools">
        <button className={`btn ghost small${linkMode ? ' on' : ''}`} onClick={() => { setLinkMode(!linkMode); setLinkFrom(null); }}>
          ⌁ {t('evidence.link')}
        </button>
        <span className="dim small">{items.length} · {t('hub.evidence')}</span>
      </div>
      <div className="board-canvas" style={{ width, height }}>
        <svg className="strings" width={width} height={height}>
          {links.map(([a, b]) => {
            const pa = positions[a];
            const pb = positions[b];
            const ax = pa.x + CARD_W / 2;
            const ay = pa.y + 10;
            const bx = pb.x + CARD_W / 2;
            const by = pb.y + 10;
            const sag = Math.min(90, Math.hypot(bx - ax, by - ay) * 0.25);
            return (
              <motion.path
                key={`${a}|${b}`}
                d={`M ${ax} ${ay} Q ${(ax + bx) / 2} ${Math.max(ay, by) + sag} ${bx} ${by}`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
              />
            );
          })}
        </svg>
        {items.map((item, index) => {
          const p = positions[item.id];
          return (
            <motion.article
              key={item.id}
              className={`evidence-card${fresh.includes(item.id) ? ' fresh' : ''}${linkFrom === item.id ? ' linking' : ''}`}
              style={{ left: p.x, top: p.y, width: CARD_W, minHeight: CARD_H, ['--type' as string]: TYPE_COLORS[item.type] }}
              initial={fresh.includes(item.id) ? { scale: 0.6, opacity: 0, rotate: -6 } : false}
              animate={{ scale: 1, opacity: 1, rotate: (index % 3) - 1 }}
              onPointerDown={(event) => startDrag(event, item, index)}
              onPointerMove={(event) => moveDrag(event, item)}
              onPointerUp={() => endDrag(item)}
            >
              <span className="pin" />
              <span className="ev-type mono">{item.type}</span>
              <h4>{tl(item.title)}</h4>
              <code className="ev-content">{item.content}</code>
              <span className="ev-source dim">{t('evidence.from', { level: item.sourceLevel })}</span>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
