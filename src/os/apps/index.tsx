import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { AppId } from '../../engine/schema';
import type { UiKey } from '../../i18n';

export interface AppDefinition {
  title: UiKey;
  icon: string;
  size: { width: number; height: number };
  component: LazyExoticComponent<ComponentType>;
}

export const APPS: Record<AppId, AppDefinition> = {
  case: { title: 'app.case', icon: '◈', size: { width: 560, height: 640 }, component: lazy(() => import('./Case')) },
  terminal: { title: 'app.terminal', icon: '>_', size: { width: 760, height: 470 }, component: lazy(() => import('./Terminal')) },
  files: { title: 'app.files', icon: '▤', size: { width: 760, height: 480 }, component: lazy(() => import('./Files')) },
  notes: { title: 'app.notes', icon: '✎', size: { width: 620, height: 420 }, component: lazy(() => import('./Notes')) },
  evidence: { title: 'app.evidence', icon: '⌗', size: { width: 980, height: 620 }, component: lazy(() => import('./EvidenceBoard')) },
  mail: { title: 'app.mail', icon: '✉', size: { width: 900, height: 580 }, component: lazy(() => import('./Mail')) },
  logs: { title: 'app.logs', icon: '≣', size: { width: 900, height: 560 }, component: lazy(() => import('./Logs')) },
  browser: { title: 'app.browser', icon: '◎', size: { width: 960, height: 620 }, component: lazy(() => import('./Browser')) },
  hex: { title: 'app.hex', icon: '0x', size: { width: 820, height: 520 }, component: lazy(() => import('./Hex')) },
  capture: { title: 'app.capture', icon: '⇄', size: { width: 980, height: 600 }, component: lazy(() => import('./Capture')) },
  processes: { title: 'app.processes', icon: '⚙', size: { width: 860, height: 540 }, component: lazy(() => import('./Processes')) },
  registry: { title: 'app.registry', icon: '⌬', size: { width: 900, height: 560 }, component: lazy(() => import('./Registry')) },
};
