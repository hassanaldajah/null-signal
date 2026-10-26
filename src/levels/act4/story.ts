// Shared facts for Act 4 (what gh0st did inside Helix after getting in). See ../PLOT.md.
import { ACT3 } from '../act3/story';

export const ACT4 = {
  ...ACT3,
  now: '2026-03-14T16:00:00Z',
  dbHost: 'helix-db01',
  webHost: 'helix-web01',
  exfilDomain: 'cdn-sync.example',
  ortizLogin: '2026-03-13T03:45:10Z',
  archive: '/tmp/.X11-cache/db-export.tgz',
  leakedPath: '/backup/helix-intranet.sql.gz',
  cronLine: '*/10 * * * * /tmp/.X11-cache/.sync --quiet',
  /** The beacon pushed the archive out through this name (DNS tunnel, Act 6). */
  exfilVia: 't.cdn-sync.example',
  pushedAt: '2026-03-13T03:49:12Z',
  historyOffAt: '2026-03-13T03:51:40Z',
  /** sudo rm of the archive, after history was switched off. */
  cleanupAt: '2026-03-13T03:52:15Z',
  /** The running beacon piped its own crontab line in (no shell command typed). */
  cronAt: '2026-03-13T03:50:05Z',
  crontab: '/var/spool/cron/crontabs/j.ortiz',
} as const;
