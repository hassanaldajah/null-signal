import type { AppId } from '../../engine/schema';

/** Apps the engine implements today. The level validator rejects levels that need others. */
export const IMPLEMENTED_APPS: AppId[] = ['case', 'terminal', 'files', 'notes', 'evidence', 'mail', 'logs', 'hex', 'browser', 'capture', 'processes', 'registry'];
