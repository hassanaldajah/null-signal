import { useEffect } from 'react';
import type { L, Lang } from '../engine/schema';
import { useGame } from '../store/game';
import ar from './ar';
import en, { type UiKey } from './en';

const dictionaries: Record<Lang, Partial<Record<UiKey, string>>> = { en, ar };

function format(template: string, vars?: Record<string, string | number>): string {
  return vars ? template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`)) : template;
}

export function translate(lang: Lang, key: UiKey, vars?: Record<string, string | number>): string {
  return format(dictionaries[lang][key] ?? en[key], vars);
}

export function localize(lang: Lang, text?: L): string {
  if (!text) return '';
  return lang === 'ar' && text.ar ? text.ar : text.en;
}

export function useI18n() {
  const lang = useGame((state) => state.settings.lang);
  return {
    lang,
    dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const),
    t: (key: UiKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    tl: (text?: L) => localize(lang, text),
  };
}

/** Keeps <html lang/dir> in sync. Terminal and tool output stay LTR via CSS. */
export function useDocumentLanguage(): void {
  const lang = useGame((state) => state.settings.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
}

export type { UiKey };
